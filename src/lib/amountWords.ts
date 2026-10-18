/** Amounts in words for English and Arabic documents (French lives in quotes.ts). */

const cents = (amount: number) => {
  const c = Math.round(amount * 100);
  return { dh: Math.floor(c / 100), ct: c % 100 };
};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- English ----------
const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enBelow1000(n: number): string {
  const h = Math.floor(n / 100),
    r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} hundred`);
  if (r)
    parts.push(r < 20 ? ONES[r]! : TENS[Math.floor(r / 10)]! + (r % 10 ? "-" + ONES[r % 10]! : ""));
  return parts.join(" ");
}

export function numberToEnglish(n: number): string {
  n = Math.floor(n);
  if (n === 0) return "zero";
  const parts: string[] = [];
  for (const [v, name] of [
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ] as const) {
    const k = Math.floor(n / v);
    if (k) {
      parts.push(`${enBelow1000(k)} ${name}`);
      n %= v;
    }
  }
  if (n) parts.push(enBelow1000(n));
  return parts.join(" ");
}

export function amountInWordsEn(amount: number): string {
  const { dh, ct } = cents(amount);
  let s = `${numberToEnglish(dh)} ${dh === 1 ? "dirham" : "dirhams"}`;
  if (ct) s += ` and ${numberToEnglish(ct)} ${ct === 1 ? "centime" : "centimes"}`;
  return capitalize(s);
}

// ---------- Arabic (Modern Standard Arabic, masculine counted nouns) ----------
const AR_ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
];
const AR_TEENS: Record<number, string> = {
  11: "أحد عشر",
  12: "اثنا عشر",
  13: "ثلاثة عشر",
  14: "أربعة عشر",
  15: "خمسة عشر",
  16: "ستة عشر",
  17: "سبعة عشر",
  18: "ثمانية عشر",
  19: "تسعة عشر",
};
const AR_TENS = [
  "",
  "عشرة",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
];
const AR_HUNDREDS = [
  "",
  "مئة",
  "مئتان",
  "ثلاثمئة",
  "أربعمئة",
  "خمسمئة",
  "ستمئة",
  "سبعمئة",
  "ثمانمئة",
  "تسعمئة",
];

function arBelow100(n: number): string {
  if (n <= 10) return AR_ONES[n]!;
  if (n < 20) return AR_TEENS[n]!;
  const u = n % 10,
    t = Math.floor(n / 10);
  return u ? `${AR_ONES[u]} و${AR_TENS[t]}` : AR_TENS[t]!;
}

function arBelow1000(n: number): string {
  const h = Math.floor(n / 100),
    r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(AR_HUNDREDS[h]!);
  if (r) parts.push(arBelow100(r));
  return parts.join(" و");
}

/** [singular, dual, plural (3–10), accusative singular (11–99)] */
type Forms = readonly [string, string, string, string];

/** Count + noun with Arabic agreement: 1 → noun, 2 → dual, 3–10 → plural, 11–99 → accusative. */
function counted(n: number, f: Forms, oneSuffix = ""): string {
  if (n === 1) return f[0] + oneSuffix;
  if (n === 2) return f[1];
  const r = n % 100;
  const noun = r >= 3 && r <= 10 ? f[2] : r >= 11 ? f[3] : f[0];
  return `${arBelow1000Or(n)} ${noun}`;
}
const arBelow1000Or = (n: number) => (n < 1000 ? arBelow1000(n) : numberToArabic(n));

const THOUSAND: Forms = ["ألف", "ألفان", "آلاف", "ألفًا"];
const MILLION: Forms = ["مليون", "مليونان", "ملايين", "مليونًا"];
const BILLION: Forms = ["مليار", "ملياران", "مليارات", "مليارًا"];

export function numberToArabic(n: number): string {
  n = Math.floor(n);
  if (n === 0) return "صفر";
  const parts: string[] = [];
  for (const [v, forms] of [
    [1e9, BILLION],
    [1e6, MILLION],
    [1e3, THOUSAND],
  ] as const) {
    const k = Math.floor(n / v);
    if (k) {
      parts.push(counted(k, forms));
      n %= v;
    }
  }
  if (n) parts.push(arBelow1000(n));
  return parts.join(" و");
}

const DIRHAM: Forms = ["درهم", "درهمان", "دراهم", "درهمًا"];
const CENTIME: Forms = ["سنتيم", "سنتيمان", "سنتيمات", "سنتيمًا"];

export function amountInWordsAr(amount: number): string {
  const { dh, ct } = cents(amount);
  let s = dh === 0 ? "صفر درهم" : counted(dh, DIRHAM, " واحد");
  if (ct) s += ` و${counted(ct, CENTIME, " واحد")}`;
  return s;
}
