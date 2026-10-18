import type { LegalDocId } from "../documents";

/** A paragraph, or a bulleted list. `{{field}}` tokens are replaced by operator details. */
export type Block = string | { list: string[] };

export type LegalSection = {
  id: string;
  title: string;
  body: Block[];
  /** Why this clause needs review by a Moroccan legal professional (shown as a badge). */
  review?: string;
};

export type LegalText = { title: string; summary: string; sections: LegalSection[] };

export type LegalContent = Record<LegalDocId, LegalText>;
