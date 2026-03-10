# Lunchbox Go Backend

This is the active Lunchbox backend service. It preserves the current `/api/v1` contract used by the Vite frontend and the Python CLI.

## Commands

From [`backend-go`](/Users/paulmcbrien/Documents/SHOVELSTONE/lunchbox/backend-go):

```bash
go run ./cmd/server
go test ./...
go build ./cmd/server
```

## Environment

- `LUNCHBOX_ADDR`: listen address. Defaults to `127.0.0.1:8000`.
- `LUNCHBOX_DB_PATH`: metadata SQLite path. Defaults to `data/lunchbox.db`.
- `LUNCHBOX_SKIP_SEED`: if set, only seeds the base workspace `ws_001`.
- `LUNCHBOX_ALLOWED_ORIGIN`: CORS origin. Defaults to `http://localhost:5173`.

## Compatibility Notes

- Metadata DB remains SQLite.
- Customer DB snapshots remain under `data/customer_dbs/`.
- Revision snapshot files remain under `data/revisions/`.
- The old FastAPI backend has been removed from the repo.
