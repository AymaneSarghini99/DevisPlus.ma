-- Quick check on a real database (Neon) after the migrations: two test companies, numbering,
-- locked invoices and isolation. Everything runs in one transaction that is rolled back, so no
-- data is left behind. Run by: npm run db:migrate
\set ON_ERROR_STOP 1
\set QUIET 1
\pset tuples_only on

begin;

create function pg_temp.fails(stmt text, pattern text, label text) returns void language plpgsql as $$
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
create function pg_temp.eq(actual text, expected text, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: got %, expected %', label, actual, expected;
  end if;
  raise notice 'ok   %', label;
end;
$$;

select pg_temp.eq(
  (select string_agg(table_name, ',' order by table_name) from information_schema.tables
   where table_schema = 'public' and table_name in ('organizations', 'quotes', 'invoices', 'audit_log')),
  'audit_log,invoices,organizations,quotes', 'tables are in place');

insert into auth.users (id, email) values
  ('5a0e0000-0000-4000-8000-00000000000a', 'smoke-a@devisplus.test'),
  ('5a0e0000-0000-4000-8000-00000000000b', 'smoke-b@devisplus.test');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '5a0e0000-0000-4000-8000-00000000000a', true);
select public.create_organization('Smoke A') as org_a \gset
insert into public.quotes (organization_id) values (:'org_a') returning number as quote_number \gset
select pg_temp.eq(:'quote_number', 'DV-' || extract(year from current_date) || '-001', 'a new company''s first quote is DV-YYYY-001');
insert into public.invoices (id, organization_id) values ('5a0e0000-0000-4000-8000-0000000000e1', :'org_a');
update public.invoices set status = 'emise' where id = '5a0e0000-0000-4000-8000-0000000000e1';
select pg_temp.eq((select number from public.invoices where id = '5a0e0000-0000-4000-8000-0000000000e1'),
  'FA-' || extract(year from current_date) || '-001', 'an invoice is numbered when issued');
select pg_temp.fails($$update public.invoices set total_ttc = 1 where id = '5a0e0000-0000-4000-8000-0000000000e1'$$,
  'cannot be changed', 'an issued invoice is locked');

select set_config('request.jwt.claim.sub', '5a0e0000-0000-4000-8000-00000000000b', true);
select pg_temp.eq((select count(*)::text from public.quotes where organization_id = :'org_a'), '0', 'another company cannot see its quotes');
select pg_temp.fails($$insert into public.clients (organization_id, name) values ('$$ || :'org_a' || $$', 'X')$$,
  'row-level security', 'another company cannot write into it');

reset role;
rollback;

\echo 'Smoke check passed (nothing was kept).'
