import os
import sqlite3
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[2] / "data"
DB_PATH = Path(os.getenv("LUNCHBOX_DB_PATH", str(DATA_PATH / "lunchbox.db")))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables_exist() -> None:
    """Ensure all tables exist (handles case where DB file was removed while server running)"""
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1 FROM users LIMIT 1").fetchone()
    except sqlite3.OperationalError:
        init_db()


def init_db() -> None:
    DATA_PATH.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS databases (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                engine TEXT NOT NULL,
                environment TEXT NOT NULL,
                schedule TEXT NOT NULL,
                retention TEXT NOT NULL,
                status TEXT NOT NULL,
                size_label TEXT NOT NULL,
                size_gb REAL NOT NULL,
                revisions_label TEXT NOT NULL,
                restores_label TEXT NOT NULL,
                encryption TEXT NOT NULL,
                last_sync TEXT NOT NULL,
                backup_mode TEXT NOT NULL DEFAULT 'daemon'
            );

            CREATE TABLE IF NOT EXISTS revisions (
                id TEXT PRIMARY KEY,
                database_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                size_label TEXT NOT NULL,
                checksum TEXT NOT NULL,
                type TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                database_id TEXT NOT NULL,
                name TEXT NOT NULL,
                cadence TEXT NOT NULL,
                next_run TEXT NOT NULL,
                status TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS keys (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_used TEXT NOT NULL,
                status TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )

        columns = [
            row["name"]
            for row in conn.execute("PRAGMA table_info(databases)").fetchall()
        ]
        if "backup_mode" not in columns:
            conn.execute(
                "ALTER TABLE databases ADD COLUMN backup_mode TEXT NOT NULL DEFAULT 'daemon'"
            )
            conn.commit()

        workspace_count = conn.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0]
        if workspace_count == 0:
            if os.getenv("LUNCHBOX_SKIP_SEED"):
                seed_workspaces_only(conn)
            else:
                seed_data(conn)


def seed_workspaces_only(conn: sqlite3.Connection) -> None:
    """Seed only essential workspaces for testing (skip mock data)"""
    conn.execute(
        "INSERT INTO workspaces (id, name) VALUES (?, ?)",
        ("ws_001", "Shovelstone Labs"),
    )


def seed_data(conn: sqlite3.Connection) -> None:
    seed_workspaces_only(conn)

    databases = [
        (
            "db_analytics",
            "ws_001",
            "customer-analytics",
            "PostgreSQL",
            "Production",
            "0 3 * * *",
            "30 days",
            "Healthy",
            "182 GB",
            182.0,
            "128 / day",
            "2 this week",
            "Post-quantum",
            "2m ago",
            "daemon",
        ),
        (
            "db_billing",
            "ws_001",
            "billing-ledger",
            "PostgreSQL",
            "Production",
            "0 */6 * * *",
            "90 days",
            "Healthy",
            "64 GB",
            64.0,
            "42 / day",
            "1 this week",
            "Post-quantum",
            "14m ago",
            "daemon",
        ),
        (
            "db_edge",
            "ws_001",
            "edge-cache",
            "SQLite",
            "Staging",
            "0 * * * *",
            "14 days",
            "Warning",
            "8.1 GB",
            8.1,
            "18 / day",
            "3 this week",
            "Standard",
            "1h ago",
            "daemonless",
        ),
    ]
    conn.executemany(
        """
        INSERT INTO databases (
            id, workspace_id, name, engine, environment, schedule, retention, status,
            size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        databases,
    )

    revisions = [
        (
            "rev_42ad2",
            "db_analytics",
            "Today 09:30 UTC",
            "3.2 GB",
            "b3a2f1...8d2",
            "Automated",
        ),
        (
            "rev_3bc19",
            "db_billing",
            "Today 09:00 UTC",
            "1.1 GB",
            "c8d9e2...1a4",
            "Manual",
        ),
        (
            "rev_a1c07",
            "db_edge",
            "Today 08:00 UTC",
            "420 MB",
            "9fd02a...bb1",
            "Automated",
        ),
    ]
    conn.executemany(
        "INSERT INTO revisions (id, database_id, created_at, size_label, checksum, type) VALUES (?, ?, ?, ?, ?, ?)",
        revisions,
    )

    schedules = [
        (
            "sch_nightly",
            "ws_001",
            "db_analytics",
            "Nightly production",
            "0 3 * * *",
            "Tomorrow 03:00 UTC",
            "Active",
        ),
        (
            "sch_billing",
            "ws_001",
            "db_billing",
            "Billing ledger",
            "0 */6 * * *",
            "Today 18:00 UTC",
            "Active",
        ),
        (
            "sch_edge",
            "ws_001",
            "db_edge",
            "Edge cache hourly",
            "0 * * * *",
            "Today 11:00 UTC",
            "Paused",
        ),
    ]
    conn.executemany(
        "INSERT INTO schedules (id, workspace_id, database_id, name, cadence, next_run, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        schedules,
    )

    keys = [
        (
            "key_primary",
            "ws_001",
            "Primary API key",
            "lbk_live_2d7f3e9f1f7b4b45",
            "2026-01-18",
            "Today 09:31 UTC",
            "Active",
        ),
        (
            "key_cicd",
            "ws_001",
            "CI/CD token",
            "lbk_live_4ab2cd901fe2188a",
            "2025-12-02",
            "Today 08:52 UTC",
            "Active",
        ),
        (
            "key_audit",
            "ws_001",
            "Contractor audit key",
            "lbk_live_1a2b3c4d5e6f7a8b",
            "2025-10-11",
            "2026-01-20",
            "Revoked",
        ),
    ]
    conn.executemany(
        "INSERT INTO keys (id, workspace_id, name, value, created_at, last_used, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        keys,
    )
