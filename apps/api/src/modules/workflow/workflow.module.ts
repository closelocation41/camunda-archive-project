import { Module } from '@nestjs/common';
import { ArchiveModule } from '../archive/archive.module';
import { CamundaApiModule } from '../camunda-api/camunda-api.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [CamundaApiModule, ArchiveModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
