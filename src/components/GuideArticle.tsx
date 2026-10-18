import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/i18n/LocaleProvider";
import { guideBySlug, type Block, type Guide } from "@/guides/guides";

/** French typography: a number stays on the same line as its "%" or "DH". */
const nb = (text: string) => text.replace(/(\d) (%|DH\b)/g, "$1\u00a0$2");

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "p":
      return <p>{nb(b.text)}</p>;
    case "ul":
      return (
        <ul className="list-disc space-y-1.5 ps-5">
          {b.items.map((x) => (
            <li key={x}>{nb(x)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1.5 ps-5">
          {b.items.map((x) => (
            <li key={x}>{nb(x)}</li>
          ))}
        </ol>
      );
    case "note":
      return (
        <p className="rounded-sm border-s-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {nb(b.text)}
        </p>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-sm border">
          <table className="w-full text-start text-sm">
            {b.caption && <caption className="sr-only">{b.caption}</caption>}
            <thead className="bg-muted/50">
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-2.5 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) =>
                    j === 0 ? (
                      <th
                        key={j}
                        scope="row"
                        className="px-4 py-2.5 text-start align-top font-medium"
                      >
                        {nb(c)}
                      </th>
                    ) : (
                      <td key={j} className="px-4 py-2.5 align-top text-muted-foreground">
                        {nb(c)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** A guide page: answer first, then sections, sources, related guides and a call to action.
 *  Guides are written in French, so the article is marked lang="fr" whatever the interface. */
export function GuideArticle({ guide }: { guide: Guide }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const related = guide.related.map(guideBySlug).filter((g): g is Guide => !!g);
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 md:pt-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-foreground hover:underline">
              DevisPlus.ma
            </Link>
          </li>
          <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
          <li>
            <Link to="/guides" className="hover:text-foreground hover:underline">
              {t("site.navGuides")}
            </Link>
          </li>
        </ol>
      </nav>

      <article lang="fr" dir="ltr" className="mt-6">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          {guide.h1}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          <time dateTime={guide.updated}>
            {t("guidesPage.updated", { date: fmt.date(guide.updated) })}
          </time>{" "}
          · {t("guidesPage.reading", { n: guide.readingMinutes })} · DevisPlus.ma
        </p>
        {/* The direct answer, first. */}
        <p className="mt-6 border-s-4 border-accent bg-card px-5 py-4 text-base leading-relaxed">
          {nb(guide.lead)}
        </p>

        <div className="mt-8 space-y-10 leading-relaxed">
          {guide.sections.map((s) => (
            <section key={s.h2} className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">{s.h2}</h2>
              {s.blocks.map((b, i) => (
                <BlockView key={i} b={b} />
              ))}
            </section>
          ))}
        </div>

        <section className="mt-10 border-t pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("guidesPage.sources")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {guide.sources.map((s) => (
              <li key={s.url + s.label}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 underline underline-offset-2 hover:text-foreground"
                >
                  {s.label}
                  <ExternalLink className="mt-1 size-3 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <aside className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border bg-card p-6">
        <p className="font-semibold">{t("guidesPage.ctaTitle")}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/tarifs" className="btn btn-ghost">
            {t("landing.ctaOffer")}
          </Link>
          <Link to="/devis/$id" params={{ id: "nouveau" }} search={{}} className="btn btn-accent">
            {t("guidesPage.cta")} <ArrowRight className="size-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </aside>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t("guidesPage.related")}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  lang="fr"
                  className="flex h-full items-start gap-3 rounded-[var(--radius)] border bg-card p-4 transition hover:border-foreground/40"
                >
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{g.h1}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
