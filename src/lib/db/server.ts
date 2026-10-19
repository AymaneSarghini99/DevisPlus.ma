/**
 * Database access from the app's server (Neon). Never import this file from browser code.
 *
 * Cloudflare Workers cannot share a database connection between requests, so each request opens
 * its own pool and closes it when the response is ready (withPool).
 *
 * - asUser: the queries run as the signed-in user (role "authenticated"), so the row-level
 *   security rules of db/migrations decide which rows they reach.
 * - asServer: the queries run as the database owner, for checks the server makes itself
 *   (approval, back-office). Only call it after checking who is asking.
 */
import { Pool, type PoolClient } from "@neondatabase/serverless";
import { readEnv } from "@/lib/google/config";

export type Db = PoolClient;

export const databaseUrl = () => readEnv()["DATABASE_URL"]?.trim() || "";

/** Runs fn with a fresh pool; null when DATABASE_URL is not set. */
export async function withPool<T>(fn: (pool: Pool) => Promise<T>): Promise<T | null> {
  const url = databaseUrl();
  if (!url) return null;
  const pool = new Pool({ connectionString: url });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

async function transaction<T>(pool: Pool, userId: string | null, fn: (db: Db) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (userId) {
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)",
        [userId],
      );
      await client.query("set local role authenticated");
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export const asUser = <T>(pool: Pool, userId: string, fn: (db: Db) => Promise<T>) =>
  transaction(pool, userId, fn);
export const asServer = <T>(pool: Pool, fn: (db: Db) => Promise<T>) => transaction(pool, null, fn);

// ---------- responses ----------
const NO_STORE = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...NO_STORE },
  });

/** State-changing calls must come from this site's own pages (CSRF protection). */
export function sameOrigin(req: Request) {
  return (
    req.headers.get("origin") === new URL(req.url).origin &&
    (req.headers.get("content-type") ?? "").startsWith("application/json")
  );
}

/** Postgres error code and message of a failed query. */
export const pgError = (e: unknown) => {
  const x = e as { code?: string; message?: string };
  return { code: x?.code ?? "", message: x?.message ?? "" };
};
