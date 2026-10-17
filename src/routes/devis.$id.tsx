import { createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Printer, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/Brand";
import { fmtDate, loadQuotes, mad, newQuote, saveQuote, STATUS_LABEL, totals, uid, type Quote, type Status } from "@/lib/quotes";

export const Route = createFileRoute("/devis/$id")({
  head: () => ({
    meta: [
      { title: "Éditeur de devis — DevisPlus.ma" },
      { name: "description", content: "Saisissez client, lignes et conditions ; l'aperçu A4 se met à jour en direct." },
      { property: "og:title", content: "Éditeur de devis — DevisPlus.ma" },
      { property: "og:description", content: "Éditeur de devis avec aperçu A4 en direct." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState<Quote | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const all = loadQuotes();
    setQ(id === "nouveau" ? newQuote(all) : all.find((x) => x.id === id) ?? newQuote(all));
  }, [id]);

  useBlocker({
    shouldBlockFn: () => dirty && !confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?"),
    enableBeforeUnload: () => dirty,
  });

  const t = useMemo(() => (q ? totals(q.lines, q.vatRate) : { ht: 0, tva: 0, ttc: 0 }), [q]);
  if (!q) return <p className="p-8 text-sm text-muted-foreground">Chargement…</p>;

  const update = (patch: Partial<Quote>) => { setQ({ ...q, ...patch }); setDirty(true); setSaved(false); };
  const setLine = (lid: string, patch: Partial<Quote["lines"][0]>) =>
    update({ lines: q.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });

  const invalid = !q.company.name.trim() || !q.client.name.trim();
  const save = () => {
    setTried(true);
    if (invalid) return;
    saveQuote(q); setDirty(false); setSaved(true);
    if (id === "nouveau") navigate({ to: "/devis/$id", params: { id: q.id }, replace: true });
  };

  return (
    <div className="min-h-screen">
      <AppHeader>
        {saved && <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex" role="status"><Check className="size-4" /> Enregistré</span>}
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer className="size-4" /> PDF</button>
        <button className="btn btn-primary" onClick={save} disabled={!dirty && id !== "nouveau"}>Enregistrer</button>
      </AppHeader>

      <main className="mx-auto grid max-w-[1400px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="no-print space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><span className="label">Devis</span><h1 className="num text-xl font-semibold">{q.number}</h1></div>
            <div className="flex gap-3">
              <div><label className="label" htmlFor="status">Statut</label>
                <select id="status" className="field" value={q.status} onChange={(e) => update({ status: e.target.value as Status })}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="label" htmlFor="valid">Valable jusqu'au</label>
                <input id="valid" type="date" className="field" value={q.validUntil} onChange={(e) => update({ validUntil: e.target.value })} /></div>
            </div>
          </div>

          <div className="grid gap-8 border-t pt-6 sm:grid-cols-2">
            {(["company", "client"] as const).map((who) => (
              <fieldset key={who} className="space-y-3">
                <legend className="mb-3 text-sm font-semibold">{who === "company" ? "Votre entreprise" : "Client"}</legend>
                <div><label className="label" htmlFor={`${who}-name`}>Raison sociale *</label>
                  <input id={`${who}-name`} className="field" aria-invalid={tried && !q[who].name.trim()} value={q[who].name}
                    onChange={(e) => update({ [who]: { ...q[who], name: e.target.value } } as Partial<Quote>)} />
                  {tried && !q[who].name.trim() && <p className="mt-1 text-xs text-destructive">Champ requis</p>}</div>
                <div><label className="label" htmlFor={`${who}-ice`}>ICE</label>
                  <input id={`${who}-ice`} className="field num" inputMode="numeric" maxLength={15} value={q[who].ice}
                    onChange={(e) => update({ [who]: { ...q[who], ice: e.target.value.replace(/\D/g, "") } } as Partial<Quote>)} /></div>
                <div><label className="label" htmlFor={`${who}-addr`}>Adresse</label>
                  <input id={`${who}-addr`} className="field" value={q[who].address}
                    onChange={(e) => update({ [who]: { ...q[who], address: e.target.value } } as Partial<Quote>)} /></div>
              </fieldset>
            ))}
          </div>

          <section className="border-t pt-6">
            <h2 className="mb-3 text-sm font-semibold">Prestations</h2>
            <div className="space-y-3">
              {q.lines.map((l, i) => (
                <div key={l.id} className="grid grid-cols-[1fr_70px_110px_36px] items-end gap-2">
                  <div><label className="label" htmlFor={`d-${l.id}`}>{i === 0 ? "Désignation" : <span className="sr-only">Désignation</span>}</label>
                    <input id={`d-${l.id}`} className="field" value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} /></div>
                  <div><label className="label" htmlFor={`q-${l.id}`}>{i === 0 ? "Qté" : <span className="sr-only">Qté</span>}</label>
                    <input id={`q-${l.id}`} type="number" min={0} className="field num text-right" value={l.qty} onChange={(e) => setLine(l.id, { qty: +e.target.value })} /></div>
                  <div><label className="label" htmlFor={`p-${l.id}`}>{i === 0 ? "P.U. HT" : <span className="sr-only">Prix unitaire</span>}</label>
                    <input id={`p-${l.id}`} type="number" min={0} step="0.01" className="field num text-right" value={l.unitPrice} onChange={(e) => setLine(l.id, { unitPrice: +e.target.value })} /></div>
                  <button aria-label="Supprimer la ligne" disabled={q.lines.length === 1} className="btn btn-ghost px-0"
                    onClick={() => update({ lines: q.lines.filter((x) => x.id !== l.id) })}><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost mt-3" onClick={() => update({ lines: [...q.lines, { id: uid(), description: "", qty: 1, unitPrice: 0 }] })}>
              <Plus className="size-4" /> Ajouter une ligne
            </button>
          </section>

          <section className="grid gap-6 border-t pt-6 sm:grid-cols-[1fr_200px]">
            <div><label className="label" htmlFor="terms">Conditions de paiement</label>
              <textarea id="terms" rows={3} className="field h-auto py-2" value={q.terms} onChange={(e) => update({ terms: e.target.value })} /></div>
            <div><label className="label" htmlFor="vat">TVA</label>
              <select id="vat" className="field" value={q.vatRate} onChange={(e) => update({ vatRate: +e.target.value })}>
                {[20, 14, 10, 7, 0].map((r) => <option key={r} value={r}>{r} %</option>)}
              </select>
              <div className="mt-4 text-xs text-muted-foreground">Total TTC</div>
              <div className="num text-2xl font-semibold">{mad(t.ttc)}</div></div>
          </section>
        </div>

        <Preview q={q} t={t} />
      </main>
    </div>
  );
}

function Preview({ q, t }: { q: Quote; t: { ht: number; tva: number; ttc: number } }) {
  return (
    <article className="print-area self-start border bg-paper p-8 text-[13px] leading-relaxed shadow-sm lg:sticky lg:top-6">
      <header className="flex justify-between gap-6 border-b-2 border-foreground pb-5">
        <div>
          <div className="text-base font-semibold">{q.company.name || "Votre entreprise"}</div>
          <div className="text-muted-foreground">{q.company.address}</div>
          {q.company.ice && <div className="num text-muted-foreground">ICE {q.company.ice}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tracking-wide">DEVIS</div>
          <div className="num">{q.number}</div>
          <div className="num text-muted-foreground">{fmtDate(q.createdAt)}</div>
        </div>
      </header>
      <div className="mt-5">
        <div className="text-xs text-muted-foreground">Adressé à</div>
        <div className="font-semibold">{q.client.name || "—"}</div>
        <div>{q.client.address}</div>
        {q.client.ice && <div className="num">ICE {q.client.ice}</div>}
      </div>
      <table className="mt-6 w-full">
        <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 font-medium">Désignation</th><th className="w-12 py-2 text-right font-medium">Qté</th><th className="w-28 py-2 text-right font-medium">P.U. HT</th><th className="w-28 py-2 text-right font-medium">Total HT</th></tr></thead>
        <tbody>
          {q.lines.map((l) => (
            <tr key={l.id} className="border-b align-top">
              <td className="whitespace-pre-wrap break-words py-2 pr-3">{l.description || "—"}</td>
              <td className="num py-2 text-right">{l.qty}</td>
              <td className="num py-2 text-right">{mad(l.unitPrice)}</td>
              <td className="num py-2 text-right">{mad(l.qty * l.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 w-64 space-y-1">
        <div className="flex justify-between"><dt>Total HT</dt><dd className="num">{mad(t.ht)}</dd></div>
        <div className="flex justify-between"><dt>TVA {q.vatRate} %</dt><dd className="num">{mad(t.tva)}</dd></div>
        <div className="flex justify-between border-t-2 border-foreground pt-2 font-semibold"><dt>Total TTC</dt><dd className="num">{mad(t.ttc)}</dd></div>
      </dl>
      <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        <p>{q.terms}</p>
        <p className="mt-1">Devis valable jusqu'au {fmtDate(q.validUntil)}.</p>
        <p className="mt-6">Bon pour accord — date et signature du client :</p>
      </footer>
    </article>
  );
}
