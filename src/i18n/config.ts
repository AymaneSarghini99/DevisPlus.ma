/** Supported interface and document languages. French stays the default for new visitors. */
export const LOCALES = ["fr", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "devisplus.lang";

export const NATIVE_NAME: Record<Locale, string> = { fr: "Français", en: "English", ar: "العربية" };

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);
export const dirOf = (l: Locale): "ltr" | "rtl" => (l === "ar" ? "rtl" : "ltr");

/** BCP 47 tags used for formatting. Arabic keeps Western digits (0–9), as on Moroccan business documents. */
export const INTL_TAG: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", ar: "ar-MA-u-nu-latn" };

/** Reads the language cookie from a Cookie header or document.cookie string. */
export function localeFromCookie(cookie: string | undefined | null): Locale {
  const m = /(?:^|;\s*)devisplus\.lang=([^;]+)/.exec(cookie ?? "");
  const v = m?.[1] ? decodeURIComponent(m[1]) : "";
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export const localeCookieValue = (l: Locale) =>
  `${LOCALE_COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
