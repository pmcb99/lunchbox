"""Lunchbox CLI entry point."""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from . import __version__

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_WORKSPACE_ID = "ws_001"


def env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None:
        return default
    return value


def api_base_url() -> str:
    return (env("LUNCHBOX_API_BASE_URL", DEFAULT_BASE_URL) or DEFAULT_BASE_URL).rstrip("/")


def workspace_id() -> str:
    return env("LUNCHBOX_WORKSPACE_ID", DEFAULT_WORKSPACE_ID) or DEFAULT_WORKSPACE_ID


def required_api_key() -> str:
    api_key = env("LUNCHBOX_API_KEY")
    if not api_key:
        raise RuntimeError("LUNCHBOX_API_KEY is required")
    return api_key


def request_json(
    method: str,
    path: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> dict[str, Any]:
    req_headers: dict[str, str] = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(
        url=f"{api_base_url()}{path}",
        data=body,
        headers=req_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload)
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8")
        raise RuntimeError(f"HTTP {err.code} for {method} {path}: {detail}") from err


def request_bytes(
    method: str,
    path: str,
    *,
    headers: dict[str, str] | None = None,
) -> bytes:
    req = urllib.request.Request(
        url=f"{api_base_url()}{path}",
        headers=headers or {},
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8")
        raise RuntimeError(f"HTTP {err.code} for {method} {path}: {detail}") from err


def resolve_database_name(args: argparse.Namespace) -> str:
    if args.db:
        return args.db
    if args.path:
        return Path(args.path).name
    raise RuntimeError("Provide a database path or --db")


def get_database_by_name(name: str) -> dict[str, Any] | None:
    payload = request_json("GET", f"/api/v1/workspaces/{workspace_id()}/databases")
    for database in payload["data"]:
        if database["name"] == name:
            return database
    return None


def run_sync(args: argparse.Namespace) -> int:
    if not args.path:
        raise RuntimeError("sync requires a SQLite path")
    db_path = Path(args.path)
    if not db_path.exists():
        raise RuntimeError(f"Database file not found: {db_path}")

    db_name = args.name or db_path.name
    payload = db_path.read_bytes()
    if not payload:
        raise RuntimeError("SQLite file is empty")

    result = request_json(
        "POST",
        f"/api/v1/workspaces/{workspace_id()}/databases/sync",
        headers={
            "X-API-Key": required_api_key(),
            "X-Database-Name": db_name,
            "X-Backup-Mode": "daemonless",
            "Content-Type": "application/octet-stream",
        },
        body=payload,
    )

    print(
        f"Synced {db_name}: revision {result['data']['revision_id']} "
        f"({result['data']['size_label']}, checksum {result['data']['checksum']})"
    )
    return 0


def run_revisions(args: argparse.Namespace) -> int:
    db_name = resolve_database_name(args)
    database = get_database_by_name(db_name)
    if not database:
        raise RuntimeError(f"Database not found in workspace: {db_name}")

    revisions = request_json("GET", f"/api/v1/databases/{database['id']}/revisions")["data"]
    if not revisions:
        print(f"No revisions for {db_name}")
        return 0

    print(f"Revisions for {db_name}:")
    for revision in revisions:
        print(
            f"- {revision['id']}  {revision['created_at']}  "
            f"{revision['size_label']}  {revision['type']}"
        )
    return 0


def run_restore(args: argparse.Namespace) -> int:
    db_name = resolve_database_name(args)
    database = get_database_by_name(db_name)
    if not database:
        raise RuntimeError(f"Database not found in workspace: {db_name}")

    revision_id = args.rev
    if not revision_id:
        revisions = request_json("GET", f"/api/v1/databases/{database['id']}/revisions")["data"]
        if not revisions:
            raise RuntimeError(f"No revisions available for {db_name}")
        revision_id = revisions[0]["id"]

    output_path = Path(args.output) if args.output else Path(f"{db_name}.restored.db")
    content = request_bytes(
        "GET",
        f"/api/v1/databases/{database['id']}/revisions/{revision_id}/download",
        headers={"X-API-Key": required_api_key()},
    )
    output_path.write_bytes(content)
    print(f"Restored {db_name} revision {revision_id} to {output_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="lunchbox")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True, help="Command")

    # sync
    sync_p = subparsers.add_parser("sync", help="Sync database to Lunchbox")
    sync_p.add_argument("path", nargs="?", help="Path to SQLite DB (or use DATABASE_URL for Postgres)")
    sync_p.add_argument("--name", help="Override database name")
    sync_p.add_argument("--dry-run", action="store_true", help="Show what would upload")
    sync_p.add_argument("--env", help="Path to .env file")
    sync_p.add_argument("--schema", action="append", help="Postgres schema(s) to include")

    # revisions
    rev_p = subparsers.add_parser("revisions", help="List revisions for a database")
    rev_p.add_argument("path", nargs="?", help="Path to SQLite DB")
    rev_p.add_argument("--db", help="Database name (for Postgres)")

    # restore
    rest_p = subparsers.add_parser("restore", help="Restore a revision")
    rest_p.add_argument("path", nargs="?", help="Path to SQLite DB or database name")
    rest_p.add_argument("--db", help="Database name override")
    rest_p.add_argument("--output", help="Output file path")
    rest_p.add_argument("--rev", help="Revision ID")
    rest_p.add_argument("--in-place", action="store_true", help="Replace file in place")
    rest_p.add_argument("--target-db", help="Postgres target URL")
    rest_p.add_argument("--into-existing", action="store_true", help="Merge into existing DB")
    rest_p.add_argument("--schema-only", action="store_true", help="Restore schema only")
    rest_p.add_argument("--timestamp", help="Point-in-time recovery timestamp")

    args = parser.parse_args()

    try:
        if args.command == "sync":
            if args.dry_run:
                db_name = args.name or (Path(args.path).name if args.path else "<unknown>")
                print(f"[dry-run] would sync {db_name} to workspace {workspace_id()}")
                return 0
            return run_sync(args)
        if args.command == "revisions":
            return run_revisions(args)
        if args.command == "restore":
            if args.db and not args.path:
                args.path = args.db
            return run_restore(args)
    except RuntimeError as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
