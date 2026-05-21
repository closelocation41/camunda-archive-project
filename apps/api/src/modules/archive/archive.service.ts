import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArchiveQueryDto } from './dto/archive-query.dto';
import { ArchiveRepository } from './archive.repository';

export type ArchiveMode = 'COMPLETED' | 'FAILED' | 'SUSPENDED';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    private readonly repository: ArchiveRepository,
    private readonly config: ConfigService,
  ) {}

  listArchived(query: ArchiveQueryDto) {
    return this.repository.listArchived(query);
  }

  getArchiveBundle(processInstanceId: string) {
    return this.repository.getArchiveBundle(processInstanceId);
  }

  async archive(mode: ArchiveMode) {
    const runId = await this.repository.createRun(`ARCHIVE_${mode}`);
    const batchSize = this.config.get<number>('ARCHIVE_BATCH_SIZE', 500);
    const olderThanDays = this.daysFor(mode);

    try {
      const selected = await this.repository.findEligibleProcessIds(mode, olderThanDays, batchSize);
      const processIds = await this.repository.expandWithChildren(selected);
      const archived = await this.repository.copyHistory(processIds, runId);
      await this.repository.finishRun(runId, 'COMPLETED', {
        selected: selected.length,
        archived,
        skipped: selected.length ? 0 : 1,
        failed: 0,
      });
      return { runId, selected: selected.length, expandedProcessCount: processIds.length, archived };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown archive failure';
      this.logger.error(message);
      await this.repository.finishRun(runId, 'FAILED', { selected: 0, archived: 0, skipped: 0, failed: 1 }, message);
      throw error;
    }
  }

  async archiveSelected(mode: 'COMPLETED' | 'FAILED', processInstanceIds: string[]) {
    const runId = await this.repository.createRun(`ARCHIVE_SELECTED_${mode}`);
    const uniqueIds = [...new Set(processInstanceIds)];

    try {
      const status = await this.repository.archivedStatus(uniqueIds);
      const unarchivedIds = uniqueIds.filter((id) => !status.get(id));
      const expandedIds = await this.repository.expandWithChildren(unarchivedIds);
      const archived = await this.repository.copyHistory(expandedIds, runId);
      await this.repository.finishRun(runId, 'COMPLETED', {
        selected: uniqueIds.length,
        archived,
        skipped: uniqueIds.length - unarchivedIds.length,
        failed: 0,
      });
      return {
        runId,
        selected: uniqueIds.length,
        skippedAlreadyArchived: uniqueIds.length - unarchivedIds.length,
        expandedProcessCount: expandedIds.length,
        archived,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown selected archive failure';
      this.logger.error(message);
      await this.repository.finishRun(runId, 'FAILED', { selected: uniqueIds.length, archived: 0, skipped: 0, failed: 1 }, message);
      throw error;
    }
  }

  private daysFor(mode: ArchiveMode) {
    if (mode === 'COMPLETED') {
      return this.config.get<number>('ARCHIVE_COMPLETED_OLDER_THAN_DAYS', 7);
    }
    if (mode === 'FAILED') {
      return this.config.get<number>('ARCHIVE_FAILED_OLDER_THAN_DAYS', 1);
    }
    return this.config.get<number>('ARCHIVE_SUSPENDED_OLDER_THAN_DAYS', 30);
  }
}
