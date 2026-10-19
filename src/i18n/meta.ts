import { DEFAULT_LOCALE, isLocale } from "./config";
import { tFor } from "./index";
import { seoHead } from "@/lib/seo";

type PageKey =
  | "landing"
  | "dashboard"
  | "editor"
  | "invoices"
  | "invoice"
  | "followups"
  | "clients"
  | "catalogue"
  | "reports"
  | "templates"
  | "settings"
  | "pricing"
  | "onboarding"
  | "admin"
  | "guides"
  | "group"
  | "signin"
  | "signup"
  | "waiting";

/** Pages search engines should index; every other app page is "noindex". */
const INDEXABLE: PageKey[] = ["landing", "pricing", "guides", "group"];

/** Translated title, description and SEO tags for a route's head(), using the router locale. */
export function pageMeta(match: { context?: unknown; pathname?: string }, page: PageKey) {
  const l = (match.context as { locale?: unknown } | undefined)?.locale;
  const locale = isLocale(l) ? l : DEFAULT_LOCALE;
  const t = tFor(locale);
  return seoHead({
    path: match.pathname ?? "/",
    title: t(`meta.${page}.title`),
    description: t(`meta.${page}.description`),
    locale,
    index: INDEXABLE.includes(page),
  });
}
