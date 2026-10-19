/**
 * Customers' own domains on the shared app (Phase 3): Cloudflare for SaaS "custom hostnames".
 * Server only (reads the API token).
 *
 * How it works: the customer adds a CNAME record from their domain (devis.client.ma) to
 * CUSTOM_DOMAIN_TARGET (a host of the DevisPlus Cloudflare zone that serves this app).
 * Cloudflare then checks the domain and issues its certificate. The DevisPlus team starts and
 * follows this from the admin portal; nothing is activated without them.
 *
 * Needs: CLOUDFLARE_API_TOKEN (permission "SSL and Certificates: Edit" on the zone),
 * CLOUDFLARE_ZONE_ID, CUSTOM_DOMAIN_TARGET. Without them the feature stays off.
 */
type Env = Record<string, string | undefined>;
export type CloudflareConfig = { token: string; zoneId: string; target: string };

export function cloudflareConfig(env: Env): CloudflareConfig | null {
  const token = env["CLOUDFLARE_API_TOKEN"]?.trim();
  const zoneId = env["CLOUDFLARE_ZONE_ID"]?.trim();
  const target = env["CUSTOM_DOMAIN_TARGET"]?.trim().toLowerCase();
  return token && zoneId && target ? { token, zoneId, target } : null;
}

/** "Devis.Client.ma." → "devis.client.ma"; null when it is not a plain domain name. */
export function cleanHostname(v: unknown) {
  if (typeof v !== "string") return null;
  const h = v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
  return /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) ? h : null;
}

export type DnsRecord = { type: "CNAME" | "TXT"; name: string; value: string };
export type HostnameState = {
  id: string;
  hostname: string;
  /** "active" once the domain is verified and its certificate issued. */
  state: "pending" | "active" | "failed";
  /** Records the customer must add at their DNS provider. */
  records: DnsRecord[];
  detail: string;
};

type CfHostname = {
  id: string;
  hostname: string;
  status?: string;
  ssl?: {
    status?: string;
    txt_name?: string;
    txt_value?: string;
    validation_records?: { txt_name?: string; txt_value?: string }[];
    validation_errors?: { message?: string }[];
  };
  ownership_verification?: { type?: string; name?: string; value?: string };
  verification_errors?: string[];
};

export function stateOf(h: CfHostname, target: string): HostnameState {
  const records: DnsRecord[] = [{ type: "CNAME", name: h.hostname, value: target }];
  const own = h.ownership_verification;
  if (h.status !== "active" && own?.type === "txt" && own.name && own.value)
    records.push({ type: "TXT", name: own.name, value: own.value });
  for (const r of h.ssl?.validation_records ?? [])
    if (h.ssl?.status !== "active" && r.txt_name && r.txt_value)
      records.push({ type: "TXT", name: r.txt_name, value: r.txt_value });
  const failed =
    ["blocked", "moved", "deleted"].includes(h.status ?? "") ||
    /failed|timed_out|expired/.test(h.ssl?.status ?? "");
  return {
    id: h.id,
    hostname: h.hostname,
    state:
      h.status === "active" && h.ssl?.status === "active"
        ? "active"
        : failed
          ? "failed"
          : "pending",
    records,
    detail: [
      h.status && `hostname: ${h.status}`,
      h.ssl?.status && `ssl: ${h.ssl.status}`,
      ...(h.verification_errors ?? []),
      ...(h.ssl?.validation_errors ?? []).map((e) => e.message ?? ""),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export class CloudflareError extends Error {}

async function call<T>(c: CloudflareConfig, f: typeof fetch, path: string, init: RequestInit = {}) {
  const res = await f(`https://api.cloudflare.com/client/v4/zones/${c.zoneId}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${c.token}`, "content-type": "application/json" },
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: T;
    errors?: { message?: string }[];
  } | null;
  if (!res.ok || !body?.success)
    throw new CloudflareError(
      body?.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`,
    );
  return body.result as T;
}

export const createHostname = async (c: CloudflareConfig, hostname: string, f = fetch) =>
  stateOf(
    await call<CfHostname>(c, f, "/custom_hostnames", {
      method: "POST",
      body: JSON.stringify({
        hostname,
        ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
      }),
    }),
    c.target,
  );

export const getHostname = async (c: CloudflareConfig, id: string, f = fetch) =>
  stateOf(await call<CfHostname>(c, f, `/custom_hostnames/${encodeURIComponent(id)}`), c.target);

export const deleteHostname = async (c: CloudflareConfig, id: string, f = fetch) => {
  await call(c, f, `/custom_hostnames/${encodeURIComponent(id)}`, { method: "DELETE" });
};
