# Lunchbox

Database version control for teams.

## Repository layout

- **`frontend/`** – Vite + React + TypeScript app (landing, docs, UI).  
  Run from repo root: `cd frontend && npm install && npm run dev`

- **`lunchbox/`** – Python package (tests, tooling, env).  
  Install in a venv: `cd lunchbox && pip install -e .`  
  Run tests: `pytest` (from `lunchbox/` or with `python -m pytest lunchbox`).

- **`cli/`** – Lunchbox CLI (separate installable).  
  See `cli/README.md`.

## Deploy

From repo root: `./deploy.sh`  
Builds the app from `frontend/` on the VPS. First time: clone the repo on the VPS to `~/lunchbox` (see `scripts/README.md`).

**HTTPS (lunchbox.shovelstone.com):** run `CERTBOT_EMAIL=you@example.com ./scripts/setup-https-remote.sh` once (it SSHs in and runs Nginx + Let's Encrypt). Full steps in `scripts/README.md`.
