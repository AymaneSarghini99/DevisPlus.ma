import { describe, expect, it } from "vitest";
import {
  defaultNumbering,
  formatNumber,
  nextInFormat,
  normalizeNumbering,
  numberingError,
} from "./numbering";
import { nextNumber } from "./quotes";

describe("document numbering formats", () => {
  const d = defaultNumbering();

  it("keeps the historical numbers by default", () => {
    expect(formatNumber(d, "DV", 2026, 8)).toBe("DV-2026-008");
    expect(formatNumber(d, "FA", 2026, 12)).toBe("FA-2026-012");
    expect(nextNumber([{ number: "FA-2026-004" }], 2026, "FA", d)).toBe("FA-2026-005");
  });

  it("follows the chosen prefix, pattern and digits", () => {
    const n = { ...d, quotePrefix: "DEV", pattern: "{P}/{YYYY}/{N}" as const, digits: 4 };
    expect(
      nextInFormat([{ number: "DEV/2026/0041" }, { number: "DV-2026-099" }], n, "DV", 2026),
    ).toBe("DEV/2026/0042");
    const yy = { ...d, pattern: "{P}-{YY}{N}" as const };
    expect(nextInFormat([{ number: "DV-26007" }], yy, "DV", 2026)).toBe("DV-26008");
  });

  it("restarts each year only when the format shows the year", () => {
    expect(nextInFormat([{ number: "DV-2025-040" }], d, "DV", 2026)).toBe("DV-2026-001");
    const noYear = { ...d, pattern: "{P}-{N}" as const };
    expect(nextInFormat([{ number: "DV-040" }], noYear, "DV", 2027)).toBe("DV-041");
  });

  it("refuses bad or identical prefixes and repairs saved values", () => {
    expect(numberingError({ quotePrefix: "DV", invoicePrefix: "FA" })).toBeNull();
    expect(numberingError({ quotePrefix: "D V", invoicePrefix: "FA" })).toBe("invalidPrefix");
    expect(numberingError({ quotePrefix: "", invoicePrefix: "FA" })).toBe("invalidPrefix");
    expect(numberingError({ quotePrefix: "DV", invoicePrefix: "dv" })).toBe("samePrefix");
    expect(normalizeNumbering({ pattern: "x" as never, digits: 40, quotePrefix: "a/b" })).toEqual(
      d,
    );
  });
});
