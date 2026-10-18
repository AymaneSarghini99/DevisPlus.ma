# DevisPlus.ma: SEO audit, foundation (stage 1) and content (stage 2)

Status labels: **Done ✓** (implemented and checked), **To decide** (needs the owner), **Blocked**
(needs an account or tool we don't have), **Recommended** (not implemented yet).

## 1. What DevisPlus is (from the code and pages)

- **Product:** a quotation and invoice application for Moroccan businesses: dirhams, ICE, IF, RC,
  TP, VAT rates 20/14/10/7/0 %, A4 PDF, WhatsApp sending, French, English and Arabic interface.
- **How it is sold** (`/tarifs`): **Offre Business, 2,500 MAD one-time**: a workspace customised
  with the client's name, logo and colours, set up by DevisPlus, on a subdomain when possible.
  Requests go by email or WhatsApp. There is no online payment and no self-service sign-up.
- **Contact details supplied by the owner:** 25 Avenue Hassan II, 20000 Casablanca;
  contact@devisplus.ma; +212 677846536 (calls); +212 607202841 (WhatsApp only).
- **Search target:** a **software / B2B service**, not a walk-in local shop. Local SEO
  (Casablanca) applies to the company and its support, not to a physical service area.

## 2. Audit findings (verified on the running site, 18 Oct 2026)

| #   | Severity | Finding                                                                                                                                                                                        | Evidence                                                                                  | Status                                                                                      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Critical | **English and Arabic cannot be indexed**: all three languages share one URL, chosen by a cookie, so crawlers only ever get French. No hreflang is possible.                                    | `__root.tsx` reads the `devisplus.lang` cookie; the HTML for `/` is identical without it. | **To decide** (see §4)                                                                      |
| 2   | High     | No `sitemap.xml` (404).                                                                                                                                                                        | `curl /sitemap.xml` returned 404                                                          | **Done ✓**: generated from the public pages                                                 |
| 3   | High     | No canonical URL on any page.                                                                                                                                                                  | No `<link rel="canonical">` in any page's HTML                                            | **Done ✓**: absolute canonical on the production domain for public pages                    |
| 4   | High     | **About 10 app pages were indexable** (dashboard, quote and invoice editors, clients, settings, onboarding…): around 20 words of server HTML each, private tools. Only `/admin` had `noindex`. | Page HTML: no robots meta                                                                 | **Done ✓**: `noindex, follow` on every app page; `/admin` is `noindex, nofollow`            |
| 5   | High     | No structured data.                                                                                                                                                                            | No JSON-LD                                                                                | **Done ✓**: `Organization` + `WebSite` on `/`, `Service` + `Offer` (2,500 MAD) on `/tarifs` |
| 6   | Medium   | Social previews incomplete: `twitter:card=summary_large_image` with **no image**, no `og:url` or `og:site_name`, no OG tags on legal pages.                                                    | Page HTML                                                                                 | **Done ✓**: 1200×630 `public/og-image.png`, full OG/Twitter tags on public pages            |
| 7   | Medium   | Generic titles (e.g. "Tarifs — DevisPlus.ma").                                                                                                                                                 | Page HTML                                                                                 | **Done ✓**: titles and descriptions now describe each page's real offer (FR/EN/AR)          |
| 8   | Medium   | **Thin landing page**: about 200 words, one H1 and three H2 steps; nothing on invoices, WhatsApp, the custom-setup offer, FAQs or who it is for.                                               | Text extraction of `/`                                                                    | **Recommended** (§5)                                                                        |
| 9   | Medium   | The landing's main call to action ("Créer un devis") opens the free in-browser app, while the business model is the 2,500 MAD custom setup. Search visitors may never see the offer.           | `/` vs `/tarifs`                                                                          | **To decide**                                                                               |
| 10  | Low      | Static `robots.txt` had no sitemap line and a fixed domain.                                                                                                                                    | `public/robots.txt`                                                                       | **Done ✓**: generated per deployment (`/robots.txt`)                                        |
| 11  | Low      | `/modeles` (template gallery) could be useful public content ("modèles de devis"), but it renders after the page loads, so the server HTML is nearly empty.                                    | Page HTML                                                                                 | **Recommended**                                                                             |
| 12  | Info     | Unknown pages return HTTP 404 (correct). Pages are server-rendered: titles and text are in the HTML.                                                                                           | `curl`                                                                                    | OK                                                                                          |

Not measured: Core Web Vitals and Lighthouse (no field data or Lighthouse on this machine),
Search Console, Analytics, backlinks, keyword volumes. See §6.

## 3. What was implemented (stage 1, technical foundation)

| Change                                                                                                                             | Files                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| One SEO module: canonical, robots, OG/Twitter tags, JSON-LD, sitemap, robots.txt; domain from `VITE_SITE_URL` (one per deployment) | `src/lib/seo.ts`                                                                                   |
| Every route goes through it: public pages indexable, app pages `noindex`                                                           | `src/i18n/meta.ts`, `src/components/LegalPage.tsx`, `src/routes/legal.tsx`, `src/routes/admin.tsx` |
| `/sitemap.xml` and `/robots.txt` generated by the server (the old `public/robots.txt` is removed)                                  | `src/routes/sitemap[.]xml.ts`, `src/routes/robots[.]txt.ts`                                        |
| JSON-LD: Organization + WebSite (home), Service + Offer (pricing), all built from visible content and `legal/operator.ts`          | `src/routes/index.tsx`, `src/routes/tarifs.tsx`                                                    |
| New titles and meta descriptions (landing, pricing) in FR/EN/AR                                                                    | `src/i18n/messages/*/base.ts`                                                                      |
| Social preview image 1200×630                                                                                                      | `public/og-image.png`                                                                              |
| `VITE_SITE_URL` documented                                                                                                         | `.env.example`                                                                                     |
| Tests: canonical, noindex, sitemap content, robots, JSON-LD validity and escaping                                                  | `src/lib/seo.test.ts`                                                                              |

Checked: `npx tsc --noEmit` ✓, `npx vitest run` (138 tests) ✓, `npx eslint` (no new problems) ✓,
`npx vite build` ✓, and a crawl of the dev server (robots/canonical/OG/JSON-LD on 9 routes) ✓.
Not yet checked: Google Rich Results Test and the Schema.org validator (they need the live
URL), and the live domain itself.

## 4. Decisions needed from the owner

1. **Languages in search.** To rank in English (and Arabic), public pages need their own URLs,
   for example `/` (French, unchanged), `/en/`, `/en/pricing`, `/ar/`… with reciprocal hreflang
   and self-canonicals. Only the public pages (landing, pricing, legal) would get language
   URLs; the app keeps the cookie. Recommended: **French at `/` (no redirect), English at
   `/en/…`; Arabic later if there is demand.**
2. **What the homepage sells.** A free tool, or the 2,500 MAD custom setup? Recommended: keep
   the demo, but make "Demander une démo / l'installation" the main call to action and explain the
   offer on the homepage.
3. **Google Business Profile.** Only if 25 Avenue Hassan II is a real office where customers
   can be met during opening hours (Google's rules). Otherwise, no profile. Please confirm.
4. **Real proof.** Client names, case studies or testimonials are only usable with clients'
   permission. Nothing will be invented.

## 5. Recommended next stages (not implemented)

1. **Homepage content** (French first): who it is for (artisans, BTP, HVAC, services…), quotes
   and invoices compliant with Moroccan mentions (ICE, IF, RC, TP), WhatsApp sending, the
   custom setup offer, a short FAQ answered on the page, and a link to `/tarifs`.
2. **`/en/` pages** once decision 1 is made, written for English readers, not translated
   word for word.
3. **2–3 genuinely useful guides** (e.g. "Mentions obligatoires sur un devis au Maroc",
   "Comment calculer la TVA sur un devis", "Devis ou facture : différences"). Each needs facts
   checked against official sources (DGI). They link to the homepage and pricing.
4. **Server-render `/modeles`** and make it indexable, as a gallery of Moroccan quote templates.
5. **Casablanca:** a section on the homepage and pricing page (company based in Casablanca,
   serving all of Morocco), not neighbourhood pages, since the product is used remotely.

## 6. Blocked / external steps (owner access needed)

- **Google Search Console and Bing Webmaster Tools:** verify devisplus.ma, then submit
  `https://devisplus.ma/sitemap.xml`.
- **Keyword research:** no keyword tool or Search Console data is available here, so no search
  volumes are claimed. Recommended: Google Keyword Planner (free with a Google Ads account),
  filtered to Morocco, French and English.
- **Analytics and conversions:** not installed. Recommended: track the pricing form's
  "Envoyer par e-mail / WhatsApp" clicks as conversions, with a cookie-consent decision first.
- **Rich Results Test** on the live URL after deployment.

## 7. Stage 2: homepage content and guides (decision: one French URL for now)

| Change                                                                                                                                                                                                                                                                                               | Status                                                                                                                 | Files                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Homepage: "Voir l'offre" call to action; sections for audiences, 8 real features, the 2,500 MAD offer, Casablanca, a 7-question FAQ written on the page, and the guides (FR/EN/AR). Server HTML grew from about 200 to about 970 words.                                                              | Done ✓                                                                                                                 | `src/routes/index.tsx`, `src/i18n/messages/*/screens.ts`                                                                |
| 3 French guides, each with a direct answer first, sources, a disclaimer and related guides: invoice mentions (CGI art. 145, ICE), VAT 2026 (20 % / 10 %), quote vs invoice                                                                                                                           | Done ✓                                                                                                                 | `src/guides/guides.ts`, `src/routes/guides.index.tsx`, `src/routes/guides.$slug.tsx`, `src/components/GuideArticle.tsx` |
| Article + BreadcrumbList JSON-LD on guides; guides in the sitemap (13 URLs); "Guides" in the header and footer                                                                                                                                                                                       | Done ✓                                                                                                                 | `src/lib/seo.ts`, `MarketingHeader.tsx`, `SiteFooter.tsx`                                                               |
| **VAT correction**: since 1 January 2026 Morocco has two rates (20 % and 10 %), so the homepage copy and the app's default rates no longer offer 7 % and 14 %. Saved settings still holding the untouched old list switch to 20/10/0; a customised list and every existing quote are left unchanged. | Done ✓                                                                                                                 | `src/lib/quotes.ts`, `src/lib/store.ts`                                                                                 |
| FAQPage structured data                                                                                                                                                                                                                                                                              | Not added on purpose: Google limits FAQ rich results to government and health sites; the FAQ stays visible on the page | n/a                                                                                                                     |

Fact-checking: VAT rates come from the DGI's note circulaire n° 737 (LF 2026) as reported by La Vie Éco.
Invoice mentions come from CGI art. 145 as summarised by CMS (LF 2016, ICE) and Moroccan guides,
because the official CGI text could not be fetched from here. **Have an accountant review the
guides before promoting them.** Every guide says this and links its sources.

Checks run: `tsc` ✓, `vitest` (144 tests) ✓, `eslint` (no new problems) ✓, `vite build` ✓; a
crawl of `/`, `/guides`, the 3 guides, `/tarifs` and an unknown guide (404) ✓; screenshots in
French on desktop and Arabic and French on mobile, with no overflow and no console errors ✓.
