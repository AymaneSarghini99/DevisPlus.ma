import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { DriveDocStatus } from "@/components/DriveDocStatus";
import { GoogleDriveIcon } from "@/components/GoogleDriveIcon";
import { A4Preview } from "@/components/QuoteDocument";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  DRIVE_EVENT,
  driveFileName,
  driveStatus,
  getDriveRecord,
  type DriveRecord,
} from "@/lib/driveSync";
import { quoteTotals, type Quote } from "@/lib/quotes";
import { loadSettings } from "@/lib/store";

/**
 * A quote's PDF in a pop-up: the copy saved in Google Drive (Drive's own viewer) when there is
 * one, otherwise the A4 preview, which is exactly what the PDF contains. The toolbar downloads
 * the PDF, saves or updates it in Drive, opens it in Drive, or opens the quote.
 */
export function QuotePdfDialog({ quote: q, onClose }: { quote: Quote; onClose: () => void }) {
  const { t } = useTranslation();
  const { dir, fmt } = useLocale();
  const [rec, setRec] = useState<DriveRecord | null>(() => getDriveRecord("devis", q.id));
  const [connected, setConnected] = useState<boolean | null>(null);
  const [view, setView] = useState<"drive" | "preview">(() =>
    getDriveRecord("devis", q.id)?.fileId ? "drive" : "preview",
  );
  const logo = loadSettings().logo;
  const ttc = quoteTotals(q).ttc;

  useEffect(() => {
    let alive = true;
    driveStatus().then((s) => alive && setConnected(s.connected));
    const sync = () => setRec(getDriveRecord("devis", q.id));
    window.addEventListener(DRIVE_EVENT, sync);
    return () => {
      alive = false;
      window.removeEventListener(DRIVE_EVENT, sync);
    };
  }, [q.id]);

  const onDrive = !!rec?.fileId && !rec.error;
  const showDrive = onDrive && view === "drive";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        dir={dir}
        className="flex h-[92vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 [&>button:last-child]:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <DialogTitle className="num flex items-center gap-2 text-base font-semibold">
              <bdi>{q.number}</bdi>
              {onDrive && <GoogleDriveIcon className="size-4" />}
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-muted-foreground">
              <bdi>{q.client.name || t("common.noClient")}</bdi> ·{" "}
              <bdi className="num">{fmt.money(ttc)}</bdi>
              {onDrive && rec?.uploadedAt && (
                <> · {t("account.pdf.savedOn", { date: fmt.date(rec.uploadedAt.slice(0, 10)) })}</>
              )}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {onDrive && (
              <div className="me-1 inline-flex rounded-[var(--radius)] border p-0.5 text-xs">
                {(["drive", "preview"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    className="rounded-[calc(var(--radius)-2px)] px-2.5 py-1 font-medium text-muted-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                    onClick={() => setView(v)}
                  >
                    {t(`account.pdf.view.${v}`)}
                  </button>
                ))}
              </div>
            )}
            <DownloadPdfButton fileName={`${t("editor.quoteLabel")} ${q.number}`} />
            <DriveDocStatus
              kind="devis"
              id={q.id}
              doc={q}
              date={q.issueDate}
              fileName={driveFileName(q.number, q.client.name, ttc)}
              auto={false}
              dirty={false}
            />
            {rec?.link && (
              <a
                href={rec.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost w-10 px-0"
                aria-label={t("account.pdf.openDrive")}
                title={t("account.pdf.openDrive")}
              >
                <ExternalLink className="size-4" />
              </a>
            )}
            <Link
              to="/devis/$id"
              params={{ id: q.id }}
              search={{}}
              className="btn btn-ghost w-10 px-0"
              aria-label={t("account.pdf.edit")}
              title={t("account.pdf.edit")}
            >
              <Pencil className="size-4" />
            </Link>
            <button
              type="button"
              className="btn btn-ghost w-10 px-0"
              aria-label={t("admin.form.close")}
              title={t("admin.form.close")}
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {connected === false && (
          <p className="border-b bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
            {t("account.pdf.notConnected")}{" "}
            <Link
              to="/parametres"
              hash="google-drive"
              className="font-medium underline underline-offset-2"
            >
              {t("account.pdf.connect")}
            </Link>
          </p>
        )}
        {connected && !onDrive && (
          <p className="border-b bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
            {t("account.pdf.notSaved")}
          </p>
        )}

        <div className="relative min-h-0 flex-1 overflow-auto bg-muted/50">
          {showDrive && (
            <iframe
              title={q.number}
              src={`https://drive.google.com/file/d/${encodeURIComponent(rec!.fileId!)}/preview`}
              className="absolute inset-0 size-full border-0"
              allow="autoplay"
            />
          )}
          {/* Always rendered: the download and the Drive upload draw the PDF from this sheet. */}
          <div
            className={
              showDrive
                ? "pointer-events-none absolute -start-[10000px] top-0 w-[794px]"
                : "p-4 sm:p-6"
            }
            aria-hidden={showDrive || undefined}
          >
            <A4Preview d={{ ...q, kind: "devis", secondDate: q.validUntil, logo }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
