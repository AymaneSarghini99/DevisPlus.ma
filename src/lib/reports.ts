import { INVOICE_STATUS_LABEL, invoiceTotals, METHOD_LABEL, type Invoice } from "./invoices";
import { quoteTotals, STATUS_LABEL, type Quote } from "./quotes";
import type { Client } from "./store";

// ---------- CSV (opens in Excel: ";" separator, decimal comma, UTF-8 BOM) ----------
type Cell = string | number;
const cell = (v: Cell) => {
  // Text starting with = + - @ would run as a formula in Excel: neutralise it.
  const s =
    typeof v === "number" ? v.toFixed(2).replace(".", ",") : /^[=+\-@\t]/.test(v) ? "'" + v : v;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(header: string[], rows: Cell[][]) {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

export const clientsCsv = (clients: Client[]) =>
  toCsv(
    [
      "Raison sociale",
      "ICE",
      "IF",
      "RC",
      "Adresse",
      "Ville",
      "Contact",
      "Téléphone",
      "E-mail",
      "Conditions de paiement",
    ],
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
  );

export const quotesCsv = (quotes: Quote[]) =>
  toCsv(
    [
      "N° devis",
      "Date",
      "Validité",
      "Statut",
      "Client",
      "ICE client",
      "Remise globale %",
      "Total HT",
      "TVA",
      "Total TTC",
      "Acompte %",
      "Acompte",
    ],
    quotes.map((q) => {
      const t = quoteTotals(q);
      return [
        q.number,
        q.issueDate,
        q.validUntil,
        STATUS_LABEL[q.status],
        q.client.name,
        q.client.ice,
        q.globalDiscount,
        t.ht,
        t.tva,
        t.ttc,
        q.deposit,
        t.deposit,
      ];
    }),
  );

export const invoicesCsv = (invoices: Invoice[]) =>
  toCsv(
    [
      "N° facture",
      "Statut",
      "Date",
      "Échéance",
      "Devis d'origine",
      "Client",
      "ICE client",
      "Total HT",
      "TVA",
      "Total TTC",
      "Encaissé",
      "Reste à payer",
    ],
    invoices.map((i) => {
      const t = invoiceTotals(i);
      return [
        i.number || "(brouillon)",
        INVOICE_STATUS_LABEL[i.status],
        i.issueDate,
        i.dueDate,
        i.quoteNumber,
        i.client.name,
        i.client.ice,
        t.ht,
        t.tva,
        t.ttc,
        t.paid,
        t.outstanding,
      ];
    }),
  );

export const paymentsCsv = (invoices: Invoice[]) =>
  toCsv(
    ["N° facture", "Client", "Date", "Montant", "Mode", "Référence", "Note"],
    invoices.flatMap((i) =>
      i.payments.map((p) => [
        i.number,
        i.client.name,
        p.date,
        p.amount,
        METHOD_LABEL[p.method],
        p.reference,
        p.note,
      ]),
    ),
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
