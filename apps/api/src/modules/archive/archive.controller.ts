import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { ArchiveService } from './archive.service';
import { ArchiveSelectedDto } from './dto/archive-selected.dto';
import { ArchiveQueryDto } from './dto/archive-query.dto';

@ApiTags('archive')
@ApiBearerAuth()
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get('workflows')
  @ApiOperation({
    summary: 'List archived workflows',
    description: 'Returns archived workflow history from act_hi_procinst. Supports search, state filtering, and pagination. The web UI uses 10 rows per page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paged archived workflow result.',
    schema: {
      example: {
        data: [
          {
            proc_inst_id_: '623a3e07-54d4-11f1-940b-0242ac120006',
            business_key_: 'INV-1001',
            proc_def_key_: 'invoice',
            proc_def_id_: 'invoice:1:abc',
            start_time_: '2026-05-21T05:00:00.000Z',
            end_time_: '2026-05-21T05:05:00.000Z',
            duration_: 300000,
            state_: 'COMPLETED',
            super_process_instance_id_: null,
            root_proc_inst_id_: null,
            archived_at: '2026-05-21T06:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
  @Roles(Role.Viewer)
  list(@Query() query: ArchiveQueryDto) {
    return this.archiveService.listArchived(query);
  }

  @Get('workflows/:processInstanceId')
  @ApiOperation({
    summary: 'Get archived workflow bundle',
    description: 'Returns archived process, activity, task, variable, incident, job, and comment history for one process instance id.',
  })
  @ApiParam({ name: 'processInstanceId', example: '623a3e07-54d4-11f1-940b-0242ac120006' })
  @ApiResponse({
    status: 200,
    description: 'Archived history bundle.',
    schema: {
      example: {
        process: { proc_inst_id_: '623a3e07-54d4-11f1-940b-0242ac120006', proc_def_key_: 'invoice', state_: 'COMPLETED' },
        activities: [],
        tasks: [],
        variables: [],
        incidents: [],
        jobs: [],
        comments: [],
      },
    },
  })
  @Roles(Role.Viewer)
  detail(@Param('processInstanceId') processInstanceId: string) {
    return this.archiveService.getArchiveBundle(processInstanceId);
  }

  @Post('run/completed')
  @ApiOperation({ summary: 'Archive eligible completed workflows', description: 'Moves eligible completed workflow history from Camunda history tables into archive tables, then deletes moved rows from Camunda history.' })
  @ApiResponse({ status: 201, description: 'Archive run summary.', schema: { example: { runId: '21bb3218-5200-4b95-bc21-5cb6863d110c', selected: 12, expandedProcessCount: 12, archived: 372 } } })
  @Roles(Role.Operator)
  archiveCompleted() {
    return this.archiveService.archive('COMPLETED');
  }

  @Post('run/failed')
  @ApiOperation({ summary: 'Archive eligible failed workflows', description: 'Moves eligible failed workflow history from Camunda history tables into archive tables, then deletes moved rows from Camunda history.' })
  @ApiResponse({ status: 201, description: 'Archive run summary.', schema: { example: { runId: '21bb3218-5200-4b95-bc21-5cb6863d110c', selected: 3, expandedProcessCount: 3, archived: 94 } } })
  @Roles(Role.Operator)
  archiveFailed() {
    return this.archiveService.archive('FAILED');
  }

  @Post('run/suspended')
  @ApiOperation({ summary: 'Archive eligible old suspended workflows', description: 'Moves eligible old suspended workflow history from Camunda history tables into archive tables, then deletes moved rows from Camunda history.' })
  @ApiResponse({ status: 201, description: 'Archive run summary.', schema: { example: { runId: '21bb3218-5200-4b95-bc21-5cb6863d110c', selected: 1, expandedProcessCount: 1, archived: 20 } } })
  @Roles(Role.Operator)
  archiveSuspended() {
    return this.archiveService.archive('SUSPENDED');
  }

  @Post('run/selected')
  @ApiOperation({
    summary: 'Archive selected completed or failed workflows',
    description: 'Moves selected process history and child process history from Camunda history tables to archive tables. Automatically removes moved rows from the original Camunda history tables.',
  })
  @ApiResponse({
    status: 201,
    description: 'Selected archive run summary.',
    schema: {
      example: {
        runId: 'eb1051de-3298-4a55-b472-cd3add0c9b6d',
        selected: 12,
        skippedAlreadyArchived: 0,
        expandedProcessCount: 12,
        archived: 372,
      },
    },
  })
  @Roles(Role.Operator)
  archiveSelected(@Body() dto: ArchiveSelectedDto) {
    return this.archiveService.archiveSelected(dto.mode, dto.processInstanceIds);
  }
}
