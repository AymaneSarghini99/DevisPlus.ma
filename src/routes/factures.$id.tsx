import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/Brand";
import { F, Section, TotalRow } from "@/components/Form";
import { LinesEditor } from "@/components/LinesEditor";
import { A4Preview } from "@/components/QuoteDocument";
import {
  deleteDraftInvoice,
  invoiceTotals,
  issueInvoice,
  loadInvoices,
  METHODS,
  missingInvoiceMentions,
  paymentError,
  saveInvoice,
  type Invoice,
  type Payment,
  type PaymentMethod,
} from "@/lib/invoices";
import { amountInWords, needsExemptionNote, today, uid } from "@/lib/quotes";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import {
  defaultSettings,
  loadCatalog,
  loadSettings,
  type CatalogItem,
  type Settings,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";
import { Dropdown } from "@/components/Dropdown";
import { DatePicker } from "@/components/DatePicker";

export const Route = createFileRoute("/factures/$id")({
  head: ({ match }) => pageMeta(match, "invoice"),
  component: InvoicePage,
});

function draftErrors(inv: Invoice) {
  const e: Record<string, string> = {};
  if (!inv.client.name.trim()) e["client"] = "clientName";
  if (!inv.lines.some((l) => l.description.trim())) e["lines"] = "lines";
  if (!inv.issueDate) e["issueDate"] = "date";
  if (!inv.dueDate) e["dueDate"] = "date";
  else if (inv.dueDate < inv.issueDate) e["dueDate"] = "dueDate";
  if (needsExemptionNote(inv.lines) && !inv.exemptionNote.trim()) e["exemptionNote"] = "exemption";
  return e;
}

function InvoicePage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { fmt, locale } = useLocale();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [missing, setMissing] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const setDirty = (v: boolean) => {
    dirtyRef.current = v;
    setDirtyState(v);
  };
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const found = loadInvoices().find((x) => x.id === id) ?? null;
    setInv(found);
    setMissing(!found);
    setSettings(loadSettings());
    setCatalog(loadCatalog());
    setDirty(false);
  }, [id]);

  useBlocker({
    shouldBlockFn: () => dirtyRef.current && !confirm(t("common.unsavedLeave")),
    enableBeforeUnload: () => dirtyRef.current,
  });

  const errors = useMemo(() => (inv ? draftErrors(inv) : {}), [inv]);
  const tot = useMemo(() => (inv ? invoiceTotals(inv) : null), [inv]);

  if (missing)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">{t("invoice.notFound")}</h1>
          <Link to="/factures" className="btn btn-primary mt-6">
            {t("invoice.back")}
          </Link>
        </main>
      </div>
    );
  if (!inv || !tot)
    return <p className="p-8 text-sm text-muted-foreground">{t("common.loading")}</p>;

  const draft = inv.status === "brouillon";
  const err = (k: string) =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const update = (patch: Partial<Invoice>) => {
    setInv({ ...inv, ...patch });
    setDirty(true);
  };

  const save = (next = inv) => {
    try {
      saveInvoice(next);
      setInv(next);
      setDirty(false);
      return true;
    } catch (e) {
      toast.error(errorMessage(e, t));
      return false;
    }
  };

  const saveDraft = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error(t("invoice.draftNotSaved"), { description: t("common.fixFields") });
      return;
    }
    if (save()) toast.success(t("invoice.draftSaved"));
  };

  const issue = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error(t("invoice.fixBeforeIssue"));
      return;
    }
    const gaps = missingInvoiceMentions(inv);
    const msg =
      t("invoice.confirmIssue") +
      (gaps.length
        ? `\n\n${t("invoice.missingMentions")}\n• ${gaps.map((g) => t(`invoice.mentions.${g}`)).join("\n• ")}`
        : "");
    if (!confirm(msg)) return;
    try {
      const issued = issueInvoice(inv, loadInvoices());
      if (save(issued)) toast.success(t("invoice.issued", { number: issued.number }));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const remove = () => {
    if (!confirm(t("invoice.confirmDeleteDraft"))) return;
    try {
      deleteDraftInvoice(inv.id);
      setDirty(false);
      navigate({ to: "/factures" });
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader>
        {draft && dirty && (
          <span className="hidden text-sm text-muted-foreground sm:inline" role="status">
            {t("common.unsaved")}
          </span>
        )}
        {draft && (
          <button className="btn btn-ghost" onClick={saveDraft} disabled={!dirty}>
            {t("common.save")}
          </button>
        )}
        {draft && (
          <button className="btn btn-primary" onClick={issue} disabled={dirty}>
            {t("invoice.issue")}
          </button>
        )}
      </AppHeader>

      <main className="print-page mx-auto grid max-w-[1400px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="no-print min-w-0 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label">
                {t("invoice.label")} · {t(`status.invoice.${inv.status}`)}
              </span>
              <h1 className="num text-xl font-semibold">
                {inv.number ? <bdi>{inv.number}</bdi> : t("status.invoice.brouillon")}
              </h1>
              {inv.quoteId && (
                <p className="text-sm text-muted-foreground">
                  {t("invoice.fromQuote")}{" "}
                  <Link
                    to="/devis/$id"
                    params={{ id: inv.quoteId }}
                    search={{}}
                    className="num underline underline-offset-2"
                  >
                    <bdi>{inv.quoteNumber}</bdi>
                  </Link>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => window.print()}
                title={t("common.printHint")}
              >
                <Printer className="size-4" /> {t("common.printPdf")}
              </button>
              {draft && (
                <button
                  className="btn btn-ghost"
                  onClick={remove}
                  aria-label={t("invoice.deleteDraft")}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>

          {draft ? (
            <p className="border border-dashed p-3 text-sm text-muted-foreground">
              {t("invoice.draftNote")}
              {dirty && ` ${t("invoice.saveChangesFirst")}`}
            </p>
          ) : (
            <p className="flex items-start gap-2 border bg-card p-3 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" />{" "}
              {t("invoice.lockedNote", { date: fmt.date(inv.issuedAt) })}
            </p>
          )}

          {draft && (
            <>
              <Section title={t("invoice.sectionDates")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label={t("invoice.issueDate")} id="idate" error={err("issueDate")}>
                    <DatePicker
                      id="idate"
                      value={inv.issueDate}
                      invalid={!!err("issueDate")}
                      onChange={(v) => update({ issueDate: v })}
                    />
                  </F>
                  <F label={t("doc.dueDate")} id="due" error={err("dueDate")}>
                    <DatePicker
                      id="due"
                      value={inv.dueDate}
                      min={inv.issueDate}
                      invalid={!!err("dueDate")}
                      onChange={(v) => update({ dueDate: v })}
                    />
                  </F>
                </div>
              </Section>
              <Section title={t("editor.sectionLines")}>
                {err("lines") && <p className="text-xs text-destructive">{err("lines")}</p>}
                <LinesEditor
                  lines={inv.lines}
                  onChange={(lines) => update({ lines })}
                  vatRates={settings.vatRates}
                  defaultVat={settings.defaultVat}
                  catalog={catalog}
                  showKind={inv.template === "btp"}
                />
              </Section>
              <Section title={t("invoice.sectionTerms")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label={t("editor.globalDiscount")} id="igdisc">
                    <input
                      id="igdisc"
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      dir="ltr"
                      className="field num text-end"
                      value={inv.globalDiscount}
                      onChange={(e) =>
                        update({
                          globalDiscount: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                    />
                  </F>
                </div>
                {(needsExemptionNote(inv.lines) || inv.exemptionNote) && (
                  <F label={t("editor.exemption")} id="iexempt" error={err("exemptionNote")}>
                    <input
                      id="iexempt"
                      dir="auto"
                      className="field"
                      aria-invalid={!!err("exemptionNote")}
                      value={inv.exemptionNote}
                      onChange={(e) => update({ exemptionNote: e.target.value })}
                    />
                  </F>
                )}
                <F label={t("editor.terms")} id="iterms">
                  <textarea
                    id="iterms"
                    dir="auto"
                    rows={2}
                    className="field h-auto py-2"
                    value={inv.terms}
                    onChange={(e) => update({ terms: e.target.value })}
                  />
                </F>
              </Section>
            </>
          )}

          <Section title={t("invoice.sectionAmounts")}>
            <dl className="space-y-1 text-sm">
              <TotalRow k={t("doc.totalHt")} v={fmt.money(tot.ht)} />
              {tot.byRate.map((r) => (
                <TotalRow
                  key={r.rate}
                  k={t("doc.vat", { rate: fmt.percent(r.rate) })}
                  v={fmt.money(r.tva)}
                />
              ))}
              <TotalRow k={t("doc.totalTtc")} v={fmt.money(tot.ttc)} strong />
              {!draft && (
                <>
                  <TotalRow k={t("invoice.received")} v={fmt.money(tot.paid)} />
                  <TotalRow k={t("doc.remaining")} v={fmt.money(tot.outstanding)} strong />
                </>
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                {t("doc.wordsInline", { words: amountInWords(tot.ttc, locale) })}
              </p>
            </dl>
          </Section>

          {!draft && <Payments inv={inv} onSave={(next) => save(next)} />}
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <p className="no-print mb-2 text-xs text-muted-foreground">{t("common.previewA4")}</p>
          <A4Preview
            d={{
              ...inv,
              kind: "facture",
              secondDate: inv.dueDate,
              deposit: 0,
              logo: settings.logo,
              draft,
              quoteRef: inv.quoteNumber,
              paid: tot.paid,
            }}

            onWatermarkChange={draft ? (watermark) => update({ watermark }) : undefined}
          />
        </div>
      </main>
    </div>
  );
}

function Payments({ inv, onSave }: { inv: Invoice; onSave: (inv: Invoice) => boolean }) {
  const blank = (): Payment => ({
    id: uid(),
    date: today(),
    amount: invoiceTotals(inv).outstanding,
    method: "virement",
    reference: "",
    note: "",
  });
  const { t } = useTranslation();
  const { fmt } = useLocale();
  const [p, setP] = useState<Payment>(blank);
  const [error, setError] = useState<ReturnType<typeof paymentError>>(null);

  const add = () => {
    const e = paymentError(inv, p);
    setError(e);
    if (e) return;
    if (onSave({ ...inv, payments: [...inv.payments, p] })) {
      toast.success(t("invoice.paymentSaved"));
      setP({
        ...blank(),
        amount: Math.round((invoiceTotals(inv).outstanding - p.amount) * 100) / 100,
      });
    }
  };
  const removePayment = (pid: string) => {
    if (confirm(t("invoice.confirmDeletePayment")))
      onSave({ ...inv, payments: inv.payments.filter((x) => x.id !== pid) });
  };
  const outstanding = invoiceTotals(inv).outstanding;

  return (
    <Section title={t("invoice.payments")}>
      {inv.payments.length ? (
        <ul className="divide-y border bg-card text-sm">
          {inv.payments.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="num">{fmt.date(x.date)}</span> · {t(`methods.${x.method}`)}
                {x.reference && (
                  <span className="text-muted-foreground">
                    {" · "}
                    <bdi>{x.reference}</bdi>
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <bdi className="num font-medium">{fmt.money(x.amount)}</bdi>
                <button
                  aria-label={t("invoice.deletePayment")}
                  className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  onClick={() => removePayment(x.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("invoice.noPayments")}</p>
      )}
      {outstanding > 0 ? (
        <div className="grid gap-3 border bg-card p-3 sm:grid-cols-2">
          <F label={t("doc.date")} id="pdate">
            <DatePicker id="pdate" value={p.date} onChange={(v) => setP({ ...p, date: v })} />
          </F>
          <F label={t("invoice.amount")} id="pamount">
            <input
              id="pamount"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              className="field num text-end"
              value={p.amount}
              onChange={(e) => setP({ ...p, amount: Number(e.target.value) || 0 })}
            />
          </F>
          <F label={t("invoice.method")} id="pmethod">
            <Dropdown
              id="pmethod"
              value={p.method}
              onChange={(v) => setP({ ...p, method: v as PaymentMethod })}
              options={METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
            />
          </F>
          <F label={t("invoice.reference")} id="pref">
            <input
              id="pref"
              dir="auto"
              className="field"
              value={p.reference}
              onChange={(e) => setP({ ...p, reference: e.target.value })}
            />
          </F>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {t(`errors.${error}`)}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("doc.remaining")}
                {t("doc.colon")}
                <bdi>{fmt.money(outstanding)}</bdi>
              </span>
            )}
            <button className="btn btn-primary" onClick={add}>
              {t("invoice.savePayment")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium">{t("invoice.fullyPaid")}</p>
      )}
    </Section>
  );
}
