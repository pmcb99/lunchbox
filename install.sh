#!/usr/bin/env bash
set -euo pipefail

REPO="pmcb99/lunchbox"
BINARY="lunchbox"
INSTALL_DIR="${LUNCHBOX_INSTALL_DIR:-/usr/local/bin}"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "  ${BOLD}$*${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET} $*"; }
fail()  { echo -e "  ${RED}✗${RESET} $*" >&2; exit 1; }

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin) OS="darwin" ;;
  Linux)  OS="linux" ;;
  *)      fail "Unsupported OS: $OS" ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)        ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)             fail "Unsupported architecture: $ARCH" ;;
esac

# Resolve version
if [ -z "${LUNCHBOX_VERSION:-}" ]; then
  info "Fetching latest release..."
  VERSION="$(curl -sSf "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' \
    | cut -d'"' -f4)"
else
  VERSION="$LUNCHBOX_VERSION"
fi

[ -z "$VERSION" ] && fail "Could not determine latest version. Set LUNCHBOX_VERSION to install a specific version."

FILENAME="${BINARY}-${OS}-${ARCH}"
URL="https://github.com/${REPO}/releases/download/${VERSION}/${FILENAME}"
TMP="$(mktemp)"

info "Installing lunchbox ${VERSION} (${OS}/${ARCH})..."
curl -sSfL "$URL" -o "$TMP" || fail "Download failed. Check https://github.com/${REPO}/releases for available versions."
chmod +x "$TMP"

# Install — try without sudo first, fall back if needed
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP" "${INSTALL_DIR}/${BINARY}"
else
  info "Writing to ${INSTALL_DIR} requires sudo..."
  sudo mv "$TMP" "${INSTALL_DIR}/${BINARY}"
fi

ok "lunchbox ${VERSION} installed to ${INSTALL_DIR}/${BINARY}"
echo ""
echo "  Get started:"
echo "    lunchbox login --api-key <your-api-key>"
echo "    lunchbox sync ~/mydb.sqlite"
echo ""
