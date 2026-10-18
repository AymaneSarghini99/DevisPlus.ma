import { describe, expect, it } from "vitest";
import { dirOf, localeFromCookie, localeCookieValue, LOCALES } from "./config";
import { makeFormat } from "./format";
import { RESOURCES, tFor } from "./index";
import { amountInWords, computeTotals, newLine, type Line } from "@/lib/quotes";
import { amountInWordsAr, amountInWordsEn } from "@/lib/amountWords";

type Tree = { [k: string]: string | Tree };
const PLURAL = /_(zero|one|two|few|many|other)$/;
/** Flattened keys → value, with plural suffixes folded into one base key. */
function flatten(o: Tree, prefix = "", out = new Map<string, string[]>()) {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix + k.replace(PLURAL, "");
    if (typeof v === "string") out.set(key, [...(out.get(key) ?? []), v]);
    else flatten(v, key + ".", out);
  }
  return out;
}
const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe("translation dictionaries (missing-translation audit)", () => {
  const ref = flatten(RESOURCES.fr as unknown as Tree);
  for (const l of ["en", "ar"] as const) {
    const dict = flatten(RESOURCES[l] as unknown as Tree);
    it(`${l} has exactly the French keys`, () => {
      expect([...ref.keys()].filter((k) => !dict.has(k))).toEqual([]);
      expect([...dict.keys()].filter((k) => !ref.has(k))).toEqual([]);
    });
    it(`${l} keeps the same {{variables}} and has no empty strings`, () => {
      for (const [k, values] of dict) {
        const expected = new Set(ref.get(k)!.flatMap(vars));
        for (const v of values) {
          expect(v.trim(), k).not.toBe("");
          // every variable used must exist in French (Arabic plural forms may omit {{count}})
          for (const x of vars(v)) expect(expected.has(x), `${k}: {{${x}}}`).toBe(true);
        }
      }
    });
  }
  it("Arabic strings are actually Arabic (except brand names and identifiers)", () => {
    const allowedLatin =
      /^(?:[A-Z]{2,4}|DevisPlus\.ma.*|© 2026 DevisPlus\.ma|PDF.*|m[²³]|Casablanca|clients|quotes|invoices|payments|mycompany|—|, |: |RIB.*)$/;
    const offenders = [...flatten(RESOURCES.ar as unknown as Tree)]
      .flatMap(([k, vs]) => vs.map((v) => [k, v] as const))
      .filter(([, v]) => !/[؀-ۿ]/.test(v) && !allowedLatin.test(v));
    expect(offenders).toEqual([]);
  });
  it("Arabic uses the six plural forms where counts are shown", () => {
    const t = tFor("ar");
    expect(t("followups.sentDaysAgo", { count: 2 })).toBe("أُرسل منذ يومين");
    expect(t("followups.sentDaysAgo", { count: 5 })).toBe("أُرسل منذ 5 أيام");
    expect(t("followups.sentDaysAgo", { count: 11 })).toBe("أُرسل منذ 11 يومًا");
    expect(tFor("en")("followups.sentDaysAgo", { count: 1 })).toBe("sent 1 day ago");
  });
});

describe("language preference", () => {
  it("defaults to French and reads the cookie", () => {
    expect(localeFromCookie("")).toBe("fr");
    expect(localeFromCookie("a=1; devisplus.lang=ar; b=2")).toBe("ar");
    expect(localeFromCookie("devisplus.lang=xx")).toBe("fr");
    expect(localeCookieValue("en")).toMatch(
      /^devisplus\.lang=en; Path=\/; Max-Age=\d+; SameSite=Lax$/,
    );
  });
  it("maps languages to direction", () => {
    expect(LOCALES.map((l) => dirOf(l))).toEqual(["ltr", "ltr", "rtl"]);
  });
});

describe("formatting policy", () => {
  const fr = makeFormat("fr"),
    en = makeFormat("en"),
    ar = makeFormat("ar");
  const nb = (s: string) => s.replace(/\u00a0/g, " ");
  it("money", () => {
    expect(nb(fr.money(1234.5))).toBe("1 234,50 DH");
    expect(nb(en.money(1234.5))).toBe("MAD 1,234.50");
    expect(nb(ar.money(1234.5))).toBe("1.234,50 درهم");
  });
  it("uses Western digits only, also in Arabic", () => {
    const s = ar.money(9876543.21) + ar.date("2026-10-18") + ar.percent(20);
    expect(s).not.toMatch(/[٠-٩۰-۹]/);
    expect(s).not.toMatch(/[‎‏]/); // no hidden direction marks inside values
  });
  it("dates and percentages", () => {
    expect(fr.date("2026-10-18")).toBe("18/10/2026");
    expect(en.date("2026-10-18")).toBe("18 Oct 2026");
    expect(ar.date("2026-10-18")).toBe("18 أكتوبر 2026");
    expect(nb(fr.percent(20))).toBe("20 %");
    expect(en.percent(7)).toBe("7%");
  });
});

describe("amounts in words", () => {
  it.each([
    [1, "Un dirham", "One dirham", "درهم واحد"],
    [2, "Deux dirhams", "Two dirhams", "درهمان"],
    [5, "Cinq dirhams", "Five dirhams", "خمسة دراهم"],
    [11, "Onze dirhams", "Eleven dirhams", "أحد عشر درهمًا"],
    [100, "Cent dirhams", "One hundred dirhams", "مئة درهم"],
    [1000, "Mille dirhams", "One thousand dirhams", "ألف درهم"],
    [3000, "Trois mille dirhams", "Three thousand dirhams", "ثلاثة آلاف درهم"],
    [
      4301.6,
      "Quatre mille trois cent un dirhams et soixante centimes",
      "Four thousand three hundred one dirhams and sixty centimes",
      "أربعة آلاف وثلاثمئة وواحد درهم وستون سنتيمًا",
    ],
    [
      21.5,
      "Vingt et un dirhams et cinquante centimes",
      "Twenty-one dirhams and fifty centimes",
      "واحد وعشرون درهمًا وخمسون سنتيمًا",
    ],
  ])("%s", (n, f, e, a) => {
    expect(amountInWords(n, "fr")).toBe(f);
    expect(amountInWordsEn(n)).toBe(e);
    expect(amountInWordsAr(n)).toBe(a);
  });
});

describe("calculations do not depend on the language", () => {
  it("same totals whatever the interface or document language", () => {
    const lines: Line[] = [
      { ...newLine(), qty: 3, unitPrice: 99.99, discount: 7.5, vatRate: 20 },
      { ...newLine(), qty: 1, unitPrice: 1000, vatRate: 0 },
    ];
    const a = computeTotals(lines, 5, 30);
    for (const l of LOCALES) {
      makeFormat(l); // formatting is display-only
      expect(computeTotals(lines, 5, 30)).toEqual(a);
    }
  });
});
