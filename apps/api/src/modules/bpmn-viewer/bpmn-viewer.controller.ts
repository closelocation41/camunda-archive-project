import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { BpmnViewerService } from './bpmn-viewer.service';

@ApiTags('bpmn-viewer')
@ApiBearerAuth()
@Controller('bpmn-viewer')
@Roles(Role.Viewer)
export class BpmnViewerController {
  constructor(private readonly bpmnViewerService: BpmnViewerService) {}

  @Get(':processInstanceId/execution')
  execution(@Param('processInstanceId') processInstanceId: string) {
    return this.bpmnViewerService.execution(processInstanceId);
  }
}
