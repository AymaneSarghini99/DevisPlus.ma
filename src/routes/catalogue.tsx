import { createFileRoute } from "@tanstack/react-router";
import { askConfirm } from "@/lib/confirm";
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { F } from "@/components/Form";
import { KINDS, UNITS, type LineKind, type Unit } from "@/lib/quotes";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import {
  deleteItem,
  loadCatalog,
  loadSettings,
  newItem,
  saveItem,
  type CatalogItem,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";
import { Dropdown } from "@/components/Dropdown";
import { CatalogImport } from "@/components/CatalogImport";

export const Route = createFileRoute("/catalogue")({
  head: ({ match }) => pageMeta(match, "catalogue"),
  component: Catalogue,
});

function itemErrors(i: CatalogItem) {
  const e: Record<string, string> = {};
  if (!i.name.trim()) e["name"] = "required";
  if (!(i.unitPrice >= 0)) e["unitPrice"] = "price";
  return e;
}

function Catalogue() {
  const { t } = useTranslation();
  const { fmt, locale } = useLocale();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [rates, setRates] = useState<number[]>([20, 14, 10, 7, 0]);
  const [defaultVat, setDefaultVat] = useState(20);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<CatalogItem | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setItems(loadCatalog());
    const st = loadSettings();
    setRates(st.vatRates);
    setDefaultVat(st.defaultVat);
  }, []);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = [...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name, locale));
    return s ? all.filter((i) => (i.name + " " + i.description).toLowerCase().includes(s)) : all;
  }, [items, search, locale]);

  const open = (i: CatalogItem) => {
    setImporting(false);
    setEdit({ ...i });
    setTried(false);
  };
  const errors = edit ? itemErrors(edit) : {};
  const isNew = edit && !items?.some((i) => i.id === edit.id);
  const save = () => {
    if (!edit) return;
    setTried(true);
    if (Object.keys(errors).length) return;
    try {
      saveItem(edit);
      setItems(loadCatalog());
      toast.success(isNew ? t("catalogue.added") : t("catalogue.saved"));
      setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };
  const remove = async (i: CatalogItem) => {
    const ok = await askConfirm({
      title: t("catalogue.confirmDelete", { name: i.name }),
      tone: "danger",
    });
    if (!ok) return;
    try {
      deleteItem(i.id);
      setItems(loadCatalog());
      if (edit?.id === i.id) setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };
  const startImport = () => {
    setEdit(null);
    setImporting(true);
  };
  const itemRates = edit && !rates.includes(edit.vatRate) ? [...rates, edit.vatRate] : rates;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title={t("catalogue.title")}>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={startImport}>
              <FileSpreadsheet className="size-4" /> {t("catalogueImport.open")}
            </button>
            <button className="btn btn-accent" onClick={() => open(newItem())}>
              <Plus className="size-4" /> {t("catalogue.new")}
            </button>
          </div>
        </PageTitle>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("catalogue.intro")}</p>

        {importing && items && (
          <CatalogImport
            current={items}
            defaultVat={defaultVat}
            vatRates={rates}
            onDone={(next) => {
              setItems(next);
              setImporting(false);
            }}
            onClose={() => setImporting(false)}
          />
        )}

        {edit && (
          <section
            className="mt-6 border bg-card p-5"
            aria-label={isNew ? t("catalogue.new") : t("catalogue.edit")}
          >
            <h2 className="font-semibold">{isNew ? t("catalogue.new") : t("catalogue.edit")}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <F
                label={t("catalogue.name")}
                id="i-name"
                error={
                  tried && errors["name"] ? t(`validation.${errors["name"]}` as never) : undefined
                }
                wide
              >
                <input
                  id="i-name"
                  dir="auto"
                  className="field"
                  aria-invalid={tried && !!errors["name"]}
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </F>
              <F label={t("lines.unit")} id="i-unit">
                <Dropdown
                  id="i-unit"
                  value={edit.unit}
                  onChange={(v) => setEdit({ ...edit, unit: v as Unit })}
                  options={UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))}
                />
              </F>
              <F
                label={t("catalogue.price")}
                id="i-price"
                error={
                  tried && errors["unitPrice"]
                    ? t(`validation.${errors["unitPrice"]}` as never)
                    : undefined
                }
              >
                <input
                  id="i-price"
                  type="number"
                  min={0}
                  step="0.01"
                  dir="ltr"
                  className="field num text-end"
                  value={edit.unitPrice}
                  onChange={(e) =>
                    setEdit({ ...edit, unitPrice: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </F>
              <F label={t("catalogue.description")} id="i-desc" wide>
                <input
                  id="i-desc"
                  dir="auto"
                  className="field"
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </F>
              <F label={t("lines.vat")} id="i-vat">
                <Dropdown
                  id="i-vat"
                  value={String(edit.vatRate)}
                  onChange={(v) => setEdit({ ...edit, vatRate: Number(v) })}
                  options={itemRates.map((r) => ({ value: String(r), label: fmt.percent(r) }))}
                />
              </F>
              <F label={t("catalogue.kind")} id="i-kind">
                <Dropdown
                  id="i-kind"
                  value={edit.kind ?? ""}
                  onChange={(v) => {
                    const { kind: _k, ...rest } = edit;
                    setEdit(v ? { ...rest, kind: v as LineKind } : rest);
                  }}
                  options={[
                    { value: "", label: t("kinds.unspecified") },
                    ...KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) })),
                  ]}
                />
              </F>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>
                {t("common.cancel")}
              </button>
              <button className="btn btn-primary" onClick={save}>
                {t("common.save")}
              </button>
            </div>
          </section>
        )}

        {items === null ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          !edit &&
          !importing && (
            <EmptyState
              icon={<Package className="size-6" />}
              title={t("catalogue.emptyTitle")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="btn btn-accent" onClick={() => open(newItem())}>
                    <Plus className="size-4" /> {t("catalogue.addFirst")}
                  </button>
                  <button className="btn btn-ghost" onClick={startImport}>
                    <FileSpreadsheet className="size-4" /> {t("catalogueImport.open")}
                  </button>
                </div>
              }
            >
              {t("catalogue.emptyText")}
            </EmptyState>
          )
        ) : (
          <>
            <div className="relative mt-6 max-w-sm">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="item-search" className="sr-only">
                {t("catalogue.searchLabel")}
              </label>
              <input
                id="item-search"
                className="field ps-9"
                placeholder={t("catalogue.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-3 overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("catalogue.colItem")}</th>
                    <th className="px-4 py-3 font-medium">{t("lines.unit")}</th>
                    <th className="px-4 py-3 text-end font-medium">{t("doc.col.unitPrice")}</th>
                    <th className="px-4 py-3 text-end font-medium">{t("lines.vat")}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/60">
                      <td className="px-4 py-3">
                        <button
                          className="text-start underline-offset-2 hover:underline"
                          onClick={() => open(i)}
                        >
                          <bdi className="font-medium">{i.name}</bdi>
                          {i.description && (
                            <span className="block text-xs text-muted-foreground">
                              {i.description}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t(`units.${i.unit}`)}
                        {i.kind ? ` · ${t(`kinds.${i.kind}`)}` : ""}
                      </td>
                      <td className="num px-4 py-3 text-end">
                        <bdi>{fmt.money(i.unitPrice)}</bdi>
                      </td>
                      <td className="num px-4 py-3 text-end">
                        <bdi>{fmt.percent(i.vatRate)}</bdi>
                      </td>
                      <td className="px-2">
                        <button
                          aria-label={t("catalogue.deleteOf", { name: i.name })}
                          className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                          onClick={() => remove(i)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-sm text-muted-foreground">
                        {t("common.noMatch", { query: search })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
