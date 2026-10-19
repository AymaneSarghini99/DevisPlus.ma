-- DevisPlus.ma: the DevisPlus team can erase an account completely (admin portal → delete).
-- Issued invoices stay locked for the company itself; only the app's server (database owner,
-- after checking that a platform admin asked) may delete the whole invoice list, when the
-- company is erased.
create or replace function public.guard_issued_invoices()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.key <> 'invoices' or (tg_op = 'DELETE' and public.is_trusted_caller()) then
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

-- Same rule for the invoice tables: erasing a company (server only) takes its invoices too.
create or replace function public.invoices_before_delete()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status = 'emise' and not public.is_trusted_caller() then
    raise exception 'an issued invoice cannot be deleted' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create or replace function public.invoice_lines_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_id uuid;
  v_status public.invoice_status;
  v_same_tx boolean;
begin
  if tg_op = 'DELETE' and public.is_trusted_caller() then
    return old;
  end if;
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

-- The audit trail belongs to the company: when the company itself is erased, nothing is logged.
create or replace function public.write_audit_log()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_action text := lower(tg_op);
begin
  if not exists (
    select 1 from public.organizations o where o.id = (v_row ->> 'organization_id')::uuid
  ) then
    return null;
  end if;
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
