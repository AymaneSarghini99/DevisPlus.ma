import i18next, { type i18n as I18n, type TFunction } from "i18next";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { ar } from "./messages/ar/index";
import { en } from "./messages/en/index";
import { fr } from "./messages/fr/index";

export const RESOURCES = { fr, en, ar } as const;

const instances = new Map<Locale, I18n>();

/** One immutable instance per language, so concurrent server renders never share a language. */
export function getI18n(locale: Locale): I18n {
  let inst = instances.get(locale);
  if (inst) return inst;
  inst = i18next.createInstance();
  void inst.init({
    lng: locale,
    // In development a missing key shows the French text and logs a warning; the dictionary
    // tests and the TypeScript types make sure production dictionaries are complete.
    fallbackLng: DEFAULT_LOCALE,
    resources: { [locale]: { translation: RESOURCES[locale] }, fr: { translation: fr } },
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: import.meta.env?.DEV ?? false,
    missingKeyHandler: (lngs, _ns, key) =>
      console.warn(`[i18n] traduction manquante (${lngs.join(",")}) : ${key}`),
  });
  instances.set(locale, inst);
  return inst;
}

export const tFor = (locale: Locale): TFunction => getI18n(locale).t;

export type { TFunction };
