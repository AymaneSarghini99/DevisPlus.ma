/**
 * AES-256-GCM sealing of server-side secrets (Web Crypto: works on Cloudflare and Node).
 * Format: "v1." + base64url(iv[12] + ciphertext+tag). The purpose string is bound as
 * additional data, so a value sealed for one cookie cannot be replayed as another.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function key(base64Key: string) {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(value: unknown, base64Key: string, purpose: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(purpose) },
    await key(base64Key),
    enc.encode(JSON.stringify(value)),
  );
  const out = new Uint8Array(12 + data.byteLength);
  out.set(iv);
  out.set(new Uint8Array(data), 12);
  return `v1.${b64url(out)}`;
}

/** The original value, or null if the input was tampered with, expired or sealed with another key. */
export async function unseal<T>(sealed: string | undefined, base64Key: string, purpose: string) {
  if (!sealed?.startsWith("v1.")) return null;
  try {
    const bytes = fromB64url(sealed.slice(3));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: enc.encode(purpose) },
      await key(base64Key),
      bytes.slice(12),
    );
    return JSON.parse(dec.decode(plain)) as T;
  } catch {
    return null;
  }
}

/** Random URL-safe string (state, PKCE verifier). */
export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function sha256b64url(s: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
