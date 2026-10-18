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
      text: "Quantities, unit prices excl. VAT, VAT at 20% or 10% (the rates in force since 2026), or an exempt line. Totals are calculated as you type.",
    },
    s3: {
      title: "An A4 PDF ready to send",
      text: "A clean layout, aligned amounts and payment terms at the foot of the document.",
    },
  },
  ctaOffer: "See the offer",
  audiences: {
    title: "For businesses that send quotes every week",
    a1: {
      title: "Trades and construction",
      text: "Joinery, painting, building: materials and labour kept apart, quantities in m², linear metres or flat rate.",
    },
    a2: {
      title: "HVAC, plumbing, electrical",
      text: "Installation, maintenance and spare parts on one quote, with a deposit on order.",
    },
    a3: {
      title: "Agencies and service providers",
      text: "Day rates or fixed prices, clear payment terms, bilingual quotes.",
    },
    a4: {
      title: "Retail and distribution",
      text: "Reusable product catalogue, per-line discounts, total in words.",
    },
  },
  features: {
    illustration: "Illustration: hover over or tap a feature to see where it appears on the quote.",
    title: "Everything a Moroccan quote needs",
    f1: {
      title: "Quotes and invoices in dirhams",
      text: "Automatic numbering with no duplicates (DV-2026-001, FA-2026-001), and an accepted quote turns into an invoice.",
    },
    f2: {
      title: "Moroccan mentions",
      text: "Your company's ICE, IF, RC and TP, your client's ICE, and the amount in words.",
    },
    f3: {
      title: "VAT at 20% and 10%",
      text: "The two rates in force since 2026, exempt lines, VAT by rate and total incl. VAT calculated for you.",
    },
    f4: {
      title: "Moroccan templates",
      text: "Eight layouts, including construction, price schedule and bilingual, in your colours with your logo.",
    },
    f5: {
      title: "A4 PDF, print and WhatsApp",
      text: "Download the PDF, print it, or prepare the quote's WhatsApp message in one click.",
    },
    f6: {
      title: "Follow-ups",
      text: "Sent, accepted and declined statuses, and a list of quotes to follow up.",
    },
    f7: {
      title: "Copy in Google Drive",
      text: "Sent quotes and issued invoices are filed in your Drive, by month.",
    },
    f8: {
      title: "French, Arabic, English",
      text: "Interface and documents in all three languages, with right-to-left layout in Arabic.",
    },
  },
  offer: {
    eyebrow: "Business offer",
    title: "Your quote software, in your company's image",
    text: "We set DevisPlus up for you: name, logo, colours, legal details, numbering and a subdomain where technically possible. You receive a ready-to-use tool.",
    price: "2,500 MAD",
    note: "One-time payment · launch price",
    cta: "Request your setup",
    details: "See the offer in detail",
  },
  local: {
    title: "Based in Casablanca, serving all of Morocco",
    text: "DevisPlus.ma is located at 25 Avenue Hassan II, Casablanca. The tool works online: we support businesses in Casablanca and across Morocco by phone, email or WhatsApp.",
  },
  faq: {
    title: "Frequently asked questions",
    q1: {
      q: "What is DevisPlus?",
      a: "Online software to create quotes and invoices suited to Moroccan businesses: amounts in dirhams, ICE, IF, RC and TP, VAT by rate, the amount in words and A4 PDFs. It runs in the browser, on computers and phones.",
    },
    q2: {
      q: "How much does DevisPlus cost?",
      a: "The Business offer costs 2,500 MAD as a one-time payment (launch price). It includes your workspace with your name, logo and colours, the initial setup and onboarding support. Hosting, domain name and maintenance are specified in the offer.",
    },
    q3: {
      q: "Do my quotes include the mentions required in Morocco?",
      a: "DevisPlus provides fields for your company's ICE, IF, RC and TP, your client's ICE, continuous numbering, VAT by rate and the total incl. VAT. You remain responsible for what you enter: have your templates checked by your accountant.",
    },
    q4: {
      q: "Which VAT rates can I use?",
      a: "20% and 10%, the two rates in force since 1 January 2026, plus exempt lines. You can add another rate in Settings if your activity requires it.",
    },
    q5: {
      q: "Can I send a quote on WhatsApp?",
      a: "Yes. DevisPlus prepares the WhatsApp message with the quote summary, and you download the PDF in one click to attach it.",
    },
    q6: {
      q: "Can I write quotes in Arabic?",
      a: "Yes. Each quote can be written in French, Arabic or English, whatever the interface language. In Arabic, the document reads right to left.",
    },
    q7: {
      q: "Where is my data stored?",
      a: "In the current version, your quotes and invoices are saved in your browser. You can automatically save a PDF copy to your Google Drive and export your data as CSV from the Reports page.",
    },
  },
  guides: {
    title: "Practical guides (in French)",
    intro: "To prepare accurate quotes and invoices in Morocco.",
    all: "All guides",
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

export const guidesPage: M["guidesPage"] = {
  title: "Practical guides",
  intro:
    "Mentions, VAT, quotes and invoices: the essentials for invoicing correctly in Morocco. Guides are written in French.",
  updated: "Updated {{date}}",
  reading: "{{n}} min read",
  sources: "Sources",
  related: "Read next",
  cta: "Create a quote",
  ctaTitle: "Prepare a compliant quote in minutes",
  frenchOnly: "This guide is written in French.",
};
