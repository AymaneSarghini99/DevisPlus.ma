import type { Locale } from "@/i18n/config";
import {
  CURRENCIES,
  ONBOARDING_STEPS,
  type Currency,
  type OnboardingStep,
  type Sector,
} from "@/onboarding/config";
import { TEMPLATES, VAT_RATES, type TemplateId } from "./quotes";
import { AppError, read, write } from "./storage";
import { loadSettings, saveSettings, type Settings } from "./store";

/**
 * A tenant = one business using its own branded DevisPlus workspace.
 *
 * Storage note: like the rest of the app, the tenant is saved in this browser only. Real
 * isolation between businesses (accounts, server-side data per tenant, custom domains)
 * requires a backend; this model is shaped so it can move to one without changing the UI.
 */
export type BusinessProfile = {
  companyName: string;
  legalName: string; // optional, if different from the company name
  sector: Sector | "";
  ice: string; // optional
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string; // optional
  currency: Currency;
  language: Locale;
};

/** Step 2–3: visual identity used on every new document. */
export type Branding = { logo: string; accent: string; template: TemplateId };

/** Step 4: defaults applied to new quotes. */
export type QuoteSettings = {
  validityDays: number;
  deposit: number;
  defaultVat: number;
  docLang: Locale;
  terms: string;
};

/**
 * Step 5: the address the business wants for its workspace. Nothing is activated from the
 * browser: a DevisPlus subdomain or a custom domain is set up by the DevisPlus team (DNS and
 * SSL), so the status stays "not active yet" here. `requestedAt` only records that the
 * activation request was prepared (email / WhatsApp opened), not that it was received.
 */
export type DomainSettings = {
  mode: "subdomain" | "custom";
  subdomain: string;
  customDomain: string;
  requestedAt: string | null;
};

/**
 * The account that owns this browser's workspace. Accounts live on the server (Better Auth):
 * `userId` links this local workspace to it. `passwordHash`, `salt` and `googleSub` only exist
 * on workspaces created before server accounts (browser-only lock); they are cleared on linking.
 */
export type AdminAccount = {
  email: string;
  passwordHash: string;
  salt: string;
  /** Google account id ("sub") of an older browser-only Google lock. */
  googleSub: string;
  /** Server account id (Better Auth user). */
  userId: string;
};

/** True once this workspace belongs to an account (server account, or an older browser lock). */
export const hasAccount = (a: AdminAccount) => !!(a.userId || a.passwordHash || a.googleSub);

export type Tenant = {
  id: string;
  /** URL-friendly name, used later for the DevisPlus subdomain (e.g. climatizone). */
  slug: string;
  profile: BusinessProfile;
  branding: Branding;
  quotes: QuoteSettings;
  domain: DomainSettings;
  admin: AdminAccount;
  onboarding: {
    current: OnboardingStep;
    completed: OnboardingStep[];
    startedAt: string;
    updatedAt: string;
    finishedAt: string | null;
    /** Guided tours of the app (onboarding/tours.ts) the user finished or skipped. */
    toursDone: string[];
  };
};

const KEY = "devisplus.tenant";

export const emptyProfile = (language: Locale = "fr"): BusinessProfile => ({
  companyName: "",
  legalName: "",
  sector: "",
  ice: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  website: "",
  currency: "MAD",
  language,
});

/** "Climatizone SARL" → "climatizone-sarl"; accents removed, Arabic-only names give "". */
export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const brandingFrom = (s: Settings): Branding => ({
  logo: s.logo,
  accent: s.accent,
  template: s.template,
});
const quotesFrom = (s: Settings): QuoteSettings => ({
  validityDays: s.validityDays,
  deposit: s.deposit,
  defaultVat: s.defaultVat,
  docLang: s.docLang,
  terms: s.terms,
});
const emptyDomain = (): DomainSettings => ({
  mode: "subdomain",
  subdomain: "",
  customDomain: "",
  requestedAt: null,
});

/** A new tenant; branding and quote defaults start from the current app settings. */
export function newTenant(language: Locale = "fr", s: Settings = loadSettings()): Tenant {
  const now = new Date().toISOString();
  return {
    id: Math.random().toString(36).slice(2, 10),
    slug: "",
    profile: emptyProfile(language),
    branding: brandingFrom(s),
    quotes: { ...quotesFrom(s), docLang: language },
    domain: emptyDomain(),
    admin: { email: "", passwordHash: "", salt: "", googleSub: "", userId: "" },
    onboarding: {
      current: "profile",
      completed: [],
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      toursDone: [],
    },
  };
}

/** The saved draft, completed with defaults for fields added since it was saved. */
export function loadTenant(): Tenant | null {
  const t = read<Partial<Tenant> | null>(KEY, null);
  if (!t || typeof t !== "object" || !t.profile) return null;
  const base = newTenant(t.profile.language ?? "fr");
  return {
    ...base,
    ...t,
    profile: { ...base.profile, ...t.profile },
    branding: { ...base.branding, ...t.branding },
    quotes: { ...base.quotes, ...t.quotes },
    domain: { ...base.domain, ...t.domain },
    admin: { ...base.admin, ...t.admin },
    onboarding: { ...base.onboarding, ...t.onboarding },
  };
}

/** Saves the draft (save-and-resume). Throws StorageError if the browser refuses. */
export function saveTenant(t: Tenant) {
  write(KEY, { ...t, onboarding: { ...t.onboarding, updatedAt: new Date().toISOString() } });
}

export type ProfileErrorCode = "required" | "ice" | "email" | "phone" | "url";
export type ProfileErrors = Partial<Record<keyof BusinessProfile, ProfileErrorCode>>;

/** Required: company name, sector, address, city, phone, email. Legal info stays optional. */
export function profileErrors(p: BusinessProfile): ProfileErrors {
  const e: ProfileErrors = {};
  for (const k of ["companyName", "sector", "address", "city", "phone", "email"] as const)
    if (!String(p[k]).trim()) e[k] = "required";
  if (p.ice && !/^\d{15}$/.test(p.ice)) e.ice = "ice";
  if (p.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) e.email = "email";
  if (p.phone.trim() && p.phone.replace(/\D/g, "").length < 9) e.phone = "phone";
  if (
    p.website.trim() &&
    !/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(p.website.trim())
  )
    e.website = "url";
  if (!CURRENCIES.includes(p.currency)) e.currency = "required";
  return e;
}

/** Normalises a website to https://… (empty stays empty). */
export const normalizeWebsite = (w: string) => {
  const v = w.trim();
  return !v ? "" : /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

// ---------- steps 2–6 ----------

export type StepErrorCode =
  | ProfileErrorCode
  | "range"
  | "subdomain"
  | "reserved"
  | "domain"
  | "passwordShort"
  | "passwordMatch";
export type StepField =
  | keyof BusinessProfile
  | "accent"
  | "template"
  | "validityDays"
  | "deposit"
  | "defaultVat"
  | "subdomain"
  | "customDomain"
  | "adminEmail"
  | "password"
  | "confirm";
export type StepErrors = Partial<Record<StepField, StepErrorCode>>;

/** Addresses kept for the platform itself. */
export const RESERVED_SUBDOMAINS = [
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "smtp",
  "ftp",
  "static",
  "cdn",
  "support",
  "help",
  "blog",
  "status",
  "devisplus",
];
export const PLATFORM_DOMAIN = "devisplus.ma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

/**
 * Errors of the password being typed (never stored). When a password is already set, leaving
 * both fields empty keeps it.
 */
export function passwordErrors(admin: AdminAccount, password: string, confirm: string): StepErrors {
  if (!password && !confirm) return hasAccount(admin) ? {} : { password: "required" };
  const e: StepErrors = {};
  if (password.length < MIN_PASSWORD) e.password = "passwordShort";
  if (confirm !== password) e.confirm = "passwordMatch";
  return e;
}

export function domainErrors(d: DomainSettings): StepErrors {
  const e: StepErrors = {};
  const sub = d.subdomain.trim();
  if (!sub) e.subdomain = "required";
  else if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(sub) || sub.includes("--"))
    e.subdomain = "subdomain";
  else if (RESERVED_SUBDOMAINS.includes(sub)) e.subdomain = "reserved";
  if (d.mode === "custom") {
    const dom = d.customDomain.trim().toLowerCase();
    if (!dom) e.customDomain = "required";
    else if (
      !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(dom) ||
      dom === PLATFORM_DOMAIN ||
      dom.endsWith(`.${PLATFORM_DOMAIN}`)
    )
      e.customDomain = "domain";
  }
  return e;
}

/** Second-level suffixes where the registrable domain has three labels (atlas.co.ma). */
const SECOND_LEVEL = [
  "co.ma",
  "net.ma",
  "org.ma",
  "ac.ma",
  "gov.ma",
  "press.ma",
  "co.uk",
  "com.fr",
];

/**
 * Splits a custom domain into the DNS host to create and the domain it belongs to:
 * "devis.atlas.ma" → { host: "devis", zone: "atlas.ma", apex: false }; "atlas.ma" → apex.
 */
export function dnsHost(domain: string) {
  const labels = domain.trim().toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  const zoneSize = SECOND_LEVEL.includes(labels.slice(-2).join(".")) ? 3 : 2;
  const zone = labels.slice(-zoneSize).join(".");
  const host = labels.slice(0, -zoneSize).join(".");
  return { host: host || "@", zone, apex: !host };
}

/** Field errors of one step; the review step reports every unfinished earlier step. */
export function stepErrors(t: Tenant, step: OnboardingStep): StepErrors {
  switch (step) {
    case "profile": {
      const e: StepErrors = { ...profileErrors(t.profile) };
      const email = t.admin.email.trim();
      if (!email) e.adminEmail = "required";
      else if (!EMAIL_RE.test(email)) e.adminEmail = "email";
      if (!hasAccount(t.admin)) e.password = "required";
      return e;
    }
    case "logo":
      return {};
    case "branding": {
      const e: StepErrors = {};
      if (!/^#[0-9a-f]{6}$/i.test(t.branding.accent)) e.accent = "required";
      if (!TEMPLATES.some((x) => x.id === t.branding.template)) e.template = "required";
      return e;
    }
    case "quotes": {
      const q = t.quotes;
      const e: StepErrors = {};
      if (!Number.isInteger(q.validityDays) || q.validityDays < 1 || q.validityDays > 365)
        e.validityDays = "range";
      if (!(q.deposit >= 0 && q.deposit <= 100)) e.deposit = "range";
      if (!VAT_RATES.includes(q.defaultVat)) e.defaultVat = "required";
      return e;
    }
    case "domain":
      return domainErrors(t.domain);
    case "review":
      return {};
  }
}

/** Steps (before the review) that still have errors. */
export const incompleteSteps = (t: Tenant) =>
  ONBOARDING_STEPS.filter((s) => s !== "review" && Object.keys(stepErrors(t, s)).length);

export const nextStep = (s: OnboardingStep): OnboardingStep =>
  ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.indexOf(s) + 1, ONBOARDING_STEPS.length - 1)]!;
export const prevStep = (s: OnboardingStep): OnboardingStep =>
  ONBOARDING_STEPS[Math.max(ONBOARDING_STEPS.indexOf(s) - 1, 0)]!;

/** Writes what a step changes into the app settings, so new documents use it right away. */
function applyToSettings(t: Tenant, step: OnboardingStep) {
  const s = loadSettings();
  if (step === "profile") {
    const p = t.profile;
    saveSettings({
      ...s,
      company: {
        ...s.company,
        name: p.companyName.trim(),
        ice: p.ice,
        address: p.address.trim(),
        city: p.city.trim(),
        phone: p.phone.trim(),
        email: p.email.trim(),
      },
    });
  } else if (step === "logo") saveSettings({ ...s, logo: t.branding.logo });
  else if (step === "branding")
    saveSettings({ ...s, accent: t.branding.accent, template: t.branding.template });
  else if (step === "quotes") {
    const q = t.quotes;
    saveSettings({
      ...s,
      validityDays: q.validityDays,
      deposit: q.deposit,
      defaultVat: q.defaultVat,
      docLang: q.docLang,
      terms: q.terms,
      vatRates: s.vatRates.includes(q.defaultVat)
        ? s.vatRates
        : [...s.vatRates, q.defaultVat].sort((a, b) => b - a),
    });
  }
}

/**
 * Confirms a step: saves it, applies it to the settings and moves to the next step. The review
 * step launches the workspace (finishedAt). Existing quotes are never modified.
 * Throws AppError("onboardingIncomplete") when the step (or, for the review, any step) is invalid.
 */
export function completeStep(t: Tenant, step: OnboardingStep): Tenant {
  const invalid =
    step === "review" ? incompleteSteps(t).length > 0 : Object.keys(stepErrors(t, step)).length > 0;
  if (invalid) throw new AppError("onboardingIncomplete");
  let next: Tenant = { ...t };
  if (step === "profile") {
    next.profile = { ...t.profile, website: normalizeWebsite(t.profile.website) };
    next.slug = t.slug || slugify(t.profile.companyName);
    if (!next.domain.subdomain) next.domain = { ...next.domain, subdomain: next.slug };
  }
  if (step === "domain")
    next.domain = {
      ...t.domain,
      subdomain: t.domain.subdomain.trim(),
      customDomain: t.domain.customDomain.trim().toLowerCase(),
    };
  const completed = next.onboarding.completed.includes(step)
    ? next.onboarding.completed
    : [...next.onboarding.completed, step];
  next = {
    ...next,
    onboarding: {
      ...next.onboarding,
      completed,
      current: nextStep(step),
      ...(step === "review" ? { finishedAt: new Date().toISOString() } : {}),
    },
  };
  saveTenant(next);
  applyToSettings(next, step);
  return next;
}

/** Step 1 (kept for callers and tests). */
export const completeProfileStep = (t: Tenant) => completeStep(t, "profile");

/** Whether a guided tour should start: setup finished, tour neither finished nor skipped. */
export function tourPending(id: string): boolean {
  try {
    const t = loadTenant();
    return !!t?.onboarding.finishedAt && !t.onboarding.toursDone.includes(id);
  } catch {
    return false;
  }
}

/** Records a finished or skipped tour, so it does not come back on any device. */
export function markTourDone(id: string) {
  const t = loadTenant();
  if (!t || t.onboarding.toursDone.includes(id)) return;
  saveTenant({ ...t, onboarding: { ...t.onboarding, toursDone: [...t.onboarding.toursDone, id] } });
}

/** "Revoir le guide": every tour starts again on its page. */
export function resetTours() {
  const t = loadTenant();
  if (t) saveTenant({ ...t, onboarding: { ...t.onboarding, toursDone: [] } });
}
