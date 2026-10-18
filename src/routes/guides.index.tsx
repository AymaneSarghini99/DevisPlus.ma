import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarketingHeader } from "@/components/MarketingHeader";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { GUIDES } from "@/guides/guides";
import { breadcrumbLd, jsonLd } from "@/lib/seo";

export const Route = createFileRoute("/guides/")({
  head: ({ match }) => ({
    ...pageMeta({ ...match, pathname: "/guides" }, "guides"),
    scripts: [
      jsonLd(
        breadcrumbLd([
          ["Accueil", "/"],
          ["Guides", "/guides"],
        ]),
      ),
    ],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-12 md:pt-16">
        <h1 className="text-4xl font-semibold tracking-tight">{t("guidesPage.title")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("guidesPage.intro")}</p>
        <ul className="mt-10 grid gap-4">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                lang="fr"
                className="group block rounded-[var(--radius)] border bg-card p-6 transition hover:border-foreground/40"
              >
                <h2 className="text-lg font-semibold group-hover:underline">{g.h1}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {t("guidesPage.updated", { date: fmt.date(g.updated) })} ·{" "}
                  {t("guidesPage.reading", { n: g.readingMinutes })}
                  <ArrowRight className="ms-auto size-4 text-foreground rtl:-scale-x-100" />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
