/**
 * A company's own domain on the shared app (Cloudflare custom hostname), shared by the admin
 * portal and the company's settings. Server only. Runs as the app's server (database owner):
 * only the team or this code may change organizations.custom_domain / domain_state.
 */
import type { Db } from "@/lib/db/server";
import { readEnv } from "@/lib/google/config";
import { PLATFORM_DOMAIN } from "@/lib/tenant";
import {
  cleanHostname,
  cloudflareConfig,
  CloudflareError,
  createHostname,
  deleteHostname,
  getHostname,
  type HostnameState,
} from "./cloudflare";

export type DomainResult =
  | { ok: true; domain: HostnameState | null }
  | { ok: false; error: string; status: number; detail?: string };

const fail = (error: string, status: number, detail?: string): DomainResult => ({
  ok: false,
  error,
  status,
  ...(detail ? { detail } : {}),
});

async function save(db: Db, orgId: string, s: HostnameState) {
  await db.query(
    `update public.organizations
     set custom_hostname_id = $2, custom_domain = $3, domain_mode = 'custom',
         domain_state = $4::public.domain_state
     where id = $1`,
    [orgId, s.id, s.hostname, s.state === "active" ? "active" : "pending"],
  );
}

/**
 * connect: starts (or restarts, for another domain) the custom hostname; check: refreshes its
 * state from Cloudflare; remove: deletes it. Returns the DNS records to give the customer.
 */
export async function domainAction(
  db: Db,
  orgId: string,
  action: "connect" | "check" | "remove",
  hostnameInput?: unknown,
): Promise<DomainResult> {
  const cf = cloudflareConfig(readEnv());
  if (!cf) return fail("domains_off", 503);
  const { rows } = await db.query<{
    custom_hostname_id: string | null;
    custom_domain: string | null;
  }>("select custom_hostname_id, custom_domain from public.organizations where id = $1", [orgId]);
  if (!rows.length) return fail("not_found", 404);
  const current = rows[0]!.custom_hostname_id;
  try {
    if (action === "remove") {
      if (current) await deleteHostname(cf, current);
      await db.query(
        `update public.organizations
         set custom_hostname_id = null, custom_domain = null, domain_state = 'none' where id = $1`,
        [orgId],
      );
      return { ok: true, domain: null };
    }
    if (action === "check") {
      if (!current) return { ok: true, domain: null };
      const s = await getHostname(cf, current);
      await save(db, orgId, s);
      return { ok: true, domain: s };
    }
    const hostname = cleanHostname(hostnameInput);
    if (!hostname || hostname === PLATFORM_DOMAIN || hostname.endsWith(`.${PLATFORM_DOMAIN}`))
      return fail("hostname", 400);
    if (current && rows[0]!.custom_domain === hostname) {
      const s = await getHostname(cf, current);
      await save(db, orgId, s);
      return { ok: true, domain: s };
    }
    const used = await db.query(
      "select 1 from public.organizations where custom_domain = $1 and id <> $2",
      [hostname, orgId],
    );
    if (used.rowCount) return fail("hostname_taken", 409);
    if (current) await deleteHostname(cf, current);
    const s = await createHostname(cf, hostname);
    await save(db, orgId, s);
    return { ok: true, domain: s };
  } catch (e) {
    if (e instanceof CloudflareError) return fail("cloudflare", 502, e.message);
    throw e;
  }
}
