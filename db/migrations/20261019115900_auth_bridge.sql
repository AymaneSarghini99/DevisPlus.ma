-- DevisPlus.ma: identity bridge for a plain PostgreSQL (Neon).
-- The app's server signs users in (Better Auth) and, for each request, runs the queries in a
-- transaction that says who the user is:
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claim.sub', '<user uuid>', true),
--          set_config('request.jwt.claim.role', 'authenticated', true);
--   ... queries (RLS applies) ...
--   commit;
--
-- Server-side jobs that act for no particular user connect as the database owner without these
-- settings. The names match Supabase's, so the same policies also run there.

-- Roles used by the policies (never used to log in).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;
-- The connecting role must be able to switch to "authenticated" for each request.
grant authenticated to current_user;
grant anon to current_user;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- One row per person who can sign in. Better Auth keeps sessions and linked accounts (password,
-- Google) in its own tables, keyed by this id.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  email_verified boolean not null default false,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create function auth.uid() returns uuid language sql stable as $f$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $f$;
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'role'
  ) then
    create function auth.role() returns text language sql stable as $f$
      select nullif(current_setting('request.jwt.claim.role', true), '')
    $f$;
  end if;
end;
$$;
grant execute on all functions in schema auth to anon, authenticated;

-- Signed-in users get table access by default; RLS (see the rls migration) then limits rows.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
