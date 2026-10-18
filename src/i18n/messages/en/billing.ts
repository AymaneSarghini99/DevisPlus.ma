import type { fr } from "../fr/index";
type M = typeof fr;

export const invoices: M["invoices"] = {
  title: "Invoices",
  emptyTitle: "No invoices",
  seeQuotes: "See my quotes",
  emptyText:
    "An invoice is created from an accepted quote: open the quote and choose “Convert to invoice”. The original quote stays unchanged.",
  kpiIssued: "Invoices issued (incl. VAT)",
  kpiReceived: "Payments received",
  kpiOutstanding: "Still to collect",
  draftsNotCounted: "Drafts are not counted.",
  searchLabel: "Search invoices",
  searchPlaceholder: "Number, quote or client…",
  colQuote: "Quote",
  colDue: "Due date",
  colOutstanding: "Balance due",
  late: "overdue",
};

export const invoice: M["invoice"] = {
  notFound: "Invoice not found",
  back: "Back to invoices",
  draftNotSaved: "Draft not saved",
  draftSaved: "Draft saved.",
  fixBeforeIssue: "Fix the draft before issuing it.",
  confirmIssue:
    "Issue the invoice? It will get a final number and can no longer be edited or deleted.",
  missingMentions: "Missing details:",
  mentions: {
    companyIce: "Your company's ICE",
    companyIf: "Tax ID (IF)",
    companyRc: "Trade register (RC)",
    companyTp: "Business tax (TP)",
    companyAddress: "Your company's address",
    clientIce: "Client's ICE (required if the client is a company)",
  },
  issued: "Invoice {{number}} issued.",
  confirmDeleteDraft: "Delete this draft invoice? The original quote is not changed.",
  issue: "Issue",
  label: "Invoice",
  fromQuote: "From quote",
  deleteDraft: "Delete the draft",
  draftNote:
    "Draft: it has no number and no accounting value. “Issue” assigns the final number and locks the invoice.",
  saveChangesFirst: "Save your changes first.",
  lockedNote:
    "Issued on {{date}}. An issued invoice can no longer be edited; corrections will go through a credit note.",
  sectionDates: "Dates",
  issueDate: "Invoice date",
  sectionTerms: "Discount, VAT and terms",
  sectionAmounts: "Amounts",
  received: "Received",
  paymentSaved: "Payment recorded.",
  confirmDeletePayment: "Delete this payment?",
  payments: "Payments received",
  deletePayment: "Delete this payment",
  noPayments: "No payments recorded.",
  amount: "Amount (MAD)",
  method: "Method",
  reference: "Reference (cheque no., transfer…)",
  savePayment: "Record the payment",
  fullyPaid: "Invoice fully paid.",
};
