-- DevisPlus.ma: Row Level Security.
-- A signed-in user only reaches the rows of the organizations they belong to.
-- Visitors who are not signed in (anon) reach nothing.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'memberships', 'clients', 'catalog_items', 'custom_templates',
    'quotes', 'quote_lines', 'quote_reminders', 'invoices', 'invoice_lines', 'invoice_payments',
    'document_sequences', 'drive_connections', 'drive_uploads', 'platform_admins',
    'business_customers', 'business_customer_payments', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- Business data: every member of the organization can read and write.
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'catalog_items', 'custom_templates', 'quotes', 'quote_lines', 'quote_reminders',
    'invoices', 'invoice_lines', 'invoice_payments', 'drive_uploads'
  ] loop
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated
         using (public.is_member(organization_id))
         with check (public.is_member(organization_id))', t);
  end loop;
end;
$$;

-- Profiles: your own, and the people you work with.
create policy "read own and team profiles" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Organizations: members read; owners and admins change the settings.
-- Creation goes through create_organization(); deletion is not offered to browsers.
create policy "members read organization" on public.organizations for select to authenticated
  using (public.is_member(id));
create policy "owners and admins update organization" on public.organizations
  for update to authenticated
  using (public.has_role(id, '{owner,admin}'))
  with check (public.has_role(id, '{owner,admin}'));

-- Memberships: members see the team; owners manage it.
create policy "members read team" on public.memberships for select to authenticated
  using (public.is_member(organization_id));
create policy "owners add members" on public.memberships for insert to authenticated
  with check (public.has_role(organization_id, '{owner}'));
create policy "owners change members" on public.memberships for update to authenticated
  using (public.has_role(organization_id, '{owner}'))
  with check (public.has_role(organization_id, '{owner}'));
create policy "owners remove members" on public.memberships for delete to authenticated
  using (public.has_role(organization_id, '{owner}') and user_id <> auth.uid());

-- Numbering: readable by members, written only by next_document_number().
create policy "members read sequences" on public.document_sequences for select to authenticated
  using (public.is_member(organization_id));
revoke insert, update, delete on public.document_sequences from authenticated;

-- Google Drive connection: server only (service role). Browsers use drive_status().
revoke all on public.drive_connections from authenticated;

-- Audit trail: owners and admins read; written by triggers only.
create policy "owners and admins read audit" on public.audit_log for select to authenticated
  using (public.has_role(organization_id, '{owner,admin}'));
revoke insert, update, delete on public.audit_log from authenticated;

-- DevisPlus back-office.
create policy "admins see themselves" on public.platform_admins for select to authenticated
  using (user_id = auth.uid());
revoke insert, update, delete on public.platform_admins from authenticated;
create policy "platform admins manage customers" on public.business_customers
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins manage customer payments" on public.business_customer_payments
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Functions: nothing callable by visitors who are not signed in.
revoke execute on function public.create_organization(text, public.locale_code) from public, anon;
revoke execute on function public.next_document_number(uuid, public.doc_type, int) from public, anon;
revoke execute on function public.bump_document_sequence(uuid, public.doc_type, text) from public, anon;
revoke execute on function public.drive_status(uuid) from public, anon;
grant execute on function public.create_organization(text, public.locale_code) to authenticated;
grant execute on function public.next_document_number(uuid, public.doc_type, int) to authenticated;
grant execute on function public.bump_document_sequence(uuid, public.doc_type, text) to authenticated;
grant execute on function public.drive_status(uuid) to authenticated;
