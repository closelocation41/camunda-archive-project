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
  ['act_hi_identitylink', 'arc_act_hi_identitylink'],
  ['act_hi_decinst', 'arc_act_hi_decinst'],
  ['act_hi_dec_in', 'arc_act_hi_dec_in'],
  ['act_hi_dec_out', 'arc_act_hi_dec_out'],
  ['act_hi_batch', 'arc_act_hi_batch'],
  ['act_hi_incident', 'arc_act_hi_incident'],
  ['act_hi_job_log', 'arc_act_hi_job_log'],
  ['act_hi_ext_task_log', 'arc_act_hi_ext_task_log'],
  ['act_hi_caseinst', 'arc_act_hi_caseinst'],
  ['act_hi_caseactinst', 'arc_act_hi_caseactinst'],
  ['act_hi_casetaskinst', 'arc_act_hi_casetaskinst'],
  ['act_ge_bytearray', 'arc_act_ge_bytearray'],
  ['act_hi_op_log', 'arc_act_hi_op_log'],
  ['act_hi_attachment', 'arc_act_hi_attachment'],
  ['act_hi_comment', 'arc_act_hi_comment'],
] as const;

const ARCHIVE_METADATA_COLUMNS = new Set(['archived_at', 'archive_run_id', 'soft_deleted_at']);

@Injectable()
export class ArchiveRepository {
  private readonly columnCache = new Map<string, Set<string>>();

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

  async countSchedulerProcessIds(state: 'COMPLETED' | 'FAILED' | 'SUSPENDED', rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL') {
    const stateFilter =
      state === 'COMPLETED'
        ? "end_time_ is not null and delete_reason_ is null"
        : state === 'FAILED'
          ? "end_time_ is not null and delete_reason_ is not null"
          : "state_ = 'SUSPENDED' and end_time_ is null";
    const timeFilter = this.ruleTimeFilter(rule, 'coalesce(end_time_, start_time_)');
    const { rows } = await this.camundaDb.query<{ count: string }>(
      `select count(*)::text as count
       from act_hi_procinst
       where ${stateFilter}
         ${timeFilter}`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async findSchedulerProcessIds(state: 'COMPLETED' | 'FAILED' | 'SUSPENDED', rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL', limit: number) {
    const stateFilter =
      state === 'COMPLETED'
        ? "end_time_ is not null and delete_reason_ is null"
        : state === 'FAILED'
          ? "end_time_ is not null and delete_reason_ is not null"
          : "state_ = 'SUSPENDED' and end_time_ is null";
    const timeFilter = this.ruleTimeFilter(rule, 'coalesce(end_time_, start_time_)');

    const { rows } = await this.camundaDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from act_hi_procinst
       where ${stateFilter}
         ${timeFilter}
       order by coalesce(end_time_, start_time_) desc
       limit $1`,
      [limit],
    );
    return rows.map((row) => row.proc_inst_id_);
  }

  async countArchivedProcessIds(rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL') {
    const timeFilter = this.ruleTimeFilter(rule, 'archived_at');
    const { rows } = await this.archiveDb.query<{ count: string }>(
      `select count(*)::text as count
       from arc_act_hi_procinst
       where soft_deleted_at is null
         ${timeFilter}`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async findArchivedProcessIds(rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL', limit: number) {
    const timeFilter = this.ruleTimeFilter(rule, 'archived_at');
    const { rows } = await this.archiveDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from arc_act_hi_procinst
       where soft_deleted_at is null
         ${timeFilter}
       order by archived_at desc
       limit $1`,
      [limit],
    );
    return rows.map((row) => row.proc_inst_id_);
  }

  async filterIndependentProcessIds(processIds: string[]) {
    if (!processIds.length) {
      return [];
    }

    const { rows } = await this.camundaDb.query<{ proc_inst_id_: string }>(
      `with recursive ancestors as (
         select child.proc_inst_id_, parent.proc_inst_id_ as ancestor_id_
         from act_hi_procinst child
         join act_hi_procinst parent on child.super_process_instance_id_ = parent.proc_inst_id_
         where child.proc_inst_id_ = any($1)
         union all
         select ancestors.proc_inst_id_, parent.proc_inst_id_ as ancestor_id_
         from ancestors
         join act_hi_procinst child on child.proc_inst_id_ = ancestors.ancestor_id_
         join act_hi_procinst parent on child.super_process_instance_id_ = parent.proc_inst_id_
       )
       select candidate.proc_inst_id_
       from unnest($1::varchar[]) with ordinality as candidate(proc_inst_id_, sort_order)
       where not exists (
         select 1
         from ancestors
         where ancestors.proc_inst_id_ = candidate.proc_inst_id_
           and ancestors.ancestor_id_ = any($1)
       )
       order by candidate.sort_order`,
      [processIds],
    );
    return rows.map((row) => row.proc_inst_id_);
  }

  async filterIndependentArchivedProcessIds(processIds: string[]) {
    if (!processIds.length) {
      return [];
    }

    const { rows } = await this.archiveDb.query<{ proc_inst_id_: string }>(
      `with recursive ancestors as (
         select child.proc_inst_id_, parent.proc_inst_id_ as ancestor_id_
         from arc_act_hi_procinst child
         join arc_act_hi_procinst parent on child.super_process_instance_id_ = parent.proc_inst_id_
         where child.proc_inst_id_ = any($1)
         union all
         select ancestors.proc_inst_id_, parent.proc_inst_id_ as ancestor_id_
         from ancestors
         join arc_act_hi_procinst child on child.proc_inst_id_ = ancestors.ancestor_id_
         join arc_act_hi_procinst parent on child.super_process_instance_id_ = parent.proc_inst_id_
       )
       select candidate.proc_inst_id_
       from unnest($1::varchar[]) with ordinality as candidate(proc_inst_id_, sort_order)
       where not exists (
         select 1
         from ancestors
         where ancestors.proc_inst_id_ = candidate.proc_inst_id_
           and ancestors.ancestor_id_ = any($1)
       )
       order by candidate.sort_order`,
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

  async verifyWorkflowReadyForRestore(processIds: string[]) {
    if (!processIds.length) {
      return { ready: false, reason: 'No archived workflow ids were selected for restore.' };
    }

    const processCheck = await this.archiveDb.query<{ total_count: string; missing_count: string }>(
      `select count(*)::text as total_count,
              count(*) filter (where proc_inst_id_ is null)::text as missing_count
       from arc_act_hi_procinst
       where proc_inst_id_ = any($1)`,
      [processIds],
    );

    const total = Number(processCheck.rows[0]?.total_count ?? 0);
    if (total !== processIds.length) {
      return { ready: false, reason: 'Archived workflow history is missing for one or more selected workflows.' };
    }

    return { ready: true };
  }

  async verifyWorkflowReadyForArchive(processIds: string[], mode: 'COMPLETED' | 'FAILED' | 'SUSPENDED') {
    if (!processIds.length) {
      return { ready: false, reason: 'No workflow ids were selected for archive.' };
    }

    const processCheck = await this.camundaDb.query<{ invalid_count: string; total_count: string }>(
      `select
         count(*)::text as total_count,
         count(*) filter (
           where not (
             case
               when $2 = 'COMPLETED' then end_time_ is not null and delete_reason_ is null
               when $2 = 'FAILED' then end_time_ is not null and delete_reason_ is not null
               when $2 = 'SUSPENDED' then state_ = 'SUSPENDED' and end_time_ is null
               else false
             end
           )
         )::text as invalid_count
       from act_hi_procinst
       where proc_inst_id_ = any($1)`,
      [processIds, mode],
    );

    const total = Number(processCheck.rows[0]?.total_count ?? 0);
    const invalid = Number(processCheck.rows[0]?.invalid_count ?? 0);
    if (total !== processIds.length) {
      return { ready: false, reason: 'Parent or child workflow history is missing in Camunda.' };
    }
    if (invalid > 0) {
      return { ready: false, reason: `Workflow tree is not ready for ${mode.toLowerCase()} archive.` };
    }

    if (mode === 'COMPLETED') {
      const tasks = await this.camundaDb.query<{ open_count: string }>(
        `select count(*)::text as open_count
         from act_hi_taskinst
         where proc_inst_id_ = any($1) and end_time_ is null`,
        [processIds],
      );
      if (Number(tasks.rows[0]?.open_count ?? 0) > 0) {
        return { ready: false, reason: 'Workflow tree still has unfinished task history.' };
      }
    }

    return { ready: true };
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
      await camundaClient.query('begin');
      for (const [source, target] of HISTORY_TABLES) {
        if (!(await this.tableExists(camundaClient, source))) {
          continue;
        }
        await this.ensureArchiveTable(camundaClient, archiveClient, source, target);
        const predicate = await this.processFilter(camundaClient, source, false);
        if (!predicate) {
          continue;
        }
        const { rows } = await camundaClient.query(`select * from ${source} where ${predicate}`, [processIds]);
        if (!rows.length) {
          continue;
        }
        const targetColumns = await this.tableColumns(archiveClient, target);
        for (const row of rows) {
          const columns = this.insertableColumns(row, targetColumns);
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
      await this.deleteHistory(camundaClient, processIds, false);
      await archiveClient.query('commit');
      await camundaClient.query('commit');
      return archived;
    } catch (error) {
      await archiveClient.query('rollback');
      await camundaClient.query('rollback');
      throw error;
    } finally {
      archiveClient.release();
      camundaClient.release();
    }
  }

  async restoreHistory(processIds: string[]) {
    if (!processIds.length) {
      return 0;
    }

    let restored = 0;
    const archiveClient = await this.archiveDb.connect();
    const camundaClient = await this.camundaDb.connect();

    try {
      await archiveClient.query('begin');
      await camundaClient.query('begin');
      for (const [target, source] of HISTORY_TABLES) {
        if (!(await this.tableExists(archiveClient, source)) || !(await this.tableExists(camundaClient, target))) {
          continue;
        }
        const predicate = await this.processFilter(archiveClient, source, true);
        if (!predicate) {
          continue;
        }
        const { rows } = await archiveClient.query(`select * from ${source} where ${predicate}`, [processIds]);
        if (!rows.length) {
          continue;
        }
        const targetColumns = await this.tableColumns(camundaClient, target);
        for (const row of rows) {
          const columns = this.insertableColumns(row, targetColumns);
          const values = columns.map((column) => row[column]);
          const placeholders = columns.map((_, index) => `$${index + 1}`);
          await camundaClient.query(
            `insert into ${target} (${columns.join(', ')})
             values (${placeholders.join(', ')})
             on conflict do nothing`,
            values,
          );
          restored += 1;
        }
      }
      await this.deleteHistory(archiveClient, processIds, true);
      await camundaClient.query('commit');
      await archiveClient.query('commit');
      return restored;
    } catch (error) {
      await camundaClient.query('rollback');
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

  private async processFilter(client: PoolClient, table: string, archive: boolean): Promise<string | null> {
    const columns = await this.tableColumns(client, table);

    if (table.endsWith('act_hi_job_log') && columns.has('process_instance_id_')) {
      return 'process_instance_id_ = any($1)';
    }
    if (table.endsWith('act_ge_bytearray')) {
      const prefix = archive ? 'arc_' : '';
      const unionParts = [
        `select bytearray_id_ from ${prefix}act_hi_varinst where proc_inst_id_ = any($1) and bytearray_id_ is not null`,
        `select bytearray_id_ from ${prefix}act_hi_detail where proc_inst_id_ = any($1) and bytearray_id_ is not null`,
        `select job_exception_stack_id_ from ${prefix}act_hi_job_log where process_instance_id_ = any($1) and job_exception_stack_id_ is not null`,
      ];
      if (await this.tableExists(client, `${prefix}act_hi_dec_in`)) {
        const decisionInputFilter = await this.processFilter(client, `${prefix}act_hi_dec_in`, archive);
        if (decisionInputFilter) {
          unionParts.push(`select bytearray_id_ from ${prefix}act_hi_dec_in where ${decisionInputFilter} and bytearray_id_ is not null`);
        }
      }
      if (await this.tableExists(client, `${prefix}act_hi_dec_out`)) {
        const decisionOutputFilter = await this.processFilter(client, `${prefix}act_hi_dec_out`, archive);
        if (decisionOutputFilter) {
          unionParts.push(`select bytearray_id_ from ${prefix}act_hi_dec_out where ${decisionOutputFilter} and bytearray_id_ is not null`);
        }
      }
      if (await this.tableExists(client, `${prefix}act_hi_ext_task_log`)) {
        const externalTaskFilter = await this.processFilter(client, `${prefix}act_hi_ext_task_log`, archive);
        if (externalTaskFilter) {
          unionParts.push(`select error_details_id_ from ${prefix}act_hi_ext_task_log where ${externalTaskFilter} and error_details_id_ is not null`);
        }
      }
      if (await this.tableExists(client, `${prefix}act_hi_attachment`)) {
        const attachmentFilter = await this.processFilter(client, `${prefix}act_hi_attachment`, archive);
        if (attachmentFilter) {
          unionParts.push(`select content_id_ from ${prefix}act_hi_attachment where ${attachmentFilter} and content_id_ is not null`);
        }
      }
      return `id_ in (${unionParts.join(' union ')})`;
    }
    if (table.endsWith('act_hi_dec_in') || table.endsWith('act_hi_dec_out')) {
      const prefix = archive ? 'arc_' : '';
      if (!(await this.tableExists(client, `${prefix}act_hi_decinst`))) {
        return null;
      }
      const decisionFilter = await this.processFilter(client, `${prefix}act_hi_decinst`, archive);
      if (!decisionFilter) {
        return null;
      }
      return `dec_inst_id_ in (
        select id_ from ${prefix}act_hi_decinst
        where ${decisionFilter}
      )`;
    }
    if (table.endsWith('act_hi_batch')) {
      const prefix = archive ? 'arc_' : '';
      if (!(await this.tableExists(client, `${prefix}act_hi_op_log`))) {
        return null;
      }
      const operationFilter = await this.processFilter(client, `${prefix}act_hi_op_log`, archive);
      if (!operationFilter) {
        return null;
      }
      return `id_ in (
        select batch_id_ from ${prefix}act_hi_op_log where ${operationFilter} and batch_id_ is not null
      )`;
    }
    if (table.endsWith('act_hi_caseinst')) {
      const prefix = archive ? 'arc_' : '';
      return `id_ in (
        select case_inst_id_ from ${prefix}act_hi_procinst where proc_inst_id_ = any($1) and case_inst_id_ is not null
        union select super_case_instance_id_ from ${prefix}act_hi_procinst where proc_inst_id_ = any($1) and super_case_instance_id_ is not null
      )`;
    }
    if (table.endsWith('act_hi_caseactinst') || table.endsWith('act_hi_casetaskinst')) {
      const prefix = archive ? 'arc_' : '';
      return `case_inst_id_ in (
        select case_inst_id_ from ${prefix}act_hi_procinst where proc_inst_id_ = any($1) and case_inst_id_ is not null
        union select super_case_instance_id_ from ${prefix}act_hi_procinst where proc_inst_id_ = any($1) and super_case_instance_id_ is not null
      )`;
    }
    if (columns.has('proc_inst_id_')) {
      return 'proc_inst_id_ = any($1)';
    }
    if (columns.has('root_proc_inst_id_')) {
      return 'root_proc_inst_id_ = any($1)';
    }
    if (columns.has('process_instance_id_')) {
      return 'process_instance_id_ = any($1)';
    }
    if (columns.has('task_id_')) {
      const prefix = archive ? 'arc_' : '';
      return `task_id_ in (
        select id_ from ${prefix}act_hi_taskinst where proc_inst_id_ = any($1)
      )`;
    }
    return null;
  }

  private insertableColumns(row: Record<string, unknown>, targetColumns: Set<string>) {
    return Object.keys(row).filter((column) => targetColumns.has(column) && !ARCHIVE_METADATA_COLUMNS.has(column));
  }

  private async deleteHistory(client: PoolClient, processIds: string[], archive: boolean) {
    const tables = archive ? HISTORY_TABLES.map(([, target]) => target) : HISTORY_TABLES.map(([source]) => source);
    const procInstTable = archive ? 'arc_act_hi_procinst' : 'act_hi_procinst';
    const byteArrayTable = archive ? 'arc_act_ge_bytearray' : 'act_ge_bytearray';
    const deleteOrder = [
      ...tables.filter((table) => table !== byteArrayTable && table !== procInstTable),
      byteArrayTable,
      procInstTable,
    ];

    for (const table of deleteOrder) {
      if (!(await this.tableExists(client, table))) {
        continue;
      }
      const predicate = await this.processFilter(client, table, archive);
      if (!predicate) {
        continue;
      }
      await client.query(`delete from ${table} where ${predicate}`, [processIds]);
    }
  }

  private async ensureArchiveTable(sourceClient: PoolClient, archiveClient: PoolClient, sourceTable: string, targetTable: string) {
    const sourceColumns = await this.columnDefinitions(sourceClient, sourceTable);
    await archiveClient.query(
      `create table if not exists ${targetTable} (
        ${sourceColumns.map((column) => `${column.name} ${column.type}`).join(', ')},
        archived_at timestamptz NOT NULL DEFAULT now(),
        archive_run_id uuid,
        soft_deleted_at timestamptz
      )`,
    );
    const targetColumns = await this.tableColumns(archiveClient, targetTable);

    for (const column of sourceColumns) {
      if (!targetColumns.has(column.name)) {
        await archiveClient.query(`alter table ${targetTable} add column ${column.name} ${column.type}`);
      }
    }

    const metadataColumns = [
      ['archived_at', 'timestamptz NOT NULL DEFAULT now()'],
      ['archive_run_id', 'uuid'],
      ['soft_deleted_at', 'timestamptz'],
    ] as const;
    for (const [column, type] of metadataColumns) {
      if (!targetColumns.has(column)) {
        await archiveClient.query(`alter table ${targetTable} add column ${column} ${type}`);
      }
    }

    this.columnCache.delete(targetTable);
  }

  private async tableExists(client: PoolClient, tableName: string) {
    const { rows } = await client.query<{ exists: boolean }>('select to_regclass($1) is not null as exists', [tableName]);
    return rows[0]?.exists ?? false;
  }

  private async tableColumns(client: PoolClient, tableName: string) {
    const cached = this.columnCache.get(tableName);
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
    this.columnCache.set(tableName, columns);
    return columns;
  }

  private async columnDefinitions(client: PoolClient, tableName: string) {
    const { rows } = await client.query<{
      column_name: string;
      data_type: string;
      udt_name: string;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
      datetime_precision: number | null;
    }>(
      `select column_name, data_type, udt_name, character_maximum_length,
              numeric_precision, numeric_scale, datetime_precision
       from information_schema.columns
       where table_schema = 'public' and table_name = $1
       order by ordinal_position`,
      [tableName],
    );
    return rows.map((row) => ({ name: row.column_name, type: this.columnType(row) }));
  }

  private columnType(column: {
    data_type: string;
    udt_name: string;
    character_maximum_length: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
    datetime_precision: number | null;
  }) {
    if (column.data_type === 'character varying') {
      return column.character_maximum_length ? `varchar(${column.character_maximum_length})` : 'varchar';
    }
    if (column.data_type === 'character') {
      return column.character_maximum_length ? `char(${column.character_maximum_length})` : 'char';
    }
    if (column.data_type === 'numeric' || column.data_type === 'decimal') {
      if (column.numeric_precision && column.numeric_scale !== null) {
        return `numeric(${column.numeric_precision}, ${column.numeric_scale})`;
      }
      return column.data_type;
    }
    if (column.data_type === 'timestamp with time zone') {
      return column.datetime_precision !== null ? `timestamptz(${column.datetime_precision})` : 'timestamptz';
    }
    if (column.data_type === 'timestamp without time zone') {
      return column.datetime_precision !== null ? `timestamp(${column.datetime_precision})` : 'timestamp';
    }
    if (column.data_type === 'USER-DEFINED') {
      return column.udt_name;
    }
    if (column.data_type === 'ARRAY') {
      return `${column.udt_name.replace(/^_/, '')}[]`;
    }
    return column.data_type;
  }

  private ruleTimeFilter(rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL', column: string) {
    if (rule === 'LAST_7_DAYS') {
      return `and ${column} >= now() - interval '7 days'`;
    }
    if (rule === 'LAST_30_DAYS') {
      return `and ${column} >= now() - interval '30 days'`;
    }
    return '';
  }
}
