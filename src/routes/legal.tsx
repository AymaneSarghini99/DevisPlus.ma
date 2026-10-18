import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalLink, LegalShell } from "@/components/LegalPage";
import { useLocale } from "@/i18n/LocaleProvider";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { tFor } from "@/i18n/index";
import { seoHead } from "@/lib/seo";
import { LEGAL_CONTENT } from "@/legal/content";
import { currentVersion, LEGAL_DOCS } from "@/legal/documents";

export const Route = createFileRoute("/legal")({
  head: ({ match }) => {
    const l = (match.context as { locale?: unknown }).locale;
    const locale = isLocale(l) ? l : DEFAULT_LOCALE;
    const t = tFor(locale);
    return seoHead({
      path: "/legal",
      title: `${t("legal.hubTitle")} — DevisPlus.ma`,
      description: t("legal.hubIntro"),
      locale,
      index: true,
    });
  },
  component: LegalHub,
});

function LegalHub() {
  const { t } = useTranslation();
  const { locale, fmt } = useLocale();
  return (
    <LegalShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("legal.hubTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("legal.hubIntro")}</p>
      <p className="mt-4 border border-dashed border-destructive bg-card p-4 text-sm">
        {t("legal.draftBanner")}
      </p>
      <ul className="mt-8 divide-y border bg-card">
        {LEGAL_DOCS.map((d) => {
          const v = currentVersion(d);
          return (
            <li key={d} className="px-5 py-4">
              <LegalLink id={d} className="font-semibold underline-offset-2 hover:underline" />
              <p className="mt-1 text-sm text-muted-foreground">
                {LEGAL_CONTENT[locale][d].summary}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("legal.version", { version: v.version })} ·{" "}
                {t("legal.updated", { date: fmt.date(v.updated) })}
              </p>
            </li>
          );
        })}
      </ul>
    </LegalShell>
  );
}
