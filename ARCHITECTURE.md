# Architecture: Current State

This document describes what is currently implemented in this repository (not the aspirational plan in `BACKEND_API.md`).

## 1) Backend API Spec (Current Implementation)

## Runtime and base URL
- Backend framework: FastAPI
- Mounted API prefix: `/api/v1`
- Effective base URL in frontend dev: `http://localhost:8000/api/v1`

## Response envelope
All implemented Lunchbox endpoints return:

```json
{
  "data": {},
  "meta": { "requestId": "req_ab12cd34" }
}
```

## Auth model used today
- `X-API-Key` header is required on write/sensitive database operations.
- API keys are checked against `keys.status = 'Active'` for the target workspace.
- `auth/signup` and `auth/login` return a token-like string, but that token is not used for API authorization checks on these endpoints.

## Data model in current SQLite app DB
- `workspaces`
- `databases`
- `revisions`
- `schedules`
- `keys`
- `users`

## Endpoint catalog

### Health

#### `GET /health`
- Auth: none
- Request: none
- Response `data`:
```json
{ "status": "ok" }
```
- Behavior: liveness check only.

### Auth

#### `POST /auth/signup`
- Auth: none
- Request body:
```json
{ "email": "string", "password": "string" }
```
- Response `data`:
```json
{ "id": "user_xxx", "email": "string", "token": "jwt_xxx" }
```
- Behavior: inserts user row and returns generated token string.

#### `POST /auth/login`
- Auth: none
- Request body:
```json
{ "email": "string", "password": "string" }
```
- Response `data`:
```json
{ "id": "user_xxx", "email": "string", "token": "jwt_xxx" }
```
- Behavior: if email exists, returns it; otherwise auto-creates a user and returns token.

### Workspaces

#### `GET /workspaces`
- Auth: none
- Response `data`: `Array<{ id: string; name: string }>`
- Behavior: lists all workspaces.

#### `GET /workspaces/{workspace_id}`
- Auth: none
- Response `data`: `{ id: string; name: string }`
- Errors: `404` if workspace missing.

### Databases

#### `GET /workspaces/{workspace_id}/databases`
- Auth: none
- Response `data`: array of database records:
```json
{
  "id": "db_xxx",
  "name": "string",
  "engine": "PostgreSQL|SQLite|...",
  "environment": "string",
  "schedule": "cron string",
  "retention": "string",
  "status": "string",
  "size_label": "string",
  "revisions_label": "string",
  "restores_label": "string",
  "encryption": "string",
  "last_sync": "string",
  "backup_mode": "daemon|daemonless"
}
```

#### `POST /workspaces/{workspace_id}/databases`
- Auth: `X-API-Key` required
- Request body: full database display metadata payload (name/engine/environment/schedule/etc, incl. optional `backup_mode`)
- Response `data`: created database summary
- Errors: `401` invalid/missing key, `404` workspace missing.

#### `POST /workspaces/{workspace_id}/databases/import`
- Auth: `X-API-Key` required
- Request body:
```json
{ "name": "string", "target_size_mb": 2.0, "backup_mode": "daemon|daemonless" }
```
- Response `data`:
```json
{
  "id": "db_xxx",
  "workspace_id": "ws_xxx",
  "name": "string",
  "engine": "SQLite",
  "environment": "Production",
  "size_label": "string",
  "size_bytes": 12345,
  "checksum": "sha256...",
  "backup_mode": "daemon|daemonless"
}
```
- Behavior: creates DB record, materializes a SQLite file under `data/customer_dbs/`, seeds payload table to target size, records a revision.

#### `PATCH /databases/{database_id}`
- Auth: `X-API-Key` required
- Request body:
```json
{ "backup_mode": "daemon|daemonless" }
```
- Response `data`:
```json
{ "id": "db_xxx", "backup_mode": "daemon|daemonless" }
```
- Errors: `400` invalid mode, `404` DB missing, `401` invalid key.

#### `POST /databases/{database_id}/mutate`
- Auth: `X-API-Key` required
- Request body:
```json
{ "additional_size_mb": 1.0 }
```
- Response `data`:
```json
{
  "database_id": "db_xxx",
  "path": ".../data/customer_dbs/db_xxx.db",
  "size_bytes": 123,
  "size_label": "string",
  "checksum": "sha256...",
  "last_sync": "YYYY-MM-DD HH:MM UTC"
}
```
- Behavior: appends payload rows to SQLite file and writes new revision metadata.

#### `GET /databases/{database_id}/metadata`
- Auth: `X-API-Key` required
- Response `data`:
```json
{
  "database_id": "db_xxx",
  "size_bytes": 123,
  "size_label": "string",
  "checksum": "sha256...",
  "last_sync": "string"
}
```

### Revisions

#### `GET /workspaces/{workspace_id}/revisions`
- Auth: none
- Response `data`: joined workspace revision list with database name.

#### `GET /databases/{database_id}/revisions`
- Auth: none
- Response `data`: revision list for one DB (`id`, `created_at`, `size_label`, `checksum`, `type`).

#### `POST /databases/{database_id}/revisions`
- Auth: `X-API-Key` required
- Request body (optional):
```json
{ "type": "Manual|Automated|..." }
```
- Response `data`:
```json
{
  "id": "rev_xxx",
  "database_id": "db_xxx",
  "created_at": "YYYY-MM-DD HH:MM UTC",
  "size_label": "2.4 GB",
  "checksum": "abc123...def4",
  "type": "Manual"
}
```
- Behavior: inserts revision row and sets DB `last_sync` to `Just now`.

### Schedules

#### `GET /workspaces/{workspace_id}/schedules`
- Auth: none
- Response `data`: schedule list joined with database names.
- Note: no create/update/delete schedule endpoints are currently implemented.

### API keys

#### `GET /workspaces/{workspace_id}/keys`
- Auth: none
- Response `data`: key list (`id`, `name`, `value`, `created_at`, `last_used`, `status`).

#### `POST /workspaces/{workspace_id}/keys`
- Auth: none
- Request body:
```json
{ "name": "optional string" }
```
- Response `data`: newly generated active key.

#### `DELETE /workspaces/{workspace_id}/keys/{key_id}`
- Auth: `X-API-Key` required
- Response `data`:
```json
{ "id": "key_xxx", "status": "Revoked" }
```
- Behavior: soft-revokes key by status update.

### SQLite table viewer

#### `GET /databases/{database_id}/tables`
- Auth: `X-API-Key` required
- Response `data`:
```json
{
  "tables": [{ "name": "table_name", "row_count": 123 }],
  "database_id": "db_xxx"
}
```
- Errors: `400` for non-SQLite DB, `404` DB/file missing.

#### `GET /databases/{database_id}/tables/{table_name}?limit=100&offset=0`
- Auth: `X-API-Key` required
- Query params: `limit` (capped at 500), `offset`
- Response `data`:
```json
{
  "table_name": "string",
  "columns": [{ "name": "col", "type": "TEXT" }],
  "data": [{ "row": 1, "values": ["..."] }],
  "total_count": 123,
  "limit": 100,
  "offset": 0
}
```

## Important scope note
- Only `backend/app/api/api_v1/endpoints/lunchbox.py` is mounted under `/api/v1`.
- Additional template routes under `backend/app/api/routes/*` exist in the repo but are not wired into the running app.

## 2) Frontend UX Flow (What users can achieve right now)

## Entry and public surfaces
- User can browse `/` marketing page.
- User can browse `/docs` static docs experience.
- User can open `/platform/login` for demo platform entry.

## Platform login flow
1. User clicks `Sign in` on `/platform/login`.
2. Frontend calls `POST /api/v1/auth/signup` with hardcoded demo credentials.
3. Frontend stores returned email/token in `localStorage`.
4. User is redirected to `/platform`.

## Platform navigation and achieved outcomes
1. Overview (`/platform`):
- See summary cards and lists for databases/revisions/keys.
- Generate API key.
- Trigger revision creation for daemon-mode databases.
- For daemonless databases, get copyable CLI command.

2. Databases (`/platform/databases`):
- List databases in fixed workspace.
- Import a new SQLite database payload file.
- Fetch metadata for a DB.
- Mutate DB file (+size) to simulate change.
- Toggle backup mode (`daemon` <-> `daemonless`).

3. DB Viewer (`/platform/db-viewer`):
- List SQLite databases only.
- Browse tables for selected DB.
- View paginated table rows with simple next/previous controls.

4. Revisions (`/platform/revisions`):
- List revisions.
- Choose a database and create a revision.
- For daemonless DBs, get CLI command rather than server-side revision call.

5. Schedules (`/platform/schedules`):
- View schedule list and static health cards.
- No schedule mutation is currently wired.

6. API Keys (`/platform/keys`):
- List keys.
- Create key.
- Mark key as active in browser local storage.
- Revoke key.

7. Logout:
- User can sign out; local auth storage is cleared and user returns to login.

## Current constraints visible to users
- Workspace is fixed to `ws_001` in frontend constants.
- Active API key is browser-local and manually selected.
- Many UI controls are presentational and not connected to backend actions.

## 3) Shortcomings

## Backend/API shortcomings
- `BACKEND_API.md` and implemented API diverge significantly; spec debt can mislead integration work.
- Auth is not production-grade: `login` can auto-create users; passwords are stored as plaintext in the Lunchbox endpoint path.
- Bearer token returned by auth is not used to authorize most endpoints.
- Key generation endpoint is unauthenticated; any client can mint keys for a known workspace id.
- Several endpoints expose sensitive-ish data without auth (`/workspaces/*/keys`, `/workspaces/*/revisions`, `/workspaces/*/databases`).
- No org/user scoping in API behavior beyond workspace id path parameter.
- No pagination/filtering for list endpoints.
- No restore endpoints, no schedule mutation endpoints, and no audit/event endpoints in current implementation.
- Revision creation for non-import flow uses placeholder size/checksum values instead of actual snapshot metadata.
- Error model is inconsistent with plan (FastAPI `detail` errors rather than canonical `error` envelope).

## Frontend UX shortcomings
- Login UX is demo-only and effectively a signup call with hardcoded credentials.
- Auth state is localStorage token presence; no token validation/refresh/session expiry handling.
- Workspace/org selection is not implemented in platform UX; everything assumes one workspace (`ws_001`).
- Many buttons are no-op placeholders (`View all`, `Restore`, `Download report`, `Export list`, `Manage`, `Pause all`, etc.).
- Schedules page is read-only despite CTA affordances for creating/managing schedules.
- No restore user flow exists in platform despite revision restore affordances.
- API key handling is insecure for production (raw key persisted in localStorage and used directly from browser).
- Error handling is coarse (`Request failed: <status>`), with little actionable feedback.
- Test/auth drift exists (`demoAuth` and related tests use a different auth flag than runtime auth code).
- Mobile platform navigation is limited compared with desktop sidebar experience.

## Product/architecture gap
- Current backend/frontend are a functional prototype for backup concepts, not yet a hardened multi-tenant backup platform.
- Core production concerns still missing: robust authn/authz, true tenant isolation, auditability, restore workflows, and secure key lifecycle management.
