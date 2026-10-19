import { useMemo, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { Dropdown } from "@/components/Dropdown";
import {
  guessMapping,
  IMPORT_FIELDS,
  mergeCatalog,
  nameKey,
  readSheet,
  rowsToItems,
  TEMPLATE_CSV,
  type Mapping,
  type Sheet,
} from "@/lib/catalogImport";
import { saveCatalog, type CatalogItem } from "@/lib/store";
import { errorMessage } from "@/lib/storage";

const NONE = "-1";
const PREVIEW = 5;

/** Excel / CSV import for the catalogue: pick a file, check the column matching, import. */
export function CatalogImport({
  current,
  defaultVat,
  vatRates,
  onDone,
  onClose,
}: {
  current: CatalogItem[];
  defaultVat: number;
  vatRates: number[];
  onDone: (items: CatalogItem[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { fmt } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [map, setMap] = useState<Mapping | null>(null);
  const [update, setUpdate] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const s = await readSheet(file);
      setSheet(s);
      setFileName(file.name);
      setMap(guessMapping(s.headers));
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(
        t(
          code === "xls"
            ? "catalogueImport.errXls"
            : code === "empty"
              ? "catalogueImport.errEmpty"
              : "catalogueImport.errRead",
        ),
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const result = useMemo(
    () =>
      sheet && map && map.name >= 0
        ? rowsToItems(sheet, map, { unit: "pièce", vatRate: defaultVat, vatRates })
        : null,
    [sheet, map, defaultVat, vatRates],
  );
  const duplicates = useMemo(() => {
    if (!result) return 0;
    const names = new Set(current.map((i) => nameKey(i.name)));
    return result.items.filter((i) => names.has(nameKey(i.name))).length;
  }, [result, current]);

  const run = () => {
    if (!result?.items.length) return;
    try {
      const merged = mergeCatalog(current, result.items, update, map ?? undefined);
      saveCatalog(merged.items);
      onDone(merged.items);
      toast.success(t("catalogueImport.done", { added: merged.added, updated: merged.updated }));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-catalogue-devisplus.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void load(e.dataTransfer.files[0]);
  };

  const columns = sheet
    ? [
        { value: NONE, label: t("catalogueImport.ignore") },
        ...sheet.headers.map((h, i) => ({
          value: String(i),
          label: h || t("catalogueImport.column", { n: i + 1 }),
        })),
      ]
    : [];

  return (
    <section className="mt-6 border bg-card p-5" aria-labelledby="import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="import-title" className="font-semibold">
            {t("catalogueImport.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("catalogueImport.intro")}
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={download}>
          <Download className="size-4" /> {t("catalogueImport.template")}
        </button>
      </div>

      {!sheet ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={`mt-4 flex flex-col items-center justify-center gap-2 border border-dashed px-4 py-10 text-center transition ${over ? "border-foreground bg-muted" : ""}`}
        >
          <FileSpreadsheet className="size-8 text-muted-foreground" />
          <p className="text-sm">
            {t("catalogueImport.drop")}{" "}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => input.current?.click()}
              disabled={busy}
            >
              {t("catalogueImport.browse")}
            </button>
          </p>
          <p className="text-xs text-muted-foreground">{t("catalogueImport.formats")}</p>
          <input
            ref={input}
            type="file"
            accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label={t("catalogueImport.browse")}
            onChange={(e) => void load(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            <bdi className="font-medium">{fileName}</bdi>
            <span className="text-muted-foreground">
              · {t("catalogueImport.rows", { count: sheet.rows.length })}
            </span>
            <button
              type="button"
              className="ms-auto text-sm underline underline-offset-2"
              onClick={() => {
                setSheet(null);
                setMap(null);
              }}
            >
              {t("catalogueImport.otherFile")}
            </button>
          </p>

          <h3 className="mt-5 text-sm font-semibold">{t("catalogueImport.matchTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("catalogueImport.matchText")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_FIELDS.map((f) => (
              <div key={f}>
                <label className="label" htmlFor={`map-${f}`}>
                  {t(`catalogueImport.fields.${f}`)}
                </label>
                <Dropdown
                  id={`map-${f}`}
                  value={String(map?.[f] ?? -1)}
                  invalid={f === "name" && (map?.name ?? -1) < 0}
                  onChange={(v) => map && setMap({ ...map, [f]: Number(v) })}
                  options={columns}
                />
              </div>
            ))}
          </div>

          {!result ? (
            <p className="mt-4 text-sm text-destructive">{t("catalogueImport.needName")}</p>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-start text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">{t("catalogue.colItem")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("lines.unit")}</th>
                      <th className="px-3 py-2 text-end font-medium">{t("doc.col.unitPrice")}</th>
                      <th className="px-3 py-2 text-end font-medium">{t("lines.vat")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.items.slice(0, PREVIEW).map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2">
                          <bdi className="font-medium">{i.name}</bdi>
                          {i.description && (
                            <span className="block text-xs text-muted-foreground">
                              {i.description}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {t(`units.${i.unit}`)}
                          {i.kind ? ` · ${t(`kinds.${i.kind}`)}` : ""}
                        </td>
                        <td className="num px-3 py-2 text-end">
                          <bdi>{fmt.money(i.unitPrice)}</bdi>
                        </td>
                        <td className="num px-3 py-2 text-end">
                          <bdi>{fmt.percent(i.vatRate)}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.items.length > PREVIEW && (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    {t("catalogueImport.more", { count: result.items.length - PREVIEW })}
                  </p>
                )}
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                <li className="font-medium">
                  {t("catalogueImport.ready", { count: result.items.length })}
                </li>
                {result.skipped.length > 0 && (
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span>
                      {t("catalogueImport.skipped", { count: result.skipped.length })}{" "}
                      {result.skipped
                        .slice(0, 5)
                        .map((s) => t(`catalogueImport.reason.${s.reason}`, { row: s.row }))
                        .join(" · ")}
                      {result.skipped.length > 5 ? " …" : ""}
                    </span>
                  </li>
                )}
                {result.defaulted > 0 && (
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    {t("catalogueImport.defaulted", {
                      count: result.defaulted,
                      unit: t("units.pièce"),
                      vat: fmt.percent(defaultVat),
                    })}
                  </li>
                )}
              </ul>

              {duplicates > 0 && (
                <label className="mt-4 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    checked={update}
                    onChange={(e) => setUpdate(e.target.checked)}
                  />
                  <span>
                    {t("catalogueImport.update", { count: duplicates })}
                    <span className="block text-xs text-muted-foreground">
                      {update ? t("catalogueImport.updateOn") : t("catalogueImport.updateOff")}
                    </span>
                  </span>
                </label>
              )}
            </>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("common.cancel")}
        </button>
        {sheet && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!result?.items.length}
            onClick={run}
          >
            <Upload className="size-4" />
            {t("catalogueImport.run", { count: result?.items.length ?? 0 })}
          </button>
        )}
      </div>
    </section>
  );
}
