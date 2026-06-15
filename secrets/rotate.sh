#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# secrets/rotate.sh  —  Rotate a single Docker secret without downtime
#
# Usage:
#   ./secrets/rotate.sh jwt_access_secret        # auto-generates new value
#   ./secrets/rotate.sh razorpay_key_secret      # prompts for new value
#
# What it does:
#   1. Backs up the current secret file (with timestamp).
#   2. Writes the new value.
#   3. Triggers a rolling restart of the api service so both replicas
#      pick up the new secret with zero downtime.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SECRET_NAME="${1:-}"
if [[ -z "$SECRET_NAME" ]]; then
  echo "Usage: $0 <secret_name_without_.txt>"
  exit 1
fi

SECRETS_DIR="$(cd "$(dirname "$0")" && pwd)"
SECRET_FILE="$SECRETS_DIR/${SECRET_NAME}.txt"

if [[ ! -f "$SECRET_FILE" ]]; then
  echo "Error: $SECRET_FILE does not exist. Run generate.sh first."
  exit 1
fi

# Back up the existing secret.
BACKUP="$SECRET_FILE.bak.$(date +%Y%m%d_%H%M%S)"
cp "$SECRET_FILE" "$BACKUP"
chmod 600 "$BACKUP"
echo "Backed up to: $BACKUP"

# Auto-generate or prompt depending on the secret type.
case "$SECRET_NAME" in
  jwt_access_secret | jwt_refresh_secret | mongo_root_password)
    NEW_VALUE="$(openssl rand -base64 48 | tr -d '\n')"
    printf '%s' "$NEW_VALUE" > "$SECRET_FILE"
    echo "Generated new value for $SECRET_NAME"
    ;;
  *)
    echo "Enter new value for $SECRET_NAME (input hidden):"
    read -rs NEW_VALUE
    printf '%s' "$NEW_VALUE" > "$SECRET_FILE"
    echo ""
    echo "Value written to $SECRET_FILE"
    ;;
esac

chmod 600 "$SECRET_FILE"

# Rolling restart to pick up the new secret.
echo "Triggering rolling restart of api service..."
docker compose -f "$(dirname "$SECRETS_DIR")/docker-compose.prod.yml" \
  up -d --no-deps --force-recreate api

echo "Done. Both replicas will use the new secret within ~30 seconds."
echo "Old backup preserved at: $BACKUP (delete once rotation is confirmed)"
