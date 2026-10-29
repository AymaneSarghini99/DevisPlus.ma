#!/usr/bin/env bash
# Sets the server settings of the `devisplus` Worker (Cloudflare account aymanesarghini.dev).
# Addresses are filled in; you are asked for the private values (input hidden).
# Press Enter on a question to keep the suggested value (shown in brackets) or skip it.
set -euo pipefail
cd "$(dirname "$0")/.."

export CLOUDFLARE_ACCOUNT_ID=5b3bf110986c26736e94fa82bfc987cc
WRANGLER=(npx --yes wrangler@4.151.2)

put() { printf '%s' "$2" | "${WRANGLER[@]}" secret put "$1" --name devisplus >/dev/null && echo "✓ $1"; }
local_value() { grep -E "^$1=" .env.local 2>/dev/null | head -1 | cut -d= -f2- | sed -E 's/^"//; s/"$//'; }
ask() { # ask NAME "question" [default]
  local v
  read -r -s -p "$2${3:+ [Enter = $4]}: " v; echo
  printf '%s' "${v:-${3:-}}"
}

put APP_URL "https://www.devisplus.ma"
put APP_ORIGINS "https://devisplus.ma"
put GOOGLE_REDIRECT_URI "https://www.devisplus.ma/api/google/callback"
put BETTER_AUTH_SECRET "$(openssl rand -base64 48)"

db=$(ask DATABASE_URL "DATABASE_URL (Neon production, pooled connection)")
[ -n "$db" ] && put DATABASE_URL "$db" || echo "! DATABASE_URL skipped: the app cannot sign anyone in without it"

v=$(ask GOOGLE_CLIENT_ID "GOOGLE_CLIENT_ID" "$(local_value GOOGLE_CLIENT_ID)" "the one in .env.local")
[ -n "$v" ] && put GOOGLE_CLIENT_ID "$v"
v=$(ask GOOGLE_CLIENT_SECRET "GOOGLE_CLIENT_SECRET" "$(local_value GOOGLE_CLIENT_SECRET)" "the one in .env.local")
[ -n "$v" ] && put GOOGLE_CLIENT_SECRET "$v"
v=$(ask GOOGLE_TOKEN_ENCRYPTION_KEY "GOOGLE_TOKEN_ENCRYPTION_KEY (old production key)" "$(openssl rand -base64 32)" "a new key; Drive must then be reconnected")
put GOOGLE_TOKEN_ENCRYPTION_KEY "$v"

v=$(ask RESEND_API_KEY "RESEND_API_KEY (optional, for emails)")
[ -n "$v" ] && put RESEND_API_KEY "$v" && put EMAIL_FROM "DevisPlus <contact@devisplus.ma>"

echo "Done. Settings on the Worker:"
"${WRANGLER[@]}" secret list --name devisplus 2>/dev/null | grep '"name"' || true
