import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { collectDefaultMetrics, register } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';

collectDefaultMetrics();

@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  @Header('Content-Type', register.contentType)
  @ApiExcludeEndpoint()
  metrics() {
    return register.metrics();
  }
}
