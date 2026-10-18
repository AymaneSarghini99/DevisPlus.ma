import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Save bar pinned to the bottom of the editing column (never over the A4 preview).
 * Shows whether the document has unsaved changes, next to the actions.
 */
export function SaveBar({
  dirty,
  saved,
  children,
}: {
  dirty: boolean;
  saved: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    // On phones, room is left on the end side for the floating WhatsApp button.
    <div className="no-print sticky bottom-4 z-30 me-20 lg:me-0">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border bg-card/95 px-4 py-3 shadow-[0_12px_32px_-12px_rgb(20_30_60/0.35)] backdrop-blur">
        <span
          role="status"
          className={`flex min-w-0 items-center gap-1.5 truncate text-sm ${dirty ? "font-medium text-amber-700" : "text-muted-foreground"}`}
        >
          {dirty ? (
            <>
              <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
              {t("common.unsaved")}
            </>
          ) : saved ? (
            <>
              <Check className="size-4 shrink-0" /> {t("common.saved")}
            </>
          ) : null}
        </span>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
