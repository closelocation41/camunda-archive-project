import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ARCHIVE_DB, CAMUNDA_DB } from '../database/database.module';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ARCHIVE_DB) private readonly archiveDb: Pool,
    @Inject(CAMUNDA_DB) private readonly camundaDb: Pool,
  ) {}

  async dashboard() {
    const [active, completed, failed, archived, topFailures, trends, archiveRuns] = await Promise.all([
      this.scalar(this.camundaDb, 'select count(*)::int from act_hi_procinst where end_time_ is null'),
      this.scalar(this.camundaDb, 'select count(*)::int from act_hi_procinst where end_time_ is not null and delete_reason_ is null'),
      this.scalar(this.camundaDb, 'select count(*)::int from act_hi_procinst where end_time_ is not null and delete_reason_ is not null'),
      this.scalar(this.archiveDb, 'select count(*)::int from arc_act_hi_procinst where soft_deleted_at is null'),
      this.archiveDb.query(
        `select proc_def_key_, count(*)::int as failures
         from arc_act_hi_procinst
         where delete_reason_ is not null
         group by proc_def_key_
         order by failures desc
         limit 10`,
      ),
      this.archiveDb.query(
        `select date_trunc('day', start_time_) as bucket, count(*)::int as total, avg(duration_)::bigint as avg_duration_ms
         from arc_act_hi_procinst
         group by bucket
         order by bucket desc
         limit 30`,
      ),
      this.archiveDb.query(
        `select run_type, status, started_at, finished_at, selected_count, archived_count, failed_count
         from arc_archive_run
         order by started_at desc
         limit 20`,
      ),
    ]);

    return {
      counts: { active, completed, failed, archived },
      topFailedWorkflows: topFailures.rows,
      workflowTrends: trends.rows.reverse(),
      cleanupStatistics: archiveRuns.rows,
    };
  }

  private async scalar(pool: Pool, sql: string) {
    const { rows } = await pool.query<{ count: number }>(sql);
    return rows[0].count;
  }
}
