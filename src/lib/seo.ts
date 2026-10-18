/**
 * Search-engine rules for the public site, in one place.
 *
 * - Public pages (landing, pricing, legal) are indexable, with an absolute canonical URL on the
 *   production domain and social previews.
 * - App pages (quotes, invoices, settings, admin, onboarding…) are "noindex": they are tools
 *   with no public content, and each visitor's data stays in their own browser.
 * - The domain comes from VITE_SITE_URL (one value per customer deployment), defaulting to the
 *   DevisPlus.ma site.
 *
 * Language note: French, English and Arabic are served on the same URL (chosen by a cookie),
 * so search engines index the French version only. Language-specific URLs (/en/…) and hreflang
 * are a separate, deliberate step (see docs/seo.md).
 */
import type { Locale } from "@/i18n/config";
import { CONTACT, OPERATOR } from "@/legal/operator";
import { GUIDE_PATHS } from "@/guides/guides";
import { MARKETING_PATHS } from "./paths";

export const SITE_URL = (
  (import.meta.env?.["VITE_SITE_URL"] as string | undefined) || CONTACT.website
).replace(/\/+$/, "");
export const SITE_NAME = "DevisPlus.ma";
export const OG_IMAGE = "/og-image.png";

/** Absolute URL of a path on the production domain, without a trailing slash (except "/"). */
export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path === "/" || path === "" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`}`;

/** Indexable public pages, i.e. the sitemap. */
export const INDEXABLE_PATHS = [...MARKETING_PATHS, ...GUIDE_PATHS];

const OG_LOCALE: Record<Locale, string> = { fr: "fr_MA", en: "en_US", ar: "ar_MA" };

type Meta = Record<string, string>;
export type Head = {
  meta: Meta[];
  links?: { rel: string; href: string }[];
  scripts?: { type: string; children: string }[];
};

/**
 * Head tags of a page. `index: false` pages get `noindex, follow` and no canonical.
 */
export function seoHead(o: {
  path: string;
  title: string;
  description: string;
  locale: Locale;
  index: boolean;
}): Head {
  const meta: Meta[] = [
    { title: o.title },
    { name: "description", content: o.description },
    { property: "og:title", content: o.title },
    { property: "og:description", content: o.description },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: OG_LOCALE[o.locale] },
  ];
  if (!o.index) return { meta: [...meta, { name: "robots", content: "noindex, follow" }] };
  const url = absoluteUrl(o.path);
  const image = absoluteUrl(OG_IMAGE);
  return {
    meta: [
      ...meta,
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:title", content: o.title },
      { name: "twitter:description", content: o.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export const jsonLd = (data: object) => ({
  type: "application/ld+json",
  // "</" is escaped so the JSON can never close the script tag.
  children: JSON.stringify(data).replace(/</g, "\\u003c"),
});

/** The company behind DevisPlus.ma, from the details the owner supplied (legal/operator.ts). */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: OPERATOR.brand,
    url: `${SITE_URL}/`,
    logo: absoluteUrl("/icon-512.png"),
    email: CONTACT.email,
    telephone: CONTACT.phone.replace(/\s/g, ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT.street,
      postalCode: CONTACT.postalCode,
      addressLocality: CONTACT.city,
      addressCountry: "MA",
    },
    areaServed: { "@type": "Country", name: "Maroc" },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT.email,
        telephone: CONTACT.whatsapp.replace(/\s/g, ""),
        availableLanguage: ["French", "English", "Arabic"],
      },
    ],
  };
}

export function websiteLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description,
    inLanguage: "fr-MA",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/** The offer shown on /tarifs (same name, price and wording as the visible page). */
export function offerLd(o: { name: string; description: string; price: number }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/tarifs#offer`,
    name: o.name,
    description: o.description,
    serviceType: "Logiciel de devis et factures personnalisé",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "Maroc" },
    offers: {
      "@type": "Offer",
      url: absoluteUrl("/tarifs"),
      price: o.price.toFixed(2),
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
    },
  };
}

export function sitemapXml() {
  const urls = INDEXABLE_PATHS.map(
    (p) =>
      `  <url>\n    <loc>${absoluteUrl(p)}</loc>\n    <priority>${p === "/" ? "1.0" : p === "/tarifs" ? "0.9" : p.startsWith("/guides") ? "0.7" : "0.3"}</priority>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt() {
  // App pages stay crawlable so search engines can read their "noindex" tag; only the
  // server endpoints are excluded.
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`;
}

/** Guide article + breadcrumb (French content, author and publisher = the company). */
export function articleLd(o: {
  path: string;
  headline: string;
  description: string;
  published: string;
  updated: string;
}) {
  const url = absoluteUrl(o.path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: o.headline,
      description: o.description,
      inLanguage: "fr-MA",
      datePublished: o.published,
      dateModified: o.updated,
      mainEntityOfPage: url,
      image: absoluteUrl(OG_IMAGE),
      author: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    breadcrumbLd([
      ["Accueil", "/"],
      ["Guides", "/guides"],
      [o.headline, o.path],
    ]),
  ];
}

export function breadcrumbLd(items: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}
