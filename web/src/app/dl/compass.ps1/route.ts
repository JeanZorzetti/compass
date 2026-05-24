import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const VERSION = "v0.4.0";
const REPO = "JeanZorzetti/compass";

const SCRIPT = `# Compass daemon installer (Windows)
# Usage: irm https://compass.polarisia.com.br/dl/compass.ps1 | iex

$ErrorActionPreference = "Stop"
$version = "${VERSION}"
$repo = "${REPO}"

$binary = "compass-windows-amd64.exe"
$url = "https://github.com/$repo/releases/download/$version/$binary"

# Destino: %LOCALAPPDATA%\\Compass\\compass.exe
$destDir = Join-Path $env:LOCALAPPDATA "Compass"
$dest = Join-Path $destDir "compass.exe"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Downloading Compass (windows/amd64)..."
Invoke-WebRequest -Uri $url -OutFile $dest

# Adiciona ao PATH do usuário se ainda não estiver
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$destDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$destDir", "User")
  Write-Host "Added $destDir to your PATH (restart your terminal to use 'compass')."
}

Write-Host ""
Write-Host "Compass installed: $dest" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Copy your token from https://compass.polarisia.com.br/dashboard"
Write-Host "  2. Set COMPASS_TOKEN and COMPASS_API env vars (see dashboard)"
Write-Host "  3. compass --watch"
`;

export function GET() {
  return new NextResponse(SCRIPT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
