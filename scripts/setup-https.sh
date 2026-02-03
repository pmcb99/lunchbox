#!/bin/bash
set -e
# Run on the VPS to set up Nginx + Let's Encrypt HTTPS for lunchbox.shovelstone.com.
# Usage: copy to VPS and run as root, or: ssh admin@37.27.26.44 'sudo bash -s' < scripts/setup-https.sh
# Ensure DNS for lunchbox.shovelstone.com points to this server before running.
# Set CERTBOT_EMAIL (e.g. admin@shovelstone.com) for Let's Encrypt; otherwise certbot will prompt.

DOMAIN="lunchbox.shovelstone.com"
REPO_DIR="${REPO_DIR:-/home/admin/lunchbox}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
ROOT="$REPO_DIR/frontend/dist"

echo "=== HTTPS setup for $DOMAIN ==="
echo "Serving static files from: $ROOT"
echo ""

# Install nginx and certbot if missing (Debian/Ubuntu)
if ! command -v nginx &>/dev/null; then
  apt-get update
  apt-get install -y nginx
fi
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx
fi

# Nginx server block (HTTP first for certbot challenge, then we get cert and enable HTTPS)
CONF="/etc/nginx/sites-available/lunchbox"
mkdir -p "$(dirname "$CONF")"

cat > "$CONF" << EOF
# Lunchbox frontend – HTTP (Certbot will add HTTPS)
server {
    listen 80;
    server_name $DOMAIN;
    root $ROOT;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf "$CONF" /etc/nginx/sites-enabled/lunchbox 2>/dev/null || true
# Remove default site if it conflicts
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl reload nginx

echo "Obtaining SSL certificate for $DOMAIN (Let's Encrypt)..."
EXTRA_CERTBOT=""
if [ -n "$CERTBOT_EMAIL" ]; then
  EXTRA_CERTBOT="--email $CERTBOT_EMAIL"
fi
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect $EXTRA_CERTBOT

echo ""
echo "=== HTTPS setup complete ==="
echo "Site should be live at https://$DOMAIN"
echo "Certbot will auto-renew. Test: sudo certbot renew --dry-run"
