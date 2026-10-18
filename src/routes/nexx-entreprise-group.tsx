import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarketingHeader } from "@/components/MarketingHeader";
import { pageMeta } from "@/i18n/meta";
import { breadcrumbLd, jsonLd, SITE_URL } from "@/lib/seo";

/** The group behind DevisPlus. Only facts supplied by the owner: no invented ventures. */
const GROUP_URL = "https://nexx.ma";
/** Future ambitions are shown as open, unnamed slots. */
const NEXT = [2, 3];

export const Route = createFileRoute("/nexx-entreprise-group")({
  head: ({ match }) => ({
    ...pageMeta(match, "group"),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "NEXX Entreprise Group",
        url: GROUP_URL,
        subOrganization: { "@id": `${SITE_URL}/#organization` },
      }),
      jsonLd(
        breadcrumbLd([
          ["Accueil", "/"],
          ["NEXX Entreprise Group", "/nexx-entreprise-group"],
        ]),
      ),
    ],
  }),
  component: GroupPage,
});

function GroupPage() {
  const { t } = useTranslation();
  // The line grows once the page is shown (a CSS transition, see .group-line).
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="min-h-screen overflow-x-clip">
      <MarketingHeader />
      <main>
        {/* Statement */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:pb-24 md:pt-28">
          <p className="ob-enter num text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("group.eyebrow")}
          </p>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-8xl">
            <span className="ob-enter block" style={{ animationDelay: "80ms" }}>
              {t("group.line1")}
            </span>
            <span
              className="ob-enter block text-transparent [-webkit-text-stroke:1.5px_var(--foreground)]"
              style={{ animationDelay: "200ms" }}
            >
              {t("group.line2")}
            </span>
          </h1>
          <p
            className="ob-enter mt-10 max-w-xl text-lg text-muted-foreground"
            style={{ animationDelay: "320ms" }}
          >
            {t("group.intro")}
          </p>
        </section>

        {/* One line, several ambitions */}
        <section className="border-y bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <ol className="relative grid gap-14 ps-10 md:grid-cols-3 md:gap-10 md:ps-0 md:pt-10">
              {/* The group: one line that runs through every ambition. */}
              <span aria-hidden data-drawn={drawn} className="group-line" />
              <li className="ob-enter relative" style={{ animationDelay: "400ms" }}>
                <span
                  aria-hidden
                  className="absolute -start-10 top-0.5 z-[2] flex size-4 items-center justify-center md:start-0 md:-top-[43px]"
                >
                  <span className="group-pulse absolute inset-0 rounded-full bg-[#B7F34A]" />
                  <span className="relative size-4 rounded-full bg-[#B7F34A] ring-2 ring-foreground" />
                </span>
                <p className="num text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {t("group.first")}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                  {t("group.dpName")}
                </p>
                <p className="mt-3 max-w-xs text-muted-foreground">{t("group.dpText")}</p>
                <Link
                  to="/"
                  className="mt-5 inline-flex items-center gap-2 border-b-2 border-[#B7F34A] pb-0.5 font-medium"
                >
                  {t("group.dpLink")} <ArrowRight className="size-4 rtl:-scale-x-100" />
                </Link>
              </li>

              {NEXT.map((n, i) => (
                <li
                  key={n}
                  className="ob-enter relative"
                  style={{ animationDelay: `${520 + i * 120}ms` }}
                >
                  <span
                    aria-hidden
                    className="absolute -start-10 top-0.5 z-[2] size-4 rounded-full border-2 border-dashed border-foreground/40 bg-card md:start-0 md:-top-[43px]"
                  />
                  <p className="num text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                    {t("group.next", { n })}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--foreground)_35%,transparent)] md:text-4xl">
                    {t("group.nextText")}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {t("group.closing")}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={GROUP_URL}
              target="_blank"
              rel="noopener"
              className="btn btn-primary h-11 px-5"
            >
              {t("group.visit")} <ArrowUpRight className="size-4 rtl:-scale-x-100" />
            </a>
            <Link to="/" className="btn btn-ghost h-11 px-5">
              {t("group.dpLink")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
