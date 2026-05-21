import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { ArchiveService } from '../archive/archive.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly archiveService: ArchiveService) {}

  onModuleInit() {
    cron.schedule('*/15 * * * *', () => this.safeArchive('COMPLETED'));
    cron.schedule('*/30 * * * *', () => this.safeArchive('FAILED'));
    cron.schedule('0 */6 * * *', () => this.safeArchive('SUSPENDED'));
    cron.schedule('15 */6 * * *', () => this.verifyArchiveConsistency());
    cron.schedule('30 2 * * *', () => this.cleanupCamundaHistory());
  }

  async triggerAll() {
    const completed = await this.archiveService.archive('COMPLETED');
    const failed = await this.archiveService.archive('FAILED');
    const suspended = await this.archiveService.archive('SUSPENDED');
    return { completed, failed, suspended };
  }

  private async safeArchive(mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED') {
    try {
      await this.archiveService.archive(mode);
    } catch (error) {
      this.logger.error(`Scheduled archive ${mode} failed`, error as Error);
    }
  }

  private verifyArchiveConsistency() {
    this.logger.log('Archive consistency validation placeholder executed');
  }

  private cleanupCamundaHistory() {
    this.logger.log('Camunda history cleanup should call Camunda cleanup APIs after archive validation');
  }
}
