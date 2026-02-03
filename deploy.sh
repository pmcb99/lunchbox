#!/bin/bash
set -e

# Deploy on VPS: SSH in, pull latest, build app, restart.
# Run from repo root. Requires SSH access to admin@37.27.26.44.

SERVER="37.27.26.44"
USER="admin"
REPO_DIR="~/lunchbox"
BRANCH="main"
APP_DIR="frontend"

# Optional: set to restart the app after build (e.g. "pm2 restart golf-hero" or "systemctl restart book-app")
# If unset, script only pulls and builds; you restart the app manually or via another process.
RESTART_CMD="${RESTART_CMD:-}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== VPS deploy: pull, build, restart ===${NC}"
echo ""

REMOTE_SCRIPT="set -e
  echo '--- Pulling latest from origin/$BRANCH ---'
  cd $REPO_DIR && git fetch origin && git checkout $BRANCH && git pull origin $BRANCH
  echo ''
  echo '--- Installing dependencies ---'
  cd $REPO_DIR/$APP_DIR && npm ci
  echo ''
  echo '--- Building ---'
  npm run build
  echo ''
  echo '--- Build complete ---'
"

if [ -n "$RESTART_CMD" ]; then
  REMOTE_SCRIPT="$REMOTE_SCRIPT
  echo '--- Restarting app ---'
  $RESTART_CMD
  echo ''
  echo '--- Restart done ---'
"
else
  REMOTE_SCRIPT="$REMOTE_SCRIPT
  echo 'No RESTART_CMD set. Restart the app manually if needed (e.g. pm2 restart golf-hero).'
"
fi

ssh "$USER@$SERVER" "bash -s" <<< "$REMOTE_SCRIPT"

echo ""
echo -e "${GREEN}=== VPS deploy complete ===${NC}"
