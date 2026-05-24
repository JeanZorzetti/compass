#!/bin/sh
set -e

echo "[compass] running prisma migrate deploy..."
# Usa o CLI isolado em ./prisma-cli. Se falhar, loga mas não derruba o boot
# (o app pode subir mesmo se a migration já foi aplicada por outro deploy).
if node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy; then
  echo "[compass] migrations applied (or already up to date)"
else
  echo "[compass] WARN: migrate deploy failed — continuing to start server"
fi

echo "[compass] starting Next.js server on port ${PORT:-3000}..."
exec node server.js
