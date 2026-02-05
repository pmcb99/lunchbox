# Deploy and HTTPS scripts

## First-time VPS setup

1. **Clone the repo on the VPS** (if not already):
   ```bash
   ssh admin@37.27.26.44
   git clone https://github.com/YOUR_ORG/lunchbox.git ~/lunchbox
   ```
   (Or set `REPO_DIR` when deploying / running scripts if you use a different path.)

2. **Deploy** (from your machine, repo root):
   ```bash
   ./deploy.sh
   ```
   This pulls latest, runs `npm ci` and `npm run build` in `frontend/`.

3. **HTTPS for lunchbox.shovelstone.com** (run once; script SSHs in and runs setup on the VPS):
   - Ensure DNS for `lunchbox.shovelstone.com` points to the VPS IP.
   - From repo root:
     ```bash
     CERTBOT_EMAIL=you@example.com ./scripts/setup-https-remote.sh
     ```
   This installs Nginx (if needed), configures the site to serve `frontend/dist`, and obtains a Let's Encrypt certificate with HTTP→HTTPS redirect.

After that, redeploy with `./deploy.sh` whenever you want to publish changes; Nginx will serve the updated files from `frontend/dist`.
