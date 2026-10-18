import { useMemo, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { A4Preview } from "@/components/QuoteDocument";
import { NATIVE_NAME } from "@/i18n/config";
import { useFormat } from "@/i18n/LocaleProvider";
import type { OnboardingStep } from "@/onboarding/config";
import { stepErrors } from "@/lib/tenant";
import { previewDoc, workspaceAddress } from "@/onboarding/preview";
import type { StepProps } from "./shared";

export function ReviewStep({ tenant, goTo }: StepProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { profile: p, branding: b, quotes: q, domain: d } = tenant;
  const doc = useMemo(() => previewDoc(tenant), [tenant]);

  const rows: { step: OnboardingStep; body: ReactNode }[] = [
    {
      step: "profile",
      body: (
        <>
          <p className="font-medium">
            <bdi>{p.companyName || "—"}</bdi>
            {p.sector && (
              <span className="font-normal text-muted-foreground">
                {" · "}
                {t(`onboarding.sectors.${p.sector}`)}
              </span>
            )}
          </p>
          <p className="text-muted-foreground">
            <bdi>{[p.address, p.city].filter(Boolean).join(", ")}</bdi>
          </p>
          {tenant.admin.email && (
            <p className="text-muted-foreground">
              {t("onboarding.review.admin")} <bdi dir="ltr">{tenant.admin.email}</bdi>
            </p>
          )}
          <p className="text-muted-foreground">
            <bdi dir="ltr">{p.phone}</bdi>
            {p.email && (
              <>
                {" · "}
                <bdi dir="ltr">{p.email}</bdi>
              </>
            )}
          </p>
        </>
      ),
    },
    {
      step: "logo",
      body: b.logo ? (
        <img src={b.logo} alt="" className="max-h-10 max-w-40 object-contain" />
      ) : (
        <p className="text-muted-foreground">{t("onboarding.review.noLogo")}</p>
      ),
    },
    {
      step: "branding",
      body: (
        <p className="flex items-center gap-2">
          <span
            className="size-4 rounded-sm"
            style={{ background: b.accent, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / .12)" }}
          />
          <span className="num text-muted-foreground">{b.accent.toUpperCase()}</span>
          <span>· {t(`templates.names.${b.template}.name`)}</span>
        </p>
      ),
    },
    {
      step: "quotes",
      body: (
        <p className="text-muted-foreground">
          {t("onboarding.review.validity", { n: q.validityDays })} ·{" "}
          {t("onboarding.review.deposit", { n: fmt.percent(q.deposit) })} ·{" "}
          {t("onboarding.review.vat", { n: fmt.percent(q.defaultVat) })} ·{" "}
          {t("onboarding.review.docLang", { lang: NATIVE_NAME[q.docLang] })}
        </p>
      ),
    },
    {
      step: "domain",
      body: (
        <p className="text-muted-foreground">
          <bdi dir="ltr" className="num font-medium text-foreground">
            {workspaceAddress(d)}
          </bdi>{" "}
          — {t("onboarding.domain.statusPending")}
        </p>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <ul className="divide-y rounded-[var(--radius)] border">
        {rows.map(({ step, body }, i) => {
          const ok = Object.keys(stepErrors(tenant, step)).length === 0;
          return (
            <li
              key={step}
              className="ob-enter flex items-start gap-4 p-4"
              style={{ animationDelay: `${180 + i * 60}ms` }}
            >
              {ok ? (
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-emerald-600"
                  aria-label={t("onboarding.review.complete")}
                />
              ) : (
                <AlertCircle
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  aria-label={t("onboarding.review.incomplete")}
                />
              )}
              <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(`onboarding.steps.${step}`)}
                  {!ok && (
                    <span className="ms-2 normal-case tracking-normal text-destructive">
                      {t("onboarding.review.incomplete")}
                    </span>
                  )}
                </p>
                {body}
              </div>
              <button type="button" className="btn btn-ghost h-8 px-2.5" onClick={() => goTo(step)}>
                <Pencil className="size-3.5" /> {t("onboarding.review.edit")}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="ob-enter lg:self-start" style={{ animationDelay: "320ms" }}>
        <p className="label">{t("onboarding.branding.preview")}</p>
        <div className="overflow-hidden rounded-[var(--radius)] border bg-muted/40 p-3">
          <A4Preview d={doc} className="pointer-events-none select-none" />
        </div>
      </div>
    </div>
  );
}
