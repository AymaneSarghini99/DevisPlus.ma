/** Dependencies of the Google handlers for a real request (server only). */
import { parseConfig, readEnv } from "./config";
import type { Deps } from "./handlers";

export function googleDeps(): Deps {
  const parsed = parseConfig(readEnv());
  return "config" in parsed
    ? { config: parsed.config, fetch: globalThis.fetch.bind(globalThis) }
    : { config: null, missing: parsed.missing, fetch: globalThis.fetch.bind(globalThis) };
}
