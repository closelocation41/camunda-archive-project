import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ARCHIVE_DB, CAMUNDA_DB } from '../database/database.module';
import { ArchiveQueryDto } from './dto/archive-query.dto';

const HISTORY_TABLES = [
  ['act_hi_procinst', 'act_hi_procinst'],
  ['act_hi_actinst', 'act_hi_actinst'],
  ['act_hi_taskinst', 'act_hi_taskinst'],
  ['act_hi_varinst', 'act_hi_varinst'],
  ['act_hi_detail', 'act_hi_detail'],
  ['act_hi_incident', 'act_hi_incident'],
  ['act_hi_job_log', 'act_hi_job_log'],
  ['act_hi_op_log', 'act_hi_op_log'],
  ['act_hi_attachment', 'act_hi_attachment'],
  ['act_hi_comment', 'act_hi_comment'],
  ['act_hi_identitylink', 'act_hi_identitylink'],
  ['act_hi_caseinst', 'act_hi_caseinst'],
  ['act_hi_caseactinst', 'act_hi_caseactinst'],
  ['act_hi_decinst', 'act_hi_decinst'],
  ['act_hi_dec_in', 'act_hi_dec_in'],
  ['act_hi_dec_out', 'act_hi_dec_out'],
  ['act_hi_ext_task_log', 'act_hi_ext_task_log'],
  ['act_hi_batch', 'act_hi_batch'],
  ['act_ge_bytearray', 'act_ge_bytearray'],
] as const;

const ARCHIVE_METADATA_COLUMNS = new Set(['archived_at', 'archive_run_id', 'soft_deleted_at']);

@Injectable()
export class ArchiveRepository {
  private readonly columnCache = new WeakMap<object, Map<string, Set<string>>>();

  constructor(
    @Inject(ARCHIVE_DB) private readonly archiveDb: Pool,
    @Inject(CAMUNDA_DB) private readonly camundaDb: Pool,
  ) {}

  async createRun(runType: string) {
    await this.ensureArchiveRunTable();
    const { rows } = await this.archiveDb.query<{ id: string }>(
      'insert into arc_archive_run (run_type, status) values ($1, $2) returning id',
      [runType, 'RUNNING'],
    );
    return rows[0].id;
  }

  async finishRun(id: string, status: string, counters: Record<string, number>, error?: string) {
    await this.ensureArchiveRunTable();
    await this.archiveDb.query(
      `update arc_archive_run
       set status = $2, finished_at = now(), selected_count = $3, archived_count = $4,
           skipped_count = $5, failed_count = $6, error_message = $7
       where id = $1`,
      [id, status, counters.selected ?? 0, counters.archived ?? 0, counters.skipped ?? 0, counters.failed ?? 0, error],
    );
  }

  private async ensureArchiveRunTable() {
    await this.archiveDb.query(`
      create table if not exists arc_archive_run (
        id uuid primary key default gen_random_uuid(),
        run_type varchar(128) not null,
        status varchar(32) not null default 'RUNNING',
        selected_count integer not null default 0,
        archived_count integer not null default 0,
        skipped_count integer not null default 0,
        failed_count integer not null default 0,
        error_message text,
        started_at timestamptz not null default now(),
        finished_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      alter table arc_archive_run add column if not exists run_type varchar(128);
      alter table arc_archive_run add column if not exists status varchar(32) not null default 'RUNNING';
      alter table arc_archive_run add column if not exists selected_count integer not null default 0;
      alter table arc_archive_run add column if not exists archived_count integer not null default 0;
      alter table arc_archive_run add column if not exists skipped_count integer not null default 0;
      alter table arc_archive_run add column if not exists failed_count integer not null default 0;
      alter table arc_archive_run add column if not exists error_message text;
      alter table arc_archive_run add column if not exists started_at timestamptz not null default now();
      alter table arc_archive_run add column if not exists finished_at timestamptz;
      alter table arc_archive_run add column if not exists created_at timestamptz not null default now();
      alter table arc_archive_run add column if not exists updated_at timestamptz not null default now();
    `);
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
    const candidateIds = rows.map((row) => row.proc_inst_id_);
    return this.filterIndependentProcessIds(candidateIds);
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

  async countSchedulerProcessIds(
    state: 'COMPLETED' | 'FAILED' | 'SUSPENDED',
    rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL',
    excludedProcessIds: string[] = [],
  ) {
    const stateFilter =
      state === 'COMPLETED'
        ? "end_time_ is not null and delete_reason_ is null"
        : state === 'FAILED'
          ? "end_time_ is not null and delete_reason_ is not null"
          : "state_ = 'SUSPENDED' and end_time_ is null";
    const timeFilter = this.ruleTimeFilter(rule, 'coalesce(end_time_, start_time_)');
    const exclusion = this.exclusionFilter(excludedProcessIds, 'proc_inst_id_', 1);
    const { rows } = await this.camundaDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from act_hi_procinst
       where ${stateFilter}
         ${timeFilter}
         ${exclusion.clause}`,
      exclusion.args,
    );
    const candidateIds = rows.map((row) => row.proc_inst_id_);
    return (await this.filterIndependentProcessIds(candidateIds)).length;
  }

  async findSchedulerProcessIds(
    state: 'COMPLETED' | 'FAILED' | 'SUSPENDED',
    rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL',
    limit: number,
    excludedProcessIds: string[] = [],
  ) {
    const stateFilter =
      state === 'COMPLETED'
        ? "end_time_ is not null and delete_reason_ is null"
        : state === 'FAILED'
          ? "end_time_ is not null and delete_reason_ is not null"
          : "state_ = 'SUSPENDED' and end_time_ is null";
    const timeFilter = this.ruleTimeFilter(rule, 'coalesce(end_time_, start_time_)');
    const exclusion = this.exclusionFilter(excludedProcessIds, 'proc_inst_id_', 1);
    const limitIndex = excludedProcessIds.length ? 2 : 1;
    const { rows } = await this.camundaDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from act_hi_procinst
       where ${stateFilter}
         ${timeFilter}
         ${exclusion.clause}
       order by coalesce(end_time_, start_time_) desc
       limit $${limitIndex}`,
      [...exclusion.args, limit],
    );
    const candidateIds = rows.map((row) => row.proc_inst_id_);
    return this.filterIndependentProcessIds(candidateIds);
  }

  async countArchivedProcessIds(
    rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL',
    excludedProcessIds: string[] = [],
  ) {
    const timeFilter = this.ruleTimeFilter(rule, 'archived_at');
    const exclusion = this.exclusionFilter(excludedProcessIds, 'proc_inst_id_', 1);
    const { rows } = await this.archiveDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from act_hi_procinst
       where soft_deleted_at is null
         ${timeFilter}
         ${exclusion.clause}`,
      exclusion.args,
    );
    const candidateIds = rows.map((row) => row.proc_inst_id_);
    return (await this.filterIndependentArchivedProcessIds(candidateIds)).length;
  }

  async findArchivedProcessIds(
    rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL',
    limit: number,
    excludedProcessIds: string[] = [],
  ) {
    const timeFilter = this.ruleTimeFilter(rule, 'archived_at');
    const exclusion = this.exclusionFilter(excludedProcessIds, 'proc_inst_id_', 1);
    const limitIndex = excludedProcessIds.length ? 2 : 1;
    const { rows } = await this.archiveDb.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from act_hi_procinst
       where soft_deleted_at is null
         ${timeFilter}
         ${exclusion.clause}
       order by archived_at desc
       limit $${limitIndex}`,
      [...exclusion.args, limit],
    );
    const candidateIds = rows.map((row) => row.proc_inst_id_);
    return this.filterIndependentArchivedProcessIds(candidateIds);
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

  async archivedStatus(processIds: string[]) {
    if (!processIds.length) {
      return new Map<string, boolean>();
    }

    const { rows } = await this.archiveDb.query<{ proc_inst_id_: string }>(
      `select distinct proc_inst_id_
       from act_hi_procinst
       where proc_inst_id_ = any($1) and soft_deleted_at is null`,
      [processIds],
    );
    const archived = new Set(rows.map((row) => row.proc_inst_id_));
    return new Map(processIds.map((id) => [id, archived.has(id)]));
  }

  private exclusionFilter(excludedProcessIds: string[], column: string, startIndex: number) {
    if (!excludedProcessIds.length) {
      return { clause: '', args: [] as unknown[] };
    }
    return {
      clause: `and ${column} not in (select unnest($${startIndex}::varchar[]))`,
      args: [excludedProcessIds],
    };
  }

  async verifyWorkflowReadyForRestore(processIds: string[]) {
    if (!processIds.length) {
      return { ready: false, reason: 'No archived workflow ids were selected for restore.' };
    }

    const processCheck = await this.archiveDb.query<{ total_count: string; missing_count: string }>(
      `select count(*)::text as total_count,
              count(*) filter (where proc_inst_id_ is null)::text as missing_count
       from act_hi_procinst
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
      const historyTablePairs = await this.resolveHistoryTablePairs(camundaClient, archiveClient);
      for (const [source, target] of historyTablePairs) {
        await this.ensureTargetColumns(camundaClient, archiveClient, source, target);
        const whereClause = await this.processFilter(camundaClient, source, false);
        if (!whereClause) {
          continue;
        }
        const { rows } = await camundaClient.query(`select * from ${source} where ${whereClause}`, [processIds]);
        const targetColumns = await this.tableColumns(archiveClient, target);
        for (const row of rows) {
          const columns = this.insertableColumns(row, targetColumns);
          if (!columns.length) {
            continue;
          }
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
      const historyTablePairs = await this.resolveHistoryTablePairs(archiveClient, camundaClient);
      for (const [target, source] of historyTablePairs) {
        await this.ensureTargetColumns(archiveClient, camundaClient, source, target);
        const whereClause = await this.processFilter(archiveClient, source, true);
        if (!whereClause) {
          continue;
        }
        const { rows } = await archiveClient.query(`select * from ${source} where ${whereClause}`, [processIds]);
        const targetColumns = await this.tableColumns(camundaClient, target);
        for (const row of rows) {
          const columns = this.insertableColumns(row, targetColumns);
          if (!columns.length) {
            continue;
          }
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
       from act_hi_procinst
       where ${where}
       order by archived_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    const pagedRows = rows.slice(offset, offset + query.limit);
    return { data: pagedRows, total: rows.length, page: query.page, limit: query.limit };
  }

  async getArchiveBundle(processInstanceId: string) {
    const [process, activities, tasks, variables, incidents, jobs, comments] = await Promise.all([
      this.archiveDb.query('select * from act_hi_procinst where proc_inst_id_ = $1', [processInstanceId]),
      this.archiveDb.query('select * from act_hi_actinst where proc_inst_id_ = $1 order by start_time_', [processInstanceId]),
      this.archiveDb.query('select * from act_hi_taskinst where proc_inst_id_ = $1 order by start_time_', [processInstanceId]),
      this.archiveDb.query('select * from act_hi_varinst where proc_inst_id_ = $1 order by create_time_', [processInstanceId]),
      this.archiveDb.query('select * from act_hi_incident where proc_inst_id_ = $1 order by create_time_', [processInstanceId]),
      this.archiveDb.query('select * from act_hi_job_log where process_instance_id_ = $1 order by timestamp_', [processInstanceId]),
      this.archiveDb.query('select * from act_hi_comment where proc_inst_id_ = $1 order by time_', [processInstanceId]),
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

  private async resolveHistoryTablePairs(sourceClient: Pool | PoolClient, targetClient: Pool | PoolClient) {
    const pairs: Array<[string, string]> = [];
    for (const [source, target] of HISTORY_TABLES) {
      const sourceExists = await this.tableExists(sourceClient, source);
      const targetExists = await this.tableExists(targetClient, target);
      if (!sourceExists || !targetExists) {
        continue;
      }
      pairs.push([source, target]);
    }
    return pairs;
  }

  private async ensureTargetColumns(
    sourceClient: Pool | PoolClient,
    targetClient: Pool | PoolClient,
    sourceTable: string,
    targetTable: string,
  ) {
    const sourceColumns = await this.columnDefinitions(sourceClient, sourceTable);
    const targetColumns = await this.tableColumns(targetClient, targetTable);
    const missingColumns = sourceColumns.filter((column) => !targetColumns.has(column.name) && !ARCHIVE_METADATA_COLUMNS.has(column.name));

    if (!missingColumns.length) {
      return;
    }

    for (const column of missingColumns) {
      await targetClient.query(
        `alter table ${targetTable} add column if not exists ${this.quoteIdentifier(column.name)} ${column.definition}`,
      );
    }

    this.columnCache.delete(targetClient);
  }

  private async processFilter(client: Pool | PoolClient, table: string, archive: boolean) {
    if (table.endsWith('act_hi_job_log')) {
      return 'process_instance_id_ = any($1)';
    }
    if (table.endsWith('act_ge_bytearray')) {
      return `id_ in (
        select bytearray_id_ from act_hi_varinst where proc_inst_id_ = any($1) and bytearray_id_ is not null
        union select bytearray_id_ from act_hi_detail where proc_inst_id_ = any($1) and bytearray_id_ is not null
        union select job_exception_stack_id_ from act_hi_job_log where process_instance_id_ = any($1) and job_exception_stack_id_ is not null
      )`;
    }

    const columns = await this.tableColumns(client, table);
    if (columns.has('proc_inst_id_')) {
      return 'proc_inst_id_ = any($1)';
    }
    if (columns.has('process_instance_id_')) {
      return 'process_instance_id_ = any($1)';
    }
    if (columns.has('root_proc_inst_id_')) {
      return 'root_proc_inst_id_ = any($1)';
    }
    return null;
  }

  private async tableExists(client: Pool | PoolClient, tableName: string) {
    const { rows } = await client.query<{ exists: boolean }>(
      `select exists (
         select 1
         from information_schema.tables
         where table_schema = 'public' and table_name = $1
       ) as exists`,
      [tableName],
    );
    return rows[0]?.exists ?? false;
  }

  private insertableColumns(row: Record<string, unknown>, targetColumns: Set<string>) {
    return Object.keys(row).filter((column) => targetColumns.has(column) && !ARCHIVE_METADATA_COLUMNS.has(column));
  }

  private async deleteHistory(client: PoolClient, processIds: string[], archive: boolean) {
    const tables = archive ? HISTORY_TABLES.map(([, target]) => target) : HISTORY_TABLES.map(([source]) => source);
    const procInstTable = 'act_hi_procinst';
    const byteArrayTable = 'act_ge_bytearray';
    const deleteOrder = [
      byteArrayTable,
      ...tables.filter((table) => table !== byteArrayTable && table !== procInstTable),
      procInstTable,
    ];

    for (const table of deleteOrder) {
      const whereClause = await this.processFilter(client, table, archive);
      if (!whereClause) {
        continue;
      }
      await client.query(`delete from ${table} where ${whereClause}`, [processIds]);
    }
  }

  private async tableColumns(client: Pool | PoolClient, tableName: string) {
    const existingClientCache = this.columnCache.get(client);
    if (existingClientCache) {
      const cached = existingClientCache.get(tableName);
      if (cached) {
        return cached;
      }
    }

    const { rows } = await client.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public' and table_name = $1`,
      [tableName],
    );
    const columns = new Set(rows.map((row) => row.column_name));
    if (!this.columnCache.has(client)) {
      this.columnCache.set(client, new Map<string, Set<string>>());
    }
    this.columnCache.get(client)?.set(tableName, columns);
    return columns;
  }

  private async columnDefinitions(client: Pool | PoolClient, tableName: string) {
    const { rows } = await client.query<{ column_name: string; definition: string }>(
      `select c.column_name,
              pg_catalog.format_type(a.atttypid, a.atttypmod) as definition
       from information_schema.columns c
       left join pg_catalog.pg_attribute a
         on a.attrelid = to_regclass($1)::oid
        and a.attname = c.column_name
        and a.attnum > 0
       where c.table_schema = 'public' and c.table_name = $1
       order by c.ordinal_position`,
      [tableName],
    );
    return rows.map((row) => ({ name: row.column_name, definition: row.definition }));
  }

  private quoteIdentifier(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private ruleTimeFilter(
    rule: 'CURRENT' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'LAST_1_YEAR' | 'ALL',
    column: string,
  ) {
    if (rule === 'LAST_7_DAYS') {
      return `and ${column} >= now() - interval '7 days'`;
    }
    if (rule === 'LAST_30_DAYS') {
      return `and ${column} >= now() - interval '30 days'`;
    }
    if (rule === 'LAST_90_DAYS') {
      return `and ${column} >= now() - interval '90 days'`;
    }
    if (rule === 'LAST_1_YEAR') {
      return `and ${column} >= now() - interval '1 year'`;
    }
    return '';
  }
}
