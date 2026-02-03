# Lunchbox test package

Test script for the [Lunchbox](https://lunchbox.dev) CLI: creates a SQLite DB, runs sync/revisions/restore, then cleans up.

## Setup

**Option 1 — install script (recommended)**

```bash
cd lunchbox/lunchbox
./install.sh
source .venv/bin/activate
```

**Option 2 — manual**

Create and activate the virtual environment (from this folder):

```bash
# Create venv (already done if .venv exists)
python3 -m venv .venv

# Activate it (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Install the Lunchbox CLI from this repo (it is not on PyPI). The CLI lives at **`cli/`** (repo root, sibling to `lunchbox/` and `src/`). With the venv activated:

```bash
# From repo root — editable (recommended if you change CLI code)
pip install -e ./cli

# From this folder (lunchbox/lunchbox/) — regular install (works with older pip)
pip install ../../cli
```

If `pip install -e ./cli` fails (e.g. on older pip), use a normal install: `pip install /path/to/lunchbox/cli`. Then run `lunchbox --version` to confirm.

Configure Lunchbox (required for sync/restore):

- Copy `env_example` to `.env` and set `LUNCHBOX_API_KEY=lbk_live_xxx`

## Run tests

From this folder (`lunchbox/lunchbox`), with venv activated:

```bash
# Full test (requires Lunchbox CLI installed)
python3 test_lunchbox.py

# If the Lunchbox CLI is not installed yet: run only DB create + teardown
python3 test_lunchbox.py --skip-cli

# Verbose output
python3 test_lunchbox.py --verbose

# Keep test DB files after run
python3 test_lunchbox.py --no-cleanup
```

For the full test (sync, revisions, restore), the **Lunchbox CLI** must be installed in this venv (e.g. `pip install -e /path/to/lunchbox-cli`) and `LUNCHBOX_API_KEY` set in `.env` (copy from `env_example`).

## Options

- `--verbose` / `-v` — more logging
- `--skip-cli` — only create DB and tear down; skip sync/restore (use when CLI is not installed)
- `--db-path PATH` — SQLite file path (default: `test_users.db`)
- `--no-cleanup` — do not delete test DBs and restored file when done
- `--db-type sqlite|postgresql` — database to test (default: sqlite)
