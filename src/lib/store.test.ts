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
