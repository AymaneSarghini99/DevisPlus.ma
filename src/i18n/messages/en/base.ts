import type { fr } from "../fr/index";
type M = typeof fr;

export const common: M["common"] = {
  confirm: "Confirm",
  leave: "Leave without saving",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",
  duplicate: "Duplicate",
  search: "Search",
  loading: "Loading…",
  saved: "Saved",
  unsaved: "Unsaved",
  close: "Close",
  today: "Today",
  add: "Add",
  remove: "Remove",
  copy: "Copy",
  language: "Language",
  printPdf: "PDF / Print",
  downloadPdf: "Download PDF",
  pdfPreparing: "Preparing the PDF…",
  pdfFailed: "The PDF could not be created. Use “PDF / Print” instead.",
  printHint: "Choose “Save as PDF” to download the file",
  viewEdit: "Edit",
  viewPreview: "Preview",
  previewA4: "A4 preview — what will be printed or saved as PDF",
  previewA4Short: "A4 preview",
  noClient: "No client",
  pickDate: "Pick a date",
  required: "Required",
  example: "e.g. {{value}}",
  nothingToReport: "Nothing to report.",
  noMatch: "No results for “{{query}}”.",
  noMatchFilters: "Nothing matches these filters.",
  fixFields: "Fix the fields marked in red.",
  unsavedLeave: "You have unsaved changes. Leave anyway?",
  footer: "© 2026 DevisPlus.ma",
};

export const nav: M["nav"] = {
  home: "DevisPlus.ma — home",
  main: "Main navigation",
  dashboard: "Quotes",
  invoices: "Invoices",
  followups: "Follow-ups",
  clients: "Clients",
  catalogue: "Catalogue",
  reports: "Reports",
  templates: "Templates",
  settings: "Settings",
  myQuotes: "My quotes",
  chooseLanguage: "Choose the interface language",
};

export const meta: M["meta"] = {
  landing: {
    title: "Quote and invoice software for businesses in Morocco | DevisPlus.ma",
    description:
      "Create professional quotes and invoices in dirhams, with ICE, IF and VAT, and send them as PDFs or on WhatsApp. DevisPlus.ma, Casablanca.",
  },
  dashboard: {
    title: "My quotes — DevisPlus.ma",
    description: "Track your quotes, their amounts and their status.",
  },
  editor: {
    title: "Quote editor — DevisPlus.ma",
    description: "Enter the client, lines and terms; the A4 preview updates as you type.",
  },
  invoices: {
    title: "Invoices — DevisPlus.ma",
    description: "Invoices from your accepted quotes, payments received and amounts outstanding.",
  },
  invoice: {
    title: "Invoice — DevisPlus.ma",
    description: "Draft invoice, issuing and payment tracking.",
  },
  followups: {
    title: "Follow-ups — DevisPlus.ma",
    description: "Quotes awaiting a reply and quotes close to their expiry date.",
  },
  clients: {
    title: "Clients — DevisPlus.ma",
    description:
      "Client records with ICE, IF, RC, contact details, payment terms and quote history.",
  },
  catalogue: {
    title: "Catalogue — DevisPlus.ma",
    description: "Your frequent products and services, added to quotes in one click.",
  },
  reports: {
    title: "Reports — DevisPlus.ma",
    description: "Quotes per month, acceptance rate, invoices issued, payments and CSV exports.",
  },
  templates: {
    title: "Quote templates — DevisPlus.ma",
    description: "Choose or create the layout of your quotes.",
  },
  pricing: {
    title: "Pricing: custom quote software for 2,500 MAD | DevisPlus.ma",
    description:
      "Business offer: a quote workspace in your company colours, set up for you. 2,500 MAD one-time payment. Request your setup.",
  },
  guides: {
    title: "Quote and invoice guides for Morocco: mentions, VAT | DevisPlus.ma",
    description:
      "Practical guides for Moroccan businesses (in French): mandatory invoice mentions, 20% and 10% VAT in 2026, quotes versus invoices.",
  },
  group: {
    title: "NEXX Entreprise Group: one group, different ambitions | DevisPlus.ma",
    description:
      "DevisPlus.ma is part of NEXX Entreprise Group. Discover the group and its ambitions.",
  },
  signin: {
    title: "Sign in | DevisPlus.ma",
    description: "Access your DevisPlus workspace.",
  },
  signup: {
    title: "Create an account | DevisPlus.ma",
    description: "Create your DevisPlus account for free.",
  },
  share: {
    title: "Your quote | DevisPlus.ma",
    description: "Read the quote and accept it online.",
  },
  waiting: {
    title: "Account pending | DevisPlus.ma",
    description: "Your account is being reviewed by the DevisPlus team.",
  },
  password: {
    title: "Password | DevisPlus.ma",
    description: "Change or reset the password of your DevisPlus account.",
  },
  admin: {
    title: "Administration — DevisPlus.ma",
    description: "DevisPlus customer and payment register.",
  },
  onboarding: {
    title: "Set up your workspace — DevisPlus.ma",
    description: "Setup wizard for your workspace: profile, logo, branding, quotes and domain.",
  },
  settings: {
    title: "Settings — DevisPlus.ma",
    description: "Company profile, tax identifiers, bank details and document preferences.",
  },
};

export const status: M["status"] = {
  quote: { brouillon: "Draft", envoye: "Sent", accepte: "Accepted", refuse: "Declined" },
  invoice: {
    brouillon: "Draft",
    emise: "Issued",
    paid: "Paid",
    credited: "Cancelled (credit note)",
  },
  all: "All statuses",
};

export const units: M["units"] = {
  pièce: "piece",
  heure: "hour",
  jour: "day",
  "m²": "m²",
  "m³": "m³",
  ml: "lin. m",
  kg: "kg",
  forfait: "flat rate",
};

export const kinds: M["kinds"] = {
  materiel: "Materials",
  main_oeuvre: "Labour",
  service: "Services",
  other: "Other",
  unspecified: "Not specified",
};

export const methods: M["methods"] = {
  virement: "Bank transfer",
  cheque: "Cheque",
  especes: "Cash",
  carte: "Card",
  effet: "Bill of exchange",
  autre: "Other",
};

export const validation: M["validation"] = {
  required: "Required",
  ice: "The ICE has 15 digits",
  email: "Invalid email address",
  phone: "Phone number too short",
  rib: "A Moroccan RIB has 24 digits",
  companyName: "Enter your company's name",
  clientName: "Enter the client",
  lines: "Add at least one line with a description",
  date: "Date required",
  validUntil: "Must be after the quote date",
  dueDate: "Must be after the invoice date",
  exemption: "A line is at 0%: give the reason for the VAT exemption",
  rate: "Invalid rate (0 to 100).",
  vatList: "Keep at least one rate",
  vatDefault: "The default rate must be in the list",
  price: "Invalid price",
  url: "Invalid web address",
  passwordShort: "At least 8 characters",
  passwordMatch: "The passwords do not match",
  range: "Value out of range",
  subdomain: "3 to 40 characters: lowercase letters, digits and hyphens",
  reserved: "This address is reserved, choose another one",
  domain: "Invalid domain name (e.g. quotes.mycompany.com)",
  templateName: "Give your template a name",
};

export const errors: M["errors"] = {
  storage: "Could not save: the browser storage is full or blocked (logo too large?).",
  unexpected: "An unexpected error occurred.",
  quoteNotAccepted: "Only an accepted quote can be converted into an invoice.",
  creditNoteSource: "A credit note is created from an issued invoice.",
  creditNoteTooHigh: "The credit note exceeds what is left of the original invoice.",
  alreadyIssued: "This invoice has already been issued.",
  invoiceClient: "The client name is required.",
  invoiceLines: "The invoice has no lines.",
  trialLimit: "Your free trial is limited to 10 quotes.",
  issuedLocked: "An issued invoice cannot be deleted.",
  paymentDraft: "Payments are recorded on issued invoices.",
  paymentDate: "Enter the payment date.",
  paymentAmount: "The amount must be greater than zero.",
  paymentTooHigh: "The amount exceeds the balance due.",
  logoFormat: "Accepted formats: PNG, JPG, WebP or SVG.",
  logoSize: "Image too large (5 MB maximum).",
  logoRead: "The image could not be read.",
  onboardingIncomplete: "Some steps are not complete.",
  exportFailed: "Export is not available in this browser.",
  copyFailed: "Copying is not available in this browser.",
  notFoundTitle: "Page not found",
  notFoundText: "The page you are looking for doesn't exist or has been moved.",
  goHome: "Back to home",
  crashTitle: "This page didn't load",
  crashText: "Something went wrong. Try again or go back home.",
  retry: "Try again",
};
