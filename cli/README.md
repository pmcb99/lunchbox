# Lunchbox CLI

CLI for Lunchbox (database version control). Install from this directory:

```bash
# From repo root
pip install -e ./cli
# or (if editable fails) normal install:
pip install ./cli

# From lunchbox/lunchbox with venv activated
pip install ../../cli
```

Then ensure `LUNCHBOX_API_KEY` is set (e.g. in `.env`) and run:

- `lunchbox --version`
- `lunchbox sync ./path/to/db.db`
- `lunchbox revisions ./path/to/db.db`
- `lunchbox restore ./path/to/db.db --output restored.db`

This package is a stub; replace the logic in `lunchbox_cli/main.py` with real API calls when the backend is available.
