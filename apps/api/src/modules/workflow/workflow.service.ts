import { Injectable } from '@nestjs/common';
import { ArchiveRepository } from '../archive/archive.repository';
import { CamundaApiService } from '../camunda-api/camunda-api.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly camunda: CamundaApiService,
    private readonly archiveRepository: ArchiveRepository,
  ) {}

  running() {
    return this.camunda.getHistoricProcessInstances({ unfinished: true, sortBy: 'startTime', sortOrder: 'desc' });
  }

  async completed() {
    const rows = await this.camunda.getHistoricProcessInstances({ finished: true, sortBy: 'endTime', sortOrder: 'desc' });
    return this.withArchiveStatus(rows);
  }

  async failed() {
    const rows = await this.camunda.getHistoricProcessInstances({ finished: true, deleted: true, sortBy: 'endTime', sortOrder: 'desc' });
    return this.withArchiveStatus(rows);
  }

  async detail(processInstanceId: string) {
    const [processes, activities, variables] = await Promise.all([
      this.camunda.getHistoricProcessInstances({ processInstanceId }),
      this.camunda.getHistoricActivities(processInstanceId),
      this.camunda.getHistoricVariables(processInstanceId),
    ]);
    return { process: processes[0], activities, variables };
  }

  private async withArchiveStatus(rows: Array<Record<string, unknown>>) {
    const ids = rows.map((row) => String(row.id));
    const status = await this.archiveRepository.archivedStatus(ids);
    return rows.map((row) => ({ ...row, archived: status.get(String(row.id)) ?? false }));
  }
}
