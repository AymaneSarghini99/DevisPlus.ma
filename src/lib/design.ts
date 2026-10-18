import type { TemplateId } from "./quotes";

/** Watermark printed behind the document. Position is the centre, in % of the page. */
export type Watermark = {
  enabled: boolean;
  kind: "text" | "logo";
  text: string;
  opacity: number; // 0.02 – 0.6
  size: number; // 10 – 100: text height or logo width, relative to the page width
  rotation: number; // degrees, -90 – 90
  x: number; // 0 – 100
  y: number; // 0 – 100
};

export const defaultWatermark = (): Watermark => ({
  enabled: false,
  kind: "text",
  text: "CONFIDENTIEL",
  opacity: 0.08,
  size: 40,
  rotation: -30,
  x: 50,
  y: 45,
});

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(n) || 0));

/** Keeps a watermark inside its allowed ranges (used after drags and on loading old data). */
export function normalizeWatermark(w: Partial<Watermark> | undefined): Watermark {
  const d = { ...defaultWatermark(), ...w };
  return {
    ...d,
    opacity: clamp(d.opacity, 0.02, 0.6),
    size: clamp(d.size, 10, 100),
    rotation: clamp(d.rotation, -90, 90),
    x: clamp(d.x, 0, 100),
    y: clamp(d.y, 0, 100),
  };
}

/** Optional design choices layered on top of a built-in layout. */
export type DocStyle = {
  font: "sans" | "serif";
  title: string; // replaces "Devis" / "Facture" when set
  showLogo: boolean;
  showWords: boolean; // "Arrêté … à la somme de"
  showBank: boolean;
  showSignature: boolean;
  footerNote: string;
};

export const defaultStyle = (): DocStyle => ({
  font: "sans",
  title: "",
  showLogo: true,
  showWords: true,
  showBank: true,
  showSignature: true,
  footerNote: "",
});

/** A template created by the user: a built-in layout plus colour and style choices. */
export type CustomTemplate = {
  id: string;
  name: string;
  base: TemplateId;
  accent: string;
  style: DocStyle;
  createdAt: string;
};

export const CUSTOM_PREFIX = "custom:";

/** Design fields a document takes from a custom template (lines and tax are never touched). */
export const designFrom = (c: CustomTemplate) => ({
  template: c.base,
  accent: c.accent,
  style: { ...c.style },
  customTemplateId: c.id,
});

type Designed = {
  template: TemplateId;
  accent: string;
  style?: DocStyle;
  customTemplateId?: string;
};

/** Dropdown value for a document: its custom template when it still exists, else its layout. */
export const templateValue = (doc: Designed, customs: CustomTemplate[]) =>
  doc.customTemplateId && customs.some((c) => c.id === doc.customTemplateId)
    ? CUSTOM_PREFIX + doc.customTemplateId
    : doc.template;

/** Applies a dropdown choice: a custom template brings its design, a built-in layout clears it. */
export function chooseTemplate<T extends Designed>(
  doc: T,
  value: string,
  customs: CustomTemplate[],
): T {
  if (value.startsWith(CUSTOM_PREFIX)) {
    const c = customs.find((x) => CUSTOM_PREFIX + x.id === value);
    return c ? { ...doc, ...designFrom(c) } : doc;
  }
  const { style: _s, customTemplateId: _c, ...rest } = doc;
  return { ...rest, template: value as TemplateId } as T;
}
