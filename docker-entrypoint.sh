#!/bin/sh
# Container entrypoint: bring the database up to date, then start the server.
set -e

# Cloud mode manages its schema elsewhere (the deploy pipeline runs
# `prisma migrate deploy`), so only self-host migrates on boot. A fresh volume
# therefore works on the very first `docker compose up`.
if [ "${DEPLOYMENT_MODE:-cloud}" = "selfhost" ]; then
  echo "[cairn] applying database migrations"
  node ./node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"
