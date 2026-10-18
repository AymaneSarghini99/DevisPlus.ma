/**
 * Minimal Google OAuth 2.0 + Drive v3 client (server only, plain fetch: no SDK needed on
 * Cloudflare). Every call takes `fetchFn` so tests can mock Google.
 *
 * Scopes: "openid email" to identify the account, and drive.file, the narrowest Drive scope:
 * the app can only see and manage files and folders it created itself (or that the user
 * explicitly opens with it through the Google Picker). It cannot browse the rest of the Drive.
 */
import type { GoogleConfig } from "./config";

export const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive.file"];
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const DRIVE = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type Fetch = typeof fetch;

/** Safe, user-facing error codes (no Google payloads or tokens leave the server). */
export type GoogleErrorCode =
  | "revoked" // refresh token no longer valid: the user must reconnect
  | "scope" // Drive permission not granted
  | "folder_missing" // folder deleted, trashed or no longer accessible
  | "rate_limited"
  | "google_unavailable"
  | "bad_request";

export class GoogleError extends Error {
  constructor(public code: GoogleErrorCode) {
    super(code);
  }
}

export function authUrl(c: GoogleConfig, state: string, codeChallenge: string, loginHint?: string) {
  const u = new URL(AUTH_URL);
  u.search = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // returns a refresh token
    prompt: "consent", // makes Google return the refresh token again on reconnect
    include_granted_scopes: "true",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).toString();
  return u.toString();
}

async function tokenRequest(fetchFn: Fetch, body: Record<string, string>) {
  let res: Response;
  try {
    res = await fetchFn(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });
  } catch {
    throw new GoogleError("google_unavailable");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (data["error"] === "invalid_grant") throw new GoogleError("revoked");
    if (res.status === 429) throw new GoogleError("rate_limited");
    throw new GoogleError(res.status >= 500 ? "google_unavailable" : "bad_request");
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    expires_in?: number;
  };
}

export const exchangeCode = (c: GoogleConfig, code: string, verifier: string, fetchFn: Fetch) =>
  tokenRequest(fetchFn, {
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
  });

export async function refreshAccessToken(c: GoogleConfig, refreshToken: string, fetchFn: Fetch) {
  const t = await tokenRequest(fetchFn, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: c.clientId,
    client_secret: c.clientSecret,
  });
  return t.access_token;
}

/** Revokes the grant at Google (best effort: the local credential is deleted anyway). */
export async function revoke(token: string, fetchFn: Fetch) {
  try {
    const res = await fetchFn(REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function userInfo(accessToken: string, fetchFn: Fetch) {
  const res = await fetchFn(USERINFO_URL, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new GoogleError(res.status >= 500 ? "google_unavailable" : "bad_request");
  const u = (await res.json()) as { sub?: string; email?: string; email_verified?: boolean };
  if (!u.sub) throw new GoogleError("bad_request");
  return { sub: u.sub, email: u.email ?? "" };
}

async function drive(accessToken: string, path: string, fetchFn: Fetch, init: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetchFn(path.startsWith("https://") ? path : `${DRIVE}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
    });
  } catch {
    throw new GoogleError("google_unavailable");
  }
  if (res.ok) return res.json() as Promise<Record<string, unknown>>;
  if (res.status === 404) throw new GoogleError("folder_missing");
  if (res.status === 401) throw new GoogleError("revoked");
  if (res.status === 429) throw new GoogleError("rate_limited");
  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { errors?: { reason?: string }[] };
    };
    const reason = body.error?.errors?.[0]?.reason ?? "";
    throw new GoogleError(/rateLimit/i.test(reason) ? "rate_limited" : "scope");
  }
  throw new GoogleError(res.status >= 500 ? "google_unavailable" : "bad_request");
}

export type DriveFolder = { id: string; name: string };

/** Folders this app can use (with drive.file: the folders it created, not in the trash). */
export async function listFolders(accessToken: string, fetchFn: Fetch): Promise<DriveFolder[]> {
  const q = encodeURIComponent(`mimeType='${FOLDER_MIME}' and trashed=false`);
  const data = await drive(
    accessToken,
    `/files?q=${q}&fields=files(id,name)&orderBy=createdTime desc&pageSize=50&spaces=drive`,
    fetchFn,
  );
  return ((data["files"] as DriveFolder[] | undefined) ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }));
}

/** Checks a folder the browser asked for: it must exist, be a folder and not be trashed. */
export async function getFolder(accessToken: string, id: string, fetchFn: Fetch) {
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) throw new GoogleError("bad_request");
  const f = (await drive(accessToken, `/files/${id}?fields=id,name,mimeType,trashed`, fetchFn)) as {
    id: string;
    name: string;
    mimeType: string;
    trashed: boolean;
  };
  if (f.mimeType !== FOLDER_MIME || f.trashed) throw new GoogleError("folder_missing");
  return { id: f.id, name: f.name };
}

export async function createFolder(
  accessToken: string,
  name: string,
  fetchFn: Fetch,
  parentId?: string,
) {
  const f = (await drive(accessToken, "/files?fields=id,name", fetchFn, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })) as DriveFolder;
  return { id: f.id, name: f.name };
}

/** Folder names: printable, no slashes or control characters, 1–100 characters. */
export function cleanFolderName(name: unknown) {
  if (typeof name !== "string") return null;
  const n = [...name]
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) !== 127 && ch !== "/" && ch !== "\\")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return n.length >= 1 && n.length <= 100 ? n : null;
}

// ---------- quotation PDFs ----------

const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
/** Quotes for a Drive query string literal. */
const q = (v: string) => `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** The sub-folder `name` inside `parentId`, created if it does not exist yet. */
export async function ensureFolder(
  accessToken: string,
  parentId: string,
  name: string,
  fetchFn: Fetch,
) {
  const query = encodeURIComponent(
    `name=${q(name)} and ${q(parentId)} in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
  );
  const found = await drive(
    accessToken,
    `/files?q=${query}&fields=files(id,name)&pageSize=1`,
    fetchFn,
  );
  const first = (found["files"] as DriveFolder[] | undefined)?.[0];
  return first ?? createFolder(accessToken, name, fetchFn, parentId);
}

export type UploadedFile = { id: string; name: string; webViewLink: string };

function multipart(metadata: object, pdf: Uint8Array) {
  const boundary = `devisplus-${crypto.getRandomValues(new Uint32Array(2)).join("")}`;
  const head =
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n--${boundary}\r\ncontent-type: application/pdf\r\n\r\n`;
  return {
    body: new Blob([head, pdf as BlobPart, `\r\n--${boundary}--`]),
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

/** Creates a PDF in `parentId`. */
export async function createPdf(
  accessToken: string,
  parentId: string,
  name: string,
  pdf: Uint8Array,
  fetchFn: Fetch,
) {
  const m = multipart({ name, parents: [parentId], mimeType: "application/pdf" }, pdf);
  return (await drive(
    accessToken,
    `${UPLOAD}?uploadType=multipart&fields=id,name,webViewLink`,
    fetchFn,
    {
      method: "POST",
      headers: { "content-type": m.contentType },
      body: m.body,
    },
  )) as UploadedFile;
}

/**
 * Replaces the content (and name) of a PDF uploaded earlier. Returns null when that file no
 * longer exists or was put in the trash, so the caller creates a new one.
 */
export async function updatePdf(
  accessToken: string,
  fileId: string,
  name: string,
  pdf: Uint8Array,
  fetchFn: Fetch,
): Promise<UploadedFile | null> {
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(fileId)) return null;
  try {
    const meta = await drive(accessToken, `/files/${fileId}?fields=id,trashed`, fetchFn);
    if (meta["trashed"]) return null;
  } catch (e) {
    if (e instanceof GoogleError && e.code === "folder_missing") return null;
    throw e;
  }
  const m = multipart({ name }, pdf);
  return (await drive(
    accessToken,
    `${UPLOAD}/${fileId}?uploadType=multipart&fields=id,name,webViewLink`,
    fetchFn,
    { method: "PATCH", headers: { "content-type": m.contentType }, body: m.body },
  )) as UploadedFile;
}
