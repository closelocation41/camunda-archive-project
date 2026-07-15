import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import * as cron from 'node-cron';
import { Pool } from 'pg';
import { ArchiveService } from '../archive/archive.service';
import { ArchiveRepository } from '../archive/archive.repository';
import { ARCHIVE_DB } from '../database/database.module';
import { CreateSchedulerJobDto } from './dto/create-scheduler-job.dto';

type SchedulerJobType = 'ARCHIVE_COMPLETED' | 'ARCHIVE_FAILED' | 'ARCHIVE_SUSPENDED';
type SchedulerJobStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'CANCELED';
type SchedulerWorkflowType = 'COMPLETED_TO_ARCHIVE' | 'ARCHIVE_TO_COMPLETE';
type SchedulerRule = 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly archiveService: ArchiveService,
    private readonly archiveRepository: ArchiveRepository,
    @Inject(ARCHIVE_DB) private readonly archiveDb: Pool,
  ) {}

  onModuleInit() {
    void this.ensureJobSchema().catch((error) => {
      this.logger.warn(`Scheduler schema initialization skipped: ${error instanceof Error ? error.message : String(error)}`);
    });
    cron.schedule('*/15 * * * *', () => this.safeArchive('COMPLETED'));
    cron.schedule('*/30 * * * *', () => this.safeArchive('FAILED'));
    cron.schedule('0 */6 * * *', () => this.safeArchive('SUSPENDED'));
    cron.schedule('* * * * *', () => this.runDueJobs());
    cron.schedule('15 */6 * * *', () => this.verifyArchiveConsistency());
    cron.schedule('30 2 * * *', () => this.cleanupCamundaHistory());
  }

  async triggerAll() {
    const completed = await this.archiveService.archive('COMPLETED');
    const failed = await this.archiveService.archive('FAILED');
    const suspended = await this.archiveService.archive('SUSPENDED');
    return { completed, failed, suspended };
  }

  async listJobs(page = 1, limit = 5) {
    await this.ensureJobSchema();
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(5, Math.max(1, Number(limit) || 5));
    const offset = (safePage - 1) * safeLimit;
    const { rows } = await this.archiveDb.query(
      `select id, job_type as "jobType", job_name as "jobName",
              workflow_type as "workflowType", job_rule as "rule",
              scheduled_start_time as "scheduledStartTime",
              selected_workflow_count as "selectedWorkflowCount",
              eligible_workflow_count as "eligibleWorkflowCount",
              processing_mode as "processingMode", status, created_by as "createdBy",
              completed_count as "completedCount", failed_count as "failedCount",
              in_progress_count as "inProgressCount", pending_count as "pendingCount",
              retry_count as "retryCount", last_error_message as "lastErrorMessage",
              started_at as "startedAt", finished_at as "finishedAt", created_at as "createdAt",
              case
                when selected_workflow_count = 0 then 0
                else round(((completed_count + failed_count)::numeric / selected_workflow_count::numeric) * 100)
              end as "percentageCompleted"
       from archive_job
       order by scheduled_start_time desc, created_at desc
       limit $1 offset $2`,
      [safeLimit, offset],
    );
    const totalResult = await this.archiveDb.query<{ total: string }>(
      'select count(*)::text as total from archive_job',
    );
    return { data: rows, total: Number(totalResult.rows[0]?.total ?? 0), page: safePage, limit: safeLimit };
  }

  async getJob(id: string) {
    await this.ensureJobSchema();
    const jobs = await this.archiveDb.query(
      `select id, job_type as "jobType", job_name as "jobName",
              workflow_type as "workflowType", job_rule as "rule",
              scheduled_start_time as "scheduledStartTime", date_range_start as "dateRangeStart",
              date_range_end as "dateRangeEnd", selected_workflow_count as "selectedWorkflowCount",
              eligible_workflow_count as "eligibleWorkflowCount",
              processing_mode as "processingMode", status, created_by as "createdBy",
              completed_count as "completedCount", failed_count as "failedCount",
              in_progress_count as "inProgressCount", pending_count as "pendingCount",
              retry_count as "retryCount", last_error_message as "lastErrorMessage",
              started_at as "startedAt", finished_at as "finishedAt", created_at as "createdAt"
       from archive_job
       where id = $1`,
      [id],
    );
    if (!jobs.rows[0]) {
      throw new NotFoundException('Scheduler job not found');
    }
    const items = await this.archiveDb.query(
      `select id, process_instance_id as "processInstanceId", status, retry_count as "retryCount",
              last_error_message as "lastErrorMessage", started_at as "startedAt", finished_at as "finishedAt"
       from archive_job_item
       where archive_job_id = $1
       order by created_at asc`,
      [id],
    );
    const logs = await this.archiveDb.query(
      `select attempt_number as "attemptNumber", status, error_message as "errorMessage", attempted_at as "attemptedAt"
       from archive_job_retry_history
       where archive_job_id = $1
       order by attempted_at asc`,
      [id],
    );
    return { ...jobs.rows[0], items: items.rows, logs: logs.rows };
  }

  async createJob(dto: CreateSchedulerJobDto) {
    await this.ensureJobSchema();
    try {
      const requestedCount = dto.selectedWorkflowCount;
      const mode = this.modeFromJobType(dto.jobType);
      const workflowType = dto.workflowType;
      const rule = dto.rule;
      const reservedIds = await this.reservedProcessIdsInActiveJobs();
      const eligibleCount =
        workflowType === 'ARCHIVE_TO_COMPLETE'
          ? await this.archiveRepository.countArchivedProcessIds(rule, reservedIds)
          : await this.archiveRepository.countSchedulerProcessIds(mode, rule, reservedIds);
      if (eligibleCount === 0) {
        throw new BadRequestException('No eligible workflows are available for the selected workflow type and rule.');
      }
      if (requestedCount > eligibleCount) {
        throw new BadRequestException(`Only ${eligibleCount} workflow(s) match the selected rule and are not already reserved in another job. Reduce the requested count or choose a broader rule.`);
      }
      const selectedCount = requestedCount;
      const eligibleIds =
        workflowType === 'ARCHIVE_TO_COMPLETE'
          ? await this.archiveRepository.findArchivedProcessIds(rule, selectedCount, reservedIds)
          : await this.archiveRepository.findSchedulerProcessIds(mode, rule, selectedCount, reservedIds);
      const processIds = eligibleIds;
      const missingCount = Math.max(0, selectedCount - processIds.length);
      const status = processIds.length ? 'SCHEDULED' : 'FAILED';
      const error = missingCount ? `${missingCount} ${mode.toLowerCase()} workflow(s) not found for requested count ${selectedCount}.` : null;
      const { rows } = await this.archiveDb.query(
      `insert into archive_job (
         job_type, workflow_type, job_rule, job_name, scheduled_start_time, date_range_start, date_range_end,
         selected_workflow_count, eligible_workflow_count, processing_mode, status, failed_count, pending_count, last_error_message
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning id, job_type as "jobType", workflow_type as "workflowType", job_rule as "rule", job_name as "jobName",
                 scheduled_start_time as "scheduledStartTime",
                 selected_workflow_count as "selectedWorkflowCount",
                 eligible_workflow_count as "eligibleWorkflowCount",
                 processing_mode as "processingMode", status, pending_count as "pendingCount",
                 failed_count as "failedCount", last_error_message as "lastErrorMessage"`,
        [
          dto.jobType,
          workflowType,
          rule,
          dto.jobName.trim(),
          dto.scheduledStartTime,
          dto.dateRangeStart ?? null,
          dto.dateRangeEnd ?? null,
          selectedCount,
          eligibleCount,
          dto.processingMode,
          status,
          missingCount,
          processIds.length,
          error,
        ],
      );
      await this.createJobItems(rows[0].id, mode, selectedCount, processIds);
      await this.recountJob(rows[0].id, error ?? undefined);
      return rows[0];
    } catch (error) {
      this.logger.error(`Unable to create scheduler job: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('Unable to create scheduler job. Check the archive and Camunda database connections and configuration.');
    }
  }

  async runJob(id: string) {
    await this.ensureJobSchema();
    const job = await this.findJob(id);
    const mode = this.modeFromJobType(job.job_type);
    const workflowType = job.workflow_type;
    const runnableItems = await this.runnableItems(id);
    if (!runnableItems.length) {
      await this.finalizeJob(id);
      return { jobId: id, mode, processed: 0, message: 'No pending or failed workflow items to process.' };
    }

    await this.archiveDb.query(
      `update archive_job
       set status = 'RUNNING', started_at = coalesce(started_at, now()), finished_at = null,
           in_progress_count = 0, pending_count = $2,
           last_error_message = null, updated_at = now()
       where id = $1`,
      [id, runnableItems.length],
    );

    const runId = await this.archiveRepository.createRun(`SCHEDULER_${workflowType}_${job.job_type}`);
    const summary = { processed: 0, completed: 0, failed: 0 };
    for (const item of runnableItems) {
      const latestJob = await this.findJob(id);
      if (latestJob.status === 'CANCELED') {
        break;
      }

      summary.processed += 1;
      const result = await this.processJobItem(id, item.id, item.process_instance_id, mode, runId);
      if (result.status === 'COMPLETED') {
        summary.completed += 1;
      } else {
        summary.failed += 1;
      }
    }

    const final = await this.finalizeJob(id);
    await this.archiveRepository.finishRun(
      runId,
      final.status,
      {
        selected: final.selected,
        archived: final.completed,
        skipped: 0,
        failed: final.failed,
      },
      final.status === 'COMPLETED' ? undefined : `Scheduler job finished with status ${final.status}`,
    );
    return { jobId: id, workflowType, mode, processingMode: job.processing_mode, runId, ...summary };
  }

  async retryJob(id: string) {
    const job = await this.findJob(id);
    await this.archiveDb.query(
      `update archive_job
       set retry_count = retry_count + 1, status = 'SCHEDULED',
           pending_count = (select count(*) from archive_job_item where archive_job_id = $1 and status = 'FAILED'),
           last_error_message = null, finished_at = null, updated_at = now()
       where id = $1`,
      [id],
    );
    await this.archiveDb.query(
      `update archive_job_item
       set status = 'PENDING', retry_count = retry_count + 1, started_at = null,
           finished_at = null, last_error_message = null, updated_at = now()
       where archive_job_id = $1 and status = 'FAILED'`,
      [id],
    );
    await this.recordRetry(id, null, 'SCHEDULED', null);
    return this.runJob(job.id);
  }

  async cancelJob(id: string) {
    const job = await this.findJob(id);
    if (!['SCHEDULED', 'RUNNING', 'PARTIAL', 'FAILED'].includes(job.status)) {
      return { jobId: id, status: job.status, canceled: false };
    }

    await this.archiveDb.query(
      `update archive_job
       set status = 'CANCELED', in_progress_count = 0,
           pending_count = case when status = 'SCHEDULED' then 0 else pending_count end,
           finished_at = coalesce(finished_at, now()), updated_at = now()
       where id = $1`,
      [id],
    );
    await this.archiveDb.query(
      `update archive_job_item
       set status = 'CANCELED', finished_at = coalesce(finished_at, now()), updated_at = now()
       where archive_job_id = $1 and status in ('PENDING', 'RUNNING')`,
      [id],
    );
    return { jobId: id, status: 'CANCELED', canceled: true };
  }

  async deleteJob(id: string) {
    const job = await this.findJob(id);
    if (job.status === 'RUNNING') {
      await this.archiveDb.query(
        `update archive_job_item
         set status = 'FAILED', last_error_message = 'Job deleted while running.',
             finished_at = coalesce(finished_at, now()), updated_at = now()
         where archive_job_id = $1 and status in ('PENDING', 'RUNNING')`,
        [id],
      );
      await this.archiveDb.query(
        `update archive_job
         set status = 'FAILED', in_progress_count = 0, pending_count = 0,
             last_error_message = 'Job deleted while running.', finished_at = now(), updated_at = now()
         where id = $1`,
        [id],
      );
    }
    const { rowCount } = await this.archiveDb.query('delete from archive_job where id = $1', [id]);
    return { jobId: id, deleted: rowCount === 1 };
  }

  async preview(mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED', limit: number) {
    const ids = await this.archiveRepository.findEligibleProcessIds(mode, this.daysForPreview(mode), limit);
    const archived = await this.archiveRepository.archivedStatus(ids);
    return {
      workflow: mode === 'COMPLETED' ? 'completed_task_move_to_archive.bpmn' : 'archive exception workflow',
      mode,
      count: ids.length,
      items: ids.map((processInstanceId) => ({ processInstanceId, archived: archived.get(processInstanceId) ?? false })),
    };
  }

  async previewCount(jobType: SchedulerJobType, workflowType: SchedulerWorkflowType, rule: SchedulerRule) {
    await this.ensureJobSchema();
    const mode = this.modeFromJobType(jobType);
    const reservedIds = await this.reservedProcessIdsInActiveJobs();
    const eligibleCount =
      workflowType === 'ARCHIVE_TO_COMPLETE'
        ? await this.archiveRepository.countArchivedProcessIds(rule, reservedIds)
        : await this.archiveRepository.countSchedulerProcessIds(mode, rule, reservedIds);
    return { eligibleWorkflowCount: eligibleCount, workflowType, rule, jobType };
  }

  async workflowStatus() {
    await this.ensureJobSchema();
    const { rows } = await this.archiveDb.query(
      `select status, count(*)::int as count
       from archive_job
       group by status`,
    );
    return {
      engine: 'Camunda 7',
      archiveWorkflow: 'completed_task_move_to_archive.bpmn',
      restoreWorkflow: 'archived_task_move_to_complete.bpmn',
      orchestration: 'NestJS currently runs the archive and restore steps directly. BPMN designs are available for future Camunda orchestration.',
      jobs: rows,
    };
  }

  private async safeArchive(mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED') {
    try {
      await this.archiveService.archive(mode);
    } catch (error) {
      this.logger.error(`Scheduled archive ${mode} failed`, error as Error);
    }
  }

  private async runDueJobs() {
    try {
      await this.ensureJobSchema();
      const { rows } = await this.archiveDb.query<{ id: string }>(
        `select id
         from archive_job
         where status = 'SCHEDULED' and scheduled_start_time <= now()
         order by scheduled_start_time asc
         limit 1`,
      );
      if (rows[0]) {
        await this.runJob(rows[0].id);
      }
    } catch (error) {
      this.logger.error('Scheduled job runner failed', error as Error);
    }
  }

  private verifyArchiveConsistency() {
    this.logger.log('Archive consistency validation placeholder executed');
  }

  private cleanupCamundaHistory() {
    this.logger.log('Camunda history cleanup should call Camunda cleanup APIs after archive validation');
  }

  private async createJobItems(jobId: string, mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED', requestedCount: number, processIds: string[]) {
    for (const processId of processIds) {
      await this.archiveDb.query(
        `insert into archive_job_item (archive_job_id, process_instance_id, status)
         values ($1, $2, 'PENDING')
         on conflict do nothing`,
        [jobId, processId],
      );
    }

    const missingCount = Math.max(0, requestedCount - processIds.length);
    for (let index = 0; index < missingCount; index += 1) {
      await this.archiveDb.query(
        `insert into archive_job_item (archive_job_id, process_instance_id, status, retry_count, last_error_message, finished_at)
         values ($1, $2, 'FAILED', 0, $3, now())`,
        [
          jobId,
          `NOT_FOUND_${mode}_${String(index + 1).padStart(3, '0')}`,
          `No ${mode.toLowerCase()} workflow found for requested slot ${processIds.length + index + 1}.`,
        ],
      );
    }
  }

  private async runnableItems(jobId: string) {
    const { rows } = await this.archiveDb.query<{ id: string; process_instance_id: string }>(
      `select id, process_instance_id
       from archive_job_item
       where archive_job_id = $1 and status = 'PENDING'
       order by created_at asc`,
      [jobId],
    );
    return rows;
  }

  private async processJobItem(
    jobId: string,
    itemId: string,
    processInstanceId: string,
    mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED',
    archiveRunId: string,
  ) {
    await this.archiveDb.query(
      `update archive_job_item
       set status = 'RUNNING', started_at = coalesce(started_at, now()),
           finished_at = null, last_error_message = null, updated_at = now()
       where id = $1`,
      [itemId],
    );
    await this.recountJob(jobId);

    try {
      if (processInstanceId.startsWith('NOT_FOUND_')) {
        throw new Error('Requested workflow was not found in Camunda history.');
      }

      const processIds = await this.archiveRepository.expandWithChildren([processInstanceId]);
      const workflowDirection = await this.workflowDirectionFromJob(jobId);
      if (mode === 'COMPLETED' && workflowDirection === 'ARCHIVE_TO_COMPLETE') {
        const verification = await this.archiveRepository.verifyWorkflowReadyForRestore(processIds);
        if (!verification.ready) {
          throw new Error(verification.reason ?? 'Archived workflow is not ready for restore.');
        }
        const restoredRows = await this.archiveRepository.restoreHistory(processIds);
        if (!restoredRows) {
          throw new Error('Restore validation failed for the selected archived workflow.');
        }
        await this.archiveDb.query(
          `update archive_job_item
           set status = 'COMPLETED', finished_at = now(), last_error_message = null, updated_at = now()
           where id = $1`,
          [itemId],
        );
        await this.recountJob(jobId);
        return { status: 'COMPLETED' as const, restoredRows };
      }

      const verification = await this.archiveRepository.verifyWorkflowReadyForArchive(processIds, mode);
      if (!verification.ready) {
        throw new Error(verification.reason ?? 'Workflow is not ready for archive.');
      }

      const archivedRows = await this.archiveRepository.copyHistory(processIds, archiveRunId);
      const archived = await this.archiveRepository.archivedStatus(processIds);
      const missing = processIds.filter((id) => !archived.get(id));
      if (missing.length) {
        throw new Error(`Archive validation failed for ${missing.length} workflow record(s).`);
      }

      await this.archiveDb.query(
        `update archive_job_item
         set status = 'COMPLETED', finished_at = now(), last_error_message = null, updated_at = now()
         where id = $1`,
        [itemId],
      );
      await this.recountJob(jobId);
      return { status: 'COMPLETED' as const, archivedRows };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown workflow item archive failure';
      await this.archiveDb.query(
        `update archive_job_item
         set status = 'FAILED', retry_count = retry_count + 1,
             last_error_message = $2, finished_at = now(), updated_at = now()
         where id = $1`,
        [itemId, message],
      );
      await this.recordRetry(jobId, itemId, 'FAILED', message);
      await this.recountJob(jobId, message);
      return { status: 'FAILED' as const, error: message };
    }
  }

  private async finalizeJob(jobId: string) {
    const counts = await this.recountJob(jobId);
    const status =
      counts.selected === 0 || counts.completed === 0
        ? 'FAILED'
        : counts.failed > 0 || counts.pending > 0 || counts.running > 0
          ? 'PARTIAL'
          : 'COMPLETED';

    await this.archiveDb.query(
      `update archive_job
       set status = $2, finished_at = now(),
           last_error_message = case
             when $2 = 'FAILED' then coalesce(last_error_message, 'All workflow items failed or no eligible workflows were found.')
             when $2 = 'PARTIAL' then coalesce(last_error_message, 'Some workflow items failed.')
             else null
           end,
           updated_at = now()
       where id = $1 and status <> 'CANCELED'`,
      [jobId, status],
    );
    return { ...counts, status };
  }

  private async recountJob(jobId: string, lastError?: string) {
    const { rows } = await this.archiveDb.query<{
      selected: string;
      completed: string;
      failed: string;
      running: string;
      pending: string;
    }>(
      `select
         count(*)::text as selected,
         count(*) filter (where status = 'COMPLETED')::text as completed,
         count(*) filter (where status = 'FAILED')::text as failed,
         count(*) filter (where status = 'RUNNING')::text as running,
         count(*) filter (where status = 'PENDING')::text as pending
       from archive_job_item
       where archive_job_id = $1`,
      [jobId],
    );
    const counts = {
      selected: Number(rows[0]?.selected ?? 0),
      completed: Number(rows[0]?.completed ?? 0),
      failed: Number(rows[0]?.failed ?? 0),
      running: Number(rows[0]?.running ?? 0),
      pending: Number(rows[0]?.pending ?? 0),
    };
    await this.archiveDb.query(
      `update archive_job
       set selected_workflow_count = $2, completed_count = $3, failed_count = $4,
           in_progress_count = $5, pending_count = $6,
           last_error_message = coalesce($7, last_error_message), updated_at = now()
       where id = $1`,
      [jobId, counts.selected, counts.completed, counts.failed, counts.running, counts.pending, lastError ?? null],
    );
    return counts;
  }

  private async findJob(id: string) {
    await this.ensureJobSchema();
    const { rows } = await this.archiveDb.query<{
      id: string;
      job_type: SchedulerJobType;
      workflow_type: SchedulerWorkflowType;
      job_rule: SchedulerRule;
      processing_mode: string;
      selected_workflow_count: number;
      status: SchedulerJobStatus;
    }>('select id, job_type, workflow_type, job_rule, processing_mode, selected_workflow_count, status from archive_job where id = $1', [id]);
    if (!rows[0]) {
      throw new NotFoundException('Scheduler job not found');
    }
    return rows[0];
  }

  private modeFromJobType(jobType: SchedulerJobType) {
    if (jobType === 'ARCHIVE_FAILED') {
      return 'FAILED';
    }
    if (jobType === 'ARCHIVE_SUSPENDED') {
      return 'SUSPENDED';
    }
    return 'COMPLETED';
  }

  private async reservedProcessIdsInActiveJobs() {
    const { rows } = await this.archiveDb.query<{ process_instance_id: string }>(
      `select distinct archive_job_item.process_instance_id
       from archive_job_item
       join archive_job on archive_job.id = archive_job_item.archive_job_id
       where archive_job.status in ('SCHEDULED', 'RUNNING', 'PARTIAL')
         and archive_job_item.status in ('PENDING', 'RUNNING')`,
    );
    return rows.map((row) => row.process_instance_id);
  }

  private workflowName(jobType: SchedulerJobType) {
    return jobType === 'ARCHIVE_COMPLETED' ? 'completed_task_move_to_archive.bpmn' : 'completed_task_move_to_archive.bpmn';
  }

  private async workflowDirectionFromJob(jobId: string): Promise<'COMPLETED_TO_ARCHIVE' | 'ARCHIVE_TO_COMPLETE'> {
    const { rows } = await this.archiveDb.query<{ workflow_type: 'COMPLETED_TO_ARCHIVE' | 'ARCHIVE_TO_COMPLETE' }>(
      'select workflow_type from archive_job where id = $1',
      [jobId],
    );
    return rows[0]?.workflow_type ?? 'COMPLETED_TO_ARCHIVE';
  }

  private daysForPreview(mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED') {
    if (mode === 'COMPLETED') {
      return 7;
    }
    if (mode === 'FAILED') {
      return 1;
    }
    return 30;
  }

  private async recordRetry(jobId: string, itemId: string | null, status: string, error: string | null) {
    await this.archiveDb.query(
      `insert into archive_job_retry_history (archive_job_id, archive_job_item_id, attempt_number, status, error_message)
       values ($1, $2, (select retry_count + 1 from archive_job where id = $1), $3, $4)`,
      [jobId, itemId, status, error],
    );
  }

  private async ensureJobSchema() {
    try {
      await this.archiveDb.query(`
        create extension if not exists pgcrypto;

      create table if not exists archive_job (
        id uuid primary key default gen_random_uuid(),
        job_type varchar(64) not null,
        job_name varchar(255) not null,
        scheduled_start_time timestamptz not null,
        date_range_start timestamptz,
        date_range_end timestamptz,
        selected_workflow_count integer not null default 0,
        eligible_workflow_count integer not null default 0,
        processing_mode varchar(32) not null default 'SEQUENTIAL',
        status varchar(32) not null default 'SCHEDULED',
        created_by varchar(128) not null default 'operator',
        completed_count integer not null default 0,
        failed_count integer not null default 0,
        in_progress_count integer not null default 0,
        pending_count integer not null default 0,
        retry_count integer not null default 0,
        last_error_message text,
        started_at timestamptz,
        finished_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      alter table archive_job add column if not exists selected_workflow_count integer not null default 0;
      alter table archive_job add column if not exists eligible_workflow_count integer not null default 0;
      alter table archive_job add column if not exists workflow_type varchar(64) not null default 'COMPLETED_TO_ARCHIVE';
      alter table archive_job add column if not exists job_rule varchar(64) not null default 'CURRENT';
      alter table archive_job add column if not exists processing_mode varchar(32) not null default 'SEQUENTIAL';
      alter table archive_job add column if not exists status varchar(32) not null default 'SCHEDULED';
      alter table archive_job add column if not exists created_by varchar(128) not null default 'operator';
      alter table archive_job add column if not exists completed_count integer not null default 0;
      alter table archive_job add column if not exists failed_count integer not null default 0;
      alter table archive_job add column if not exists in_progress_count integer not null default 0;
      alter table archive_job add column if not exists pending_count integer not null default 0;
      alter table archive_job add column if not exists retry_count integer not null default 0;
      alter table archive_job add column if not exists last_error_message text;
      alter table archive_job add column if not exists started_at timestamptz;
      alter table archive_job add column if not exists finished_at timestamptz;
      alter table archive_job add column if not exists created_at timestamptz not null default now();
      alter table archive_job add column if not exists updated_at timestamptz not null default now();

      create table if not exists archive_job_item (
        id uuid primary key default gen_random_uuid(),
        archive_job_id uuid not null references archive_job(id) on delete cascade,
        process_instance_id varchar(64) not null,
        status varchar(32) not null default 'PENDING',
        retry_count integer not null default 0,
        last_error_message text,
        started_at timestamptz,
        finished_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

        create table if not exists archive_job_retry_history (
          id uuid primary key default gen_random_uuid(),
          archive_job_id uuid not null references archive_job(id) on delete cascade,
          archive_job_item_id uuid references archive_job_item(id) on delete set null,
          attempt_number integer not null,
          status varchar(32) not null,
          error_message text,
          attempted_at timestamptz not null default now()
        );
      `);
    } catch (error) {
      this.logger.warn(`Archive scheduler DB unavailable: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('Archive scheduler database is unavailable');
    }
  }
}
