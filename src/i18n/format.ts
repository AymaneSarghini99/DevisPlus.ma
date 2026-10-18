import { INTL_TAG, type Locale } from "./config";

/** Display-only formatting. Amounts are always computed on numbers, never on these strings. */
export type Format = {
  locale: Locale;
  money: (n: number) => string;
  number: (n: number) => string;
  percent: (n: number) => string;
  date: (iso: string) => string;
  pickerDate: (d: Date) => string;
  monthShort: (yyyyMm: string) => string;
  monthLong: (yyyyMm: string) => string;
};

const cache = new Map<Locale, Format>();

export function makeFormat(locale: Locale): Format {
  const hit = cache.get(locale);
  if (hit) return hit;
  const tag = INTL_TAG[locale];
  const amount = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const qty = new Intl.NumberFormat(tag, { maximumFractionDigits: 3 });
  const dayMonthYear =
    locale === "fr"
      ? new Intl.DateTimeFormat(tag, { day: "2-digit", month: "2-digit", year: "numeric" })
      : new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" });
  const monthShort = new Intl.DateTimeFormat(tag, { month: "short" });
  const monthLong = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" });
  const pickerDate = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // Non-breaking spaces keep an amount and its currency on one line.
  const nb = (s: string) => s.replace(/[\s\u202f]/g, "\u00a0");
  const toDate = (iso: string) => new Date(iso.length === 10 ? iso + "T12:00:00" : iso);

  const f: Format = {
    locale,
    /** 1 234,50 DH · MAD 1,234.50 · 1.234,50 درهم */
    money: (n: number) => {
      const s = nb(amount.format(n));
      return locale === "en"
        ? `MAD\u00a0${s}`
        : locale === "ar"
          ? `${s}\u00a0درهم`
          : `${s}\u00a0DH`;
    },
    number: (n: number) => nb(qty.format(n)),
    /** 20 % in French (with a space), 20% in English and Arabic. */
    percent: (n: number) => `${nb(qty.format(Number(n) || 0))}${locale === "fr" ? "\u00a0%" : "%"}`,
    date: (iso: string) => (iso ? dayMonthYear.format(toDate(iso)) : "—"),
    pickerDate: (d: Date) => pickerDate.format(d),
    monthShort: (yyyyMm: string) => monthShort.format(toDate(yyyyMm + "-15")).replace(".", ""),
    monthLong: (yyyyMm: string) => monthLong.format(toDate(yyyyMm + "-15")),
  };
  cache.set(locale, f);
  return f;
}
