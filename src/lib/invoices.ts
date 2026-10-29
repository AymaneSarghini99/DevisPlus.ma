import {
  addDays,
  computeTotals,
  nextNumber,
  today,
  uid,
  type Company,
  type Line,
  type Party,
  type Quote,
  type TemplateId,
} from "./quotes";
import type { DocStyle, Watermark } from "./design";
import type { DocKind } from "./numbering";
import type { Locale } from "@/i18n/config";
import { AppError, read, write, type ErrorCode } from "./storage";

export type InvoiceStatus = "brouillon" | "emise";

export type PaymentMethod = "virement" | "cheque" | "especes" | "carte" | "effet" | "autre";
export const METHODS: PaymentMethod[] = [
  "virement",
  "cheque",
  "especes",
  "carte",
  "effet",
  "autre",
];
export type Payment = {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  note: string;
};

/**
 * Documents kept in the invoice list:
 * - "facture": an invoice (a down-payment invoice when depositPct is set), numbered FA;
 * - "avoir": a credit note cancelling all or part of an issued invoice (relatedInvoiceId), AV;
 * - "proforma": a pro forma invoice, with no accounting value, PF;
 * - "livraison": a delivery note (quantities, no prices), BL.
 * Only invoices and credit notes count in the accounts; a credit note counts negatively.
 */
export type InvoiceKind = "facture" | "avoir" | "proforma" | "livraison";
export const INVOICE_KINDS: InvoiceKind[] = ["facture", "avoir", "proforma", "livraison"];
const PREFIX: Record<InvoiceKind, DocKind> = {
  facture: "FA",
  avoir: "AV",
  proforma: "PF",
  livraison: "BL",
};
export const isAccounting = (i: Pick<Invoice, "kind">) =>
  i.kind === "facture" || i.kind === "avoir";
/** +1 for an invoice, −1 for a credit note, 0 for the documents that are not accounting. */
export const accountingSign = (i: Pick<Invoice, "kind">) =>
  i.kind === "facture" ? 1 : i.kind === "avoir" ? -1 : 0;
/** Only invoices receive payments (credit notes, pro formas and delivery notes do not). */
export const takesPayments = (i: Pick<Invoice, "kind">) => i.kind === "facture";

export type Invoice = {
  id: string;
  kind: InvoiceKind;
  /** Definitive number, given only when the invoice is issued ("" while it is a draft). */
  number: string;
  status: InvoiceStatus;
  createdAt: string;
  issueDate: string;
  dueDate: string;
  issuedAt: string;
  quoteId: string;
  quoteNumber: string;
  relatedInvoiceId: string;
  /** Number of the invoice a credit note cancels (printed on the credit note). */
  relatedNumber?: string;
  /** Down-payment invoice: share of the quote invoiced, in %. */
  depositPct?: number;
  /** Retention guarantee (retenue de garantie, BTP) withheld on the TTC, in %. */
  retention?: number;
  company: Company;
  clientId?: string;
  client: Party;
  lines: Line[];
  globalDiscount: number;
  terms: string;
  delivery: string;
  exemptionNote: string;
  template: TemplateId;
  accent: string;
  payments: Payment[];
  lang?: Locale;
  watermark?: Watermark;
  style?: DocStyle;
};

const KEY = "devisplus.invoices";
export const loadInvoices = () => read<Invoice[]>(KEY, []);
export function saveInvoice(inv: Invoice) {
  write(KEY, [inv, ...loadInvoices().filter((x) => x.id !== inv.id)]);
}
/** Only drafts can be deleted: an issued invoice is part of the accounting record. */
export function deleteDraftInvoice(id: string) {
  const all = loadInvoices();
  if (all.find((x) => x.id === id)?.status !== "brouillon") throw new AppError("issuedLocked");
  write(
    KEY,
    all.filter((x) => x.id !== id),
  );
}

const cents = (n: number) => Math.round((Number(n) || 0) * 100);
export function invoiceTotals(
  inv: Pick<Invoice, "lines" | "globalDiscount" | "payments"> & Partial<Pick<Invoice, "retention">>,
) {
  const t = computeTotals(inv.lines, inv.globalDiscount, 0);
  const paid = inv.payments.reduce((s, p) => s + cents(p.amount), 0);
  const pct = Math.min(Math.max(Number(inv.retention) || 0, 0), 100);
  const retention = Math.round((cents(t.ttc) * pct) / 100);
  return {
    ...t,
    paid: paid / 100,
    /** Retention guarantee withheld now, paid back at final acceptance of the works. */
    retention: retention / 100,
    /** TTC minus the retention guarantee: what the client pays now. */
    net: (cents(t.ttc) - retention) / 100,
    outstanding: (cents(t.ttc) - retention - paid) / 100,
  };
}

/** Line texts in the document language, given by the screen (this file has no translations). */
export type DocLabels = {
  /** Down-payment line, e.g. "Acompte 30 % sur devis DV-2026-001 (TVA 20 %)". */
  deposit: (pct: number, quote: string, rate: number) => string;
  /** Deduction of a down-payment invoice on the final invoice. */
  deduction: (invoice: string, rate: number) => string;
};

/** Issued down-payment invoices of a quote. */
export const depositInvoicesOf = (quoteId: string, all: Invoice[]) =>
  all.filter(
    (x) => x.kind === "facture" && x.depositPct && x.quoteId === quoteId && x.status === "emise",
  );
/** The final invoice of a quote (draft or issued), if any. */
export const finalInvoiceOf = (quoteId: string, all: Invoice[]) =>
  all.find((x) => x.kind === "facture" && !x.depositPct && x.quoteId === quoteId);

/** A draft of any kind built from a quote: same client, lines, layout. The quote is not modified. */
function draftFromQuote(q: Quote, kind: InvoiceKind): Invoice {
  const issue = today();
  return {
    id: uid(),
    kind,
    number: "",
    status: "brouillon",
    createdAt: new Date().toISOString(),
    issueDate: issue,
    dueDate: addDays(issue, 30),
    issuedAt: "",
    quoteId: q.id,
    quoteNumber: q.number,
    relatedInvoiceId: "",
    company: structuredClone(q.company),
    ...(q.clientId ? { clientId: q.clientId } : {}),
    client: structuredClone(q.client),
    lines: q.lines.map((l) => ({ ...l, id: uid() })),
    globalDiscount: q.globalDiscount,
    terms: q.terms,
    delivery: q.delivery,
    exemptionNote: q.exemptionNote,
    template: q.template,
    accent: q.accent,
    payments: [],
    ...(q.watermark ? { watermark: { ...q.watermark } } : {}),
    ...(q.lang ? { lang: q.lang } : {}),
    ...(q.style ? { style: { ...q.style } } : {}),
  };
}

/**
 * Builds the final draft invoice from an accepted quote. Down-payment invoices already issued
 * for the quote are deducted, one negative line per VAT rate, so the VAT is not counted twice.
 */
export function invoiceFromQuote(q: Quote, all: Invoice[] = [], labels?: DocLabels): Invoice {
  if (q.status !== "accepte") throw new AppError("quoteNotAccepted");
  const inv = draftFromQuote(q, "facture");
  const deductions = labels
    ? depositInvoicesOf(q.id, all).flatMap((d) =>
        computeTotals(d.lines, d.globalDiscount).byRate.map((r) => ({
          ...newDeductionLine(r.rate),
          description: labels.deduction(d.number, r.rate),
          unitPrice: -r.base,
        })),
      )
    : [];
  return { ...inv, lines: [...inv.lines, ...deductions] };
}

const newDeductionLine = (vatRate: number): Line => ({
  id: uid(),
  description: "",
  qty: 1,
  unit: "forfait",
  unitPrice: 0,
  discount: 0,
  vatRate,
});

/** A down-payment invoice for pct % of an accepted quote: one line per VAT rate of the quote. */
export function depositInvoiceFromQuote(q: Quote, pct: number, labels: DocLabels): Invoice {
  if (q.status !== "accepte") throw new AppError("quoteNotAccepted");
  const share = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const inv = draftFromQuote(q, "facture");
  const lines = computeTotals(q.lines, q.globalDiscount).byRate.map((r) => ({
    ...newDeductionLine(r.rate),
    description: labels.deposit(share, q.number, r.rate),
    unitPrice: Math.round(r.base * share) / 100,
  }));
  return { ...inv, depositPct: share, lines, globalDiscount: 0 };
}

/** A pro forma invoice or a delivery note from a quote, whatever its status. */
export const proformaFromQuote = (q: Quote) => draftFromQuote(q, "proforma");
export const deliveryNoteFromQuote = (q: Quote) => draftFromQuote(q, "livraison");

/** A draft copy of an issued document under another kind (credit note, delivery note). */
function draftFromInvoice(inv: Invoice, kind: InvoiceKind): Invoice {
  const issue = today();
  const { depositPct: _d, retention: _r, ...rest } = structuredClone(inv);
  return {
    ...rest,
    id: uid(),
    kind,
    number: "",
    status: "brouillon",
    createdAt: new Date().toISOString(),
    issueDate: issue,
    dueDate: issue,
    issuedAt: "",
    payments: [],
    lines: inv.lines.map((l) => ({ ...l, id: uid() })),
  };
}

/** A credit note cancelling an issued invoice; its lines can be reduced for a partial credit. */
export function creditNoteFromInvoice(inv: Invoice): Invoice {
  if (inv.kind !== "facture" || inv.status !== "emise") throw new AppError("creditNoteSource");
  return { ...draftFromInvoice(inv, "avoir"), relatedInvoiceId: inv.id, relatedNumber: inv.number };
}
export const deliveryNoteFromInvoice = (inv: Invoice) => ({
  ...draftFromInvoice(inv, "livraison"),
  relatedInvoiceId: inv.id,
  relatedNumber: inv.number,
});

/** Credit notes issued against an invoice, and what is left to credit. */
export function creditedOf(inv: Invoice, all: Invoice[]) {
  const notes = all.filter((x) => x.kind === "avoir" && x.relatedInvoiceId === inv.id);
  const credited = notes
    .filter((x) => x.status === "emise")
    .reduce((s, x) => s + cents(invoiceTotals(x).ttc), 0);
  return { notes, credited: credited / 100 };
}

/** What the client still owes on an issued invoice, after payments and credit notes. */
export function dueOf(inv: Invoice, all: Invoice[]) {
  if (inv.kind !== "facture" || inv.status !== "emise") return 0;
  const left = cents(invoiceTotals(inv).outstanding) - cents(creditedOf(inv, all).credited);
  return Math.max(0, left) / 100;
}

export type MentionCode =
  "companyIce" | "companyIf" | "companyRc" | "companyTp" | "companyAddress" | "clientIce";

/** Missing seller/buyer details that Moroccan invoices are expected to show. Advisory only. */
export function missingInvoiceMentions(inv: Pick<Invoice, "company" | "client">) {
  const m: MentionCode[] = [];
  const co = inv.company;
  if (!co.ice) m.push("companyIce");
  if (!co.if_) m.push("companyIf");
  if (!co.rc) m.push("companyRc");
  if (!co.tp) m.push("companyTp");
  if (!co.address) m.push("companyAddress");
  if (!inv.client.ice) m.push("clientIce");
  return m;
}

/**
 * Issues a draft: assigns the next number of its kind for the year (FA, AV, PF or BL) and locks
 * it. A credit note cannot credit more than what is left of its invoice.
 */
export function issueInvoice(inv: Invoice, all: Invoice[]): Invoice {
  if (inv.status !== "brouillon") throw new AppError("alreadyIssued");
  if (!inv.client.name.trim()) throw new AppError("invoiceClient");
  if (!inv.lines.length) throw new AppError("invoiceLines");
  if (inv.kind === "avoir") {
    const source = all.find((x) => x.id === inv.relatedInvoiceId);
    if (!source) throw new AppError("creditNoteSource");
    const left = cents(invoiceTotals(source).ttc) - cents(creditedOf(source, all).credited);
    if (cents(invoiceTotals(inv).ttc) > left) throw new AppError("creditNoteTooHigh");
  }
  const issued = all.filter((x) => x.status === "emise" && x.id !== inv.id);
  const year = Number(inv.issueDate.slice(0, 4)) || new Date().getFullYear();
  return {
    ...inv,
    status: "emise",
    number: nextNumber(issued, year, PREFIX[inv.kind]),
    issuedAt: new Date().toISOString(),
  };
}

/** Error code (translated under "errors") or null when the payment can be recorded. */
export function paymentError(inv: Invoice, p: Pick<Payment, "amount" | "date">): ErrorCode | null {
  if (inv.status !== "emise" || !takesPayments(inv)) return "paymentDraft";
  if (!p.date) return "paymentDate";
  if (!(p.amount > 0)) return "paymentAmount";
  if (cents(p.amount) > cents(invoiceTotals(inv).outstanding)) return "paymentTooHigh";
  return null;
}
