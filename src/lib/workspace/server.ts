/**
 * The company's data on the server (GET/POST /api/workspace). Never import from browser code.
 *
 * Every query runs as the signed-in user, so the database rules decide: a user only reaches the
 * data of their own company, and only once the DevisPlus team has approved it.
 */
import type { Pool } from "@neondatabase/serverless";
import { sessionUserOn, type SessionUser } from "@/lib/account/server";
import { asServer, asUser, json, pgError, sameOrigin, withPool, type Db } from "@/lib/db/server";
import { cloudflareConfig, type HostnameState } from "@/lib/domains/cloudflare";
import { domainAction } from "@/lib/domains/server";
import { readEnv } from "@/lib/google/config";
import { validOps, WORKSPACE_KEYS, type KeyedOp } from "./keys";

export type Approval = "pending" | "approved" | "rejected" | "suspended";
export type OrgInfo = {
  id: string;
  role: string;
  approval: Approval;
  note: string;
  companyName: string;
  domainState: "none" | "pending" | "active";
  customDomain: string;
};

const DB_KEYS = Object.values(WORKSPACE_KEYS) as string[];
const MAX_BODY = 8 * 1024 * 1024;

/** The user's company (the one they own first), created when it is missing. */
export async function orgOf(db: Db): Promise<OrgInfo> {
  const q = () =>
    db.query<{
      id: string;
      role: string;
      approval: Approval;
      note: string;
      company_name: string;
      domain_state: OrgInfo["domainState"];
      custom_domain: string | null;
    }>(
      `select o.id, m.role, o.approval_status as approval, o.approval_note as note, o.company_name,
              o.domain_state, o.custom_domain
       from public.memberships m join public.organizations o on o.id = m.organization_id
       where m.user_id = auth.uid()
       order by (m.role = 'owner') desc, m.created_at
       limit 1`,
    );
  let { rows } = await q();
  if (!rows.length) {
    await db.query("select public.create_organization('', 'fr')");
    ({ rows } = await q());
  }
  const r = rows[0]!;
  return {
    id: r.id,
    role: r.role,
    approval: r.approval,
    note: r.note,
    companyName: r.company_name,
    domainState: r.domain_state,
    customDomain: r.custom_domain ?? "",
  };
}

/** Applies changes to stored values, in order, inside the caller's transaction. */
export async function applyOps(
  db: Db,
  table: "workspace" | "platform",
  org: string,
  ops: KeyedOp[],
) {
  for (const { key, op } of ops) {
    if (table === "workspace")
      await db.query(
        `insert into public.workspace_data (organization_id, key, value)
         values ($1, $2, public.apply_data_op(null, $3::jsonb))
         on conflict (organization_id, key)
         do update set value = public.apply_data_op(public.workspace_data.value, $3::jsonb)`,
        [org, key, JSON.stringify(op)],
      );
    else
      await db.query(
        `insert into public.platform_data (key, value) values ($1, public.apply_data_op(null, $2::jsonb))
         on conflict (key) do update set value = public.apply_data_op(public.platform_data.value, $2::jsonb)`,
        [key, JSON.stringify(op)],
      );
  }
}

/** Error of a refused write, as an HTTP response. */
export function writeError(e: unknown) {
  const { code, message } = pgError(e);
  if (/issued invoice/i.test(message)) return json({ error: "issuedLocked" }, 409);
  if (/trial limit/i.test(message)) return json({ error: "trialLimit" }, 402);
  if (code === "42501") return json({ error: "forbidden" }, 403);
  if (code === "22023" || code === "22P02" || code === "23514")
    return json({ error: "bad_request" }, 400);
  throw e;
}

async function withUser(
  request: Request,
  fn: (pool: Pool, user: SessionUser) => Promise<Response>,
): Promise<Response> {
  const res = await withPool(async (pool) => {
    const user = await sessionUserOn(pool, request);
    if (!user) return json({ error: "signed_out" }, 401);
    return fn(pool, user);
  });
  return res ?? json({ error: "not_configured" }, 503);
}

/** Quotes a company in free trial (signed up, not approved yet) can keep; see the free_trial migration. */
export const TRIAL_QUOTES = 10;

/** Approved companies, and companies in free trial, use their workspace. */
export const canUse = (o: Pick<OrgInfo, "approval">) =>
  o.approval === "approved" || o.approval === "pending";

const orgJson = (o: OrgInfo) => ({
  trialQuotes: o.approval === "pending" ? TRIAL_QUOTES : null,
  approval: o.approval,
  note: o.note,
  role: o.role,
  companyName: o.companyName,
  domainState: o.domainState,
  customDomain: o.customDomain,
});

/** GET /api/workspace — the company's data, or its status (403) when rejected or suspended. */
export const handleWorkspaceGet = (request: Request) =>
  withUser(request, (pool, user) =>
    asUser(pool, user.id, async (db) => {
      const org = await orgOf(db);
      if (!canUse(org)) return json({ org: orgJson(org) }, 403);
      const { rows } = await db.query<{ key: string; value: unknown }>(
        "select key, value from public.workspace_data where organization_id = $1",
        [org.id],
      );
      return json({
        org: orgJson(org),
        data: Object.fromEntries(rows.map((r) => [r.key, r.value])),
      });
    }),
  );

/** GET /api/workspace/status — approval status for the waiting page. */
export const handleWorkspaceStatus = (request: Request) =>
  withUser(request, (pool, user) =>
    asUser(pool, user.id, async (db) => json({ email: user.email, org: orgJson(await orgOf(db)) })),
  );

/** POST /api/workspace {ops:[{key, op}]} — saves changes (all or nothing). */
export async function handleWorkspacePost(request: Request) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY)
    return json({ error: "too_large" }, 413);
  const ops = validOps(await request.json().catch(() => null), DB_KEYS);
  if (!ops) return json({ error: "bad_request" }, 400);
  return withUser(request, async (pool, user) => {
    try {
      return await asUser(pool, user.id, async (db) => {
        const org = await orgOf(db);
        if (!canUse(org)) return json({ org: orgJson(org) }, 403);
        await applyOps(db, "workspace", org.id, ops);
        return json({ ok: true });
      });
    } catch (e) {
      return writeError(e);
    }
  });
}

// ---------- the company's own domain (Cloudflare custom hostname) ----------

/**
 * GET /api/workspace/domain — whether domains can be connected here, and the company's domain
 * with its activation state and the DNS records to add (asked to Cloudflare when connected).
 */
export const handleDomainGet = (request: Request) =>
  withUser(request, async (pool, user) => {
    const org = await asUser(pool, user.id, orgOf);
    if (!canUse(org)) return json({ org: orgJson(org) }, 403);
    const cf = cloudflareConfig(readEnv());
    let domain: HostnameState | null = null;
    if (cf && org.customDomain) {
      const r = await asServer(pool, (db) => domainAction(db, org.id, "check"));
      domain = r.ok ? r.domain : null;
    }
    return json({
      enabled: !!cf,
      target: cf?.target ?? "",
      approval: org.approval,
      domain,
      customDomain: org.customDomain,
      domainState: org.domainState,
    });
  });

/** POST /api/workspace/domain {action: connect | check | remove, hostname} — approved owners and admins. */
export async function handleDomainPost(request: Request) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const b = ((await request.json().catch(() => null)) ?? {}) as {
    action?: unknown;
    hostname?: unknown;
  };
  const action = b.action;
  if (action !== "connect" && action !== "check" && action !== "remove")
    return json({ error: "bad_request" }, 400);
  return withUser(request, async (pool, user) => {
    const org = await asUser(pool, user.id, orgOf);
    if (!canUse(org)) return json({ org: orgJson(org) }, 403);
    // The free trial includes the DevisPlus address; an own domain comes with activation.
    if (org.approval !== "approved") return json({ error: "trial" }, 402);
    if (org.role !== "owner" && org.role !== "admin") return json({ error: "forbidden" }, 403);
    const r = await asServer(pool, (db) => domainAction(db, org.id, action, b.hostname));
    if (!r.ok) return json({ error: r.error, ...(r.detail ? { detail: r.detail } : {}) }, r.status);
    return json({ domain: r.domain });
  });
}
