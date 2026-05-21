# Camunda External History Archive & Workflow Management System

Enterprise-grade starter for centralizing Camunda 7 workflow monitoring, moving completed and failed history into an external PostgreSQL archive, and re-syncing archived history back into the Camunda history database when needed.

## Stack

- Camunda 7 REST API
- NestJS backend
- Angular 19 frontend, pinned for Node.js 20.13 compatibility in this workspace
- PostgreSQL archive database
- Docker Compose
- JWT authentication and RBAC
- Swagger/OpenAPI
- Prometheus metrics and Grafana provisioning
- Adminer database UI for local PostgreSQL inspection

The design intentionally avoids Kafka, Redis, RabbitMQ, and ElasticSearch.

## Layout

```text
apps/api     NestJS archive, restore, workflow, analytics, auth, scheduler APIs
apps/web     Angular enterprise monitoring dashboard
infra/db     PostgreSQL schema and duplicate Camunda history archive tables
infra/grafana Grafana datasource/dashboard provisioning
docs         Architecture, restore, operations, and API notes
```

## Run

```bash
cp .env.example .env
npm install
npm run docker:up
```

API: http://localhost:3000/api  
Swagger: http://localhost:3000/api/docs  
Swagger JSON: http://localhost:3000/api/docs-json  
Web: http://localhost:4200  
Camunda Cockpit/Tasklist/Admin: http://localhost:8080  
Database UI: http://localhost:8081  
Prometheus: http://localhost:9090  
Grafana: http://localhost:3001

Local demo credentials:

| Surface | Username | Password |
| --- | --- | --- |
| Web admin | `admin` | `admin` |
| Web operator | `operator` | `operator` |
| Web auditor | `auditor` | `auditor` |
| Web viewer | `viewer` | `viewer` |
| Camunda | `demo` | `demo` |

## PostgreSQL Connectivity

The Docker network uses service names, while tools on the Windows host use localhost ports.

| Database | Container URL | Host URL | User | Password |
| --- | --- | --- | --- | --- |
| Camunda DB | `postgresql://camunda:camunda@camunda-db:5432/camunda` | `postgresql://camunda:camunda@localhost:5432/camunda` | `camunda` | `camunda` |
| Archive DB | `postgresql://archive:archive@archive-db:5432/camunda_archive` | `postgresql://archive:archive@localhost:5433/camunda_archive` | `archive` | `archive` |

Adminer connection examples:

- System: `PostgreSQL`
- Server: `camunda-db` or `archive-db`
- Username/password/database: use the table above

## Archive Strategy

The archive service moves eligible Camunda history rows into duplicate archive tables:

- completed workflow instances
- failed workflow instances
- old suspended workflow instances

Archive means:

1. Select eligible process instance ids from Camunda history.
2. Expand the selection to include child process instances.
3. Copy related history rows from Camunda tables such as `ACT_HI_PROCINST`, `ACT_HI_ACTINST`, `ACT_HI_TASKINST`, `ACT_HI_VARINST`, `ACT_HI_DETAIL`, `ACT_HI_INCIDENT`, `ACT_HI_JOB_LOG`, `ACT_GE_BYTEARRAY`, `ACT_HI_OP_LOG`, `ACT_HI_ATTACHMENT`, and `ACT_HI_COMMENT`.
4. Insert the rows into matching archive tables such as `ARC_ACT_HI_PROCINST`.
5. Delete those archived rows from the original Camunda history tables.

Re-sync means the reverse move: copy archived rows back into the original Camunda history tables and remove the rows from the archive tables.

Active runtime instances are never archived, and the system does not write to `ACT_RU_*` runtime tables.

## Web UI Use Cases

- Dashboard: summary counts, trends, failures, and cleanup run status.
- Running Workflows: live/running workflow monitoring only. Archive and re-sync actions are hidden here.
- Completed Workflows: select unarchived completed instances and archive them.
- Failed Workflows: select unarchived failed instances and archive them.
- Archived Workflows: search archived history and re-sync selected archived instances back to Camunda history.
- Workflow list pages show 10 records per page with Previous and Next controls.
- Incident Monitoring: inspect active Camunda incidents.
- Restore Workflow: operator-driven restore/re-sync form for archived workflow ids.
- Cleanup Monitoring: scheduler and archive run visibility.

## API Use Cases

- Authentication: login and role-based access for viewer, auditor, operator, and admin users.
- Monitoring: read running, completed, failed, and detailed workflow history.
- Archive: run scheduled archive modes or archive selected completed/failed process instance ids.
- Re-sync: move archived workflow history back into the Camunda history database.
- Analytics: dashboard, BPMN execution timeline, metrics, health, and scheduler trigger endpoints.

Swagger/OpenAPI at `/api/docs` includes operation summaries, request examples, response examples, bearer authentication, archive pagination parameters, selected archive APIs, and single/batch re-sync APIs.
