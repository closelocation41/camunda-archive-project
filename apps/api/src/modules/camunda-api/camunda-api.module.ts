import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CamundaApiService } from './camunda-api.service';

@Module({
  imports: [HttpModule],
  providers: [CamundaApiService],
  exports: [CamundaApiService],
})
export class CamundaApiModule {}
