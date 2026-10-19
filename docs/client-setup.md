# Setting up DevisPlus for a customer

One codebase serves the three phases. What changes between customers is **configuration**, never
the code: server settings (environment variables) and the company's own settings (entered in the
app, saved per company in the database).

| Model | Who signs up | Where | `SIGNUP_MODE` |
|---|---|---|---|
| Shared app (devisplus.ma) | Anyone; free trial with 2 quotes, then the payment pop-up; you approve the company once paid | One deployment, one database, every company separated by the database rules | `approval` (default) |
| One deployment per customer (Phase 1–2) | Nobody; you create the account in the admin portal | Its own deployment, own address, own (or the customer's) database | `closed` |
| Self-service (Phase 3, later) | Anyone, accepted at once | Shared app | `open` |

Free trial: a new sign-up ("Essai gratuit" in the admin portal) uses every feature with up to
2 quotes. Creating a 3rd one opens a payment pop-up (offer, WhatsApp, email); the database also
refuses it. Click **Valider** once they have paid: the limit goes away. Refused and suspended
companies are blocked.

Each company's data (settings, logo, clients, catalogue, quotes, invoices, Google Drive
connection) is stored on the server under that company only. One company can never read or
change another's: the database refuses it (row-level security, checked by `npm run db:test`).

## Admin portal (you)

- Address: `admin.devisplus.ma` when `ADMIN_HOST=admin.devisplus.ma` is set (on that host only
  `/admin` and the sign-in page are served; `/admin` on other hosts moves there). Without
  `ADMIN_HOST`, the portal is at `/admin` on the app's own address.
- Who gets in: platform admins only. Sign up once with `contact@devisplus.ma`, then either
  - run `npm run admin:grant -- contact@devisplus.ma` (uses `DATABASE_URL_UNPOOLED` of
    `.env.local`; point it at the right database), or
  - sign in with Google using that address: an address listed in `PLATFORM_ADMIN_EMAILS`
    (default `contact@devisplus.ma`) becomes admin at its first Google sign-in, when the account
    has no password.
- Tabs: **Inscriptions** (every company, join date, last visit, setup done or not, requested
  address; Valider / Refuser / Suspendre; "Créer un compte client") and **Registre clients**
  (your sales and payments register, saved online). The red bin on an account erases it for
  good after one confirmation: the account, its company and all its data, as if it had never
  used the app (admin accounts are protected; your register entries are kept).

To serve the portal on `admin.devisplus.ma`: add the domain to the deployment (Lovable: Project
settings → Domains; Cloudflare Workers: Settings → Domains & Routes), set `ADMIN_HOST`, and add
`https://admin.devisplus.ma/api/google/callback` to the Google OAuth client's redirect URIs if you
sign in with Google there.

## Forgotten passwords

- **With an email service** (`RESEND_API_KEY` and `EMAIL_FROM` set; the sender domain verified
  in Resend): "Mot de passe oublié ?" on the sign-in page emails a link valid for 1 hour, and the
  user chooses a new password (`/reinitialiser`).
- **Without one** (default): the same page asks the user to contact you on WhatsApp or by email.
  In the admin portal, the account's **Mot de passe** button sets a temporary password, shown
  once; their open sessions are closed.
- Anyone signed in can change their password at `/mot-de-passe` (link in Paramètres and in the
  admin portal header); their other devices are signed out.

## Checklist for a new customer deployment (Phase 1–2)

1. **Database.** Pick one:
   - your Neon project: create a branch or project for the customer (`npx neon@latest`), or
   - the customer's own PostgreSQL (Neon, Supabase, any PostgreSQL 15+): they give you a
     connection string for a database whose owner role can create roles (Neon and Supabase
     allow it). This moves the database cost to the customer.

   Then apply the schema: put its direct connection in `DATABASE_URL_UNPOOLED` and run
   `npm run db:migrate` (applies each migration once, then a check that leaves no data).
2. **Deployment settings** (secrets in the host's settings, never in git; see `.env.example`):
   - `APP_URL`: the customer's address, e.g. `https://devis.client.ma`
   - `DATABASE_URL`: the pooled connection of step 1
   - `BETTER_AUTH_SECRET`: new random value (`openssl rand -base64 32`)
   - `SIGNUP_MODE=closed`
   - `VITE_SITE_URL`: same as `APP_URL` (build-time)
   - Google (optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
     `GOOGLE_REDIRECT_URI=<APP_URL>/api/google/callback`, `GOOGLE_TOKEN_ENCRYPTION_KEY` (new
     random 32 bytes). Register the callback in the Google OAuth client.
3. **Address.** Add the domain or subdomain to the deployment and the DNS record the host asks
   for (usually one CNAME).
4. **Account.** Open the admin portal of that deployment (`<APP_URL>/admin`), grant yourself
   admin there (`npm run admin:grant` on its database), then "Créer un compte client" with the
   customer's email. Copy the sign-in address, email and temporary password for the customer.
5. **Branding and settings.** Sign in as the customer (or with them) and fill the setup wizard
   and **Paramètres**: company and legal details (ICE, IF, RC, TP), logo, colours, header logo
   and button colours, contact details, document language, currency, VAT rates, payment terms,
   validity, deposit, **numbering** (prefixes, format, counter digits) and **default footer**.
   These live in the customer's own data, so changing one customer never touches another.
6. **Test**: create a quote and an invoice, download the PDF, connect Google Drive if used, and
   sign in from a second device to check the data is there.
7. **Deliver**: hand over the address and the sign-in details.

A deployment for one customer that you run for them can also use the shared database (same
`DATABASE_URL` as devisplus.ma): the companies stay separated by the database rules, and the
customer only gets their own address and branding. Separate databases are only needed when the
customer wants their data apart (or pays for their own).

## Customer's own domain on the shared app (Phase 3)

Uses Cloudflare for SaaS (custom hostnames). Off until these settings exist:

- `CLOUDFLARE_API_TOKEN`: token with "SSL and Certificates: Edit" on the zone
- `CLOUDFLARE_ZONE_ID`: the zone that serves the app (e.g. devisplus.ma)
- `CUSTOM_DOMAIN_TARGET`: the host customers point their CNAME to (e.g. `customers.devisplus.ma`),
  set up as the zone's fallback origin for custom hostnames

The app must be served through that Cloudflare zone (your own Cloudflare Workers deployment).
A Lovable-hosted deployment cannot use custom hostnames; use step 3 above instead.

Flow: the company asks for its domain in the setup wizard ("Adresse de votre espace"). In the
admin portal, its row shows the requested domain and **Activer le domaine**: the app creates the
custom hostname and shows the DNS records to give the customer (one CNAME, sometimes a TXT).
**Vérifier** follows the activation; the domain becomes "actif" once Cloudflare has verified it
and issued the certificate. Sign-in then works on that domain too. Add
`https://<domain>/api/google/callback` to the Google OAuth client if the customer signs in with
Google there (Google Drive keeps working from the main address `APP_URL`).
