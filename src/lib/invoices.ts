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

export type Invoice = {
  id: string;
  /** "avoir" (credit note) is reserved for a later version; it will point at relatedInvoiceId. */
  kind: "facture" | "avoir";
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
export function invoiceTotals(inv: Pick<Invoice, "lines" | "globalDiscount" | "payments">) {
  const t = computeTotals(inv.lines, inv.globalDiscount, 0);
  const paid = inv.payments.reduce((s, p) => s + cents(p.amount), 0);
  return { ...t, paid: paid / 100, outstanding: (cents(t.ttc) - paid) / 100 };
}

/** Builds a draft invoice from an accepted quote. The quote itself is not modified. */
export function invoiceFromQuote(q: Quote): Invoice {
  if (q.status !== "accepte") throw new AppError("quoteNotAccepted");
  const issue = today();
  return {
    id: uid(),
    kind: "facture",
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

/** Issues a draft: assigns the next FA-year number among issued invoices and locks it. */
export function issueInvoice(inv: Invoice, all: Invoice[]): Invoice {
  if (inv.status !== "brouillon") throw new AppError("alreadyIssued");
  if (!inv.client.name.trim()) throw new AppError("invoiceClient");
  if (!inv.lines.length) throw new AppError("invoiceLines");
  const issued = all.filter((x) => x.status === "emise" && x.id !== inv.id);
  const year = Number(inv.issueDate.slice(0, 4)) || new Date().getFullYear();
  return {
    ...inv,
    status: "emise",
    number: nextNumber(issued, year, "FA"),
    issuedAt: new Date().toISOString(),
  };
}

/** Error code (translated under "errors") or null when the payment can be recorded. */
export function paymentError(inv: Invoice, p: Pick<Payment, "amount" | "date">): ErrorCode | null {
  if (inv.status !== "emise") return "paymentDraft";
  if (!p.date) return "paymentDate";
  if (!(p.amount > 0)) return "paymentAmount";
  if (cents(p.amount) > cents(invoiceTotals(inv).outstanding)) return "paymentTooHigh";
  return null;
}
