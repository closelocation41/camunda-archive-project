import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ARCHIVE_DB } from '../database/database.module';

@Injectable()
export class RestoreRepository {
  constructor(@Inject(ARCHIVE_DB) private readonly db: Pool) {}

  async createLog(originalProcessInstanceId: string, reason: string, requestedBy: string) {
    const { rows } = await this.db.query<{ id: string }>(
      `insert into arc_restore_log (original_proc_inst_id, status, reason, requested_by)
       values ($1, 'RUNNING', $2, $3)
       returning id`,
      [originalProcessInstanceId, reason, requestedBy],
    );
    return rows[0].id;
  }

  async completeLog(id: string, restoredProcessInstanceId: string, metadata: Record<string, unknown>) {
    await this.db.query(
      `update arc_restore_log
       set status = 'COMPLETED', restored_proc_inst_id = $2, completed_at = now(), metadata = $3
       where id = $1`,
      [id, restoredProcessInstanceId, metadata],
    );
  }

  async failLog(id: string, message: string) {
    await this.db.query(
      `update arc_restore_log set status = 'FAILED', completed_at = now(), error_message = $2 where id = $1`,
      [id, message],
    );
  }

  async mapProcess(originalProcessInstanceId: string, restoredProcessInstanceId: string, restoreLogId: string) {
    await this.db.query(
      `insert into arc_proc_inst_mapping (original_proc_inst_id, restored_proc_inst_id, restore_log_id)
       values ($1, $2, $3)
       on conflict (original_proc_inst_id) do update
       set restored_proc_inst_id = excluded.restored_proc_inst_id,
           restore_log_id = excluded.restore_log_id,
           restored_at = now()`,
      [originalProcessInstanceId, restoredProcessInstanceId, restoreLogId],
    );
  }

  async findChildren(processInstanceId: string) {
    const { rows } = await this.db.query<{ proc_inst_id_: string }>(
      `select proc_inst_id_
       from arc_act_hi_procinst
       where super_process_instance_id_ = $1
       order by start_time_`,
      [processInstanceId],
    );
    return rows.map((row) => row.proc_inst_id_);
  }
}
