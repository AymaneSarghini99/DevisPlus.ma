import { KINDS, uid, UNITS, type LineKind, type Unit } from "./quotes";
import type { CatalogItem } from "./store";

/** Columns of a catalogue item that a file column can feed. */
export const IMPORT_FIELDS = ["name", "description", "unit", "price", "vat", "kind"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
/** Column index in the file for each field; -1 when not used. */
export type Mapping = Record<ImportField, number>;
export type Sheet = { headers: string[]; rows: string[][] };
export type SkipReason = "name" | "price";
export type ImportResult = {
  items: CatalogItem[];
  skipped: { row: number; reason: SkipReason }[];
  /** Units or VAT rates that were not recognised and replaced by the default. */
  defaulted: number;
};

const fold = (s: string) =>
  s
    .replace(/œ/gi, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ%²³]+/g, " ")
    .trim();

// ---------- CSV ----------

/** Delimiter used by the file: Excel in French writes ";", others "," or tabs. */
function delimiterOf(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const count = (c: string) => head.split(c).length;
  return [";", "\t", ","].reduce((best, c) => (count(c) > count(best) ? c : best), ",");
}

/** Parses CSV text (quoted fields, "" escapes, line breaks inside quotes, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const d = delimiterOf(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === d) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---------- Excel (.xlsx) ----------

/** Reads one file out of a zip archive (stored or deflated). */
async function unzip(buf: ArrayBuffer, want: (name: string) => boolean) {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("zip");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const files = new Map<string, () => Promise<string>>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("zip");
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extra = v.getUint16(p + 30, true);
    const comment = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extra + comment;
    if (!want(name)) continue;
    files.set(name, async () => {
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const data = new Uint8Array(buf, start, size);
      if (method === 0) return dec.decode(data);
      if (method !== 8) throw new Error("zip");
      const stream = new Response(data).body!.pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(stream).text();
    });
  }
  return files;
}

const colIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};

/** First worksheet of an .xlsx file, as rows of text. */
export async function parseXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf, (n) => n.startsWith("xl/") && n.endsWith(".xml"));
  const xml = async (name: string) => {
    const f = files.get(name);
    return f ? new DOMParser().parseFromString(await f(), "application/xml") : null;
  };
  // First sheet in workbook order.
  const wb = await xml("xl/workbook.xml");
  const rels = await xml("xl/_rels/workbook.xml.rels");
  const rid = wb?.getElementsByTagName("sheet")[0]?.getAttribute("r:id");
  const target = [...(rels?.getElementsByTagName("Relationship") ?? [])]
    .find((r) => r.getAttribute("Id") === rid)
    ?.getAttribute("Target");
  const sheetName = target
    ? target.startsWith("/")
      ? target.slice(1)
      : `xl/${target}`
    : [...files.keys()].filter((n) => n.startsWith("xl/worksheets/sheet")).sort()[0];
  const sheet = sheetName ? await xml(sheetName) : null;
  if (!sheet) throw new Error("xlsx");
  const sst = await xml("xl/sharedStrings.xml");
  const strings = [...(sst?.getElementsByTagName("si") ?? [])].map((si) =>
    [...si.getElementsByTagName("t")].map((t) => t.textContent ?? "").join(""),
  );
  const rows: string[][] = [];
  for (const r of sheet.getElementsByTagName("row")) {
    const row: string[] = [];
    let next = 0;
    for (const c of r.getElementsByTagName("c")) {
      const ref = c.getAttribute("r");
      const at = ref ? colIndex(ref) : next;
      next = at + 1;
      const type = c.getAttribute("t");
      const raw = c.getElementsByTagName("v")[0]?.textContent ?? "";
      row[at] =
        type === "s"
          ? (strings[Number(raw)] ?? "")
          : type === "inlineStr"
            ? [...c.getElementsByTagName("t")].map((t) => t.textContent ?? "").join("")
            : raw;
    }
    rows.push(Array.from(row, (x) => x ?? ""));
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** File contents (FileReader fallback for environments without Blob.arrayBuffer). */
const bytesOf = (file: File) =>
  typeof file.arrayBuffer === "function"
    ? file.arrayBuffer()
    : new Promise<ArrayBuffer>((ok, ko) => {
        const r = new FileReader();
        r.onload = () => ok(r.result as ArrayBuffer);
        r.onerror = () => ko(r.error);
        r.readAsArrayBuffer(file);
      });

/** Reads a .csv / .txt / .xlsx file into a header row and data rows. */
export async function readSheet(file: File): Promise<Sheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) throw new Error("xls");
  let rows: string[][];
  if (name.endsWith(".xlsx")) rows = await parseXlsx(await bytesOf(file));
  else {
    const bytes = new Uint8Array(await bytesOf(file));
    // Excel on Windows often saves CSV in Windows-1252 rather than UTF-8.
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
    }
    rows = parseCsv(text);
  }
  if (rows.length < 2) throw new Error("empty");
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => (r[i] ?? "").trim());
  return { headers: pad(rows[0]!), rows: rows.slice(1).map(pad) };
}

// ---------- matching columns ----------

const HEADER_WORDS: Record<ImportField, string[]> = {
  name: [
    "nom",
    "designation",
    "article",
    "produit",
    "libelle",
    "prestation",
    "name",
    "item",
    "product",
    "title",
    "intitule",
    "الاسم",
    "المنتج",
    "البيان",
  ],
  description: ["description", "detail", "details", "desc", "commentaire", "الوصف"],
  unit: ["unite", "unit", "u", "uom", "mesure", "الوحدة"],
  price: [
    "prix",
    "pu",
    "p u",
    "prix unitaire",
    "price",
    "unit price",
    "tarif",
    "montant",
    "ht",
    "السعر",
  ],
  vat: ["tva", "vat", "taxe", "tax", "taux", "الضريبة"],
  kind: ["nature", "type", "categorie", "category", "kind", "famille", "النوع"],
};

/** Guesses which file column feeds each field from the header names. */
export function guessMapping(headers: string[]): Mapping {
  const used = new Set<number>();
  const m = {} as Mapping;
  const h = headers.map(fold);
  // Price before unit, so "Unit price" is not taken for the unit column.
  for (const f of ["name", "price", "vat", "unit", "description", "kind"] as const) {
    const words = HEADER_WORDS[f];
    const score = (x: string) =>
      words.includes(x) ? 3 : words.some((w) => x.split(" ").includes(w)) ? 2 : 0;
    let best = -1;
    let bestScore = 0;
    h.forEach((x, i) => {
      const s = used.has(i) ? 0 : score(x);
      if (s > bestScore) {
        best = i;
        bestScore = s;
      }
    });
    m[f] = best;
    if (best >= 0) used.add(best);
  }
  // No recognisable header: assume the first column holds the names.
  if (m.name < 0 && headers.length) m.name = used.has(0) ? -1 : 0;
  return m;
}

// ---------- values ----------

/** "1 500,50 DH", "1.500,50", "1,500.50", "1500" → number; NaN when unreadable. */
export function parsePrice(raw: string): number {
  let s = raw.replace(/[\s\u00a0\u202f]/g, "").replace(/[^\d,.-]/g, "");
  if (!/\d/.test(s)) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // The last separator is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // "1,500" with exactly three digits after a single comma is a thousands separator.
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, "");
  return Number(s);
}

const UNIT_WORDS: Record<Unit, string[]> = {
  pièce: ["piece", "pieces", "pce", "pcs", "pc", "u", "un", "unite", "unit", "ea", "qte", "قطعة"],
  heure: ["heure", "heures", "h", "hr", "hour", "hours", "ساعة"],
  jour: ["jour", "jours", "j", "jr", "day", "days", "يوم"],
  "m²": ["m²", "m2", "mc", "m carre", "metre carre", "metres carres", "sqm"],
  "m³": ["m³", "m3", "metre cube", "metres cubes"],
  ml: ["ml", "m", "metre", "metres", "metre lineaire", "metres lineaires", "lm"],
  kg: ["kg", "kilo", "kilos", "kilogramme", "kilogrammes"],
  forfait: ["forfait", "ff", "fft", "ens", "ensemble", "lot", "global", "flat", "جزافي"],
};

export function parseUnit(raw: string): Unit | undefined {
  const s = fold(raw)
    .replace(/\s*(²|2)$/, "2")
    .replace(/\s*(³|3)$/, "3");
  if (!s) return undefined;
  return UNITS.find((u) => UNIT_WORDS[u].map(fold).includes(s));
}

/** "20", "20 %", "0,2", "0.10" → 20 / 10; NaN when unreadable. */
export function parseVat(raw: string): number {
  if (!raw.trim()) return NaN;
  const n = parsePrice(raw);
  if (!Number.isFinite(n)) return NaN;
  const pct = n > 0 && n < 1 && !raw.includes("%") ? n * 100 : n;
  return Math.round(pct * 100) / 100;
}

const KIND_WORDS: Record<LineKind, string[]> = {
  materiel: ["materiel", "materiaux", "fourniture", "fournitures", "produit", "material"],
  main_oeuvre: ["main d oeuvre", "main d œuvre", "mo", "pose", "labour", "labor"],
  service: ["service", "services", "prestation", "prestations"],
};
export function parseKind(raw: string): LineKind | undefined {
  const s = fold(raw);
  return KINDS.find((k) => KIND_WORDS[k].map(fold).includes(s));
}

/**
 * Turns the file rows into catalogue items. Rows without a name, or with a price that is
 * not a number, are skipped; unknown units or VAT rates fall back to the defaults.
 */
export function rowsToItems(
  sheet: Sheet,
  m: Mapping,
  defaults: { unit: Unit; vatRate: number; vatRates: number[] },
): ImportResult {
  const items: CatalogItem[] = [];
  const skipped: ImportResult["skipped"] = [];
  let defaulted = 0;
  const cell = (r: string[], f: ImportField) => (m[f] >= 0 ? (r[m[f]] ?? "").trim() : "");
  sheet.rows.forEach((r, i) => {
    const row = i + 2; // spreadsheet row number (header is row 1)
    const name = cell(r, "name");
    if (!name) {
      skipped.push({ row, reason: "name" });
      return;
    }
    const priceRaw = cell(r, "price");
    const price = priceRaw ? parsePrice(priceRaw) : 0;
    if (!Number.isFinite(price) || price < 0) {
      skipped.push({ row, reason: "price" });
      return;
    }
    const unitRaw = cell(r, "unit");
    const unit = parseUnit(unitRaw);
    const vatRaw = cell(r, "vat");
    const vat = parseVat(vatRaw);
    const vatOk = Number.isFinite(vat) && defaults.vatRates.includes(vat);
    if ((unitRaw && !unit) || (vatRaw && !vatOk)) defaulted++;
    const kind = parseKind(cell(r, "kind"));
    items.push({
      id: uid(),
      name,
      description: cell(r, "description"),
      unit: unit ?? defaults.unit,
      unitPrice: Math.round(price * 100) / 100,
      vatRate: vatOk ? vat : defaults.vatRate,
      ...(kind ? { kind } : {}),
    });
  });
  return { items, skipped, defaulted };
}

/** Key used to spot the same item name (ignoring case, accents and punctuation). */
export const nameKey = (name: string) => fold(name);

const FIELD_KEYS: Record<Exclude<ImportField, "name">, keyof CatalogItem> = {
  description: "description",
  unit: "unit",
  price: "unitPrice",
  vat: "vatRate",
  kind: "kind",
};

/**
 * Merges imported items into the catalogue. With `update`, an item whose name already exists
 * (ignoring case and accents) is updated in place, keeping its id; only the columns present in
 * the file (`mapping`) change, the others keep their saved value. Otherwise the item is added.
 */
export function mergeCatalog(
  current: CatalogItem[],
  incoming: CatalogItem[],
  update: boolean,
  mapping?: Mapping,
) {
  const out = [...current];
  const at = new Map(out.map((i, n) => [fold(i.name), n]));
  let added = 0;
  let updated = 0;
  for (const it of incoming) {
    const n = update ? at.get(fold(it.name)) : undefined;
    if (n !== undefined) {
      const prev = out[n]!;
      const next: CatalogItem = { ...it, id: prev.id };
      if (mapping)
        for (const [f, key] of Object.entries(FIELD_KEYS) as [ImportField, keyof CatalogItem][])
          if (mapping[f] < 0) Object.assign(next, { [key]: prev[key] });
      if (next.kind === undefined) delete next.kind;
      out[n] = next;
      updated++;
    } else {
      at.set(fold(it.name), out.length);
      out.push(it);
      added++;
    }
  }
  return { items: out, added, updated };
}

/** Example file offered for download (semicolon-separated, opens directly in Excel FR). */
export const TEMPLATE_CSV =
  "﻿Nom;Description;Unité;Prix unitaire HT;TVA;Nature\r\n" +
  "Climatiseur split 12 000 BTU;Inverter, classe A++;pièce;6000;20;Matériaux\r\n" +
  "Pose et mise en service;;forfait;1500;20;Main-d'œuvre\r\n" +
  "Carrelage grès cérame 60x60;;m²;180,50;20;Matériaux\r\n";
