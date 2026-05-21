import { Module } from '@nestjs/common';
import { ArchiveModule } from '../archive/archive.module';
import { CamundaApiModule } from '../camunda-api/camunda-api.module';
import { RestoreController } from './restore.controller';
import { RestoreRepository } from './restore.repository';
import { RestoreService } from './restore.service';

@Module({
  imports: [ArchiveModule, CamundaApiModule],
  controllers: [RestoreController],
  providers: [RestoreRepository, RestoreService],
})
export class RestoreModule {}
