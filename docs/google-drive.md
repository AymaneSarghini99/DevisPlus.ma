# Google Drive integration

A customer connects their own Google account, chooses or creates a folder, and DevisPlus then
saves their quotation and invoice PDFs there automatically.

All deployments can share **one** DevisPlus OAuth client (add each customer's callback URL to
it). Each deployment has its own encryption key, and each customer's Google access stays in
their own deployment and browser. Nothing is shared between customers.

## Automatic PDF upload

| When                                                                            | What                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A quote is saved with a status other than "Brouillon" (Envoyé, Accepté, Refusé) | Its PDF goes to `<folder>/Devis/<year>/<"10 - Octobre">/`     |
| An invoice is issued, or a payment is recorded on it                            | Its PDF goes to `<folder>/Factures/<year>/<month>/`           |
| Any saved quote or issued invoice                                               | "Enregistrer maintenant" / "Mettre à jour" sends it on demand |

- **Same PDF as "Télécharger PDF"** (`src/lib/pdf.ts`), built from the A4 preview.
- **File name**: `DV-2026-001 – Client – 12 500 DH.pdf`. The year/month come from the issue date.
- **One file per document**: an edited document **replaces the content of the same Drive file**
  (Drive keeps earlier versions under "Manage versions"). The file stays in the month folder
  where it was first created. If the file was deleted or trashed in Drive, a new one is created.
- **No duplicates**: a fingerprint of the document is compared with the last uploaded one, so a
  page refresh or a save without changes uploads nothing. Uploads run one at a time.
- **Choosing another folder** in Settings: the next upload of each document creates a new file
  in the new folder; files in the old folder are left untouched.
- **Failures** (offline, expired access, folder deleted, Google rate limit) appear on the
  document with "Réessayer". They never block saving, printing or downloading.
- **Where it shows**: a line under the toolbar of each quote and issued invoice ("Enregistré dans
  Google Drive le …", "Ouvrir"). Nothing is shown when Drive is not connected.

Limits (until the database phase): uploads happen from the open quote or invoice page, in the
browser that holds the Drive connection. A status changed elsewhere is uploaded the next time
the document is opened. Upload records are stored in that browser (`devisplus.drive`).

## How it works

| Step                                | What happens                                                                                                                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings → **Connect Google Drive** | The browser opens `GET /api/google/connect`. The server creates a random `state` and a PKCE verifier, stores them sealed in a short-lived HttpOnly cookie (10 min), and redirects to Google's consent page.                                                       |
| Google consent                      | The customer signs in **on Google's own page** (DevisPlus never sees the password) and accepts the permissions.                                                                                                                                                   |
| `GET /api/google/callback`          | The server checks `state` (constant-time, must match the cookie and not be expired), exchanges the code with the PKCE verifier and the client secret **on the server**, checks that the Drive permission was really granted, then reads the account id and email. |
| Credential storage                  | The refresh token is sealed with AES-256-GCM (`GOOGLE_TOKEN_ENCRYPTION_KEY`) and stored in an `HttpOnly; SameSite=Lax; Secure` cookie (`__Host-dp_gdrive` in production).                                                                                         |
| `GET /api/google/status`            | The server refreshes an access token with Google on every check, so a revoked or expired access shows as disconnected. It also checks the chosen folder still exists and is not in the trash.                                                                     |
| `POST /api/google/folders`          | Lists the folders the app can use, creates a new folder, or selects one. Every folder id is checked with Google on the server.                                                                                                                                    |
| `POST /api/google/disconnect`       | Revokes the grant at Google (`oauth2.googleapis.com/revoke`) and deletes the credential cookie.                                                                                                                                                                   |

Code: `src/lib/google/` (config, sealing, Google client, handlers) and
`src/routes/api/google/*.ts` (server routes). UI: `src/components/GoogleDriveSection.tsx`,
shown in **Paramètres**.

### Why the token is kept in an encrypted cookie for now

The app has **no user accounts, no Supabase and no database yet**: quotes live in the browser.
There is therefore no server-side place to store a refresh token and no server-side identity to
attach it to. The safest option that works today:

- The token is encrypted with a key that **only the server** has. The browser cannot decrypt it,
  and page scripts cannot even read it (`HttpOnly`), so an XSS bug cannot steal it.
- The connection belongs to the browser that connected it, the same way the quotes do.
  Another visitor of the deployment has no cookie, so no access to the Drive.
- `SameSite=Lax` plus an `Origin` check and a JSON content type on every POST protect against
  cross-site requests (CSRF).
- No token, authorization code or secret is ever logged or sent to the page.

Limits: the connection is per browser (connecting on a second computer means connecting again
there), and clearing the browser's cookies disconnects it. When accounts and Supabase arrive,
the same sealed value moves to a server-only table (schema below).

### Scope choice: `drive.file`

Requested scopes: `openid`, `email` (to show which account is connected) and
`https://www.googleapis.com/auth/drive.file`.

`drive.file` is the narrowest Drive scope and is **non-sensitive**: no Google security assessment
is needed. The trade-off is that DevisPlus can only see the files and folders **it created**
(or that the user explicitly opens with it). That is why the folder step offers:

- **Create a folder** (default name "DevisPlus - Devis"), which is always possible, and
- **Choose among folders DevisPlus created earlier** in that Drive.

Picking **any existing folder** of the Drive would need either the **Google Picker** (works with
`drive.file`, but needs an API key, an extra Picker API setup and a browser-side widget) or
the full `drive` scope (restricted: Google security assessment, and access to all the customer's
files). Neither is enabled; the Picker is the recommended next step if customers ask for it.

## Google Cloud setup (per customer)

Do this in **the customer's** Google Cloud account, or yours if you manage it for them.

1. **Project**: open <https://console.cloud.google.com/>, then select or create a project
   (e.g. `devisplus-atlas`).
2. **Enable the API**: APIs & Services → Library → **Google Drive API** → Enable.
3. **OAuth consent screen** (Google Auth Platform → Branding / Audience / Data access):
   - App name: the customer's company name (or "DevisPlus – <company>").
   - Support email and developer contact email.
   - Authorized domain: the deployment's domain (e.g. `devisplus.ma`).
   - Data access → add scopes `openid`, `.../auth/userinfo.email` and `.../auth/drive.file`.
   - Audience: **External**. While the app is in **Testing**, only the listed test users can
     connect, and Google expires their refresh tokens after **7 days**. Click **Publish app**
     for production. With these non-sensitive scopes, publishing needs no verification, but
     Google may ask for brand verification (logo, privacy policy URL, home page URL).
     Use `https://<deployment>/privacy` and `https://<deployment>/`.
4. **OAuth client**: Clients → Create client → **Web application**.
   - Authorized redirect URIs (exact match, no trailing slash):
     - production: `https://<customer-domain>/api/google/callback`
     - local dev: `http://localhost:8080/api/google/callback` (use the port `npm run dev` prints)
   - Authorized JavaScript origins are not needed (the flow is server-side).
   - Copy the **Client ID** and **Client secret**.

## Environment variables

See `.env.example`. All are **server-side**: never prefix them with `VITE_`.

| Variable                      | Example                                          | Notes                                                                                                           |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `APP_URL`                     | `https://atlas.devisplus.ma`                     | Public origin of this deployment. Used for CSRF checks and cookie security.                                     |
| `GOOGLE_CLIENT_ID`            | `…apps.googleusercontent.com`                    | From the OAuth client.                                                                                          |
| `GOOGLE_CLIENT_SECRET`        |                                                  | Secret.                                                                                                         |
| `GOOGLE_REDIRECT_URI`         | `https://atlas.devisplus.ma/api/google/callback` | Must equal `APP_URL` + `/api/google/callback`, and be registered in Google. The server refuses any other value. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | 32 random bytes, base64                          | Secret, unique per deployment. Rotating it disconnects Drive (customers reconnect).                             |

Generate the key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Local dev**: copy `.env.example` to `.env.local`, fill it in, then (re)start `npm run dev` and open
<http://localhost:8080/parametres>. `.env` and `.env.local` are git-ignored.

**Production (Cloudflare Workers, the default build target)**: set the values on the Worker,
never in the repository:

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_TOKEN_ENCRYPTION_KEY
```

Set `APP_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_REDIRECT_URI` as variables, or as secrets too. With
the `nodejs_compat` flag (already set in the build), they are available to the server as
`process.env`. If a variable is missing or invalid, Settings shows "not configured" with the
variable names (never their values).

## Testing end to end (needs real credentials)

1. Fill `.env.local` (dev) or the Worker secrets (prod) as above.
2. Open **Paramètres** → Google Drive → **Connect Google Drive**, sign in, then accept.
   Back on Paramètres: "Google Drive connecté" and the account email.
3. Click **Créer le dossier**: the folder appears in drive.google.com, and Paramètres shows it.
4. Move the folder to the trash in Drive, then reload Paramètres: "Le dossier choisi est
   introuvable". Choose or create another folder.
5. Revoke the app at <https://myaccount.google.com/permissions>, then reload Paramètres: it shows
   "not connected" with the "access revoked" message.
6. Connect again, click **Déconnecter**: the app disappears from the Google permissions page.
7. Cancel on Google's consent page: Paramètres shows "Connexion annulée".

Automated tests (`npm test`) mock Google and need no credentials: `src/lib/google/*.test.ts`.

## Next phase: database, upload tracking, automatic PDF upload

### Recommended schema (Supabase, one project per customer)

Applied as versioned migrations in `supabase/migrations/` once Supabase and accounts exist:

```sql
-- One Google connection per owner (auth.users).
create table public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  google_sub text not null,
  google_email text,
  status text not null default 'connected' check (status in ('connected','revoked','error')),
  folder_id text,
  folder_name text,
  scopes text[] not null default '{}',
  last_upload_at timestamptz,
  last_error text,                          -- safe code only, never a Google payload
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);
-- Secret part kept apart: no grants to anon/authenticated, server (service role) only.
create table private.google_drive_credentials (
  connection_id uuid primary key references public.google_drive_connections(id) on delete cascade,
  sealed_refresh_token text not null,      -- AES-GCM, key in the deployment secrets
  updated_at timestamptz not null default now()
);
create table public.quote_drive_uploads (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  connection_id uuid not null references public.google_drive_connections(id) on delete cascade,
  drive_file_id text,
  file_name text not null,
  status text not null default 'pending' check (status in ('pending','uploaded','failed')),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  uploaded_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, connection_id)         -- one file per quote and destination
);
```

RLS: owners can read their own connection metadata and their uploads (`owner_id = auth.uid()`,
through the quote's owner for uploads). Writes go through the server only. The `private`
schema is not exposed by the API.

Prerequisite: quotes must move from the browser (`localStorage`) to a `quotes` table owned by
`auth.users`, otherwise the server cannot verify who owns a quote before uploading it.

### PDF upload (implemented, see top of this page)

- **PDF bytes**: "Télécharger PDF" already builds the real PDF in the browser
  (`src/lib/pdf.ts`, html-to-image + jsPDF). The upload can reuse those exact bytes, so the
  customer gets the same file they download. "PDF / Imprimer" and "Télécharger PDF" stay
  unchanged.
- **Trigger**: when a quote is marked final ("Envoyé"), not on every save.
- **Flow**: the browser builds the PDF and `POST`s it to a new `/api/google/upload` route. The
  server checks the connection and folder, uploads with a multipart `files.create` into the
  folder, and records the Drive file id.
- **Idempotency**: an upload key per quote and folder; if a file id already exists, a re-send
  **updates that file** (`files.update`) instead of creating a duplicate. Editing a quote after
  upload therefore replaces the Drive copy with the latest version.
- **Failures** (offline, revoked, folder missing, rate limit) are shown on the quote with a
  "Réessayer" button, and never block saving or downloading.
