#!/usr/bin/env bash
set -euo pipefail

SKIP_SEED=false
if [[ "${1:-}" == "--no-seed" ]]; then
  SKIP_SEED=true
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DB="$ROOT_DIR/../data/lunchbox.db"
API_BASE_URL="http://127.0.0.1:8000"
PROJECT_NAME="Lunchbox"
POSTGRES_SERVER="localhost"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="changethis"
POSTGRES_DB="lunchbox"
FIRST_SUPERUSER="test@example.com"
FIRST_SUPERUSER_PASSWORD="changethis"

export PROJECT_NAME
export POSTGRES_SERVER
export POSTGRES_USER
export POSTGRES_PASSWORD
export POSTGRES_DB
export FIRST_SUPERUSER
export FIRST_SUPERUSER_PASSWORD
export LUNCHBOX_DB_PATH="$DATA_DB"
export LUNCHBOX_SKIP_SEED="$SKIP_SEED"

cleanup() {
  if [[ -n "${UVICORN_PID:-}" ]] && kill -0 "$UVICORN_PID" 2>/dev/null; then
    echo "Stopping uvicorn server (PID: $UVICORN_PID)..."
    kill "$UVICORN_PID" >/dev/null 2>&1 || true
  fi

  if command -v lsof >/dev/null 2>&1; then
    PORT_PID="$(lsof -ti :8000 || true)"
    if [[ -n "$PORT_PID" ]]; then
      echo "Killing process on port 8000 (PID: $PORT_PID)..."
      kill "$PORT_PID" >/dev/null 2>&1 || true
    fi
  fi
}

trap cleanup EXIT

if command -v lsof >/dev/null 2>&1; then
  PORT_PID="$(lsof -ti :8000 || true)"
  if [[ -n "$PORT_PID" ]]; then
    echo "Port 8000 is already in use (PID: $PORT_PID). Killing it..."
    kill "$PORT_PID" >/dev/null 2>&1 || true
    sleep 1
  fi
fi

mkdir -p "$ROOT_DIR/../data"

echo "Starting Lunchbox backend server on $API_BASE_URL"
echo "Using database: $DATA_DB"
if [[ "$SKIP_SEED" == "true" ]]; then
  echo "Skipping seed data (clean database)"
fi
echo ""
echo "Environment variables:"
echo "  PROJECT_NAME=$PROJECT_NAME"
echo "  POSTGRES_SERVER=$POSTGRES_SERVER"
echo "  POSTGRES_DB=$POSTGRES_DB"
echo "  LUNCHBOX_SKIP_SEED=$SKIP_SEED"
echo ""

cd "$ROOT_DIR" && uv run uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload
