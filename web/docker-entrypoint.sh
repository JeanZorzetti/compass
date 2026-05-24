#!/bin/sh
set -e

echo "[compass] running prisma migrate deploy..."
# Usa o CLI isolado em ./prisma-cli. Se falhar, loga o erro completo mas não
# derruba o boot (o app pode subir mesmo se a migration já foi aplicada).
if node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy 2>&1; then
  echo "[compass] migrations applied (or already up to date)"
else
  echo "[compass] WARN: migrate deploy failed (exit $?) — continuing to start server"
fi

echo "[compass] starting Next.js server on port ${PORT:-3000}..."
exec node server.js
