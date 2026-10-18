import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";

export const Route = createFileRoute("/")({
  head: ({ match }) => pageMeta(match, "landing"),
  component: Landing,
});

const STEPS = ["s1", "s2", "s3"] as const;

function Landing() {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("landing.eyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-5 max-w-md text-muted-foreground">{t("landing.lead")}</p>
          <div className="mt-8 flex gap-3">
            <Link to="/devis/$id" params={{ id: "nouveau" }} search={{}} className="btn btn-accent">
              {t("landing.cta")} <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>

        <div
          className="border bg-paper p-6 text-sm shadow-[0_1px_0_var(--border),0_12px_32px_-16px_color-mix(in_oklab,var(--foreground)_30%,transparent)]"
          aria-hidden
        >
          <div className="flex justify-between border-b pb-4">
            <div>
              <div className="font-semibold">Atelier Bennani SARL</div>
              <div className="text-xs text-muted-foreground">{t("landing.sampleCity")}</div>
            </div>
            <div className="text-end">
              <div className="font-semibold uppercase">{t("doc.title.devis")}</div>
              <div className="num text-xs text-muted-foreground">DV-2026-014</div>
            </div>
          </div>
          {(
            [
              [t("landing.sampleLine1"), 1, 8400],
              [t("landing.sampleLine2"), 2, 1200],
            ] as const
          ).map(([d, q, p]) => (
            <div key={d} className="flex justify-between gap-4 border-b py-3">
              <span>{d}</span>
              <bdi className="num whitespace-nowrap">
                {q} × {fmt.money(p)}
              </bdi>
            </div>
          ))}
          <div className="mt-4 flex justify-between">
            <span className="text-muted-foreground">{t("doc.totalTtc")}</span>
            <bdi className="num text-lg font-semibold">{fmt.money(12960)}</bdi>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("landing.sampleNote")}</p>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-t bg-card">
        <div className="mx-auto max-w-6xl divide-y px-4">
          {STEPS.map((s, i) => (
            <div key={s} className="grid gap-2 py-8 md:grid-cols-[80px_1fr_1.4fr]">
              <span className="num text-sm text-muted-foreground">0{i + 1}</span>
              <h2 className="font-semibold">{t(`landing.steps.${s}.title`)}</h2>
              <p className="text-muted-foreground">{t(`landing.steps.${s}.text`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
