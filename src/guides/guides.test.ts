import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/paths";
import { absoluteUrl, articleLd, jsonLd, sitemapXml } from "@/lib/seo";
import { GUIDES, guideBySlug } from "./guides";

describe("guides", () => {
  it("have unique slugs, a direct answer, sources and existing related guides", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      expect(g.slug).toMatch(/^[a-z0-9-]+$/);
      expect(g.lead.length).toBeGreaterThan(150);
      expect(g.description.length).toBeLessThanOrEqual(200);
      expect(g.sources.length).toBeGreaterThan(0);
      for (const s of g.sources) expect(s.url).toMatch(/^https:\/\//);
      for (const r of g.related) expect(guideBySlug(r)).not.toBeNull();
      expect(g.updated >= g.published).toBe(true);
    }
  });

  it("have unique titles and headings", () => {
    expect(new Set(GUIDES.map((g) => g.title)).size).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((g) => g.h1)).size).toBe(GUIDES.length);
  });

  it("never mention the abolished 7 % and 14 % VAT rates as current", () => {
    const tva = guideBySlug("tva-maroc-devis-facture")!;
    expect(tva.lead).toContain("20 %");
    expect(tva.lead).toContain("10 %");
    expect(tva.lead).toMatch(/7 % et 14 % ne s'appliquent plus/);
  });

  it("are public pages listed in the sitemap", () => {
    const xml = sitemapXml();
    expect(xml).toContain(`<loc>${absoluteUrl("/guides")}</loc>`);
    for (const g of GUIDES) {
      expect(isPublicPath(`/guides/${g.slug}`)).toBe(true);
      expect(xml).toContain(`<loc>${absoluteUrl(`/guides/${g.slug}`)}</loc>`);
    }
  });

  it("describe themselves as articles with a breadcrumb", () => {
    const g = GUIDES[0]!;
    const [article, crumbs] = articleLd({
      path: `/guides/${g.slug}`,
      headline: g.h1,
      description: g.description,
      published: g.published,
      updated: g.updated,
    }).map((x) => JSON.parse(jsonLd(x).children));
    expect(article).toMatchObject({ "@type": "Article", inLanguage: "fr-MA", headline: g.h1 });
    expect(crumbs.itemListElement).toHaveLength(3);
  });
});
