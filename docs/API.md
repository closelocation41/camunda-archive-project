# API Overview

All endpoints are prefixed with `/api`.

## Authentication

- `POST /auth/login`

Demo users for local development:

- `admin/admin`
- `operator/operator`
- `auditor/auditor`
- `viewer/viewer`

Replace the demo user provider with an enterprise identity source before production use.

## Monitoring

- `GET /workflows/running`
- `GET /workflows/completed`
- `GET /workflows/failed`
- `GET /workflows/{processInstanceId}`
- `GET /incidents`

## Archive

- `GET /archive/workflows`
- `GET /archive/workflows/{processInstanceId}`
- `POST /archive/run/completed`
- `POST /archive/run/failed`
- `POST /archive/run/suspended`

## Restore

- `POST /restore/workflow`

Restore uses workflow reconstruction:

1. Load process, activities, variables, tasks, incidents, comments, and job logs from archive.
2. Start a new process instance by process definition key.
3. Reapply variables using Camunda variable payloads.
4. Move execution with Camunda process modification APIs.
5. Store restore logs and original-to-restored process ID mapping.

## Analytics

- `GET /analytics/dashboard`
- `GET /bpmn-viewer/{processInstanceId}/execution`
- `POST /scheduler/run-all`
- `GET /health`
- `GET /metrics`
