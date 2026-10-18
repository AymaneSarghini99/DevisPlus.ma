import { describe, expect, it } from "vitest";
import { invoiceFromQuote, issueInvoice } from "./invoices";
import { newLine, newQuote, withStatus, type Quote } from "./quotes";
import { lastMonths, quotesCsv, report, toCsv } from "./reports";

const quote = (issueDate: string, status: Quote["status"], price: number): Quote => ({
  ...withStatus(newQuote([]), status),
  issueDate,
  client: { ...newQuote([]).client, name: "Atlas SARL" },
  lines: [{ ...newLine(), description: "x", unitPrice: price }],
});

describe("csv", () => {
  it("uses ; and decimal commas, quotes special cells and neutralises formulas", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        ["x;y", 1234.5],
        ["=HYPERLINK()", 'say "hi"'],
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"x;y";1234,50');
    expect(csv).toContain("'=HYPERLINK()");
    expect(csv).toContain('"say ""hi"""');
  });
  it("exports one row per quote with real totals", () => {
    const rows = quotesCsv([quote("2026-10-01", "accepte", 100)]).split("\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain(";100,00;20,00;120,00;");
  });
});

describe("report", () => {
  it("lists the last 12 months ending with the reference month", () => {
    const m = lastMonths("2026-02-10");
    expect(m[0]).toBe("2025-03");
    expect(m.at(-1)).toBe("2026-02");
  });

  it("counts only saved data and keeps quotes apart from invoiced revenue", () => {
    const a = quote("2026-10-02", "accepte", 1000);
    const quotes = [a, quote("2026-10-05", "refuse", 500), quote("2026-09-10", "envoye", 200)];
    const draft = invoiceFromQuote(a);
    const issued = issueInvoice(invoiceFromQuote(a), []);
    issued.payments = [
      { id: "p", date: "2026-10-10", amount: 400, method: "virement", reference: "", note: "" },
    ];
    const r = report(quotes, [draft, issued], "2026-10-18");

    expect(r.months.at(-1)).toEqual({ month: "2026-10", count: 2, ttc: 1800 });
    expect(r.months.at(-2)).toMatchObject({ month: "2026-09", count: 1 });
    expect(r.quotes).toMatchObject({ count: 3, quotedTtc: 2040, acceptanceRate: 0.5 });
    expect(r.invoices).toEqual({
      issued: 1,
      drafts: 1,
      issuedTtc: 1200,
      received: 400,
      outstanding: 800,
    });
  });

  it("has no acceptance rate without decided quotes", () => {
    expect(report([], [], "2026-10-18").quotes.acceptanceRate).toBeNull();
  });
});
