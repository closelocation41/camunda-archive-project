import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ARCHIVE_DB, CAMUNDA_DB } from '../database/database.module';
import { ArchiveQueryDto } from './dto/archive-query.dto';

const HISTORY_TABLES = [
  ['act_hi_procinst', 'arc_act_hi_procinst'],
  ['act_hi_actinst', 'arc_act_hi_actinst'],
  ['act_hi_taskinst', 'arc_act_hi_taskinst'],
  ['act_hi_varinst', 'arc_act_hi_varinst'],
  ['act_hi_detail', 'arc_act_hi_detail'],
  ['act_hi_incident', 'arc_act_hi_incident'],
  ['act_hi_job_log', 'arc_act_hi_job_log'],
  ['act_ge_bytearray', 'arc_act_ge_bytearray'],
  ['act_hi_op_log', 'arc_act_hi_op_log'],
  ['act_hi_attachment', 'arc_act_hi_attachment'],
  ['act_hi_comment', 'arc_act_hi_comment'],
] as const;

@Injectable()
export class ArchiveRepository {
  private readonly targetColumnCache = new Map<string, Set<string>>();

  constructor(
    @Inject(ARCHIVE_DB) private readonly archiveDb: Pool,
    @Inject(CAMUNDA_DB) private readonly camundaDb: Pool,
  ) {}

  async createRun(runType: string) {
    const { rows } = await this.archiveDb.query<{ id: string }>(
      'insert into arc_archive_run (run_type, status) values ($1, $2) returning id',
      [runType, 'RUNNING'],
    );
    return rows[0].id;
  }

  async finishRun(id: string, status: string, counters: Record<string, number>, error?: string) {
    await this.archiveDb.query(
      `update arc_archive_run
       set status = $2, finished_at = now(), selected_count = $3, archived_count = $4,
           skipped_count = $5, failed_count = $6, error_message = $7
       where id = $1`,
      [id, status, counters.selected ?? 0, counters.archived ?? 0, counters.skipped ?? 0, counters.failed ?? 0, error],
    );
  }

  async findEligibleProcessIds(state: 'COMPLETED' | 'FAILED' | 'SUSPENDED', olderThanDays: number, limit: number) {
    const stateFilter =
      state === 'COMPLETED'
        ? "end_time_ is not null and delete_reason_ is null"
        : state === 'FAILED'
          ? "end_time_ is not null and delete_reason_ is not null"
          : "state_ = 'SUSPENDED' and end_time_ is null";

    const { rows } = await this.camundaDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from act_hi_procinst
       where ${stateFilter}
         and coalesce(end_time_, start_time_) < now() - ($1 || ' days')::interval
       order by coalesce(end_time_, start_time_) asc
       limit $2`,
      [olderThanDays, limit],
    );
    return rows.map((row) => row.proc_inst_id_);
  }

  async expandWithChildren(processIds: string[]) {
    if (!processIds.length) {
      return [];
    }
    const { rows } = await this.camundaDb.query<{ proc_inst_id_: string }>(
      `with recursive tree as (
         select proc_inst_id_, super_process_instance_id_
         from act_hi_procinst
         where proc_inst_id_ = any($1)
         union all
         select child.proc_inst_id_, child.super_process_instance_id_
         from act_hi_procinst child
         join tree parent on child.super_process_instance_id_ = parent.proc_inst_id_
       )
       select distinct proc_inst_id_ from tree`,
      [processIds],
    );
    return rows.map((row) => row.proc_inst_id_);
  }

  async archivedStatus(processIds: string[]) {
    if (!processIds.length) {
      return new Map<string, boolean>();
    }

    const { rows } = await this.archiveDb.query<{ proc_inst_id_: string }>(
      `select distinct proc_inst_id_
       from arc_act_hi_procinst
       where proc_inst_id_ = any($1) and soft_deleted_at is null`,
      [processIds],
    );
    const archived = new Set(rows.map((row) => row.proc_inst_id_));
    return new Map(processIds.map((id) => [id, archived.has(id)]));
  }

  async copyHistory(processIds: string[], archiveRunId: string) {
    if (!processIds.length) {
      return 0;
    }

    let archived = 0;
    const archiveClient = await this.archiveDb.connect();
    const camundaClient = await this.camundaDb.connect();

    try {
      await archiveClient.query('begin');
      for (const [source, target] of HISTORY_TABLES) {
        const { rows } = await camundaClient.query(`select * from ${source} where ${this.processFilter(source)}`, [processIds]);
        const targetColumns = await this.archiveColumns(archiveClient, target);
        for (const row of rows) {
          const columns = Object.keys(row).filter((column) => targetColumns.has(column));
          const values = columns.map((column) => row[column]);
          const placeholders = columns.map((_, index) => `$${index + 1}`);
          await archiveClient.query(
            `insert into ${target} (${columns.join(', ')}, archive_run_id)
             values (${placeholders.join(', ')}, $${columns.length + 1})
             on conflict do nothing`,
            [...values, archiveRunId],
          );
          archived += 1;
        }
      }
      await archiveClient.query('commit');
      return archived;
    } catch (error) {
      await archiveClient.query('rollback');
      throw error;
    } finally {
      archiveClient.release();
      camundaClient.release();
    }
  }

  async listArchived(query: ArchiveQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const values: unknown[] = [];
    const predicates = ['soft_deleted_at is null'];
    if (query.state) {
      values.push(query.state);
      predicates.push(`state_ = $${values.length}`);
    }
    if (query.search) {
      values.push(`%${query.search}%`);
      predicates.push(`(proc_inst_id_ ilike $${values.length} or business_key_ ilike $${values.length} or proc_def_key_ ilike $${values.length})`);
    }
    values.push(query.limit, offset);

    const where = predicates.join(' and ');
    const { rows } = await this.archiveDb.query(
      `select proc_inst_id_, business_key_, proc_def_key_, proc_def_id_, start_time_, end_time_,
              duration_, state_, super_process_instance_id_, root_proc_inst_id_, archived_at
       from arc_act_hi_procinst
       where ${where}
       order by archived_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    const count = await this.archiveDb.query<{ count: string }>(
      `select count(*)::text from arc_act_hi_procinst where ${where}`,
      values.slice(0, -2),
    );
    return { data: rows, total: Number(count.rows[0].count), page: query.page, limit: query.limit };
  }

  async getArchiveBundle(processInstanceId: string) {
    const [process, activities, tasks, variables, incidents, jobs, comments] = await Promise.all([
      this.archiveDb.query('select * from arc_act_hi_procinst where proc_inst_id_ = $1', [processInstanceId]),
      this.archiveDb.query('select * from arc_act_hi_actinst where proc_inst_id_ = $1 order by start_time_', [processInstanceId]),
      this.archiveDb.query('select * from arc_act_hi_taskinst where proc_inst_id_ = $1 order by start_time_', [processInstanceId]),
      this.archiveDb.query('select * from arc_act_hi_varinst where proc_inst_id_ = $1 order by create_time_', [processInstanceId]),
      this.archiveDb.query('select * from arc_act_hi_incident where proc_inst_id_ = $1 order by create_time_', [processInstanceId]),
      this.archiveDb.query('select * from arc_act_hi_job_log where process_instance_id_ = $1 order by timestamp_', [processInstanceId]),
      this.archiveDb.query('select * from arc_act_hi_comment where proc_inst_id_ = $1 order by time_', [processInstanceId]),
    ]);
    return {
      process: process.rows[0],
      activities: activities.rows,
      tasks: tasks.rows,
      variables: variables.rows,
      incidents: incidents.rows,
      jobs: jobs.rows,
      comments: comments.rows,
    };
  }

  private processFilter(table: string) {
    if (table === 'act_hi_job_log') {
      return 'process_instance_id_ = any($1)';
    }
    if (table === 'act_ge_bytearray') {
      return `id_ in (
        select bytearray_id_ from act_hi_varinst where proc_inst_id_ = any($1) and bytearray_id_ is not null
        union select bytearray_id_ from act_hi_detail where proc_inst_id_ = any($1) and bytearray_id_ is not null
        union select job_exception_stack_id_ from act_hi_job_log where process_instance_id_ = any($1) and job_exception_stack_id_ is not null
      )`;
    }
    return 'proc_inst_id_ = any($1)';
  }

  private async archiveColumns(client: PoolClient, tableName: string) {
    const cached = this.targetColumnCache.get(tableName);
    if (cached) {
      return cached;
    }

    const { rows } = await client.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public' and table_name = $1`,
      [tableName],
    );
    const columns = new Set(rows.map((row) => row.column_name));
    this.targetColumnCache.set(tableName, columns);
    return columns;
  }
}
