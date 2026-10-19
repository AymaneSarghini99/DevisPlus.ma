/** Dependencies of the Google handlers for a real request (server only). */
import { databaseUrl } from "@/lib/db/server";
import { parseConfig, readEnv } from "./config";
import { dbConnectionStore } from "./dbStore";
import type { Deps } from "./handlers";

export function googleDeps(): Deps {
  const parsed = parseConfig(readEnv());
  const f = globalThis.fetch.bind(globalThis);
  // With the database, the connection belongs to the company (every device); else to the browser.
  const store = databaseUrl() ? { store: dbConnectionStore } : {};
  return "config" in parsed
    ? { config: parsed.config, fetch: f, ...store }
    : { config: null, missing: parsed.missing, fetch: f, ...store };
}
