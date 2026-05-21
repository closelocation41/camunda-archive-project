# Restore Design

The system restores archived workflows by reconstruction. It intentionally avoids direct manipulation of Camunda runtime tables.

## Flow

1. Read archive bundle from `ARC_ACT_*` tables.
2. Convert archived variables into Camunda REST variable payloads.
3. Start a new process instance with the original process definition key and business key.
4. Identify the last completed activity from `ARC_ACT_HI_ACTINST`.
5. Use Camunda modification API to move the token to the target activity.
6. Restore parent first, then child process instances.
7. Store `arc_restore_log` and `arc_proc_inst_mapping`.

## Parent-Child Handling

Archived data preserves:

- `SUPER_PROCESS_INSTANCE_ID_`
- `ROOT_PROC_INST_ID_`
- call activity links from history activity rows

During restore, children are discovered from `ARC_ACT_HI_PROCINST.SUPER_PROCESS_INSTANCE_ID_`. The current starter restores child process instances after the parent and records all mappings. In a production deployment, use the mapping table to attach operator-visible lineage and correlation IDs to the newly restored instances.

## Limitations To Finalize Per Estate

- Serialized Java/object variables require type-specific serializers and safe deserialization policy.
- User task assignment restoration depends on whether tasks are recreated at the target activity.
- Comments and attachments may need custom migration if they are linked to new task IDs.
- Process definition version selection should be pinned according to your estate policy.
