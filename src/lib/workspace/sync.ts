/**
 * Server-backed values for the browser (see storage.ts). Pages keep reading and writing
 * synchronously; each write updates the in-memory copy at once and is sent to the server in the
 * background, in order, retried until it succeeds.
 *
 * Lists of records are sent as record-level changes (changed / removed records), so two devices
 * that edit different quotes do not overwrite each other.
 */
import type { DataOp, KeyMap, KeyedOp } from "./keys";

type Rec = { id: string };
const isRecList = (v: unknown): v is Rec[] =>
  Array.isArray(v) &&
  v.every((x) => !!x && typeof x === "object" && typeof (x as Rec).id === "string");
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** What the server does with an "array" change (same rule as public.apply_data_op). */
export function applyArray<T extends Rec>(cur: T[], upsert: T[], remove: string[]): T[] {
  const gone = new Set([...upsert.map((x) => x.id), ...remove]);
  return [...upsert, ...cur.filter((x) => !gone.has(x.id))];
}

/**
 * The smallest change from prev to next. Lists of records become an "array" change when the
 * server would end up with the same order; maps of records (Drive records) a "map" change;
 * anything else is replaced whole. null when nothing changed.
 */
export function diffOp(prev: unknown, next: unknown, mapKey = false): DataOp | null {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (same(prev, next)) return null;
  if (isRecList(prev) && isRecList(next)) {
    const before = new Map(prev.map((x) => [x.id, JSON.stringify(x)]));
    const ids = new Set(next.map((x) => x.id));
    if (ids.size === next.length) {
      const upsert = next.filter((x) => before.get(x.id) !== JSON.stringify(x));
      const remove = prev.filter((x) => !ids.has(x.id)).map((x) => x.id);
      if (same(applyArray(prev, upsert, remove), next)) return { t: "array", upsert, remove };
    }
  }
  if (mapKey && isPlainObject(prev) && isPlainObject(next)) {
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next)) if (!same(prev[k], v)) set[k] = v;
    const remove = Object.keys(prev).filter((k) => !(k in next));
    return { t: "map", set, remove };
  }
  return { t: "replace", value: next };
}

export type SyncStatus = "saved" | "saving" | "retrying" | "error";

export type RemoteStore = {
  /** Browser keys served by this store. */
  keys: Set<string>;
  /** Raw JSON per browser key, like localStorage. */
  cache: Map<string, string>;
  write(key: string, raw: string): void;
  pending(): boolean;
  flush(): Promise<void>;
  onStatus(fn: (s: SyncStatus, error?: string) => void): () => void;
};

type Options = {
  endpoint: string;
  keyMap: KeyMap;
  /** Browser keys stored as maps of records (e.g. Drive records by document). */
  mapKeys?: string[];
  initial: Record<string, unknown>;
  fetch?: typeof fetch;
  /** A change the server refused for good (e.g. an issued invoice): the fresh server value. */
  onRejected?: (error: string) => void;
  retryDelays?: number[];
};

export function createRemoteStore(o: Options): RemoteStore {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const keys = new Set(Object.keys(o.keyMap));
  const cache = new Map<string, string>();
  for (const [browserKey, dbKey] of Object.entries(o.keyMap))
    if (o.initial[dbKey] !== undefined) cache.set(browserKey, JSON.stringify(o.initial[dbKey]));
  const queue: KeyedOp[] = [];
  const listeners = new Set<(s: SyncStatus, e?: string) => void>();
  const delays = o.retryDelays ?? [1000, 2000, 5000, 10000, 30000];
  let running: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const emit = (s: SyncStatus, e?: string) => listeners.forEach((l) => l(s, e));

  async function send(batch: KeyedOp[]) {
    for (let attempt = 0; ; attempt++) {
      let res: Response | null = null;
      try {
        res = await f(o.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ ops: batch }),
        });
      } catch {
        res = null;
      }
      if (res?.ok) return;
      // Refused for good (bad change, locked invoice, not allowed): stop and tell the page.
      if (
        res &&
        res.status >= 400 &&
        res.status < 500 &&
        res.status !== 408 &&
        res.status !== 429
      ) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const error = body?.error ?? `http_${res.status}`;
        emit("error", error);
        o.onRejected?.(error);
        return;
      }
      emit("retrying");
      await new Promise((r) => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]));
    }
  }

  function run() {
    if (running) return running;
    running = (async () => {
      while (queue.length) {
        emit("saving");
        await send(queue.splice(0, 50));
      }
      emit("saved");
    })().finally(() => {
      running = null;
      if (queue.length) void run();
    });
    return running;
  }

  return {
    keys,
    cache,
    write(key, raw) {
      const prev = cache.get(key);
      cache.set(key, raw);
      const op = diffOp(
        prev === undefined ? undefined : JSON.parse(prev),
        JSON.parse(raw),
        o.mapKeys?.includes(key),
      );
      if (!op) return;
      // A first value for a key is always sent whole.
      queue.push({
        key: o.keyMap[key]!,
        op: prev === undefined ? { t: "replace", value: JSON.parse(raw) } : op,
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, 250);
    },
    pending: () => queue.length > 0 || !!running || !!timer,
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await run();
    },
    onStatus(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
