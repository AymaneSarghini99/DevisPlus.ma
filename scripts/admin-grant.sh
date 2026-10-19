#!/usr/bin/env bash
# Makes an existing account a DevisPlus platform admin (access to the admin portal), on the
# database in DATABASE_URL_UNPOOLED (read from .env.local, like db:migrate). The person must have
# signed up first (email + password or Google).
# Usage: npm run admin:grant -- contact@devisplus.ma
#        npm run admin:grant -- contact@devisplus.ma --revoke
set -euo pipefail
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
cd "$(dirname "$0")/.."

EMAIL="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
if ! printf '%s' "$EMAIL" | grep -Eq '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'; then
  echo "Usage: npm run admin:grant -- email@example.com [--revoke]" >&2
  exit 1
fi
PSQL="${PSQL:-$(command -v psql 2>/dev/null || echo /opt/homebrew/opt/postgresql@17/bin/psql)}"
URL="${DATABASE_URL_UNPOOLED:-}"
if [ -z "$URL" ] && [ -f .env.local ]; then
  URL="$(grep -E '^DATABASE_URL_UNPOOLED=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
fi
if [ -z "$URL" ]; then
  echo "DATABASE_URL_UNPOOLED is missing (run: npx neon@latest env pull)." >&2
  exit 1
fi
db() { "$PSQL" "$URL" -v ON_ERROR_STOP=1 -q -X -tA -v email="$EMAIL" "$@"; }

# psql variables (:'email', safely quoted) are only read from a script, hence <<<.
if [ -z "$(db <<< "select id from auth.users where lower(email) = :'email'")" ]; then
  echo "No account with the email $EMAIL: sign up first, then run this again." >&2
  exit 1
fi
if [ "${2:-}" = "--revoke" ]; then
  db <<< "delete from public.platform_admins where user_id = (select id from auth.users where lower(email) = :'email');"
  echo "$EMAIL is no longer a platform admin."
else
  db <<< "insert into public.platform_admins (user_id)
          select id from auth.users where lower(email) = :'email' on conflict do nothing;"
  echo "$EMAIL is a platform admin: sign in at /admin (admin.devisplus.ma)."
fi
