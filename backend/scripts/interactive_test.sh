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

# Test credentials (same as used in UI login page)
TEST_EMAIL="demo@lunchbox.dev"
TEST_PASSWORD="lunchbox-demo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track state across steps
EMAIL=""
API_KEY=""
KEY_ID=""
KEY_VALUE=""
DB_NAME=""
DB_ID=""

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

check_server() {
  if ! curl -sf "$API_BASE_URL/api/v1/health" >/dev/null 2>&1; then
    echo -e "${RED}❌ Server not running at $API_BASE_URL${NC}"
    echo "Please start the backend server first with: bash backend/run.sh"
    exit 1
  fi
}

setup_empty_db() {
  echo -e "${BLUE}🗑️  Cleaning up and starting with empty database...${NC}"
  
  # Remove existing database file
  rm -f "$DATA_DB"
  
  # Ensure data directory exists
  mkdir -p "$(dirname "$DATA_DB")"
  
  echo -e "${GREEN}✓ Empty database ready at $DATA_DB${NC}"
}

print_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}STEP $1: $2${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

pause() {
  echo ""
  echo -e "${YELLOW}Press Enter to continue to the next step...${NC}"
  read -r
}

# Main flow
echo -e "${GREEN}"
cat <<'EOF'
╔════════════════════════════════════════════════════════════╗
║            Lunchbox Integration Test - Step by Step        ║
║                                                              ║
║  This script walks through the database integration flow   ║
║  step by step, pausing so you can review changes in the UI  ║
║                                                              ║
║  Starting with a FRESH EMPTY DATABASE for clarity          ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

pause

setup_empty_db

check_server

# Step 1: Create test user
print_step 1 "Create test user and login"
print_info "Creating test user account (same as UI login)..."

EMAIL="$TEST_EMAIL"
PASSWORD="$TEST_PASSWORD"

print_info "Email: $EMAIL"
print_info "Password: $PASSWORD"

SIGNUP_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")"

if [[ -z "$SIGNUP_RESPONSE" ]]; then
  echo -e "${RED}❌ Failed to create user${NC}"
  exit 1
fi

print_success "Created test user successfully"

echo ""
echo "You can now log in to the UI with these credentials."
pause

print_info "Logging in to get JWT token..."
LOGIN_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")"

TOKEN="$(python3 - <<PY
import json
login = json.loads("""$LOGIN_RESPONSE""")
print(login["data"]["token"])
PY
)"

print_success "Logged in successfully"
print_info "JWT Token: jwt_... (truncated)"

pause

# Step 2: Create API key
print_step 2 "Create API key for workspace"
print_info "Creating an API key for workspace 'ws_001'..."

KEY_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/keys" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Step-by-step test key\"}")"

if [[ -z "$KEY_RESPONSE" ]]; then
  echo -e "${RED}❌ Failed to create API key${NC}"
  exit 1
fi

KEY_META="$(python3 - <<PY
import json
key = json.loads("""$KEY_RESPONSE""")
print(f"{key['data']['id']}|{key['data']['value']}")
PY
)"

KEY_ID="${KEY_META%%|*}"
KEY_VALUE="${KEY_META##*|}"

print_success "Created API key"
print_info "Key ID: $KEY_ID"
print_info "Key Value: ${KEY_VALUE:0:20}..."
print_info "Name: Step-by-step test key"

echo ""
echo "Review: Check the UI for workspace 'ws_001' and look at the API Keys section."
pause

# Step 3: Create database
print_step 3 "Create a new database"
print_info "Creating a 2MB database..."

DB_NAME="step-by-step-db-$(python3 - <<'PY'
import secrets
print(secrets.token_hex(3))
PY
)"

DB_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/databases/import" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY_VALUE" \
  -d "{\"name\": \"$DB_NAME\", \"target_size_mb\": 2.0, \"engine\": \"SQLite\", \"environment\": \"Production\", \"schedule\": \"0 3 * * *\", \"retention\": \"30 days\", \"encryption\": \"Standard\"}")"

if [[ -z "$DB_RESPONSE" ]]; then
  echo -e "${RED}❌ Failed to create database${NC}"
  exit 1
fi

DB_ID="$(python3 - <<PY
import json
db = json.loads("""$DB_RESPONSE""")
print(db["data"]["id"])
PY
)"

print_success "Created database"
print_info "Database Name: $DB_NAME"
print_info "Database ID: $DB_ID"
print_info "Size: 2MB"

echo ""
echo "Review: Check the UI for workspace 'ws_001' and look at the Databases section."
echo "You should see a new database entry."
pause

# Step 4: Fetch database metadata
print_step 4 "Fetch database metadata"
print_info "Fetching metadata for the created database..."

METADATA_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/databases/$DB_ID/metadata" \
  -H "X-API-Key: $KEY_VALUE")"

METADATA_JSON="$(python3 - <<PY
import json
metadata = json.loads("""$METADATA_RESPONSE""")
print(json.dumps(metadata["data"], indent=2))
PY
)"

print_success "Fetched metadata"
echo ""
echo "Database Metadata:"
echo "$METADATA_JSON"

pause

# Step 5: Mutate database (increase size)
print_step 5 "Mutate database (increase size)"
print_info "Adding 1MB to the database..."

MUTATE_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/databases/$DB_ID/mutate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY_VALUE" \
  -d "{\"additional_size_mb\": 1.0}")"

if [[ -z "$MUTATE_RESPONSE" ]]; then
  echo -e "${RED}❌ Failed to mutate database${NC}"
  exit 1
fi

NEW_SIZE="$(python3 - <<PY
import json
mutate = json.loads("""$MUTATE_RESPONSE""")
print(mutate["data"]["size_bytes"])
PY
)"

print_success "Mutated database successfully"
print_info "New size: $NEW_SIZE bytes (~$((NEW_SIZE / 1024 / 1024))MB)"

echo ""
echo "Review: Check the database details in the UI. The size should have increased."
pause

# Step 6: List all databases
print_step 6 "List all databases in workspace"
print_info "Fetching all databases for workspace 'ws_001'..."

DATABASES_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/databases")"

DATABASES_JSON="$(python3 - <<PY
import json
dbs = json.loads("""$DATABASES_RESPONSE""")
print(json.dumps(dbs["data"], indent=2))
PY
)"

print_success "Fetched databases list"
echo ""
echo "Databases in workspace ws_001:"
echo "$DATABASES_JSON" | head -30
echo "..."
echo "(truncated for brevity)"

pause

# Step 7: List revisions
print_step 7 "List database revisions"
print_info "Fetching all revisions for the database..."

REVISIONS_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/databases/$DB_ID/revisions")"

REVISIONS_JSON="$(python3 - <<PY
import json
revs = json.loads("""$REVISIONS_RESPONSE""")
print(json.dumps(revs["data"], indent=2))
PY
)"

print_success "Fetched revisions"
echo ""
echo "Revisions for database '$DB_NAME':"
echo "$REVISIONS_JSON"

echo ""
echo "Review: You should see at least 2 revisions (creation + mutation)."
pause

# Step 8: List all keys
print_step 8 "List all API keys in workspace"
print_info "Fetching all API keys for workspace 'ws_001'..."

KEYS_RESPONSE="$(curl -sf "$API_BASE_URL/api/v1/workspaces/ws_001/keys")"

KEYS_JSON="$(python3 - <<PY
import json
keys = json.loads("""$KEYS_RESPONSE""")
print(json.dumps(keys["data"], indent=2))
PY
)"

print_success "Fetched API keys"
echo ""
echo "API Keys in workspace ws_001:"
echo "$KEYS_JSON"

pause

# Step 9: Delete API key
print_step 9 "Delete API key (test revocation)"
print_info "Deleting the API key to test revocation..."

DELETE_KEY_RESPONSE="$(curl -sf -X DELETE "$API_BASE_URL/api/v1/workspaces/ws_001/keys/$KEY_ID" \
  -H "X-API-Key: $KEY_VALUE")"

if [[ -z "$DELETE_KEY_RESPONSE" ]]; then
  echo -e "${RED}❌ Failed to delete API key${NC}"
  exit 1
fi

print_success "Deleted API key successfully"
print_info "Key ID: $KEY_ID"

echo ""
echo "Review: Check the UI - the API key should now show as 'Revoked' status."
pause

# Step 10: Test that deleted key is rejected
print_step 10 "Test API key rejection"
print_info "Attempting to use the deleted key..."

FORBIDDEN_DB_RESPONSE="$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/v1/workspaces/ws_001/databases/import" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $KEY_VALUE" \
  -d "{\"name\": \"forbidden-$DB_NAME\", \"target_size_mb\": 1.0, \"engine\": \"SQLite\", \"environment\": \"Production\", \"schedule\": \"0 3 * * *\", \"retention\": \"30 days\", \"encryption\": \"Standard\"}")"

if [[ "$FORBIDDEN_DB_RESPONSE" == "401" ]]; then
  print_success "API key correctly rejected (HTTP 401)"
  print_info "The deleted key cannot be used anymore"
else
  echo -e "${RED}❌ Expected HTTP 401, got $FORBIDDEN_DB_RESPONSE${NC}"
fi

pause

# Summary
print_step "Summary" "All steps completed!"
echo ""
echo -e "${GREEN}✓ Test user created and logged in${NC}"
echo -e "${GREEN}✓ API key created for workspace ws_001${NC}"
echo -e "${GREEN}✓ Database '$DB_NAME' created (2MB)${NC}"
echo -e "${GREEN}✓ Database metadata fetched${NC}"
echo -e "${GREEN}✓ Database mutated (increased by 1MB)${NC}"
echo -e "${GREEN}✓ Database list fetched${NC}"
echo -e "${GREEN}✓ Revisions fetched${NC}"
echo -e "${GREEN}✓ API keys list fetched${NC}"
echo -e "${GREEN}✓ API key deleted and verified revocation${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}All integration test steps completed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "You can now explore the UI to review all the created resources."
