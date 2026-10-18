import { describe, expect, it } from "vitest";
import {
  chooseTemplate,
  defaultStyle,
  defaultWatermark,
  normalizeWatermark,
  templateValue,
  type CustomTemplate,
} from "./design";
import { invoiceFromQuote } from "./invoices";
import { newLine, newQuote, quoteTotals, withStatus } from "./quotes";
import { defaultSettings, quoteDefaults } from "./store";

const custom: CustomTemplate = {
  id: "t1",
  name: "Chantier",
  base: "marche",
  accent: "#0F766E",
  style: { ...defaultStyle(), font: "serif", title: "Proforma", showBank: false },
  createdAt: "2026-10-18T00:00:00Z",
};

describe("watermark", () => {
  it("keeps values inside their ranges", () => {
    expect(normalizeWatermark({ x: 140, y: -5, opacity: 3, size: 1, rotation: 200 })).toMatchObject(
      {
        x: 100,
        y: 0,
        opacity: 0.6,
        size: 10,
        rotation: 90,
      },
    );
  });
  it("is copied to new quotes only when enabled in the settings", () => {
    const s = defaultSettings();
    expect(newQuote([], quoteDefaults(s)).watermark).toBeUndefined();
    const on = { ...s, watermark: { ...defaultWatermark(), enabled: true, text: "COPIE" } };
    expect(newQuote([], quoteDefaults(on)).watermark).toMatchObject({
      enabled: true,
      text: "COPIE",
    });
  });
});

describe("custom templates", () => {
  it("apply layout, accent and style without touching lines or totals", () => {
    const q = { ...newQuote([]), lines: [{ ...newLine(), unitPrice: 100, vatRate: 14 }] };
    const styled = chooseTemplate(q, "custom:t1", [custom]);
    expect(styled).toMatchObject({ template: "marche", accent: "#0F766E", customTemplateId: "t1" });
    expect(styled.style?.title).toBe("Proforma");
    expect(styled.lines).toEqual(q.lines);
    expect(quoteTotals(styled)).toEqual(quoteTotals(q));
    expect(templateValue(styled, [custom])).toBe("custom:t1");
  });
  it("going back to a built-in layout clears the custom style", () => {
    const back = chooseTemplate(chooseTemplate(newQuote([]), "custom:t1", [custom]), "classic", [
      custom,
    ]);
    expect(back.template).toBe("classic");
    expect(back.style).toBeUndefined();
    expect(back.customTemplateId).toBeUndefined();
  });
  it("falls back to the layout when the custom template was deleted", () => {
    const styled = chooseTemplate(newQuote([]), "custom:t1", [custom]);
    expect(templateValue(styled, [])).toBe("marche");
  });
  it("is the default design for new quotes when chosen in the settings", () => {
    const s = { ...defaultSettings(), customTemplates: [custom], defaultCustom: "t1" };
    expect(newQuote([], quoteDefaults(s))).toMatchObject({
      template: "marche",
      customTemplateId: "t1",
    });
  });
  it("carries the design and watermark onto the invoice", () => {
    const q = withStatus(
      {
        ...chooseTemplate(newQuote([]), "custom:t1", [custom]),
        watermark: { ...defaultWatermark(), enabled: true },
      },
      "accepte",
    );
    const inv = invoiceFromQuote(q);
    expect(inv.style).toEqual(q.style);
    expect(inv.watermark).toEqual(q.watermark);
  });
});
