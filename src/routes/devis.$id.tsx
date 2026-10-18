import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Printer, Receipt, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/Brand";
import { LinesEditor } from "@/components/LinesEditor";
import { A4Preview } from "@/components/QuoteDocument";
import { AccentPicker, F, PartyFields, Section, TotalRow } from "@/components/Form";
import {
  amountInWords,
  duplicateQuote,
  loadQuotes,
  mad,
  needsExemptionNote,
  newQuote,
  quoteTotals,
  saveQuote,
  STATUS_LABEL,
  TEMPLATES,
  whatsappText,
  whatsappUrl,
  withStatus,
  type Party,
  type Quote,
  type Status,
  type TemplateId,
} from "@/lib/quotes";
import {
  defaultSettings,
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
import { errorMessage } from "@/lib/storage";
import { invoiceFromQuote, loadInvoices, saveInvoice, type Invoice } from "@/lib/invoices";

export const Route = createFileRoute("/devis/$id")({
  head: () => ({
    meta: [
      { title: "Éditeur de devis — DevisPlus.ma" },
      {
        name: "description",
        content: "Saisissez client, lignes et conditions ; l'aperçu A4 se met à jour en direct.",
      },
      { property: "og:title", content: "Éditeur de devis — DevisPlus.ma" },
      { property: "og:description", content: "Éditeur de devis avec aperçu A4 en direct." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { client?: string } =>
    typeof s["client"] === "string" ? { client: s["client"] } : {},
  component: Editor,
});

function quoteErrors(q: Quote) {
  const e: Record<string, string> = {};
  if (!q.company.name.trim()) e["company.name"] = "Indiquez la raison sociale de votre entreprise";
  for (const [k, v] of Object.entries(partyErrors(q.company)))
    if (k !== "name") e[`company.${k}`] = v;
  for (const [k, v] of Object.entries(partyErrors(q.client)))
    e[`client.${k}`] = k === "name" ? "Indiquez le client" : v;
  if (!q.lines.some((l) => l.description.trim()))
    e["lines"] = "Ajoutez au moins une ligne avec une désignation";
  if (!q.issueDate) e["issueDate"] = "Date requise";
  if (!q.validUntil) e["validUntil"] = "Date requise";
  else if (q.issueDate && q.validUntil < q.issueDate)
    e["validUntil"] = "Doit être postérieure à la date du devis";
  if (needsExemptionNote(q.lines) && !q.exemptionNote.trim())
    e["exemptionNote"] = "Une ligne est à 0 % : précisez le motif d'exonération";
  return e;
}

function Editor() {
  const { id } = Route.useParams();
  const { client: preselect } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState<Quote | null>(null);
  const [missing, setMissing] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
  }, [id, preselect]);

  useBlocker({
    shouldBlockFn: () =>
      dirtyRef.current &&
      !confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?"),
    enableBeforeUnload: () => dirtyRef.current,
  });

  const errors = useMemo(() => (q ? quoteErrors(q) : {}), [q]);
  const t = useMemo(() => (q ? quoteTotals(q) : null), [q]);

  if (missing)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Devis introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Il a peut-être été supprimé, ou enregistré dans un autre navigateur.
          </p>
          <Link to="/dashboard" className="btn btn-primary mt-6">
            Retour à mes devis
          </Link>
        </main>
      </div>
    );
  if (!q || !t) return <p className="p-8 text-sm text-muted-foreground">Chargement…</p>;

  const update = (patch: Partial<Quote>) => {
    setQ({ ...q, ...patch });
    setDirty(true);
    setSaved(false);
  };
  const setParty = (who: "company" | "client", patch: Partial<Party>) =>
    update({ [who]: { ...q[who], ...patch } } as Partial<Quote>);
  const err = (k: string) => (tried ? errors[k] : undefined);
  const invalid = Object.keys(errors).length > 0;
  const linked = clients.find((c) => c.id === q.clientId);
  const linkedChanged = linked && JSON.stringify(partyOf(linked)) !== JSON.stringify(q.client);

  const save = () => {
    setTried(true);
    if (invalid) {
      toast.error("Le devis n'est pas enregistré", {
        description: "Corrigez les champs signalés en rouge.",
      });
      return null;
    }
    try {
      const s = saveQuote(q);
      if (s.number !== q.number) toast.info(`Numéro déjà utilisé : le devis devient ${s.number}.`);
      setQ(s);
      setDirty(false);
      setSaved(true);
      if (id === "nouveau")
        navigate({ to: "/devis/$id", params: { id: s.id }, search: {}, replace: true });
      return s;
    } catch (e) {
      toast.error(errorMessage(e));
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
      toast.error("Complétez la fiche client avant de l'enregistrer.");
      return;
    }
    try {
      const c: Client = linked
        ? { ...linked, ...q.client }
        : { ...newClient(), ...q.client, paymentTerms: q.terms };
      saveClient(c);
      setClients(loadClients());
      update({ clientId: c.id });
      toast.success(linked ? "Fiche client mise à jour." : "Client ajouté à votre liste.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const duplicate = () => {
    if (dirty && !confirm("Les modifications non enregistrées ne seront pas copiées. Continuer ?"))
      return;
    try {
      const all = loadQuotes();
      const source = all.find((x) => x.id === q.id) ?? q;
      const copy = saveQuote(duplicateQuote(source, all));
      setDirty(false);
      toast.success(`Copie créée : ${copy.number}`);
      navigate({ to: "/devis/$id", params: { id: copy.id }, search: {} });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const invoice = invoices.find((x) => x.quoteId === q.id);
  const convert = () => {
    const stored = loadQuotes().find((x) => x.id === q.id);
    if (!stored || dirty) {
      toast.error("Enregistrez le devis avant de le convertir.");
      return;
    }
    if (loadInvoices().some((x) => x.quoteId === q.id)) {
      toast.error("Ce devis a déjà une facture.");
      return;
    }
    try {
      const draft = invoiceFromQuote(stored);
      saveInvoice(draft);
      toast.success("Brouillon de facture créé. Le devis reste inchangé.");
      navigate({ to: "/factures/$id", params: { id: draft.id } });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const shareWhatsApp = () => {
    const s = dirty || id === "nouveau" ? save() : q;
    if (!s) return;
    window.open(whatsappUrl(s.client.phone, whatsappText(s)), "_blank", "noopener");
    toast("Message WhatsApp préparé", {
      description:
        "Aucun lien n'est partagé : joignez le PDF du devis dans la conversation avant d'envoyer.",
      duration: 10000,
      ...(s.status === "brouillon"
        ? {
            action: {
              label: "Marquer envoyé",
              onClick: () => {
                try {
                  const next = saveQuote(withStatus(s, "envoye"));
                  setQ(next);
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              },
            },
          }
        : {}),
    });
  };

  return (
    <div className="min-h-screen">
      <AppHeader>
        {saved && !dirty && (
          <span
            className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex"
            role="status"
          >
            <Check className="size-4" /> Enregistré
          </span>
        )}
        {dirty && (
          <span className="hidden text-sm text-muted-foreground sm:inline" role="status">
            Non enregistré
          </span>
        )}
        <button className="btn btn-primary" onClick={save} disabled={!dirty && id !== "nouveau"}>
          Enregistrer
        </button>
      </AppHeader>

      <main className="mx-auto grid max-w-[1400px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="no-print min-w-0 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label">Devis</span>
              <h1 className="num text-xl font-semibold">{q.number}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => window.print()}
                title="Choisissez « Enregistrer au format PDF » pour télécharger le fichier"
              >
                <Printer className="size-4" /> PDF / Imprimer
              </button>
              <button className="btn btn-ghost" onClick={shareWhatsApp}>
                <MessageCircle className="size-4" /> WhatsApp
              </button>
              {id !== "nouveau" && (
                <button className="btn btn-ghost" onClick={duplicate}>
                  <Copy className="size-4" /> Dupliquer
                </button>
              )}
              {invoice ? (
                <Link to="/factures/$id" params={{ id: invoice.id }} className="btn btn-ghost">
                  <Receipt className="size-4" /> Facture {invoice.number || "(brouillon)"}
                </Link>
              ) : (
                q.status === "accepte" &&
                id !== "nouveau" && (
                  <button
                    className="btn btn-accent"
                    onClick={convert}
                    disabled={dirty}
                    title={dirty ? "Enregistrez d'abord le devis" : undefined}
                  >
                    <Receipt className="size-4" /> Convertir en facture
                  </button>
                )
              )}
            </div>
          </div>

          {tried && invalid && (
            <div role="alert" className="border border-destructive bg-card p-3 text-sm">
              <p className="font-medium text-destructive">À corriger avant d'enregistrer :</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {[...new Set(Object.values(errors))].map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <Section title="Document">
            <div className="grid gap-3 sm:grid-cols-3">
              <F label="Statut" id="status">
                <select
                  id="status"
                  className="field"
                  value={q.status}
                  onChange={(e) => update(withStatus(q, e.target.value as Status))}
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Date du devis" id="issue" error={err("issueDate")}>
                <input
                  id="issue"
                  type="date"
                  className="field"
                  aria-invalid={!!err("issueDate")}
                  value={q.issueDate}
                  onChange={(e) => update({ issueDate: e.target.value })}
                />
              </F>
              <F label="Valable jusqu'au" id="valid" error={err("validUntil")}>
                <input
                  id="valid"
                  type="date"
                  className="field"
                  aria-invalid={!!err("validUntil")}
                  value={q.validUntil}
                  onChange={(e) => update({ validUntil: e.target.value })}
                />
              </F>
            </div>
          </Section>

          <Section title="Client">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <F label="Choisir un client enregistré" id="client-pick">
                <select
                  id="client-pick"
                  className="field"
                  value={q.clientId ?? ""}
                  onChange={(e) => pickClient(e.target.value)}
                >
                  <option value="">
                    {clients.length ? "— Saisie libre —" : "Aucun client enregistré"}
                  </option>
                  {[...clients]
                    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.city ? ` — ${c.city}` : ""}
                      </option>
                    ))}
                </select>
              </F>
              {(!linked || linkedChanged) && q.client.name.trim() && (
                <button type="button" className="btn btn-ghost" onClick={storeClient}>
                  <UserPlus className="size-4" />{" "}
                  {linked ? "Mettre à jour la fiche" : "Enregistrer ce client"}
                </button>
              )}
            </div>
            <PartyFields who="client" p={q.client} set={(p) => setParty("client", p)} err={err} />
          </Section>

          <Section
            title="Votre entreprise"
            aside={
              <Link
                to="/modeles"
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                Logo et modèle par défaut
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

          <Section title="Prestations">
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

          <Section title="Remise, TVA et acompte">
            <div className="grid gap-3 sm:grid-cols-2">
              <F
                label="Remise globale (%)"
                id="gdisc"
                hint="Appliquée au total HT après les remises de ligne."
              >
                <input
                  id="gdisc"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className="field num text-right"
                  value={q.globalDiscount}
                  onChange={(e) =>
                    update({
                      globalDiscount: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </F>
              <F label="Acompte à la commande (%)" id="deposit" hint="Calculé sur le total TTC.">
                <input
                  id="deposit"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className="field num text-right"
                  value={q.deposit}
                  onChange={(e) =>
                    update({ deposit: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                  }
                />
              </F>
            </div>
            {(needsExemptionNote(q.lines) || q.exemptionNote) && (
              <F
                label="Motif d'exonération de TVA"
                id="exempt"
                error={err("exemptionNote")}
                hint="Imprimé sur le devis pour les lignes à 0 %, avec la référence du texte applicable."
              >
                <input
                  id="exempt"
                  className="field"
                  aria-invalid={!!err("exemptionNote")}
                  value={q.exemptionNote}
                  placeholder="Ex. : Exonéré de TVA en vertu de l'article … du CGI"
                  onChange={(e) => update({ exemptionNote: e.target.value })}
                />
              </F>
            )}
            <dl className="mt-1 space-y-1 border-t pt-3 text-sm">
              {t.discount > 0 && <TotalRow k="Remises" v={"− " + mad(t.discount)} />}
              <TotalRow k="Total HT" v={mad(t.ht)} />
              {t.byRate.map((r) => (
                <TotalRow key={r.rate} k={`TVA ${r.rate} %`} v={mad(r.tva)} />
              ))}
              <TotalRow k="Total TTC" v={mad(t.ttc)} strong />
              {q.deposit > 0 && <TotalRow k={`Acompte ${q.deposit} %`} v={mad(t.deposit)} />}
              <p className="pt-1 text-xs text-muted-foreground">{amountInWords(t.ttc)} TTC</p>
            </dl>
          </Section>

          <Section title="Conditions">
            <F label="Conditions de paiement" id="terms">
              <textarea
                id="terms"
                rows={3}
                className="field h-auto py-2"
                value={q.terms}
                onChange={(e) => update({ terms: e.target.value })}
              />
            </F>
            <F label="Délai de livraison ou d'exécution" id="delivery">
              <input
                id="delivery"
                className="field"
                placeholder="Ex. : 3 semaines à compter de l'acompte"
                value={q.delivery}
                onChange={(e) => update({ delivery: e.target.value })}
              />
            </F>
          </Section>

          <Section title="Mise en page">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Modèle" id="tpl">
                <select
                  id="tpl"
                  className="field"
                  value={q.template}
                  onChange={(e) => update({ template: e.target.value as TemplateId })}
                >
                  {TEMPLATES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — {x.hint}
                    </option>
                  ))}
                </select>
              </F>
              <AccentPicker value={q.accent} onChange={(accent) => update({ accent })} />
            </div>
          </Section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <p className="no-print mb-2 text-xs text-muted-foreground">
            Aperçu A4 — ce qui sera imprimé ou enregistré en PDF
          </p>
          <A4Preview d={{ ...q, kind: "devis", secondDate: q.validUntil, logo: settings.logo }} />
        </div>
      </main>
    </div>
  );
}
