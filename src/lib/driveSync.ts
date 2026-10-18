/**
 * Automatic copy of quotations and invoices to the connected Google Drive folder.
 *
 * - The PDF is the same one "Download PDF" produces (rendered from the A4 preview).
 * - One Drive file per document: later versions replace its content (Drive keeps the history).
 * - A fingerprint of the document decides whether an upload is needed, so refreshing a page
 *   or saving without changes never creates duplicates.
 * - Uploads run one at a time, so two documents never race to create the same month folder.
 *
 * Upload records live in their own storage key (not inside the quotes), so saving a quote can
 * never erase the link to its Drive file. With a database, this becomes the
 * quote_drive_uploads table (see docs/google-drive.md).
 */
import { renderPdf } from "./pdf";
import { read, write } from "./storage";

export type DriveKind = "devis" | "facture";
export type DriveRecord = {
  fileId: string | null;
  link: string | null;
  /** Destination folder at upload time: choosing another folder starts a new file there. */
  folderId: string | null;
  /** Fingerprint of the document content last uploaded. */
  hash: string;
  uploadedAt: string | null;
  /** Safe error code of the last failed attempt (null after a success). */
  error: string | null;
  attempts: number;
};
export type DriveStatus = { connected: boolean; folderId: string | null };

const KEY = "devisplus.drive";
export const DRIVE_EVENT = "devisplus:drive";
const recordKey = (kind: DriveKind, id: string) => `${kind}:${id}`;

export const loadDriveRecords = () => read<Record<string, DriveRecord>>(KEY, {});
export const getDriveRecord = (kind: DriveKind, id: string) =>
  loadDriveRecords()[recordKey(kind, id)] ?? null;
function setDriveRecord(kind: DriveKind, id: string, rec: DriveRecord) {
  write(KEY, { ...loadDriveRecords(), [recordKey(kind, id)]: rec });
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(DRIVE_EVENT, { detail: recordKey(kind, id) }));
}

// ---------- pure helpers (tested) ----------

/** JSON with sorted keys, so the same content always gives the same text. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
/** Fingerprint of what appears on the PDF. Follow-up reminders are left out (not printed). */
export function fingerprint(doc: object) {
  const { reminders: _r, ...rest } = doc as Record<string, unknown>;
  const s = stable(rest);
  let a = 0x811c9dc5,
    b = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    a = Math.imul(a ^ s.charCodeAt(i), 0x01000193) >>> 0;
    b = Math.imul(b ^ s.charCodeAt(i), 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

/** "DV-2026-001 – Atlas Rénovation – 12 500 DH" (the server adds ".pdf"). */
export function driveFileName(number: string, client: string, ttc: number) {
  const amount = `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })
    .format(ttc)
    .replace(/\s/g, " ")} DH`;
  return [number, client.trim(), amount].filter(Boolean).join(" – ");
}

/** Year and month of a yyyy-mm-dd date (falls back to today). */
export function periodOf(date: string) {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  const now = new Date();
  return m
    ? { year: Number(m[1]), month: Number(m[2]) }
    : { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** True when the saved document differs from the copy in Drive (or was never uploaded). */
export function needsUpload(rec: DriveRecord | null, hash: string, folderId: string | null) {
  return !rec || !rec.fileId || rec.hash !== hash || rec.folderId !== folderId || !!rec.error;
}

// ---------- connection status (asked to the server, cached briefly) ----------

let statusCache: { at: number; p: Promise<DriveStatus> } | null = null;
export function driveStatus(force = false): Promise<DriveStatus> {
  if (!force && statusCache && Date.now() - statusCache.at < 60_000) return statusCache.p;
  const p = fetch("/api/google/status", { credentials: "same-origin" })
    .then((r) => r.json())
    .then((s: { connected?: boolean; folder?: { id: string } | null; folderStatus?: string }) => ({
      connected: !!s.connected,
      folderId: s.folderStatus === "ok" && s.folder ? s.folder.id : null,
    }))
    .catch(() => ({ connected: false, folderId: null }));
  statusCache = { at: Date.now(), p };
  return p;
}
export const forgetDriveStatus = () => {
  statusCache = null;
};

// ---------- upload ----------

let queue: Promise<unknown> = Promise.resolve();
const inFlight = new Map<string, Promise<DriveRecord | null>>();

export type UploadRequest = {
  kind: DriveKind;
  id: string;
  /** The saved document (for the fingerprint). */
  doc: object;
  /** Issue date (yyyy-mm-dd): decides the year/month folder of a new file. */
  date: string;
  fileName: string;
  /** The A4 sheet to render. */
  node: HTMLElement;
  /** Upload even if Drive already has this exact version. */
  force?: boolean;
};

/**
 * Uploads (or updates) one document. Resolves to its record, or null when Drive is not
 * connected / no folder is chosen (nothing to do). Never throws: failures are recorded.
 */
export function uploadToDrive(req: UploadRequest): Promise<DriveRecord | null> {
  const k = recordKey(req.kind, req.id);
  const running = inFlight.get(k);
  if (running) return running;
  const job = queue.then(() => runUpload(req));
  queue = job.catch(() => undefined);
  inFlight.set(k, job);
  void job.finally(() => inFlight.delete(k));
  return job;
}

async function runUpload(req: UploadRequest): Promise<DriveRecord | null> {
  const status = await driveStatus();
  if (!status.connected || !status.folderId) return null;
  const prev = getDriveRecord(req.kind, req.id);
  const hash = fingerprint(req.doc);
  if (!req.force && !needsUpload(prev, hash, status.folderId)) return prev;

  const fail = (error: string): DriveRecord => {
    const rec: DriveRecord = {
      fileId: prev?.fileId ?? null,
      link: prev?.link ?? null,
      folderId: prev?.folderId ?? null,
      hash: prev?.hash ?? "",
      uploadedAt: prev?.uploadedAt ?? null,
      error,
      attempts: (prev?.attempts ?? 0) + 1,
    };
    setDriveRecord(req.kind, req.id, rec);
    return rec;
  };

  try {
    const pdf = await renderPdf(req.node, req.fileName);
    const { year, month } = periodOf(req.date);
    const form = new FormData();
    form.set("kind", req.kind);
    form.set("year", String(year));
    form.set("month", String(month));
    form.set("name", req.fileName);
    // Same destination folder: replace the existing file instead of creating a new one.
    if (prev?.fileId && prev.folderId === status.folderId) form.set("fileId", prev.fileId);
    form.set("file", pdf, "document.pdf");
    const res = await fetch("/api/google/upload", {
      method: "POST",
      body: form,
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({ error: "error" }))) as {
      error?: string;
      fileId?: string;
      link?: string;
      folderId?: string;
    };
    if (!res.ok || !data.fileId) {
      if (["revoked", "not_connected", "folder_missing", "no_folder"].includes(data.error ?? ""))
        forgetDriveStatus();
      return fail(data.error ?? "error");
    }
    const rec: DriveRecord = {
      fileId: data.fileId,
      link: data.link ?? null,
      folderId: data.folderId ?? status.folderId,
      hash,
      uploadedAt: new Date().toISOString(),
      error: null,
      attempts: 0,
    };
    setDriveRecord(req.kind, req.id, rec);
    return rec;
  } catch {
    return fail("network");
  }
}
