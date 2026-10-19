/**
 * Settings of one DevisPlus deployment (server environment variables, no secrets here).
 *
 * The same code serves both business models:
 * - the shared app (devisplus.ma): anyone can sign up, the DevisPlus team accepts each new
 *   company from the admin portal (SIGNUP_MODE=approval, the default);
 * - one deployment per customer: sign-up is closed and the DevisPlus team creates the accounts
 *   from the admin portal (SIGNUP_MODE=closed). SIGNUP_MODE=open accepts sign-ups at once.
 */
export type SignupMode = "approval" | "open" | "closed";
export const SIGNUP_MODES: SignupMode[] = ["approval", "open", "closed"];

export type Deployment = {
  signupMode: SignupMode;
  /** Host of the admin portal (e.g. admin.devisplus.ma); "" serves /admin on every host. */
  adminHost: string;
  /** Emails that become platform admins at their first Google sign-in (verified by Google). */
  adminEmails: string[];
  /** Origins this deployment answers on: APP_URL, the admin portal, APP_ORIGINS. */
  origins: string[];
};

type Env = Record<string, string | undefined>;

const originOf = (v: string) => {
  try {
    const u = new URL(v.includes("://") ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : "";
  } catch {
    return "";
  }
};
const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function deploymentFrom(env: Env): Deployment {
  const mode = env["SIGNUP_MODE"]?.trim().toLowerCase() as SignupMode;
  const adminHost = (env["ADMIN_HOST"] ?? "").trim().toLowerCase().replace(/\/.*$/, "");
  const origins = [
    originOf(env["APP_URL"] ?? ""),
    adminHost ? originOf(adminHost) : "",
    ...list(env["APP_ORIGINS"]).map(originOf),
  ].filter(Boolean);
  return {
    signupMode: SIGNUP_MODES.includes(mode) ? mode : "approval",
    adminHost,
    adminEmails: list(env["PLATFORM_ADMIN_EMAILS"] ?? "contact@devisplus.ma").map((e) =>
      e.toLowerCase(),
    ),
    origins: [...new Set(origins)],
  };
}

/** Files and server routes, never redirected by the admin-portal routing. */
const isAsset = (path: string) =>
  path.startsWith("/api/") ||
  path.startsWith("/assets/") ||
  path.startsWith("/_") ||
  path.startsWith("/@") ||
  /\.[a-z0-9]+$/i.test(path);

/**
 * Admin-portal routing: on the admin host only /admin and the sign-in page are served; on the
 * other hosts /admin moves to the admin host. Returns the address to redirect to, or null.
 */
export function adminRedirect(url: URL, d: Pick<Deployment, "adminHost">): string | null {
  if (!d.adminHost || isAsset(url.pathname)) return null;
  const onAdmin = url.host.toLowerCase() === d.adminHost;
  const p = url.pathname.replace(/\/$/, "") || "/";
  if (onAdmin) {
    if (p === "/admin" || p.startsWith("/admin/") || p === "/connexion") return null;
    return new URL("/admin", url).toString();
  }
  if (p === "/admin" || p.startsWith("/admin/")) {
    const to = new URL(url.pathname + url.search, `${url.protocol}//${d.adminHost}`);
    return to.toString();
  }
  return null;
}
