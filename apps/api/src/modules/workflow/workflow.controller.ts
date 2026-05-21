import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { WorkflowService } from './workflow.service';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
@Roles(Role.Viewer)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('running')
  running() {
    return this.workflowService.running();
  }

  @Get('completed')
  completed() {
    return this.workflowService.completed();
  }

  @Get('failed')
  failed() {
    return this.workflowService.failed();
  }

  @Get(':processInstanceId')
  detail(@Param('processInstanceId') processInstanceId: string) {
    return this.workflowService.detail(processInstanceId);
  }
}
