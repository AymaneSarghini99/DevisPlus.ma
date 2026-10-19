# DevisPlus.ma: database build prompt

> **Update (2026-10-19):** the database is hosted on **Neon** (plain Postgres) instead of
> Supabase. The tables and rules below are unchanged; sign-in uses **Better Auth** in the app's
> server, and files will go to object storage (Cloudflare R2 or Neon). See `db/README.md`.

Copy everything under "Prompt" into the tool that will build the database (Lovable with
Supabase, Claude Code, or a developer). It is written from the app as it is today
(branch `feature/devis-gestion-complete`): every table below matches data the app already
stores in the browser.

---

## Prompt

You are adding a real database to **DevisPlus.ma**, a Moroccan quote and invoice web app
(TanStack Start + React 19, deployed on Cloudflare Workers, interface in French / English /
Arabic). Today **all data lives in the browser's localStorage**, one browser = one company.
Move it to **Supabase (Postgres + Auth + Storage)** so a company's data follows its account
on any device, without changing what the user sees or how the screens work.

### Ground rules

- Do not change the UI, the routes or the existing workflows. Only replace where data is
  read and written. Keep every validation rule and every French/English/Arabic text.
- **Multi-tenant**: one database for all client companies. Every business table has
  `organization_id` and Row Level Security (RLS): a user only ever sees the rows of the
  organizations they belong to.
- Money: `numeric(12,2)` in MAD (no floats). Quantities `numeric(12,3)`. Percentages
  `numeric(5,2)`. The app already computes totals in integer centimes; keep that logic in the
  app and also store the totals on each document for listing and reports.
- VAT is stored **per line** and never recalculated from the catalogue or the settings.
  Rates offered since 2026: 20 % and 10 % (0 % for exempt lines); older documents may keep
  14 % or 7 %.
- Documents keep a **snapshot** of the company and client details at the time they were made
  (`company_snapshot`, `client_snapshot` as jsonb), plus an optional `client_id` link.
  Editing a client or the company profile never changes past documents.
- Timestamps `timestamptz` with `created_at` / `updated_at` (trigger). Primary keys `uuid`
  (`gen_random_uuid()`).
- Write everything as **SQL migration files** (Supabase CLI format), reviewable and
  re-runnable on a fresh project. Generate TypeScript types from the schema.
- Never expose the service-role key or Google refresh tokens to the browser.

### Tables

**Accounts**

1. `profiles`: `id` (= `auth.users.id`), `email`, `full_name`, `created_at`.
2. `organizations` (one per client company; today's "tenant" + "settings" merged):
   - identity: `slug` (unique, used for the subdomain), `company_name`, `legal_name`,
     `sector` (btp, hvac, electricity, plumbing, carpentry, cleaning, it, consulting,
     marketing, events, transport, retail, industry, health, other), `ice` (15 digits),
     `if_number`, `rc`, `tp`, `address`, `city`, `phone`, `email`, `website`, `contact_name`,
     `bank_name`, `rib` (24 digits), `currency` (MAD, EUR, USD), `language` (fr, en, ar);
   - document defaults: `logo_path` (Storage), `accent_color`, `template` (classic,
     premium, btp, services, zellige, marche, bilingue, commercial), `validity_days`
     (1–365, default 30), `deposit_pct` (default 30), `default_vat` (default 20),
     `vat_rates numeric[]` (default {20,10,0}), `doc_language`, `payment_terms`,
     `watermark jsonb`, `default_custom_template_id`;
   - workspace look (app pages only): `app_logo_path`, `app_button_color`,
     `app_line_color` (hex or null = default);
   - address of the workspace: `domain_mode` (subdomain, custom), `subdomain` (unique),
     `custom_domain` (unique), `domain_state` (none, pending, active),
     `domain_requested_at`;
   - setup wizard: `onboarding_step` (profile, logo, branding, quotes, domain, review),
     `onboarding_completed text[]`, `onboarding_started_at`, `onboarding_finished_at`.
3. `memberships`: `organization_id`, `user_id`, `role` (owner, admin, member),
   unique (organization_id, user_id). Today each company has one owner; keep the table so
   staff accounts can be added later.

**Business data** (all with `organization_id`)

4. `clients`: `name`, `ice`, `if_number`, `rc`, `address`, `city`, `phone`, `email`,
   `contact_name`, `payment_terms`.
5. `catalog_items`: `name`, `description`, `unit` (pièce, heure, jour, m², m³, ml, kg,
   forfait), `unit_price`, `vat_rate`, `kind` (materiel, main_oeuvre, service, or null).
   Index on (organization_id, lower(name)): the Excel/CSV import updates items by name.
6. `custom_templates`: `name`, `base_template`, `accent_color`, `style jsonb` (font, title,
   showLogo, showWords, showBank, showSignature, footerNote).
7. `quotes`: `number` (unique per organization, e.g. DV-2026-001), `status` (brouillon,
   envoye, accepte, refuse), `issue_date`, `valid_until`, `sent_at`, `client_id`,
   `client_snapshot`, `company_snapshot`, `global_discount_pct`, `deposit_pct`,
   `payment_terms`, `delivery`, `exemption_note`, `template`, `accent_color`,
   `watermark jsonb`, `style jsonb`, `custom_template_id`, `doc_language`, `total_ht`,
   `total_vat`, `total_ttc`.
8. `quote_lines`: `quote_id` (cascade), `position`, `description`, `qty`, `unit`,
   `unit_price`, `discount_pct`, `vat_rate`, `kind`.
9. `quote_reminders`: `quote_id` (cascade), `reminded_on`, `channel` (whatsapp, autre).
   A reminder records that the user prepared a follow-up, never proof it was delivered.
10. `invoices`: `kind` (facture, avoir), `number` (null while draft; unique per organization
    once set, e.g. FA-2026-001), `status` (brouillon, emise), `issue_date`, `due_date`,
    `issued_at`, `quote_id`, `quote_number`, `related_invoice_id`, the same snapshot, design
    and total columns as quotes.
11. `invoice_lines`: same columns as `quote_lines`, with `invoice_id`.
12. `invoice_payments`: `invoice_id`, `paid_on`, `amount`, `method` (virement, cheque,
    especes, carte, effet, autre), `reference`, `note`.
13. `document_sequences`: `organization_id`, `doc_type` (DV, FA), `year`, `last_value`;
    primary key (organization_id, doc_type, year).

**Google Drive** (server access only)

14. `drive_connections`: one per organization: `google_sub`, `google_email`,
    `refresh_token` (encrypted, e.g. Supabase Vault or pgsodium; never selectable by the
    browser), `scope`, `folder_id`, `folder_name`, `connected_at`.
15. `drive_uploads`: `doc_type` (devis, facture), `doc_id`, `file_id`, `web_link`,
    `folder_id`, `content_hash`, `uploaded_at`, `error_code`, `attempts`;
    unique (doc_type, doc_id).

**DevisPlus owner back-office** (today's /admin page; only platform admins)

16. `platform_admins`: `user_id`.
17. `business_customers`: companies that asked for the Business offer: `company`, `contact`,
    `email`, `phone`, `city`, `ice`, `subdomain`, `custom_domain`, `domain_state`, `price`
    (default 2500 MAD, one-time), `status` (lead, awaiting, paid, active, cancelled),
    `requested_on`, `notes`, optional `organization_id` once their workspace exists.
18. `business_customer_payments`: `customer_id`, `paid_on`, `amount`, `method`,
    `reference`.

**Optional, recommended:** `audit_log` (`organization_id`, `user_id`, `entity`,
`entity_id`, `action`, `at`, `details jsonb`), written by triggers on invoices and
payments.

### Rules to enforce in the database

- **Numbering, no gaps and no reuse**: SQL function `next_document_number(org, doc_type)`
  that locks the `document_sequences` row (`select … for update`) and returns
  `DV-YYYY-NNN` / `FA-YYYY-NNN`. Quotes get their number when created. Invoices get theirs
  **only when issued** (status brouillon → emise), inside the same transaction.
- **Issued invoices are locked**: a trigger refuses any update of lines, amounts, client,
  company or number once `status = 'emise'`, and refuses deleting them. Only payments can be
  added. Drafts can be edited and deleted.
- A quote's `sent_at` is set the first time its status becomes `envoye` and never changes
  after.
- Check constraints: percentages 0–100, quantities and prices ≥ 0, ICE = 15 digits when
  present, RIB = 24 digits when present, hex colours.
- RLS on every table: select / insert / update / delete only where
  `is_member(organization_id)`; owner-only for organization settings, members and Drive;
  `platform_admins` only for the back-office tables. Write the helper functions
  `is_member(org uuid)` and `is_platform_admin()` as `security definer`.

### Auth

- Supabase Auth with **email + password** and **Google** (the app already has a
  "Continuer avec Google" button on /inscription and /connexion). Keep the current pages and
  texts; replace the local accounts (password hash stored in the browser) with Supabase
  sessions.
- On sign-up: create the `profile`, an `organization` and an `owner` membership, then send
  the user to the setup wizard (/onboarding), exactly as today. Returning users go to
  /connexion?next=… and back to the page they asked for.
- The Google Drive connection stays a **separate** consent (scope `drive.file`, offline
  access) handled by the server routes under /api/google/*; store its refresh token in
  `drive_connections` instead of the current sealed cookie.

### Storage

- Bucket `logos` (private): `{organization_id}/document-logo.png` and
  `{organization_id}/header-logo.png`, served through signed URLs. Today logos are data URLs
  in localStorage; upload them instead.
- Bucket `documents` (private, optional): generated PDFs at
  `{organization_id}/{devis|factures}/{year}/{number}.pdf`.

### Moving existing browser data

Add a one-time "Importer les données de ce navigateur" action after sign-in. It reads these
localStorage keys and inserts them into the new tables for the user's organization, then
keeps a backup and stops using them: `devisplus.tenant`, `devisplus.settings`,
`devisplus.clients`, `devisplus.catalog`, `devisplus.quotes`, `devisplus.invoices`,
`devisplus.drive`. Keep document numbers as they are and set `document_sequences` to the
highest existing number per year. The owner back-office keys (`devisplus.owner`,
`devisplus.customers`) are imported separately by the platform admin.

### Order of work

1. Migrations: enums, tables, indexes, constraints, triggers, numbering function, RLS
   policies. Add seed data for one demo organization.
2. Tests on the database: RLS (a user of company A cannot read company B), numbering under
   two simultaneous issues, issued invoice cannot be edited or deleted.
3. Auth: sign-up, sign-in, Google, sign-out, wired to the existing pages.
4. Data layer: replace the localStorage functions in `src/lib/store.ts`, `quotes.ts`,
   `invoices.ts`, `tenant.ts`, `customers.ts` and `driveSync.ts` with Supabase queries
   behind the same function names (they become async), screen by screen, keeping the app
   working after each step.
5. Browser data import, then remove the localStorage storage.

Deliver: the migration files, the generated types, the updated data layer, and a short
README explaining how to create a new Supabase project and apply the migrations.
