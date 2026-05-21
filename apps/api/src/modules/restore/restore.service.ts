import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ArchiveRepository } from '../archive/archive.repository';
import { RestoreWorkflowDto } from './dto/restore-workflow.dto';
import { RestoreRepository } from './restore.repository';

@Injectable()
export class RestoreService {
  private readonly logger = new Logger(RestoreService.name);

  constructor(
    private readonly archiveRepository: ArchiveRepository,
    private readonly restoreRepository: RestoreRepository,
  ) {}

  async restore(dto: RestoreWorkflowDto, requestedBy: string) {
    const logId = await this.restoreRepository.createLog(dto.processInstanceId, dto.reason, requestedBy);

    try {
      const restored = await this.restoreArchivedHistory(dto.processInstanceId, dto.includeChildren);
      await this.restoreRepository.completeLog(logId, dto.processInstanceId, {
        restoredProcessInstanceIds: restored.processInstanceIds,
        restoredHistoryRows: restored.restoredHistoryRows,
      });
      return { restoreLogId: logId, ...restored };
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

  private async restoreArchivedHistory(processInstanceId: string, includeChildren: boolean) {
    const bundle = await this.archiveRepository.getArchiveBundle(processInstanceId);
    if (!bundle.process) {
      throw new NotFoundException(`Archived process ${processInstanceId} was not found`);
    }

    const childIds = includeChildren ? await this.restoreRepository.findChildren(processInstanceId) : [];
    const processInstanceIds = [...new Set([processInstanceId, ...childIds])];
    const restoredHistoryRows = await this.archiveRepository.restoreHistory(processInstanceIds);
    return {
      originalProcessInstanceId: processInstanceId,
      restoredProcessInstanceId: processInstanceId,
      processInstanceIds,
      restoredHistoryRows,
    };
  }
}
