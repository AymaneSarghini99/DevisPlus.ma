import { describe, expect, it } from "vitest";
import { EXAMPLE_COMPANY, partyErrors } from "./store";
import { missingInvoiceMentions } from "./invoices";
import { emptyParty } from "./quotes";

describe("EXAMPLE_COMPANY", () => {
  it("passes the settings validation", () => {
    expect(partyErrors(EXAMPLE_COMPANY)).toEqual({});
    expect(EXAMPLE_COMPANY.rib.replace(/\s/g, "")).toHaveLength(24);
    expect(
      missingInvoiceMentions({ company: EXAMPLE_COMPANY, client: { ...emptyParty(), ice: "x" } }),
    ).toEqual([]);
  });
});

describe("VAT rates (2026 reform)", () => {
  it("replaces the untouched pre-2026 default list, but keeps a customised one", async () => {
    const { loadSettings } = await import("./store");
    localStorage.setItem(
      "devisplus.settings",
      JSON.stringify({ vatRates: [20, 14, 10, 7, 0], defaultVat: 14 }),
    );
    expect(loadSettings().vatRates).toEqual([20, 10, 0]);
    expect(loadSettings().defaultVat).toBe(20);
    localStorage.setItem(
      "devisplus.settings",
      JSON.stringify({ vatRates: [20, 14, 0], defaultVat: 14 }),
    );
    expect(loadSettings().vatRates).toEqual([20, 14, 0]);
    expect(loadSettings().defaultVat).toBe(14);
    localStorage.clear();
  });
});
