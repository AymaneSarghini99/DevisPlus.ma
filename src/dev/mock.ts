/** Fictional test data for local testing only (never shipped: imported by dev code only). */
import { emptyParty, newLine, uid, type Line, type Party } from "@/lib/quotes";
import type { OnboardingStep } from "@/onboarding/config";
import type { Tenant } from "@/lib/tenant";

export const MOCK_EMAIL = "test@atlas-test.ma";
export const MOCK_PASSWORD = "Test2026!";

export const mockClient = (): Party => ({
  ...emptyParty(),
  name: "Hôtel Tanger Bay (test)",
  ice: "001987654000072",
  address: "Boulevard Mohammed VI",
  city: "Tanger",
  phone: "0661000000",
  email: "achats@hotel-test.ma",
  contact: "Samira Alaoui",
});

export const mockLines = (): Line[] => [
  {
    ...newLine(20),
    id: uid(),
    description: "Climatiseur split 12 000 BTU",
    qty: 2,
    unit: "pièce",
    unitPrice: 6000,
    kind: "materiel",
  },
  {
    ...newLine(20),
    id: uid(),
    description: "Pose et mise en service",
    qty: 1,
    unit: "forfait",
    unitPrice: 1500,
    kind: "main_oeuvre",
  },
  {
    ...newLine(20),
    id: uid(),
    description: "Contrat d'entretien annuel",
    qty: 1,
    unit: "forfait",
    unitPrice: 1200,
    discount: 10,
    kind: "service",
  },
];

/** A small square PNG logo (data URL) drawn on a canvas. */
function mockLogo() {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 120;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0F766E";
  g.fillRect(0, 0, 120, 120);
  g.fillStyle = "#ffffff";
  g.font = "bold 64px sans-serif";
  g.fillText("A", 40, 82);
  g.fillStyle = "#14213D";
  g.font = "bold 44px sans-serif";
  g.fillText("Atlas", 140, 78);
  return c.toDataURL("image/png");
}

/** Fills the current wizard step with test values. */
export function mockStep(t: Tenant, step: OnboardingStep): Tenant {
  switch (step) {
    case "profile":
      return {
        ...t,
        profile: {
          ...t.profile,
          companyName: "Atlas Rénovation (test)",
          legalName: "Atlas Rénovation SARL",
          sector: "btp",
          ice: "002345678000091",
          address: "45, boulevard Zerktouni",
          city: "Casablanca",
          phone: "0522471230",
          email: MOCK_EMAIL,
          website: "www.atlas-test.ma",
        },
        // Never change the sign-in email of an existing account.
        ...(t.admin.passwordHash || t.admin.googleSub
          ? {}
          : { admin: { ...t.admin, email: MOCK_EMAIL } }),
      };
    case "logo":
      return { ...t, branding: { ...t.branding, logo: mockLogo() } };
    case "branding":
      return { ...t, branding: { ...t.branding, accent: "#0F766E", template: "btp" } };
    case "quotes":
      return { ...t, quotes: { ...t.quotes, validityDays: 30, deposit: 30, defaultVat: 20 } };
    case "domain":
      return { ...t, domain: { ...t.domain, mode: "subdomain", subdomain: "atlas-test" } };
    default:
      return t;
  }
}
