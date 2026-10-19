-- Checks of the RLS policies and business rules. Run by scripts/db-test.sh on a local PostgreSQL
-- (the migrations, then the seed). Any failed check stops the run with an error.
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on

create schema t;
grant usage on schema t to authenticated, anon;

-- Raise unless the statement fails with a message containing `pattern` (alternatives split by |).
create function t.fails(stmt text, pattern text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if exists (select 1 from unnest(string_to_array(pattern, '|')) p where sqlerrm ilike '%' || p || '%') then
      raise notice 'ok   %', label;
      return;
    end if;
    raise exception 'FAIL % (wrong error: %)', label, sqlerrm;
  end;
  raise exception 'FAIL % (no error)', label;
end;
$$;
create function t.eq(actual text, expected text, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: got %, expected %', label, actual, expected;
  end if;
  raise notice 'ok   %', label;
end;
$$;
grant execute on all functions in schema t to authenticated, anon;

-- Two companies, one user each, plus a staff member of company A.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'a@atlas.test', '{"full_name":"Owner A"}'),
  ('22222222-2222-4222-8222-222222222222', 'b@bennani.test', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'staff@atlas.test', '{}');
select t.eq((select count(*)::text from public.profiles where email like '%.test' and email <> 'demo@devisplus.test'), '3', 'a profile is created for each new user');

-- ------------------------------------------------------------------ company A (owner)
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select public.create_organization('Atlas', 'fr') as org_a \gset
select t.eq(public.create_organization('Atlas again')::text, :'org_a', 'create_organization is safe to call twice');
select t.eq((select role::text from public.memberships where organization_id = :'org_a'), 'owner', 'sign-up makes the user owner');

insert into public.clients (id, organization_id, name) values ('aaaaaaaa-0000-4000-8000-000000000001', :'org_a', 'Client A');
insert into public.quotes (id, organization_id, client_id) values ('aaaaaaaa-0000-4000-8000-0000000000d1', :'org_a', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.quotes (organization_id) values (:'org_a');
select t.eq(
  (select string_agg(number, ',' order by number) from public.quotes),
  'DV-' || extract(year from current_date) || '-001,DV-' || extract(year from current_date) || '-002',
  'quotes are numbered automatically, in order');
insert into public.quotes (organization_id, number) values (:'org_a', 'DV-' || extract(year from current_date) || '-014');
insert into public.quotes (organization_id) values (:'org_a') returning number as next_quote \gset
select t.eq(:'next_quote', 'DV-' || extract(year from current_date) || '-015', 'a hand-written number moves the sequence forward');
select t.fails($$insert into public.quotes (organization_id, number) values ('$$ || :'org_a' || $$', 'DV-$$ || extract(year from current_date) || $$-001')$$,
  'duplicate key', 'two quotes cannot share a number');
select t.fails($$update public.quotes set number = 'X' where id = 'aaaaaaaa-0000-4000-8000-0000000000d1'$$, 'cannot change', 'a quote number cannot change');

update public.quotes set status = 'envoye' where id = 'aaaaaaaa-0000-4000-8000-0000000000d1';
select sent_at as first_sent from public.quotes where id = 'aaaaaaaa-0000-4000-8000-0000000000d1' \gset
select t.eq((:'first_sent' <> '')::text, 'true', 'sent_at is set when the quote is marked as sent');
update public.quotes set status = 'brouillon', sent_at = null where id = 'aaaaaaaa-0000-4000-8000-0000000000d1';
update public.quotes set status = 'accepte' where id = 'aaaaaaaa-0000-4000-8000-0000000000d1';
select t.eq((select sent_at::text from public.quotes where id = 'aaaaaaaa-0000-4000-8000-0000000000d1'), :'first_sent', 'sent_at never changes afterwards');

insert into public.quote_lines (organization_id, quote_id, description, qty, unit_price, vat_rate)
values (:'org_a', 'aaaaaaaa-0000-4000-8000-0000000000d1', 'Pose', 2, 1200, 20);
select t.fails($$insert into public.quote_lines (organization_id, quote_id, discount_pct) values ('$$ || :'org_a' || $$', 'aaaaaaaa-0000-4000-8000-0000000000d1', 120)$$,
  'pct', 'a discount above 100 % is refused');
select t.fails($$insert into public.clients (organization_id, name, ice) values ('$$ || :'org_a' || $$', 'X', '123')$$,
  'check constraint', 'an ICE must have 15 digits');

-- Invoices: draft, issue, lock.
insert into public.invoices (id, organization_id, quote_id, total_ht, total_vat, total_ttc)
values ('aaaaaaaa-0000-4000-8000-0000000000e1', :'org_a', 'aaaaaaaa-0000-4000-8000-0000000000d1', 2400, 480, 2880);
insert into public.invoice_lines (organization_id, invoice_id, description, qty, unit_price)
values (:'org_a', 'aaaaaaaa-0000-4000-8000-0000000000e1', 'Pose', 2, 1200);
select t.eq((select coalesce(number, 'none') from public.invoices where id = 'aaaaaaaa-0000-4000-8000-0000000000e1'), 'none', 'a draft invoice has no number');
select t.fails($$insert into public.invoice_payments (organization_id, invoice_id, amount) values ('$$ || :'org_a' || $$', 'aaaaaaaa-0000-4000-8000-0000000000e1', 100)$$,
  'issued invoice', 'no payment on a draft invoice');
update public.invoice_lines set qty = 3 where invoice_id = 'aaaaaaaa-0000-4000-8000-0000000000e1';
update public.invoices set status = 'emise' where id = 'aaaaaaaa-0000-4000-8000-0000000000e1';
select t.eq((select number from public.invoices where id = 'aaaaaaaa-0000-4000-8000-0000000000e1'),
  'FA-' || extract(year from current_date) || '-001', 'an invoice gets its number when issued');
select t.fails($$update public.invoices set total_ttc = 1 where id = 'aaaaaaaa-0000-4000-8000-0000000000e1'$$, 'cannot be changed', 'an issued invoice cannot be changed');
select t.fails($$update public.invoices set status = 'brouillon' where id = 'aaaaaaaa-0000-4000-8000-0000000000e1'$$, 'cannot be changed', 'an issued invoice cannot go back to draft');
select t.fails($$update public.invoice_lines set qty = 9 where invoice_id = 'aaaaaaaa-0000-4000-8000-0000000000e1'$$, 'cannot be changed', 'its lines cannot be changed');
select t.fails($$insert into public.invoice_lines (organization_id, invoice_id) values ('$$ || :'org_a' || $$', 'aaaaaaaa-0000-4000-8000-0000000000e1')$$, 'cannot be changed', 'no line can be added to it');
select t.fails($$delete from public.invoice_lines where invoice_id = 'aaaaaaaa-0000-4000-8000-0000000000e1'$$, 'cannot be changed', 'no line can be removed from it');
select t.fails($$delete from public.invoices where id = 'aaaaaaaa-0000-4000-8000-0000000000e1'$$, 'cannot be deleted', 'an issued invoice cannot be deleted');
insert into public.invoice_payments (organization_id, invoice_id, amount, method) values (:'org_a', 'aaaaaaaa-0000-4000-8000-0000000000e1', 864, 'cheque');
select t.eq((select count(*)::text from public.invoice_payments), '1', 'payments can be recorded on an issued invoice');
select t.eq((select string_agg(action, ',' order by id) from public.audit_log where entity = 'invoices'), 'insert,issue', 'issuing is written to the audit trail');

-- A draft can be deleted, with its lines.
insert into public.invoices (id, organization_id) values ('aaaaaaaa-0000-4000-8000-0000000000e2', :'org_a');
insert into public.invoice_lines (organization_id, invoice_id) values (:'org_a', 'aaaaaaaa-0000-4000-8000-0000000000e2');
delete from public.invoices where id = 'aaaaaaaa-0000-4000-8000-0000000000e2';
select t.eq((select count(*)::text from public.invoice_lines where invoice_id = 'aaaaaaaa-0000-4000-8000-0000000000e2'), '0', 'a draft invoice can be deleted with its lines');
reset role;

-- Import: an issued invoice with its number and lines, written in one transaction.
begin;
set local role authenticated;
insert into public.invoices (id, organization_id, status, number, issue_date)
values ('aaaaaaaa-0000-4000-8000-0000000000e3', :'org_a', 'emise', 'FA-2025-007', '2025-12-20');
insert into public.invoice_lines (organization_id, invoice_id, description) values (:'org_a', 'aaaaaaaa-0000-4000-8000-0000000000e3', 'Imported');
commit;
set role authenticated;
insert into public.invoices (id, organization_id, status, issue_date) values ('aaaaaaaa-0000-4000-8000-0000000000e4', :'org_a', 'emise', '2025-12-28');
select t.eq((select number from public.invoices where id = 'aaaaaaaa-0000-4000-8000-0000000000e4'), 'FA-2025-008', 'imported invoices keep their numbers; the next one follows');
select t.fails($$insert into public.invoice_lines (organization_id, invoice_id) values ('$$ || :'org_a' || $$', 'aaaaaaaa-0000-4000-8000-0000000000e3')$$, 'cannot be changed', 'after the import transaction its lines are frozen');

-- Settings and team.
update public.organizations set company_name = 'Atlas Rénovation', app_button_color = '#DC2626' where id = :'org_a';
select t.fails($$update public.organizations set default_vat = 14 where id = '$$ || :'org_a' || $$'$$, 'default_vat_offered', 'the default VAT must be one of the offered rates');
select t.fails($$update public.organizations set app_line_color = 'red' where id = '$$ || :'org_a' || $$'$$, 'hex_color', 'colours must be hex');
insert into public.memberships (organization_id, user_id, role) values (:'org_a', '33333333-3333-4333-8333-333333333333', 'member');
select t.eq((select connected::text from public.drive_status(:'org_a')), 'false', 'drive_status tells the browser it is not connected');
select t.fails($$select * from public.drive_connections$$, 'permission denied', 'the Drive connection (refresh token) is not readable by browsers');
select t.fails($$insert into public.document_sequences values ('$$ || :'org_a' || $$', 'FA', 2030, 99)$$, 'permission denied', 'browsers cannot write the numbering');

-- ------------------------------------------------------------------ staff member of A
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
select t.eq((select count(*)::text from public.quotes), '4', 'a team member sees the company quotes');
update public.organizations set company_name = 'Hacked' where id = :'org_a';
select t.eq((select company_name from public.organizations where id = :'org_a'), 'Atlas Rénovation', 'a plain member cannot change the company settings');
select t.eq((select count(*)::text from public.audit_log), '0', 'a plain member cannot read the audit trail');

-- ------------------------------------------------------------------ company B
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select public.create_organization('Bennani') as org_b \gset
select t.eq((select count(*)::text from public.organizations), '1', 'B only sees its own organization');
select t.eq((select count(*)::text from public.quotes), '0', 'B cannot see A''s quotes');
select t.eq((select count(*)::text from public.invoices), '0', 'B cannot see A''s invoices');
select t.eq((select count(*)::text from public.clients), '0', 'B cannot see A''s clients');
select t.eq((select count(*)::text from public.profiles), '1', 'B cannot see A''s team profiles');
select t.fails($$insert into public.quotes (organization_id) values ('$$ || :'org_a' || $$')$$, 'row-level security|not a member', 'B cannot create a quote in A');
select t.fails($$insert into public.clients (organization_id, name) values ('$$ || :'org_a' || $$', 'X')$$, 'row-level security', 'B cannot add a client to A');
select t.fails($$select public.next_document_number('$$ || :'org_a' || $$', 'DV')$$, 'not a member', 'B cannot take a number from A''s sequence');
select t.fails($$select public.bump_document_sequence('$$ || :'org_a' || $$', 'DV', 'DV-2026-900')$$, 'not a member', 'B cannot move A''s sequence');
select t.fails($$insert into public.memberships (organization_id, user_id, role) values ('$$ || :'org_a' || $$', '22222222-2222-4222-8222-222222222222', 'owner')$$, 'row-level security', 'B cannot join A');
update public.quotes set status = 'refuse';
delete from public.clients;
select t.eq((select count(*)::text from public.drive_status(:'org_a')), '0', 'B gets no Drive status for A');
insert into public.quotes (organization_id) values (:'org_b') returning number as b_number \gset
select t.eq(:'b_number', 'DV-' || extract(year from current_date) || '-001', 'each company has its own numbering');
select t.eq((select count(*)::text from public.business_customers), '0', 'a client company cannot read the DevisPlus back-office');
reset role;
select t.eq((select count(*)::text from public.quotes where organization_id = :'org_a' and status = 'refuse'), '0', 'B''s updates did not touch A''s quotes');
select t.eq((select count(*)::text from public.clients where organization_id = :'org_a'), '1', 'B''s deletes did not touch A''s clients');

-- ------------------------------------------------------------------ approval and workspace data
select t.eq((select approval_status::text from public.organizations where id = :'org_a'), 'pending', 'a new company waits for approval');
select t.eq(public.apply_data_op('[{"id":"1","v":1},{"id":"2","v":2},{"id":"3","v":3}]', '{"t":"array","upsert":[{"id":"2","v":20}],"remove":["3"]}')::text,
  '[{"v": 20, "id": "2"}, {"v": 1, "id": "1"}]', 'list changes: the changed record first, the removed one gone, the others kept');
select t.eq(public.apply_data_op('{"a":1,"b":2}', '{"t":"map","set":{"c":3},"remove":["a"]}')::text, '{"b": 2, "c": 3}', 'map changes');
select t.fails($$select public.apply_data_op('[]', '{"t":"nope"}')$$, 'bad data operation', 'an unknown change is refused');

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false) \gset claim_
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select t.fails($$update public.organizations set approval_status = 'approved' where id = '$$ || :'org_a' || $$'$$,
  'only the DevisPlus team', 'a company cannot approve itself');
select t.fails($$update public.organizations set domain_state = 'active' where id = '$$ || :'org_a' || $$'$$,
  'only the DevisPlus team', 'a company cannot activate its own domain');
select t.fails($$insert into public.workspace_data (organization_id, key, value) values ('$$ || :'org_a' || $$', 'clients', '[]')$$,
  'row-level security', 'a company waiting for approval cannot save data');
reset role;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false) \gset trusted_
update public.organizations set approval_status = 'approved', approval_changed_at = now() where id in (:'org_a', :'org_b');
select t.eq((select count(*)::text from public.organizations where approval_status = 'approved' and id in (:'org_a', :'org_b')), '2', 'the server (DevisPlus team) can approve');

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false) \gset claim_
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
insert into public.workspace_data (organization_id, key, value) values
  (:'org_a', 'clients', '[{"id":"c1","name":"Client A"}]'),
  (:'org_a', 'invoices', '[{"id":"i1","status":"emise","number":"FA-2026-001","issueDate":"2026-10-01","client":{"name":"X"},"lines":[{"id":"l1"}],"payments":[]},{"id":"i2","status":"brouillon","number":"","lines":[]}]');
select t.eq((select updated_by::text from public.workspace_data where organization_id = :'org_a' and key = 'clients'), '11111111-1111-4111-8111-111111111111', 'who saved is recorded');
update public.workspace_data set value = public.apply_data_op(value, '{"t":"array","upsert":[{"id":"i1","status":"emise","number":"FA-2026-001","issueDate":"2026-10-01","client":{"name":"X"},"lines":[{"id":"l1"}],"payments":[{"id":"p1","amount":100}]}]}')
  where organization_id = :'org_a' and key = 'invoices';
select t.eq((select jsonb_array_length(value -> 0 -> 'payments')::text from public.workspace_data where organization_id = :'org_a' and key = 'invoices'), '1', 'a payment can be recorded on an issued invoice');
update public.workspace_data set value = public.apply_data_op(value, '{"t":"array","remove":["i2"]}')
  where organization_id = :'org_a' and key = 'invoices';
select t.eq((select jsonb_array_length(value)::text from public.workspace_data where organization_id = :'org_a' and key = 'invoices'), '1', 'a draft invoice can be removed');
select t.fails($$update public.workspace_data set value = public.apply_data_op(value, '{"t":"array","remove":["i1"]}') where key = 'invoices'$$,
  'issued invoice', 'an issued invoice cannot be removed');
select t.fails($$update public.workspace_data set value = '[{"id":"i1","status":"emise","number":"FA-2026-009","issueDate":"2026-10-01","client":{"name":"X"},"lines":[{"id":"l1"}]}]' where key = 'invoices'$$,
  'issued invoice', 'an issued invoice keeps its number');
select t.fails($$delete from public.workspace_data where key = 'invoices'$$, 'issued invoice', 'the invoice list cannot be deleted while it holds issued invoices');
select t.eq((select count(*)::text from public.platform_data), '0', 'a company sees no back-office data');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select t.eq((select count(*)::text from public.workspace_data), '0', 'B cannot see A''s workspace data');
select t.fails($$insert into public.workspace_data (organization_id, key, value) values ('$$ || :'org_a' || $$', 'quotes', '[]')$$,
  'row-level security', 'B cannot write into A''s workspace');
update public.workspace_data set value = '[]';
reset role;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false) \gset trusted_
select t.eq((select value -> 0 ->> 'name' from public.workspace_data where organization_id = :'org_a' and key = 'clients'), 'Client A', 'B''s update did not touch A''s data');

update public.organizations set approval_status = 'suspended' where id = :'org_a';
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false) \gset claim_
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select t.eq((select count(*)::text from public.workspace_data), '0', 'a suspended company no longer reaches its data');
reset role;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false) \gset trusted_
update public.organizations set approval_status = 'approved' where id = :'org_a';

insert into auth.users (id, email) values ('44444444-4444-4444-8444-444444444444', 'team@devisplus.test');
insert into public.platform_admins (user_id) values ('44444444-4444-4444-8444-444444444444');
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false) \gset claim_
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false);
insert into public.platform_data (key, value) values ('customers', '[]');
select t.eq((select count(*)::text from public.platform_data), '1', 'a platform admin manages the back-office data');
select t.eq((select count(*)::text from public.workspace_data), '0', 'a platform admin does not read the companies'' data through the app');
reset role;
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false) \gset trusted_

-- Erasing a company (admin portal → delete), as the app's server: everything goes, issued invoices included.
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false) \gset erase_
delete from public.organizations where id = :'org_a';
select t.eq((select count(*)::text from public.workspace_data where organization_id = :'org_a'), '0', 'the team can erase a company and all its data, issued invoices included');
select t.eq((select count(*)::text from public.invoices where organization_id = :'org_a'), '0', 'its invoices are erased too');
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select t.eq((select count(*)::text from public.profiles where id = '11111111-1111-4111-8111-111111111111'), '0', 'erasing the user removes its profile');

-- ------------------------------------------------------------------ visitor not signed in
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select t.fails($$select * from public.organizations$$, 'permission denied', 'visitors cannot read organizations');
select t.fails($$select public.create_organization('X')$$, 'permission denied', 'visitors cannot create organizations');
reset role;

\echo 'All database checks passed.'
