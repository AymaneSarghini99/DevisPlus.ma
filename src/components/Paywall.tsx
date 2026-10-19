import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Crown, Mail, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "@/components/WhatsAppWidget";
import { useLocale } from "@/i18n/LocaleProvider";
import { CONTACT } from "@/legal/operator";
import { authClient } from "@/lib/account/client";
import { OFFER_PRICE } from "@/lib/customers";
import { whatsappUrl } from "@/lib/quotes";
import { loadTenant } from "@/lib/tenant";
import { onPaywall, trialLimit } from "@/lib/trial";

const BENEFITS = ["b1", "b2", "b3", "b4"] as const;

/**
 * End of the free trial: shown when a company in trial tries to create one quote more than
 * allowed. Rendered once by the page guard; opened with showPaywall() (lib/trial).
 */
export function Paywall() {
  const { t } = useTranslation();
  const { dir, fmt } = useLocale();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => onPaywall(() => setOpen(true)), []);

  let company = "";
  try {
    company = loadTenant()?.profile.companyName ?? "";
  } catch {
    company = "";
  }
  const limit = trialLimit() ?? 2;
  const message = t("account.paywall.whatsappMessage", {
    company: company || "—",
    email: session?.user.email ?? "",
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pw-fade fixed inset-0 z-50 bg-[#14213D]/55 backdrop-blur-sm" />
        <DialogPrimitive.Content
          dir={dir}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-md -translate-y-1/2 overflow-y-auto outline-none"
        >
          <div className="pw-card overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="relative overflow-hidden bg-[#14213D] px-6 pb-6 pt-7 text-white">
              <div
                aria-hidden
                className="absolute -end-10 -top-12 size-40 rounded-full bg-[#B7F34A]/20 blur-2xl"
              />
              <DialogPrimitive.Close
                className="absolute end-3 top-3 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={t("account.paywall.later")}
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
              <span className="pw-float inline-flex size-12 items-center justify-center rounded-xl bg-[#B7F34A] text-[#14213D] shadow-lg">
                <Crown className="size-6" />
              </span>
              <DialogPrimitive.Title className="mt-4 text-2xl font-semibold tracking-tight">
                {t("account.paywall.title")}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1.5 text-sm text-white/75">
                {t("account.paywall.text", { n: limit })}
              </DialogPrimitive.Description>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-white/70">
                  <span>{t("account.paywall.used")}</span>
                  <span className="num">
                    {limit}/{limit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="pw-fill h-full w-full rounded-full bg-[#B7F34A]" />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-5">
              <ul className="space-y-2.5 text-sm">
                {BENEFITS.map((b, i) => (
                  <li
                    key={b}
                    className="pw-item flex gap-2.5"
                    style={{ animationDelay: `${300 + i * 90}ms` }}
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="size-3.5" />
                    </span>
                    {t(`account.paywall.${b}`)}
                  </li>
                ))}
              </ul>

              <div
                className="pw-item mt-5 flex items-baseline justify-between rounded-xl border bg-muted/40 px-4 py-3"
                style={{ animationDelay: "700ms" }}
              >
                <span className="text-sm text-muted-foreground">{t("pricing.planName")}</span>
                <span>
                  <bdi className="num text-xl font-semibold">{fmt.money(OFFER_PRICE)}</bdi>
                  <span className="ms-1.5 text-xs text-muted-foreground">
                    {t("account.paywall.once")}
                  </span>
                </span>
              </div>

              <a
                href={whatsappUrl(CONTACT.whatsapp, message)}
                target="_blank"
                rel="noopener noreferrer"
                className="pw-item relative mt-5 flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[#25D366] font-semibold text-white shadow-lg shadow-[#25D366]/30 transition hover:brightness-95"
                style={{ animationDelay: "800ms" }}
              >
                <span
                  aria-hidden
                  className="pw-shine absolute inset-y-0 start-0 w-1/4 bg-white/30"
                />
                <WhatsAppIcon className="relative size-5" />
                <span className="relative">{t("account.paywall.whatsapp")}</span>
              </a>
              <div
                className="pw-item mt-3 flex items-center justify-between gap-2 text-sm"
                style={{ animationDelay: "880ms" }}
              >
                <a
                  className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(t("account.paywall.emailSubject"))}&body=${encodeURIComponent(message)}`}
                >
                  <Mail className="size-4" />
                  {t("account.paywall.email")}
                </a>
                <Link
                  to="/tarifs"
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => setOpen(false)}
                >
                  {t("account.paywall.offer")}
                </Link>
              </div>
              <DialogPrimitive.Close className="mt-4 w-full rounded-lg py-2 text-xs text-muted-foreground transition hover:bg-muted">
                {t("account.paywall.later")}
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
