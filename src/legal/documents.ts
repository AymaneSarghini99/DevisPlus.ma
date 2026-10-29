/**
 * Register of the legal documents. Each change of substance gets a new version entry; older
 * entries are kept so it remains possible to know which text applied at a given date.
 *
 * Status "draft": not reviewed by a Moroccan legal professional — every page shows a banner.
 * Switch to "published" only after review, with an effective date, and keep the previous
 * versions in `history`.
 */
export const LEGAL_DOCS = [
  "terms",
  "privacy",
  "cookies",
  "refunds",
  "acceptable-use",
  "data-processing",
] as const;
export type LegalDocId = (typeof LEGAL_DOCS)[number];

export type LegalVersion = {
  version: string;
  status: "draft" | "published";
  /** yyyy-mm-dd of the last edit of this version */
  updated: string;
  /** yyyy-mm-dd from which a published version applies; null for drafts */
  effective: string | null;
  /** Material change for users (would require notification / new acceptance). */
  material: boolean;
};

export const LEGAL_VERSIONS: Record<LegalDocId, LegalVersion[]> = {
  terms: [
    { version: "0.1", status: "draft", updated: "2026-10-18", effective: null, material: true },
  ],
  privacy: [
    { version: "0.1", status: "draft", updated: "2026-10-18", effective: null, material: true },
    // Rewritten for online accounts and Google sign-in / Drive (Google verification), and
    // published at the owner's request before a legal review.
    {
      version: "1.0",
      status: "published",
      updated: "2026-10-29",
      effective: "2026-10-29",
      material: true,
    },
  ],
  cookies: [
    { version: "0.1", status: "draft", updated: "2026-10-18", effective: null, material: true },
  ],
  refunds: [
    { version: "0.1", status: "draft", updated: "2026-10-18", effective: null, material: true },
  ],
  "acceptable-use": [
    { version: "0.1", status: "draft", updated: "2026-10-18", effective: null, material: true },
  ],
  "data-processing": [
    { version: "0.1", status: "draft", updated: "2026-10-18", effective: null, material: true },
  ],
};

/** Latest version = last entry. */
export const currentVersion = (id: LegalDocId) => LEGAL_VERSIONS[id].at(-1)!;

/** Date of the last review by a legal professional (null = never reviewed). */
export const LAST_LEGAL_REVIEW: string | null = null;
