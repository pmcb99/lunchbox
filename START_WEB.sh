#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-go"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
BACKEND_ADDR="${BACKEND_ADDR:-127.0.0.1:8000}"
BACKEND_DB_PATH="${BACKEND_DB_PATH:-$ROOT_DIR/data/lunchbox.db}"
SKIP_SEED_ARG=""

if [[ "${1:-}" == "--no-seed" ]]; then
  SKIP_SEED_ARG="--no-seed"
fi

frontend_command() {
  if command -v npm >/dev/null 2>&1; then
    npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT"
    return
  fi

  if command -v bun >/dev/null 2>&1; then
    bun run dev --host 127.0.0.1 --port "$FRONTEND_PORT"
    return
  fi

  echo "Neither npm nor bun is available for the frontend." >&2
  exit 1
}

cleanup() {
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Stopping frontend dev server (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Stopping backend server launcher (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

  wait "${FRONTEND_PID:-}" 2>/dev/null || true
  wait "${BACKEND_PID:-}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting backend via $BACKEND_DIR $SKIP_SEED_ARG"
mkdir -p "$ROOT_DIR/data"
if [[ "$SKIP_SEED_ARG" == "--no-seed" ]]; then
  export LUNCHBOX_SKIP_SEED=true
else
  unset LUNCHBOX_SKIP_SEED || true
fi
export LUNCHBOX_ADDR="$BACKEND_ADDR"
export LUNCHBOX_DB_PATH="$BACKEND_DB_PATH"
(
  cd "$BACKEND_DIR"
  go run ./cmd/server
) &
BACKEND_PID=$!

echo "Waiting for backend health check at $BACKEND_URL/api/v1/health"
for _ in $(seq 1 50); do
  if curl -sf "$BACKEND_URL/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl -sf "$BACKEND_URL/api/v1/health" >/dev/null 2>&1; then
  echo "Backend did not become ready at $BACKEND_URL" >&2
  exit 1
fi

echo "Starting frontend on http://127.0.0.1:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  frontend_command
) &
FRONTEND_PID=$!

echo "Lunchbox web stack is up."
echo "Backend:  $BACKEND_URL"
echo "Frontend: http://127.0.0.1:$FRONTEND_PORT"

wait "$FRONTEND_PID"
