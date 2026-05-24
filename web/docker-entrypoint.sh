#!/bin/sh
set -e

echo "[compass] running prisma migrate deploy..."
# Roda de dentro do workspace auto-contido ./migrate (node_modules + config + prisma juntos).
# Subshell pra não mudar o CWD do server depois. Tolera falha (idempotente entre deploys).
if (cd ./migrate && node ./node_modules/prisma/build/index.js migrate deploy 2>&1); then
  echo "[compass] migrations applied (or already up to date)"
else
  echo "[compass] WARN: migrate deploy failed (exit $?) — continuing to start server"
fi

echo "[compass] starting Next.js server on port ${PORT:-3000}..."
exec node server.js
