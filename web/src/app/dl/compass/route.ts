import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const VERSION = "v0.4.0";
const REPO = "JeanZorzetti/compass";

const SCRIPT = `#!/bin/sh
# Compass daemon installer (Mac / Linux)
# Usage: curl -L https://compass.polarisia.com.br/dl/compass | bash
set -e

VERSION="${VERSION}"
REPO="${REPO}"

# Detecta OS
OS="$(uname -s)"
case "$OS" in
  Linux*)  os="linux" ;;
  Darwin*) os="darwin" ;;
  *) echo "Unsupported OS: $OS (Windows? use the PowerShell installer)"; exit 1 ;;
esac

# Detecta arquitetura
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) arch="amd64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

BINARY="compass-\${os}-\${arch}"
URL="https://github.com/\${REPO}/releases/download/\${VERSION}/\${BINARY}"

echo "Downloading Compass (\${os}/\${arch})..."
TMP="$(mktemp)"
curl -fL "$URL" -o "$TMP"
chmod +x "$TMP"

# Destino: tenta /usr/local/bin, cai pra ~/.local/bin se sem permissão
DEST="/usr/local/bin/compass"
if [ -w "/usr/local/bin" ] 2>/dev/null; then
  mv "$TMP" "$DEST"
elif command -v sudo >/dev/null 2>&1; then
  echo "Installing to $DEST (needs sudo)..."
  sudo mv "$TMP" "$DEST"
else
  mkdir -p "$HOME/.local/bin"
  DEST="$HOME/.local/bin/compass"
  mv "$TMP" "$DEST"
  echo "Installed to $DEST"
  echo "Make sure $HOME/.local/bin is in your PATH."
fi

echo ""
echo "✓ Compass installed: $DEST"
echo ""
echo "Next steps:"
echo "  1. Copy your token from https://compass.polarisia.com.br/dashboard"
echo "  2. export COMPASS_TOKEN=<your token>"
echo "  3. export COMPASS_API=https://compass.polarisia.com.br"
echo "  4. compass --watch"
`;

export function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
