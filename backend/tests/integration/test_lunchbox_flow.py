import json
import logging
import os
import secrets
import sqlite3
import subprocess
import sys
from pathlib import Path

import httpx

logging.basicConfig(level=logging.INFO, format="[TEST] %(message)s")


def _run_curl(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    api_key: str | None = None,
    data: str | None = None,
) -> str:
    """Run curl against the platform; returns response body."""
    cmd = ["curl", "-sf", "-X", method, f"{base_url.rstrip('/')}{path}"]
    if api_key:
        cmd.extend(["-H", f"X-API-Key: {api_key}"])
    if data:
        cmd.extend(["-H", "Content-Type: application/json", "-d", data])
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout


def test_lunchbox_cli_sync_restore_flow(tmp_path: Path) -> None:
    base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
    workspace_id = "ws_001"

    with httpx.Client(base_url=base_url, timeout=15.0) as client:
        logging.info("Creating API key for workspace ws_001")
        key_response = client.post(
            f"/api/v1/workspaces/{workspace_id}/keys",
            json={"name": "Integration CLI key"},
        )
        assert key_response.status_code == 200
        key_payload = key_response.json()["data"]
        api_key = key_payload["value"]

        db_name = f"integration-cli-{secrets.token_hex(3)}.db"
        local_db = tmp_path / db_name
        restored_db = tmp_path / f"restored-{db_name}"

        logging.info("Creating DB: %s", db_name)
        with sqlite3.connect(local_db) as conn:
            conn.execute("CREATE TABLE test_data (id INTEGER PRIMARY KEY, value TEXT)")
            logging.info("Added record to table 'test_data' (value: 'v1')")
            conn.execute("INSERT INTO test_data (value) VALUES (?)", ("v1",))
            conn.commit()

        cli_env = os.environ.copy()
        cli_env["LUNCHBOX_API_BASE_URL"] = base_url
        cli_env["LUNCHBOX_WORKSPACE_ID"] = workspace_id
        cli_env["LUNCHBOX_API_KEY"] = api_key
        cli_env["PYTHONPATH"] = str(Path(__file__).resolve().parents[3] / "cli")

        logging.info("Syncing DB to platform (first time)")
        first_sync = subprocess.run(
            [sys.executable, "-m", "lunchbox_cli.main", "sync", str(local_db)],
            capture_output=True,
            text=True,
            env=cli_env,
            check=False,
        )
        assert first_sync.returncode == 0, first_sync.stderr

        logging.info("Verifying database appears in workspace")
        databases_response = client.get(f"/api/v1/workspaces/{workspace_id}/databases")
        assert databases_response.status_code == 200
        databases_payload = databases_response.json()["data"]
        created_db = next(
            (db for db in databases_payload if db["name"] == db_name), None
        )
        assert created_db is not None

        with sqlite3.connect(local_db) as conn:
            logging.info("Added record to table 'test_data' (value: 'v2')")
            conn.execute("INSERT INTO test_data (value) VALUES (?)", ("v2",))
            conn.commit()

        second_sync = subprocess.run(
            [sys.executable, "-m", "lunchbox_cli.main", "sync", str(local_db)],
            capture_output=True,
            text=True,
            env=cli_env,
            check=False,
        )
        assert second_sync.returncode == 0, second_sync.stderr

        logging.info("Verifying revisions (expecting >= 2)")
        revisions_response = client.get(
            f"/api/v1/databases/{created_db['id']}/revisions"
        )
        assert revisions_response.status_code == 200
        revisions = revisions_response.json()["data"]
        assert len(revisions) >= 2

        logging.info("Restoring DB from platform")
        restore = subprocess.run(
            [
                sys.executable,
                "-m",
                "lunchbox_cli.main",
                "restore",
                str(local_db),
                "--output",
                str(restored_db),
            ],
            capture_output=True,
            text=True,
            env=cli_env,
            check=False,
        )
        assert restore.returncode == 0, restore.stderr
        assert restored_db.exists()

        logging.info("Verifying restored DB contents")
        with sqlite3.connect(restored_db) as conn:
            row_count = conn.execute("SELECT COUNT(*) FROM test_data").fetchone()[0]
            assert row_count == 2


def test_lunchbox_cli_and_curl_e2e(tmp_path: Path) -> None:
    """
    E2E test: create key via curl, create local SQLite DB and add data via sqlite3,
    sync via CLI, verify platform state via curl after each step; add more data,
    sync again, verify via curl; restore via CLI and verify file contents.
    """
    base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    workspace_id = "ws_001"

    # 1. Create API key via curl
    logging.info("Creating API key via curl")
    key_body = _run_curl(
        base_url,
        f"/api/v1/workspaces/{workspace_id}/keys",
        method="POST",
        data='{"name": "CLI+curl E2E key"}',
    )
    key_payload = json.loads(key_body)
    assert "data" in key_payload and "value" in key_payload["data"]
    api_key = key_payload["data"]["value"]

    # 2. Create local SQLite DB and add initial data (sqlite3)
    db_name = f"e2e-{secrets.token_hex(3)}.db"
    local_db = tmp_path / db_name
    restored_db = tmp_path / f"restored-{db_name}"

    logging.info("Creating DB: %s", db_name)
    with sqlite3.connect(local_db) as conn:
        conn.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)")
        logging.info("Added record to table 'items' (name: 'first')")
        conn.execute("INSERT INTO items (name) VALUES (?)", ("first",))
        conn.commit()

    # 3. Sync via CLI
    cli_env = os.environ.copy()
    cli_env["LUNCHBOX_API_BASE_URL"] = base_url
    cli_env["LUNCHBOX_WORKSPACE_ID"] = workspace_id
    cli_env["LUNCHBOX_API_KEY"] = api_key
    cli_path = Path(__file__).resolve().parents[3] / "cli"
    cli_env["PYTHONPATH"] = str(cli_path)

    logging.info("Syncing DB to platform")
    sync1 = subprocess.run(
        [sys.executable, "-m", "lunchbox_cli.main", "sync", str(local_db)],
        capture_output=True,
        text=True,
        env=cli_env,
        check=False,
    )
    assert sync1.returncode == 0, f"sync failed: {sync1.stderr}"

    # 4. Verify via curl: database appears in workspace
    logging.info("Verifying database appears in workspace")
    list_body = _run_curl(base_url, f"/api/v1/workspaces/{workspace_id}/databases")
    list_data = json.loads(list_body)
    assert "data" in list_data
    created = next((d for d in list_data["data"] if d["name"] == db_name), None)
    assert created is not None, f"Database {db_name} not in workspace list"
    database_id = created["id"]

    # 5. Verify via curl: metadata for this database (with API key)
    logging.info("Verifying database metadata")
    meta_body = _run_curl(
        base_url,
        f"/api/v1/databases/{database_id}/metadata",
        api_key=api_key,
    )
    meta_data = json.loads(meta_body)
    assert "data" in meta_data
    assert meta_data["data"].get("size_bytes", 0) > 0
    assert meta_data["data"].get("checksum")

    # 6. Add more data with sqlite3
    with sqlite3.connect(local_db) as conn:
        logging.info("Added record to table 'items' (name: 'second')")
        conn.execute("INSERT INTO items (name) VALUES (?)", ("second",))
        conn.commit()

    # 7. Second sync via CLI
    logging.info("Syncing DB again (second revision)")
    sync2 = subprocess.run(
        [sys.executable, "-m", "lunchbox_cli.main", "sync", str(local_db)],
        capture_output=True,
        text=True,
        env=cli_env,
        check=False,
    )
    assert sync2.returncode == 0, f"second sync failed: {sync2.stderr}"

    # 8. Verify via curl: at least 2 revisions
    logging.info("Verifying revisions (expecting >= 2)")
    rev_body = _run_curl(
        base_url,
        f"/api/v1/databases/{database_id}/revisions",
    )
    rev_data = json.loads(rev_body)
    assert "data" in rev_data
    revisions = rev_data["data"]
    assert len(revisions) >= 2, f"Expected >= 2 revisions, got {len(revisions)}"

    # 9. Restore via CLI
    logging.info("Restoring DB from platform")
    restore = subprocess.run(
        [
            sys.executable,
            "-m",
            "lunchbox_cli.main",
            "restore",
            str(local_db),
            "--output",
            str(restored_db),
        ],
        capture_output=True,
        text=True,
        env=cli_env,
        check=False,
    )
    assert restore.returncode == 0, f"restore failed: {restore.stderr}"
    assert restored_db.exists()

    # 10. Verify restored file with sqlite3: both rows present
    logging.info("Verifying restored DB contents")
    with sqlite3.connect(restored_db) as conn:
        row_count = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
        assert row_count == 2, f"Expected 2 rows in restored DB, got {row_count}"
        names = [
            r[0] for r in conn.execute("SELECT name FROM items ORDER BY id").fetchall()
        ]
        assert names == ["first", "second"]
