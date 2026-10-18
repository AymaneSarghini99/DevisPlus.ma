import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  INDEXABLE_PATHS,
  jsonLd,
  offerLd,
  organizationLd,
  robotsTxt,
  seoHead,
  SITE_URL,
  sitemapXml,
} from "./seo";

const get = (h: ReturnType<typeof seoHead>, key: string) =>
  h.meta.find((m) => m["name"] === key || m["property"] === key)?.["content"];

describe("SEO", () => {
  it("builds absolute URLs on the production domain without trailing slashes", () => {
    expect(SITE_URL).toBe("https://devisplus.ma");
    expect(absoluteUrl("/")).toBe("https://devisplus.ma/");
    expect(absoluteUrl("/tarifs/")).toBe("https://devisplus.ma/tarifs");
    expect(absoluteUrl("privacy")).toBe("https://devisplus.ma/privacy");
  });

  it("gives public pages a canonical URL and social previews", () => {
    const h = seoHead({ path: "/tarifs", title: "T", description: "D", locale: "fr", index: true });
    expect(h.links).toEqual([{ rel: "canonical", href: "https://devisplus.ma/tarifs" }]);
    expect(get(h, "og:url")).toBe("https://devisplus.ma/tarifs");
    expect(get(h, "og:image")).toBe("https://devisplus.ma/og-image.png");
    expect(get(h, "og:locale")).toBe("fr_MA");
    expect(get(h, "robots")).toMatch(/^index, follow/);
  });

  it("keeps app pages out of search results without a canonical", () => {
    const h = seoHead({
      path: "/dashboard",
      title: "T",
      description: "D",
      locale: "fr",
      index: false,
    });
    expect(get(h, "robots")).toBe("noindex, follow");
    expect(h.links).toBeUndefined();
    expect(get(h, "og:url")).toBeUndefined();
  });

  it("lists only the public pages in the sitemap", () => {
    const xml = sitemapXml();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    for (const p of INDEXABLE_PATHS) expect(xml).toContain(`<loc>${absoluteUrl(p)}</loc>`);
    for (const p of ["/dashboard", "/devis", "/admin", "/parametres", "/onboarding", "/api"])
      expect(xml).not.toContain(`${SITE_URL}${p}`);
    expect(xml.match(/<url>/g)).toHaveLength(INDEXABLE_PATHS.length);
  });

  it("points robots.txt to the sitemap and keeps the API out", () => {
    expect(robotsTxt()).toContain("Disallow: /api/");
    expect(robotsTxt()).toContain("Sitemap: https://devisplus.ma/sitemap.xml");
    expect(robotsTxt()).not.toMatch(/Disallow: \/\s*$/m);
  });

  it("produces valid JSON-LD that cannot break out of its script tag", () => {
    const org = JSON.parse(jsonLd(organizationLd()).children);
    expect(org["@type"]).toBe("Organization");
    expect(org.address.addressLocality).toBe("Casablanca");
    const offer = JSON.parse(
      jsonLd(offerLd({ name: "Offre Business", description: "x", price: 2500 })).children,
    );
    expect(offer.offers).toMatchObject({ price: "2500.00", priceCurrency: "MAD" });
    expect(jsonLd({ a: "</script><script>alert(1)</script>" }).children).not.toContain("</script>");
  });
});
