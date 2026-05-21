import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';
import { IncidentService } from './incident.service';

@ApiTags('incidents')
@ApiBearerAuth()
@Controller('incidents')
@Roles(Role.Viewer)
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Get()
  active() {
    return this.incidentService.active();
  }
}
