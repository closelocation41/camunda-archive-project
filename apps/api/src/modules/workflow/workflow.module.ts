import { Module } from '@nestjs/common';
import { CamundaApiModule } from '../camunda-api/camunda-api.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [CamundaApiModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
