/**
 * Onboarding configuration.
 *
 * INTRO_VIDEO: put your explainer video here and it appears at the top of the onboarding.
 *  - a file:  copy it to /public/onboarding/ and set `src: "/onboarding/intro.mp4"`
 *  - YouTube: set `youtubeId: "dQw4w9WgXcQ"` (the id from the video URL)
 *  - Loom:    set `loomId` to the id from the share URL (loom.com/share/<id>)
 * Leave all null to show the "video coming soon" placeholder.
 */
export const INTRO_VIDEO: {
  src: string | null;
  poster: string | null;
  youtubeId: string | null;
  loomId: string | null;
} = {
  src: null,
  poster: null,
  youtubeId: null,
  loomId: "36d9236c28c44bb985b6e2c16580f054",
};

/**
 * Workspace addresses (name.devisplus.ma) and customers' own domains are not served yet: the
 * setup step and the Settings section stay hidden until they are. Set to true to show them.
 */
export const DOMAINS_ENABLED = false;

const ALL_STEPS = ["profile", "logo", "branding", "quotes", "domain", "review"] as const;
export type OnboardingStep = (typeof ALL_STEPS)[number];
export const ONBOARDING_STEPS: readonly OnboardingStep[] = DOMAINS_ENABLED
  ? ALL_STEPS
  : ALL_STEPS.filter((s) => s !== "domain");

export const SECTORS = [
  "btp",
  "hvac",
  "electricity",
  "plumbing",
  "carpentry",
  "cleaning",
  "it",
  "consulting",
  "marketing",
  "events",
  "transport",
  "retail",
  "industry",
  "health",
  "other",
] as const;
export type Sector = (typeof SECTORS)[number];

export const CURRENCIES = ["MAD", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Where customers point their own domain (the CNAME value shown in the domain guide).
 * IMPORTANT: set this to the hostname your hosting gives you for custom domains (e.g. the
 * Vercel / Netlify / Cloudflare target) before you start activating customer domains.
 */
export const CUSTOM_DOMAIN_TARGET = "domains.devisplus.ma";
