import type { AdminAccount, Tenant } from "./tenant";

/**
 * Simple administrator lock for this workspace.
 *
 * The password is hashed with PBKDF2-SHA-256 (random salt) and only the hash is saved. Because
 * all data still lives in this browser, this lock keeps other people using the same device out
 * of the app; it is not a server-side account. Real accounts need the backend.
 */
const ITERATIONS = 150_000;
const SESSION_KEY = "devisplus.session";

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

/** A lock exists once an admin password has been set. */
export const hasLock = (t: Tenant | null) => !!t?.admin.passwordHash;

/** The session lasts until the browser tab is closed. */
const token = (t: Tenant) => `${t.id}:${t.admin.passwordHash.slice(0, 16)}`;
export function isUnlocked(t: Tenant) {
  try {
    return sessionStorage.getItem(SESSION_KEY) === token(t);
  } catch {
    return false;
  }
}
export function unlock(t: Tenant) {
  try {
    sessionStorage.setItem(SESSION_KEY, token(t));
  } catch {
    // Session storage unavailable: the user will simply be asked again.
  }
}
export function lock() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ---------- platform owner (/admin) ----------
// Separate from the workspace admin: the owner of DevisPlus manages the customer register.

const OWNER_KEY = "devisplus.owner";
const OWNER_SESSION = "devisplus.owner.session";

export function loadOwner(): AdminAccount | null {
  try {
    const raw = localStorage.getItem(OWNER_KEY);
    const a = raw ? (JSON.parse(raw) as AdminAccount) : null;
    return a?.passwordHash ? a : null;
  } catch {
    return null;
  }
}
export function saveOwner(a: AdminAccount) {
  localStorage.setItem(OWNER_KEY, JSON.stringify(a));
}
export function isOwnerSignedIn(a: AdminAccount) {
  try {
    return sessionStorage.getItem(OWNER_SESSION) === a.passwordHash.slice(0, 16);
  } catch {
    return false;
  }
}
export function signInOwner(a: AdminAccount) {
  try {
    sessionStorage.setItem(OWNER_SESSION, a.passwordHash.slice(0, 16));
  } catch {
    // ignore: asked again next time
  }
}
export function signOutOwner() {
  try {
    sessionStorage.removeItem(OWNER_SESSION);
  } catch {
    // ignore
  }
}
