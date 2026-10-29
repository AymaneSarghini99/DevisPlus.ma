import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "@/components/WhatsAppWidget";
import { useLocale } from "@/i18n/LocaleProvider";
import { CONTACT } from "@/legal/operator";
import { authClient } from "@/lib/account/client";
import { whatsappUrl } from "@/lib/quotes";
import { loadTenant } from "@/lib/tenant";
import { onPaywall, trialLimit } from "@/lib/trial";

const BENEFITS = ["b1", "b2", "b3"] as const;

/**
 * End of the free trial: shown when a company in trial tries to create one quote more than
 * allowed. Rendered once by the page guard; opened with showPaywall() (lib/trial).
 *
 * One goal, one action: talk to the DevisPlus team on WhatsApp. The headline uses the company's
 * name, the full progress bar shows what was already achieved, the user is told the work is
 * kept, and "later" stays available but quiet.
 */
export function Paywall() {
  const { t } = useTranslation();
  const { dir } = useLocale();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => onPaywall(() => setOpen(true)), []);

  let company = "";
  try {
    company = loadTenant()?.profile.companyName.trim() ?? "";
  } catch {
    company = "";
  }
  const limit = trialLimit() ?? 10;
  const message = t("account.paywall.whatsappMessage", {
    company: company || "—",
    email: session?.user.email ?? "",
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pw-fade fixed inset-0 z-50 bg-[#14213D]/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          dir={dir}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-[26rem] -translate-y-1/2 overflow-y-auto outline-none"
        >
          <div className="pw-card relative overflow-hidden rounded-2xl bg-card shadow-2xl">
            <DialogPrimitive.Close
              className="absolute end-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={t("account.paywall.later")}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>

            <div className="px-6 pb-6 pt-7 sm:px-7">
              <p className="pw-item text-xs font-semibold uppercase tracking-wider text-emerald-700">
                {t("account.paywall.eyebrow")}
              </p>
              <DialogPrimitive.Title
                className="pw-item mt-2 text-[1.6rem] font-semibold leading-tight tracking-tight"
                style={{ animationDelay: "60ms" }}
              >
                {company ? t("account.paywall.titleFor", { company }) : t("account.paywall.title")}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className="pw-item mt-2 text-sm text-muted-foreground"
                style={{ animationDelay: "120ms" }}
              >
                {t("account.paywall.text", { n: limit })}
              </DialogPrimitive.Description>

              <div className="pw-item mt-5" style={{ animationDelay: "180ms" }}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("account.paywall.used")}</span>
                  <span className="num font-semibold">
                    {limit}/{limit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="pw-fill h-full w-full rounded-full bg-gradient-to-r from-[#B7F34A] to-emerald-500" />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 shrink-0 text-emerald-600" />
                  {t("account.paywall.kept", { n: limit })}
                </p>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm">
                {BENEFITS.map((b, i) => (
                  <li
                    key={b}
                    className="pw-item flex gap-2.5"
                    style={{ animationDelay: `${260 + i * 80}ms` }}
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="size-3.5" />
                    </span>
                    {t(`account.paywall.${b}`)}
                  </li>
                ))}
              </ul>

              <a
                href={whatsappUrl(CONTACT.whatsapp, message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="pw-item relative mt-6 flex h-[3.25rem] w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[#25D366] text-[0.95rem] font-semibold text-white shadow-lg shadow-[#25D366]/30 transition hover:-translate-y-px hover:shadow-xl hover:shadow-[#25D366]/35 active:translate-y-0"
                style={{ animationDelay: "520ms" }}
              >
                <span
                  aria-hidden
                  className="pw-shine absolute inset-y-0 start-0 w-1/4 bg-white/25"
                />
                <WhatsAppIcon className="relative size-5" />
                <span className="relative">{t("account.paywall.whatsapp")}</span>
              </a>
              <p
                className="pw-item mt-2 text-center text-xs text-muted-foreground"
                style={{ animationDelay: "580ms" }}
              >
                {t("account.paywall.reassure")}
              </p>

              <DialogPrimitive.Close
                className="pw-item mt-3 w-full rounded-lg py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                style={{ animationDelay: "640ms" }}
              >
                {t("account.paywall.later")}
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
