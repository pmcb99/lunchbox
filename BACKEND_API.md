# Backend API Plan

This document outlines the REST API architecture for the Lunchbox backend. It supports both the CLI workflows (sync, restore, revisions, schedules) and the platform UI.

## Principles

- RESTful resource modeling with stable identifiers.
- Versioned API prefix: `/api/v1`.
- Consistent envelope for errors and metadata.
- Pagination for collection endpoints.
- Idempotency keys for create operations that may be retried by the CLI.

## Core Resources

- **Workspaces**: tenant boundary, contains databases, API keys, schedules.
- **Databases**: logical database entities (SQLite file or Postgres connection).
- **Revisions**: immutable snapshots of a database.
- **Restores**: restore jobs and download targets.
- **Schedules**: cron-based automation for sync.
- **API Keys**: access tokens for CLI and CI/CD.
- **Audit Events**: append-only activity log.

## Conventions

### Headers

- `Authorization: Bearer <api_key>`
- `Idempotency-Key: <uuid>` for POST requests that can be retried
- `X-Request-Id` returned in responses

### Pagination

- Query params: `page`, `pageSize`, `cursor`
- Response meta:
  - `meta.pagination`: `{ page, pageSize, total, nextCursor }`

### Error Envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "Schedule cadence is invalid",
    "details": {"field": "cadence"}
  },
  "meta": {"requestId": "req_123"}
}
```

### Success Envelope

```json
{
  "data": { "id": "db_123" },
  "meta": {"requestId": "req_123"}
}
```

## Authentication

### API Keys

- Scoped to a workspace.
- Can be read-only or read/write.
- Optionally bound to a specific database.

## Endpoints

### Health

- `GET /api/v1/health`
  - Returns service status and version.

### Workspaces

- `GET /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspaceId}`
- `PATCH /api/v1/workspaces/{workspaceId}`

### Databases

- `GET /api/v1/workspaces/{workspaceId}/databases`
  - Filters: `engine`, `environment`, `status`
- `POST /api/v1/workspaces/{workspaceId}/databases`
  - Create database definition (name, engine, connection or file metadata)
- `GET /api/v1/databases/{databaseId}`
- `PATCH /api/v1/databases/{databaseId}`
- `DELETE /api/v1/databases/{databaseId}` (soft delete)

### Revisions (CLI Sync)

- `POST /api/v1/databases/{databaseId}/revisions`
  - Create new revision.
  - Upload modes:
    - Multipart upload (direct): `multipart/form-data` with `db` and optional `wal`.
    - Pre-signed upload: `?mode=presigned` returns upload URLs.
- `GET /api/v1/databases/{databaseId}/revisions`
- `GET /api/v1/databases/{databaseId}/revisions/{revisionId}`
- `DELETE /api/v1/databases/{databaseId}/revisions/{revisionId}` (soft delete)

### Restore (CLI Restore)

- `POST /api/v1/databases/{databaseId}/restores`
  - Body supports:
    - `revisionId` or `timestamp`
    - `target`: `download` or `postgres`
- `GET /api/v1/restores/{restoreId}`
- `GET /api/v1/restores/{restoreId}/download`
  - Streams archive to CLI for file restore.

### Schedules (CLI schedule)

- `GET /api/v1/workspaces/{workspaceId}/schedules`
- `POST /api/v1/workspaces/{workspaceId}/schedules`
  - Body: `databaseId`, `cadence` (cron), `enabled`, `options`
- `GET /api/v1/schedules/{scheduleId}`
- `PATCH /api/v1/schedules/{scheduleId}`
- `DELETE /api/v1/schedules/{scheduleId}`

### API Keys

- `GET /api/v1/workspaces/{workspaceId}/keys`
- `POST /api/v1/workspaces/{workspaceId}/keys`
  - Body: `name`, `scope`, `expiresAt`
- `DELETE /api/v1/keys/{keyId}`

### Audit Events

- `GET /api/v1/workspaces/{workspaceId}/audit-events`
  - Filters: `actor`, `action`, `databaseId`, `since`

## CLI Flow Examples

### Sync (SQLite)

1. `GET /api/v1/workspaces/{workspaceId}/databases?name=mydatabase.db`
2. `POST /api/v1/workspaces/{workspaceId}/databases` (if missing)
3. `POST /api/v1/databases/{databaseId}/revisions` with multipart upload

### Restore

1. `POST /api/v1/databases/{databaseId}/restores` with `revisionId`
2. `GET /api/v1/restores/{restoreId}/download`

### Schedule

1. `POST /api/v1/workspaces/{workspaceId}/schedules` with cron

## Webhooks (Future)

- `POST /api/v1/workspaces/{workspaceId}/webhooks`
- `GET /api/v1/workspaces/{workspaceId}/webhooks`
- `DELETE /api/v1/webhooks/{webhookId}`

## WAL Streaming (Future Path)

Plan for Litestream-style WAL ingestion (SQLite) and continuous WAL archiving (Postgres) without breaking existing sync flows.

### SQLite WAL Streaming (Litestream-like)

- `POST /api/v1/databases/{databaseId}/wal-streams`
  - Starts a WAL streaming session, returns `streamId` and upload hints.
- Request
```json
{
  "mode": "sqlite-wal",
  "walFormat": "sqlite",
  "snapshot": {"revisionId": "rev_123"},
  "client": {"host": "app-01", "version": "cli-0.9.0"}
}
```
- Response
```json
{
  "data": {
    "streamId": "wal_123",
    "uploadMode": "presigned",
    "segmentSizeBytes": 16777216,
    "maxInFlight": 4,
    "expiresAt": "2026-02-18T12:30:00Z"
  },
  "meta": {"requestId": "req_123"}
}
```
- `PUT /api/v1/wal-streams/{streamId}/segments/{segmentId}`
  - Uploads WAL segments (resumable, ordered by LSN).
- Headers
  - `Content-Type: application/octet-stream`
  - `Content-Range: bytes 0-1048575/1048576`
  - `X-WAL-LSN: 0000001A/000000F0`
  - `X-WAL-Checksum: b3a2f1...`
- Response
```json
{
  "data": {"segmentId": "seg_001", "status": "stored"},
  "meta": {"requestId": "req_123"}
}
```
- `POST /api/v1/wal-streams/{streamId}/commit`
  - Finalizes a WAL sequence into a new revision or advances head.
- Request
```json
{
  "segments": ["seg_001", "seg_002"],
  "endLsn": "0000001A/000000F0",
  "createRevision": true
}
```
- Response
```json
{
  "data": {"revisionId": "rev_456", "headUpdated": true},
  "meta": {"requestId": "req_123"}
}
```
- `POST /api/v1/wal-streams/{streamId}/abort`

### Postgres WAL Archiving

- `POST /api/v1/databases/{databaseId}/wal-archives`
  - Registers WAL archiving for a database and returns archive parameters.
- Request
```json
{
  "mode": "postgres-wal",
  "slotName": "lunchbox_slot",
  "archiveMethod": "archive_command"
}
```
- Response
```json
{
  "data": {
    "archiveId": "pgwal_123",
    "uploadMode": "presigned",
    "segmentSizeBytes": 16777216,
    "archiveCommandTemplate": "curl -X PUT -H 'Content-Type: application/octet-stream' --data-binary @%p '{uploadUrl}'",
    "expiresAt": "2026-02-18T12:30:00Z"
  },
  "meta": {"requestId": "req_123"}
}
```
- `PUT /api/v1/wal-archives/{archiveId}/segments/{segmentId}`
  - Uploads WAL segments from `archive_command` integration.
- Headers
  - `Content-Type: application/octet-stream`
  - `X-WAL-LSN: 0000001A/000000F0`
  - `X-WAL-Checksum: c8d9e2...`
- Response
```json
{
  "data": {"segmentId": "00000001000000000000000A", "status": "stored"},
  "meta": {"requestId": "req_123"}
}
```
- `GET /api/v1/wal-archives/{archiveId}/status`
  - Returns latest LSN, retention window, and archive health.
- Response
```json
{
  "data": {
    "latestLsn": "0000001A/000000F0",
    "retentionHours": 72,
    "segmentCount": 128,
    "status": "healthy"
  },
  "meta": {"requestId": "req_123"}
}
```

### Restore with WAL Continuity

- `POST /api/v1/databases/{databaseId}/restores`
  - Accepts `timestamp` or `lsn` to drive point-in-time recovery.
- Request
```json
{
  "target": "postgres",
  "timestamp": "2026-02-18T10:30:00Z",
  "lsn": "0000001A/000000F0",
  "destination": "postgresql://localhost/restored_db"
}
```

## Notes

- Responses should include `meta.requestId` for traceability.
- Mutations return `409` on conflict, `422` on validation errors.
- Use UUID-like IDs with prefixes: `ws_`, `db_`, `rev_`, `sch_`, `key_`.
