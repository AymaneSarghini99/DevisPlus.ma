import type { TFunction } from "i18next";
import type { Locale } from "@/i18n/config";
import { invoiceTotals, type Invoice } from "./invoices";
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
  const issued = invoices.filter((i) => i.status === "emise");
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
      issued: issued.length,
      drafts: invoices.length - issued.length,
      issuedTtc: sum(issued.map((i) => invoiceTotals(i).ttc)),
      received: sum(issued.map((i) => invoiceTotals(i).paid)),
      outstanding: sum(issued.map((i) => invoiceTotals(i).outstanding)),
    },
  };
}
