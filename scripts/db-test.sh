#!/usr/bin/env bash
# Runs the Supabase migrations, the seed and the database checks on a throwaway local PostgreSQL
# (no Docker needed). Usage: npm run db:test
set -euo pipefail
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-$(dirname "$(command -v postgres 2>/dev/null || echo /opt/homebrew/opt/postgresql@17/bin/postgres)")}"
DIR="$(mktemp -d)"
PORT="${PORT:-54329}"
"$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap '"$PGBIN/pg_ctl" -D "$DIR/data" stop -m fast >/dev/null 2>&1; rm -rf "$DIR"' EXIT
db() { "$PGBIN/psql" -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

db -f supabase/dbtest/supabase_shim.sql >/dev/null
for f in supabase/migrations/*.sql; do
  echo "migration  $(basename "$f")"
  db -f "$f" >/dev/null
done
echo "seed       supabase/seed.sql"
db -f supabase/seed.sql >/dev/null
db -f supabase/dbtest/rules.test.sql 2>&1 | grep -E 'ok   |FAIL|ERROR|passed' | sed 's/^psql:[^ ]* NOTICE:  /  /'

# Numbering under load: two sessions issue 20 invoices each at the same time.
ORG=00000000-0000-4000-8000-0000000000a1
USER_ID=00000000-0000-4000-8000-000000000001
db -c "insert into public.invoices (organization_id) select '$ORG' from generate_series(1, 40)"
issue() {
  for i in $(seq 1 20); do
    db -c "set role authenticated; select set_config('request.jwt.claim.sub', '$USER_ID', false);
           update public.invoices set status = 'emise'
           where id = (select id from public.invoices where status = 'brouillon' and organization_id = '$ORG'
                       order by id for update skip locked limit 1);" >/dev/null
  done
}
issue & issue & wait
db -tA -c "select case when count(*) = 41 and count(distinct number) = 41
                    and max(split_part(number, '-', 3)::int) = 41 then 'ok' else 'FAIL' end
           from public.invoices where organization_id = '$ORG' and status = 'emise'" | {
  read -r r
  if [ "$r" = ok ]; then echo "  ok   two sessions issuing at once: 41 invoices, 41 numbers, no gap"
  else echo "  FAIL concurrent numbering"; exit 1; fi
}
echo "Database checks finished."
