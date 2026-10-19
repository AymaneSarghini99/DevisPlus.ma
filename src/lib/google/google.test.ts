import { describe, expect, it, vi } from "vitest";
import { parseConfig, type GoogleConfig } from "./config";
import { cleanFolderName } from "./google";
import {
  handleCallback,
  handleConnect,
  handleDisconnect,
  handleFolders,
  handleStatus,
  isDriveCallback,
  type Connection,
  type Deps,
} from "./handlers";
import { safeEqual, seal, unseal } from "./seal";

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i + 1)));
const ORIGIN = "https://atlas.devisplus.ma";
const config: GoogleConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: `${ORIGIN}/api/google/callback`,
  appOrigin: ORIGIN,
  encryptionKey: KEY,
  secureCookies: true,
};
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** Fake Google: answers by URL; records every call. */
function fakeGoogle(overrides: Record<string, (init?: RequestInit) => Response> = {}) {
  const calls: { url: string; body?: string | undefined }[] = [];
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  const routes: Record<string, (init?: RequestInit) => Response> = {
    "oauth2.googleapis.com/token": (init) => {
      const p = new URLSearchParams(String(init?.body));
      if (p.get("grant_type") === "refresh_token")
        return p.get("refresh_token") === "refresh-1"
          ? json({ access_token: "access-2", expires_in: 3600 })
          : json({ error: "invalid_grant" }, 400);
      return json({
        access_token: "access-1",
        refresh_token: "refresh-1",
        scope: `openid ${DRIVE_SCOPE} https://www.googleapis.com/auth/userinfo.email`,
      });
    },
    "openidconnect.googleapis.com/v1/userinfo": () =>
      json({ sub: "google-123", email: "owner@atlas.ma" }),
    "oauth2.googleapis.com/revoke": () => new Response("", { status: 200 }),
    "googleapis.com/drive/v3/files?q=": () =>
      json({ files: [{ id: "folder-aaaaaaaa", name: "Devis" }] }),
    "googleapis.com/drive/v3/files?fields=id,name": (init) =>
      json({ id: "folder-created1", name: JSON.parse(String(init?.body)).name }),
    "googleapis.com/drive/v3/files/folder-aaaaaaaa": () =>
      json({
        id: "folder-aaaaaaaa",
        name: "Devis",
        mimeType: "application/vnd.google-apps.folder",
        trashed: false,
      }),
    "googleapis.com/drive/v3/files/folder-gone0000": () => json({ error: {} }, 404),
    ...overrides,
  };
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? String(init.body) : undefined });
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected call ${url}`);
    return routes[key]!(init);
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

const deps = (fetchFn: typeof fetch, c: GoogleConfig | null = config): Deps => ({
  config: c,
  fetch: fetchFn,
});
const cookiesOf = (res: Response) => res.headers.getSetCookie();
const cookieHeader = (res: Response) =>
  cookiesOf(res)
    .map((c) => c.split(";")[0])
    .filter((c) => !c!.endsWith("="))
    .join("; ");

async function connectedCookie(folderId: string | null = null) {
  const conn: Connection = {
    v: 1,
    sub: "google-123",
    email: "owner@atlas.ma",
    refreshToken: "refresh-1",
    scope: DRIVE_SCOPE,
    folderId,
    folderName: folderId ? "Devis" : null,
    connectedAt: "2026-10-18T10:00:00.000Z",
  };
  return `__Host-dp_gdrive=${await seal(conn, KEY, "dp_gdrive")}`;
}
const post = (path: string, body: unknown, cookie: string, origin = ORIGIN) =>
  new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });

describe("configuration", () => {
  const env = {
    APP_URL: ORIGIN,
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_REDIRECT_URI: `${ORIGIN}/api/google/callback`,
    GOOGLE_TOKEN_ENCRYPTION_KEY: KEY,
  };
  it("accepts a complete configuration", () => {
    expect("config" in parseConfig(env)).toBe(true);
  });
  it("reports missing variables by name only", () => {
    expect(parseConfig({ ...env, GOOGLE_CLIENT_SECRET: "" })).toEqual({
      missing: ["GOOGLE_CLIENT_SECRET"],
    });
  });
  it("refuses a callback on another site, another path or plain http", () => {
    for (const uri of [
      "https://evil.example/api/google/callback",
      `${ORIGIN}/other`,
      "http://atlas.devisplus.ma/api/google/callback",
    ])
      expect(parseConfig({ ...env, GOOGLE_REDIRECT_URI: uri })).toEqual({
        missing: ["GOOGLE_REDIRECT_URI"],
      });
    expect(
      "config" in
        parseConfig({
          ...env,
          APP_URL: "http://localhost:8081",
          GOOGLE_REDIRECT_URI: "http://localhost:8081/api/google/callback",
        }),
    ).toBe(true);
  });
  it("requires a 32-byte encryption key", () => {
    expect(parseConfig({ ...env, GOOGLE_TOKEN_ENCRYPTION_KEY: btoa("short") })).toEqual({
      missing: ["GOOGLE_TOKEN_ENCRYPTION_KEY"],
    });
  });
});

describe("sealing", () => {
  it("round-trips and rejects tampering, another purpose or another key", async () => {
    const s = await seal({ refreshToken: "secret" }, KEY, "dp_gdrive");
    expect(s).not.toContain("secret");
    expect(await unseal(s, KEY, "dp_gdrive")).toEqual({ refreshToken: "secret" });
    expect(await unseal(s.slice(0, -2) + "AA", KEY, "dp_gdrive")).toBeNull();
    expect(await unseal(s, KEY, "dp_goauth")).toBeNull();
    const other = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));
    expect(await unseal(s, other, "dp_gdrive")).toBeNull();
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});

describe("OAuth flow", () => {
  it("connect redirects to Google with state, PKCE, offline access and drive.file", async () => {
    const res = await handleConnect(
      new Request(`${ORIGIN}/api/google/connect`),
      deps(fakeGoogle().fetchFn),
    );
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get("location")!);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("scope")).toContain(DRIVE_SCOPE);
    expect(url.searchParams.get("scope")).not.toMatch(/auth\/drive(\s|$)/);
    expect(url.searchParams.get("state")!.length).toBeGreaterThan(30);
    expect(url.toString()).not.toContain("client-secret");
    const tx = cookiesOf(res)[0]!;
    expect(tx).toMatch(/^__Host-dp_goauth=v1\./);
    expect(tx).toContain("HttpOnly");
    expect(tx).toContain("Secure");
    expect(tx).toContain("SameSite=Lax");
  });

  async function startFlow(fetchFn: typeof fetch) {
    const res = await handleConnect(new Request(`${ORIGIN}/api/google/connect`), deps(fetchFn));
    const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
    return { state, cookie: cookieHeader(res) };
  }
  const callback = (query: string, cookie: string) =>
    new Request(`${ORIGIN}/api/google/callback?${query}`, { headers: { cookie } });

  it("stores a sealed connection after a valid callback", async () => {
    const g = fakeGoogle();
    const { state, cookie } = await startFlow(g.fetchFn);
    const res = await handleCallback(
      callback(`state=${state}&code=auth-code`, cookie),
      deps(g.fetchFn),
    );
    expect(res.headers.get("location")).toBe("/parametres?drive=connected#google-drive");
    const tokenCall = g.calls.find((c) => c.url.includes("/token"))!;
    const body = new URLSearchParams(tokenCall.body);
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")!.length).toBeGreaterThan(40);
    const set = cookiesOf(res);
    expect(set.some((c) => c.startsWith("__Host-dp_goauth=;") && c.includes("Max-Age=0"))).toBe(
      true,
    );
    const conn = set.find((c) => c.startsWith("__Host-dp_gdrive=v1."))!;
    expect(conn).not.toContain("refresh-1"); // sealed, never readable
    const sealed = conn.split(";")[0]!.split("=")[1];
    expect(await unseal<Connection>(sealed, KEY, "dp_gdrive")).toMatchObject({
      sub: "google-123",
      email: "owner@atlas.ma",
      refreshToken: "refresh-1",
    });
  });

  it("rejects a wrong or missing state (CSRF) without calling Google", async () => {
    const g = fakeGoogle();
    const { cookie } = await startFlow(g.fetchFn);
    const res = await handleCallback(callback("state=forged&code=x", cookie), deps(g.fetchFn));
    expect(res.headers.get("location")).toContain("drive=state");
    const noCookie = await handleCallback(callback("state=a&code=x", ""), deps(g.fetchFn));
    expect(noCookie.headers.get("location")).toContain("drive=state");
    expect(g.calls.some((c) => c.url.includes("/token"))).toBe(false);
  });

  it("handles a cancelled consent", async () => {
    const res = await handleCallback(
      callback("error=access_denied", ""),
      deps(fakeGoogle().fetchFn),
    );
    expect(res.headers.get("location")).toContain("drive=denied");
  });

  it("revokes and refuses when the Drive permission was unticked", async () => {
    const g = fakeGoogle({
      "oauth2.googleapis.com/token": () =>
        new Response(
          JSON.stringify({ access_token: "a", refresh_token: "r", scope: "openid email" }),
        ),
    });
    const { state, cookie } = await startFlow(g.fetchFn);
    const res = await handleCallback(callback(`state=${state}&code=c`, cookie), deps(g.fetchFn));
    expect(res.headers.get("location")).toContain("drive=scope");
    expect(g.calls.some((c) => c.url.includes("/revoke"))).toBe(true);
    expect(cookiesOf(res).some((c) => c.startsWith("__Host-dp_gdrive=v1"))).toBe(false);
  });

  it("reports an expired authorization code without leaking Google's answer", async () => {
    const g = fakeGoogle({
      "oauth2.googleapis.com/token": () =>
        new Response(JSON.stringify({ error: "invalid_grant", error_description: "Bad Request" }), {
          status: 400,
        }),
    });
    const { state, cookie } = await startFlow(g.fetchFn);
    const res = await handleCallback(callback(`state=${state}&code=old`, cookie), deps(g.fetchFn));
    expect(res.headers.get("location")).toBe("/parametres?drive=revoked#google-drive");
  });

  it("redirects to settings when the deployment is not configured", async () => {
    const res = await handleConnect(
      new Request(`${ORIGIN}/api/google/connect`),
      deps(fakeGoogle().fetchFn, null),
    );
    expect(res.headers.get("location")).toContain("drive=not_configured");
  });
});

describe("status", () => {
  const get = (cookie: string) =>
    new Request(`${ORIGIN}/api/google/status`, { headers: { cookie } });

  it("is disconnected without a credential", async () => {
    const res = await handleStatus(get(""), deps(fakeGoogle().fetchFn));
    expect(await res.json()).toEqual({ configured: true, connected: false });
  });

  it("confirms the connection with Google and never returns the token", async () => {
    const res = await handleStatus(
      get(await connectedCookie("folder-aaaaaaaa")),
      deps(fakeGoogle().fetchFn),
    );
    const text = await res.text();
    expect(text).not.toContain("refresh-1");
    expect(JSON.parse(text)).toMatchObject({
      connected: true,
      email: "owner@atlas.ma",
      folder: { id: "folder-aaaaaaaa", name: "Devis" },
      folderStatus: "ok",
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("detects a deleted folder", async () => {
    const res = await handleStatus(
      get(await connectedCookie("folder-gone0000")),
      deps(fakeGoogle().fetchFn),
    );
    expect(await res.json()).toMatchObject({ connected: true, folderStatus: "missing" });
  });

  it("drops a revoked credential", async () => {
    const g = fakeGoogle({
      "oauth2.googleapis.com/token": () =>
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    });
    const res = await handleStatus(get(await connectedCookie()), deps(g.fetchFn));
    expect(await res.json()).toEqual({ configured: true, connected: false, error: "revoked" });
    expect(cookiesOf(res).some((c) => c.startsWith("__Host-dp_gdrive=;"))).toBe(true);
  });

  it("ignores a forged cookie", async () => {
    const res = await handleStatus(get("__Host-dp_gdrive=v1.forged"), deps(fakeGoogle().fetchFn));
    expect(await res.json()).toEqual({ configured: true, connected: false });
  });

  it("lists missing settings when not configured", async () => {
    const res = await handleStatus(get(""), {
      config: null,
      missing: ["GOOGLE_CLIENT_ID"],
      fetch: fakeGoogle().fetchFn,
    });
    expect(await res.json()).toEqual({
      configured: false,
      connected: false,
      missing: ["GOOGLE_CLIENT_ID"],
    });
  });
});

describe("folders and disconnect", () => {
  it("refuses requests from another site", async () => {
    const res = await handleFolders(
      post(
        "/api/google/folders",
        { action: "list" },
        await connectedCookie(),
        "https://evil.example",
      ),
      deps(fakeGoogle().fetchFn),
    );
    expect(res.status).toBe(403);
  });

  it("creates a folder with a cleaned name and remembers it", async () => {
    const g = fakeGoogle();
    const res = await handleFolders(
      post(
        "/api/google/folders",
        { action: "create", name: "  Devis /2026\u0007 " },
        await connectedCookie(),
      ),
      deps(g.fetchFn),
    );
    expect(await res.json()).toEqual({ folder: { id: "folder-created1", name: "Devis 2026" } });
    const sealed = cookiesOf(res)[0]!.split(";")[0]!.split("=")[1];
    expect(await unseal<Connection>(sealed, KEY, "dp_gdrive")).toMatchObject({
      folderId: "folder-created1",
    });
  });

  it("checks a selected folder with Google before saving it", async () => {
    const ok = await handleFolders(
      post(
        "/api/google/folders",
        { action: "select", id: "folder-aaaaaaaa" },
        await connectedCookie(),
      ),
      deps(fakeGoogle().fetchFn),
    );
    expect(ok.status).toBe(200);
    const gone = await handleFolders(
      post(
        "/api/google/folders",
        { action: "select", id: "folder-gone0000" },
        await connectedCookie(),
      ),
      deps(fakeGoogle().fetchFn),
    );
    expect(gone.status).toBe(404);
    expect(cookiesOf(gone)).toEqual([]);
    const bad = await handleFolders(
      post("/api/google/folders", { action: "select", id: "../../etc" }, await connectedCookie()),
      deps(fakeGoogle().fetchFn),
    );
    expect(bad.status).toBe(400);
  });

  it("needs a connection", async () => {
    const res = await handleFolders(
      post("/api/google/folders", { action: "list" }, ""),
      deps(fakeGoogle().fetchFn),
    );
    expect(res.status).toBe(401);
  });

  it("disconnect revokes the token at Google and deletes the credential", async () => {
    const g = fakeGoogle();
    const res = await handleDisconnect(
      post("/api/google/disconnect", {}, await connectedCookie()),
      deps(g.fetchFn),
    );
    expect(await res.json()).toEqual({ connected: false, revoked: true });
    const revokeCall = g.calls.find((c) => c.url.includes("/revoke"))!;
    expect(new URLSearchParams(revokeCall.body).get("token")).toBe("refresh-1");
    expect(cookiesOf(res)[0]).toMatch(/^__Host-dp_gdrive=;.*Max-Age=0/);
  });

  it("cleans folder names", () => {
    expect(cleanFolderName("  a  b ")).toBe("a b");
    expect(cleanFolderName("")).toBeNull();
    expect(cleanFolderName("x".repeat(101))).toBeNull();
    expect(cleanFolderName(42)).toBeNull();
  });
});

describe("shared callback with Google sign-in", () => {
  it("recognizes a Drive connection's return, and hands any other return to sign-in", async () => {
    const res = await handleConnect(
      new Request(`${ORIGIN}/api/google/connect`),
      deps(fakeGoogle().fetchFn),
    );
    const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
    const cookie = cookieHeader(res);
    const at = (query: string, c: string) =>
      new Request(`${ORIGIN}/api/google/callback?${query}`, { headers: { cookie: c } });
    const d = deps(fakeGoogle().fetchFn);
    expect(await isDriveCallback(at(`state=${state}&code=x`, cookie), d)).toBe(true);
    expect(await isDriveCallback(at("state=other&code=x", cookie), d)).toBe(false);
    expect(await isDriveCallback(at(`state=${state}&code=x`, ""), d)).toBe(false);
  });
});
