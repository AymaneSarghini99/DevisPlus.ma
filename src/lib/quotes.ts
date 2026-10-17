export type Line = { id: string; description: string; qty: number; unitPrice: number };
export type Status = "brouillon" | "envoye" | "accepte" | "refuse";
export type Quote = {
  id: string;
  number: string;
  status: Status;
  createdAt: string;
  validUntil: string;
  company: { name: string; ice: string; address: string; phone: string };
  client: { name: string; ice: string; address: string; email: string };
  lines: Line[];
  vatRate: number;
  terms: string;
};

export const STATUS_LABEL: Record<Status, string> = {
  brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé",
};

const KEY = "devisplus.quotes";
const round = (n: number) => Math.round(n * 100) / 100;

export function totals(lines: Line[], vatRate: number) {
  const ht = round(lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0));
  const tva = round((ht * vatRate) / 100);
  return { ht, tva, ttc: round(ht + tva) };
}

export const mad = (n: number) =>
  new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " DH";

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export const uid = () => Math.random().toString(36).slice(2, 10);

export function loadQuotes(): Quote[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveQuote(q: Quote) {
  const all = loadQuotes().filter((x) => x.id !== q.id);
  localStorage.setItem(KEY, JSON.stringify([q, ...all]));
}
export function deleteQuote(id: string) {
  localStorage.setItem(KEY, JSON.stringify(loadQuotes().filter((x) => x.id !== id)));
}

export function newQuote(existing: Quote[]): Quote {
  const now = new Date();
  const valid = new Date(now.getTime() + 30 * 864e5);
  const last = existing[0]?.company;
  return {
    id: uid(),
    number: `DV-${now.getFullYear()}-${String(existing.length + 1).padStart(3, "0")}`,
    status: "brouillon",
    createdAt: now.toISOString(),
    validUntil: valid.toISOString().slice(0, 10),
    company: last ?? { name: "", ice: "", address: "", phone: "" },
    client: { name: "", ice: "", address: "", email: "" },
    lines: [{ id: uid(), description: "", qty: 1, unitPrice: 0 }],
    vatRate: 20,
    terms: "Acompte de 30 % à la commande, solde à la livraison. Paiement par virement bancaire.",
  };
}
