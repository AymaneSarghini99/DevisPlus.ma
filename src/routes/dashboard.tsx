import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/Brand";
import { deleteQuote, fmtDate, loadQuotes, mad, STATUS_LABEL, totals, type Quote, type Status } from "@/lib/quotes";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Mes devis — DevisPlus.ma" },
      { name: "description", content: "Suivez vos devis, leurs montants et leurs statuts." },
      { property: "og:title", content: "Mes devis — DevisPlus.ma" },
      { property: "og:description", content: "Suivez vos devis, montants et statuts." },
    ],
  }),
  component: Dashboard,
});

const statusStyle: Record<Status, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoye: "bg-primary text-primary-foreground",
  accepte: "bg-accent text-accent-foreground",
  refuse: "border border-destructive text-destructive",
};

function Dashboard() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  useEffect(() => setQuotes(loadQuotes()), []);

  const accepted = quotes?.filter((q) => q.status === "accepte") ?? [];
  const pending = quotes?.filter((q) => q.status === "envoye") ?? [];
  const sum = (l: Quote[]) => l.reduce((s, q) => s + totals(q.lines, q.vatRate).ttc, 0);

  return (
    <div className="min-h-screen">
      <AppHeader>
        <Link to="/devis/$id" params={{ id: "nouveau" }} className="btn btn-accent"><Plus className="size-4" /> Créer un devis</Link>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Mes devis</h1>

        {quotes && quotes.length > 0 && (
          <dl className="mt-6 grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[["Devis", String(quotes.length)], ["En attente de réponse", mad(sum(pending))], ["Acceptés", mad(sum(accepted))]].map(([k, v]) => (
              <div key={k} className="py-4 sm:px-4 sm:first:pl-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="num mt-1 text-xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {quotes === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Chargement…</p>
        ) : quotes.length === 0 ? (
          <div className="mt-10 border border-dashed bg-card p-10 text-center">
            <FileText className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">Aucun devis pour l'instant</h2>
            <p className="mt-1 text-sm text-muted-foreground">Créez votre premier devis : vos coordonnées seront mémorisées pour les suivants.</p>
            <Link to="/devis/$id" params={{ id: "nouveau" }} className="btn btn-accent mt-6"><Plus className="size-4" /> Créer un devis</Link>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium">N°</th><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 text-right font-medium">Total TTC</th><th className="w-10" /></tr>
              </thead>
              <tbody className="divide-y">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/60">
                    <td className="num px-4 py-3"><Link to="/devis/$id" params={{ id: q.id }} className="underline-offset-2 hover:underline">{q.number}</Link></td>
                    <td className="px-4 py-3">{q.client.name || <span className="text-muted-foreground">Sans client</span>}</td>
                    <td className="num px-4 py-3 text-muted-foreground">{fmtDate(q.createdAt)}</td>
                    <td className="px-4 py-3"><span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${statusStyle[q.status]}`}>{STATUS_LABEL[q.status]}</span></td>
                    <td className="num px-4 py-3 text-right">{mad(totals(q.lines, q.vatRate).ttc)}</td>
                    <td className="px-2">
                      <button aria-label={`Supprimer ${q.number}`} className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                        onClick={() => { if (confirm(`Supprimer le devis ${q.number} ?`)) { deleteQuote(q.id); setQuotes(loadQuotes()); } }}>
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
