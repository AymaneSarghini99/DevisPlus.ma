import { useTranslation } from "react-i18next";
import { Dropdown } from "@/components/Dropdown";
import { F } from "@/components/Form";
import { loadInvoices } from "@/lib/invoices";
import {
  formatNumber,
  nextInFormat,
  numberingError,
  PATTERNS,
  type Numbering,
  type Pattern,
} from "@/lib/numbering";
import { loadQuotes } from "@/lib/quotes";
import type { Settings } from "@/lib/store";

/** Settings block: number format of new quotes and invoices, and the default document footer. */
export function NumberingSection({
  s,
  update,
  tried,
}: {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
  tried: boolean;
}) {
  const { t } = useTranslation();
  const n = s.numbering;
  const set = (patch: Partial<Numbering>) => update({ numbering: { ...n, ...patch } });
  const error = numberingError(n);
  const year = new Date().getFullYear();
  const preview = error
    ? null
    : {
        quote: nextInFormat(loadQuotes(), n, "DV", year),
        invoice: nextInFormat(
          loadInvoices().filter((x) => x.status === "emise"),
          n,
          "FA",
          year,
        ),
      };

  return (
    <section id="numbering" className="scroll-mt-24">
      <h2 className="font-semibold">{t("account.docs.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.docs.text")}</p>
      <div className="mt-3 grid gap-4 rounded-[var(--radius)] border bg-card p-5 sm:grid-cols-2">
        <F label={t("account.docs.quotePrefix")} id="num-dv">
          <input
            id="num-dv"
            dir="ltr"
            maxLength={8}
            className="field num"
            aria-invalid={tried && !!error}
            value={n.quotePrefix}
            onChange={(e) => set({ quotePrefix: e.target.value.trim().toUpperCase() })}
          />
        </F>
        <F label={t("account.docs.invoicePrefix")} id="num-fa">
          <input
            id="num-fa"
            dir="ltr"
            maxLength={8}
            className="field num"
            aria-invalid={tried && !!error}
            value={n.invoicePrefix}
            onChange={(e) => set({ invoicePrefix: e.target.value.trim().toUpperCase() })}
          />
        </F>
        <F label={t("account.docs.pattern")} id="num-pattern" hint={t("account.docs.patternHint")}>
          <Dropdown
            id="num-pattern"
            value={n.pattern}
            onChange={(v) => set({ pattern: v as Pattern })}
            options={PATTERNS.map((p) => ({
              value: p,
              label: formatNumber({ ...n, pattern: p }, "DV", year, 1),
            }))}
          />
        </F>
        <F label={t("account.docs.digits")} id="num-digits">
          <Dropdown
            id="num-digits"
            value={String(n.digits)}
            onChange={(v) => set({ digits: Number(v) })}
            options={[2, 3, 4, 5, 6].map((d) => ({
              value: String(d),
              label: "0".repeat(d - 1) + "1",
            }))}
          />
        </F>
        <p className="text-sm sm:col-span-2" aria-live="polite">
          {error ? (
            <span className="text-destructive">{t(`account.docs.${error}`)}</span>
          ) : (
            <bdi className="num text-muted-foreground">{t("account.docs.preview", preview!)}</bdi>
          )}
        </p>
        <F
          label={t("account.docs.footer")}
          id="doc-footer"
          hint={t("account.docs.footerHint")}
          wide
        >
          <textarea
            id="doc-footer"
            rows={2}
            maxLength={300}
            className="field"
            value={s.docFooter}
            onChange={(e) => update({ docFooter: e.target.value })}
          />
        </F>
      </div>
    </section>
  );
}
