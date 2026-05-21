# API Overview

All endpoints are prefixed with `/api`.

Interactive Swagger documentation is available at:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

The generated OpenAPI document includes bearer authentication, operation summaries, request DTO examples, response examples, pagination parameters, selected archive endpoints, and single/batch re-sync endpoints.

## Authentication

- `POST /auth/login`

Demo users for local development:

- `admin/admin`
- `operator/operator`
- `auditor/auditor`
- `viewer/viewer`

Replace the demo user provider with an enterprise identity source before production use.

Use the returned JWT bearer token for protected API calls. The web UI stores the token in local storage during local development.

## Monitoring

- `GET /workflows/running`
- `GET /workflows/completed`
- `GET /workflows/failed`
- `GET /workflows/{processInstanceId}`
- `GET /incidents`

Use cases:

- Running workflows: monitor active instances. The UI does not show archive or re-sync actions for this state.
- Completed workflows: inspect finished instances and archive selected unarchived instances.
- Failed workflows: inspect failed/deleted history and archive selected unarchived instances.
- Detail view: inspect process, activity, and variable history.
- The web UI displays running, completed, and failed workflow lists at 10 records per page.

## Archive

- `GET /archive/workflows`
- `GET /archive/workflows/{processInstanceId}`
- `POST /archive/run/completed`
- `POST /archive/run/failed`
- `POST /archive/run/suspended`
- `POST /archive/run/selected`

These endpoints are documented in Swagger with examples for paged archive search, selected archive payloads, and archive run summaries.

`GET /archive/workflows` supports pagination and filtering:

```text
GET /api/archive/workflows?page=1&limit=10&search=invoice&state=COMPLETED
```

The Archived Workflows UI uses `limit=10` and exposes Previous and Next controls.

`POST /archive/run/selected` request:

```json
{
  "mode": "COMPLETED",
  "processInstanceIds": ["623a3e07-54d4-11f1-940b-0242ac120006"]
}
```

Archive use cases:

- Scheduled archive of completed workflows older than `ARCHIVE_COMPLETED_OLDER_THAN_DAYS`.
- Scheduled archive of failed workflows older than `ARCHIVE_FAILED_OLDER_THAN_DAYS`.
- Scheduled archive of old suspended workflows older than `ARCHIVE_SUSPENDED_OLDER_THAN_DAYS`.
- Operator-selected archive from the Completed or Failed workflow lists.

Archive behavior:

1. Create an `arc_archive_run` row.
2. Resolve selected process instance ids and child process instance ids.
3. Copy related Camunda history rows into the matching `arc_*` tables.
4. Delete copied rows from the original Camunda history tables.
5. Finish the archive run with selected, archived, skipped, and failed counters.

## Restore

- `POST /restore/workflow`
- `POST /restore/workflows`

These endpoints are documented in Swagger as history re-sync APIs. They move archive rows back to Camunda history tables and remove the restored rows from archive tables; they do not start runtime process instances.

`POST /restore/workflow` request:

```json
{
  "processInstanceId": "623a3e07-54d4-11f1-940b-0242ac120006",
  "reason": "Operator requested re-sync from archive",
  "includeChildren": true
}
```

`POST /restore/workflows` request:

```json
{
  "processInstanceIds": [
    "623a3e07-54d4-11f1-940b-0242ac120006",
    "d21106e4-5489-11f1-940b-0242ac120006"
  ],
  "reason": "Bulk re-sync for investigation",
  "includeChildren": true
}
```

Restore/re-sync behavior:

1. Create an `arc_restore_log` row.
2. Load archived process ids and optional child process ids.
3. Copy related rows from `arc_*` archive tables into the original Camunda history tables.
4. Delete copied rows from archive tables.
5. Complete the restore log with restored process ids and restored history row count.

Re-sync preserves the original historic `PROC_INST_ID_`. It does not start a new process instance and does not write to `ACT_RU_*` runtime tables.

## Analytics

- `GET /analytics/dashboard`
- `GET /bpmn-viewer/{processInstanceId}/execution`
- `POST /scheduler/run-all`
- `GET /health`
- `GET /metrics`

## API Roles

| Use case | Minimum role |
| --- | --- |
| View dashboard, workflows, incidents, archive search, BPMN timeline | `Viewer` |
| Archive selected/runs and re-sync archived workflows | `Operator` |
| Audit-oriented read access | `Auditor` |
| Full local demo access | `Admin` |
