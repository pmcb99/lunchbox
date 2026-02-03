"""Lunchbox CLI entry point."""

import argparse
import sys

from . import __version__


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
    rest_p.add_argument("--output", help="Output file path")
    rest_p.add_argument("--rev", help="Revision ID")
    rest_p.add_argument("--in-place", action="store_true", help="Replace file in place")
    rest_p.add_argument("--target-db", help="Postgres target URL")
    rest_p.add_argument("--into-existing", action="store_true", help="Merge into existing DB")
    rest_p.add_argument("--schema-only", action="store_true", help="Restore schema only")
    rest_p.add_argument("--timestamp", help="Point-in-time recovery timestamp")

    args = parser.parse_args()

    if args.command == "sync":
        # Stub: real implementation would call API
        print("lunchbox sync: stub (set LUNCHBOX_API_KEY and implement upload)", file=sys.stderr)
        return 0 if args.dry_run else 1
    if args.command == "revisions":
        print("lunchbox revisions: stub (implement list-revisions API)", file=sys.stderr)
        return 1
    if args.command == "restore":
        print("lunchbox restore: stub (implement download API)", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
