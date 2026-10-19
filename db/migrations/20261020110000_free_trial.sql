-- DevisPlus.ma: free trial. A company that signed up and is not approved yet ("pending") uses
-- the whole app with up to 2 quotes; the DevisPlus team approves it once paid (no limit then).
-- Rejected and suspended companies reach nothing.

/** True when the caller belongs to the organization and it is in trial or approved. */
create function public.can_use_workspace(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = org and m.user_id = auth.uid()
      and o.approval_status in ('approved', 'pending')
  );
$$;
revoke execute on function public.can_use_workspace(uuid) from public, anon;
grant execute on function public.can_use_workspace(uuid) to authenticated;

drop policy "approved members manage workspace data" on public.workspace_data;
create policy "active members manage workspace data" on public.workspace_data
  for all to authenticated
  using (public.can_use_workspace(organization_id))
  with check (public.can_use_workspace(organization_id));

/** Number of quotes a company in trial can keep. */
create function public.trial_quote_limit()
returns int
language sql immutable set search_path = ''
as $$ select 2 $$;

/** In trial, the quote list cannot grow beyond the limit (editing existing quotes stays free). */
create function public.guard_trial_quotes()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_new int;
  v_old int := 0;
begin
  if new.key <> 'quotes' or public.is_trusted_caller() then
    return new;
  end if;
  v_new := case when jsonb_typeof(new.value) = 'array' then jsonb_array_length(new.value) else 0 end;
  if tg_op = 'UPDATE' and jsonb_typeof(old.value) = 'array' then
    v_old := jsonb_array_length(old.value);
  end if;
  if v_new > public.trial_quote_limit() and v_new > v_old and exists (
    select 1 from public.organizations o
    where o.id = new.organization_id and o.approval_status = 'pending'
  ) then
    raise exception 'trial limit reached: % quotes', public.trial_quote_limit()
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger guard_trial_quotes before insert or update on public.workspace_data
  for each row execute function public.guard_trial_quotes();
