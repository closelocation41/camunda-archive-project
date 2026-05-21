import { Injectable } from '@nestjs/common';
import { CamundaApiService } from '../camunda-api/camunda-api.service';

@Injectable()
export class IncidentService {
  constructor(private readonly camunda: CamundaApiService) {}

  active() {
    return this.camunda.getIncidents({ sortBy: 'incidentTimestamp', sortOrder: 'desc' });
  }
}
