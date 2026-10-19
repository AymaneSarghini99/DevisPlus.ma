-- DevisPlus.ma: business rules enforced by the database.
-- - updated_at timestamps
-- - a profile for every new auth user; create_organization() for the sign-up flow
-- - document numbering without gaps or reuse (DV-YYYY-NNN, FA-YYYY-NNN)
-- - quotes: sent_at set once
-- - invoices: numbered when issued, then locked; only drafts can be deleted
-- - audit trail for invoices and payments

-- ---------------------------------------------------------------------------------------------
-- Membership helpers (used by RLS policies and functions)
-- ---------------------------------------------------------------------------------------------
create function public.is_member(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create function public.has_role(org uuid, roles public.member_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

create function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins p where p.user_id = auth.uid());
$$;

-- True for the server's service role, and for migrations / seed scripts run by the database
-- owner without any signed-in user (API requests always carry a role: anon or authenticated).
create function public.is_trusted_caller()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or (auth.role() is null and auth.uid() is null and session_user in ('postgres', 'supabase_admin'));
$$;

-- ---------------------------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'clients', 'catalog_items', 'custom_templates', 'quotes',
    'invoices', 'drive_connections', 'drive_uploads', 'business_customers'
  ] loop
    execute format(
      'create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/**
 * Sign-up: creates the caller's company workspace and makes them its owner.
 * Returns the existing organization when the caller already owns one (safe to call twice).
 */
create function public.create_organization(
  p_company_name text default '',
  p_language public.locale_code default 'fr'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select m.organization_id into v_org
  from public.memberships m
  where m.user_id = v_user and m.role = 'owner'
  limit 1;
  if v_org is not null then
    return v_org;
  end if;
  insert into public.organizations (company_name, language, doc_language, email)
  values (
    coalesce(p_company_name, ''),
    p_language,
    p_language,
    coalesce((select u.email from auth.users u where u.id = v_user), '')
  )
  returning id into v_org;
  insert into public.memberships (organization_id, user_id, role) values (v_org, v_user, 'owner');
  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Document numbering
-- ---------------------------------------------------------------------------------------------
create function public.format_document_number(p_type public.doc_type, p_year int, p_value int)
returns text
language sql immutable set search_path = ''
as $$
  select p_type::text || '-' || p_year || '-' || lpad(p_value::text, greatest(3, length(p_value::text)), '0');
$$;

/**
 * Next number for an organization, document type and year. The sequence row is locked by the
 * upsert until the end of the transaction, so two documents never get the same number and a
 * rolled-back transaction gives its number back.
 */
create function public.next_document_number(
  p_org uuid,
  p_type public.doc_type,
  p_year int default extract(year from current_date)::int
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v int;
begin
  if not (public.is_member(p_org) or public.is_trusted_caller()) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;
  insert into public.document_sequences as s (organization_id, doc_type, year, last_value)
  values (p_org, p_type, p_year, 1)
  on conflict (organization_id, doc_type, year)
    do update set last_value = s.last_value + 1
  returning last_value into v;
  return public.format_document_number(p_type, p_year, v);
end;
$$;

/**
 * A number written by hand or imported (e.g. DV-2026-014) moves the sequence forward so the
 * next automatic number never collides with it.
 */
create function public.bump_document_sequence(p_org uuid, p_type public.doc_type, p_number text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  parts text[] := regexp_match(p_number, '^' || p_type::text || '-(\d{4})-(\d+)$');
begin
  if not (public.is_member(p_org) or public.is_trusted_caller()) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;
  if parts is null then
    return;
  end if;
  insert into public.document_sequences as s (organization_id, doc_type, year, last_value)
  values (p_org, p_type, parts[1]::int, parts[2]::int)
  on conflict (organization_id, doc_type, year)
    do update set last_value = greatest(s.last_value, excluded.last_value);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------------------------
create function public.quotes_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.number, '') = '' then
      new.number := public.next_document_number(
        new.organization_id, 'DV', extract(year from new.issue_date)::int);
    else
      perform public.bump_document_sequence(new.organization_id, 'DV', new.number);
    end if;
  else
    if new.number is distinct from old.number then
      raise exception 'a quote number cannot change' using errcode = 'P0001';
    end if;
    if new.organization_id is distinct from old.organization_id then
      raise exception 'a quote cannot move to another organization' using errcode = 'P0001';
    end if;
  end if;
  -- sent_at: the first time the quote is marked as sent, then never again.
  if tg_op = 'UPDATE' and old.sent_at is not null then
    new.sent_at := old.sent_at;
  elsif new.status = 'envoye' and new.sent_at is null then
    new.sent_at := now();
  end if;
  return new;
end;
$$;

create trigger quotes_before_write
  before insert or update on public.quotes
  for each row execute function public.quotes_before_write();

-- ---------------------------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------------------------
create function public.invoices_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'emise' then
      raise exception 'an issued invoice cannot be changed' using errcode = 'P0001';
    end if;
    if new.organization_id is distinct from old.organization_id then
      raise exception 'an invoice cannot move to another organization' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'brouillon' then
    new.number := null;
    new.issued_at := null;
    return new;
  end if;

  -- Issued now (or imported as issued): number, issue date and time.
  new.issue_date := coalesce(new.issue_date, current_date);
  new.issued_at := coalesce(new.issued_at, now());
  if coalesce(new.number, '') = '' then
    new.number := public.next_document_number(
      new.organization_id, 'FA', extract(year from new.issue_date)::int);
  else
    perform public.bump_document_sequence(new.organization_id, 'FA', new.number);
  end if;
  return new;
end;
$$;

create trigger invoices_before_write
  before insert or update on public.invoices
  for each row execute function public.invoices_before_write();

create function public.invoices_before_delete()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status = 'emise' then
    raise exception 'an issued invoice cannot be deleted' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger invoices_before_delete
  before delete on public.invoices
  for each row execute function public.invoices_before_delete();

/**
 * Lines of an issued invoice are frozen. They can still be written in the transaction that
 * created or issued the invoice (an import, or "issue" sent together with its last lines).
 */
create function public.invoice_lines_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_id uuid;
  v_status public.invoice_status;
  v_same_tx boolean;
begin
  v_id := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  select i.status, i.xmin::text = (pg_current_xact_id()::xid)::text
    into v_status, v_same_tx
  from public.invoices i where i.id = v_id;
  -- Parent already gone (cascade from a draft's deletion) or still a draft: allowed.
  if v_status is null or v_status = 'brouillon' or v_same_tx then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'the lines of an issued invoice cannot be changed' using errcode = 'P0001';
end;
$$;

create trigger invoice_lines_guard
  before insert or update or delete on public.invoice_lines
  for each row execute function public.invoice_lines_guard();

-- Payments can only be recorded against an issued invoice.
create function public.invoice_payments_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.invoices i where i.id = new.invoice_id and i.status = 'emise'
  ) then
    raise exception 'payments can only be recorded on an issued invoice' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger invoice_payments_guard
  before insert or update on public.invoice_payments
  for each row execute function public.invoice_payments_guard();

-- ---------------------------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------------------------
create function public.write_audit_log()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_action text := lower(tg_op);
begin
  -- Nested: plpgsql resolves record fields even in the part of an AND that is not needed.
  if tg_op = 'UPDATE' and tg_table_name = 'invoices' then
    if (to_jsonb(old) ->> 'status') = 'brouillon' and (v_row ->> 'status') = 'emise' then
      v_action := 'issue';
    end if;
  end if;
  insert into public.audit_log (organization_id, user_id, entity, entity_id, action, details)
  values (
    (v_row ->> 'organization_id')::uuid,
    auth.uid(),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    v_action,
    case when tg_table_name = 'invoices'
      then jsonb_build_object('number', v_row -> 'number', 'total_ttc', v_row -> 'total_ttc')
      else jsonb_build_object('invoice_id', v_row -> 'invoice_id', 'amount', v_row -> 'amount')
    end
  );
  return null;
end;
$$;

create trigger invoices_audit
  after insert or update or delete on public.invoices
  for each row execute function public.write_audit_log();
create trigger invoice_payments_audit
  after insert or update or delete on public.invoice_payments
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------------------------
-- Google Drive status for the browser (the connection row itself stays server-only)
-- ---------------------------------------------------------------------------------------------
create function public.drive_status(p_org uuid)
returns table (connected boolean, google_email text, folder_id text, folder_name text)
language sql stable security definer set search_path = ''
as $$
  select true, c.google_email, c.folder_id, c.folder_name
  from public.drive_connections c
  where c.organization_id = p_org and public.is_member(p_org)
  union all
  select false, null, null, null
  where public.is_member(p_org)
    and not exists (select 1 from public.drive_connections c where c.organization_id = p_org);
$$;
