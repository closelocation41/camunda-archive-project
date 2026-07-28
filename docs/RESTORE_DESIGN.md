# Re-sync Design

For the full architecture and lifecycle analysis, see [Camunda Data Archiving Project White Paper](WHITE_PAPER.md).

The system re-syncs archived workflow history by moving historic rows back into the Camunda history database. It intentionally avoids direct manipulation of Camunda runtime tables.

This is a history restore, not a runtime reconstruction. It does not call Camunda REST process start APIs and does not create a new process instance.


## Flow

1. Create an `arc_restore_log` row with status `RUNNING`.
2. Confirm the requested `PROC_INST_ID_` exists in `arc_act_hi_procinst`.
3. If `includeChildren` is enabled, discover child process ids from `arc_act_hi_procinst.super_process_instance_id_`.
4. For each supported history table, copy rows from the `arc_*` table back into the original Camunda history table.
5. Copy only columns that exist in the destination table and skip archive metadata columns such as `archived_at`, `archive_run_id`, and `soft_deleted_at`.
6. Delete copied rows from the archive tables.
7. Mark `arc_restore_log` as `COMPLETED` with restored ids and row counts.

The restored process keeps the original process instance id. After re-sync, it appears again in the Completed or Failed workflow list because the history rows are back in Camunda's history tables.

## Supported Table Pairs

| Archive source | Camunda destination |
| --- | --- |
| `arc_act_hi_procinst` | `act_hi_procinst` |
| `arc_act_hi_actinst` | `act_hi_actinst` |
| `arc_act_hi_taskinst` | `act_hi_taskinst` |
| `arc_act_hi_varinst` | `act_hi_varinst` |
| `arc_act_hi_detail` | `act_hi_detail` |
| `arc_act_hi_incident` | `act_hi_incident` |
| `arc_act_hi_job_log` | `act_hi_job_log` |
| `arc_act_ge_bytearray` | `act_ge_bytearray` |
| `arc_act_hi_op_log` | `act_hi_op_log` |
| `arc_act_hi_attachment` | `act_hi_attachment` |
| `arc_act_hi_comment` | `act_hi_comment` |

## Parent-Child Handling

Archived data preserves:

- `SUPER_PROCESS_INSTANCE_ID_`
- `ROOT_PROC_INST_ID_`
- call activity links from history activity rows

During re-sync, children are discovered from `arc_act_hi_procinst.super_process_instance_id_`. Parent and child history rows are moved together when `includeChildren` is true.

## UI Entry Points

- Archived Workflows: use the row-level `Re-sync` action to move an archived instance back to Camunda history.
- Restore Workflow: submit a process instance id, reason, and include-children flag.
- Completed/Failed Workflows: after re-sync, the restored history appears in the relevant workflow list and can be archived again.

Running Workflows does not expose archive or re-sync actions.

## Safety Rules

- Never write to Camunda `ACT_RU_*` runtime tables.
- Do not re-sync into runtime state. This restores history visibility only.
- Use database transactions on both archive and Camunda databases during the move.
- Use `on conflict do nothing` while copying back to avoid duplicate-key failures during repeated operator actions.
- Delete archive rows only after the copy into Camunda history succeeds.

## Limitations To Finalize Per Estate

- Re-sync restores history rows, not active runtime executions.
- If your Camunda estate has custom history tables, add matching archive tables and table-pair mappings.
- If Camunda version upgrades introduce new history columns, keep archive schema migrations current. The code already ignores unknown source columns that do not exist in the destination table.
- Validate table foreign-key constraints before enabling this against a hardened production Camunda schema.
