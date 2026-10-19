import type { DocStyle, Watermark } from "./design";
import type { TFunction } from "i18next";
import type { Locale } from "@/i18n/config";
import { makeFormat, type Format } from "@/i18n/format";
import { amountInWordsAr, amountInWordsEn } from "./amountWords";
import { nextInFormat, normalizeNumbering, type DocKind, type Numbering } from "./numbering";
import { AppError, read, write } from "./storage";
import { trialQuotesLeft } from "./trial";

export type Unit = "pièce" | "heure" | "jour" | "m²" | "m³" | "ml" | "kg" | "forfait";
export const UNITS: Unit[] = ["pièce", "heure", "jour", "m²", "m³", "ml", "kg", "forfait"];
/**
 * VAT rates offered by default. Since 1 January 2026 Morocco applies two rates, 20 % and 10 %
 * (reform of the 2024–2026 finance laws; DGI note circulaire n° 737), plus 0 % for exempt lines.
 * Users can still add another rate in Settings; saved lines always keep their own rate.
 */
export const VAT_RATES = [20, 10, 0];
/** The default list before the 2026 reform, replaced when a user never changed it. */
export const LEGACY_VAT_RATES = [20, 14, 10, 7, 0];

export type LineKind = "service" | "materiel" | "main_oeuvre";
export const KINDS: LineKind[] = ["materiel", "main_oeuvre", "service"];
export type Line = {
  id: string;
  description: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  discount: number; // % on this line
  vatRate: number; // % — stored per line, never recalculated from catalogue or settings
  kind?: LineKind;
};
export type Status = "brouillon" | "envoye" | "accepte" | "refuse";
export const STATUSES: Status[] = ["brouillon", "envoye", "accepte", "refuse"];
export type TemplateId =
  "classic" | "premium" | "btp" | "services" | "zellige" | "marche" | "bilingue" | "commercial";
/** Built-in layouts; their names and descriptions are translated under "templates.names". */
export const TEMPLATES: { id: TemplateId }[] = (
  ["classic", "premium", "btp", "services", "zellige", "marche", "bilingue", "commercial"] as const
).map((id) => ({ id }));
export type Party = {
  name: string;
  ice: string;
  if_: string;
  rc: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  contact: string;
};
/** Seller details printed on documents: a Party plus Moroccan identifiers and bank details. */
export type Company = Party & { tp: string; bank: string; rib: string };
export type Reminder = { date: string; channel: "whatsapp" | "autre" };

export type Quote = {
  id: string;
  number: string;
  status: Status;
  createdAt: string;
  issueDate: string; // yyyy-mm-dd
  validUntil: string;
  sentAt: string; // date the status first became "envoye", "" otherwise
  company: Company;
  clientId?: string;
  client: Party;
  lines: Line[];
  globalDiscount: number; // % on HT after line discounts
  deposit: number; // %
  terms: string;
  delivery: string;
  exemptionNote: string;
  template: TemplateId;
  accent: string;
  reminders: Reminder[]; // follow-ups the user prepared — never proof of delivery
  watermark?: Watermark;
  style?: DocStyle;
  customTemplateId?: string; // set when the design came from one of the user's templates
  /** Language of the printed document and WhatsApp messages; French when absent (older quotes). */
  lang?: Locale;
};

export const emptyParty = (): Party => ({
  name: "",
  ice: "",
  if_: "",
  rc: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  contact: "",
});
export const emptyCompany = (): Company => ({ ...emptyParty(), tp: "", bank: "", rib: "" });

// All money math is done in integer centimes to avoid floating-point drift.
const c = (n: number) => Math.round((Number(n) || 0) * 100);
const pct = (n: number) => Math.min(Math.max(Number(n) || 0, 0), 100);

export function lineHT(l: Pick<Line, "qty" | "unitPrice" | "discount">) {
  const gross = Math.round((Number(l.qty) || 0) * c(l.unitPrice));
  return Math.round(gross * (1 - pct(l.discount) / 100)) / 100;
}

export type Totals = {
  gross: number;
  discount: number;
  ht: number;
  tva: number;
  ttc: number;
  deposit: number;
  balance: number;
  byRate: { rate: number; base: number; tva: number }[];
};

export function computeTotals(lines: Line[], globalDiscount = 0, depositPct = 0): Totals {
  const groups = new Map<number, number>();
  for (const l of lines) groups.set(l.vatRate, (groups.get(l.vatRate) ?? 0) + c(lineHT(l)));
  const g = pct(globalDiscount) / 100;
  let gross = 0,
    ht = 0,
    tva = 0;
  const byRate: Totals["byRate"] = [];
  for (const [rate, base] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    const net = Math.round(base * (1 - g));
    const t = Math.round((net * rate) / 100);
    gross += base;
    ht += net;
    tva += t;
    byRate.push({ rate, base: net / 100, tva: t / 100 });
  }
  const ttc = ht + tva;
  const dep = Math.round((ttc * pct(depositPct)) / 100);
  return {
    gross: gross / 100,
    discount: (gross - ht) / 100,
    ht: ht / 100,
    tva: tva / 100,
    ttc: ttc / 100,
    deposit: dep / 100,
    balance: (ttc - dep) / 100,
    byRate,
  };
}

/** @deprecated kept for older callers: single-rate totals */
export function totals(
  lines: Pick<Line, "id" | "description" | "qty" | "unitPrice">[],
  vatRate: number,
) {
  const t = computeTotals(
    lines.map((l) => ({ ...l, unit: "pièce", discount: 0, vatRate })) as Line[],
  );
  return { ht: t.ht, tva: t.tva, ttc: t.ttc };
}

export const quoteTotals = (q: Pick<Quote, "lines" | "globalDiscount" | "deposit">) =>
  computeTotals(q.lines, q.globalDiscount, q.deposit);

/** True when some line is at 0 % VAT, so the document must state why (exemption mention). */
export const needsExemptionNote = (lines: Line[]) => lines.some((l) => Number(l.vatRate) === 0);

/** French display formatting, kept for exports and older callers; screens use useFormat(). */
export const mad = (n: number) => makeFormat("fr").money(n);
export const fmtDate = (iso: string) => makeFormat("fr").date(iso);

export const uid = () => Math.random().toString(36).slice(2, 10);
const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => localISO(new Date());
export const addDays = (d: string, n: number) =>
  localISO(new Date(new Date(d + "T12:00:00").getTime() + n * 864e5));
/** Whole days from a to b (yyyy-mm-dd or ISO). */
export const daysBetween = (a: string, b: string) =>
  Math.round(
    (new Date(b.slice(0, 10) + "T12:00:00").getTime() -
      new Date(a.slice(0, 10) + "T12:00:00").getTime()) /
      864e5,
  );

// ---------- French amount in words ----------
const U = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];
const T = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];
function below100(n: number): string {
  if (n <= 16) return U[n]!;
  if (n < 20) return "dix-" + U[n - 10]!;
  if (n < 70) {
    const t = Math.floor(n / 10),
      u = n % 10;
    return T[t]! + (u === 0 ? "" : u === 1 ? " et un" : "-" + U[u]!);
  }
  if (n < 80) return n === 71 ? "soixante et onze" : "soixante-" + below100(n - 60);
  if (n === 80) return "quatre-vingts";
  return "quatre-vingt-" + below100(n - 80);
}
function below1000(n: number): string {
  const h = Math.floor(n / 100),
    r = n % 100;
  let s = h === 0 ? "" : h === 1 ? "cent" : U[h]! + " cent" + (r === 0 ? "s" : "");
  if (r) s += (s ? " " : "") + below100(r);
  return s;
}
export function numberToFrench(n: number): string {
  n = Math.floor(n);
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const scales: [number, string, string][] = [
    [1e9, "milliard", "milliards"],
    [1e6, "million", "millions"],
  ];
  for (const [v, s, p] of scales) {
    const k = Math.floor(n / v);
    if (k) {
      parts.push(below1000(k) + " " + (k > 1 ? p : s));
      n %= v;
    }
  }
  const k = Math.floor(n / 1000);
  if (k) {
    // "mille" is invariable and makes a final "cents" / "vingts" lose its s.
    parts.push(k === 1 ? "mille" : below1000(k).replace(/(cent|vingt)s$/, "$1") + " mille");
    n %= 1000;
  }
  if (n) parts.push(below1000(n));
  return parts.join(" ");
}
/** Amount in words in the document language. */
export function amountInWords(amount: number, locale: Locale = "fr"): string {
  if (locale === "en") return amountInWordsEn(amount);
  if (locale === "ar") return amountInWordsAr(amount);
  return amountInWordsFr(amount);
}

function amountInWordsFr(amount: number): string {
  const cents = Math.round(amount * 100);
  const dh = Math.floor(cents / 100),
    ct = cents % 100;
  // "un million de dirhams", but "un million cent dirhams"
  const de = dh >= 1e6 && dh % 1e6 === 0 ? " de" : "";
  let s = numberToFrench(dh) + de + (dh > 1 ? " dirhams" : " dirham");
  if (ct) s += " et " + numberToFrench(ct) + (ct > 1 ? " centimes" : " centime");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- persistence (this browser, see storage.ts) ----------
const KEY = "devisplus.quotes";

/** Upgrades quotes saved by older versions without changing their tax treatment. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): Quote {
  const vat = typeof raw.vatRate === "number" ? raw.vatRate : 20;
  const { vatRate: _legacy, ...rest } = raw;
  return {
    issueDate: (raw.createdAt ?? new Date().toISOString()).slice(0, 10),
    globalDiscount: 0,
    deposit: 0,
    delivery: "",
    exemptionNote: "",
    template: "classic",
    accent: "#14213D",
    sentAt: "",
    reminders: [],
    ...rest,
    company: { ...emptyCompany(), ...raw.company },
    client: { ...emptyParty(), ...raw.client },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines: (raw.lines ?? []).map((l: any) => ({ unit: "pièce", discount: 0, vatRate: vat, ...l })),
  };
}

export function loadQuotes(): Quote[] {
  const raw = read<unknown>(KEY, []);
  return Array.isArray(raw) ? raw.map(migrate) : [];
}
/** Saves (insert or update). Gives the quote a fresh number if another quote already uses its number. */
export function saveQuote(q: Quote): Quote {
  const all = loadQuotes();
  const others = all.filter((x) => x.id !== q.id);
  // Free trial: a new quote beyond the limit is refused (the page shows the payment pop-up).
  if (others.length === all.length && trialQuotesLeft(all.length) === 0)
    throw new AppError("trialLimit");
  const saved = others.some((x) => x.number === q.number)
    ? { ...q, number: nextNumber(others) }
    : q;
  write(KEY, [saved, ...others]);
  return saved;
}
export function deleteQuote(id: string) {
  write(
    KEY,
    loadQuotes().filter((x) => x.id !== id),
  );
}

/** Number format saved in the settings (read here directly: store.ts depends on this file). */
const savedNumbering = () =>
  normalizeNumbering(read<{ numbering?: Partial<Numbering> }>("devisplus.settings", {}).numbering);

/**
 * Next number = highest existing counter of the same format for the year + 1 (never reuses a
 * number after deletions of older ones). Format: the settings' numbering (default DV-YYYY-NNN).
 */
export function nextNumber(
  existing: { number: string }[],
  year = new Date().getFullYear(),
  kind: DocKind = "DV",
  numbering: Numbering = savedNumbering(),
) {
  return nextInFormat(existing, numbering, kind, year);
}

export const newLine = (vatRate = 20): Line => ({
  id: uid(),
  description: "",
  qty: 1,
  unit: "pièce",
  unitPrice: 0,
  discount: 0,
  vatRate,
});

export type Defaults = {
  company?: Company;
  template?: TemplateId;
  accent?: string;
  validityDays?: number;
  terms?: string;
  deposit?: number;
  vatRate?: number;
  watermark?: Watermark;
  style?: DocStyle;
  customTemplateId?: string;
  lang?: Locale;
};

export const DEFAULT_TERMS =
  "Acompte à la commande, solde à la livraison. Paiement par virement bancaire.";

export function newQuote(existing: Quote[], d: Defaults = {}): Quote {
  const issue = today();
  return {
    id: uid(),
    number: nextNumber(existing),
    status: "brouillon",
    createdAt: new Date().toISOString(),
    issueDate: issue,
    validUntil: addDays(issue, d.validityDays ?? 30),
    sentAt: "",
    company: d.company ?? existing[0]?.company ?? emptyCompany(),
    client: emptyParty(),
    lines: [newLine(d.vatRate ?? 20)],
    globalDiscount: 0,
    deposit: d.deposit ?? 30,
    terms: d.terms ?? DEFAULT_TERMS,
    delivery: "",
    exemptionNote: "",
    template: d.template ?? "classic",
    accent: d.accent ?? "#14213D",
    reminders: [],
    ...(d.watermark ? { watermark: { ...d.watermark } } : {}),
    ...(d.style ? { style: { ...d.style } } : {}),
    ...(d.customTemplateId ? { customTemplateId: d.customTemplateId } : {}),
    ...(d.lang ? { lang: d.lang } : {}),
  };
}

/** A new draft with a new number and dates; tax rates, discounts and lines are copied as-is. */
export function duplicateQuote(q: Quote, existing: Quote[]): Quote {
  const issue = today();
  const span = Math.max(0, daysBetween(q.issueDate, q.validUntil)) || 30;
  return {
    ...structuredClone(q),
    id: uid(),
    number: nextNumber(existing),
    status: "brouillon",
    createdAt: new Date().toISOString(),
    issueDate: issue,
    validUntil: addDays(issue, span),
    sentAt: "",
    reminders: [],
    lines: q.lines.map((l) => ({ ...l, id: uid() })),
  };
}

/** Status change that records when the quote was first marked as sent. */
export function withStatus(q: Quote, status: Status): Quote {
  return { ...q, status, sentAt: status === "envoye" && !q.sentAt ? today() : q.sentAt };
}

// ---------- WhatsApp ----------
/** Moroccan numbers: 06…/07…/05… → 2126…; keeps +212, 00212 and other international numbers. */
export function waPhone(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "212" + d.slice(1);
  return d;
}
/** WhatsApp messages, written in the quote's document language (t and fmt of that language). */
export function whatsappText(q: Quote, t: TFunction, fmt: Format) {
  return t("whatsapp.send", {
    greeting: greeting(q, t),
    number: q.number,
    amount: fmt.money(quoteTotals(q).ttc),
    date: fmt.date(q.validUntil),
    company: q.company.name,
  });
}
export function reminderText(q: Quote, t: TFunction, fmt: Format) {
  return t(q.sentAt ? "whatsapp.reminderSent" : "whatsapp.reminder", {
    greeting: greeting(q, t),
    number: q.number,
    sent: q.sentAt ? fmt.date(q.sentAt) : "",
    amount: fmt.money(quoteTotals(q).ttc),
    date: fmt.date(q.validUntil),
    company: q.company.name,
  });
}
const greeting = (q: Quote, t: TFunction) => {
  const who = q.client.contact || q.client.name;
  return who ? t("whatsapp.helloName", { name: who }) : t("whatsapp.hello");
};
/** wa.me link; with no phone WhatsApp asks the user to pick the contact. */
export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${waPhone(phone)}?text=${encodeURIComponent(text)}`;
}
