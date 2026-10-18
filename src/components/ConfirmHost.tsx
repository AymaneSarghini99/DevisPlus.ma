import { useEffect, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { onConfirmRequest, type ConfirmRequest } from "@/lib/confirm";

/** Renders the confirmations asked with askConfirm(). Mounted once, in the root layout. */
export function ConfirmHost() {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [open, setOpen] = useState(false);
  const pending = useRef<ConfirmRequest | null>(null);

  useEffect(() => {
    onConfirmRequest((r) => {
      pending.current?.resolve(false); // a newer question replaces an unanswered one
      pending.current = r;
      setReq(r);
      setOpen(true);
    });
    return () => onConfirmRequest(null);
  }, []);

  const answer = (ok: boolean) => {
    pending.current?.resolve(ok);
    pending.current = null;
    setOpen(false);
  };

  const danger = req?.tone === "danger";
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && answer(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-[#0b1220]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialog.Content
          dir={dir}
          className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-[0_24px_60px_-20px_rgb(11_18_32/0.45)] duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {req && (
            <>
              <div className="flex items-start gap-4">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    danger ? "bg-red-100 text-red-700" : "bg-accent text-accent-foreground"
                  }`}
                >
                  {danger ? <Trash2 className="size-5" /> : <AlertTriangle className="size-5" />}
                </span>
                <div className="min-w-0 pt-1.5">
                  <AlertDialog.Title className="text-base font-semibold leading-snug">
                    <bdi>{unbreakable(req.title)}</bdi>
                  </AlertDialog.Title>
                  <AlertDialog.Description
                    className={`mt-1.5 whitespace-pre-line text-sm text-muted-foreground ${req.description ? "" : "sr-only"}`}
                  >
                    {req.description || req.title}
                  </AlertDialog.Description>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {/* Radix focuses Cancel first: Enter never deletes by accident. */}
                <AlertDialog.Cancel className="btn btn-ghost" onClick={() => answer(false)}>
                  {req.cancelLabel ?? t("common.cancel")}
                </AlertDialog.Cancel>
                <AlertDialog.Action
                  className={`btn ${danger ? "bg-red-600 text-white hover:bg-red-700" : "btn-primary"}`}
                  onClick={() => answer(true)}
                >
                  {req.confirmLabel ?? (danger ? t("common.delete") : t("common.confirm"))}
                </AlertDialog.Action>
              </div>
            </>
          )}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Keeps document numbers such as DV-2026-001 on one line (non-breaking hyphens). */
const unbreakable = (text: string) =>
  text.replace(/\b([A-Z]{1,4})-(\d{4})-(\d+)\b/g, "$1\u2011$2\u2011$3");
