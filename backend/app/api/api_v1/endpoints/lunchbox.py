import hashlib
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.db import get_connection

router = APIRouter()


class CreateKeyRequest(BaseModel):
    name: Optional[str] = None


class CreateRevisionRequest(BaseModel):
    type: Optional[str] = None


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateDatabaseRequest(BaseModel):
    name: str
    engine: str = "PostgreSQL"
    environment: str = "Production"
    schedule: str = "0 3 * * *"
    retention: str = "30 days"
    status: str = "Healthy"
    size_label: str = "12 GB"
    size_gb: float = 12.0
    revisions_label: str = "0 / day"
    restores_label: str = "0 this week"
    encryption: str = "Standard"
    last_sync: str = "Just now"
    backup_mode: str = "daemon"


class ImportDatabaseRequest(BaseModel):
    name: str
    target_size_mb: float = 2.0
    backup_mode: str = "daemon"
    engine: str = "SQLite"
    environment: str = "Production"
    schedule: str = "0 3 * * *"
    retention: str = "30 days"
    encryption: str = "Standard"


class MutateDatabaseRequest(BaseModel):
    additional_size_mb: float = 1.0


class UpdateDatabaseRequest(BaseModel):
    backup_mode: Optional[str] = None


def now_label() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def request_id() -> str:
    return f"req_{secrets.token_hex(4)}"


def response(data: Any) -> Dict[str, Any]:
    return {"data": data, "meta": {"requestId": request_id()}}


def data_path() -> Path:
    return Path(__file__).resolve().parents[5] / "data"


def customer_db_dir() -> Path:
    path = data_path() / "customer_dbs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def customer_db_path(database_id: str) -> Path:
    return customer_db_dir() / f"{database_id}.db"


def revisions_dir() -> Path:
    path = data_path() / "revisions"
    path.mkdir(parents=True, exist_ok=True)
    return path


def revision_file_path(revision_id: str) -> Path:
    return revisions_dir() / f"{revision_id}.db"


def format_size(size_bytes: int) -> str:
    if size_bytes >= 1024**3:
        return f"{size_bytes / (1024**3):.1f} GB"
    if size_bytes >= 1024**2:
        return f"{size_bytes / (1024**2):.1f} MB"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


def file_checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    return path.stat().st_size


def ensure_sqlite_payload(path: Path, target_size_bytes: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS payload (id INTEGER PRIMARY KEY, data TEXT)"
        )
        payload = "x" * 1024
        while file_size_bytes(path) < target_size_bytes:
            rows = [(payload,) for _ in range(200)]
            conn.executemany("INSERT INTO payload (data) VALUES (?)", rows)
            conn.commit()


def append_sqlite_payload(path: Path, additional_bytes: int) -> None:
    target_size = file_size_bytes(path) + additional_bytes
    ensure_sqlite_payload(path, target_size)


def require_api_key(workspace_id: str, api_key: Optional[str]) -> None:
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")

    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id
            FROM keys
            WHERE workspace_id = ? AND value = ? AND status = 'Active'
            """,
            (workspace_id, api_key),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid API key")


def apply_database_metadata(
    database_id: str,
    revision_type: str = "Automated",
) -> dict[str, Any]:
    db_path = customer_db_path(database_id)
    size_bytes = file_size_bytes(db_path)
    checksum = file_checksum(db_path) if size_bytes else ""
    size_label = format_size(size_bytes)
    size_gb = size_bytes / (1024**3) if size_bytes else 0.0
    last_sync = now_label()
    revision_id = f"rev_{secrets.token_hex(3)}"

    with get_connection() as conn:
        conn.execute(
            "UPDATE databases SET size_label = ?, size_gb = ?, last_sync = ? WHERE id = ?",
            (size_label, size_gb, last_sync, database_id),
        )
        conn.execute(
            """
            INSERT INTO revisions (id, database_id, created_at, size_label, checksum, type)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                revision_id,
                database_id,
                last_sync,
                size_label,
                checksum,
                revision_type,
            ),
        )

        count = conn.execute(
            "SELECT COUNT(*) FROM revisions WHERE database_id = ?",
            (database_id,),
        ).fetchone()[0]
        revisions_label = f"{count} / day"
        conn.execute(
            "UPDATE databases SET revisions_label = ? WHERE id = ?",
            (revisions_label, database_id),
        )

        conn.commit()

    if size_bytes:
        revision_file_path(revision_id).write_bytes(db_path.read_bytes())

    return {
        "database_id": database_id,
        "revision_id": revision_id,
        "path": str(db_path),
        "size_bytes": size_bytes,
        "size_label": size_label,
        "checksum": checksum,
        "last_sync": last_sync,
        "revisions_label": revisions_label,
    }


@router.get("/health")
def health() -> Dict[str, Any]:
    return response({"status": "ok"})


@router.post("/auth/signup")
def signup(payload: SignupRequest) -> Dict[str, Any]:
    user_id = f"user_{secrets.token_hex(3)}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    token = f"jwt_{secrets.token_hex(16)}"

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO users (id, email, password, created_at) VALUES (?, ?, ?, ?)",
            (user_id, payload.email, payload.password, created_at),
        )
        conn.commit()

    return response({"id": user_id, "email": payload.email, "token": token})


@router.post("/auth/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    token = f"jwt_{secrets.token_hex(16)}"

    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email FROM users WHERE email = ?",
            (payload.email,),
        ).fetchone()

    if row:
        return response({"id": row["id"], "email": row["email"], "token": token})

    user_id = f"user_{secrets.token_hex(3)}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO users (id, email, password, created_at) VALUES (?, ?, ?, ?)",
            (user_id, payload.email, payload.password, created_at),
        )
        conn.commit()

    return response({"id": user_id, "email": payload.email, "token": token})


@router.get("/workspaces")
def list_workspaces() -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute("SELECT id, name FROM workspaces").fetchall()
        return response([dict(row) for row in rows])


@router.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return response(dict(row))


@router.get("/workspaces/{workspace_id}/databases")
def list_databases(workspace_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, engine, environment, schedule, retention, status, size_label,
                   revisions_label, restores_label, encryption, last_sync, backup_mode
            FROM databases
            WHERE workspace_id = ?
            ORDER BY name
            """,
            (workspace_id,),
        ).fetchall()
        return response([dict(row) for row in rows])


@router.post("/workspaces/{workspace_id}/databases")
def create_database(
    workspace_id: str,
    payload: CreateDatabaseRequest,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    database_id = f"db_{secrets.token_hex(3)}"

    require_api_key(workspace_id, api_key)

    with get_connection() as conn:
        workspace = conn.execute(
            "SELECT id FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        conn.execute(
            """
            INSERT INTO databases (
                id, workspace_id, name, engine, environment, schedule, retention, status,
                size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                database_id,
                workspace_id,
                payload.name,
                payload.engine,
                payload.environment,
                payload.schedule,
                payload.retention,
                payload.status,
                payload.size_label,
                payload.size_gb,
                payload.revisions_label,
                payload.restores_label,
                payload.encryption,
                payload.last_sync,
                payload.backup_mode,
            ),
        )
        conn.commit()

    return response(
        {
            "id": database_id,
            "name": payload.name,
            "engine": payload.engine,
            "environment": payload.environment,
            "schedule": payload.schedule,
            "retention": payload.retention,
            "status": payload.status,
            "size_label": payload.size_label,
            "revisions_label": payload.revisions_label,
            "restores_label": payload.restores_label,
            "encryption": payload.encryption,
            "last_sync": payload.last_sync,
            "backup_mode": payload.backup_mode,
        }
    )


@router.post("/workspaces/{workspace_id}/databases/import")
def import_database(
    workspace_id: str,
    payload: ImportDatabaseRequest,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    require_api_key(workspace_id, api_key)

    if payload.target_size_mb <= 0:
        raise HTTPException(status_code=400, detail="target_size_mb must be positive")

    database_id = f"db_{secrets.token_hex(3)}"
    target_size_bytes = int(payload.target_size_mb * 1024 * 1024)

    with get_connection() as conn:
        workspace_exists = conn.execute(
            "SELECT COUNT(*) FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()[0]
        if workspace_exists == 0:
            raise HTTPException(status_code=404, detail="Workspace not found")

        conn.execute(
            """
            INSERT INTO databases (
                id, workspace_id, name, engine, environment, schedule, retention, status,
                size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                database_id,
                workspace_id,
                payload.name,
                payload.engine,
                payload.environment,
                payload.schedule,
                payload.retention,
                "Healthy",
                "0 B",
                0.0,
                "0 / day",
                "0 this week",
                payload.encryption,
                "Never",
                payload.backup_mode,
            ),
        )
        conn.commit()

    ensure_sqlite_payload(customer_db_path(database_id), target_size_bytes)
    metadata = apply_database_metadata(database_id)

    return response(
        {
            "id": database_id,
            "workspace_id": workspace_id,
            "name": payload.name,
            "engine": payload.engine,
            "environment": payload.environment,
            "schedule": payload.schedule,
            "retention": payload.retention,
            "status": "Healthy",
            "size_label": metadata["size_label"],
            "size_bytes": metadata["size_bytes"],
            "revisions_label": metadata["revisions_label"],
            "restores_label": "0 this week",
            "encryption": payload.encryption,
            "last_sync": metadata["last_sync"],
            "backup_mode": payload.backup_mode,
        }
    )


@router.post("/workspaces/{workspace_id}/databases/sync")
async def sync_database(
    workspace_id: str,
    request: Request,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
    database_name: Optional[str] = Header(None, alias="X-Database-Name"),
    backup_mode: Optional[str] = Header("daemonless", alias="X-Backup-Mode"),
) -> Dict[str, Any]:
    require_api_key(workspace_id, api_key)

    if not database_name:
        raise HTTPException(
            status_code=400, detail="X-Database-Name header is required"
        )
    if backup_mode not in {"daemon", "daemonless"}:
        raise HTTPException(
            status_code=400, detail="X-Backup-Mode must be daemon or daemonless"
        )

    payload = await request.body()
    if not payload:
        raise HTTPException(status_code=400, detail="Request body is empty")

    with get_connection() as conn:
        db_row = conn.execute(
            """
            SELECT id
            FROM databases
            WHERE workspace_id = ? AND name = ?
            """,
            (workspace_id, database_name),
        ).fetchone()

        if db_row:
            database_id = db_row["id"]
            conn.execute(
                "UPDATE databases SET backup_mode = ?, engine = ? WHERE id = ?",
                (backup_mode, "SQLite", database_id),
            )
        else:
            workspace = conn.execute(
                "SELECT id FROM workspaces WHERE id = ?",
                (workspace_id,),
            ).fetchone()
            if not workspace:
                raise HTTPException(status_code=404, detail="Workspace not found")

            database_id = f"db_{secrets.token_hex(3)}"
            conn.execute(
                """
                INSERT INTO databases (
                    id, workspace_id, name, engine, environment, schedule, retention, status,
                    size_label, size_gb, revisions_label, restores_label, encryption, last_sync, backup_mode
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    database_id,
                    workspace_id,
                    database_name,
                    "SQLite",
                    "Production",
                    "0 3 * * *",
                    "30 days",
                    "Healthy",
                    "0 B",
                    0.0,
                    "0 / day",
                    "0 this week",
                    "Standard",
                    "Never",
                    backup_mode,
                ),
            )
        conn.commit()

    customer_db_path(database_id).write_bytes(payload)
    metadata = apply_database_metadata(database_id, revision_type="Sync")

    return response(
        {
            "database_id": database_id,
            "name": database_name,
            "revision_id": metadata["revision_id"],
            "size_bytes": metadata["size_bytes"],
            "size_label": metadata["size_label"],
            "checksum": metadata["checksum"],
            "backup_mode": backup_mode,
        }
    )


@router.patch("/databases/{database_id}")
def update_database(
    database_id: str,
    payload: UpdateDatabaseRequest,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    if payload.backup_mode not in {"daemon", "daemonless"}:
        raise HTTPException(
            status_code=400, detail="backup_mode must be daemon or daemonless"
        )

    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

        require_api_key(db_row["workspace_id"], api_key)

        conn.execute(
            "UPDATE databases SET backup_mode = ? WHERE id = ?",
            (payload.backup_mode, database_id),
        )
        conn.commit()

    return response({"id": database_id, "backup_mode": payload.backup_mode})


@router.post("/databases/{database_id}/mutate")
def mutate_database(
    database_id: str,
    payload: MutateDatabaseRequest,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    if payload.additional_size_mb <= 0:
        raise HTTPException(
            status_code=400, detail="additional_size_mb must be positive"
        )

    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

    require_api_key(db_row["workspace_id"], api_key)

    target_bytes = int(payload.additional_size_mb * 1024 * 1024)
    append_sqlite_payload(customer_db_path(database_id), target_bytes)
    metadata = apply_database_metadata(database_id)

    return response(metadata)


@router.get("/databases/{database_id}/metadata")
def get_database_metadata(
    database_id: str,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id, last_sync FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

    require_api_key(db_row["workspace_id"], api_key)

    db_path = customer_db_path(database_id)
    size_bytes = file_size_bytes(db_path)
    checksum = file_checksum(db_path) if size_bytes else ""

    return response(
        {
            "database_id": database_id,
            "size_bytes": size_bytes,
            "size_label": format_size(size_bytes),
            "checksum": checksum,
            "last_sync": db_row["last_sync"],
        }
    )


@router.get("/workspaces/{workspace_id}/revisions")
def list_revisions(workspace_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT revisions.id, revisions.database_id, revisions.created_at, revisions.size_label,
                   revisions.checksum, revisions.type, databases.name AS database
            FROM revisions
            JOIN databases ON databases.id = revisions.database_id
            WHERE databases.workspace_id = ?
            ORDER BY revisions.rowid DESC
            """,
            (workspace_id,),
        ).fetchall()
        return response([dict(row) for row in rows])


@router.get("/workspaces/{workspace_id}/schedules")
def list_schedules(workspace_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT schedules.id, schedules.name, schedules.cadence, schedules.next_run,
                   schedules.status, schedules.database_id, databases.name AS database
            FROM schedules
            JOIN databases ON databases.id = schedules.database_id
            WHERE schedules.workspace_id = ?
            ORDER BY schedules.name
            """,
            (workspace_id,),
        ).fetchall()
        return response([dict(row) for row in rows])


@router.get("/workspaces/{workspace_id}/keys")
def list_keys(workspace_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, value, created_at, last_used, status
            FROM keys
            WHERE workspace_id = ?
            ORDER BY created_at DESC
            """,
            (workspace_id,),
        ).fetchall()
        return response([dict(row) for row in rows])


@router.post("/workspaces/{workspace_id}/keys")
def create_key(workspace_id: str, payload: CreateKeyRequest) -> Dict[str, Any]:
    key_id = f"key_{secrets.token_hex(3)}"
    key_value = f"lbk_live_{secrets.token_hex(10)}"
    name = payload.name or "Generated API key"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with get_connection() as conn:
        workspace = conn.execute(
            "SELECT id FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        conn.execute(
            """
            INSERT INTO keys (id, workspace_id, name, value, created_at, last_used, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (key_id, workspace_id, name, key_value, created_at, "Never", "Active"),
        )
        conn.commit()

    return response(
        {
            "id": key_id,
            "name": name,
            "value": key_value,
            "created_at": created_at,
            "last_used": "Never",
            "status": "Active",
        }
    )


@router.delete("/workspaces/{workspace_id}/keys/{key_id}")
def delete_key(
    workspace_id: str,
    key_id: str,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    require_api_key(workspace_id, api_key)

    with get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM keys WHERE id = ? AND workspace_id = ?",
            (key_id, workspace_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Key not found")

        conn.execute(
            "UPDATE keys SET status = ? WHERE id = ?",
            ("Revoked", key_id),
        )
        conn.commit()

    return response({"id": key_id, "status": "Revoked"})


@router.get("/databases/{database_id}/revisions")
def list_database_revisions(database_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, created_at, size_label, checksum, type
            FROM revisions
            WHERE database_id = ?
            ORDER BY rowid DESC
            """,
            (database_id,),
        ).fetchall()
        return response([dict(row) for row in rows])


@router.post("/databases/{database_id}/revisions")
def create_revision(
    database_id: str,
    payload: Optional[CreateRevisionRequest] = None,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    revision_type = payload.type if payload and payload.type else "Manual"

    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

        require_api_key(db_row["workspace_id"], api_key)

    db_path = customer_db_path(database_id)
    if db_path.exists():
        metadata = apply_database_metadata(database_id, revision_type=revision_type)
        return response(
            {
                "id": metadata["revision_id"],
                "database_id": database_id,
                "created_at": metadata["last_sync"],
                "size_label": metadata["size_label"],
                "checksum": metadata["checksum"],
                "type": revision_type,
            }
        )

    revision_id = f"rev_{secrets.token_hex(3)}"
    created_at = now_label()
    size_label = "2.4 GB"
    checksum = f"{secrets.token_hex(3)}...{secrets.token_hex(2)}"

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO revisions (id, database_id, created_at, size_label, checksum, type)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (revision_id, database_id, created_at, size_label, checksum, revision_type),
        )
        conn.execute(
            "UPDATE databases SET last_sync = ? WHERE id = ?",
            ("Just now", database_id),
        )
        conn.commit()

    return response(
        {
            "id": revision_id,
            "database_id": database_id,
            "created_at": created_at,
            "size_label": size_label,
            "checksum": checksum,
            "type": revision_type,
        }
    )


@router.get("/databases/{database_id}/revisions/{revision_id}/download")
def download_revision(
    database_id: str,
    revision_id: str,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> FileResponse:
    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

        revision_row = conn.execute(
            "SELECT id FROM revisions WHERE id = ? AND database_id = ?",
            (revision_id, database_id),
        ).fetchone()
        if not revision_row:
            raise HTTPException(status_code=404, detail="Revision not found")

    require_api_key(db_row["workspace_id"], api_key)

    snapshot = revision_file_path(revision_id)
    if not snapshot.exists():
        raise HTTPException(status_code=404, detail="Revision snapshot not found")

    return FileResponse(
        path=str(snapshot),
        media_type="application/octet-stream",
        filename=f"{database_id}-{revision_id}.db",
    )


@router.get("/databases/{database_id}/tables")
def list_database_tables(
    database_id: str,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id, engine FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

    require_api_key(db_row["workspace_id"], api_key)

    if db_row["engine"] != "SQLite":
        raise HTTPException(
            status_code=400, detail="Table viewer only supports SQLite databases"
        )

    db_path = customer_db_path(database_id)
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Database file not found")

    try:
        with sqlite3.connect(db_path) as sqlite_conn:
            cursor = sqlite_conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
            tables = [{"name": row[0]} for row in cursor.fetchall()]

            for table in tables:
                cursor.execute(f'SELECT COUNT(*) FROM "{table["name"]}"')
                table["row_count"] = cursor.fetchone()[0]

        return response({"tables": tables, "database_id": database_id})
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/databases/{database_id}/tables/{table_name}")
def get_table_data(
    database_id: str,
    table_name: str,
    limit: int = 100,
    offset: int = 0,
    api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Dict[str, Any]:
    if limit > 500:
        limit = 500

    with get_connection() as conn:
        db_row = conn.execute(
            "SELECT id, workspace_id, engine FROM databases WHERE id = ?",
            (database_id,),
        ).fetchone()
        if not db_row:
            raise HTTPException(status_code=404, detail="Database not found")

    require_api_key(db_row["workspace_id"], api_key)

    if db_row["engine"] != "SQLite":
        raise HTTPException(
            status_code=400, detail="Table viewer only supports SQLite databases"
        )

    db_path = customer_db_path(database_id)
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Database file not found")

    try:
        with sqlite3.connect(db_path) as sqlite_conn:
            cursor = sqlite_conn.cursor()

            cursor.execute(
                'SELECT name FROM sqlite_master WHERE type="table" AND name=?',
                (table_name,),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Table not found")

            cursor.execute(f'PRAGMA table_info("{table_name}")')
            columns = [{"name": row[1], "type": row[2]} for row in cursor.fetchall()]

            cursor.execute(
                f'SELECT * FROM "{table_name}" LIMIT ? OFFSET ?', (limit, offset)
            )
            rows = cursor.fetchall()

            data = [{"row": idx + 1, "values": row} for idx, row in enumerate(rows)]

            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            total_count = cursor.fetchone()[0]

        return response(
            {
                "table_name": table_name,
                "columns": columns,
                "data": data,
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
            }
        )
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
