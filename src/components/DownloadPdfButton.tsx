import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { downloadPdf } from "@/lib/pdf";

/** Icon button that downloads the A4 preview shown on the page as a PDF file. */
export function DownloadPdfButton({
  fileName,
  beforeRender,
}: {
  fileName: string;
  /** Brings the A4 preview on screen first (phones show the form or the preview). */
  beforeRender?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost w-10 px-0"
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? t("common.pdfPreparing") : t("common.downloadPdf")}
      title={busy ? t("common.pdfPreparing") : t("common.downloadPdf")}
      onClick={async () => {
        await beforeRender?.();
        const sheet = document.querySelector<HTMLElement>(".a4-sheet > *");
        if (!sheet) return;
        setBusy(true);
        try {
          await downloadPdf(sheet, fileName);
        } catch {
          toast.error(t("common.pdfFailed"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
    </button>
  );
}
