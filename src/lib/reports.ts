import type { TFunction } from "i18next";
import type { Locale } from "@/i18n/config";
import { accountingSign, dueOf, invoiceTotals, isAccounting, type Invoice } from "./invoices";
import { quoteTotals, type Quote } from "./quotes";
import type { Client } from "./store";

// ---------- CSV (UTF-8 with BOM so Excel reads accents and Arabic) ----------
// French and Arabic use ";" and a decimal comma (Excel with French regional settings);
// English uses "," and a decimal point.
type Cell = string | number;
const sep = (l: Locale) => (l === "en" ? "," : ";");
const cell = (v: Cell, l: Locale) => {
  // Text starting with = + - @ would run as a formula in Excel: neutralise it.
  const s =
    typeof v === "number"
      ? l === "en"
        ? v.toFixed(2)
        : v.toFixed(2).replace(".", ",")
      : /^[=+\-@\t]/.test(v)
        ? "'" + v
        : v;
  return new RegExp(`["${sep(l)}\\n\\r]`).test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(header: string[], rows: Cell[][], l: Locale = "fr") {
  return (
    "\uFEFF" + [header, ...rows].map((r) => r.map((c) => cell(c, l)).join(sep(l))).join("\r\n")
  );
}

/** Column headers and status labels follow the interface language; data stays as entered. */
export const clientsCsv = (clients: Client[], t: TFunction, l: Locale = "fr") =>
  toCsv(
    (
      ["name", "ice", "if", "rc", "address", "city", "contact", "phone", "email", "terms"] as const
    ).map((k) => t(`csv.client.${k}`)),
    clients.map((c) => [
      c.name,
      c.ice,
      c.if_,
      c.rc,
      c.address,
      c.city,
      c.contact,
      c.phone,
      c.email,
      c.paymentTerms,
    ]),
    l,
  );

export const quotesCsv = (quotes: Quote[], t: TFunction, l: Locale = "fr") =>
  toCsv(
    (
      [
        "number",
        "date",
        "validity",
        "status",
        "client",
        "clientIce",
        "globalDiscount",
        "ht",
        "tva",
        "ttc",
        "depositPct",
        "deposit",
      ] as const
    ).map((k) => t(`csv.quote.${k}`)),
    quotes.map((q) => {
      const tt = quoteTotals(q);
      return [
        q.number,
        q.issueDate,
        q.validUntil,
        t(`status.quote.${q.status}`),
        q.client.name,
        q.client.ice,
        q.globalDiscount,
        tt.ht,
        tt.tva,
        tt.ttc,
        q.deposit,
        tt.deposit,
      ];
    }),
    l,
  );

export const invoicesCsv = (invoices: Invoice[], t: TFunction, l: Locale = "fr") =>
  toCsv(
    (
      [
        "number",
        "type",
        "status",
        "date",
        "due",
        "quote",
        "client",
        "clientIce",
        "ht",
        "tva",
        "ttc",
        "paid",
        "outstanding",
      ] as const
    ).map((k) => t(`csv.invoice.${k}`)),
    invoices.map((i) => {
      const tt = invoiceTotals(i);
      return [
        i.number || t("csv.invoice.draftNumber"),
        t(`docs.kind.${i.depositPct ? "acompte" : i.kind}`),
        t(`status.invoice.${i.status}`),
        i.issueDate,
        i.dueDate,
        i.quoteNumber,
        i.client.name,
        i.client.ice,
        tt.ht,
        tt.tva,
        tt.ttc,
        tt.paid,
        tt.outstanding,
      ];
    }),
    l,
  );

export const paymentsCsv = (invoices: Invoice[], t: TFunction, l: Locale = "fr") =>
  toCsv(
    (["invoice", "client", "date", "amount", "method", "reference", "note"] as const).map((k) =>
      t(`csv.payment.${k}`),
    ),
    invoices.flatMap((i) =>
      i.payments.map((p) => [
        i.number,
        i.client.name,
        p.date,
        p.amount,
        t(`methods.${p.method}`),
        p.reference,
        p.note,
      ]),
    ),
    l,
  );

// ---------- figures, computed only from saved records ----------
const sum = (xs: number[]) => xs.reduce((s, x) => s + Math.round(x * 100), 0) / 100;

/** Last `n` months (yyyy-mm) ending with the month of `ref`, oldest first. */
export function lastMonths(ref: string, n = 12) {
  const [y, m] = ref.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export function report(quotes: Quote[], invoices: Invoice[], ref: string) {
  const months = lastMonths(ref).map((month) => {
    const qs = quotes.filter((q) => q.issueDate.startsWith(month));
    return { month, count: qs.length, ttc: sum(qs.map((q) => quoteTotals(q).ttc)) };
  });
  const by = (s: Quote["status"]) => quotes.filter((q) => q.status === s);
  const accepted = by("accepte"),
    refused = by("refuse");
  const decided = accepted.length + refused.length;
  // Invoices count, credit notes count negatively; pro formas and delivery notes do not count.
  const accounting = invoices.filter(isAccounting);
  const issued = accounting.filter((i) => i.status === "emise");
  return {
    months,
    quotes: {
      count: quotes.length,
      quotedTtc: sum(quotes.map((q) => quoteTotals(q).ttc)),
      accepted: { count: accepted.length, ttc: sum(accepted.map((q) => quoteTotals(q).ttc)) },
      refused: { count: refused.length, ttc: sum(refused.map((q) => quoteTotals(q).ttc)) },
      pending: by("envoye").length,
      drafts: by("brouillon").length,
      acceptanceRate: decided ? accepted.length / decided : null,
    },
    invoices: {
      issued: issued.filter((i) => i.kind === "facture").length,
      drafts: accounting.length - issued.length,
      issuedTtc: sum(issued.map((i) => accountingSign(i) * invoiceTotals(i).ttc)),
      received: sum(issued.map((i) => invoiceTotals(i).paid)),
      outstanding: sum(issued.map((i) => dueOf(i, invoices))),
    },
  };
}

// ---------- Sales journal for the accountant ----------
/** Issued invoices and credit notes dated from..to (yyyy-mm-dd, inclusive), oldest first. */
export const journalDocs = (invoices: Invoice[], from: string, to: string) =>
  invoices
    .filter((i) => isAccounting(i) && i.status === "emise")
    .filter((i) => i.issueDate >= from && i.issueDate <= to)
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.number.localeCompare(b.number));

/** VAT collected over the journal documents (credit notes deducted). */
export const journalVat = (docs: Invoice[]) =>
  sum(docs.map((i) => accountingSign(i) * invoiceTotals(i).tva));

/**
 * Sales journal (journal des ventes): one row per issued invoice or credit note, net and VAT
 * for each rate used in the period, totals. Credit notes are negative. What a Moroccan
 * accountant needs for the VAT return.
 */
export function salesJournalCsv(
  invoices: Invoice[],
  from: string,
  to: string,
  t: TFunction,
  l: Locale = "fr",
) {
  const docs = journalDocs(invoices, from, to);
  const rates = [...new Set(docs.flatMap((i) => invoiceTotals(i).byRate.map((r) => r.rate)))].sort(
    (a, b) => b - a,
  );
  const pctLabel = (r: number) => `${String(r).replace(".", l === "en" ? "." : ",")} %`;
  const header = [
    t("journal.col.date"),
    t("journal.col.number"),
    t("journal.col.type"),
    t("journal.col.client"),
    t("journal.col.ice"),
    ...rates.flatMap((r) => [
      t("journal.col.ht", { rate: pctLabel(r) }),
      t("journal.col.vat", { rate: pctLabel(r) }),
    ]),
    t("journal.col.totalHt"),
    t("journal.col.totalVat"),
    t("journal.col.ttc"),
    t("journal.col.origin"),
  ];
  const rows = docs.map((i) => {
    const tt = invoiceTotals(i);
    const s = accountingSign(i);
    const at = (r: number) => tt.byRate.find((x) => x.rate === r);
    return [
      i.issueDate,
      i.number,
      t(`docs.kind.${i.depositPct ? "acompte" : i.kind}`),
      i.client.name,
      i.client.ice,
      ...rates.flatMap((r) => [s * (at(r)?.base ?? 0), s * (at(r)?.tva ?? 0)]),
      s * tt.ht,
      s * tt.tva,
      s * tt.ttc,
      i.relatedNumber || i.quoteNumber,
    ];
  });
  return toCsv(header, rows, l);
}
