import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, MapPin, Plus } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { GUIDES } from "@/guides/guides";
import { jsonLd, organizationLd, websiteLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: ({ match }) => {
    const h = pageMeta(match, "landing");
    const description = h.meta.find((m) => m["name"] === "description")?.["content"] ?? "";
    return { ...h, scripts: [jsonLd(organizationLd()), jsonLd(websiteLd(description))] };
  },
  component: Landing,
});

const STEPS = ["s1", "s2", "s3"] as const;
const AUDIENCES = ["a1", "a2", "a3", "a4"] as const;
const FEATURES = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"] as const;
const FAQ = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;

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
            <Link to="/tarifs" className="btn btn-ghost">
              {t("landing.ctaOffer")}
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

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
          {t("landing.audiences.title")}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <li key={a} className="rounded-[var(--radius)] border bg-card p-5">
              <h3 className="font-semibold">{t(`landing.audiences.${a}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`landing.audiences.${a}.text`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("landing.features.title")}
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li key={f}>
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {t(`landing.features.${f}.title`)}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(`landing.features.${f}.text`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 rounded-[var(--radius)] bg-[#14213D] p-8 text-white md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B7F34A]">
              {t("landing.offer.eyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              {t("landing.offer.title")}
            </h2>
            <p className="mt-4 max-w-xl text-white/75">{t("landing.offer.text")}</p>
          </div>
          <div className="flex flex-col justify-center gap-4 md:items-end md:text-end">
            <div>
              <p className="text-4xl font-semibold tracking-tight">
                <bdi>{t("landing.offer.price")}</bdi>
              </p>
              <p className="mt-1 text-sm text-white/70">{t("landing.offer.note")}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <a href="/tarifs#contact" className="btn btn-accent">
                {t("landing.offer.cta")}
              </a>
              <Link
                to="/tarifs"
                className="btn border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                {t("landing.offer.details")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("landing.faq.title")}
          </h2>
          <div className="mt-8 rounded-[var(--radius)] border bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="size-4" /> {t("landing.local.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.local.text")}</p>
          </div>
        </div>
        <div className="divide-y rounded-[var(--radius)] border bg-card">
          {FAQ.map((q) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                <h3>{t(`landing.faq.${q}.q`)}</h3>
                <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`landing.faq.${q}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t("landing.guides.title")}</h2>
              <p className="mt-2 text-muted-foreground">{t("landing.guides.intro")}</p>
            </div>
            <Link to="/guides" className="btn btn-ghost">
              {t("landing.guides.all")} <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  lang="fr"
                  className="group flex h-full flex-col rounded-[var(--radius)] border bg-background p-5 transition hover:border-foreground/40"
                >
                  <BookOpen className="size-5 text-muted-foreground" />
                  <span className="mt-3 font-semibold group-hover:underline">{g.h1}</span>
                  <span className="mt-2 text-sm text-muted-foreground">{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
