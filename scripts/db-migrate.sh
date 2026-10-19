#!/usr/bin/env bash
# Applies the migrations in db/migrations to the database in DATABASE_URL_UNPOOLED (Neon's direct
# connection, read from .env.local), each one once and inside a transaction, then runs a quick
# check on that database that leaves no data behind (db/test/smoke.sql).
# Usage: npm run db:migrate            (apply + check)
#        npm run db:migrate -- --check (check only)
set -euo pipefail
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
cd "$(dirname "$0")/.."

PSQL="${PSQL:-$(command -v psql 2>/dev/null || echo /opt/homebrew/opt/postgresql@17/bin/psql)}"
URL="${DATABASE_URL_UNPOOLED:-}"
if [ -z "$URL" ] && [ -f .env.local ]; then
  URL="$(grep -E '^DATABASE_URL_UNPOOLED=' .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
fi
if [ -z "$URL" ]; then
  echo "DATABASE_URL_UNPOOLED is missing (run: npx neon@latest env pull)." >&2
  exit 1
fi
db() { "$PSQL" "$URL" -v ON_ERROR_STOP=1 -q -X "$@"; }

if [ "${1:-}" != "--check" ]; then
  db -c "set client_min_messages = warning;
         create schema if not exists migrations;
         create table if not exists migrations.applied (
           version text primary key, applied_at timestamptz not null default now());" >/dev/null
  for f in db/migrations/*.sql; do
    v="$(basename "$f" .sql)"
    if [ "$(db -tA -c "select count(*) from migrations.applied where version = '$v'")" = 1 ]; then
      echo "skip       $v (already applied)"
      continue
    fi
    echo "apply      $v"
    { cat "$f"; echo; echo "insert into migrations.applied (version) values ('$v');"; } |
      db --single-transaction -f - >/dev/null
  done
fi

echo "check      db/test/smoke.sql"
db -f db/test/smoke.sql 2>&1 | grep -E 'ok   |FAIL|ERROR|passed' | sed 's/^psql:[^ ]* NOTICE:  /  /'
