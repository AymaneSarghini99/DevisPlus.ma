import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/i18n/LocaleProvider";
import {
  DRIVE_EVENT,
  driveStatus,
  fingerprint,
  getDriveRecord,
  needsUpload,
  uploadToDrive,
  type DriveKind,
  type DriveRecord,
} from "@/lib/driveSync";
import { GoogleDriveIcon } from "./GoogleDriveIcon";

const KNOWN = [
  "revoked",
  "scope",
  "folder_missing",
  "no_folder",
  "rate_limited",
  "google_unavailable",
  "not_connected",
  "too_large",
  "network",
];

/**
 * Google Drive state of one saved document, as a single icon in the toolbar:
 * a spinning ring while uploading, a green check once saved (click opens the file), a red
 * mark on failure (click retries). With `auto`, the saved version uploads by itself
 * (quotes once sent, issued invoices). A short message appears in the middle of the page
 * when an upload finishes. Nothing is shown when Google Drive is not connected.
 */
export function DriveDocStatus({
  kind,
  id,
  doc,
  date,
  fileName,
  auto,
  dirty,
}: {
  kind: DriveKind;
  id: string;
  doc: object;
  date: string;
  fileName: string;
  auto: boolean;
  dirty: boolean;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);
  const [rec, setRec] = useState<DriveRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<DriveRecord | null>(null);
  const tried = useRef("");

  useEffect(() => {
    let alive = true;
    driveStatus().then((s) => alive && setFolderId(s.connected ? s.folderId : null));
    const sync = () => setRec(getDriveRecord(kind, id));
    sync();
    window.addEventListener(DRIVE_EVENT, sync);
    return () => {
      alive = false;
      window.removeEventListener(DRIVE_EVENT, sync);
    };
  }, [kind, id]);

  // The "saved" message fades out on its own.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), 2600);
    return () => clearTimeout(timer);
  }, [done]);

  const hash = fingerprint(doc);
  const upload = async (force: boolean) => {
    // Let the A4 preview show the saved version before it is captured.
    await new Promise((r) => setTimeout(r, 400));
    const node = document.querySelector<HTMLElement>(".a4-sheet > *");
    if (!node) return;
    setBusy(true);
    const r = await uploadToDrive({ kind, id, doc, date, fileName, node, force });
    setBusy(false);
    if (!r) return;
    setRec(r);
    if (r.error)
      toast.error(t(`drive.doc.error.${KNOWN.includes(r.error) ? r.error : "error"}` as never));
    else setDone(r);
  };

  // Automatic upload of the saved version, once per version (no loop on failure).
  useEffect(() => {
    if (!auto || dirty || !folderId || busy) return;
    if (!needsUpload(getDriveRecord(kind, id), hash, folderId)) return;
    const attempt = `${hash}:${folderId}`;
    if (tried.current === attempt) return;
    tried.current = attempt;
    void upload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, dirty, folderId, hash]);

  if (!folderId) return null;
  const upToDate = !!rec?.fileId && !rec.error && rec.hash === hash && rec.folderId === folderId;
  const error = rec?.error ? (KNOWN.includes(rec.error) ? rec.error : "error") : null;

  const label = busy
    ? t("drive.doc.uploading")
    : error
      ? `${t(`drive.doc.error.${error}` as never)} ${t("drive.doc.clickRetry")}`
      : upToDate
        ? t("drive.doc.saved", { date: fmt.date(rec!.uploadedAt!.slice(0, 10)) })
        : rec?.fileId
          ? t("drive.doc.update")
          : t("drive.doc.saveNow");

  const onClick = () => {
    if (busy) return;
    if (upToDate && rec?.link) window.open(rec.link, "_blank", "noopener,noreferrer");
    else if (!dirty) void upload(true);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost relative w-10 px-0"
        aria-label={label}
        title={label}
        aria-busy={busy}
        disabled={busy || (dirty && !upToDate)}
        onClick={onClick}
      >
        <GoogleDriveIcon className={`size-4 ${upToDate || busy || error ? "" : "opacity-60"}`} />
        {busy && (
          <span
            aria-hidden
            className="absolute inset-1.5 animate-spin rounded-full border-2 border-[#1a73e8]/20 border-t-[#1a73e8]"
          />
        )}
        {!busy && upToDate && (
          <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
            <Check className="size-2.5" strokeWidth={4} />
          </span>
        )}
        {!busy && error && (
          <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-background">
            !
          </span>
        )}
      </button>

      {done && (
        <div
          role="status"
          className="drive-done fixed left-1/2 top-1/2 z-[70] flex items-center gap-3 rounded-full border bg-card px-5 py-3 text-sm font-medium shadow-[0_18px_44px_-14px_rgb(20_30_60/0.4)]"
        >
          <span className="relative">
            <GoogleDriveIcon className="size-5" />
            <span className="absolute -bottom-1 -end-1.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-card">
              <Check className="size-2" strokeWidth={4} />
            </span>
          </span>
          {t("drive.doc.savedToast")}
          {done.link && (
            <a
              href={done.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {t("drive.doc.open")} <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      )}
    </>
  );
}
