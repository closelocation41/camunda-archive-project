import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { RestoreWorkflowDto } from './dto/restore-workflow.dto';
import { RestoreService } from './restore.service';

@ApiTags('restore')
@ApiBearerAuth()
@Controller('restore')
export class RestoreController {
  constructor(private readonly restoreService: RestoreService) {}

  @Post('workflow')
  @Roles(Role.Operator)
  restore(@Body() dto: RestoreWorkflowDto, @Req() req: { user?: { username?: string; sub?: string } }) {
    return this.restoreService.restore(dto, req.user?.username ?? req.user?.sub ?? 'unknown');
  }
}
