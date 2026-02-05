#!/bin/bash
set -e
# SSH into the VPS and run the HTTPS setup. Run from repo root.
# Usage: CERTBOT_EMAIL=you@example.com ./scripts/setup-https-remote.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SETUP_SCRIPT="$REPO_ROOT/scripts/setup-https.sh"

SERVER="${SERVER:-37.27.26.44}"
# Use VPS_USER so we don't pick up your local $USER (e.g. paulmcbrien)
VPS_USER="${VPS_USER:-admin}"
REPO_DIR="${REPO_DIR:-/home/admin/lunchbox}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "CERTBOT_EMAIL is required for Let's Encrypt (e.g. CERTBOT_EMAIL=you@shovelstone.com)."
  exit 1
fi

if [ ! -f "$SETUP_SCRIPT" ]; then
  echo "Setup script not found: $SETUP_SCRIPT"
  exit 1
fi

echo "Running HTTPS setup on $VPS_USER@$SERVER (domain: lunchbox.shovelstone.com)..."
ssh "$VPS_USER@$SERVER" "sudo REPO_DIR=$REPO_DIR CERTBOT_EMAIL=$CERTBOT_EMAIL bash -s" < "$SETUP_SCRIPT"
echo "Done."
