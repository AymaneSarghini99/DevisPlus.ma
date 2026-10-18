/**
 * HTTP handlers of the Google Drive integration (used by the /api/google/* server routes).
 *
 * Credential storage (this phase, no database yet): the Google refresh token is sealed with
 * AES-256-GCM using GOOGLE_TOKEN_ENCRYPTION_KEY (a server secret) and kept in an HttpOnly,
 * SameSite=Lax cookie. Page scripts cannot read it (HttpOnly) and nobody can decrypt it without
 * the server key; only this server uses it. The connection therefore belongs to the browser
 * that connected it, which matches the current app where each browser holds its workspace.
 * When accounts and Supabase are added, the sealed value moves to a server-only table.
 */
import type { GoogleConfig } from "./config";
import {
  authUrl,
  cleanFolderName,
  createFolder,
  createPdf,
  ensureFolder,
  DRIVE_FILE_SCOPE,
  exchangeCode,
  getFolder,
  GoogleError,
  listFolders,
  refreshAccessToken,
  revoke,
  updatePdf,
  userInfo,
  type GoogleErrorCode,
} from "./google";
import { randomToken, safeEqual, seal, sha256b64url, unseal } from "./seal";

export type Deps = { config: GoogleConfig | null; missing?: string[]; fetch: typeof fetch };

export type Connection = {
  v: 1;
  sub: string;
  email: string;
  refreshToken: string;
  scope: string;
  folderId: string | null;
  folderName: string | null;
  connectedAt: string;
};
type OAuthTx = { state: string; verifier: string; exp: number };

const CONN = "dp_gdrive";
const TX = "dp_goauth";
const CONN_MAX_AGE = 180 * 24 * 3600;
const TX_MAX_AGE = 600;

// ---------- cookies ----------
const cookieName = (c: GoogleConfig, base: string) => (c.secureCookies ? `__Host-${base}` : base);

function readCookie(req: Request, name: string) {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}
function cookie(c: GoogleConfig, base: string, value: string, maxAge: number) {
  return [
    `${cookieName(c, base)}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(c.secureCookies ? ["Secure"] : []),
  ].join("; ");
}
const clear = (c: GoogleConfig, base: string) => cookie(c, base, "", 0);

// ---------- responses ----------
const NO_STORE = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
function json(data: unknown, status = 200, cookies: string[] = []) {
  const h = new Headers({ "content-type": "application/json", ...NO_STORE });
  cookies.forEach((x) => h.append("set-cookie", x));
  return new Response(JSON.stringify(data), { status, headers: h });
}
function redirect(location: string, cookies: string[] = []) {
  const h = new Headers({ location, ...NO_STORE });
  cookies.forEach((x) => h.append("set-cookie", x));
  return new Response(null, { status: 302, headers: h });
}
/** Back to the settings page with a result code (never a token or a Google message). */
const back = (result: string, cookies: string[] = []) =>
  redirect(`/parametres?drive=${encodeURIComponent(result)}#google-drive`, cookies);

const codeOf = (e: unknown): GoogleErrorCode | "error" =>
  e instanceof GoogleError ? e.code : "error";

async function loadConnection(req: Request, c: GoogleConfig) {
  return unseal<Connection>(readCookie(req, cookieName(c, CONN)), c.encryptionKey, CONN);
}
async function saveConnection(c: GoogleConfig, conn: Connection) {
  return cookie(c, CONN, await seal(conn, c.encryptionKey, CONN), CONN_MAX_AGE);
}

/** State-changing calls must come from this deployment's own pages (CSRF protection). */
function sameOrigin(req: Request, c: GoogleConfig) {
  return (
    req.headers.get("origin") === c.appOrigin &&
    (req.headers.get("content-type") ?? "").startsWith("application/json")
  );
}

// ---------- handlers ----------

/** GET /api/google/connect — starts the OAuth flow (state + PKCE). */
export async function handleConnect(_req: Request, d: Deps) {
  const c = d.config;
  if (!c) return back("not_configured");
  const tx: OAuthTx = {
    state: randomToken(),
    verifier: randomToken(48),
    exp: Date.now() + TX_MAX_AGE * 1000,
  };
  const challenge = await sha256b64url(tx.verifier);
  return redirect(authUrl(c, tx.state, challenge), [
    cookie(c, TX, await seal(tx, c.encryptionKey, TX), TX_MAX_AGE),
  ]);
}

/** GET /api/google/callback — Google redirects here with ?code&state (or ?error). */
export async function handleCallback(req: Request, d: Deps) {
  const c = d.config;
  if (!c) return back("not_configured");
  const url = new URL(req.url);
  const clearTx = clear(c, TX);
  const error = url.searchParams.get("error");
  if (error) return back(error === "access_denied" ? "denied" : "error", [clearTx]);

  const tx = await unseal<OAuthTx>(readCookie(req, cookieName(c, TX)), c.encryptionKey, TX);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!tx || tx.exp < Date.now() || !state || !safeEqual(state, tx.state) || !code)
    return back("state", [clearTx]);

  try {
    const t = await exchangeCode(c, code, tx.verifier, d.fetch);
    const scopes = (t.scope ?? "").split(/\s+/);
    if (!scopes.includes(DRIVE_FILE_SCOPE)) {
      // Granular consent: the user unticked Drive. Do not keep a useless grant.
      await revoke(t.refresh_token ?? t.access_token, d.fetch);
      return back("scope", [clearTx]);
    }
    if (!t.refresh_token) return back("error", [clearTx]);
    const who = await userInfo(t.access_token, d.fetch);
    const previous = await loadConnection(req, c);
    const sameAccount = previous?.sub === who.sub;
    if (previous && !sameAccount) await revoke(previous.refreshToken, d.fetch);
    const conn: Connection = {
      v: 1,
      sub: who.sub,
      email: who.email,
      refreshToken: t.refresh_token,
      scope: t.scope ?? "",
      folderId: sameAccount ? previous.folderId : null,
      folderName: sameAccount ? previous.folderName : null,
      connectedAt: new Date().toISOString(),
    };
    return back("connected", [clearTx, await saveConnection(c, conn)]);
  } catch (e) {
    return back(codeOf(e), [clearTx]);
  }
}

/** GET /api/google/status — real state, confirmed with Google (token refresh). */
export async function handleStatus(req: Request, d: Deps) {
  const c = d.config;
  if (!c) return json({ configured: false, connected: false, missing: d.missing ?? [] });
  const conn = await loadConnection(req, c);
  if (!conn) return json({ configured: true, connected: false });
  try {
    const token = await refreshAccessToken(c, conn.refreshToken, d.fetch);
    let folderStatus: "none" | "ok" | "missing" = "none";
    let folderName = conn.folderName;
    if (conn.folderId) {
      try {
        folderName = (await getFolder(token, conn.folderId, d.fetch)).name;
        folderStatus = "ok";
      } catch (e) {
        if (codeOf(e) !== "folder_missing") throw e;
        folderStatus = "missing";
      }
    }
    return json({
      configured: true,
      connected: true,
      email: conn.email,
      connectedAt: conn.connectedAt,
      folder: conn.folderId ? { id: conn.folderId, name: folderName } : null,
      folderStatus,
    });
  } catch (e) {
    const code = codeOf(e);
    if (code === "revoked")
      return json({ configured: true, connected: false, error: "revoked" }, 200, [clear(c, CONN)]);
    // Google unreachable: the connection exists but cannot be confirmed right now.
    return json({ configured: true, connected: true, email: conn.email, error: code }, 200);
  }
}

/** POST /api/google/folders — {action:"list"} | {action:"create", name} | {action:"select", id}. */
export async function handleFolders(req: Request, d: Deps) {
  const c = d.config;
  if (!c) return json({ error: "not_configured" }, 503);
  if (!sameOrigin(req, c)) return json({ error: "forbidden" }, 403);
  const conn = await loadConnection(req, c);
  if (!conn) return json({ error: "not_connected" }, 401);
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    name?: unknown;
    id?: unknown;
  } | null;
  try {
    const token = await refreshAccessToken(c, conn.refreshToken, d.fetch);
    if (body?.action === "list") return json({ folders: await listFolders(token, d.fetch) });
    let folder: { id: string; name: string };
    if (body?.action === "create") {
      const name = cleanFolderName(body.name);
      if (!name) return json({ error: "bad_request" }, 400);
      folder = await createFolder(token, name, d.fetch);
    } else if (body?.action === "select" && typeof body.id === "string") {
      folder = await getFolder(token, body.id, d.fetch); // validated server-side with Google
    } else return json({ error: "bad_request" }, 400);
    const next = { ...conn, folderId: folder.id, folderName: folder.name };
    return json({ folder }, 200, [await saveConnection(c, next)]);
  } catch (e) {
    const code = codeOf(e);
    return json(
      { error: code },
      code === "revoked"
        ? 401
        : code === "folder_missing"
          ? 404
          : code === "bad_request"
            ? 400
            : code === "rate_limited"
              ? 429
              : 502,
      code === "revoked" ? [clear(c, CONN)] : [],
    );
  }
}

/** POST /api/google/disconnect — revokes the grant at Google and deletes the credential. */
export async function handleDisconnect(req: Request, d: Deps) {
  const c = d.config;
  if (!c) return json({ error: "not_configured" }, 503);
  if (!sameOrigin(req, c)) return json({ error: "forbidden" }, 403);
  const conn = await loadConnection(req, c);
  const revoked = conn ? await revoke(conn.refreshToken, d.fetch) : true;
  return json({ connected: false, revoked }, 200, [clear(c, CONN)]);
}

// ---------- quotation PDF upload ----------

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
/** "10 - Octobre": numbered so months sort in calendar order in Drive. */
export const monthFolderName = (m: number) => `${String(m).padStart(2, "0")} - ${MONTHS[m - 1]}`;
const TYPE_FOLDER = { devis: "Devis", facture: "Factures" } as const;
const MAX_PDF = 15 * 1024 * 1024;

/** Safe Drive file name ending in .pdf (no slashes or control characters, 150 chars max). */
export function cleanPdfName(name: unknown) {
  const base = cleanFolderName(
    typeof name === "string" ? name.replace(/\.pdf$/i, "").slice(0, 146) : name,
  );
  return base ? `${base}.pdf` : null;
}

/**
 * POST /api/google/upload (multipart form): kind=devis|facture, year, month, name, file (PDF),
 * fileId (optional: the Drive file uploaded earlier for this document).
 *
 * Files go to <chosen folder>/<Devis|Factures>/<year>/<"10 - Octobre">/. When fileId is given
 * and the file still exists, its content is replaced (one file per document; Drive keeps the
 * previous versions). Otherwise a new file is created.
 */
export async function handleUpload(req: Request, d: Deps) {
  const c = d.config;
  if (!c) return json({ error: "not_configured" }, 503);
  if (req.headers.get("origin") !== c.appOrigin) return json({ error: "forbidden" }, 403);
  const conn = await loadConnection(req, c);
  if (!conn) return json({ error: "not_connected" }, 401);
  if (!conn.folderId) return json({ error: "no_folder" }, 409);

  const form = await req.formData().catch(() => null);
  const kind = form?.get("kind");
  const year = Number(form?.get("year"));
  const month = Number(form?.get("month"));
  const name = cleanPdfName(form?.get("name"));
  const fileId = form?.get("fileId");
  const file = form?.get("file");
  if (
    (kind !== "devis" && kind !== "facture") ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !name ||
    !file ||
    typeof file === "string" ||
    typeof (file as Blob).arrayBuffer !== "function"
  )
    return json({ error: "bad_request" }, 400);
  const blob = file as Blob;
  if (blob.size > MAX_PDF) return json({ error: "too_large" }, 413);
  const pdf = new Uint8Array(await blob.arrayBuffer());
  if (String.fromCharCode(...pdf.slice(0, 5)) !== "%PDF-")
    return json({ error: "bad_request" }, 400);

  try {
    const token = await refreshAccessToken(c, conn.refreshToken, d.fetch);
    await getFolder(token, conn.folderId, d.fetch); // still there, not in the trash
    let uploaded =
      typeof fileId === "string" && fileId
        ? await updatePdf(token, fileId, name, pdf, d.fetch)
        : null;
    const updated = !!uploaded;
    let path: string | null = null;
    if (!uploaded) {
      const type = await ensureFolder(token, conn.folderId, TYPE_FOLDER[kind], d.fetch);
      const y = await ensureFolder(token, type.id, String(year), d.fetch);
      const m = await ensureFolder(token, y.id, monthFolderName(month), d.fetch);
      uploaded = await createPdf(token, m.id, name, pdf, d.fetch);
      path = `${TYPE_FOLDER[kind]}/${year}/${monthFolderName(month)}`;
    }
    return json({
      fileId: uploaded.id,
      name: uploaded.name,
      link: uploaded.webViewLink,
      folderId: conn.folderId,
      updated,
      path,
    });
  } catch (e) {
    const code = codeOf(e);
    return json(
      { error: code },
      code === "revoked"
        ? 401
        : code === "folder_missing"
          ? 404
          : code === "rate_limited"
            ? 429
            : 502,
      code === "revoked" ? [clear(c, CONN)] : [],
    );
  }
}
