import { DEFAULT_LOCALE, isLocale } from "./config";
import { tFor } from "./index";

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
  | "admin";

/** Translated <title> and description for a route's head(), using the language in the router context. */
export function pageMeta(match: { context?: unknown }, page: PageKey) {
  const l = (match.context as { locale?: unknown } | undefined)?.locale;
  const t = tFor(isLocale(l) ? l : DEFAULT_LOCALE);
  const title = t(`meta.${page}.title`);
  const description = t(`meta.${page}.description`);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  };
}
