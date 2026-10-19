/**
 * Accounts on the server: Better Auth (email + password, Google) on the Neon database.
 * Never import this file from browser code: it reads secrets.
 *
 * Cloudflare Workers cannot share a database connection between requests, so each request
 * opens its own pool and closes it when the response is ready.
 */
import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { PostgresDialect, type PostgresPool } from "kysely";
import { readEnv } from "@/lib/google/config";
import { deploymentFrom, type SignupMode } from "@/lib/deployment";
import { hashPassword, verifyPassword } from "./password";

type Env = Record<string, string | undefined>;
export type AuthSettings = {
  databaseUrl: string;
  secret: string;
  appUrl: string;
  google: { clientId: string; clientSecret: string } | null;
  signupMode: SignupMode;
  /** Every origin this deployment answers on (APP_URL first). */
  origins: string[];
};

/** Settings from the environment, or the names of the missing ones. */
export function authSettings(env: Env): { settings: AuthSettings } | { missing: string[] } {
  const missing = ["DATABASE_URL", "BETTER_AUTH_SECRET", "APP_URL"].filter((k) => !env[k]?.trim());
  if (
    (env["BETTER_AUTH_SECRET"]?.trim().length ?? 0) < 32 &&
    !missing.includes("BETTER_AUTH_SECRET")
  )
    missing.push("BETTER_AUTH_SECRET");
  if (missing.length) return { missing };
  const id = env["GOOGLE_CLIENT_ID"]?.trim();
  const secret = env["GOOGLE_CLIENT_SECRET"]?.trim();
  const d = deploymentFrom(env);
  const appUrl = new URL(env["APP_URL"]!.trim()).origin;
  return {
    settings: {
      databaseUrl: env["DATABASE_URL"]!.trim(),
      secret: env["BETTER_AUTH_SECRET"]!.trim(),
      appUrl,
      google: id && secret ? { clientId: id, clientSecret: secret } : null,
      signupMode: d.signupMode,
      origins: [appUrl, ...d.origins.filter((o) => o !== appUrl)],
    },
  };
}

/** Column names of the auth tables (db/migrations/*_better_auth.sql). */
const stamps = { createdAt: "created_at", updatedAt: "updated_at" } as const;

/**
 * Creates the signed-up user's company workspace (owner), as that user (RLS applies). It waits
 * for the DevisPlus team's approval, except in SIGNUP_MODE=open.
 */
async function createWorkspace(pool: Pool, userId: string, mode: SignupMode) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)",
      [userId],
    );
    await client.query("set local role authenticated");
    const { rows } = await client.query<{ id: string }>(
      "select public.create_organization('', 'fr') as id",
    );
    await client.query("commit");
    if (mode === "open")
      // As the server (database owner): companies cannot approve themselves.
      await pool.query(
        "update public.organizations set approval_status = 'approved', approval_changed_at = now() where id = $1",
        [rows[0]!.id],
      );
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Origin a request is served on, when this deployment answers there: one of its configured
 * origins, or a customer's own domain activated by the DevisPlus team.
 */
export async function requestOrigin(pool: Pool, s: AuthSettings, request: Request) {
  const origin = new URL(request.url).origin;
  if (s.origins.includes(origin)) return origin;
  const host = new URL(request.url).hostname.toLowerCase();
  const { rows } = await pool.query(
    "select 1 from public.organizations where custom_domain = $1 and domain_state = 'active' limit 1",
    [host],
  );
  return rows.length && origin.startsWith("https:") ? origin : s.appUrl;
}

export function createAuth(pool: Pool, s: AuthSettings, origin = s.appUrl) {
  const closed = s.signupMode === "closed";
  return betterAuth({
    appName: "DevisPlus.ma",
    baseURL: origin,
    basePath: "/api/auth",
    secret: s.secret,
    trustedOrigins: [...new Set([origin, ...s.origins])],
    // A failed or forged Google return lands on the sign-in page with a readable message.
    onAPIError: { errorURL: "/connexion?google=error" },
    database: {
      // Neon's Pool follows node-postgres; only its type declarations differ.
      dialect: new PostgresDialect({ pool: pool as unknown as PostgresPool }),
      type: "postgres",
      schemaName: "auth",
    },
    advanced: {
      // The schema comes from db/migrations (checked by npm run db:test); introspecting it on
      // every request would add a database round trip to each call.
      database: { generateId: "uuid", validateSchema: false },
      useSecureCookies: origin.startsWith("https:"),
    },
    user: {
      modelName: "users",
      fields: { emailVerified: "email_verified", ...stamps },
    },
    session: {
      modelName: "sessions",
      fields: {
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
        ...stamps,
      },
      expiresIn: 60 * 60 * 24 * 30,
      // Signed copy of the session in a cookie for 5 minutes: fewer database calls per page.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      modelName: "accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        ...stamps,
      },
    },
    verification: {
      modelName: "verifications",
      fields: { expiresAt: "expires_at", ...stamps },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      // One deployment per customer: the DevisPlus team creates the accounts (admin portal).
      disableSignUp: closed,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    socialProviders: s.google
      ? {
          google: {
            clientId: s.google.clientId,
            clientSecret: s.google.clientSecret,
            // Same callback address as the Google Drive connection (already registered in
            // Google Cloud); /api/google/callback hands sign-in returns over to Better Auth.
            redirectURI: `${origin}/api/google/callback`,
            prompt: "select_account",
            disableImplicitSignUp: closed,
          },
        }
      : {},
    databaseHooks: {
      user: {
        create: { after: async (user) => createWorkspace(pool, user.id, s.signupMode) },
      },
    },
  });
}

/** Runs a request through Better Auth (GET/POST /api/auth/*). */
export async function handleAuth(request: Request) {
  const parsed = authSettings(readEnv());
  if ("missing" in parsed)
    return Response.json({ code: "NOT_CONFIGURED", missing: parsed.missing }, { status: 503 });
  const pool = new Pool({ connectionString: parsed.settings.databaseUrl });
  try {
    const origin = await requestOrigin(pool, parsed.settings, request);
    return await createAuth(pool, parsed.settings, origin).handler(request);
  } finally {
    await pool.end();
  }
}

export type SessionUser = { id: string; email: string; name: string; emailVerified: boolean };

/** Signed-in user for a server request on an open pool, or null. */
export async function sessionUserOn(pool: Pool, request: Request): Promise<SessionUser | null> {
  const parsed = authSettings(readEnv());
  if ("missing" in parsed) return null;
  const origin = await requestOrigin(pool, parsed.settings, request);
  const s = await createAuth(pool, parsed.settings, origin).api.getSession({
    headers: request.headers,
  });
  if (!s?.user) return null;
  const u = s.user;
  return { id: u.id, email: u.email ?? "", name: u.name ?? "", emailVerified: !!u.emailVerified };
}

/** Signed-in user for a server request, or null. */
export async function sessionUser(request: Request) {
  const parsed = authSettings(readEnv());
  if ("missing" in parsed) return null;
  const pool = new Pool({ connectionString: parsed.settings.databaseUrl });
  try {
    return await sessionUserOn(pool, request);
  } finally {
    await pool.end();
  }
}
