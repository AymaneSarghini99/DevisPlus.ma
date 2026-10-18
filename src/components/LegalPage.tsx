import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Scale } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { LEGAL_CONTENT } from "@/legal/content";
import type { Block } from "@/legal/content/types";
import { currentVersion, LEGAL_DOCS, type LegalDocId } from "@/legal/documents";
import { OPERATOR, type OperatorField } from "@/legal/operator";
import { LanguageSwitcher, Logo } from "./Brand";

/** Head tags for a legal route, in the interface language. */
export function legalMeta(match: { context?: unknown }, id: LegalDocId) {
  const l = (match.context as { locale?: unknown } | undefined)?.locale;
  const locale = isLocale(l) ? l : DEFAULT_LOCALE;
  const doc = LEGAL_CONTENT[locale][id];
  return {
    meta: [{ title: `${doc.title} — DevisPlus.ma` }, { name: "description", content: doc.summary }],
  };
}

/** Replaces {{field}} tokens with verified operator details, or a visible "to complete" marker. */
function useFill() {
  const { t } = useTranslation();
  return (text: string): ReactNode[] =>
    text.split(/(\{\{\w+\}\})/g).map((part, i) => {
      const m = /^\{\{(\w+)\}\}$/.exec(part);
      if (!m) return <Fragment key={i}>{part}</Fragment>;
      const field = m[1] as OperatorField;
      const value = OPERATOR[field];
      // Operator details keep the lime highlight; email and phone are clickable.
      return value ? (
        <mark key={i} className="rounded-sm bg-accent/50 px-1 text-foreground">
          {field === "email" ? (
            <a href={`mailto:${value}`} className="underline-offset-2 hover:underline">
              {value}
            </a>
          ) : field === "phone" ? (
            <a
              href={`tel:${value.replace(/\s/g, "")}`}
              dir="ltr"
              className="underline-offset-2 hover:underline"
            >
              {value}
            </a>
          ) : (
            <bdi>{value}</bdi>
          )}
        </mark>
      ) : (
        <mark key={i} className="rounded-sm bg-accent/50 px-1 text-foreground">
          {t("legal.missing", { field: t(`legal.fields.${field}`) })}
        </mark>
      );
    });
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const fill = useFill();
  return (
    <>
      {blocks.map((b, i) =>
        typeof b === "string" ? (
          <p key={i}>{fill(b)}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 ps-6 marker:text-muted-foreground">
            {b.list.map((item, j) => (
              <li key={j}>{fill(item)}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

export function LegalShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/dashboard" className="btn btn-ghost hidden sm:inline-flex">
              <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t("legal.backToApp")}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

export function LegalPage({ id }: { id: LegalDocId }) {
  const { t } = useTranslation();
  const { locale, fmt } = useLocale();
  const doc = LEGAL_CONTENT[locale][id];
  const v = currentVersion(id);

  return (
    <LegalShell>
      <article className="text-[15px] leading-7">
        {v.status === "draft" && (
          <div
            role="note"
            className="mb-6 flex gap-3 border border-dashed border-destructive bg-card p-4 text-sm"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p>{t("legal.draftBanner")}</p>
              {locale !== "fr" && (
                <p className="mt-1 text-muted-foreground">{t("legal.referenceNote")}</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("legal.hubTitle")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-muted-foreground">{doc.summary}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("legal.version", { version: v.version })} ·{" "}
          {t("legal.updated", { date: fmt.date(v.updated) })} ·{" "}
          {v.effective
            ? t("legal.inForce", { date: fmt.date(v.effective) })
            : t("legal.notInForce")}
        </p>

        <nav aria-labelledby="toc" className="mt-8 border bg-card p-5">
          <h2 id="toc" className="text-sm font-semibold">
            {t("legal.toc")}
          </h2>
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {doc.sections.map((s, i) => (
              <li key={s.id} className="flex gap-2">
                <span className="num text-muted-foreground">{i + 1}.</span>
                <a href={`#${s.id}`} className="underline-offset-2 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6">
              <h2
                id={`${s.id}-h`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-semibold"
              >
                <span>
                  <span className="num text-muted-foreground">{i + 1}.</span> {s.title}
                </span>
                {s.review && (
                  <span
                    title={s.review}
                    className="inline-flex items-center gap-1 rounded-sm border border-destructive/40 px-2 py-0.5 text-xs font-medium text-destructive"
                  >
                    <Scale className="size-3.5" /> {t("legal.review")}
                  </span>
                )}
              </h2>
              <div className="mt-3 space-y-3">
                <Blocks blocks={s.body} />
              </div>
              {s.review && <p className="mt-3 text-xs text-muted-foreground">⚖ {s.review}</p>}
            </section>
          ))}
        </div>

        <nav aria-label={t("legal.otherDocs")} className="mt-14 border-t pt-6">
          <h2 className="text-sm font-semibold">{t("legal.otherDocs")}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {LEGAL_DOCS.filter((d) => d !== id).map((d) => (
              <li key={d}>
                <LegalLink id={d} />
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </LegalShell>
  );
}

const ROUTE: Record<LegalDocId, string> = {
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  refunds: "/refunds",
  "acceptable-use": "/acceptable-use",
  "data-processing": "/data-processing",
};

export function LegalLink({
  id,
  className = "underline-offset-2 hover:underline",
}: {
  id: LegalDocId;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <a href={ROUTE[id]} className={className}>
      {t(`legal.names.${id}`)}
    </a>
  );
}
