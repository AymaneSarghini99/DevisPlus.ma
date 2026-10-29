import { describe, expect, it } from "vitest";
import { LEGAL_CONTENT } from "./content";
import type { Block } from "./content/types";
import { currentVersion, LAST_LEGAL_REVIEW, LEGAL_DOCS, LEGAL_VERSIONS } from "./documents";
import { OPERATOR } from "./operator";

const text = (b: Block) => (typeof b === "string" ? [b] : b.list);
const tokens = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!);

describe("legal documents", () => {
  it("exist in French, English and Arabic with the same sections and review flags", () => {
    for (const id of LEGAL_DOCS) {
      const fr = LEGAL_CONTENT.fr[id];
      for (const l of ["en", "ar"] as const) {
        const other = LEGAL_CONTENT[l][id];
        expect(
          other.sections.map((s) => s.id),
          `${l}/${id}`,
        ).toEqual(fr.sections.map((s) => s.id));
        expect(
          other.sections.map((s) => !!s.review),
          `${l}/${id} review flags`,
        ).toEqual(fr.sections.map((s) => !!s.review));
        other.sections.forEach((s, i) => {
          const frTokens = fr.sections[i]!.body.flatMap(text).flatMap(tokens).sort();
          expect(s.body.flatMap(text).flatMap(tokens).sort(), `${l}/${id}/${s.id} tokens`).toEqual(
            frTokens,
          );
        });
      }
    }
  });

  it("only use placeholders for real operator fields", () => {
    for (const l of ["fr", "en", "ar"] as const)
      for (const id of LEGAL_DOCS)
        for (const s of LEGAL_CONTENT[l][id].sections)
          for (const tk of s.body.flatMap(text).flatMap(tokens))
            expect(Object.keys(OPERATOR)).toContain(tk);
  });

  it("do not contain invented company details", () => {
    // Only the details supplied by the owner are filled in; everything else stays null.
    const provided = {
      brand: "DevisPlus.ma",
      legalName: "DevisPlus.ma",
      address: "25 Avenue Hassan II, 20000 Casablanca, Maroc",
      email: "contact@devisplus.ma",
      phone: "+212 677846536",
    };
    for (const [k, v] of Object.entries(OPERATOR))
      expect(v, k).toBe(k in provided ? provided[k as keyof typeof provided] : null);
  });

  it("Arabic texts are in Arabic", () => {
    for (const id of LEGAL_DOCS) {
      const d = LEGAL_CONTENT.ar[id];
      for (const s of [
        d.title,
        d.summary,
        ...d.sections.flatMap((x) => [x.title, ...x.body.flatMap(text)]),
      ])
        expect(/[؀-ۿ]/.test(s), s).toBe(true);
    }
  });

  it("are versioned drafts until reviewed, keeping their history", () => {
    for (const id of LEGAL_DOCS) {
      expect(LEGAL_VERSIONS[id].length).toBeGreaterThan(0);
      const v = currentVersion(id);
      // The privacy policy is published ahead of the legal review (required by Google's app
      // verification); the other documents stay drafts until reviewed.
      if (LAST_LEGAL_REVIEW === null && id !== "privacy") expect(v.status).toBe("draft");
      if (v.status === "published") expect(v.effective).not.toBeNull();
    }
  });
});
