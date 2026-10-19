-- Demo data for a LOCAL Supabase only (`supabase db reset` runs it; `supabase db push` does not).
-- Fictional company and client, same as the app's examples. Sign in with the demo user below.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'demo@devisplus.test',
  extensions.crypt('demo-devisplus-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Youssef El Amrani"}', now(), now(),
  '', '', '', ''
);
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(), '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub":"00000000-0000-4000-8000-000000000001","email":"demo@devisplus.test","email_verified":true}',
  'email', now(), now(), now()
);

insert into public.organizations (
  id, slug, company_name, sector, ice, if_number, rc, tp, address, city, phone, email,
  contact_name, bank_name, rib, subdomain, onboarding_step, onboarding_completed,
  onboarding_finished_at
) values (
  '00000000-0000-4000-8000-0000000000a1', 'atlas-renovation', 'Atlas Rénovation SARL', 'btp',
  '002345678000091', '45678912', '512345 — Casablanca', '34512678',
  '45, boulevard Zerktouni, 3ᵉ étage', 'Casablanca', '05 22 47 12 30',
  'contact@atlas-renovation.ma', 'Youssef El Amrani', 'Attijariwafa bank — agence Maârif',
  '007 780 0001234567890123 45', 'atlas-renovation', 'review',
  '{profile,logo,branding,quotes,domain}', now()
);
insert into public.memberships (organization_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'owner');

insert into public.clients (id, organization_id, name, ice, address, city, phone, email, contact_name)
values (
  '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
  'Hôtel Tanger Bay', '001987654000072', 'Boulevard Mohammed VI', 'Tanger', '0661000000',
  'achats@hotel-test.ma', 'Samira Alaoui'
);

insert into public.catalog_items (organization_id, name, description, unit, unit_price, vat_rate, kind)
values
  ('00000000-0000-4000-8000-0000000000a1', 'Menuiserie bois — porte d''entrée', '', 'pièce', 8400, 20, 'materiel'),
  ('00000000-0000-4000-8000-0000000000a1', 'Pose et finitions', '', 'forfait', 1200, 20, 'main_oeuvre'),
  ('00000000-0000-4000-8000-0000000000a1', 'Carrelage grès cérame 60x60', '', 'm²', 180.50, 20, 'materiel');

-- One accepted quote (number given automatically) and the invoice made from it.
with q as (
  insert into public.quotes (
    id, organization_id, status, client_id, client_snapshot, company_snapshot, deposit_pct,
    total_ht, total_vat, total_ttc
  )
  select '00000000-0000-4000-8000-0000000000d1', o.id, 'accepte', '00000000-0000-4000-8000-0000000000c1',
    '{"name":"Hôtel Tanger Bay","ice":"001987654000072","city":"Tanger"}',
    jsonb_build_object('name', o.company_name, 'ice', o.ice, 'city', o.city), 30,
    10800, 2160, 12960
  from public.organizations o where o.id = '00000000-0000-4000-8000-0000000000a1'
  returning id, organization_id
)
insert into public.quote_lines (organization_id, quote_id, position, description, qty, unit, unit_price, vat_rate, kind)
select q.organization_id, q.id, l.position, l.description, l.qty, l.unit::public.unit_code, l.price, 20, l.kind::public.line_kind
from q, (values
  (0, 'Menuiserie bois — porte d''entrée', 1, 'pièce', 8400, 'materiel'),
  (1, 'Pose et finitions', 2, 'forfait', 1200, 'main_oeuvre')
) as l(position, description, qty, unit, price, kind);

insert into public.invoices (
  id, organization_id, quote_id, quote_number, client_id, client_snapshot, company_snapshot,
  due_date, total_ht, total_vat, total_ttc
)
select '00000000-0000-4000-8000-0000000000e1', q.organization_id, q.id, q.number, q.client_id,
  q.client_snapshot, q.company_snapshot, current_date + 30, q.total_ht, q.total_vat, q.total_ttc
from public.quotes q where q.id = '00000000-0000-4000-8000-0000000000d1';
insert into public.invoice_lines (organization_id, invoice_id, position, description, qty, unit, unit_price, vat_rate, kind)
select organization_id, '00000000-0000-4000-8000-0000000000e1', position, description, qty, unit, unit_price, vat_rate, kind
from public.quote_lines where quote_id = '00000000-0000-4000-8000-0000000000d1';
-- Issue it (gets FA-YYYY-001), then record the deposit.
update public.invoices set status = 'emise' where id = '00000000-0000-4000-8000-0000000000e1';
insert into public.invoice_payments (organization_id, invoice_id, amount, method, reference)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000e1', 3888, 'virement', 'Acompte 30 %');
