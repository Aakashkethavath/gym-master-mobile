#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# secrets/generate.sh
#
# Generates cryptographically random secret files for Docker secrets.
# Run ONCE on the production host before the first `docker compose up`.
#
# Usage:
#   chmod +x secrets/generate.sh
#   ./secrets/generate.sh
#
# The script will:
#   1. Create the ./secrets/ directory with mode 700 (owner-only).
#   2. Generate each secret file with mode 600 (owner read/write only).
#   3. Print which files it created and which it skipped (already exist).
#   4. Remind you to fill in gateway-specific secrets manually.
#
# Security notes:
#   • Secrets are generated with `openssl rand` (CSPRNG).
#   • The secrets/ directory is NEVER committed to git (see .gitignore).
#   • On cloud hosts, prefer your cloud provider's secret manager
#     (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) over
#     on-disk files for production-grade secret management.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SECRETS_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure the secrets directory has restrictive permissions.
chmod 700 "$SECRETS_DIR"

info()    { echo "  ✓  $1"; }
skip()    { echo "  –  $1 (already exists, skipping)"; }
warning() { echo "  ⚠  $1"; }

generate() {
  local file="$SECRETS_DIR/$1"
  local value="$2"
  if [[ -f "$file" ]]; then
    skip "$1"
  else
    printf '%s' "$value" > "$file"
    chmod 600 "$file"
    info "Generated $1"
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Gym Master — Docker Secret Generator"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Auto-generated secrets (random, high-entropy) ─────────────────────────

MONGO_USER="gymmaster"
MONGO_PASS="$(openssl rand -base64 32 | tr -d '/+=\n')"
MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASS}@mongo:27017/gymmaster?authSource=gymmaster"

generate "mongo_root_user.txt"         "$MONGO_USER"
generate "mongo_root_password.txt"     "$MONGO_PASS"
generate "mongodb_uri.txt"             "$MONGO_URI"
generate "jwt_access_secret.txt"       "$(openssl rand -base64 48 | tr -d '\n')"
generate "jwt_refresh_secret.txt"      "$(openssl rand -base64 48 | tr -d '\n')"

# ── Gateway secrets — must be filled in manually ──────────────────────────

echo ""
echo "  The following secrets need YOUR values from the payment dashboards."
echo "  Placeholder files are created; replace their contents before deploying."
echo ""

placeholder() {
  local file="$SECRETS_DIR/$1"
  if [[ -f "$file" ]]; then
    skip "$1"
  else
    printf '%s' "REPLACE_WITH_REAL_VALUE" > "$file"
    chmod 600 "$file"
    warning "Created placeholder: $1  ← MUST BE REPLACED"
  fi
}

placeholder "razorpay_key_secret.txt"     # Razorpay Dashboard → API Keys → key_secret
placeholder "razorpay_webhook_secret.txt" # Razorpay Dashboard → Webhooks → Webhook Secret
placeholder "stripe_secret_key.txt"       # Stripe Dashboard → API Keys → Secret key (sk_live_…)
placeholder "stripe_webhook_secret.txt"   # Stripe Dashboard → Webhooks → Signing secret (whsec_…)
placeholder "exercise_api_key.txt"        # RapidAPI Dashboard → ExerciseDB → API Key

echo ""
echo "  To fill in a secret:"
echo "    printf 'your_actual_value' > secrets/razorpay_key_secret.txt"
echo ""
echo "  Files created in: $SECRETS_DIR"
echo "  Permissions: directory=700, files=600"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Next step: docker compose -f docker-compose.prod.yml up -d --build"
echo "═══════════════════════════════════════════════════════════"
echo ""
