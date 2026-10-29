import type { fr } from "../fr/index";
type M = typeof fr;

export const docs: M["docs"] = {
  kind: {
    facture: "Invoice",
    acompte: "Down-payment invoice",
    avoir: "Credit note",
    proforma: "Pro forma invoice",
    livraison: "Delivery note",
  },
  filter: {
    all: "All documents",
    facture: "Invoices",
    avoir: "Credit notes",
    proforma: "Pro formas",
    livraison: "Delivery notes",
  },
  draftNote: "Draft: no number yet. “Issue” gives the final number and locks the document.",
  colType: "Type",
  issued: "{{number}} issued.",
  confirmIssue:
    "Issue this document? It will receive a final number and can no longer be changed or deleted.",
  creditOf: "Credit note on invoice",
  createCreditNote: "Create a credit note",
  createDeliveryNote: "Delivery note",
  creditNoteCreated: "Draft credit note created: reduce the lines for a partial credit.",
  deliveryNoteCreated: "Draft delivery note created.",
  creditNotes: "Credit notes",
  credited: "Already credited",
  fullyCredited: "Invoice fully cancelled by credit notes.",
  retention: "Retention guarantee (%)",
  retentionHint: "Construction: usually 7 to 10%, paid back at final acceptance.",
  creditNoteNote:
    "A credit note cancels all or part of an issued invoice, which stays unchanged. It counts negatively in your reports.",
  proformaNote:
    "A pro forma invoice is for the client's bank, a tender or an advance payment. It has no accounting value and is not counted in your reports.",
  deliveryNoteNote:
    "The delivery note lists the quantities delivered, without prices. Have the client sign it on delivery.",
  depositNote:
    "Down-payment invoice: it will be deducted from the quote's final invoice, VAT included.",
  depositLine: "Down payment {{pct}} on quote {{quote}} (VAT {{rate}})",
  deductionLine: "Down payment deducted, invoice {{invoice}} (VAT {{rate}})",
  create: "Create…",
  createFinal: "Final invoice",
  createDeposit: "Down-payment invoice",
  createProforma: "Pro forma invoice",
  depositCreated: "Draft down-payment invoice created.",
  proformaCreated: "Draft pro forma invoice created.",
  depositInvalid: "Enter a percentage between 1 and 99.",
  finalExists: "This quote's final invoice already exists.",
};

export const journal: M["journal"] = {
  title: "Export for your accountant",
  text: "Sales journal of the period: invoices and credit notes issued, net and VAT by rate, total. Open it in Excel or send it to your accountant.",
  period: "Period",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  download: "Download the journal (CSV)",
  empty: "No invoice or credit note issued in this period.",
  summary: "{{count}} document(s) · VAT collected {{vat}}",
  col: {
    date: "Date",
    number: "Document no.",
    type: "Type",
    client: "Client",
    ice: "Client ICE",
    ht: "Net {{rate}}",
    vat: "VAT {{rate}}",
    totalHt: "Total net",
    totalVat: "Total VAT",
    ttc: "Total",
    origin: "Original document",
  },
};

export const share: M["share"] = {
  loading: "Loading the quote…",
  notFound: "This quote link does not exist or is no longer active.",
  intro: "{{company}} sent you this quote. Read it, then accept it at the bottom of the page.",
  acceptTitle: "Accept the quote",
  acceptText:
    "By accepting, you agree to quote {{number}} for {{amount}} including VAT. {{company}} is notified.",
  name: "Your full name",
  accept: "I accept this quote",
  accepting: "Sending…",
  accepted: "Quote accepted on {{date}} by {{name}}. Thank you!",
  acceptedNow: "Thank you, your agreement has been recorded.",
  expired: "This quote expired on {{date}}. Contact {{company}} for an updated quote.",
  refused: "This quote is no longer available.",
  failed: "Sending failed. Try again in a moment.",
  nameInvalid: "Enter your name (at least 2 characters).",
  print: "Print or save as PDF",
  by: "Quote sent with DevisPlus.ma",
};
