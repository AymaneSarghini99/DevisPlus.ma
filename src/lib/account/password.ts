/**
 * Password hashing for Better Auth: PBKDF2-SHA-256 through Web Crypto. Native and fast, so it
 * fits the CPU limits of Cloudflare Workers (Better Auth's default scrypt runs in JavaScript).
 * Stored format: pbkdf2$<iterations>$<salt hex>$<hash hex>
 *
 * Cloudflare Workers refuse PBKDF2 above 100 000 iterations, so that is the count used.
 */
export const ITERATIONS = 100_000;

const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return hex(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${await derive(password, salt, ITERATIONS)}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [kind, iter, salt, expected] = hash.split("$");
  const iterations = Number(iter);
  if (kind !== "pbkdf2" || !salt || !expected || !Number.isInteger(iterations) || iterations < 1)
    return false;
  let actual: string;
  try {
    actual = await derive(password, fromHex(salt), iterations);
  } catch {
    // e.g. a hash made with more iterations than this runtime allows: never a server error.
    return false;
  }
  // Constant-time comparison.
  if (actual.length !== expected.length) return false;
  let d = 0;
  for (let i = 0; i < actual.length; i++) d |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return d === 0;
}
