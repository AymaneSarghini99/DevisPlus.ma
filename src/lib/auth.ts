import { hasAccount, type AdminAccount, type Tenant } from "./tenant";

/**
 * Browser-side helpers around accounts. Workspace accounts are server accounts (Better Auth,
 * see lib/account). The PBKDF2 helpers below check older browser-only accounts.
 */
const ITERATIONS = 150_000;

const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256,
  );
  return hex(bits);
}

/** New admin credentials (fresh salt) for an email and a password. */
export async function createAdmin(email: string, password: string): Promise<AdminAccount> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    email: email.trim().toLowerCase(),
    salt: hex(salt),
    passwordHash: await derive(password, salt),
    googleSub: "",
    userId: "",
  };
}

/** Constant-time comparison of two hex strings. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function verifyAdmin(admin: AdminAccount, email: string, password: string) {
  if (!admin.passwordHash || email.trim().toLowerCase() !== admin.email.trim().toLowerCase())
    return false;
  return same(await derive(password, fromHex(admin.salt)), admin.passwordHash);
}

/** This browser's workspace already belongs to an account (sign-in rather than sign-up). */
export const hasLock = (t: Tenant | null) => !!t && hasAccount(t.admin);

// ---------- access to the app pages ----------

/** Sign-up, sign-in and password pages: reachable without an open workspace. */
export const AUTH_PATHS = [
  "/inscription",
  "/connexion",
  "/mot-de-passe-oublie",
  "/reinitialiser",
  "/mot-de-passe",
];

/**
 * What an app page shows:
 * - not signed in: "login" when this browser already has an account's workspace, else "signup";
 * - "setup": signed in but the setup wizard is not finished;
 * - "open": the page.
 * Public pages, the sign-up/sign-in pages and the owner's /admin page are not concerned.
 */
export type AccessDecision = "open" | "login" | "setup" | "signup";
export function accessDecision(
  path: string,
  tenant: Tenant | null,
  signedIn: boolean,
): AccessDecision {
  const p = path.replace(/\/$/, "") || "/";
  if (!signedIn) return hasLock(tenant) ? "login" : "signup";
  if (p === "/onboarding") return "open";
  if (!tenant?.onboarding.finishedAt) return "setup";
  return "open";
}

/** Safe in-app return path after sign-in (never another site). */
export const safeNext = (next: unknown) =>
  typeof next === "string" &&
  next.startsWith("/") &&
  !next.startsWith("//") &&
  !next.startsWith("/\\")
    ? next
    : undefined;
