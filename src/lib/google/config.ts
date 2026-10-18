/**
 * Server-only configuration of the Google Drive integration (one Google OAuth client per
 * customer deployment). Never import this file from browser code: it reads secrets.
 *
 * Production (Cloudflare Workers, nodejs_compat): values come from the deployment's
 * variables and secrets, exposed as process.env. Local dev: TanStack Start loads .env and
 * .env.local into process.env when the dev server starts (restart it after editing them).
 */
export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  /** Exact callback URL registered in Google Cloud (…/api/google/callback). */
  redirectUri: string;
  /** Public origin of this deployment, e.g. https://atlas.devisplus.ma */
  appOrigin: string;
  /** 32-byte AES-GCM key (base64) used to seal tokens. */
  encryptionKey: string;
  secureCookies: boolean;
};

export const REQUIRED_ENV = [
  "APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_TOKEN_ENCRYPTION_KEY",
] as const;

type Env = Record<string, string | undefined>;

export function readEnv(): Env {
  return (globalThis as { process?: { env?: Env } }).process?.env ?? {};
}

/** Validated configuration, or the list of missing / invalid variable names. */
export function parseConfig(env: Env): { config: GoogleConfig } | { missing: string[] } {
  const missing: string[] = REQUIRED_ENV.filter((k) => !env[k]?.trim());
  if (missing.length) return { missing };
  let app: URL, redirect: URL;
  try {
    app = new URL(env["APP_URL"]!);
    redirect = new URL(env["GOOGLE_REDIRECT_URI"]!);
  } catch {
    return { missing: ["APP_URL", "GOOGLE_REDIRECT_URI"] };
  }
  const local = (u: URL) => ["localhost", "127.0.0.1"].includes(u.hostname);
  // Google only accepts https callbacks (http is allowed for localhost), and the callback
  // must belong to this deployment.
  if (
    (redirect.protocol !== "https:" && !local(redirect)) ||
    redirect.origin !== app.origin ||
    redirect.pathname !== "/api/google/callback"
  )
    return { missing: ["GOOGLE_REDIRECT_URI"] };
  let keyLength = 0;
  try {
    keyLength = atob(env["GOOGLE_TOKEN_ENCRYPTION_KEY"]!.trim()).length;
  } catch {
    keyLength = 0;
  }
  if (keyLength !== 32) return { missing: ["GOOGLE_TOKEN_ENCRYPTION_KEY"] };
  return {
    config: {
      clientId: env["GOOGLE_CLIENT_ID"]!.trim(),
      clientSecret: env["GOOGLE_CLIENT_SECRET"]!.trim(),
      redirectUri: redirect.toString(),
      appOrigin: app.origin,
      encryptionKey: env["GOOGLE_TOKEN_ENCRYPTION_KEY"]!.trim(),
      secureCookies: app.protocol === "https:",
    },
  };
}
