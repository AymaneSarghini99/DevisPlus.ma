import { describe, it, expect } from "vitest";
import { totals } from "./quotes";

describe("totals", () => {
  it("applies 20% TVA on HT", () => {
    expect(totals([{ id: "a", description: "", qty: 3, unitPrice: 1000 }], 20)).toEqual({ ht: 3000, tva: 600, ttc: 3600 });
  });
  it("rounds to centimes", () => {
    expect(totals([{ id: "a", description: "", qty: 1, unitPrice: 10.005 }], 20).ht).toBe(10.01);
  });
});
