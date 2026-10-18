import { emptyCompany } from "@/lib/quotes";
import { sample } from "@/lib/sample";
import { defaultSettings } from "@/lib/store";
import { PLATFORM_DOMAIN, type DomainSettings, type Tenant } from "@/lib/tenant";

/** Sample quote built from the draft (profile, logo, branding, quote settings). */
export function previewDoc(tn: Tenant) {
  const p = tn.profile;
  const s = {
    ...defaultSettings(),
    ...tn.quotes,
    ...tn.branding,
    company: {
      ...emptyCompany(),
      name: p.companyName,
      ice: p.ice,
      address: p.address,
      city: p.city,
      phone: p.phone,
      email: p.email,
    },
  };
  return sample(s);
}

/** The address shown to clients: the custom domain if chosen, else the DevisPlus subdomain. */
export const workspaceAddress = (d: DomainSettings) =>
  d.mode === "custom" && d.customDomain
    ? d.customDomain.trim().toLowerCase()
    : `${d.subdomain.trim() || "…"}.${PLATFORM_DOMAIN}`;
