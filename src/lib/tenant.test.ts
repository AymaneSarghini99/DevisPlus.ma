import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings } from "./store";
import {
  completeProfileStep,
  completeStep,
  domainErrors,
  incompleteSteps,
  stepErrors,
  passwordErrors,
  dnsHost,
  emptyProfile,
  loadTenant,
  newTenant,
  normalizeWebsite,
  profileErrors,
  saveTenant,
  slugify,
  type BusinessProfile,
} from "./tenant";

const valid: BusinessProfile = {
  ...emptyProfile(),
  companyName: "Climatizone SARL",
  sector: "hvac",
  address: "12 Rue Ibn Battouta",
  city: "Casablanca",
  phone: "+212 600 000 000",
  email: "contact@climatizone.ma",
};

beforeEach(() => localStorage.clear());

describe("profileErrors", () => {
  it("accepts a complete profile without the optional legal info", () => {
    expect(profileErrors(valid)).toEqual({});
  });

  it("flags every required field on an empty profile, but not the optional ones", () => {
    const e = profileErrors(emptyProfile());
    expect(Object.keys(e).sort()).toEqual(
      ["address", "city", "companyName", "email", "phone", "sector"].sort(),
    );
    expect(e.legalName).toBeUndefined();
    expect(e.ice).toBeUndefined();
    expect(e.website).toBeUndefined();
  });

  it("checks the format of ICE, email, phone and website", () => {
    const e = profileErrors({
      ...valid,
      ice: "123",
      email: "nope",
      phone: "0612",
      website: "not a site",
    });
    expect(e).toEqual({ ice: "ice", email: "email", phone: "phone", website: "url" });
    expect(profileErrors({ ...valid, ice: "001234567000089", website: "www.exemple.ma" })).toEqual(
      {},
    );
  });

  it("defaults the currency to MAD", () => {
    expect(emptyProfile().currency).toBe("MAD");
  });
});

describe("slugify / normalizeWebsite", () => {
  it("builds a subdomain-safe slug", () => {
    expect(slugify("Électricité Atlas & Fils")).toBe("electricite-atlas-fils");
    expect(slugify("شركة الأطلس")).toBe("");
  });
  it("adds https:// when missing", () => {
    expect(normalizeWebsite("exemple.ma")).toBe("https://exemple.ma");
    expect(normalizeWebsite("http://exemple.ma")).toBe("http://exemple.ma");
    expect(normalizeWebsite("  ")).toBe("");
  });
});

describe("save and resume", () => {
  it("restores a saved draft", () => {
    const t = { ...newTenant("ar"), profile: { ...valid, language: "ar" as const } };
    saveTenant(t);
    const back = loadTenant();
    expect(back?.profile.companyName).toBe("Climatizone SARL");
    expect(back?.profile.language).toBe("ar");
    expect(back?.onboarding.completed).toEqual([]);
  });

  it("step 1 needs an administrator email and password", () => {
    const e = stepErrors({ ...newTenant(), profile: valid }, "profile");
    expect(e).toEqual({ adminEmail: "required", password: "required" });
    expect(() => completeProfileStep({ ...newTenant(), profile: valid })).toThrow();
    expect(stepErrors({ ...newTenant(), profile: valid, admin: ADMIN }, "profile")).toEqual({});
  });

  it("checks the password being typed, and keeps an existing one when left empty", () => {
    const none = newTenant().admin;
    expect(passwordErrors(none, "", "")).toEqual({ password: "required" });
    expect(passwordErrors(none, "short", "short")).toEqual({ password: "passwordShort" });
    expect(passwordErrors(none, "longenough", "different")).toEqual({ confirm: "passwordMatch" });
    expect(passwordErrors(none, "longenough", "longenough")).toEqual({});
    expect(passwordErrors(ADMIN, "", "")).toEqual({});
  });

  it("completing step 1 moves to the logo step and fills the company settings", () => {
    const done = completeProfileStep({
      ...newTenant(),
      admin: ADMIN,
      profile: { ...valid, website: "climatizone.ma" },
    });
    expect(done.onboarding.completed).toEqual(["profile"]);
    expect(done.onboarding.current).toBe("logo");
    expect(done.slug).toBe("climatizone-sarl");
    expect(done.profile.website).toBe("https://climatizone.ma");
    expect(loadTenant()?.onboarding.completed).toEqual(["profile"]);
    const c = loadSettings().company;
    expect(c.name).toBe("Climatizone SARL");
    expect(c.city).toBe("Casablanca");
    expect(c.email).toBe("contact@climatizone.ma");
    // Completing twice does not duplicate the step.
    expect(completeProfileStep(done).onboarding.completed).toEqual(["profile"]);
  });
});

const ADMIN = {
  email: "admin@climatizone.ma",
  passwordHash: "ab".repeat(32),
  salt: "cd".repeat(16),
  googleSub: "",
};

describe("steps 2–6", () => {
  const ready = () => completeProfileStep({ ...newTenant(), profile: valid, admin: ADMIN });

  it("profile completion proposes the slug as subdomain", () => {
    expect(ready().domain.subdomain).toBe("climatizone-sarl");
  });

  it("logo, branding and quote steps are written into the settings", () => {
    let t = ready();
    t = completeStep(
      { ...t, branding: { ...t.branding, logo: "data:image/png;base64,AAA" } },
      "logo",
    );
    expect(t.onboarding.current).toBe("branding");
    expect(loadSettings().logo).toBe("data:image/png;base64,AAA");
    t = completeStep(
      { ...t, branding: { ...t.branding, accent: "#0F766E", template: "zellige" } },
      "branding",
    );
    expect(loadSettings().accent).toBe("#0F766E");
    expect(loadSettings().template).toBe("zellige");
    t = completeStep(
      {
        ...t,
        quotes: { ...t.quotes, validityDays: 15, deposit: 40, defaultVat: 10, docLang: "ar" },
      },
      "quotes",
    );
    const s = loadSettings();
    expect([s.validityDays, s.deposit, s.defaultVat, s.docLang]).toEqual([15, 40, 10, "ar"]);
    expect(t.onboarding.current).toBe("domain");
  });

  it("rejects invalid quote settings", () => {
    const t = ready();
    expect(
      stepErrors({ ...t, quotes: { ...t.quotes, validityDays: 0, deposit: 120 } }, "quotes"),
    ).toEqual({
      validityDays: "range",
      deposit: "range",
    });
    expect(() =>
      completeStep({ ...t, quotes: { ...t.quotes, validityDays: 0 } }, "quotes"),
    ).toThrow();
  });

  it("validates subdomains and custom domains", () => {
    const d = newTenant().domain;
    expect(domainErrors({ ...d, subdomain: "" })).toEqual({ subdomain: "required" });
    expect(domainErrors({ ...d, subdomain: "a" })).toEqual({ subdomain: "subdomain" });
    expect(domainErrors({ ...d, subdomain: "-abc" })).toEqual({ subdomain: "subdomain" });
    expect(domainErrors({ ...d, subdomain: "admin" })).toEqual({ subdomain: "reserved" });
    expect(domainErrors({ ...d, subdomain: "atlas-reno" })).toEqual({});
    expect(domainErrors({ ...d, subdomain: "atlas", mode: "custom" })).toEqual({
      customDomain: "required",
    });
    expect(
      domainErrors({ ...d, subdomain: "atlas", mode: "custom", customDomain: "pas un domaine" }),
    ).toEqual({
      customDomain: "domain",
    });
    expect(
      domainErrors({ ...d, subdomain: "atlas", mode: "custom", customDomain: "x.devisplus.ma" }),
    ).toEqual({
      customDomain: "domain",
    });
    expect(
      domainErrors({ ...d, subdomain: "atlas", mode: "custom", customDomain: "devis.atlas.ma" }),
    ).toEqual({});
  });

  it("launch requires every step and records the finish date", () => {
    expect(() => completeStep(newTenant(), "review")).toThrow();
    expect(incompleteSteps({ ...ready(), admin: newTenant().admin })).toContain("profile");
    let t = ready();
    for (const s of ["logo", "branding", "quotes", "domain"] as const) t = completeStep(t, s);
    expect(t.onboarding.current).toBe("review");
    expect(incompleteSteps(t)).toEqual([]);
    t = completeStep(t, "review");
    expect(t.onboarding.finishedAt).not.toBeNull();
    expect(t.onboarding.completed).toEqual([
      "profile",
      "logo",
      "branding",
      "quotes",
      "domain",
      "review",
    ]);
    expect(loadTenant()?.onboarding.finishedAt).toBe(t.onboarding.finishedAt);
  });

  it("older drafts without the new sections still load", () => {
    localStorage.setItem(
      "devisplus.tenant",
      JSON.stringify({
        id: "x",
        slug: "",
        profile: valid,
        onboarding: { current: "logo", completed: ["profile"] },
      }),
    );
    const t = loadTenant()!;
    expect(t.branding.accent).toMatch(/^#/);
    expect(t.quotes.validityDays).toBeGreaterThan(0);
    expect(t.domain.mode).toBe("subdomain");
    expect(t.onboarding.current).toBe("logo");
  });
});

describe("dnsHost", () => {
  it("finds the record name to create at the domain provider", () => {
    expect(dnsHost("devis.atlas.ma")).toEqual({ host: "devis", zone: "atlas.ma", apex: false });
    expect(dnsHost("atlas.ma")).toEqual({ host: "@", zone: "atlas.ma", apex: true });
    expect(dnsHost("devis.atlas.co.ma")).toEqual({
      host: "devis",
      zone: "atlas.co.ma",
      apex: false,
    });
    expect(dnsHost("a.b.atlas.com")).toEqual({ host: "a.b", zone: "atlas.com", apex: false });
  });
});
