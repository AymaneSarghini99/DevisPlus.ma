/**
 * The DevisPlus owner's admin portal on the server (/api/admin/*). Never import from browser code.
 *
 * Who is an admin: a row in public.platform_admins. It is added with `npm run admin:grant`, or
 * automatically at the first sign-in with Google of an address listed in PLATFORM_ADMIN_EMAILS
 * (default contact@devisplus.ma): Google has verified that address, and the account has no
 * password that someone else could have set before.
 */
import type { Pool } from "@neondatabase/serverless";
import { sessionUserOn, type SessionUser } from "@/lib/account/server";
import { hashPassword } from "@/lib/account/password";
import { asServer, asUser, json, pgError, sameOrigin, withPool, type Db } from "@/lib/db/server";
import { deploymentFrom } from "@/lib/deployment";
import {
  cleanHostname,
  cloudflareConfig,
  CloudflareError,
  createHostname,
  deleteHostname,
  getHostname,
} from "@/lib/domains/cloudflare";
import { readEnv } from "@/lib/google/config";
import { applyOps, writeError } from "@/lib/workspace/server";
import { PLATFORM_KEYS, validOps } from "@/lib/workspace/keys";

export async function isPlatformAdmin(pool: Pool, user: SessionUser) {
  const { rows } = await pool.query("select 1 from public.platform_admins where user_id = $1", [
    user.id,
  ]);
  if (rows.length) return true;
  const listed = deploymentFrom(readEnv()).adminEmails.includes(user.email.toLowerCase());
  if (!listed || !user.emailVerified) return false;
  const { rows: methods } = await pool.query<{ provider_id: string }>(
    "select provider_id from auth.accounts where user_id = $1",
    [user.id],
  );
  if (!methods.length || methods.some((m) => m.provider_id !== "google")) return false;
  await pool.query(
    "insert into public.platform_admins (user_id) values ($1) on conflict do nothing",
    [user.id],
  );
  return true;
}

async function withAdmin(
  request: Request,
  fn: (pool: Pool, user: SessionUser) => Promise<Response>,
): Promise<Response> {
  const res = await withPool(async (pool) => {
    const user = await sessionUserOn(pool, request);
    if (!user) return json({ error: "signed_out" }, 401);
    if (!(await isPlatformAdmin(pool, user)))
      return json({ error: "not_admin", email: user.email }, 403);
    return fn(pool, user);
  });
  return res ?? json({ error: "not_configured" }, 503);
}

// ---------- accounts ----------

export type AccountRow = {
  orgId: string;
  createdAt: string;
  approval: "pending" | "approved" | "rejected" | "suspended";
  approvalChangedAt: string | null;
  note: string;
  company: string;
  phone: string;
  city: string;
  setupDone: boolean;
  requestedDomain: { mode: string; subdomain: string; customDomain: string } | null;
  domainState: "none" | "pending" | "active";
  customDomain: string;
  hostnameId: string;
  userId: string;
  email: string;
  name: string;
  joinedAt: string | null;
  methods: string[];
  lastSeen: string | null;
  isAdmin: boolean;
};

const ACCOUNTS_SQL = `
  select o.id as "orgId", o.created_at as "createdAt", o.approval_status as approval,
    o.approval_changed_at as "approvalChangedAt", o.approval_note as note,
    coalesce(nullif(o.company_name, ''), t.value #>> '{profile,companyName}', '') as company,
    coalesce(t.value #>> '{profile,phone}', '') as phone,
    coalesce(t.value #>> '{profile,city}', '') as city,
    (t.value #>> '{onboarding,finishedAt}') is not null as "setupDone",
    t.value -> 'domain' as "requestedDomain",
    o.domain_state as "domainState", coalesce(o.custom_domain, '') as "customDomain",
    coalesce(o.custom_hostname_id, '') as "hostnameId",
    coalesce(u.id::text, '') as "userId", coalesce(u.email, '') as email, coalesce(u.name, '') as name,
    u.created_at as "joinedAt",
    coalesce((select array_agg(distinct a.provider_id) from auth.accounts a where a.user_id = u.id), '{}') as methods,
    (select max(s.updated_at) from auth.sessions s where s.user_id = u.id) as "lastSeen",
    exists (select 1 from public.platform_admins p where p.user_id = u.id) as "isAdmin"
  from public.organizations o
  left join lateral (
    select m.user_id from public.memberships m
    where m.organization_id = o.id order by (m.role = 'owner') desc, m.created_at limit 1
  ) m on true
  left join auth.users u on u.id = m.user_id
  left join public.workspace_data t on t.organization_id = o.id and t.key = 'tenant'
  order by o.created_at desc`;

const listAccounts = (db: Db) => db.query<AccountRow>(ACCOUNTS_SQL).then((r) => r.rows);

/** GET /api/admin/accounts — every company with its owner, newest first. */
export const handleAccountsGet = (request: Request) =>
  withAdmin(request, async (pool, user) =>
    json({
      me: user.email,
      domains: !!cloudflareConfig(readEnv()),
      signupMode: deploymentFrom(readEnv()).signupMode,
      accounts: await asServer(pool, listAccounts),
    }),
  );

const STATUS_OF = { approve: "approved", reject: "rejected", suspend: "suspended" } as const;
const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = Record<string, unknown>;
const str = (b: Body, k: string, max = 200) =>
  typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : "";

async function setApproval(db: Db, b: Body) {
  const status = STATUS_OF[b["action"] as keyof typeof STATUS_OF];
  const { rowCount } = await db.query(
    `update public.organizations
     set approval_status = $2, approval_changed_at = now(), approval_note = $3
     where id = $1`,
    [str(b, "orgId", 64), status, str(b, "note", 500)],
  );
  return rowCount ? null : json({ error: "not_found" }, 404);
}

/** A customer account made by the DevisPlus team: approved at once, password to hand over. */
async function createAccount(db: Db, b: Body) {
  const email = str(b, "email").toLowerCase();
  const password = typeof b["password"] === "string" ? (b["password"] as string) : "";
  if (!EMAIL.test(email)) return json({ error: "email" }, 400);
  if (password.length < MIN_PASSWORD || password.length > 128)
    return json({ error: "password" }, 400);
  const taken = await db.query("select 1 from auth.users where lower(email) = $1", [email]);
  if (taken.rowCount) return json({ error: "exists" }, 409);
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, name, email_verified) values ($1, $2, false) returning id",
    [email, str(b, "name")],
  );
  const userId = rows[0]!.id;
  await db.query(
    `insert into auth.accounts (user_id, account_id, provider_id, password)
     values ($1, $2, 'credential', $3)`,
    [userId, userId, await hashPassword(password)],
  );
  const org = await db.query<{ id: string }>(
    `insert into public.organizations (company_name, email, approval_status, approval_changed_at)
     values ($1, $2, 'approved', now()) returning id`,
    [str(b, "company"), email],
  );
  await db.query(
    "insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'owner')",
    [org.rows[0]!.id, userId],
  );
  return null;
}

/**
 * New temporary password for an account (the customer forgot theirs), to hand over. Their other
 * sign-in methods (Google) stay; every open session is closed.
 */
async function resetPassword(db: Db, b: Body) {
  const userId = str(b, "userId", 64);
  const password = typeof b["password"] === "string" ? (b["password"] as string) : "";
  if (password.length < MIN_PASSWORD || password.length > 128)
    return json({ error: "password" }, 400);
  const user = await db.query("select 1 from auth.users where id = $1", [userId]);
  if (!user.rowCount) return json({ error: "not_found" }, 404);
  const hash = await hashPassword(password);
  const updated = await db.query(
    "update auth.accounts set password = $2, updated_at = now() where user_id = $1 and provider_id = 'credential'",
    [userId, hash],
  );
  if (!updated.rowCount)
    await db.query(
      `insert into auth.accounts (user_id, account_id, provider_id, password)
       values ($1, $2, 'credential', $3)`,
      [userId, userId, hash],
    );
  await db.query("delete from auth.sessions where user_id = $1", [userId]);
  return null;
}

/** Cloudflare custom hostname: activate the requested domain, check it, or remove it. */
async function domainAction(db: Db, b: Body) {
  const cf = cloudflareConfig(readEnv());
  if (!cf) return json({ error: "domains_off" }, 503);
  const orgId = str(b, "orgId", 64);
  const { rows } = await db.query<{ custom_hostname_id: string | null }>(
    "select custom_hostname_id from public.organizations where id = $1",
    [orgId],
  );
  if (!rows.length) return json({ error: "not_found" }, 404);
  const current = rows[0]!.custom_hostname_id;
  try {
    if (b["action"] === "domainRemove") {
      if (current) await deleteHostname(cf, current);
      await db.query(
        "update public.organizations set custom_hostname_id = null, custom_domain = null, domain_state = 'none' where id = $1",
        [orgId],
      );
      return json({ ok: true });
    }
    let state;
    if (b["action"] === "domainActivate" && !current) {
      const hostname = cleanHostname(b["hostname"]);
      if (!hostname) return json({ error: "hostname" }, 400);
      const used = await db.query(
        "select 1 from public.organizations where custom_domain = $1 and id <> $2",
        [hostname, orgId],
      );
      if (used.rowCount) return json({ error: "hostname_taken" }, 409);
      state = await createHostname(cf, hostname);
    } else if (current) state = await getHostname(cf, current);
    else return json({ error: "bad_request" }, 400);
    await db.query(
      `update public.organizations
       set custom_hostname_id = $2, custom_domain = $3, domain_mode = 'custom',
           domain_state = $4::public.domain_state
       where id = $1`,
      [orgId, state.id, state.hostname, state.state === "active" ? "active" : "pending"],
    );
    return json({ domain: state });
  } catch (e) {
    if (e instanceof CloudflareError) return json({ error: "cloudflare", detail: e.message }, 502);
    throw e;
  }
}

/** POST /api/admin/accounts {action, …} — approve / reject / suspend, create, reset, domains. */
export async function handleAccountsPost(request: Request) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const b = ((await request.json().catch(() => null)) ?? {}) as Body;
  return withAdmin(request, (pool) =>
    asServer(pool, async (db) => {
      const action = b["action"];
      let res: Response | null;
      try {
        if (action === "approve" || action === "reject" || action === "suspend")
          res = await setApproval(db, b);
        else if (action === "create") res = await createAccount(db, b);
        else if (action === "resetPassword") res = await resetPassword(db, b);
        else if (
          action === "domainActivate" ||
          action === "domainRefresh" ||
          action === "domainRemove"
        )
          return await domainAction(db, b);
        else return json({ error: "bad_request" }, 400);
      } catch (e) {
        const { code } = pgError(e);
        if (code === "22P02" || code === "23514") return json({ error: "bad_request" }, 400);
        throw e;
      }
      return res ?? json({ accounts: await listAccounts(db) });
    }),
  );
}

// ---------- back-office data (customer register) ----------
const PLATFORM_DB_KEYS = Object.values(PLATFORM_KEYS) as string[];

/** GET /api/admin/data — the customer register. */
export const handleAdminDataGet = (request: Request) =>
  withAdmin(request, (pool, user) =>
    asUser(pool, user.id, async (db) => {
      const { rows } = await db.query<{ key: string; value: unknown }>(
        "select key, value from public.platform_data",
      );
      return json({ data: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
    }),
  );

/** POST /api/admin/data {ops} — saves changes to the customer register. */
export async function handleAdminDataPost(request: Request) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const ops = validOps(await request.json().catch(() => null), PLATFORM_DB_KEYS);
  if (!ops) return json({ error: "bad_request" }, 400);
  return withAdmin(request, async (pool, user) => {
    try {
      await asUser(pool, user.id, (db) => applyOps(db, "platform", "", ops));
      return json({ ok: true });
    } catch (e) {
      return writeError(e);
    }
  });
}
