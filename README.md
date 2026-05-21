# Camunda External History Archive & Workflow Management System

Enterprise-grade starter for centralizing Camunda 7 workflow monitoring, archiving completed and failed history into PostgreSQL, and restoring archived workflows through Camunda REST APIs without direct runtime table manipulation.

## Stack

- Camunda 7 REST API
- NestJS backend
- Angular 19 frontend, pinned for Node.js 20.13 compatibility in this workspace
- PostgreSQL archive database
- Docker Compose
- JWT authentication and RBAC
- Swagger/OpenAPI
- Prometheus metrics and Grafana provisioning

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
Web: http://localhost:4200

## Archive Strategy

The archive service copies eligible Camunda history rows into duplicate archive tables:

- completed workflow instances
- failed workflow instances
- old suspended workflow instances

Active runtime instances are never archived. Runtime reconstruction uses Camunda REST APIs, including process start and modification endpoints, and never writes to `ACT_RU_*` tables.
