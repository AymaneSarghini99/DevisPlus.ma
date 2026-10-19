# Supabase database

The database for DevisPlus.ma (see `docs/database-prompt.md` for the full plan).
The app does not use it yet: it still keeps its data in the browser until the next steps
(sign-in with Supabase Auth, then the data layer) are done.

- `migrations/`: the schema, in order:
  - `core_schema`: tables;
  - `rules`: numbering, locked invoices, audit trail, sign-up;
  - `rls`: who can read and write what;
  - `storage`: private buckets for logos and PDFs.
- `seed.sql`: a demo company for a **local** database only (`supabase db push` never runs it).
- `dbtest/`: checks of the rules and RLS, run on a plain local PostgreSQL.

## Check the migrations locally

Needs PostgreSQL 17 installed (`brew install postgresql@17`), no Docker:

    npm run db:test

It creates a temporary database, applies the migrations and the seed, runs the checks, then
deletes everything.

## Create the real database

1. Create a project on supabase.com, choosing an EU region (closest to Morocco).
2. Install the CLI and link the project:

       npx supabase login
       npx supabase init          # once; keeps the existing migrations
       npx supabase link --project-ref <your-project-ref>

3. Apply the migrations: `npx supabase db push`
4. In the dashboard, under Authentication › Providers, turn on Email and Google. Google uses
   the same OAuth client as the app, with the Supabase callback URL added.
5. Generate the TypeScript types:

       npx supabase gen types typescript --linked > src/lib/database.types.ts

Never put the `service_role` key in browser code: it bypasses every rule above.
