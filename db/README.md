# Database (Neon Postgres)

The database for DevisPlus.ma, hosted on Neon (project "Devis Plus", branch `production`,
Frankfurt). See `docs/database-prompt.md` for the full plan.
Accounts (sign-up, sign-in, Google) already use it. Quotes, invoices and the other business data
still live in the browser until the data layer moves here.

Local development uses the Neon branch `dev` (`.neon` + `.env.local`), so test sign-ups never
reach `production`.

- `migrations/`, in order:
  - `auth_bridge`: users table, `auth.uid()` and the `authenticated` / `anon` roles. The app's
    server tells the database who is signed in at each request.
  - `core_schema`: tables.
  - `rules`: numbering, locked invoices, audit trail, sign-up.
  - `rls`: who can read and write what.
  - `better_auth`: sessions, linked sign-in methods (password, Google) and verification values
    used by Better Auth (`src/lib/account/server.ts`). Server only.
- `seed.sql`: a demo company for the **local** test database only.
- `test/rules.test.sql`: 51 checks of the rules and access rules.
- `test/smoke.sql`: a short check that runs on Neon in a transaction that is rolled back.

## Commands

    npm run db:test       # local: temporary PostgreSQL, migrations, seed, all checks, then deleted
    npm run db:migrate    # Neon: applies new migrations (each once), then the smoke check

`db:test` needs PostgreSQL 17 installed (`brew install postgresql@17`), no Docker.
`db:migrate` reads `DATABASE_URL_UNPOOLED` (Neon's direct connection) from `.env.local`; get it with:

    npx neon@latest login
    npx neon@latest env pull -e DATABASE_URL,DATABASE_URL_UNPOOLED --file .env.local

Applied migrations are recorded in `migrations.applied`. Never edit a migration that is already
applied: add a new file instead.

## Settings for a deployment

`DATABASE_URL` (pooled), `APP_URL`, `BETTER_AUTH_SECRET` (random, at least 32 characters, different
per environment), plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for "Continuer avec Google".

## For the app (next steps)

- Use the pooled `DATABASE_URL` from the app's server, never from the browser. The app uses
  `@neondatabase/serverless` (works on Cloudflare Workers without extra setup), with one pool per
  request that is closed when the response is ready (see `src/lib/account/server.ts`).
- For each user request: open a transaction, `set local role authenticated`, set
  `request.jwt.claim.sub` (the user's id) and `request.jwt.claim.role` (`authenticated`) with
  `set_config(..., true)`, run the queries, commit. RLS then applies.
- Server jobs that act for no particular user (e.g. Google Drive uploads) run as the database
  owner without those settings.
