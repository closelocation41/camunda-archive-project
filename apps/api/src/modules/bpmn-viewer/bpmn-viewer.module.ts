import { Module } from '@nestjs/common';
import { ArchiveModule } from '../archive/archive.module';
import { CamundaApiModule } from '../camunda-api/camunda-api.module';
import { BpmnViewerController } from './bpmn-viewer.controller';
import { BpmnViewerService } from './bpmn-viewer.service';

@Module({
  imports: [ArchiveModule, CamundaApiModule],
  controllers: [BpmnViewerController],
  providers: [BpmnViewerService],
})
export class BpmnViewerModule {}
