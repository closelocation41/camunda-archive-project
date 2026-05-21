import { Module } from '@nestjs/common';
import { CamundaApiModule } from '../camunda-api/camunda-api.module';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';

@Module({
  imports: [CamundaApiModule],
  controllers: [IncidentController],
  providers: [IncidentService],
})
export class IncidentModule {}
