import {
  DEFAULT_TERMS,
  emptyCompany,
  emptyParty,
  uid,
  LEGACY_VAT_RATES,
  VAT_RATES,
  type Company,
  type Defaults,
  type LineKind,
  type Party,
  type TemplateId,
  type Unit,
} from "./quotes";
import {
  defaultStyle,
  defaultWatermark,
  designFrom,
  normalizeWatermark,
  type CustomTemplate,
  type Watermark,
} from "./design";
import { defaultNumbering, normalizeNumbering, type Numbering } from "./numbering";
import { read, write } from "./storage";
import type { Locale } from "@/i18n/config";
import { tFor } from "@/i18n/index";

export type Client = Party & { id: string; paymentTerms: string; createdAt: string };
export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  unit: Unit;
  unitPrice: number;
  vatRate: number;
  kind?: LineKind;
};
export type Settings = {
  company: Company;
  template: TemplateId;
  accent: string;
  logo: string; // data URL, resized on upload
  validityDays: number;
  terms: string;
  deposit: number;
  vatRates: number[]; // rates offered in the editor; saved lines keep their own rate
  defaultVat: number;
  watermark: Watermark; // default for new quotes
  customTemplates: CustomTemplate[];
  defaultCustom: string; // id of the custom template used for new quotes, "" for none
  /** Default language of generated documents — separate from the interface language. */
  docLang: Locale;
  /** Workspace look (app pages only): header logo (data URL, "" = DevisPlus), colours ("" = default). */
  appLogo: string;
  appButton: string;
  appLine: string;
  /** Number format of new quotes and invoices. */
  numbering: Numbering;
  /** Footer printed on new documents ("" = none); a custom template's own footer wins. */
  docFooter: string;
};

// ---------- clients ----------
export const newClient = (): Client => ({
  ...emptyParty(),
  id: uid(),
  paymentTerms: "",
  createdAt: new Date().toISOString(),
});
export const loadClients = () =>
  read<Client[]>("devisplus.clients", []).map((c) => ({ ...newClient(), ...c }));
export function saveClient(c: Client) {
  write("devisplus.clients", [c, ...loadClients().filter((x) => x.id !== c.id)]);
}
export function deleteClient(id: string) {
  write(
    "devisplus.clients",
    loadClients().filter((x) => x.id !== id),
  );
}
export const partyOf = ({ id: _i, paymentTerms: _p, createdAt: _c, ...p }: Client): Party => p;

/** Field errors for a party (client or company); empty object when valid. */
export type PartyErrorCode = "required" | "ice" | "email" | "phone";

/** Field errors as codes (translated under "validation"); empty object when valid. */
export function partyErrors(
  p: Party,
  requireName = true,
): Partial<Record<keyof Party, PartyErrorCode>> {
  const e: Partial<Record<keyof Party, PartyErrorCode>> = {};
  if (requireName && !p.name.trim()) e.name = "required";
  if (p.ice && !/^\d{15}$/.test(p.ice)) e.ice = "ice";
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = "email";
  if (p.phone && p.phone.replace(/\D/g, "").length < 9) e.phone = "phone";
  return e;
}

// ---------- catalogue ----------
export const newItem = (): CatalogItem => ({
  id: uid(),
  name: "",
  description: "",
  unit: "pièce",
  unitPrice: 0,
  vatRate: 20,
});
export const loadCatalog = () => read<CatalogItem[]>("devisplus.catalog", []);
export function saveItem(i: CatalogItem) {
  write("devisplus.catalog", [i, ...loadCatalog().filter((x) => x.id !== i.id)]);
}
/** Replaces the whole catalogue (used by the file import). */
export const saveCatalog = (items: CatalogItem[]) => write("devisplus.catalog", items);
export function deleteItem(id: string) {
  write(
    "devisplus.catalog",
    loadCatalog().filter((x) => x.id !== id),
  );
}

// ---------- settings ----------
/** Fictional Moroccan company used by "Remplir avec un exemple" on the settings page. */
export const EXAMPLE_COMPANY: Company = {
  name: "Atlas Rénovation SARL",
  ice: "002345678000091",
  if_: "45678912",
  rc: "512345 — Casablanca",
  tp: "34512678",
  address: "45, boulevard Zerktouni, 3ᵉ étage",
  city: "Casablanca",
  phone: "05 22 47 12 30",
  email: "contact@atlas-renovation.ma",
  contact: "Youssef El Amrani",
  bank: "Attijariwafa bank — agence Maârif",
  rib: "007 780 0001234567890123 45",
};

export const defaultSettings = (): Settings => ({
  company: emptyCompany(),
  template: "classic",
  accent: "#14213D",
  logo: "",
  validityDays: 30,
  terms: DEFAULT_TERMS,
  deposit: 30,
  vatRates: VAT_RATES,
  defaultVat: 20,
  watermark: defaultWatermark(),
  customTemplates: [],
  defaultCustom: "",
  docLang: "fr",
  appLogo: "",
  appButton: "",
  appLine: "",
  numbering: defaultNumbering(),
  docFooter: "",
});
export function loadSettings(): Settings {
  const s = { ...defaultSettings(), ...read<Partial<Settings>>("devisplus.settings", {}) };
  // Untouched pre-2026 default list (20/14/10/7/0): replace it with the current rates.
  if (JSON.stringify(s.vatRates) === JSON.stringify(LEGACY_VAT_RATES)) {
    s.vatRates = VAT_RATES;
    if (!VAT_RATES.includes(s.defaultVat)) s.defaultVat = 20;
  }
  return {
    ...s,
    company: { ...emptyCompany(), ...s.company },
    watermark: normalizeWatermark(s.watermark),
    numbering: normalizeNumbering(s.numbering),
  };
}
export const saveSettings = (s: Settings) => write("devisplus.settings", s);
/** True once the user has saved a business profile (so it should prefill new documents). */
export const hasProfile = (s: Settings) => !!s.company.name.trim();

/** Payment terms for a new document: the untouched built-in default is translated into the
 *  document language; terms the user wrote are kept exactly as written. */
export const docTerms = (s: Pick<Settings, "terms">, lang: Locale) =>
  s.terms === DEFAULT_TERMS ? tFor(lang)("defaults.terms") : s.terms;

export function quoteDefaults(s: Settings): Defaults {
  const custom = s.customTemplates.find((c) => c.id === s.defaultCustom);
  const footer = s.docFooter.trim();
  const design: Partial<Defaults> = custom
    ? designFrom(custom)
    : footer
      ? { style: { ...defaultStyle(), footerNote: footer } }
      : {};
  return {
    ...(hasProfile(s) ? { company: s.company } : {}),
    template: s.template,
    accent: s.accent,
    ...design,
    ...(s.watermark.enabled ? { watermark: s.watermark } : {}),
    validityDays: s.validityDays,
    terms: docTerms(s, s.docLang),
    lang: s.docLang,
    deposit: s.deposit,
    vatRate: s.defaultVat,
  };
}
