import { useMemo, useState } from "react";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/i18n/LocaleProvider";
import {
  KINDS,
  lineHT,
  newLine,
  uid,
  UNITS,
  type Line,
  type LineKind,
  type Unit,
} from "@/lib/quotes";
import type { CatalogItem } from "@/lib/store";
import { Dropdown } from "@/components/Dropdown";

type Props = {
  lines: Line[];
  onChange: (lines: Line[]) => void;
  vatRates: number[];
  defaultVat: number;
  catalog: CatalogItem[];
  showKind: boolean;
  readOnly?: boolean;
};

/** A line copied from the catalogue: later edits on the quote never touch the saved item. */
export function lineFromItem(i: CatalogItem): Line {
  return {
    id: uid(),
    description: i.description ? `${i.name}\n${i.description}` : i.name,
    qty: 1,
    unit: i.unit,
    unitPrice: i.unitPrice,
    discount: 0,
    vatRate: i.vatRate,
    ...(i.kind ? { kind: i.kind } : {}),
  };
}

const num = (v: string) => (v === "" ? 0 : Number(v));

export function LinesEditor({
  lines,
  onChange,
  vatRates,
  defaultVat,
  catalog,
  showKind,
  readOnly,
}: Props) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [picker, setPicker] = useState(false);
  const set = (id: string, patch: Partial<Line>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <div>
      <div className="space-y-3">
        {lines.map((l, i) => {
          // A saved line keeps its rate even if it is no longer offered in the settings.
          const rates = vatRates.includes(l.vatRate)
            ? vatRates
            : [...vatRates, l.vatRate].sort((a, b) => b - a);
          return (
            <fieldset key={l.id} disabled={readOnly} className="border bg-card p-3">
              <legend className="sr-only">{t("lines.lineN", { n: i + 1 })}</legend>
              <div className="flex items-start gap-2">
                <span className="num mt-2.5 w-5 shrink-0 text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <label className="sr-only" htmlFor={`d-${l.id}`}>
                    {t("lines.designation")}
                  </label>
                  <textarea
                    id={`d-${l.id}`}
                    rows={l.description.includes("\n") ? 2 : 1}
                    className="field h-auto min-h-10 resize-y py-2"
                    placeholder={t("lines.designationPlaceholder")}
                    dir="auto"
                    value={l.description}
                    onChange={(e) => set(l.id, { description: e.target.value })}
                  />
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={t("lines.deleteLine", { n: i + 1 })}
                    disabled={lines.length === 1}
                    className="btn btn-ghost size-10 shrink-0 px-0"
                    onClick={() => onChange(lines.filter((x) => x.id !== l.id))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div
                className={`mt-2 grid grid-cols-2 gap-2 ps-7 sm:grid-cols-3 ${showKind ? "lg:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.3fr)]" : "lg:grid-cols-5"} xl:items-end`}
              >
                <Field label={t("lines.qty")} id={`q-${l.id}`}>
                  <input
                    id={`q-${l.id}`}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    dir="ltr"
                    className="field num text-end"
                    value={l.qty}
                    onChange={(e) => set(l.id, { qty: Math.max(0, num(e.target.value)) })}
                  />
                </Field>
                <Field label={t("lines.unit")} id={`u-${l.id}`}>
                  <Dropdown
                    id={`u-${l.id}`}
                    value={l.unit}
                    onChange={(v) => set(l.id, { unit: v as Unit })}
                    options={UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))}
                  />
                </Field>
                <Field label={t("lines.unitPrice")} id={`p-${l.id}`}>
                  <input
                    id={`p-${l.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    dir="ltr"
                    className="field num text-end"
                    value={l.unitPrice}
                    onChange={(e) => set(l.id, { unitPrice: Math.max(0, num(e.target.value)) })}
                  />
                </Field>
                <Field label={t("lines.discount")} id={`r-${l.id}`}>
                  <input
                    id={`r-${l.id}`}
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    inputMode="decimal"
                    dir="ltr"
                    className="field num text-end"
                    value={l.discount}
                    onChange={(e) =>
                      set(l.id, { discount: Math.min(100, Math.max(0, num(e.target.value))) })
                    }
                  />
                </Field>
                <Field label={t("lines.vat")} id={`t-${l.id}`}>
                  <Dropdown
                    id={`t-${l.id}`}
                    value={String(l.vatRate)}
                    onChange={(v) => set(l.id, { vatRate: Number(v) })}
                    options={rates.map((r) => ({ value: String(r), label: fmt.percent(r) }))}
                  />
                </Field>
                {showKind && (
                  <Field label={t("lines.kind")} id={`k-${l.id}`}>
                    <Dropdown
                      id={`k-${l.id}`}
                      value={l.kind ?? ""}
                      onChange={(v) => {
                        const { kind: _k, ...rest } = l;
                        onChange(
                          lines.map((x) =>
                            x.id === l.id ? (v ? { ...rest, kind: v as LineKind } : rest) : x,
                          ),
                        );
                      }}
                      options={[
                        { value: "", label: t("kinds.other") },
                        ...KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) })),
                      ]}
                    />
                  </Field>
                )}
                <div className="col-span-2 flex items-center justify-between self-end text-sm sm:col-span-3 lg:col-span-full">
                  <span className="text-xs text-muted-foreground">{t("lines.lineTotal")}</span>
                  <bdi className="num font-medium">{fmt.money(lineHT(l))}</bdi>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onChange([...lines, newLine(defaultVat)])}
          >
            <Plus className="size-4" /> {t("lines.addLine")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            aria-expanded={picker}
            onClick={() => setPicker(!picker)}
          >
            <BookOpen className="size-4" /> {t("lines.fromCatalogue")}
          </button>
        </div>
      )}
      {picker && !readOnly && (
        <CatalogPicker
          catalog={catalog}
          onPick={(i) =>
            onChange([...lines.filter((l) => l.description || l.unitPrice), lineFromItem(i)])
          }
        />
      )}
    </div>
  );
}

function CatalogPicker({
  catalog,
  onPick,
}: {
  catalog: CatalogItem[];
  onPick: (i: CatalogItem) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? catalog.filter((i) => (i.name + " " + i.description).toLowerCase().includes(s))
      : catalog;
  }, [catalog, q]);
  if (!catalog.length)
    return (
      <p className="mt-3 border border-dashed bg-card p-4 text-sm text-muted-foreground">
        {t("lines.catalogueEmpty")}{" "}
        <Link to="/catalogue" className="font-medium text-foreground underline underline-offset-2">
          {t("lines.catalogueEmptyLink")}
        </Link>{" "}
        {t("lines.catalogueEmptyEnd")}
      </p>
    );
  return (
    <div className="mt-3 border bg-card">
      <div className="relative border-b">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor="cat-search" className="sr-only">
          {t("lines.searchCatalogue")}
        </label>
        <input
          id="cat-search"
          className="h-10 w-full bg-transparent pe-3 ps-9 text-sm outline-none"
          placeholder={t("lines.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <ul className="max-h-64 divide-y overflow-y-auto">
        {list.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-3 py-2 text-start text-sm hover:bg-muted"
              onClick={() => onPick(i)}
            >
              <span className="min-w-0">
                <bdi className="block truncate font-medium">{i.name}</bdi>
                {i.description && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {i.description}
                  </span>
                )}
              </span>
              <span className="num shrink-0 text-end text-xs">
                <bdi>{fmt.money(i.unitPrice)}</bdi> /{" "}
                <span className="font-sans">{t(`units.${i.unit}`)}</span>
                <br />
                <span className="font-sans text-muted-foreground">
                  {t("lines.vatRate", { rate: fmt.percent(i.vatRate) })}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!list.length && (
          <li className="px-3 py-4 text-sm text-muted-foreground">
            {t("common.noMatch", { query: q })}
          </li>
        )}
      </ul>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
