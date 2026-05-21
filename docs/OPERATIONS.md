# Operations

## Scheduled Jobs

The API uses `node-cron` jobs:

- every 15 minutes: archive completed workflows
- every 30 minutes: archive failed workflows
- every 6 hours: archive old suspended workflows
- every 6 hours: verify archive consistency
- daily at 02:30: Camunda history cleanup placeholder

The cleanup job should remain a placeholder unless your estate needs extra retention enforcement. Archive already removes moved history rows from Camunda history tables after the archive copy succeeds.

## Local Service Access

| Service | URL or port | Notes |
| --- | --- | --- |
| Web UI | `http://localhost:4200` | Login with `admin/admin`, `operator/operator`, `auditor/auditor`, or `viewer/viewer` |
| API | `http://localhost:3000/api` | REST base path |
| Swagger | `http://localhost:3000/api/docs` | OpenAPI testing surface with request and response examples |
| Swagger JSON | `http://localhost:3000/api/docs-json` | Raw generated OpenAPI document |
| Camunda | `http://localhost:8080` | Login with `demo/demo` |
| Adminer | `http://localhost:8081` | PostgreSQL database UI |
| Prometheus | `http://localhost:9090` | Metrics query UI |
| Grafana | `http://localhost:3001` | Dashboard shell |

## PostgreSQL Connections

Inside Docker, use service hostnames:

| Database | URL |
| --- | --- |
| Camunda | `postgresql://camunda:camunda@camunda-db:5432/camunda` |
| Archive | `postgresql://archive:archive@archive-db:5432/camunda_archive` |

From the Windows host, use mapped ports:

| Database | URL |
| --- | --- |
| Camunda | `postgresql://camunda:camunda@localhost:5432/camunda` |
| Archive | `postgresql://archive:archive@localhost:5433/camunda_archive` |

Adminer settings:

- System: `PostgreSQL`
- Server: `camunda-db` for Camunda or `archive-db` for archive
- Username/password/database: `camunda/camunda/camunda` or `archive/archive/camunda_archive`

Useful checks:

```bash
docker compose ps
docker compose logs api --tail 100
docker compose exec -T camunda-db psql -U camunda -d camunda -c "select count(*) from act_hi_procinst"
docker compose exec -T archive-db psql -U archive -d camunda_archive -c "select count(*) from arc_act_hi_procinst"
```

## Web UI Operations

- Dashboard: read counts and trends across running, completed, failed, and archived workflows.
- Running Workflows: monitor active instances only. Archive and re-sync buttons are intentionally hidden.
- Completed Workflows: select unarchived completed instances and archive them.
- Failed Workflows: select unarchived failed/deleted instances and archive them.
- Archived Workflows: search archived rows and use `Re-sync` to move history back to Camunda.
- Running, Completed, Failed, and Archived workflow lists show 10 records per page with Previous and Next controls.
- Restore Workflow: re-sync a known archived process id with a reason and optional child inclusion.
- Incident Monitoring: inspect Camunda incidents.
- Cleanup Monitoring: review scheduler/archive run activity.

## Camunda UI Operations

- Use Camunda Cockpit/Tasklist/Admin at `http://localhost:8080` with `demo/demo`.
- After archive, moved completed/failed history no longer appears in Camunda history queries because rows were removed from Camunda history tables.
- After re-sync, restored history appears again with the original process instance id.
- Active runtime instances are not archived and runtime tables are not modified.

## Archive And Re-sync Runbook

Archive selected completed/failed workflows:

1. Open the Web UI.
2. Go to Completed Workflows or Failed Workflows.
3. Select unarchived rows.
4. Click `Archive selected`.
5. Confirm rows appear in Archived Workflows and disappear from the original history list.

Re-sync archived workflows:

1. Open Archived Workflows.
2. Search for the process instance id, business key, or definition.
3. Click `Re-sync`.
4. Confirm the row disappears from Archived Workflows and appears again in Completed or Failed Workflows.

API equivalent:

```bash
POST /api/archive/run/selected
POST /api/restore/workflow
POST /api/restore/workflows
```

Use Swagger at `http://localhost:3000/api/docs` for manual testing. Authorize with the JWT returned by `POST /api/auth/login`, then use the documented archive and re-sync examples.

## Performance Guidance

- Use `ARCHIVE_BATCH_SIZE` to control per-run throughput.
- Keep archive tables partitioned by process start time for long retention windows.
- Use the provided process, definition, business key, root, parent, incident, and time indexes for search and restore.
- Use read replicas or reporting replicas for heavy dashboard/BI workloads.
- Use PostgreSQL native partition maintenance for monthly or quarterly partitions.
- Monitor delete and insert volume on Camunda history tables during large archive or re-sync runs.
- Run high-volume re-sync during maintenance windows if other tools are querying Camunda history heavily.

## Security Guidance

- Replace local demo users with SSO/OIDC or an enterprise user store.
- Rotate `JWT_SECRET` and keep it in a secret manager.
- Restrict restore endpoints to `Operator` and `Admin` roles.
- Enable audit retention for `arc_audit_log` and `arc_restore_log`.
- Put the API behind TLS and a WAF or API gateway in production.
- Restrict direct PostgreSQL access to trusted operators only. Archive and re-sync are database moves and should be audited.

## Production Checklist

- Apply schema migrations with a migration tool such as Flyway, Liquibase, or Sqitch.
- Add monthly partitions for `arc_act_hi_procinst` before high-volume ingestion.
- Tune PostgreSQL autovacuum and `work_mem` for reporting queries.
- Configure Grafana dashboards against `/api/metrics`.
- Back up the archive database independently from Camunda runtime DB.
- Back up the Camunda DB before enabling delete-after-archive in production.
- Test archive and re-sync on a Camunda staging database with representative completed, failed, variable, bytearray, job log, attachment, and comment history.
- Add estate-specific archive table pairs for any custom history tables.
