#!/usr/bin/env bash
#
# Cairn update helper — pull new image, recreate app container, keep DB.
# Run from the app directory (or set CAIRN_DIR).
#
# Usage:
#   scripts/update-cairn.sh
#   CAIRN_DIR=/opt/cairn scripts/update-cairn.sh
#
set -euo pipefail

CAIRN_DIR="${CAIRN_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="$CAIRN_DIR/docker-compose.selfhost.yml"
ENV_FILE="$CAIRN_DIR/.env"

[[ -f $COMPOSE_FILE ]] || { echo "Compose file not found: $COMPOSE_FILE" >&2; exit 1; }
[[ -f $ENV_FILE ]] || { echo "Env file not found: $ENV_FILE" >&2; exit 1; }

cd "$CAIRN_DIR"

# Source .env so CAIRN_IMAGE is available for logging
# shellcheck disable=SC1090
. "$ENV_FILE"

echo "==> Pulling ${CAIRN_IMAGE:-<from .env>}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull app

echo "==> Stopping & removing app container"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop app
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" rm -f app

echo "==> Starting app"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d app

echo "==> Done. Status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps app