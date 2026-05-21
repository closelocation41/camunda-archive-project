# Operations

## Scheduled Jobs

The API uses `node-cron` jobs:

- every 15 minutes: archive completed workflows
- every 30 minutes: archive failed workflows
- every 6 hours: archive old suspended workflows
- every 6 hours: verify archive consistency
- daily at 02:30: Camunda history cleanup placeholder

The cleanup job should be wired to your enterprise retention approval flow and Camunda history cleanup APIs only after archive consistency checks pass.

## Performance Guidance

- Use `ARCHIVE_BATCH_SIZE` to control per-run throughput.
- Keep archive tables partitioned by process start time for long retention windows.
- Use the provided process, definition, business key, root, parent, incident, and time indexes for search and restore.
- Use read replicas or reporting replicas for heavy dashboard/BI workloads.
- Use PostgreSQL native partition maintenance for monthly or quarterly partitions.

## Security Guidance

- Replace local demo users with SSO/OIDC or an enterprise user store.
- Rotate `JWT_SECRET` and keep it in a secret manager.
- Restrict restore endpoints to `Operator` and `Admin` roles.
- Enable audit retention for `arc_audit_log` and `arc_restore_log`.
- Put the API behind TLS and a WAF or API gateway in production.

## Production Checklist

- Apply schema migrations with a migration tool such as Flyway, Liquibase, or Sqitch.
- Add monthly partitions for `arc_act_hi_procinst` before high-volume ingestion.
- Tune PostgreSQL autovacuum and `work_mem` for reporting queries.
- Configure Grafana dashboards against `/api/metrics`.
- Back up the archive database independently from Camunda runtime DB.
