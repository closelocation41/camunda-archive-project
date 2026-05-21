import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { RestoreWorkflowDto } from './dto/restore-workflow.dto';
import { RestoreBatchDto } from './dto/restore-batch.dto';
import { RestoreService } from './restore.service';

@ApiTags('restore')
@ApiBearerAuth()
@Controller('restore')
export class RestoreController {
  constructor(private readonly restoreService: RestoreService) {}

  @Post('workflow')
  @ApiOperation({
    summary: 'Re-sync one archived workflow',
    description:
      'Moves archived history rows for one process instance from archive tables back into the original Camunda history tables, then removes the moved rows from archive tables. This restores history visibility only and does not create a runtime process instance.',
  })
  @ApiResponse({
    status: 201,
    description: 'Re-sync result for one workflow.',
    schema: {
      example: {
        restoreLogId: '8777a034-b3e4-4676-9d01-dc8af83b510b',
        originalProcessInstanceId: '623a3e07-54d4-11f1-940b-0242ac120006',
        restoredProcessInstanceId: '623a3e07-54d4-11f1-940b-0242ac120006',
        processInstanceIds: ['623a3e07-54d4-11f1-940b-0242ac120006'],
        restoredHistoryRows: 67,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Archived process instance id was not found.' })
  @Roles(Role.Operator)
  restore(@Body() dto: RestoreWorkflowDto, @Req() req: { user?: { username?: string; sub?: string } }) {
    return this.restoreService.restore(dto, req.user?.username ?? req.user?.sub ?? 'unknown');
  }

  @Post('workflows')
  @ApiOperation({
    summary: 'Re-sync selected archived workflows',
    description:
      'Batch re-sync endpoint used by Archived Workflows multi-select. Each archived process id is moved from archive tables back into Camunda history tables and removed from archive tables after a successful copy.',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch re-sync result.',
    schema: {
      example: {
        restoredCount: 2,
        results: [
          {
            restoreLogId: '8777a034-b3e4-4676-9d01-dc8af83b510b',
            originalProcessInstanceId: '623a3e07-54d4-11f1-940b-0242ac120006',
            restoredProcessInstanceId: '623a3e07-54d4-11f1-940b-0242ac120006',
            processInstanceIds: ['623a3e07-54d4-11f1-940b-0242ac120006'],
            restoredHistoryRows: 67,
          },
        ],
      },
    },
  })
  @Roles(Role.Operator)
  restoreBatch(@Body() dto: RestoreBatchDto, @Req() req: { user?: { username?: string; sub?: string } }) {
    return this.restoreService.restoreBatch(
      dto.processInstanceIds,
      dto.reason,
      dto.includeChildren,
      req.user?.username ?? req.user?.sub ?? 'unknown',
    );
  }
}
