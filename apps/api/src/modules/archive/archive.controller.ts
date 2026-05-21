import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { ArchiveService } from './archive.service';
import { ArchiveQueryDto } from './dto/archive-query.dto';

@ApiTags('archive')
@ApiBearerAuth()
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get('workflows')
  @Roles(Role.Viewer)
  list(@Query() query: ArchiveQueryDto) {
    return this.archiveService.listArchived(query);
  }

  @Get('workflows/:processInstanceId')
  @Roles(Role.Viewer)
  detail(@Param('processInstanceId') processInstanceId: string) {
    return this.archiveService.getArchiveBundle(processInstanceId);
  }

  @Post('run/completed')
  @Roles(Role.Operator)
  archiveCompleted() {
    return this.archiveService.archive('COMPLETED');
  }

  @Post('run/failed')
  @Roles(Role.Operator)
  archiveFailed() {
    return this.archiveService.archive('FAILED');
  }

  @Post('run/suspended')
  @Roles(Role.Operator)
  archiveSuspended() {
    return this.archiveService.archive('SUSPENDED');
  }
}
