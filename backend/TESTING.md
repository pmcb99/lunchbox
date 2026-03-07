# Testing

## Dynamic interactive step-by-step testing

The **interactive test** walks through the Lunchbox backend integration flow step by step, pausing after each step so you can review changes in the UI (or inspect API responses). It uses a fresh empty database for clarity.

### Run the interactive test

1. **Start the backend server** (in another terminal):
    ```bash
    bash backend/run.sh --no-seed
    ```

2. **Run the interactive script** from the repo root:
   ```bash
   bash backend/scripts/interactive_test.sh
   ```

The script will:
- Check that the server is running at `http://127.0.0.1:8000` (exits with a clear message if not).
- Remove any existing `data/lunchbox.db` so the run starts from a clean state.
- Skip seeding mock data (uses `LUNCHBOX_SKIP_SEED=true`).
- Run 10 steps, pausing after each with “Press Enter to continue…”.

### Steps performed

| Step | Action | What to review |
|------|--------|----------------|
| 1 | Create test user and login | Log in to the UI with `demo@lunchbox.dev` / `lunchbox-demo`. |
| 2 | Create API key for workspace `ws_001` | In the UI, workspace **ws_001** → API Keys: new key “Step-by-step test key”. |
| 3 | Create a new database (2MB) | Workspace **ws_001** → Databases: new DB with a name like `step-by-step-db-<hex>`. |
| 4 | Fetch database metadata | Script prints metadata JSON (size, checksum, etc.). |
| 5 | Mutate database (+1MB) | In the UI, database size should increase. |
| 6 | List all databases in workspace | Script prints the workspace database list. |
| 7 | List database revisions | Script prints revisions (at least 2: create + mutate). |
| 8 | List all API keys in workspace | Script prints keys for **ws_001**. |
| 9 | Delete API key (revocation) | In the UI, the key should show as “Revoked”. |
| 10 | Test API key rejection | Request with deleted key returns HTTP 401. |

### Test credentials

The interactive test uses fixed credentials so you can log in to the UI during the run:

- **Email:** `demo@lunchbox.dev`
- **Password:** `lunchbox-demo`

### Cleanup

On exit (including Ctrl+C), the script removes the test database file and frees port 8000 (it kills any process listening on that port). If you started the backend with `run.sh` on port 8000, it will be stopped when the script exits.

---

## Non-interactive integration test

For CI or a single full run without pauses:

```bash
bash backend/scripts/integration_test.sh
```

This script:

1. Cleans port 8000 and removes `data/lunchbox.db`.
2. Starts uvicorn on port 8000.
3. Waits for the server to be ready.
4. Runs the same flow (signup → login → create key → create DB → metadata → mutate → list DBs/revisions/keys → delete key → verify 401) in one go with assertions.
5. Runs the pytest integration tests in `tests/integration/test_lunchbox_flow.py`.

No UI review; use this for automated or quick full-stack verification.

---

## Pytest integration tests

Location: `backend/tests/integration/test_lunchbox_flow.py`.

- **`test_lunchbox_cli_sync_restore_flow`** – Creates an API key via the API, builds a local SQLite DB, syncs with the Lunchbox CLI, adds more data and syncs again, then restores from the platform and checks row count.
- **`test_lunchbox_cli_and_curl_e2e`** – E2E: create key via curl, create local DB and add data, sync via CLI, verify platform state via curl after each step; add more data, sync again; restore via CLI and verify file contents.

These expect the API to be available at `API_BASE_URL` (default `http://127.0.0.1:8000`). They are invoked automatically by `integration_test.sh` after the bash flow, or you can run them alone (with the server already up):

```bash
cd backend
API_BASE_URL=http://127.0.0.1:8000 .venv/bin/pytest -q --confcutdir=tests/integration tests/integration/test_lunchbox_flow.py
```
