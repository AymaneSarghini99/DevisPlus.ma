/**
 * Google Drive connection kept per company in the database (public.drive_connections, a table
 * browsers cannot read). Server only.
 *
 * The connection belongs to the signed-in user's company (approved or in free trial): every
 * device of the company uses it. A connection made earlier in this browser (cookie) is moved to the company the
 * first time it is read.
 */
import type { Pool } from "@neondatabase/serverless";
import { sessionUserOn } from "@/lib/account/server";
import { asServer, asUser, withPool } from "@/lib/db/server";
import { canUse, orgOf } from "@/lib/workspace/server";
import type { GoogleConfig } from "./config";
import { cookieStore, type Connection, type ConnectionStore } from "./handlers";
import { seal, unseal } from "./seal";

const PURPOSE = "drive_connections";

type Row = {
  google_sub: string;
  google_email: string;
  refresh_token_sealed: string;
  scope: string;
  folder_id: string | null;
  folder_name: string | null;
  connected_at: Date | string;
};

export function dbConnectionStore(c: GoogleConfig): ConnectionStore {
  const cookies = cookieStore(c);
  // One lookup of the company per request.
  let org: Promise<string | null> | null = null;
  const orgFor = (pool: Pool, req: Request) =>
    (org ??= (async () => {
      const user = await sessionUserOn(pool, req);
      if (!user) return null;
      const o = await asUser(pool, user.id, orgOf);
      return canUse(o) ? o.id : null;
    })());

  async function write(pool: Pool, orgId: string, conn: Connection) {
    const sealed = await seal({ refreshToken: conn.refreshToken }, c.encryptionKey, PURPOSE);
    await asServer(pool, (db) =>
      db.query(
        `insert into public.drive_connections
           (organization_id, google_sub, google_email, refresh_token_sealed, scope, folder_id,
            folder_name, connected_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (organization_id) do update set
           google_sub = excluded.google_sub, google_email = excluded.google_email,
           refresh_token_sealed = excluded.refresh_token_sealed, scope = excluded.scope,
           folder_id = excluded.folder_id, folder_name = excluded.folder_name,
           connected_at = excluded.connected_at`,
        [
          orgId,
          conn.sub,
          conn.email,
          sealed,
          conn.scope,
          conn.folderId,
          conn.folderName,
          conn.connectedAt,
        ],
      ),
    );
  }

  return {
    async load(req) {
      const found = await withPool(async (pool) => {
        const orgId = await orgFor(pool, req);
        if (!orgId) return null;
        const { rows } = await asServer(pool, (db) =>
          db.query<Row>("select * from public.drive_connections where organization_id = $1", [
            orgId,
          ]),
        );
        const r = rows[0];
        if (r) {
          const secret = await unseal<{ refreshToken: string }>(
            r.refresh_token_sealed,
            c.encryptionKey,
            PURPOSE,
          );
          if (!secret) return null;
          return {
            v: 1,
            sub: r.google_sub,
            email: r.google_email,
            refreshToken: secret.refreshToken,
            scope: r.scope,
            folderId: r.folder_id,
            folderName: r.folder_name,
            connectedAt: new Date(r.connected_at).toISOString(),
          } satisfies Connection;
        }
        const legacy = await cookies.load(req);
        if (legacy) await write(pool, orgId, legacy);
        return legacy;
      });
      return found ?? null;
    },
    async save(req, conn) {
      const done = await withPool(async (pool) => {
        const orgId = await orgFor(pool, req);
        if (!orgId) throw new Error("no approved workspace");
        await write(pool, orgId, conn);
        return true;
      });
      if (!done) throw new Error("no database");
      // The browser copy (older connection) is no longer needed.
      return cookies.clear(req);
    },
    async clear(req) {
      await withPool(async (pool) => {
        const orgId = await orgFor(pool, req);
        if (orgId)
          await asServer(pool, (db) =>
            db.query("delete from public.drive_connections where organization_id = $1", [orgId]),
          );
      });
      return cookies.clear(req);
    },
  };
}
