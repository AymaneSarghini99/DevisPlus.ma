-- DevisPlus.ma: core schema (multi-tenant).
-- Every business table carries organization_id; access is limited by RLS (see the rls migration).
-- Values of the enums below match the ones used by the app (src/lib/*.ts).

-- ---------------------------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.sector as enum (
  'btp', 'hvac', 'electricity', 'plumbing', 'carpentry', 'cleaning', 'it', 'consulting',
  'marketing', 'events', 'transport', 'retail', 'industry', 'health', 'other'
);
create type public.currency_code as enum ('MAD', 'EUR', 'USD');
create type public.locale_code as enum ('fr', 'en', 'ar');
create type public.doc_template as enum (
  'classic', 'premium', 'btp', 'services', 'zellige', 'marche', 'bilingue', 'commercial'
);
create type public.unit_code as enum ('pièce', 'heure', 'jour', 'm²', 'm³', 'ml', 'kg', 'forfait');
create type public.line_kind as enum ('materiel', 'main_oeuvre', 'service');
create type public.quote_status as enum ('brouillon', 'envoye', 'accepte', 'refuse');
create type public.invoice_status as enum ('brouillon', 'emise');
create type public.invoice_kind as enum ('facture', 'avoir');
create type public.payment_method as enum ('virement', 'cheque', 'especes', 'carte', 'effet', 'autre');
create type public.reminder_channel as enum ('whatsapp', 'autre');
create type public.domain_mode as enum ('subdomain', 'custom');
create type public.domain_state as enum ('none', 'pending', 'active');
create type public.onboarding_step as enum ('profile', 'logo', 'branding', 'quotes', 'domain', 'review');
create type public.doc_type as enum ('DV', 'FA');
create type public.drive_doc_type as enum ('devis', 'facture');
create type public.customer_status as enum ('lead', 'awaiting', 'paid', 'active', 'cancelled');

-- Shared value checks.
create domain public.pct as numeric(5, 2) check (value between 0 and 100);
create domain public.money as numeric(12, 2) check (value >= 0);
create domain public.hex_color as text check (value ~ '^#[0-9A-Fa-f]{6}$');

-- ---------------------------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  -- URL-friendly name, used for the DevisPlus subdomain (e.g. climatizone).
  slug text unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),

  -- Company identity (printed on documents).
  company_name text not null default '',
  legal_name text not null default '',
  sector public.sector,
  ice text not null default '' check (ice = '' or ice ~ '^\d{15}$'),
  if_number text not null default '',
  rc text not null default '',
  tp text not null default '',
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  contact_name text not null default '',
  bank_name text not null default '',
  rib text not null default '' check (rib = '' or replace(rib, ' ', '') ~ '^\d{24}$'),
  currency public.currency_code not null default 'MAD',
  language public.locale_code not null default 'fr',

  -- Defaults for new documents.
  logo_path text,
  accent_color public.hex_color not null default '#14213D',
  template public.doc_template not null default 'classic',
  validity_days int not null default 30 check (validity_days between 1 and 365),
  deposit_pct public.pct not null default 30,
  default_vat public.pct not null default 20,
  vat_rates numeric(5, 2)[] not null default '{20,10,0}',
  doc_language public.locale_code not null default 'fr',
  payment_terms text not null default '',
  watermark jsonb,
  default_custom_template_id uuid,

  -- Look of the workspace (app pages only; null = DevisPlus default).
  app_logo_path text,
  app_button_color public.hex_color,
  app_line_color public.hex_color,

  -- Address of the workspace (activated by the DevisPlus team).
  domain_mode public.domain_mode not null default 'subdomain',
  subdomain text unique check (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  custom_domain text unique check (custom_domain = lower(custom_domain)),
  domain_state public.domain_state not null default 'none',
  domain_requested_at timestamptz,

  -- Setup wizard.
  onboarding_step public.onboarding_step not null default 'profile',
  onboarding_completed public.onboarding_step[] not null default '{}',
  onboarding_started_at timestamptz not null default now(),
  onboarding_finished_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint default_vat_offered check (default_vat = any (vat_rates))
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------------------------
-- Business data
-- ---------------------------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null default '',
  ice text not null default '' check (ice = '' or ice ~ '^\d{15}$'),
  if_number text not null default '',
  rc text not null default '',
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  email text not null default '',
  contact_name text not null default '',
  payment_terms text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index clients_org_idx on public.clients (organization_id, lower(name));

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text not null default '',
  unit public.unit_code not null default 'pièce',
  unit_price public.money not null default 0,
  vat_rate public.pct not null default 20,
  kind public.line_kind,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The Excel/CSV import updates existing items by name.
create index catalog_items_org_name_idx on public.catalog_items (organization_id, lower(name));

create table public.custom_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null default '',
  base_template public.doc_template not null default 'classic',
  accent_color public.hex_color not null default '#14213D',
  -- font, title, showLogo, showWords, showBank, showSignature, footerNote
  style jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
alter table public.organizations
  add constraint organizations_default_custom_template_fk
  foreign key (default_custom_template_id) references public.custom_templates (id) on delete set null;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Given by next_document_number() when left empty (DV-YYYY-NNN).
  number text not null,
  status public.quote_status not null default 'brouillon',
  issue_date date not null default current_date,
  valid_until date,
  -- First time the status became "envoye"; never changes afterwards.
  sent_at timestamptz,
  client_id uuid,
  client_snapshot jsonb not null default '{}',
  company_snapshot jsonb not null default '{}',
  global_discount_pct public.pct not null default 0,
  deposit_pct public.pct not null default 0,
  payment_terms text not null default '',
  delivery text not null default '',
  exemption_note text not null default '',
  template public.doc_template not null default 'classic',
  accent_color public.hex_color not null default '#14213D',
  watermark jsonb,
  style jsonb,
  custom_template_id uuid,
  doc_language public.locale_code not null default 'fr',
  -- Totals computed by the app (integer-centime maths) and stored for lists and reports.
  total_ht public.money not null default 0,
  total_vat public.money not null default 0,
  total_ttc public.money not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (id, organization_id),
  foreign key (client_id, organization_id) references public.clients (id, organization_id)
    on delete set null (client_id),
  foreign key (custom_template_id, organization_id)
    references public.custom_templates (id, organization_id) on delete set null (custom_template_id)
);
create index quotes_org_date_idx on public.quotes (organization_id, issue_date desc);
create index quotes_client_idx on public.quotes (client_id);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quote_id uuid not null,
  position int not null default 0,
  description text not null default '',
  qty numeric(12, 3) not null default 1 check (qty >= 0),
  unit public.unit_code not null default 'pièce',
  unit_price public.money not null default 0,
  discount_pct public.pct not null default 0,
  -- Stored per line, never recalculated from the catalogue or the settings.
  vat_rate public.pct not null default 20,
  kind public.line_kind,
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id)
    on delete cascade
);
create index quote_lines_quote_idx on public.quote_lines (quote_id, position);

create table public.quote_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quote_id uuid not null,
  -- The user prepared a follow-up; never proof that it was delivered.
  reminded_on date not null default current_date,
  channel public.reminder_channel not null default 'whatsapp',
  created_at timestamptz not null default now(),
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id)
    on delete cascade
);
create index quote_reminders_quote_idx on public.quote_reminders (quote_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.invoice_kind not null default 'facture',
  -- Empty while a draft; given when issued (FA-YYYY-NNN), then never changes.
  number text,
  status public.invoice_status not null default 'brouillon',
  issue_date date,
  due_date date,
  issued_at timestamptz,
  quote_id uuid,
  quote_number text not null default '',
  related_invoice_id uuid,
  client_id uuid,
  client_snapshot jsonb not null default '{}',
  company_snapshot jsonb not null default '{}',
  global_discount_pct public.pct not null default 0,
  payment_terms text not null default '',
  delivery text not null default '',
  exemption_note text not null default '',
  template public.doc_template not null default 'classic',
  accent_color public.hex_color not null default '#14213D',
  watermark jsonb,
  style jsonb,
  doc_language public.locale_code not null default 'fr',
  total_ht public.money not null default 0,
  total_vat public.money not null default 0,
  total_ttc public.money not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (id, organization_id),
  constraint invoice_number_when_issued check (
    (status = 'brouillon' and number is null and issued_at is null)
    or (status = 'emise' and number is not null and issued_at is not null and issue_date is not null)
  ),
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id)
    on delete set null (quote_id),
  foreign key (related_invoice_id, organization_id) references public.invoices (id, organization_id),
  foreign key (client_id, organization_id) references public.clients (id, organization_id)
    on delete set null (client_id)
);
create index invoices_org_date_idx on public.invoices (organization_id, issue_date desc);
create index invoices_quote_idx on public.invoices (quote_id);
create index invoices_client_idx on public.invoices (client_id);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null,
  position int not null default 0,
  description text not null default '',
  qty numeric(12, 3) not null default 1 check (qty >= 0),
  unit public.unit_code not null default 'pièce',
  unit_price public.money not null default 0,
  discount_pct public.pct not null default 0,
  vat_rate public.pct not null default 20,
  kind public.line_kind,
  foreign key (invoice_id, organization_id) references public.invoices (id, organization_id)
    on delete cascade
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id, position);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null,
  paid_on date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  method public.payment_method not null default 'virement',
  reference text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (invoice_id, organization_id) references public.invoices (id, organization_id)
    on delete cascade
);
create index invoice_payments_invoice_idx on public.invoice_payments (invoice_id);

-- Last number used per organization, document type and year (see next_document_number).
create table public.document_sequences (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  doc_type public.doc_type not null,
  year int not null check (year between 2000 and 2999),
  last_value int not null default 0 check (last_value >= 0),
  primary key (organization_id, doc_type, year)
);

-- ---------------------------------------------------------------------------------------------
-- Google Drive (written by the server; the browser only reads the status)
-- ---------------------------------------------------------------------------------------------
create table public.drive_connections (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  google_sub text not null,
  google_email text not null default '',
  -- Encrypted by the server (AES-GCM, GOOGLE_TOKEN_ENCRYPTION_KEY); never readable by browsers.
  refresh_token_sealed text not null,
  scope text not null default '',
  folder_id text,
  folder_name text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drive_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  doc_type public.drive_doc_type not null,
  doc_id uuid not null,
  file_id text,
  web_link text,
  folder_id text,
  content_hash text not null default '',
  uploaded_at timestamptz,
  error_code text,
  attempts int not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  unique (doc_type, doc_id)
);
create index drive_uploads_org_idx on public.drive_uploads (organization_id);

-- ---------------------------------------------------------------------------------------------
-- DevisPlus owner back-office (/admin)
-- ---------------------------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.business_customers (
  id uuid primary key default gen_random_uuid(),
  company text not null default '',
  contact text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  ice text not null default '' check (ice = '' or ice ~ '^\d{15}$'),
  subdomain text not null default '',
  custom_domain text not null default '',
  domain_state public.domain_state not null default 'none',
  -- Agreed price in MAD (the Business offer is a one-time payment of 2 500 MAD).
  price public.money not null default 2500,
  status public.customer_status not null default 'lead',
  requested_on date not null default current_date,
  notes text not null default '',
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_customer_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.business_customers (id) on delete cascade,
  paid_on date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  method public.payment_method not null default 'virement',
  reference text not null default '',
  created_at timestamptz not null default now()
);
create index business_customer_payments_customer_idx
  on public.business_customer_payments (customer_id);

-- ---------------------------------------------------------------------------------------------
-- Audit trail (written by triggers only)
-- ---------------------------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid,
  entity text not null,
  entity_id uuid,
  action text not null,
  at timestamptz not null default now(),
  details jsonb
);
create index audit_log_org_idx on public.audit_log (organization_id, at desc);
