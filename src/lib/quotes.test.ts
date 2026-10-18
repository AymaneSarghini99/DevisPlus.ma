import { beforeEach, describe, it, expect } from "vitest";
import { makeFormat } from "@/i18n/format";
import { tFor } from "@/i18n/index";
import {
  amountInWords,
  computeTotals,
  duplicateQuote,
  lineHT,
  loadQuotes,
  migrate,
  newLine,
  newQuote,
  nextNumber,
  quoteTotals,
  saveQuote,
  totals,
  waPhone,
  whatsappText,
  withStatus,
  type Line,
} from "./quotes";

const line = (p: Partial<Line>): Line => ({ ...newLine(), ...p });

describe("totals", () => {
  it("applies 20% TVA on HT", () => {
    expect(totals([{ id: "a", description: "", qty: 3, unitPrice: 1000 }], 20)).toEqual({
      ht: 3000,
      tva: 600,
      ttc: 3600,
    });
  });
  it("rounds to centimes", () => {
    expect(totals([{ id: "a", description: "", qty: 1, unitPrice: 10.005 }], 20).ht).toBe(10.01);
  });
});

describe("quoteTotals", () => {
  it("uses each line's own VAT rate on a new quote (no NaN)", () => {
    const q = newQuote([]);
    q.lines = [line({ qty: 3, unitPrice: 1000 })];
    expect(quoteTotals(q)).toMatchObject({ ht: 3000, tva: 600, ttc: 3600 });
  });
  it("keeps the original VAT of quotes saved by the first version", () => {
    const q = migrate({
      id: "x",
      number: "DV-2026-001",
      vatRate: 14,
      lines: [{ id: "a", description: "", qty: 1, unitPrice: 100 }],
    });
    expect(quoteTotals(q)).toMatchObject({ ht: 100, tva: 14, ttc: 114 });
    expect("vatRate" in q).toBe(false);
  });
  it("sums mixed VAT rates per line", () => {
    const q = newQuote([]);
    q.lines = [line({ unitPrice: 100, vatRate: 20 }), line({ unitPrice: 100, vatRate: 10 })];
    expect(quoteTotals(q)).toMatchObject({ ht: 200, tva: 30, ttc: 230 });
  });
});

describe("computeTotals", () => {
  it("applies line then global discounts before VAT, and the deposit on TTC", () => {
    const t = computeTotals([line({ qty: 2, unitPrice: 500, discount: 10 })], 5, 30);
    // 1000 − 10 % = 900, − 5 % = 855 HT, TVA 171, TTC 1026, acompte 307,80
    expect(t).toMatchObject({
      gross: 900,
      ht: 855,
      tva: 171,
      ttc: 1026,
      deposit: 307.8,
      balance: 718.2,
    });
    expect(t.discount).toBe(45);
  });
  it("does not drift with decimals", () => {
    const t = computeTotals([line({ qty: 3, unitPrice: 0.1 }), line({ qty: 1, unitPrice: 0.2 })]);
    expect(t.ht).toBe(0.5);
    expect(t.ttc).toBe(0.6);
  });
  it("clamps invalid percentages", () => {
    expect(lineHT({ qty: 1, unitPrice: 100, discount: 150 })).toBe(0);
    expect(computeTotals([line({ unitPrice: 100 })], -10).ht).toBe(100);
  });
  it("reports 0 % lines with their own base", () => {
    const t = computeTotals([
      line({ unitPrice: 100, vatRate: 0 }),
      line({ unitPrice: 50, vatRate: 20 }),
    ]);
    expect(t.byRate).toEqual([
      { rate: 20, base: 50, tva: 10 },
      { rate: 0, base: 100, tva: 0 },
    ]);
  });
});

describe("amountInWords", () => {
  it.each([
    [1, "Un dirham"],
    [21.5, "Vingt et un dirhams et cinquante centimes"],
    [80, "Quatre-vingts dirhams"],
    [80000, "Quatre-vingt mille dirhams"],
    [200000, "Deux cent mille dirhams"],
    [1026, "Mille vingt-six dirhams"],
    [1_000_000, "Un million de dirhams"],
    [71.01, "Soixante et onze dirhams et un centime"],
  ])("%s → %s", (n, words) => {
    expect(amountInWords(n)).toBe(words);
  });
});

describe("numbering, duplicate and status", () => {
  it("numbers after the highest existing sequence of the year", () => {
    expect(
      nextNumber(
        [{ number: "DV-2026-001" }, { number: "DV-2026-007" }, { number: "DV-2025-099" }],
        2026,
      ),
    ).toBe("DV-2026-008");
  });
  it("duplicates as a new draft with the same lines and tax", () => {
    const q = withStatus(
      {
        ...newQuote([]),
        lines: [line({ unitPrice: 80, vatRate: 7, discount: 5 })],
        globalDiscount: 3,
      },
      "envoye",
    );
    const d = duplicateQuote({ ...q, status: "accepte" }, [q]);
    expect(d.id).not.toBe(q.id);
    expect(d.number).not.toBe(q.number);
    expect(d.status).toBe("brouillon");
    expect(d.sentAt).toBe("");
    expect(d.lines[0]).toMatchObject({ unitPrice: 80, vatRate: 7, discount: 5 });
    expect(d.lines[0]!.id).not.toBe(q.lines[0]!.id);
    expect(quoteTotals(d)).toEqual(quoteTotals(q));
  });
  it("records the first sending date only once", () => {
    const sent = withStatus(newQuote([]), "envoye");
    expect(sent.sentAt).not.toBe("");
    expect(withStatus({ ...sent, sentAt: "2026-01-01" }, "envoye").sentAt).toBe("2026-01-01");
  });
});

describe("persistence", () => {
  beforeEach(() => localStorage.clear());
  it("never saves two quotes with the same number", () => {
    const a = saveQuote(newQuote([]));
    const b = saveQuote({ ...newQuote([]), number: a.number });
    expect(b.number).not.toBe(a.number);
    expect(new Set(loadQuotes().map((q) => q.number)).size).toBe(2);
  });
});

describe("WhatsApp", () => {
  it("normalises Moroccan phone numbers", () => {
    expect(waPhone("06 12 34 56 78")).toBe("212612345678");
    expect(waPhone("+212 6 12 34 56 78")).toBe("212612345678");
    expect(waPhone("00212612345678")).toBe("212612345678");
  });
  it("mentions client, number and total", () => {
    const q = { ...newQuote([]), lines: [line({ unitPrice: 1000 })] };
    q.client.name = "Atlas SARL";
    const text = whatsappText(q, tFor("fr"), makeFormat("fr"));
    expect(text).toContain("Atlas SARL");
    expect(text).toContain(q.number);
    expect(text).toMatch(/1\u00a0200,00\u00a0DH TTC/);
  });
});
