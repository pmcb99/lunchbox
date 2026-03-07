#!/usr/bin/env bash
set -euo pipefail

export LUNCHBOX_SKIP_SEED=true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DB="$ROOT_DIR/../data/lunchbox.db"
API_BASE_URL="http://127.0.0.1:8000"
PROJECT_NAME="Lunchbox"
POSTGRES_SERVER="localhost"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="changethis"
POSTGRES_DB="lunchbox"
FIRST_SUPERUSER="test@example.com"
FIRST_SUPERUSER_PASSWORD="changethis"

cleanup() {
  if [[ -n "${UVICORN_PID:-}" ]] && kill -0 "$UVICORN_PID" 2>/dev/null; then
    kill "$UVICORN_PID" >/dev/null 2>&1 || true
  fi

  if command -v lsof >/dev/null 2>&1; then
    PORT_PID="$(lsof -ti :8000 || true)"
    if [[ -n "$PORT_PID" ]]; then
      kill "$PORT_PID" >/dev/null 2>&1 || true
    fi
  fi

  rm -f "$DATA_DB"
}

trap cleanup EXIT

echo "[1/10] Cleaning up port 8000 and old database..."
if command -v lsof >/dev/null 2>&1; then
  PORT_PID="$(lsof -ti :8000 || true)"
  if [[ -n "$PORT_PID" ]]; then
    kill "$PORT_PID" >/dev/null 2>&1 || true
  fi
fi

rm -f "$DATA_DB"

echo "[2/10] Starting uvicorn server on port 8000..."
PROJECT_NAME="$PROJECT_NAME" \
POSTGRES_SERVER="$POSTGRES_SERVER" \
POSTGRES_USER="$POSTGRES_USER" \
POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
POSTGRES_DB="$POSTGRES_DB" \
FIRST_SUPERUSER="$FIRST_SUPERUSER" \
FIRST_SUPERUSER_PASSWORD="$FIRST_SUPERUSER_PASSWORD" \
LUNCHBOX_DB_PATH="$DATA_DB" \
"$ROOT_DIR/.venv/bin/uvicorn" app.main:app --port 8000 >/dev/null 2>&1 &
UVICORN_PID=$!

echo "[3/10] Waiting for server to be ready..."
for _ in $(seq 1 50); do
  if curl -sf "$API_BASE_URL/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

EMAIL="test_$(python3 - <<'PY'
import secrets
print(secrets.token_hex(3))
PY
)@example.com"

echo "[4/10] Creating test user: $EMAIL"
SIGNUP_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"test-password\"}")"

echo "[5/10] Logging in as test user"
LOGIN_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"test-password\"}")"

echo "[6/10] Creating API key for workspace ws_001"
KEY_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/keys" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Integration test key\"}")"

DB_NAME="integration-db-$(python3 - <<'PY'
import secrets
print(secrets.token_hex(3))
PY
)"

KEY_META="$(python3 - <<PY
import json

key = json.loads("""$KEY_RESPONSE""")
print(f"{key['data']['id']}|{key['data']['value']}")
PY
)"

KEY_ID="${KEY_META%%|*}"
KEY_VALUE="${KEY_META##*|}"

echo "[7/10] Creating database '$DB_NAME' (2MB)"
DB_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/databases/import" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY_VALUE" \
  -d "{\"name\": \"$DB_NAME\", \"target_size_mb\": 2.0, \"engine\": \"SQLite\", \"environment\": \"Production\", \"schedule\": \"0 3 * * *\", \"retention\": \"30 days\", \"encryption\": \"Standard\"}")"

DB_ID="$(python3 - <<PY
import json

db = json.loads("""$DB_RESPONSE""")
print(db["data"]["id"])
PY
)"

echo "[8/10] Fetching database metadata"
METADATA_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/databases/$DB_ID/metadata" \
  -H "X-API-Key: $KEY_VALUE")"

echo "[9/10] Mutating database (adding 1MB)"
MUTATE_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/databases/$DB_ID/mutate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY_VALUE" \
  -d "{\"additional_size_mb\": 1.0}")"

echo "[10/10] Fetching workspace data (databases, revisions, keys)"
DATABASES_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/databases")"
REVISIONS_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/revisions")"
KEYS_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/keys")"

echo "Verifying: Deleting API key to test revocation"
DELETE_KEY_RESPONSE="$(curl -sf -X DELETE "$API_BASE_URL/api/v1/workspaces/ws_001/keys/$KEY_ID" \
  -H "X-API-Key: $KEY_VALUE")"

echo "Verifying: Testing API key rejection after revocation"
FORBIDDEN_DB_RESPONSE="$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/v1/workspaces/ws_001/databases/import" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY_VALUE" \
  -d "{\"name\": \"forbidden-$DB_NAME\", \"target_size_mb\": 1.0, \"engine\": \"SQLite\", \"environment\": \"Production\", \"schedule\": \"0 3 * * *\", \"retention\": \"30 days\", \"encryption\": \"Standard\"}\")"

python3 - <<PY
import json

signup = json.loads("""$SIGNUP_RESPONSE""")
login = json.loads("""$LOGIN_RESPONSE""")
key = json.loads("""$KEY_RESPONSE""")
db = json.loads("""$DB_RESPONSE""")
metadata = json.loads("""$METADATA_RESPONSE""")
mutate = json.loads("""$MUTATE_RESPONSE""")
databases = json.loads("""$DATABASES_RESPONSE""")["data"]
revisions = json.loads("""$REVISIONS_RESPONSE""")["data"]
keys = json.loads("""$KEYS_RESPONSE""")["data"]
delete_key = json.loads("""$DELETE_KEY_RESPONSE""")

assert signup["data"]["email"] == "$EMAIL"
assert signup["data"]["token"].startswith("jwt_")
assert login["data"]["email"] == "$EMAIL"
assert login["data"]["token"].startswith("jwt_")
assert key["data"]["name"] == "Integration test key"
assert db["data"]["name"] == "$DB_NAME"
assert db["data"]["size_bytes"] >= 2 * 1024 * 1024
assert metadata["data"]["size_bytes"] >= 2 * 1024 * 1024
assert metadata["data"]["checksum"]
assert mutate["data"]["size_bytes"] > metadata["data"]["size_bytes"]
assert any(item["name"] == "$DB_NAME" for item in databases)
assert len([rev for rev in revisions if rev["database_id"] == db["data"]["id"]]) >= 2
assert any(item["name"] == "Integration test key" for item in keys)
assert delete_key["data"]["status"] == "Revoked"
assert "$FORBIDDEN_DB_RESPONSE" == "401"
PY

echo "All assertions passed!"
echo ""
echo "Running pytest integration tests..."

cd "$ROOT_DIR" && \
PROJECT_NAME="$PROJECT_NAME" \
POSTGRES_SERVER="$POSTGRES_SERVER" \
POSTGRES_USER="$POSTGRES_USER" \
POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
POSTGRES_DB="$POSTGRES_DB" \
FIRST_SUPERUSER="$FIRST_SUPERUSER" \
FIRST_SUPERUSER_PASSWORD="$FIRST_SUPERUSER_PASSWORD" \
API_BASE_URL="$API_BASE_URL" \
"$ROOT_DIR/.venv/bin/pytest" -q --confcutdir=tests/integration tests/integration/test_lunchbox_flow.py
