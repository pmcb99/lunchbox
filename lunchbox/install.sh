#!/usr/bin/env bash
# Install script for Lunchbox test environment: venv, dependencies, and local CLI.
# Run from anywhere; the script uses the directory it lives in.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
CLI_DIR="$REPO_ROOT/cli"

echo "Lunchbox test env: $SCRIPT_DIR"
echo "Repo root:         $REPO_ROOT"
echo ""

# Create venv if missing
if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV_DIR"
else
  echo "Using existing .venv"
fi

# Use venv pip/python
PIP="$VENV_DIR/bin/pip"
PYTHON="$VENV_DIR/bin/python3"

echo "Installing test dependencies..."
"$PIP" install -q -r requirements.txt

if [[ ! -d "$CLI_DIR" ]] || [[ ! -f "$CLI_DIR/pyproject.toml" ]]; then
  echo "Warning: CLI package not found at $CLI_DIR (no pyproject.toml). Skipping CLI install."
else
  echo "Installing local Lunchbox CLI..."
  if "$PIP" install -e "$CLI_DIR" 2>/dev/null; then
    echo "CLI installed in editable mode."
  else
    "$PIP" install "$CLI_DIR"
    echo "CLI installed (normal install)."
  fi
fi

echo ""
echo "Install done. Next steps:"
echo "  source \"$VENV_DIR/bin/activate\""
echo "  python3 test_lunchbox.py          # full test (needs LUNCHBOX_API_KEY in .env)"
echo "  python3 test_lunchbox.py --skip-cli   # DB create/teardown only"
echo ""
