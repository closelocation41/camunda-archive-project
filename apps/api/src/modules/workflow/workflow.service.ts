import { Injectable } from '@nestjs/common';
import { CamundaApiService } from '../camunda-api/camunda-api.service';

@Injectable()
export class WorkflowService {
  constructor(private readonly camunda: CamundaApiService) {}

  running() {
    return this.camunda.getHistoricProcessInstances({ unfinished: true, sortBy: 'startTime', sortOrder: 'desc' });
  }

  completed() {
    return this.camunda.getHistoricProcessInstances({ finished: true, sortBy: 'endTime', sortOrder: 'desc' });
  }

  failed() {
    return this.camunda.getHistoricProcessInstances({ finished: true, deleted: true, sortBy: 'endTime', sortOrder: 'desc' });
  }

  async detail(processInstanceId: string) {
    const [processes, activities, variables] = await Promise.all([
      this.camunda.getHistoricProcessInstances({ processInstanceId }),
      this.camunda.getHistoricActivities(processInstanceId),
      this.camunda.getHistoricVariables(processInstanceId),
    ]);
    return { process: processes[0], activities, variables };
  }
}
