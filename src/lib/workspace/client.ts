/**
 * Opens the signed-in company's workspace in the browser: its data comes from the server
 * (GET /api/workspace) and every save goes back to it (see sync.ts and storage.ts).
 *
 * The first time a company opens an empty workspace, the data this browser kept before accounts
 * existed is moved to the server once, when it belongs to this account (lib/account/link). The
 * browser keeps a backup copy under "devisplus.imported.*" and stops using it.
 */
import type { Locale } from "@/i18n/config";
import { linkTenant, type AccountUser } from "@/lib/account/link";
import { attachRemote } from "@/lib/storage";
import { loadTenant, saveTenant, type Tenant } from "@/lib/tenant";
import { PLATFORM_KEYS, WORKSPACE_KEYS, type KeyMap } from "./keys";
import { createRemoteStore, type RemoteStore, type SyncStatus } from "./sync";

export type Approval = "pending" | "approved" | "rejected" | "suspended";
export type WorkspaceOrg = {
  approval: Approval;
  note: string;
  role: string;
  companyName: string;
  domainState: "none" | "pending" | "active";
  customDomain: string;
};
export type OpenResult =
  | { kind: "open"; org: WorkspaceOrg; tenant: Tenant; imported: boolean }
  | { kind: "waiting"; org: WorkspaceOrg }
  | { kind: "error"; error: string };

type Listener = (s: SyncStatus, error?: string) => void;
const listeners = new Set<Listener>();
/** Save status of the open workspace (saving, retrying, refused…), for the page to show. */
export function onWorkspaceSync(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

type Opened = {
  userId: string;
  promise: Promise<OpenResult>;
  store?: RemoteStore;
  detach?: () => void;
};
let current: Opened | null = null;

const IMPORTED_PREFIX = "devisplus.imported.";

/** This browser's own saved values for the keys (raw JSON), before any server store is attached. */
function localValues(keyMap: KeyMap) {
  const out: [string, string][] = [];
  try {
    for (const k of Object.keys(keyMap)) {
      const v = localStorage.getItem(k);
      if (v && v !== "[]" && v !== "{}" && v !== "null") out.push([k, v]);
    }
  } catch {
    // storage unavailable: nothing to move
  }
  return out;
}

/** Sends this browser's values to a new, empty server store; on success keeps a backup copy only. */
async function importLocal(store: RemoteStore, values: [string, string][]) {
  if (!values.length) return false;
  let refused = false;
  const stop = store.onStatus((s) => {
    if (s === "error") refused = true;
  });
  for (const [k, raw] of values) store.write(k, raw);
  await store.flush();
  stop();
  if (refused) return false;
  try {
    for (const [k, raw] of values) {
      localStorage.setItem(IMPORTED_PREFIX + k.replace(/^devisplus\./, ""), raw);
      localStorage.removeItem(k);
    }
  } catch {
    // the backup could not be written: the originals stay, they are no longer read anyway
  }
  return true;
}

function warnBeforeLeaving(store: RemoteStore) {
  const onLeave = (e: BeforeUnloadEvent) => {
    if (!store.pending()) return;
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", onLeave);
  return () => window.removeEventListener("beforeunload", onLeave);
}

async function open(opened: Opened, user: AccountUser, locale: Locale): Promise<OpenResult> {
  let res: Response;
  try {
    res = await fetch("/api/workspace", { credentials: "same-origin" });
  } catch {
    return { kind: "error", error: "network" };
  }
  const body = (await res.json().catch(() => null)) as {
    org?: WorkspaceOrg;
    data?: Record<string, unknown>;
    error?: string;
  } | null;
  if (res.status === 403 && body?.org) return { kind: "waiting", org: body.org };
  if (!res.ok || !body?.org || !body.data)
    return { kind: "error", error: body?.error ?? `http_${res.status}` };

  // Read before the server store is attached: these are this browser's own values.
  let local: Tenant | null = null;
  try {
    local = loadTenant();
  } catch {
    local = null;
  }
  const mine = !("other" in linkTenant(local, user, locale));

  const store = createRemoteStore({
    endpoint: "/api/workspace",
    keyMap: WORKSPACE_KEYS,
    mapKeys: ["devisplus.drive"],
    initial: body.data,
  });
  store.onStatus((s, e) => listeners.forEach((l) => l(s, e)));
  const imported =
    Object.keys(body.data).length === 0 && mine
      ? await importLocal(store, localValues(WORKSPACE_KEYS))
      : false;
  // Signed out or switched account meanwhile: this workspace is not shown.
  if (current !== opened) return { kind: "error", error: "closed" };
  const detachStore = attachRemote(store);
  const stopWarning = warnBeforeLeaving(store);
  opened.store = store;
  opened.detach = () => {
    detachStore();
    stopWarning();
  };

  let tenant = loadTenant();
  if (!tenant) {
    // New workspace (the setup wizard follows), with the company name the team may have entered.
    const linked = linkTenant(null, user, locale) as { tenant: Tenant };
    tenant = linked.tenant;
    if (body.org.companyName)
      tenant = { ...tenant, profile: { ...tenant.profile, companyName: body.org.companyName } };
    saveTenant(tenant);
  } else if (!tenant.admin.userId) {
    // Moved from this browser (older browser-only account): now this account's.
    const linked = linkTenant(tenant, user, locale);
    if ("tenant" in linked && linked.changed) saveTenant((tenant = linked.tenant));
  }
  return { kind: "open", org: body.org, tenant, imported };
}

/**
 * The signed-in user's workspace, opened once per account and page load. A workspace waiting for
 * approval (or that failed to load) is asked again on the next call.
 */
export function openWorkspace(user: AccountUser, locale: Locale): Promise<OpenResult> {
  if (current?.userId === user.id) {
    const c = current;
    return c.promise.then((r) => {
      if (r.kind === "open" || current !== c) return r;
      current = null;
      return openWorkspace(user, locale);
    });
  }
  closeWorkspace();
  const opened = { userId: user.id } as Opened;
  current = opened;
  opened.promise = open(opened, user, locale);
  return opened.promise;
}

/** The tenant of the open workspace (after openWorkspace). */
export const openTenant = () => (current?.store ? loadTenant() : null);

/** Sends the changes not saved yet (e.g. before signing out). */
export async function flushWorkspace() {
  await current?.store?.flush();
}

export function closeWorkspace() {
  current?.detach?.();
  current = null;
}

// ---------- DevisPlus owner back-office ----------
let platform: Promise<boolean> | null = null;

/** Serves the customer register from the server (admins only); false when not allowed. */
export function openPlatformData(): Promise<boolean> {
  platform ??= (async () => {
    const res = await fetch("/api/admin/data", { credentials: "same-origin" }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
    if (!res?.ok || !body?.data) {
      platform = null;
      return false;
    }
    const store = createRemoteStore({
      endpoint: "/api/admin/data",
      keyMap: PLATFORM_KEYS,
      initial: body.data,
    });
    store.onStatus((s, e) => listeners.forEach((l) => l(s, e)));
    if (Object.keys(body.data).length === 0) await importLocal(store, localValues(PLATFORM_KEYS));
    attachRemote(store);
    warnBeforeLeaving(store);
    return true;
  })();
  return platform;
}
