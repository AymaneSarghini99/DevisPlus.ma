import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { askConfirm } from "@/lib/confirm";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Link2,
  Printer,
  Receipt,
  Truck,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppIcon } from "@/components/WhatsAppWidget";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { ProductTour } from "@/components/ProductTour";
import { MobileViewSwitch, useEditorView } from "@/components/MobileViewSwitch";
import { SaveBar } from "@/components/SaveBar";
import { useDevFill, type DevAction } from "@/dev/devFill";
import { DriveDocStatus } from "@/components/DriveDocStatus";
import { driveFileName } from "@/lib/driveSync";
import { toast } from "sonner";
import { AppHeader } from "@/components/Brand";
import { LinesEditor } from "@/components/LinesEditor";
import { A4Preview } from "@/components/QuoteDocument";
import { AccentPicker, F, PartyFields, Section, TotalRow } from "@/components/Form";
import { useTranslation } from "react-i18next";
import { LOCALES, NATIVE_NAME, type Locale } from "@/i18n/config";
import { makeFormat } from "@/i18n/format";
import { tFor } from "@/i18n/index";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import {
  amountInWords,
  duplicateQuote,
  emptyParty,
  loadQuotes,
  needsExemptionNote,
  newLine,
  newQuote,
  quoteTotals,
  newShareToken,
  saveQuote,
  shareUrl,
  STATUSES,
  TEMPLATES,
  whatsappText,
  whatsappUrl,
  withStatus,
  type Party,
  type Quote,
  type Status,
} from "@/lib/quotes";
import {
  defaultSettings,
  docTerms,
  loadCatalog,
  loadClients,
  loadSettings,
  newClient,
  partyErrors,
  partyOf,
  quoteDefaults,
  saveClient,
  type CatalogItem,
  type Client,
  type Settings,
} from "@/lib/store";
import { isTrialLimit, showPaywall, trialQuotesLeft } from "@/lib/trial";
import { errorMessage } from "@/lib/storage";
import {
  deliveryNoteFromQuote,
  depositInvoiceFromQuote,
  finalInvoiceOf,
  invoiceFromQuote,
  loadInvoices,
  proformaFromQuote,
  saveInvoice,
  type DocLabels,
  type Invoice,
} from "@/lib/invoices";
import { Dropdown } from "@/components/Dropdown";
import { DatePicker } from "@/components/DatePicker";
import { WatermarkControls } from "@/components/WatermarkControls";
import { chooseTemplate, normalizeWatermark, templateValue } from "@/lib/design";

export const Route = createFileRoute("/devis/$id")({
  head: ({ match }) => pageMeta(match, "editor"),
  validateSearch: (s: Record<string, unknown>): { client?: string } =>
    typeof s["client"] === "string" ? { client: s["client"] } : {},
  component: Editor,
});

type ValidationKey = string;

/** Field → validation code (translated under "validation"). */
function quoteErrors(q: Quote) {
  const e: Record<string, ValidationKey> = {};
  if (!q.company.name.trim()) e["company.name"] = "companyName";
  for (const [k, v] of Object.entries(partyErrors(q.company)))
    if (k !== "name") e[`company.${k}`] = v;
  for (const [k, v] of Object.entries(partyErrors(q.client)))
    e[`client.${k}`] = k === "name" ? "clientName" : v;
  if (!q.lines.some((l) => l.description.trim())) e["lines"] = "lines";
  if (!q.issueDate) e["issueDate"] = "date";
  if (!q.validUntil) e["validUntil"] = "date";
  else if (q.issueDate && q.validUntil < q.issueDate) e["validUntil"] = "validUntil";
  if (needsExemptionNote(q.lines) && !q.exemptionNote.trim()) e["exemptionNote"] = "exemption";
  return e;
}

function Editor() {
  const { t } = useTranslation();
  const { fmt, locale } = useLocale();
  const { id } = Route.useParams();
  const { client: preselect } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState<Quote | null>(null);
  const [missing, setMissing] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  // Local test toolbar (vite dev only): fill or clear the quote being edited.
  const devFill = useRef<((a: DevAction) => void) | null>(null);
  useDevFill("quote", (a) => devFill.current?.(a));
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const editorView = useEditorView();
  const [dirty, setDirtyState] = useState(false);
  // The blocker reads a ref so a save followed by navigate() is not blocked by a stale render.
  const dirtyRef = useRef(false);
  const setDirty = (v: boolean) => {
    dirtyRef.current = v;
    setDirtyState(v);
  };
  const [saved, setSaved] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const all = loadQuotes();
    const s = loadSettings();
    setSettings(s);
    setClients(loadClients());
    setCatalog(loadCatalog());
    setInvoices(loadInvoices());
    setDirty(false);
    setSaved(false);
    setTried(false);
    if (id === "nouveau") {
      // Free trial used up: the payment pop-up instead of a new quote.
      if (trialQuotesLeft(all.length) === 0) {
        showPaywall();
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      const fresh = newQuote(all, quoteDefaults(s));
      const c = loadClients().find((x) => x.id === preselect);
      setQ(
        c
          ? {
              ...fresh,
              clientId: c.id,
              client: partyOf(c),
              ...(c.paymentTerms ? { terms: c.paymentTerms } : {}),
            }
          : fresh,
      );
      setMissing(false);
    } else {
      const found = all.find((x) => x.id === id) ?? null;
      setQ(found);
      setMissing(!found);
    }
  }, [id, preselect, navigate]);

  useBlocker({
    shouldBlockFn: async () =>
      dirtyRef.current &&
      !(await askConfirm({ title: t("common.unsavedLeave"), confirmLabel: t("common.leave") })),
    enableBeforeUnload: () => dirtyRef.current,
  });

  const errors = useMemo(() => (q ? quoteErrors(q) : {}), [q]);
  const tot = useMemo(() => (q ? quoteTotals(q) : null), [q]);

  if (missing)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">{t("editor.notFoundTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("editor.notFoundText")}</p>
          <Link to="/dashboard" className="btn btn-primary mt-6">
            {t("editor.backToQuotes")}
          </Link>
        </main>
      </div>
    );
  if (!q || !tot) return <p className="p-8 text-sm text-muted-foreground">{t("common.loading")}</p>;

  const update = (patch: Partial<Quote>) => {
    setQ({ ...q, ...patch });
    setDirty(true);
    setSaved(false);
  };
  devFill.current = (a) => {
    if (!import.meta.env.DEV) return;
    if (a === "clear")
      update({ client: emptyParty(), lines: [newLine(settings.defaultVat)], delivery: "" });
    else if (import.meta.env.DEV)
      void import("@/dev/mock").then(({ mockClient, mockLines }) =>
        update({ client: mockClient(), lines: mockLines(), delivery: "2 semaines" }),
      );
  };
  const setParty = (who: "company" | "client", patch: Partial<Party>) =>
    update({ [who]: { ...q[who], ...patch } } as Partial<Quote>);
  const err = (k: string) =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const invalid = Object.keys(errors).length > 0;
  const linked = clients.find((c) => c.id === q.clientId);
  const linkedChanged = linked && JSON.stringify(partyOf(linked)) !== JSON.stringify(q.client);

  const save = () => {
    setTried(true);
    if (invalid) {
      toast.error(t("editor.notSaved"), { description: t("common.fixFields") });
      return null;
    }
    try {
      const s = saveQuote(q);
      if (s.number !== q.number) toast.info(t("editor.numberTaken", { number: s.number }));
      setQ(s);
      setDirty(false);
      setSaved(true);
      if (id === "nouveau")
        navigate({ to: "/devis/$id", params: { id: s.id }, search: {}, replace: true });
      return s;
    } catch (e) {
      if (isTrialLimit(e)) showPaywall();
      else toast.error(errorMessage(e, t));
      return null;
    }
  };

  const pickClient = (cid: string) => {
    const c = clients.find((x) => x.id === cid);
    if (!c) {
      const { clientId: _c, ...rest } = q;
      setQ(rest);
      setDirty(true);
      return;
    }
    update({
      clientId: c.id,
      client: partyOf(c),
      ...(c.paymentTerms ? { terms: c.paymentTerms } : {}),
    });
  };

  const storeClient = () => {
    const pe = partyErrors(q.client);
    if (Object.keys(pe).length) {
      setTried(true);
      toast.error(t("editor.completeClient"));
      return;
    }
    try {
      const c: Client = linked
        ? { ...linked, ...q.client }
        : { ...newClient(), ...q.client, paymentTerms: q.terms };
      saveClient(c);
      setClients(loadClients());
      update({ clientId: c.id });
      toast.success(linked ? t("editor.clientUpdated") : t("editor.clientAdded"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const duplicate = async () => {
    if (
      dirty &&
      !(await askConfirm({
        title: t("editor.confirmDuplicateDirty"),
        confirmLabel: t("common.duplicate"),
      }))
    )
      return;
    try {
      const all = loadQuotes();
      const source = all.find((x) => x.id === q.id) ?? q;
      const copy = saveQuote(duplicateQuote(source, all));
      setDirty(false);
      toast.success(t("dashboard.copied", { number: copy.number }));
      navigate({ to: "/devis/$id", params: { id: copy.id }, search: {} });
    } catch (e) {
      if (isTrialLimit(e)) showPaywall();
      else toast.error(errorMessage(e, t));
    }
  };

  const invoice = finalInvoiceOf(q.id, invoices);
  /** Creates an invoice-list document from the saved quote and opens it. */
  const createDoc = (kind: "final" | "acompte" | "proforma" | "livraison") => {
    const stored = loadQuotes().find((x) => x.id === q.id);
    if (!stored || dirty) {
      toast.error(t("editor.saveBeforeConvert"));
      return;
    }
    const all = loadInvoices();
    if ((kind === "final" || kind === "acompte") && finalInvoiceOf(q.id, all)) {
      toast.error(t("docs.finalExists"));
      return;
    }
    // Line texts are written in the document language, like the rest of the document.
    const lang = stored.lang ?? "fr";
    const dt = tFor(lang);
    const df = makeFormat(lang);
    const labels: DocLabels = {
      deposit: (pct, quote, rate) =>
        dt("docs.depositLine", { pct: df.percent(pct), quote, rate: df.percent(rate) }),
      deduction: (inv, rate) => dt("docs.deductionLine", { invoice: inv, rate: df.percent(rate) }),
    };
    try {
      if (kind === "acompte" && !(stored.deposit > 0 && stored.deposit < 100))
        throw new Error(t("docs.depositInvalid"));
      const draft =
        kind === "final"
          ? invoiceFromQuote(stored, all, labels)
          : kind === "acompte"
            ? depositInvoiceFromQuote(stored, stored.deposit, labels)
            : kind === "proforma"
              ? proformaFromQuote(stored)
              : deliveryNoteFromQuote(stored);
      saveInvoice(draft);
      toast.success(
        t(
          kind === "final"
            ? "editor.invoiceCreated"
            : kind === "acompte"
              ? "docs.depositCreated"
              : kind === "proforma"
                ? "docs.proformaCreated"
                : "docs.deliveryNoteCreated",
        ),
      );
      navigate({ to: "/factures/$id", params: { id: draft.id } });
    } catch (e) {
      toast.error(e instanceof Error && !("code" in e) ? e.message : errorMessage(e, t));
    }
  };

  /** Saves the quote with its online link (created once), and returns it with the link. */
  const withShareLink = () => {
    let s = dirty || id === "nouveau" ? save() : q;
    if (!s) return null;
    if (!s.shareToken) {
      try {
        s = saveQuote({ ...s, shareToken: newShareToken() });
        setQ(s);
      } catch (e) {
        toast.error(errorMessage(e, t));
        return null;
      }
    }
    return { s, url: shareUrl(window.location.origin, s.shareToken!) };
  };

  const copyShareLink = async () => {
    const r = withShareLink();
    if (!r) return;
    try {
      await navigator.clipboard.writeText(r.url);
      toast.success(t("editor.shareCopied"), { description: r.url });
    } catch {
      // Copy blocked by the browser: show the link so it can be copied by hand.
      toast(t("editor.shareLink"), { description: r.url, duration: 30000 });
    }
  };

  const shareWhatsApp = () => {
    const r = withShareLink();
    if (!r) return;
    const { s } = r;
    // The message is written in the document language, like the PDF it accompanies, and carries
    // the link where the client reads and accepts the quote.
    const lang = s.lang ?? "fr";
    window.open(
      whatsappUrl(s.client.phone, whatsappText(s, tFor(lang), makeFormat(lang), r.url)),
      "_blank",
      "noopener",
    );
    toast(t("editor.waPrepared"), {
      description: t("editor.waNoLink"),
      duration: 10000,
      ...(s.status === "brouillon"
        ? {
            action: {
              label: t("editor.markSent"),
              onClick: () => {
                try {
                  const next = saveQuote(withStatus(s, "envoye"));
                  setQ(next);
                } catch (e) {
                  toast.error(errorMessage(e, t));
                }
              },
            },
          }
        : {}),
    });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <ProductTour tour="editor" />

      <main className="print-page mx-auto grid max-w-[1400px] gap-8 px-4 pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-6">
        <MobileViewSwitch view={editorView.view} onChange={editorView.setView} />
        <div className={`no-print min-w-0 space-y-8 ${editorView.formClass}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label">{t("editor.quoteLabel")}</span>
              <h1 className="num text-xl font-semibold">
                <bdi>{q.number}</bdi>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2" data-tour="share">
              <button
                className="btn btn-ghost w-10 px-0"
                onClick={async () => {
                  await editorView.showPreview();
                  window.print();
                }}
                aria-label={t("common.printPdf")}
                title={`${t("common.printPdf")} — ${t("common.printHint")}`}
              >
                <Printer className="size-4" />
              </button>
              <DownloadPdfButton
                beforeRender={editorView.showPreview}
                fileName={`${t("editor.quoteLabel")} ${q.number}`}
              />
              <button
                className="btn btn-ghost w-10 px-0"
                onClick={copyShareLink}
                aria-label={t("editor.shareLink")}
                title={t("editor.shareLinkHint")}
              >
                <Link2 className="size-4" />
              </button>
              <button className="btn btn-ghost" onClick={shareWhatsApp}>
                <WhatsAppIcon className="size-4 text-[#25D366]" /> {t("editor.whatsapp")}
              </button>
              {id !== "nouveau" && (
                <button
                  className="btn btn-ghost w-10 px-0"
                  onClick={duplicate}
                  aria-label={t("common.duplicate")}
                  title={t("common.duplicate")}
                >
                  <Copy className="size-4" />
                </button>
              )}
              {invoice && (
                <Link to="/factures/$id" params={{ id: invoice.id }} className="btn btn-ghost">
                  <Receipt className="size-4" />{" "}
                  {invoice.number
                    ? t("editor.invoiceLink", { number: invoice.number })
                    : t("editor.invoiceDraftLink")}
                </Link>
              )}
              {id !== "nouveau" && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={`btn ${q.status === "accepte" && !invoice ? "btn-accent" : "btn-ghost"}`}
                    disabled={dirty}
                    title={dirty ? t("editor.saveFirst") : undefined}
                  >
                    <Receipt className="size-4" /> {t("docs.create")}
                    <ChevronDown className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    {q.status === "accepte" && !invoice && (
                      <>
                        <DropdownMenuItem onSelect={() => createDoc("final")}>
                          <Receipt /> {t("docs.createFinal")}
                        </DropdownMenuItem>
                        {q.deposit > 0 && (
                          <DropdownMenuItem onSelect={() => createDoc("acompte")}>
                            <Receipt /> {t("docs.createDeposit")} ({fmt.percent(q.deposit)})
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    <DropdownMenuItem onSelect={() => createDoc("proforma")}>
                      <FileText /> {t("docs.createProforma")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => createDoc("livraison")}>
                      <Truck /> {t("docs.createDeliveryNote")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {id !== "nouveau" && (
                <DriveDocStatus
                  kind="devis"
                  id={q.id}
                  doc={q}
                  date={q.issueDate}
                  fileName={driveFileName(q.number, q.client.name, tot.ttc)}
                  auto={q.status !== "brouillon"}
                  dirty={dirty}
                />
              )}
            </div>
          </div>

          {q.acceptedBy && q.acceptedAt && (
            <p className="flex items-start gap-2 border border-primary bg-card p-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              {t("editor.acceptedOnline", {
                name: q.acceptedBy,
                date: fmt.date(q.acceptedAt.slice(0, 10)),
              })}
            </p>
          )}

          {tried && invalid && (
            <div role="alert" className="border border-destructive bg-card p-3 text-sm">
              <p className="font-medium text-destructive">{t("editor.fixBeforeSave")}</p>
              <ul className="mt-1 list-disc ps-5 text-muted-foreground">
                {[...new Set(Object.values(errors))].map((m) => (
                  <li key={m}>{t(`validation.${m}` as never)}</li>
                ))}
              </ul>
            </div>
          )}

          <Section title={t("editor.sectionDocument")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <F label={t("editor.status")} id="status">
                <Dropdown
                  id="status"
                  value={q.status}
                  onChange={(v) => update(withStatus(q, v as Status))}
                  options={STATUSES.map((k) => ({ value: k, label: t(`status.quote.${k}`) }))}
                />
              </F>
              <F label={t("editor.issueDate")} id="issue" error={err("issueDate")}>
                <DatePicker
                  id="issue"
                  value={q.issueDate}
                  invalid={!!err("issueDate")}
                  onChange={(v) => update({ issueDate: v })}
                />
              </F>
              <F label={t("editor.validUntil")} id="valid" error={err("validUntil")}>
                <DatePicker
                  id="valid"
                  value={q.validUntil}
                  min={q.issueDate}
                  invalid={!!err("validUntil")}
                  onChange={(v) => update({ validUntil: v })}
                />
              </F>
              <F label={t("editor.docLang")} id="doc-lang" hint={t("editor.docLangHint")}>
                <Dropdown
                  id="doc-lang"
                  value={q.lang ?? "fr"}
                  onChange={(v) => {
                    const lang = v as Locale;
                    const before = q.lang ?? "fr";
                    // Untouched default terms follow the new language; edited terms are kept.
                    const terms =
                      q.terms === tFor(before)("defaults.terms")
                        ? docTerms(settings, lang)
                        : q.terms;
                    update({ lang, terms });
                  }}
                  options={LOCALES.map((l) => ({ value: l, label: NATIVE_NAME[l] }))}
                />
              </F>
            </div>
          </Section>

          <Section title={t("editor.sectionClient")} tour="client">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <F label={t("editor.pickClient")} id="client-pick">
                <Dropdown
                  id="client-pick"
                  value={q.clientId ?? ""}
                  onChange={pickClient}
                  options={[
                    {
                      value: "",
                      label: clients.length ? t("editor.freeEntry") : t("editor.noSavedClients"),
                    },
                    ...[...clients]
                      .sort((a, b) => a.name.localeCompare(b.name, locale))
                      .map((c) => ({
                        value: c.id,
                        label: c.name,
                        ...(c.city ? { hint: c.city } : {}),
                      })),
                  ]}
                />
              </F>
              {(!linked || linkedChanged) && q.client.name.trim() && (
                <button type="button" className="btn btn-ghost" onClick={storeClient}>
                  <UserPlus className="size-4" />{" "}
                  {linked ? t("editor.updateClient") : t("editor.saveClient")}
                </button>
              )}
            </div>
            <PartyFields who="client" p={q.client} set={(p) => setParty("client", p)} err={err} />
          </Section>

          <Section
            collapsible
            forceOpen={tried && !!errors["company.name"]}
            title={t("editor.sectionCompany")}
            aside={
              <Link
                to="/modeles"
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                {t("editor.logoLink")}
              </Link>
            }
          >
            <PartyFields
              who="company"
              p={q.company}
              set={(p) => setParty("company", p)}
              err={err}
              compact
            />
          </Section>

          <Section title={t("editor.sectionLines")} tour="lines">
            {err("lines") && <p className="mb-2 text-xs text-destructive">{err("lines")}</p>}
            <LinesEditor
              lines={q.lines}
              onChange={(lines) => update({ lines })}
              vatRates={settings.vatRates}
              defaultVat={settings.defaultVat}
              catalog={catalog}
              showKind={q.template === "btp"}
            />
          </Section>

          <Section title={t("editor.sectionTotals")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <F
                label={t("editor.globalDiscount")}
                id="gdisc"
                hint={t("editor.globalDiscountHint")}
              >
                <input
                  id="gdisc"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  dir="ltr"
                  className="field num text-end"
                  value={q.globalDiscount}
                  onChange={(e) =>
                    update({
                      globalDiscount: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </F>
              <F label={t("editor.deposit")} id="deposit" hint={t("editor.depositHint")}>
                <input
                  id="deposit"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  dir="ltr"
                  className="field num text-end"
                  value={q.deposit}
                  onChange={(e) =>
                    update({ deposit: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                  }
                />
              </F>
            </div>
            {(needsExemptionNote(q.lines) || q.exemptionNote) && (
              <F
                label={t("editor.exemption")}
                id="exempt"
                error={err("exemptionNote")}
                hint={t("editor.exemptionHint")}
              >
                <input
                  id="exempt"
                  className="field"
                  aria-invalid={!!err("exemptionNote")}
                  value={q.exemptionNote}
                  placeholder={t("editor.exemptionPlaceholder")}
                  dir="auto"
                  onChange={(e) => update({ exemptionNote: e.target.value })}
                />
              </F>
            )}
            <dl className="mt-1 space-y-1 border-t pt-3 text-sm" data-tour="totals">
              {tot.discount > 0 && (
                <TotalRow k={t("doc.discounts")} v={"− " + fmt.money(tot.discount)} />
              )}
              <TotalRow k={t("doc.totalHt")} v={fmt.money(tot.ht)} />
              {tot.byRate.map((r) => (
                <TotalRow
                  key={r.rate}
                  k={t("doc.vat", { rate: fmt.percent(r.rate) })}
                  v={fmt.money(r.tva)}
                />
              ))}
              <TotalRow k={t("doc.totalTtc")} v={fmt.money(tot.ttc)} strong />
              {q.deposit > 0 && (
                <TotalRow
                  k={t("doc.depositShort", { pct: fmt.percent(q.deposit) })}
                  v={fmt.money(tot.deposit)}
                />
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                {t("doc.wordsInline", { words: amountInWords(tot.ttc, locale) })}
              </p>
            </dl>
          </Section>

          <Section collapsible title={t("editor.sectionTerms")}>
            <F label={t("editor.terms")} id="terms">
              <textarea
                id="terms"
                dir="auto"
                rows={3}
                className="field h-auto py-2"
                value={q.terms}
                onChange={(e) => update({ terms: e.target.value })}
              />
            </F>
            <F label={t("editor.delivery")} id="delivery">
              <input
                id="delivery"
                className="field"
                placeholder={t("editor.deliveryPlaceholder")}
                dir="auto"
                value={q.delivery}
                onChange={(e) => update({ delivery: e.target.value })}
              />
            </F>
          </Section>

          <Section collapsible title={t("editor.sectionLayout")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label={t("editor.template")} id="tpl">
                <Dropdown
                  id="tpl"
                  value={templateValue(q, settings.customTemplates)}
                  onChange={(v) => {
                    setQ(chooseTemplate(q, v, settings.customTemplates));
                    setDirty(true);
                    setSaved(false);
                  }}
                  options={[
                    ...settings.customTemplates.map((c) => ({
                      value: "custom:" + c.id,
                      label: c.name,
                      hint: t("templates.mineHint"),
                    })),
                    ...TEMPLATES.map((x) => ({
                      value: x.id,
                      label: t(`templates.names.${x.id}.name`),
                      hint: t(`templates.names.${x.id}.hint`),
                    })),
                  ]}
                />
              </F>
              <AccentPicker value={q.accent} onChange={(accent) => update({ accent })} />
            </div>
          </Section>

          <Section collapsible title={t("editor.sectionWatermark")}>
            <WatermarkControls
              value={normalizeWatermark(q.watermark)}
              onChange={(watermark) => update({ watermark })}
              hasLogo={!!settings.logo}
            />
          </Section>

          <SaveBar dirty={dirty || id === "nouveau"} saved={saved}>
            <button
              className="btn btn-primary px-6"
              onClick={save}
              disabled={!dirty && id !== "nouveau"}
            >
              {t("common.save")}
            </button>
          </SaveBar>
        </div>

        <div
          className={`min-w-0 lg:sticky lg:top-6 lg:self-start ${editorView.previewClass}`}
          data-tour="preview"
        >
          <p className="no-print mb-2 text-xs text-muted-foreground">{t("common.previewA4")}</p>
          <A4Preview
            d={{ ...q, kind: "devis", secondDate: q.validUntil, logo: settings.logo }}
            onWatermarkChange={(watermark) => update({ watermark })}
          />
        </div>
      </main>
    </div>
  );
}
