import { Module } from '@nestjs/common';
import { ArchiveController } from './archive.controller';
import { ArchiveRepository } from './archive.repository';
import { ArchiveService } from './archive.service';

@Module({
  controllers: [ArchiveController],
  providers: [ArchiveRepository, ArchiveService],
  exports: [ArchiveRepository, ArchiveService],
})
export class ArchiveModule {}
