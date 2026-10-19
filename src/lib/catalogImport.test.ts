import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  guessMapping,
  mergeCatalog,
  parseCsv,
  parsePrice,
  parseUnit,
  parseVat,
  parseXlsx,
  readSheet,
  rowsToItems,
  TEMPLATE_CSV,
} from "./catalogImport";
import type { CatalogItem } from "./store";

const DEFAULTS = { unit: "pièce" as const, vatRate: 20, vatRates: [20, 10, 0] };

/** Minimal zip writer (deflate) to build .xlsx files for the tests. */
function zip(files: Record<string, string>): ArrayBuffer {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const n = enc.encode(name);
    const raw = enc.encode(text);
    const data = new Uint8Array(deflateRawSync(raw));
    const local = new Uint8Array(30 + n.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, n.length, true);
    local.set(n, 30);
    const central = new Uint8Array(46 + n.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, offset, true);
    central.set(n, 46);
    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const cdSize = centrals.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out.buffer;
}

const XLSX = {
  "xl/workbook.xml":
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Articles" sheetId="1" r:id="rId1"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels":
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  "xl/sharedStrings.xml":
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Désignation</t></si><si><t>Prix HT</t></si><si><t>TVA</t></si><si><t>Peinture</t></si><si><r><t>Enduit </t></r><r><t>fin</t></r></si></sst>',
  "xl/worksheets/sheet1.xml":
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>45.5</v></c><c r="C2"><v>0.2</v></c></row>' +
    '<row r="3"><c r="A3" t="s"><v>4</v></c><c r="C3"><v>0.1</v></c></row>' +
    "</sheetData></worksheet>",
};

describe("catalogue import", () => {
  it("reads CSV written by Excel in French (semicolons, quotes, BOM)", () => {
    const rows = parseCsv('﻿Nom;Prix\r\n"Pose; dépose";"1 500,00"\r\n"Dit ""fin""";12\r\n');
    expect(rows).toEqual([
      ["Nom", "Prix"],
      ["Pose; dépose", "1 500,00"],
      ['Dit "fin"', "12"],
    ]);
    expect(parseCsv("a,b\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("reads prices in Moroccan, French and English formats", () => {
    expect(parsePrice("1 500,50 DH")).toBe(1500.5);
    expect(parsePrice("1.500,50")).toBe(1500.5);
    expect(parsePrice("1,500.50")).toBe(1500.5);
    expect(parsePrice("1,500")).toBe(1500);
    expect(parsePrice("12,5")).toBe(12.5);
    expect(parsePrice("180.49")).toBe(180.49);
    expect(parsePrice("MAD")).toBeNaN();
  });

  it("recognises units, VAT rates written in several ways", () => {
    expect(parseUnit("M2")).toBe("m²");
    expect(parseUnit("m ²")).toBe("m²");
    expect(parseUnit("Pce")).toBe("pièce");
    expect(parseUnit("H")).toBe("heure");
    expect(parseUnit("Ens")).toBe("forfait");
    expect(parseUnit("barrique")).toBeUndefined();
    expect(parseVat("20 %")).toBe(20);
    expect(parseVat("0,1")).toBe(10);
    expect(parseVat("0.2")).toBe(20);
    expect(parseVat("")).toBeNaN();
  });

  it("matches columns from French, English and Arabic headers", () => {
    expect(guessMapping(["Désignation", "Unité", "P.U. HT", "TVA", "Description"])).toEqual({
      name: 0,
      price: 2,
      vat: 3,
      unit: 1,
      description: 4,
      kind: -1,
    });
    const en = guessMapping(["Product", "Unit price", "Tax"]);
    expect([en.name, en.price, en.vat, en.unit]).toEqual([0, 1, 2, -1]);
    expect(guessMapping(["الاسم", "السعر"]).price).toBe(1);
    // Unknown headers: the first column is taken as the name.
    expect(guessMapping(["Col1", "Col2"]).name).toBe(0);
  });

  it("turns rows into items, skipping rows without a name or with a bad price", () => {
    const sheet = {
      headers: ["Nom", "Unité", "Prix", "TVA", "Nature"],
      rows: [
        ["Carrelage", "m2", "180,50", "20", "Matériaux"],
        ["", "u", "10", "20", ""],
        ["Pose", "forfait", "abc", "20", "Main-d'œuvre"],
        ["Transport", "voyage", "300", "14", ""],
      ],
    };
    const r = rowsToItems(sheet, guessMapping(sheet.headers), DEFAULTS);
    expect(r.items.map((i) => [i.name, i.unit, i.unitPrice, i.vatRate, i.kind])).toEqual([
      ["Carrelage", "m²", 180.5, 20, "materiel"],
      ["Transport", "pièce", 300, 20, undefined],
    ]);
    expect(r.skipped).toEqual([
      { row: 3, reason: "name" },
      { row: 4, reason: "price" },
    ]);
    expect(r.defaulted).toBe(1);
  });

  it("updates items with the same name, or adds them as new ones", () => {
    const old: CatalogItem = {
      id: "keep",
      name: "Peinture",
      description: "",
      unit: "m²",
      unitPrice: 30,
      vatRate: 20,
    };
    const incoming = [
      { ...old, id: "x", name: "peinture ", unitPrice: 35 },
      { ...old, id: "y", name: "Enduit" },
    ];
    // Names are compared ignoring case and spaces at the ends.
    incoming[0]!.name = "PEINTURE";
    const up = mergeCatalog([old], incoming, true);
    expect(up.items.map((i) => [i.id, i.unitPrice])).toEqual([
      ["keep", 35],
      ["y", 30],
    ]);
    expect([up.added, up.updated]).toEqual([1, 1]);
    // A file with only names and prices keeps the saved unit and VAT of existing items.
    const priceOnly = mergeCatalog(
      [old],
      [{ ...old, id: "z", unit: "pièce", vatRate: 10, unitPrice: 40 }],
      true,
      { name: 0, price: 1, description: -1, unit: -1, vat: -1, kind: -1 },
    );
    expect(priceOnly.items[0]).toMatchObject({
      id: "keep",
      unit: "m²",
      vatRate: 20,
      unitPrice: 40,
    });
    const dup = mergeCatalog([old], incoming, false);
    expect([dup.items.length, dup.added, dup.updated]).toEqual([3, 2, 0]);
  });

  it("reads the first sheet of an .xlsx file", async () => {
    const rows = await parseXlsx(zip(XLSX));
    expect(rows).toEqual([
      ["Désignation", "Prix HT", "TVA"],
      ["Peinture", "45.5", "0.2"],
      ["Enduit fin", "", "0.1"],
    ]);
    const sheet = await readSheet(new File([zip(XLSX)], "articles.xlsx"));
    const items = rowsToItems(sheet, guessMapping(sheet.headers), DEFAULTS).items;
    expect(items.map((i) => [i.name, i.unitPrice, i.vatRate])).toEqual([
      ["Peinture", 45.5, 20],
      ["Enduit fin", 0, 10],
    ]);
  });

  it("refuses old .xls files and reads the template", async () => {
    await expect(readSheet(new File(["x"], "a.xls"))).rejects.toThrow("xls");
    const sheet = await readSheet(new File([TEMPLATE_CSV], "modele.csv"));
    const r = rowsToItems(sheet, guessMapping(sheet.headers), DEFAULTS);
    expect(r.items).toHaveLength(3);
    expect(r.skipped).toHaveLength(0);
    expect(r.items[2]).toMatchObject({ unit: "m²", unitPrice: 180.5, kind: "materiel" });
  });

  it("reads CSV saved by Excel on Windows (not UTF-8)", async () => {
    const latin1 = new Uint8Array([
      ...Buffer.from("Nom;Prix\nC", "latin1"),
      0xe2,
      0x62,
      0x6c,
      0x65,
      0x3b,
      0x35,
    ]);
    const sheet = await readSheet(new File([latin1], "a.csv"));
    expect(sheet.rows[0]).toEqual(["Câble", "5"]);
  });
});
