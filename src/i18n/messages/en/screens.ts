import type { fr } from "../fr/index";
type M = typeof fr;

export const landing: M["landing"] = {
  eyebrow: "Quotes · Dirham · VAT · ICE",
  headline: "The quote your client reads, understands and signs.",
  lead: "DevisPlus prepares quotes in dirhams, with ICE, IF and VAT, in minutes — no spreadsheet needed.",
  cta: "Create a quote",
  sampleCity: "Casablanca",
  sampleLine1: "Wood joinery — front door",
  sampleLine2: "Installation and finishing",
  sampleNote: "Sample preview",
  steps: {
    s1: {
      title: "Your company and your client",
      text: "Company name, ICE, address. Your details are reused automatically on the next quote.",
    },
    s2: {
      title: "The service lines",
      text: "Quantities, unit prices excl. VAT, VAT at 20%, 14%, 10% or 7%. Totals are calculated as you type.",
    },
    s3: {
      title: "An A4 PDF ready to send",
      text: "A clean layout, aligned amounts and payment terms at the foot of the document.",
    },
  },
};

export const dashboard: M["dashboard"] = {
  title: "My quotes",
  create: "Create a quote",
  kpiCount: "Quotes",
  kpiPending: "Awaiting a reply",
  kpiAccepted: "Accepted",
  emptyTitle: "No quotes yet",
  emptyText: "Create your first quote: your details will be remembered for the next ones.",
  searchLabel: "Search quotes",
  searchPlaceholder: "Number or client…",
  filterStatus: "Filter by status",
  colNumber: "No.",
  colClient: "Client",
  colDate: "Date",
  colValidity: "Valid until",
  colStatus: "Status",
  colTotal: "Total incl. VAT",
  duplicateOf: "Duplicate {{number}}",
  deleteOf: "Delete {{number}}",
  confirmDelete: "Delete quote {{number}}?",
  copied: "Copy created: {{number}}",
  noMatch: "No quotes match these filters.",
};

export const party: M["party"] = {
  name: "Company name *",
  ice: "ICE",
  contact: "Contact person",
  address: "Address",
  city: "City",
  phone: "Phone",
  email: "Email",
  if: "Tax ID (IF)",
  rc: "Trade register (RC)",
  tp: "Business tax (TP)",
};

export const design: M["design"] = {
  accent: "Accent colour",
  colourOf: "Colour {{value}}",
};
