-- DevisPlus.ma: tables used by Better Auth (sign-up / sign-in in the app's server).
-- auth.users (bridge migration) is Better Auth's "user" model; these tables hold its sessions,
-- linked sign-in methods (password, Google) and one-time verification values.
-- Server only: browsers never get access to the auth schema.

alter table auth.users
  add column if not exists name text not null default '',
  add column if not exists image text;

create table auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_user_idx on auth.sessions (user_id);

create table auth.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Provider's id for the user (Google "sub", or the user id for email + password).
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  -- Password hash (PBKDF2-SHA-256) for email + password accounts.
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, account_id)
);
create index accounts_user_idx on auth.accounts (user_id);

create table auth.verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index verifications_identifier_idx on auth.verifications (identifier);

-- The profile takes the name Better Auth stores on the user (Google gives one).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.name, ''),
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
