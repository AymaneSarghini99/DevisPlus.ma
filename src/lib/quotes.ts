export type Unit = "pièce" | "heure" | "jour" | "m²" | "m³" | "ml" | "kg" | "forfait";
export const UNITS: Unit[] = ["pièce", "heure", "jour", "m²", "m³", "ml", "kg", "forfait"];
export const VAT_RATES = [20, 14, 10, 7, 0];

export type LineKind = "service" | "materiel" | "main_oeuvre";
export type Line = {
  id: string;
  description: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  discount: number; // % on this line
  vatRate: number; // % — stored per line, never recalculated from catalogue
  kind?: LineKind;
};
export type Status = "brouillon" | "envoye" | "accepte" | "refuse";
export type TemplateId = "classic" | "premium" | "btp" | "services";
export type Party = { name: string; ice: string; if_: string; rc: string; address: string; city: string; phone: string; email: string; contact: string };

export type Quote = {
  id: string;
  number: string;
  status: Status;
  createdAt: string;
  issueDate: string; // yyyy-mm-dd
  validUntil: string;
  company: Party;
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
};

export const STATUS_LABEL: Record<Status, string> = {
  brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé",
};

export const emptyParty = (): Party => ({ name: "", ice: "", if_: "", rc: "", address: "", city: "", phone: "", email: "", contact: "" });

// All money math is done in integer centimes to avoid floating-point drift.
const c = (n: number) => Math.round((Number(n) || 0) * 100);

export function lineHT(l: Pick<Line, "qty" | "unitPrice" | "discount">) {
  const gross = Math.round((Number(l.qty) || 0) * c(l.unitPrice));
  return Math.round(gross * (1 - (Number(l.discount) || 0) / 100)) / 100;
}

export type Totals = {
  gross: number; discount: number; ht: number; tva: number; ttc: number; deposit: number; balance: number;
  byRate: { rate: number; base: number; tva: number }[];
};

export function computeTotals(lines: Line[], globalDiscount = 0, depositPct = 0): Totals {
  const groups = new Map<number, number>();
  for (const l of lines) groups.set(l.vatRate, (groups.get(l.vatRate) ?? 0) + c(lineHT(l)));
  const g = Math.min(Math.max(Number(globalDiscount) || 0, 0), 100) / 100;
  let gross = 0, ht = 0, tva = 0;
  const byRate: Totals["byRate"] = [];
  for (const [rate, base] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    const net = Math.round(base * (1 - g));
    const t = Math.round((net * rate) / 100);
    gross += base; ht += net; tva += t;
    byRate.push({ rate, base: net / 100, tva: t / 100 });
  }
  const ttc = ht + tva;
  const dep = Math.round((ttc * Math.min(Math.max(Number(depositPct) || 0, 0), 100)) / 100);
  return { gross: gross / 100, discount: (gross - ht) / 100, ht: ht / 100, tva: tva / 100, ttc: ttc / 100, deposit: dep / 100, balance: (ttc - dep) / 100, byRate };
}

/** @deprecated kept for older callers: single-rate totals */
export function totals(lines: Pick<Line, "id" | "description" | "qty" | "unitPrice">[], vatRate: number) {
  const t = computeTotals(lines.map((l) => ({ ...l, unit: "pièce", discount: 0, vatRate })) as Line[]);
  return { ht: t.ht, tva: t.tva, ttc: t.ttc };
}

export const quoteTotals = (q: Quote) => computeTotals(q.lines, q.globalDiscount, q.deposit);

export const mad = (n: number) =>
  new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " DH";

export const fmtDate = (iso: string) => (iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("fr-FR") : "—");

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(new Date(d + "T12:00:00").getTime() + n * 864e5).toISOString().slice(0, 10);

// ---------- French amount in words ----------
const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const T = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];
function below100(n: number): string {
  if (n <= 16) return U[n];
  if (n < 20) return "dix-" + U[n - 10];
  if (n < 70) { const t = Math.floor(n / 10), u = n % 10; return T[t] + (u === 0 ? "" : u === 1 ? " et un" : "-" + U[u]); }
  if (n < 80) return n === 71 ? "soixante et onze" : "soixante-" + below100(n - 60);
  if (n === 80) return "quatre-vingts";
  return "quatre-vingt-" + below100(n - 80);
}
function below1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  let s = h === 0 ? "" : h === 1 ? "cent" : U[h] + " cent" + (r === 0 ? "s" : "");
  if (r) s += (s ? " " : "") + below100(r);
  return s;
}
export function numberToFrench(n: number): string {
  n = Math.floor(n);
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const scales: [number, string, string][] = [[1e9, "milliard", "milliards"], [1e6, "million", "millions"]];
  for (const [v, s, p] of scales) {
    const k = Math.floor(n / v);
    if (k) { parts.push(below1000(k) + " " + (k > 1 ? p : s)); n %= v; }
  }
  const k = Math.floor(n / 1000);
  if (k) { parts.push(k === 1 ? "mille" : below1000(k).replace(/cents$/, "cent") + " mille"); n %= 1000; }
  if (n) parts.push(below1000(n));
  return parts.join(" ");
}
export function amountInWords(amount: number): string {
  const cents = Math.round(amount * 100);
  const dh = Math.floor(cents / 100), ct = cents % 100;
  let s = numberToFrench(dh) + (dh > 1 ? " dirhams" : " dirham");
  if (ct) s += " et " + numberToFrench(ct) + (ct > 1 ? " centimes" : " centime");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- persistence (this browser) ----------
const KEY = "devisplus.quotes";

/** Upgrades quotes saved by the first version (single global vatRate) without changing their tax. */
export function migrate(raw: any): Quote {
  const vat = typeof raw.vatRate === "number" ? raw.vatRate : 20;
  return {
    issueDate: (raw.createdAt ?? new Date().toISOString()).slice(0, 10),
    globalDiscount: 0, deposit: 0, delivery: "", exemptionNote: "", template: "classic", accent: "#14213D",
    ...raw,
    company: { ...emptyParty(), ...raw.company },
    client: { ...emptyParty(), ...raw.client },
    lines: (raw.lines ?? []).map((l: any) => ({ unit: "pièce", discount: 0, vatRate: vat, ...l })),
  };
}

export function loadQuotes(): Quote[] {
  try { return (JSON.parse(localStorage.getItem(KEY) || "[]") as any[]).map(migrate); } catch { return []; }
}
export function saveQuote(q: Quote) {
  const all = loadQuotes().filter((x) => x.id !== q.id);
  localStorage.setItem(KEY, JSON.stringify([q, ...all]));
}
export function deleteQuote(id: string) {
  localStorage.setItem(KEY, JSON.stringify(loadQuotes().filter((x) => x.id !== id)));
}

/** Next number = highest existing sequence for the year + 1 (never reuses a number after deletions of older ones). */
export function nextNumber(existing: Pick<Quote, "number">[], year = new Date().getFullYear()) {
  const re = new RegExp(`^DV-${year}-(\\d+)$`);
  const max = existing.reduce((m, q) => { const x = re.exec(q.number); return x ? Math.max(m, +x[1]) : m; }, 0);
  return `DV-${year}-${String(max + 1).padStart(3, "0")}`;
}

export const newLine = (vatRate = 20): Line => ({ id: uid(), description: "", qty: 1, unit: "pièce", unitPrice: 0, discount: 0, vatRate });

export type Defaults = { company?: Party; template?: TemplateId; accent?: string };

export function newQuote(existing: Quote[], d: Defaults = {}): Quote {
  const issue = today();
  return {
    id: uid(),
    number: nextNumber(existing),
    status: "brouillon",
    createdAt: new Date().toISOString(),
    issueDate: issue,
    validUntil: addDays(issue, 30),
    company: d.company ?? existing[0]?.company ?? emptyParty(),
    client: emptyParty(),
    lines: [newLine()],
    globalDiscount: 0,
    deposit: 30,
    terms: "Acompte à la commande, solde à la livraison. Paiement par virement bancaire.",
    delivery: "",
    exemptionNote: "",
    template: d.template ?? "classic",
    accent: d.accent ?? "#14213D",
  };
}

export function duplicateQuote(q: Quote, existing: Quote[]): Quote {
  const issue = today();
  const span = Math.max(0, Math.round((new Date(q.validUntil).getTime() - new Date(q.issueDate).getTime()) / 864e5)) || 30;
  return {
    ...structuredClone(q),
    id: uid(), number: nextNumber(existing), status: "brouillon",
    createdAt: new Date().toISOString(), issueDate: issue, validUntil: addDays(issue, span),
    lines: q.lines.map((l) => ({ ...l, id: uid() })),
  };
}

export function whatsappText(q: Quote) {
  const t = quoteTotals(q);
  const hello = q.client.contact || q.client.name;
  return `Bonjour${hello ? " " + hello : ""},\n\nVeuillez trouver ci-joint notre devis n° ${q.number} d'un montant de ${mad(t.ttc)} TTC, valable jusqu'au ${fmtDate(q.validUntil)}.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n${q.company.name}`;
}
export function whatsappUrl(q: Quote) {
  const phone = q.client.phone.replace(/\D/g, "").replace(/^0/, "212");
  return `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText(q))}`;
}
