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
  INVOICE_STATUS_LABEL,
  invoiceTotals,
  issueInvoice,
  loadInvoices,
  METHOD_LABEL,
  missingInvoiceMentions,
  paymentError,
  saveInvoice,
  type Invoice,
  type Payment,
  type PaymentMethod,
} from "@/lib/invoices";
import { amountInWords, fmtDate, mad, needsExemptionNote, today, uid } from "@/lib/quotes";
import {
  defaultSettings,
  loadCatalog,
  loadSettings,
  type CatalogItem,
  type Settings,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";

export const Route = createFileRoute("/factures/$id")({
  head: () => ({
    meta: [
      { title: "Facture — DevisPlus.ma" },
      { name: "description", content: "Brouillon de facture, émission et suivi des paiements." },
    ],
  }),
  component: InvoicePage,
});

function draftErrors(inv: Invoice) {
  const e: Record<string, string> = {};
  if (!inv.client.name.trim()) e["client"] = "Le client est requis";
  if (!inv.lines.some((l) => l.description.trim()))
    e["lines"] = "Ajoutez au moins une ligne avec une désignation";
  if (!inv.issueDate) e["issueDate"] = "Date requise";
  if (!inv.dueDate) e["dueDate"] = "Date requise";
  else if (inv.dueDate < inv.issueDate) e["dueDate"] = "Doit être postérieure à la date de facture";
  if (needsExemptionNote(inv.lines) && !inv.exemptionNote.trim())
    e["exemptionNote"] = "Une ligne est à 0 % : précisez le motif d'exonération";
  return e;
}

function InvoicePage() {
  const { id } = Route.useParams();
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
    shouldBlockFn: () =>
      dirtyRef.current &&
      !confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?"),
    enableBeforeUnload: () => dirtyRef.current,
  });

  const errors = useMemo(() => (inv ? draftErrors(inv) : {}), [inv]);
  const t = useMemo(() => (inv ? invoiceTotals(inv) : null), [inv]);

  if (missing)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Facture introuvable</h1>
          <Link to="/factures" className="btn btn-primary mt-6">
            Retour aux factures
          </Link>
        </main>
      </div>
    );
  if (!inv || !t) return <p className="p-8 text-sm text-muted-foreground">Chargement…</p>;

  const draft = inv.status === "brouillon";
  const err = (k: string) => (tried ? errors[k] : undefined);
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
      toast.error(errorMessage(e));
      return false;
    }
  };

  const saveDraft = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error("Brouillon non enregistré", { description: "Corrigez les champs signalés." });
      return;
    }
    if (save()) toast.success("Brouillon enregistré.");
  };

  const issue = () => {
    setTried(true);
    if (Object.keys(errors).length) {
      toast.error("Corrigez le brouillon avant de l'émettre.");
      return;
    }
    const gaps = missingInvoiceMentions(inv);
    const msg =
      "Émettre la facture ? Elle recevra un numéro définitif et ne pourra plus être modifiée ni supprimée." +
      (gaps.length ? `\n\nMentions manquantes :\n• ${gaps.join("\n• ")}` : "");
    if (!confirm(msg)) return;
    try {
      const issued = issueInvoice(inv, loadInvoices());
      if (save(issued)) toast.success(`Facture ${issued.number} émise.`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = () => {
    if (!confirm("Supprimer ce brouillon de facture ? Le devis d'origine n'est pas modifié."))
      return;
    try {
      deleteDraftInvoice(inv.id);
      setDirty(false);
      navigate({ to: "/factures" });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader>
        {draft && dirty && (
          <span className="hidden text-sm text-muted-foreground sm:inline" role="status">
            Non enregistré
          </span>
        )}
        {draft && (
          <button className="btn btn-ghost" onClick={saveDraft} disabled={!dirty}>
            Enregistrer
          </button>
        )}
        {draft && (
          <button className="btn btn-primary" onClick={issue} disabled={dirty}>
            Émettre
          </button>
        )}
      </AppHeader>

      <main className="mx-auto grid max-w-[1400px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="no-print min-w-0 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label">Facture · {INVOICE_STATUS_LABEL[inv.status]}</span>
              <h1 className="num text-xl font-semibold">{inv.number || "Brouillon"}</h1>
              {inv.quoteId && (
                <p className="text-sm text-muted-foreground">
                  Issue du devis{" "}
                  <Link
                    to="/devis/$id"
                    params={{ id: inv.quoteId }}
                    search={{}}
                    className="num underline underline-offset-2"
                  >
                    {inv.quoteNumber}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => window.print()}
                title="Choisissez « Enregistrer au format PDF » pour télécharger le fichier"
              >
                <Printer className="size-4" /> PDF / Imprimer
              </button>
              {draft && (
                <button
                  className="btn btn-ghost"
                  onClick={remove}
                  aria-label="Supprimer le brouillon"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>

          {draft ? (
            <p className="border border-dashed p-3 text-sm text-muted-foreground">
              Brouillon : il n'a pas de numéro et n'a pas de valeur comptable. « Émettre » attribue
              le numéro définitif et verrouille la facture.
              {dirty && " Enregistrez d'abord vos modifications."}
            </p>
          ) : (
            <p className="flex items-start gap-2 border bg-card p-3 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" /> Émise le {fmtDate(inv.issuedAt)}. Une
              facture émise n'est plus modifiable ; une correction passera par un avoir.
            </p>
          )}

          {draft && (
            <>
              <Section title="Dates">
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label="Date de facture" id="idate" error={err("issueDate")}>
                    <input
                      id="idate"
                      type="date"
                      className="field"
                      value={inv.issueDate}
                      onChange={(e) => update({ issueDate: e.target.value })}
                    />
                  </F>
                  <F label="Échéance" id="due" error={err("dueDate")}>
                    <input
                      id="due"
                      type="date"
                      className="field"
                      aria-invalid={!!err("dueDate")}
                      value={inv.dueDate}
                      onChange={(e) => update({ dueDate: e.target.value })}
                    />
                  </F>
                </div>
              </Section>
              <Section title="Prestations">
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
              <Section title="Remise, TVA et conditions">
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label="Remise globale (%)" id="igdisc">
                    <input
                      id="igdisc"
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      className="field num text-right"
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
                  <F label="Motif d'exonération de TVA" id="iexempt" error={err("exemptionNote")}>
                    <input
                      id="iexempt"
                      className="field"
                      aria-invalid={!!err("exemptionNote")}
                      value={inv.exemptionNote}
                      onChange={(e) => update({ exemptionNote: e.target.value })}
                    />
                  </F>
                )}
                <F label="Conditions de paiement" id="iterms">
                  <textarea
                    id="iterms"
                    rows={2}
                    className="field h-auto py-2"
                    value={inv.terms}
                    onChange={(e) => update({ terms: e.target.value })}
                  />
                </F>
              </Section>
            </>
          )}

          <Section title="Montants">
            <dl className="space-y-1 text-sm">
              <TotalRow k="Total HT" v={mad(t.ht)} />
              {t.byRate.map((r) => (
                <TotalRow key={r.rate} k={`TVA ${r.rate} %`} v={mad(r.tva)} />
              ))}
              <TotalRow k="Total TTC" v={mad(t.ttc)} strong />
              {!draft && (
                <>
                  <TotalRow k="Encaissé" v={mad(t.paid)} />
                  <TotalRow k="Reste à payer" v={mad(t.outstanding)} strong />
                </>
              )}
              <p className="pt-1 text-xs text-muted-foreground">{amountInWords(t.ttc)} TTC</p>
            </dl>
          </Section>

          {!draft && <Payments inv={inv} onSave={(next) => save(next)} />}
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <p className="no-print mb-2 text-xs text-muted-foreground">
            Aperçu A4 — ce qui sera imprimé ou enregistré en PDF
          </p>
          <A4Preview
            d={{
              ...inv,
              kind: "facture",
              secondDate: inv.dueDate,
              deposit: 0,
              logo: settings.logo,
              draft,
              quoteRef: inv.quoteNumber,
              paid: t.paid,
            }}
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
  const [p, setP] = useState<Payment>(blank);
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const e = paymentError(inv, p);
    setError(e);
    if (e) return;
    if (onSave({ ...inv, payments: [...inv.payments, p] })) {
      toast.success("Paiement enregistré.");
      setP({
        ...blank(),
        amount: Math.round((invoiceTotals(inv).outstanding - p.amount) * 100) / 100,
      });
    }
  };
  const removePayment = (pid: string) => {
    if (confirm("Supprimer ce paiement ?"))
      onSave({ ...inv, payments: inv.payments.filter((x) => x.id !== pid) });
  };
  const outstanding = invoiceTotals(inv).outstanding;

  return (
    <Section title="Paiements reçus">
      {inv.payments.length ? (
        <ul className="divide-y border bg-card text-sm">
          {inv.payments.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="num">{fmtDate(x.date)}</span> · {METHOD_LABEL[x.method]}
                {x.reference && <span className="text-muted-foreground"> · {x.reference}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="num font-medium">{mad(x.amount)}</span>
                <button
                  aria-label="Supprimer ce paiement"
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
        <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
      )}
      {outstanding > 0 ? (
        <div className="grid gap-3 border bg-card p-3 sm:grid-cols-2">
          <F label="Date" id="pdate">
            <input
              id="pdate"
              type="date"
              className="field"
              value={p.date}
              onChange={(e) => setP({ ...p, date: e.target.value })}
            />
          </F>
          <F label="Montant (DH)" id="pamount">
            <input
              id="pamount"
              type="number"
              min={0}
              step="0.01"
              className="field num text-right"
              value={p.amount}
              onChange={(e) => setP({ ...p, amount: Number(e.target.value) || 0 })}
            />
          </F>
          <F label="Mode" id="pmethod">
            <select
              id="pmethod"
              className="field"
              value={p.method}
              onChange={(e) => setP({ ...p, method: e.target.value as PaymentMethod })}
            >
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </F>
          <F label="Référence (n° de chèque, virement…)" id="pref">
            <input
              id="pref"
              className="field"
              value={p.reference}
              onChange={(e) => setP({ ...p, reference: e.target.value })}
            />
          </F>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">
                Reste à payer : {mad(outstanding)}
              </span>
            )}
            <button className="btn btn-primary" onClick={add}>
              Enregistrer le paiement
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium">Facture entièrement réglée.</p>
      )}
    </Section>
  );
}
