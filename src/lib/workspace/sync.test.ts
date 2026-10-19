import { afterEach, describe, expect, it, vi } from "vitest";
import { attachRemote, read, write } from "@/lib/storage";
import { validOps, WORKSPACE_KEYS } from "./keys";
import { applyArray, createRemoteStore, diffOp } from "./sync";

describe("changes sent to the server", () => {
  const a = { id: "a", v: 1 };
  const b = { id: "b", v: 2 };
  const c = { id: "c", v: 3 };

  it("sends only the changed and removed records of a list", () => {
    // saveQuote puts the saved record first: [b', a] from [a, b, c] (c deleted).
    const next = [{ ...b, v: 20 }, a];
    expect(diffOp([a, b, c], next)).toEqual({
      t: "array",
      upsert: [{ id: "b", v: 20 }],
      remove: ["c"],
    });
    expect(applyArray([a, b, c], [{ ...b, v: 20 }], ["c"])).toEqual(next);
    expect(diffOp([a, b], [a, b])).toBeNull();
  });

  it("replaces the whole value when record changes cannot give the same order", () => {
    expect(diffOp([a, b, c], [a, c, b])).toEqual({ t: "replace", value: [a, c, b] });
    expect(diffOp({ x: 1 }, { x: 2 })).toEqual({ t: "replace", value: { x: 2 } });
  });

  it("sends map changes for records keyed by id", () => {
    expect(diffOp({ q1: { f: 1 }, q2: { f: 2 } }, { q2: { f: 3 }, q3: { f: 4 } }, true)).toEqual({
      t: "map",
      set: { q2: { f: 3 }, q3: { f: 4 } },
      remove: ["q1"],
    });
  });

  it("checks request bodies on the server side", () => {
    const keys = Object.values(WORKSPACE_KEYS);
    expect(
      validOps({ ops: [{ key: "quotes", op: { t: "array", upsert: [a], remove: [] } }] }, keys),
    ).not.toBeNull();
    expect(validOps({ ops: [{ key: "owner", op: { t: "replace", value: 1 } }] }, keys)).toBeNull();
    expect(
      validOps(
        { ops: [{ key: "quotes", op: { t: "array", upsert: [{ v: 1 }], remove: [] } }] },
        keys,
      ),
    ).toBeNull();
    expect(validOps({ ops: [{ key: "tenant", op: { t: "drop" } }] }, keys)).toBeNull();
    expect(validOps({ ops: [] }, keys)).toBeNull();
  });
});

describe("server-backed storage", () => {
  let detach: (() => void) | null = null;
  afterEach(() => {
    detach?.();
    detach = null;
    vi.useRealTimers();
  });

  const fakeServer = (statuses: number[] = []) => {
    const bodies: unknown[] = [];
    const f = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      const status = statuses.shift() ?? 200;
      return new Response(
        JSON.stringify(status === 200 ? { ok: true } : { error: "issuedLocked" }),
        {
          status,
        },
      );
    });
    return { f: f as unknown as typeof fetch, bodies };
  };

  it("reads and writes the workspace keys in memory and sends the changes in order", async () => {
    const { f, bodies } = fakeServer();
    const store = createRemoteStore({
      endpoint: "/api/workspace",
      keyMap: WORKSPACE_KEYS,
      initial: { clients: [{ id: "c1", name: "A" }] },
      fetch: f,
    });
    detach = attachRemote(store);
    localStorage.setItem("devisplus.clients", JSON.stringify([{ id: "local" }]));
    expect(read("devisplus.clients", [])).toEqual([{ id: "c1", name: "A" }]);
    write("devisplus.clients", [
      { id: "c2", name: "B" },
      { id: "c1", name: "A" },
    ]);
    write("devisplus.settings", { accent: "#000000" });
    expect(read("devisplus.settings", {})).toEqual({ accent: "#000000" });
    // Keys that are not part of the workspace stay in the browser.
    write("devisplus.lang.test", "ar");
    expect(localStorage.getItem("devisplus.lang.test")).toBe('"ar"');
    expect(localStorage.getItem("devisplus.clients")).toBe('[{"id":"local"}]');
    expect(store.pending()).toBe(true);
    await store.flush();
    expect(store.pending()).toBe(false);
    expect(bodies).toEqual([
      {
        ops: [
          { key: "clients", op: { t: "array", upsert: [{ id: "c2", name: "B" }], remove: [] } },
          { key: "settings", op: { t: "replace", value: { accent: "#000000" } } },
        ],
      },
    ]);
  });

  it("retries when the server cannot be reached, and reports a refused change", async () => {
    const { f, bodies } = fakeServer([503, 200, 409]);
    const seen: string[] = [];
    const store = createRemoteStore({
      endpoint: "/api/workspace",
      keyMap: WORKSPACE_KEYS,
      initial: {},
      fetch: f,
      retryDelays: [1],
    });
    store.onStatus((s, e) => seen.push(e ? `${s}:${e}` : s));
    store.write("devisplus.quotes", "[]");
    await store.flush();
    expect(bodies).toHaveLength(2);
    store.write("devisplus.quotes", JSON.stringify([{ id: "q1" }]));
    await store.flush();
    expect(seen).toContain("retrying");
    expect(seen).toContain("error:issuedLocked");
    expect(store.pending()).toBe(false);
  });
});
