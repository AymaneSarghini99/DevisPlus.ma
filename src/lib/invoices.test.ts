import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteDraftInvoice,
  invoiceFromQuote,
  invoiceTotals,
  issueInvoice,
  loadInvoices,
  paymentError,
  saveInvoice,
  type Invoice,
} from "./invoices";
import { newLine, newQuote, quoteTotals, withStatus, type Quote } from "./quotes";

function accepted(): Quote {
  const q = newQuote([]);
  q.client.name = "Atlas SARL";
  q.clientId = "c1";
  q.lines = [
    { ...newLine(), description: "Pose", qty: 10, unitPrice: 100, discount: 10, vatRate: 20 },
    { ...newLine(), description: "Formation", qty: 1, unitPrice: 500, vatRate: 0 },
  ];
  q.globalDiscount = 5;
  q.exemptionNote = "Exonéré";
  return withStatus(q, "accepte");
}

describe("invoiceFromQuote", () => {
  it("refuses a quote that is not accepted", () => {
    expect(() => invoiceFromQuote({ ...accepted(), status: "envoye" })).toThrow();
  });

  it("creates an unnumbered draft that carries client, lines, discounts and tax", () => {
    const q = accepted();
    const snapshot = structuredClone(q);
    const inv = invoiceFromQuote(q);
    expect(inv).toMatchObject({
      status: "brouillon",
      number: "",
      quoteId: q.id,
      quoteNumber: q.number,
      clientId: "c1",
      globalDiscount: 5,
      exemptionNote: "Exonéré",
    });
    expect(inv.client).toEqual(q.client);
    expect(inv.lines.map((l) => [l.qty, l.unitPrice, l.discount, l.vatRate])).toEqual(
      q.lines.map((l) => [l.qty, l.unitPrice, l.discount, l.vatRate]),
    );
    expect(invoiceTotals(inv).ttc).toBe(quoteTotals({ ...q, deposit: 0 }).ttc);
    expect(q).toEqual(snapshot); // original quote untouched
  });
});

describe("issueInvoice", () => {
  it("assigns a separate FA number among issued invoices only", () => {
    const a = issueInvoice({ ...invoiceFromQuote(accepted()), issueDate: "2026-03-01" }, []);
    const draft = invoiceFromQuote(accepted());
    const b = issueInvoice({ ...invoiceFromQuote(accepted()), issueDate: "2026-04-01" }, [
      a,
      draft,
    ]);
    expect(a.number).toBe("FA-2026-001");
    expect(b.number).toBe("FA-2026-002");
    expect(b.status).toBe("emise");
    expect(b.issuedAt).not.toBe("");
  });
  it("cannot issue twice", () => {
    const a = issueInvoice(invoiceFromQuote(accepted()), []);
    expect(() => issueInvoice(a, [a])).toThrow();
  });
});

describe("payments", () => {
  let inv: Invoice;
  beforeEach(() => {
    inv = issueInvoice(invoiceFromQuote(accepted()), []);
  });
  it("tracks paid and outstanding amounts in centimes", () => {
    const ttc = invoiceTotals(inv).ttc;
    const paid = {
      ...inv,
      payments: [
        {
          id: "p",
          date: "2026-05-01",
          amount: 0.1,
          method: "especes" as const,
          reference: "",
          note: "",
        },
        {
          id: "q",
          date: "2026-05-02",
          amount: 0.2,
          method: "especes" as const,
          reference: "",
          note: "",
        },
      ],
    };
    expect(invoiceTotals(paid).paid).toBe(0.3);
    expect(invoiceTotals(paid).outstanding).toBe(Math.round((ttc - 0.3) * 100) / 100);
  });
  it("rejects payments on drafts, zero amounts and overpayments", () => {
    expect(paymentError(invoiceFromQuote(accepted()), { amount: 10, date: "2026-05-01" })).toBe(
      "paymentDraft",
    );
    expect(paymentError(inv, { amount: 0, date: "2026-05-01" })).toBe("paymentAmount");
    expect(paymentError(inv, { amount: invoiceTotals(inv).ttc + 0.01, date: "2026-05-01" })).toBe(
      "paymentTooHigh",
    );
    expect(paymentError(inv, { amount: invoiceTotals(inv).ttc, date: "2026-05-01" })).toBeNull();
  });
});

describe("persistence", () => {
  beforeEach(() => localStorage.clear());
  it("deletes drafts but never issued invoices", () => {
    const draft = invoiceFromQuote(accepted());
    const issued = issueInvoice(invoiceFromQuote(accepted()), []);
    saveInvoice(draft);
    saveInvoice(issued);
    expect(() => deleteDraftInvoice(issued.id)).toThrow();
    deleteDraftInvoice(draft.id);
    expect(loadInvoices().map((i) => i.id)).toEqual([issued.id]);
  });
});
