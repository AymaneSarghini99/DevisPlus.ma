import { describe, expect, it } from "vitest";
import {
  creditNoteFromInvoice,
  deliveryNoteFromQuote,
  depositInvoiceFromQuote,
  dueOf,
  invoiceFromQuote,
  invoiceTotals,
  issueInvoice,
  paymentError,
  proformaFromQuote,
  type DocLabels,
  type Invoice,
} from "./invoices";
import { numberingError } from "./numbering";
import { darijaReminderText, duplicateQuote, newLine, newQuote, withStatus } from "./quotes";
import { journalDocs, journalVat, salesJournalCsv } from "./reports";
import { tFor } from "@/i18n/index";

const labels: DocLabels = {
  deposit: (pct, quote, rate) => `Acompte ${pct} % ${quote} TVA ${rate}`,
  deduction: (inv, rate) => `Déduction ${inv} TVA ${rate}`,
};

/** Accepted quote: 1 000 HT at 20 % and 500 HT at 10 %, 30 % deposit. */
function quote() {
  const q = newQuote([]);
  q.number = "DV-2026-001";
  q.client.name = "Atlas SARL";
  q.deposit = 30;
  q.lines = [
    { ...newLine(), description: "Pose", qty: 10, unitPrice: 100, vatRate: 20 },
    { ...newLine(), description: "Matériel", qty: 1, unitPrice: 500, vatRate: 10 },
  ];
  return withStatus(q, "accepte");
}
const issue = (inv: Invoice, all: Invoice[]) =>
  issueInvoice({ ...inv, issueDate: "2026-10-29" }, all);

describe("down-payment and final invoices", () => {
  it("invoices the deposit per VAT rate, then deducts it from the final invoice", () => {
    const q = quote();
    const dep = issue(depositInvoiceFromQuote(q, 30, labels), []);
    expect(dep.number).toBe("FA-2026-001");
    expect(dep.depositPct).toBe(30);
    expect(dep.lines.map((l) => [l.vatRate, l.unitPrice])).toEqual([
      [20, 300],
      [10, 150],
    ]);
    const final = issue(invoiceFromQuote(q, [dep], labels), [dep]);
    expect(final.number).toBe("FA-2026-002");
    const t = invoiceTotals(final);
    // 1 500 HT − 450 HT already invoiced; VAT 140 + 35 = 175, only once overall.
    expect(t.ht).toBe(1050);
    expect(t.tva).toBe(175);
    expect(invoiceTotals(dep).tva + t.tva).toBe(250);
  });
});

describe("retention guarantee", () => {
  it("is withheld on the TTC and lowers what is due now", () => {
    const inv = { ...invoiceFromQuote(quote()), retention: 10 };
    const t = invoiceTotals(inv);
    expect(t.ttc).toBe(1750);
    expect(t.retention).toBe(175);
    expect(t.outstanding).toBe(1575);
  });
});

describe("credit notes", () => {
  it("are numbered AV, never exceed the invoice and reduce what is due", () => {
    const inv = issue(invoiceFromQuote(quote()), []);
    expect(() => creditNoteFromInvoice({ ...inv, status: "brouillon" })).toThrow();
    const note = creditNoteFromInvoice(inv);
    expect(note).toMatchObject({
      kind: "avoir",
      relatedInvoiceId: inv.id,
      relatedNumber: inv.number,
    });
    const partial = { ...note, lines: [note.lines[0]!] }; // 1 000 HT + 200 VAT
    const issued = issue(partial, [inv]);
    expect(issued.number).toBe("AV-2026-001");
    expect(dueOf(inv, [inv, issued])).toBe(550);
    // The rest can be credited, not more.
    const second = creditNoteFromInvoice(inv);
    expect(() => issue(second, [inv, issued])).toThrow();
    expect(paymentError(issued, { amount: 10, date: "2026-10-29" })).toBe("paymentDraft");
  });
});

describe("pro formas and delivery notes", () => {
  it("have their own numbers and no accounting value", () => {
    const q = withStatus(quote(), "envoye");
    const pf = issue(proformaFromQuote(q), []);
    const bl = issue(deliveryNoteFromQuote(q), [pf]);
    expect([pf.number, bl.number]).toEqual(["PF-2026-001", "BL-2026-001"]);
    expect(journalDocs([pf, bl], "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("sales journal", () => {
  it("lists invoices and credit notes by VAT rate, credit notes negative", () => {
    const inv = issue(invoiceFromQuote(quote()), []);
    const note = issue({ ...creditNoteFromInvoice(inv), lines: [inv.lines[1]!] }, [inv]);
    const docs = journalDocs([note, inv], "2026-10-01", "2026-10-31");
    expect(docs.map((d) => d.number)).toEqual(["AV-2026-001", "FA-2026-001"]);
    expect(journalVat(docs)).toBe(200);
    const csv = salesJournalCsv([inv, note], "2026-10-01", "2026-10-31", tFor("fr"), "fr");
    const rows = csv.replace("﻿", "").split("\r\n");
    expect(rows[0]).toContain("HT 20 %;TVA 20 %;HT 10 %;TVA 10 %");
    expect(rows[1]).toContain("AV-2026-001;Avoir;Atlas SARL;;0,00;0,00;-500,00;-50,00");
    expect(rows[2]).toContain("FA-2026-001;Facture;Atlas SARL;;1000,00;200,00;500,00;50,00");
  });
});

describe("other notes", () => {
  it("reserves the AV, PF and BL prefixes", () => {
    expect(numberingError({ quotePrefix: "DV", invoicePrefix: "AV" })).toBe("reservedPrefix");
    expect(numberingError({ quotePrefix: "DV", invoicePrefix: "FA" })).toBeNull();
  });

  it("a duplicated quote gets no link and no acceptance", () => {
    const q = { ...quote(), shareToken: "a".repeat(24), acceptedBy: "Karim", acceptedAt: "x" };
    const copy = duplicateQuote(q, [q]);
    expect(copy.shareToken).toBeUndefined();
    expect(copy.acceptedBy).toBeUndefined();
  });

  it("writes reminders in Darija, Latin or Arabic script", () => {
    const q = { ...quote(), validUntil: "2026-11-30" };
    q.client.contact = "Karim";
    expect(darijaReminderText(q, "latin")).toMatch(/^Salam Karim,[\s\S]*DV-2026-001/);
    expect(darijaReminderText(q, "arabic")).toMatch(/^السلام Karim،[\s\S]*DV-2026-001/);
  });
});
