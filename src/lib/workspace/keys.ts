/**
 * Which saved values live on the server, and under which name (db/migrations, workspace_data and
 * platform_data). Shared by the browser and the server.
 */

/** A company's own data: browser key → workspace_data.key. */
export const WORKSPACE_KEYS = {
  "devisplus.tenant": "tenant",
  "devisplus.settings": "settings",
  "devisplus.clients": "clients",
  "devisplus.catalog": "catalog",
  "devisplus.quotes": "quotes",
  "devisplus.invoices": "invoices",
  "devisplus.drive": "drive",
} as const;

/** The DevisPlus owner's back-office: browser key → platform_data.key. */
export const PLATFORM_KEYS = { "devisplus.customers": "customers" } as const;

export type KeyMap = Record<string, string>;

/** A change to one saved value (see public.apply_data_op). */
export type DataOp =
  | { t: "replace"; value: unknown }
  | { t: "array"; upsert: unknown[]; remove: string[] }
  | { t: "map"; set: Record<string, unknown>; remove: string[] };
export type KeyedOp = { key: string; op: DataOp };

/** Accepts only well-formed changes to known keys (server side check of request bodies). */
export function validOps(body: unknown, keys: readonly string[]): KeyedOp[] | null {
  const ops = (body as { ops?: unknown })?.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 50) return null;
  const isObj = (x: unknown): x is Record<string, unknown> =>
    !!x && typeof x === "object" && !Array.isArray(x);
  for (const o of ops) {
    if (!isObj(o) || typeof o["key"] !== "string" || !keys.includes(o["key"])) return null;
    const op = o["op"];
    if (!isObj(op)) return null;
    if (op["t"] === "replace") {
      if (!("value" in op) || op["value"] === undefined) return null;
    } else if (op["t"] === "array") {
      if (!Array.isArray(op["upsert"]) || !Array.isArray(op["remove"])) return null;
      if (!op["upsert"].every((x) => isObj(x) && typeof x["id"] === "string")) return null;
      if (!op["remove"].every((x) => typeof x === "string")) return null;
    } else if (op["t"] === "map") {
      if (!isObj(op["set"]) || !Array.isArray(op["remove"])) return null;
      if (!op["remove"].every((x) => typeof x === "string")) return null;
    } else return null;
  }
  return ops as KeyedOp[];
}
