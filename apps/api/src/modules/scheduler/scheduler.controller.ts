import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { CreateSchedulerJobDto } from './dto/create-scheduler-job.dto';
import { SchedulerPreviewQueryDto } from './dto/scheduler-preview-query.dto';
import { SchedulerService } from './scheduler.service';

@ApiTags('scheduler')
@ApiBearerAuth()
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List archive scheduler jobs with progress counters.' })
  @Roles(Role.Viewer)
  jobs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.schedulerService.listJobs(page, limit);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get one scheduler job and its workflow item status.' })
  @Roles(Role.Viewer)
  job(@Param('id') id: string) {
    return this.schedulerService.getJob(id);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create an archive scheduler job.' })
  @Roles(Role.Operator)
  createJob(@Body() dto: CreateSchedulerJobDto) {
    return this.schedulerService.createJob(dto);
  }

  @Post('jobs/:id/run')
  @ApiOperation({ summary: 'Run a scheduler job immediately.' })
  @Roles(Role.Operator)
  runJob(@Param('id') id: string) {
    return this.schedulerService.runJob(id);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed scheduler job.' })
  @Roles(Role.Operator)
  retryJob(@Param('id') id: string) {
    return this.schedulerService.retryJob(id);
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a running or scheduled scheduler job.' })
  @Roles(Role.Operator)
  cancelJob(@Param('id') id: string) {
    return this.schedulerService.cancelJob(id);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete a scheduler job and its item history.' })
  @Roles(Role.Operator)
  deleteJob(@Param('id') id: string) {
    return this.schedulerService.deleteJob(id);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Preview eligible Camunda 7 workflows for archive.' })
  @Roles(Role.Viewer)
  preview(@Query() query: SchedulerPreviewQueryDto) {
    return this.schedulerService.preview(query.mode, query.limit);
  }

  @Get('preview-count')
  @ApiOperation({ summary: 'Preview eligible workflow count for a scheduler rule.' })
  @Roles(Role.Viewer)
  previewCount(
    @Query('jobType') jobType: string,
    @Query('workflowType') workflowType: string,
    @Query('rule') rule: string,
  ) {
    return this.schedulerService.previewCount(jobType as any, workflowType as any, rule as any);
  }

  @Get('workflow-status')
  @ApiOperation({ summary: 'Get archive workflow scheduler status.' })
  @Roles(Role.Viewer)
  workflowStatus() {
    return this.schedulerService.workflowStatus();
  }

  @Post('run-all')
  @ApiOperation({ summary: 'Run all existing archive schedulers immediately.' })
  @Roles(Role.Operator)
  runAll() {
    return this.schedulerService.triggerAll();
  }
}
