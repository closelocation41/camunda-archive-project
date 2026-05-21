import { Injectable } from '@nestjs/common';
import { ArchiveRepository } from '../archive/archive.repository';
import { CamundaApiService } from '../camunda-api/camunda-api.service';

@Injectable()
export class BpmnViewerService {
  constructor(
    private readonly archiveRepository: ArchiveRepository,
    private readonly camunda: CamundaApiService,
  ) {}

  async execution(processInstanceId: string) {
    const bundle = await this.archiveRepository.getArchiveBundle(processInstanceId);
    const processDefinitionId = bundle.process?.proc_def_id_;
    const xml = processDefinitionId ? await this.camunda.getBpmnXml(processDefinitionId) : null;
    return {
      bpmnXml: xml?.bpmn20Xml ?? null,
      timeline: bundle.activities,
      failedActivities: bundle.incidents.map((incident: Record<string, unknown>) => incident.failed_activity_id_ ?? incident.activity_id_),
      incidents: bundle.incidents,
    };
  }
}
