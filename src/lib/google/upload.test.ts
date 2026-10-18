import { describe, expect, it, vi } from "vitest";
import type { GoogleConfig } from "./config";
import { cleanPdfName, handleUpload, monthFolderName, type Connection } from "./handlers";
import { seal } from "./seal";

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i + 7)));
const ORIGIN = "https://devis.climatizone.com";
const config: GoogleConfig = {
  clientId: "id",
  clientSecret: "secret",
  redirectUri: `${ORIGIN}/api/google/callback`,
  appOrigin: ORIGIN,
  encryptionKey: KEY,
  secureCookies: true,
};
const ROOT = "rootfolder000001";
const PDF = new TextEncoder().encode("%PDF-1.4 fake pdf body");

/** Reads a Blob in the test DOM (whose Blob has no .text()). */
const readBlob = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });

/** In-memory Drive: folders and files with parents, as the real API returns them. */
function fakeDrive() {
  const items = new Map<
    string,
    { name: string; parent: string | null; folder: boolean; trashed?: boolean; size?: number }
  >();
  items.set(ROOT, { name: "Climatizone – Devis & Factures", parent: null, folder: true });
  let n = 0;
  const newId = () => `id${String(++n).padStart(14, "0")}`;
  const json = (d: unknown, status = 200) =>
    new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json" } });
  const calls: string[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);
    if (url.hostname === "oauth2.googleapis.com") return json({ access_token: "access" });
    const path = url.pathname.replace(/^\/(upload\/)?drive\/v3\/files\/?/, "");
    if (method === "GET" && !path) {
      // files.list: name='X' and 'parent' in parents
      const q = url.searchParams.get("q") ?? "";
      const name = /name='([^']*)'/.exec(q)?.[1];
      const parent = /'([^']*)' in parents/.exec(q)?.[1];
      const files = [...items.entries()]
        .filter(([, v]) => v.folder && !v.trashed && v.name === name && v.parent === parent)
        .map(([id, v]) => ({ id, name: v.name }));
      return json({ files });
    }
    if (method === "GET") {
      const it = items.get(path);
      if (!it) return json({ error: {} }, 404);
      return json({
        id: path,
        name: it.name,
        trashed: !!it.trashed,
        mimeType: it.folder ? "application/vnd.google-apps.folder" : "application/pdf",
      });
    }
    const raw = typeof init?.body === "string" ? init.body : await readBlob(init?.body as Blob);
    // Folder creation sends JSON; uploads send multipart (metadata part first).
    const meta = raw.startsWith("{")
      ? JSON.parse(raw)
      : JSON.parse(raw.split("\r\n\r\n")[1]!.split("\r\n")[0]!);
    if (method === "POST" && !url.pathname.startsWith("/upload")) {
      const id = newId();
      items.set(id, { name: meta.name, parent: meta.parents[0], folder: true });
      return json({ id, name: meta.name });
    }
    if (method === "POST") {
      const id = newId();
      items.set(id, { name: meta.name, parent: meta.parents[0], folder: false, size: raw.length });
      return json({
        id,
        name: meta.name,
        webViewLink: `https://drive.google.com/file/d/${id}/view`,
      });
    }
    if (method === "PATCH") {
      const it = items.get(path)!;
      it.name = meta.name;
      return json({
        id: path,
        name: meta.name,
        webViewLink: `https://drive.google.com/file/d/${path}/view`,
      });
    }
    throw new Error(`unexpected ${method} ${url}`);
  }) as unknown as typeof fetch;
  /** "Devis/2026/10 - Octobre/file.pdf" for a file id. */
  const pathOf = (id: string): string => {
    const it = items.get(id)!;
    return it.parent && it.parent !== ROOT ? `${pathOf(it.parent)}/${it.name}` : it.name;
  };
  return { fetchFn, items, pathOf, calls };
}

async function cookie(folderId: string | null = ROOT) {
  const conn: Connection = {
    v: 1,
    sub: "s",
    email: "compta@climatizone.com",
    refreshToken: "refresh",
    scope: "",
    folderId,
    folderName: folderId ? "Climatizone – Devis & Factures" : null,
    connectedAt: "2026-10-18T00:00:00Z",
  };
  return `__Host-dp_gdrive=${await seal(conn, KEY, "dp_gdrive")}`;
}

async function upload(
  fetchFn: typeof fetch,
  fields: Record<string, string>,
  opts: { pdf?: Uint8Array; origin?: string; folderId?: string | null } = {},
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.set("file", new Blob([(opts.pdf ?? PDF) as BlobPart], { type: "application/pdf" }), "x.pdf");
  const req = new Request(`${ORIGIN}/api/google/upload`, {
    method: "POST",
    headers: {
      origin: opts.origin ?? ORIGIN,
      cookie: await cookie(opts.folderId === undefined ? ROOT : opts.folderId),
    },
    body: form,
  });
  const res = await handleUpload(req, { config, fetch: fetchFn });
  return {
    status: res.status,
    body: (await res.json()) as UploadBody,
  };
}

type UploadBody = {
  fileId?: string;
  path?: string | null;
  updated?: boolean;
  error?: string;
};

const quote = {
  kind: "devis",
  year: "2026",
  month: "10",
  name: "DV-2026-001 – Hôtel Tanger Bay – 86 400 DH",
};

describe("Drive upload", () => {
  it("files a quote under Devis/year/month and reuses those folders", async () => {
    const d = fakeDrive();
    const a = await upload(d.fetchFn, quote);
    expect(a.status).toBe(200);
    expect(a.body.path).toBe("Devis/2026/10 - Octobre");
    expect(d.pathOf(String(a.body.fileId))).toBe(
      "Devis/2026/10 - Octobre/DV-2026-001 – Hôtel Tanger Bay – 86 400 DH.pdf",
    );
    const b = await upload(d.fetchFn, { ...quote, name: "DV-2026-002 – Résidence Malabata" });
    expect(d.pathOf(String(b.body.fileId))).toBe(
      "Devis/2026/10 - Octobre/DV-2026-002 – Résidence Malabata.pdf",
    );
    const folders = [...d.items.values()].filter((x) => x.folder);
    expect(folders.map((f) => f.name).sort()).toEqual(
      ["10 - Octobre", "2026", "Climatizone – Devis & Factures", "Devis"].sort(),
    );
  });

  it("files invoices under Factures", async () => {
    const d = fakeDrive();
    const r = await upload(d.fetchFn, {
      ...quote,
      kind: "facture",
      month: "1",
      name: "FA-2026-001 – X",
    });
    expect(d.pathOf(String(r.body.fileId))).toBe("Factures/2026/01 - Janvier/FA-2026-001 – X.pdf");
  });

  it("updates the same file after an edit instead of creating a duplicate", async () => {
    const d = fakeDrive();
    const first = await upload(d.fetchFn, quote);
    const second = await upload(d.fetchFn, {
      ...quote,
      name: "DV-2026-001 – Hôtel Tanger Bay – 90 000 DH",
      fileId: String(first.body.fileId),
    });
    expect(second.body).toMatchObject({ fileId: first.body.fileId, updated: true });
    expect([...d.items.values()].filter((x) => !x.folder)).toHaveLength(1);
    expect(d.pathOf(String(first.body.fileId))).toMatch(/90 000 DH\.pdf$/);
  });

  it("creates a new file when the previous one was deleted or trashed", async () => {
    const d = fakeDrive();
    const first = await upload(d.fetchFn, quote);
    d.items.get(String(first.body.fileId))!.trashed = true;
    const again = await upload(d.fetchFn, { ...quote, fileId: String(first.body.fileId) });
    expect(again.body.updated).toBe(false);
    expect(again.body.fileId).not.toBe(first.body.fileId);
    const gone = await upload(d.fetchFn, { ...quote, fileId: "doesnotexist0000" });
    expect(gone.status).toBe(200);
    expect(gone.body.updated).toBe(false);
  });

  it("refuses non-PDF files, bad fields, other sites, and missing folders", async () => {
    const d = fakeDrive();
    expect(
      (await upload(d.fetchFn, quote, { pdf: new TextEncoder().encode("<html>") })).status,
    ).toBe(400);
    expect((await upload(d.fetchFn, { ...quote, kind: "other" })).status).toBe(400);
    expect((await upload(d.fetchFn, { ...quote, month: "13" })).status).toBe(400);
    expect((await upload(d.fetchFn, quote, { origin: "https://evil.example" })).status).toBe(403);
    expect((await upload(d.fetchFn, quote, { folderId: null })).body.error).toBe("no_folder");
    d.items.get(ROOT)!.trashed = true;
    const r = await upload(d.fetchFn, quote);
    expect(r).toEqual({ status: 404, body: { error: "folder_missing" } });
    expect(d.calls.some((c) => c.startsWith("POST /upload"))).toBe(false);
  });

  it("names month folders so they sort in calendar order", () => {
    expect(monthFolderName(8)).toBe("08 - Août");
    expect(monthFolderName(12)).toBe("12 - Décembre");
    expect(cleanPdfName("A/B: c")).toBe("AB: c.pdf");
    expect(cleanPdfName("x.pdf")).toBe("x.pdf");
    expect(cleanPdfName("")).toBeNull();
  });
});
