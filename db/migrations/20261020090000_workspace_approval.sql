-- DevisPlus.ma: account approval, each company's workspace data on the server, the owner's
-- back-office data, and the fields used to activate a customer's own domain.
--
-- - organizations.approval_status: a new sign-up waits ("pending") until the DevisPlus team
--   accepts it. Only the team (platform admins) or the app's server can change it.
-- - workspace_data: the company's data, one JSON value per kind (settings, clients, catalogue,
--   quotes, invoices, Drive records, setup wizard), in the shape the app already uses. Only the
--   members of an APPROVED organization reach it.
-- - platform_data: the DevisPlus owner's customer register; platform admins only.

-- ---------------------------------------------------------------------------------------------
-- Approval
-- ---------------------------------------------------------------------------------------------
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'suspended');

alter table public.organizations
  add column approval_status public.approval_status not null default 'pending',
  add column approval_changed_at timestamptz,
  add column approval_note text not null default '',
  -- Cloudflare custom hostname (custom domains of the shared app), set by the DevisPlus team.
  add column custom_hostname_id text;

create index organizations_approval_idx on public.organizations (approval_status, created_at desc);

/** Approval and domain activation are decided by the DevisPlus team, never by the company. */
create function public.guard_team_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (new.approval_status, new.approval_changed_at, new.approval_note, new.domain_state,
      new.custom_domain, new.custom_hostname_id)
     is distinct from
     (old.approval_status, old.approval_changed_at, old.approval_note, old.domain_state,
      old.custom_domain, old.custom_hostname_id)
     and not (public.is_trusted_caller() or public.is_platform_admin()) then
    raise exception 'only the DevisPlus team can change the approval or the domain'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_team_fields before update on public.organizations
  for each row execute function public.guard_team_fields();

/** True when the caller belongs to the organization and the organization is approved. */
create function public.is_approved_member(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = org and m.user_id = auth.uid() and o.approval_status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- Data operations (shared by workspace_data and platform_data)
-- ---------------------------------------------------------------------------------------------
/**
 * Applies one change to a stored JSON value:
 *   {"t":"replace","value":…}                     the whole value
 *   {"t":"array","upsert":[{id,…}…],"remove":[id…]} lists of records with an "id": the upserted
 *                                                 records come first (newest first, like the
 *                                                 app), the others keep their order
 *   {"t":"map","set":{k:v…},"remove":[k…]}        objects keyed by id
 * Two devices that change different records of the same list therefore do not overwrite each
 * other.
 */
create function public.apply_data_op(cur jsonb, op jsonb)
returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  kind text := op ->> 't';
  ids text[];
  removed text[];
  res jsonb;
begin
  if kind = 'replace' then
    if op -> 'value' is null then
      raise exception 'bad data operation' using errcode = '22023';
    end if;
    return op -> 'value';
  end if;
  removed := coalesce(
    array(select jsonb_array_elements_text(coalesce(op -> 'remove', '[]'::jsonb))), '{}');
  if kind = 'array' then
    if cur is null or jsonb_typeof(cur) <> 'array' then
      cur := '[]'::jsonb;
    end if;
    if jsonb_typeof(coalesce(op -> 'upsert', '[]'::jsonb)) <> 'array' then
      raise exception 'bad data operation' using errcode = '22023';
    end if;
    ids := coalesce(
      array(select e ->> 'id' from jsonb_array_elements(coalesce(op -> 'upsert', '[]'::jsonb)) e),
      '{}') || removed;
    select coalesce(jsonb_agg(x.e order by x.o), '[]'::jsonb) into res
    from (
      select u.e, u.o from jsonb_array_elements(coalesce(op -> 'upsert', '[]'::jsonb))
        with ordinality as u (e, o)
      union all
      select c.e, 1000000000 + c.o from jsonb_array_elements(cur) with ordinality as c (e, o)
      where not coalesce((c.e ->> 'id') = any (ids), false)
    ) x;
    return res;
  end if;
  if kind = 'map' then
    if cur is null or jsonb_typeof(cur) <> 'object' then
      cur := '{}'::jsonb;
    end if;
    if jsonb_typeof(coalesce(op -> 'set', '{}'::jsonb)) <> 'object' then
      raise exception 'bad data operation' using errcode = '22023';
    end if;
    return (cur - removed) || coalesce(op -> 'set', '{}'::jsonb);
  end if;
  raise exception 'bad data operation' using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Workspace data (one row per organization and kind)
-- ---------------------------------------------------------------------------------------------
create table public.workspace_data (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null
    check (key in ('tenant', 'settings', 'clients', 'catalog', 'quotes', 'invoices', 'drive')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (organization_id, key)
);

create function public.touch_workspace_data()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger touch_workspace_data before insert or update on public.workspace_data
  for each row execute function public.touch_workspace_data();

/**
 * Issued invoices are part of the accounting record: once an invoice is "emise", it stays in the
 * list with the same number, date, client and lines (payments can still be recorded).
 */
create function public.guard_issued_invoices()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.key <> 'invoices' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(old.value) = 'array' then old.value else '[]'::jsonb end) o
    where o ->> 'status' = 'emise'
      and (tg_op = 'DELETE' or not exists (
        select 1
        from jsonb_array_elements(
          case when jsonb_typeof(new.value) = 'array' then new.value else '[]'::jsonb end) n
        where n ->> 'id' = o ->> 'id'
          and n ->> 'status' = 'emise'
          and n -> 'number' is not distinct from o -> 'number'
          and n -> 'issueDate' is not distinct from o -> 'issueDate'
          and n -> 'client' is not distinct from o -> 'client'
          and n -> 'lines' is not distinct from o -> 'lines'
      ))
  ) then
    raise exception 'an issued invoice cannot be changed or deleted' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger guard_issued_invoices before update or delete on public.workspace_data
  for each row execute function public.guard_issued_invoices();

alter table public.workspace_data enable row level security;
revoke all on public.workspace_data from anon;
create policy "approved members manage workspace data" on public.workspace_data
  for all to authenticated
  using (public.is_approved_member(organization_id))
  with check (public.is_approved_member(organization_id));

-- ---------------------------------------------------------------------------------------------
-- DevisPlus owner back-office data
-- ---------------------------------------------------------------------------------------------
create table public.platform_data (
  key text primary key check (key in ('customers')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create trigger touch_platform_data before insert or update on public.platform_data
  for each row execute function public.touch_workspace_data();

alter table public.platform_data enable row level security;
revoke all on public.platform_data from anon;
create policy "platform admins manage platform data" on public.platform_data
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

revoke execute on function public.is_approved_member(uuid) from public, anon;
grant execute on function public.is_approved_member(uuid) to authenticated;
grant execute on function public.apply_data_op(jsonb, jsonb) to authenticated;
