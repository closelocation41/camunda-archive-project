import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ArchiveRepository } from '../archive/archive.repository';
import { CamundaApiService, CamundaVariable } from '../camunda-api/camunda-api.service';
import { RestoreWorkflowDto } from './dto/restore-workflow.dto';
import { RestoreRepository } from './restore.repository';

type ArchiveVariable = {
  name_: string;
  var_type_: string | null;
  text_: string | null;
  text2_: string | null;
  long_: number | null;
  double_: number | null;
};

@Injectable()
export class RestoreService {
  private readonly logger = new Logger(RestoreService.name);

  constructor(
    private readonly archiveRepository: ArchiveRepository,
    private readonly restoreRepository: RestoreRepository,
    private readonly camunda: CamundaApiService,
  ) {}

  async restore(dto: RestoreWorkflowDto, requestedBy: string) {
    const logId = await this.restoreRepository.createLog(dto.processInstanceId, dto.reason, requestedBy);

    try {
      const restored = await this.restoreSingle(dto.processInstanceId, logId, dto.reason);
      const restoredChildren: Array<{ original: string; restored: string }> = [];

      if (dto.includeChildren) {
        for (const childId of await this.restoreRepository.findChildren(dto.processInstanceId)) {
          const child = await this.restoreSingle(childId, logId, `Child restore for ${dto.processInstanceId}: ${dto.reason}`);
          restoredChildren.push({ original: childId, restored: child.restoredProcessInstanceId });
        }
      }

      await this.restoreRepository.completeLog(logId, restored.restoredProcessInstanceId, { restoredChildren });
      return { restoreLogId: logId, ...restored, restoredChildren };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown restore failure';
      this.logger.error(message);
      await this.restoreRepository.failLog(logId, message);
      throw error;
    }
  }

  async restoreBatch(processInstanceIds: string[], reason: string, includeChildren: boolean, requestedBy: string) {
    const results = [];
    for (const processInstanceId of [...new Set(processInstanceIds)]) {
      results.push(await this.restore({ processInstanceId, reason, includeChildren }, requestedBy));
    }
    return { restoredCount: results.length, results };
  }

  private async restoreSingle(processInstanceId: string, logId: string, reason: string) {
    const bundle = await this.archiveRepository.getArchiveBundle(processInstanceId);
    if (!bundle.process) {
      throw new NotFoundException(`Archived process ${processInstanceId} was not found`);
    }

    const variables = this.toCamundaVariables(bundle.variables as ArchiveVariable[]);
    const start = await this.camunda.startProcess(bundle.process.proc_def_key_, variables, bundle.process.business_key_);
    const restoredProcessInstanceId = start.id as string;
    const lastActivity = this.findLastActivity(bundle.activities);

    if (lastActivity?.act_id_) {
      await this.camunda.modifyProcessInstance(
        restoredProcessInstanceId,
        [{ type: 'startBeforeActivity', activityId: lastActivity.act_id_ }],
        `Archive restore ${processInstanceId}: ${reason}`,
      );
    }

    await this.restoreRepository.mapProcess(processInstanceId, restoredProcessInstanceId, logId);
    return {
      originalProcessInstanceId: processInstanceId,
      restoredProcessInstanceId,
      restoredToActivityId: lastActivity?.act_id_ ?? null,
    };
  }

  private toCamundaVariables(rows: ArchiveVariable[]): Record<string, CamundaVariable> {
    return rows.reduce<Record<string, CamundaVariable>>((acc, row) => {
      acc[row.name_] = {
        type: this.mapType(row.var_type_),
        value: this.valueFor(row),
      };
      return acc;
    }, {});
  }

  private valueFor(row: ArchiveVariable) {
    if (row.var_type_ === 'Long' || row.var_type_ === 'Integer' || row.var_type_ === 'Short') {
      return row.long_;
    }
    if (row.var_type_ === 'Double') {
      return row.double_;
    }
    if (row.var_type_ === 'Boolean') {
      return row.long_ === 1;
    }
    return row.text_ ?? row.text2_;
  }

  private mapType(type: string | null) {
    if (!type) {
      return 'String';
    }
    return type === 'Json' ? 'Object' : type;
  }

  private findLastActivity(activities: Array<Record<string, unknown>>) {
    return activities
      .filter((activity) => activity.act_type_ !== 'startEvent')
      .filter((activity) => activity.end_time_)
      .at(-1);
  }
}
