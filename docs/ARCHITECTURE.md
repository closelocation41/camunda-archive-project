# Architecture

```mermaid
flowchart LR
  camundaDb[(Camunda PostgreSQL DB)]
  camundaRest[Camunda 7 REST API]
  api[NestJS Archive API]
  archiveDb[(External PostgreSQL Archive DB)]
  web[Angular Monitoring UI]
  adminer[Adminer DB UI]
  grafana[Grafana]

  camundaDb --> api
  camundaRest <--> api
  api <--> archiveDb
  web --> api
  adminer --> camundaDb
  adminer --> archiveDb
  grafana --> api
```

## Modules

- `camunda-api-module`: typed Camunda REST adapter for process, history, incident, variables, XML, start, and modification APIs.
- `archive-module`: archive repositories and services for completed, failed, and old suspended workflow history. It moves history rows from Camunda history tables to duplicate archive tables.
- `restore-module`: re-sync service that moves archived history rows back into the original Camunda history tables and removes them from archive tables.
- `scheduler-module`: node-cron schedules for archive, cleanup, consistency validation, and statistics.
- `workflow-module`: live and historic monitoring APIs.
- `incident-module`: Camunda incident monitoring APIs.
- `analytics-module`: dashboard counts, failure analytics, workflow trends, cleanup run summaries.
- `bpmn-viewer-module`: BPMN XML plus executed and failed activity timeline.

## Local UI Surfaces

| Surface | URL | Purpose |
| --- | --- | --- |
| Angular web UI | `http://localhost:4200` | Operator workflow monitoring, archive, re-sync, restore, incidents, and operations pages |
| API Swagger | `http://localhost:3000/api/docs` | OpenAPI documentation and manual endpoint testing |
| Camunda web apps | `http://localhost:8080` | Camunda Cockpit, Tasklist, and Admin for the embedded Camunda 7 engine |
| Adminer | `http://localhost:8081` | Local PostgreSQL inspection for Camunda DB and archive DB |
| Prometheus | `http://localhost:9090` | Metrics scrape and query UI |
| Grafana | `http://localhost:3001` | Dashboard shell with provisioning |

## Database Topology

The API owns two PostgreSQL pools:

| Injection token | Environment variable | Container connection | Host connection |
| --- | --- | --- | --- |
| `CAMUNDA_DB` | `CAMUNDA_DATABASE_URL` | `postgresql://camunda:camunda@camunda-db:5432/camunda` | `postgresql://camunda:camunda@localhost:5432/camunda` |
| `ARCHIVE_DB` | `ARCHIVE_DATABASE_URL` | `postgresql://archive:archive@archive-db:5432/camunda_archive` | `postgresql://archive:archive@localhost:5433/camunda_archive` |

The archive schema mirrors selected Camunda history tables with `arc_` prefixes. Example mappings:

| Camunda history table | Archive table |
| --- | --- |
| `act_hi_procinst` | `arc_act_hi_procinst` |
| `act_hi_actinst` | `arc_act_hi_actinst` |
| `act_hi_taskinst` | `arc_act_hi_taskinst` |
| `act_hi_varinst` | `arc_act_hi_varinst` |
| `act_hi_detail` | `arc_act_hi_detail` |
| `act_hi_incident` | `arc_act_hi_incident` |
| `act_hi_job_log` | `arc_act_hi_job_log` |
| `act_ge_bytearray` | `arc_act_ge_bytearray` |
| `act_hi_op_log` | `arc_act_hi_op_log` |
| `act_hi_attachment` | `arc_act_hi_attachment` |
| `act_hi_comment` | `arc_act_hi_comment` |

## Runtime Rules

- Do not archive active runtime workflows.
- Do not write to `ACT_RU_*` runtime tables.
- Preserve `SUPER_PROCESS_INSTANCE_ID_` and `ROOT_PROC_INST_ID_` in the archive.
- Archive and re-sync parent and child history together when `includeChildren` is enabled.
- Keep archived history in duplicate Camunda-like `ARC_ACT_*` tables to simplify upgrade and restore behavior.
- Copy only columns that exist in the target table. This protects archive and re-sync from minor Camunda schema drift such as new history columns.

## Data Movement Rules

Archive:

1. Find eligible process instance ids by state and retention window.
2. Expand selected ids with child process instances from `SUPER_PROCESS_INSTANCE_ID_`.
3. Copy related rows from Camunda history tables into archive tables.
4. Delete copied rows from Camunda history tables.
5. Record the archive run in `arc_archive_run`.

Re-sync:

1. Load archived process ids and optional children.
2. Copy related rows from archive tables into original Camunda history tables.
3. Delete copied rows from archive tables.
4. Record the operation in `arc_restore_log`.
