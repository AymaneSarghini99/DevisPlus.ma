/**
 * Document number formats (settings → "Numérotation"). The default keeps the historical numbers:
 * DV-2026-001 for quotes and FA-2026-001 for invoices.
 *
 * Tokens: {P} prefix, {YYYY} or {YY} year, {N} counter (zero-padded to `digits`). With a year in
 * the format the counter starts again each year; without one it keeps going.
 */
export const PATTERNS = [
  "{P}-{YYYY}-{N}",
  "{P}{YYYY}-{N}",
  "{P}/{YYYY}/{N}",
  "{P}-{YY}{N}",
  "{P}-{N}",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export type Numbering = {
  quotePrefix: string;
  invoicePrefix: string;
  pattern: Pattern;
  digits: number;
};
/**
 * Document kinds as stored in the app: "DV" quotes, "FA" invoices (down-payment invoices
 * included), "AV" credit notes, "PF" pro forma invoices, "BL" delivery notes. Only quotes and
 * invoices have a prefix in the settings; the others keep a fixed prefix.
 */
export type DocKind = "DV" | "FA" | "AV" | "PF" | "BL";

export const defaultNumbering = (): Numbering => ({
  quotePrefix: "DV",
  invoicePrefix: "FA",
  pattern: "{P}-{YYYY}-{N}",
  digits: 3,
});

const PREFIX = /^[A-Za-z0-9-]{1,8}$/;
export const validPrefix = (p: string) => PREFIX.test(p);

/** Settings value made safe (unknown pattern, bad prefix or digits → defaults). */
export function normalizeNumbering(n: Partial<Numbering> | undefined): Numbering {
  const d = defaultNumbering();
  const v = { ...d, ...n };
  return {
    quotePrefix: validPrefix(v.quotePrefix) ? v.quotePrefix : d.quotePrefix,
    invoicePrefix:
      validPrefix(v.invoicePrefix) && v.invoicePrefix !== v.quotePrefix
        ? v.invoicePrefix
        : d.invoicePrefix,
    pattern: (PATTERNS as readonly string[]).includes(v.pattern) ? v.pattern : d.pattern,
    digits: Number.isInteger(v.digits) && v.digits >= 2 && v.digits <= 6 ? v.digits : d.digits,
  };
}

export const prefixOf = (n: Numbering, kind: DocKind) =>
  kind === "FA" ? n.invoicePrefix : kind === "DV" ? n.quotePrefix : kind;
export const usesYear = (p: Pattern) => p.includes("{YY");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** The number for a counter value, e.g. DV-2026-008. */
export function formatNumber(n: Numbering, kind: DocKind, year: number, value: number) {
  return n.pattern
    .replace("{P}", prefixOf(n, kind))
    .replace("{YYYY}", String(year))
    .replace("{YY}", String(year % 100).padStart(2, "0"))
    .replace("{N}", String(value).padStart(n.digits, "0"));
}

/** Matches the numbers of this format (and year, when the format has one); group 1 = counter. */
function matcher(n: Numbering, kind: DocKind, year: number) {
  const parts = n.pattern.split(/(\{P\}|\{YYYY\}|\{YY\}|\{N\})/).filter(Boolean);
  const re = parts
    .map((x) =>
      x === "{P}"
        ? escape(prefixOf(n, kind))
        : x === "{YYYY}"
          ? String(year)
          : x === "{YY}"
            ? String(year % 100).padStart(2, "0")
            : x === "{N}"
              ? `(\\d{${n.digits},})`
              : escape(x),
    )
    .join("");
  return new RegExp(`^${re}$`);
}

/** Next number = highest existing counter of the same format (and year) + 1. */
export function nextInFormat(
  existing: { number: string }[],
  n: Numbering,
  kind: DocKind,
  year: number,
) {
  const re = matcher(n, kind, year);
  const max = existing.reduce((m, q) => {
    const x = re.exec(q.number);
    return x ? Math.max(m, +x[1]!) : m;
  }, 0);
  return formatNumber(n, kind, year, max + 1);
}

/** Fixed prefixes of credit notes, pro forma invoices and delivery notes. */
const RESERVED = ["AV", "PF", "BL"];

/** What is wrong with typed prefixes (translated under account.docs), or null. */
export function numberingError(n: Pick<Numbering, "quotePrefix" | "invoicePrefix">) {
  if (!validPrefix(n.quotePrefix) || !validPrefix(n.invoicePrefix)) return "invalidPrefix" as const;
  if (n.quotePrefix.toUpperCase() === n.invoicePrefix.toUpperCase()) return "samePrefix" as const;
  if ([n.quotePrefix, n.invoicePrefix].some((p) => RESERVED.includes(p.toUpperCase())))
    return "reservedPrefix" as const;
  return null;
}
