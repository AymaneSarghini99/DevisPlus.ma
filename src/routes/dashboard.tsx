import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import {
  deleteQuote,
  duplicateQuote,
  fmtDate,
  loadQuotes,
  mad,
  quoteTotals,
  saveQuote,
  STATUS_LABEL,
  type Quote,
  type Status,
} from "@/lib/quotes";
import { errorMessage } from "@/lib/storage";

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
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  useEffect(() => setQuotes(loadQuotes()), []);

  const accepted = quotes?.filter((q) => q.status === "accepte") ?? [];
  const pending = quotes?.filter((q) => q.status === "envoye") ?? [];
  const sum = (l: Quote[]) => l.reduce((s, q) => s + Math.round(quoteTotals(q).ttc * 100), 0) / 100;

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (quotes ?? []).filter(
      (q) =>
        (!status || q.status === status) &&
        (!s || `${q.number} ${q.client.name}`.toLowerCase().includes(s)),
    );
  }, [quotes, search, status]);

  const duplicate = (q: Quote) => {
    try {
      const all = loadQuotes();
      const copy = saveQuote(duplicateQuote(q, all));
      toast.success(`Copie créée : ${copy.number}`);
      navigate({ to: "/devis/$id", params: { id: copy.id }, search: {} });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const remove = (q: Quote) => {
    if (!confirm(`Supprimer le devis ${q.number} ?`)) return;
    try {
      deleteQuote(q.id);
      setQuotes(loadQuotes());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const create = (
    <Link to="/devis/$id" params={{ id: "nouveau" }} search={{}} className="btn btn-accent">
      <Plus className="size-4" /> Créer un devis
    </Link>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title="Mes devis">{create}</PageTitle>

        {quotes && quotes.length > 0 && (
          <dl className="mt-6 grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              ["Devis", String(quotes.length)],
              ["En attente de réponse", mad(sum(pending))],
              ["Acceptés", mad(sum(accepted))],
            ].map(([k, v]) => (
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
          <EmptyState
            icon={<FileText className="size-6" />}
            title="Aucun devis pour l'instant"
            action={create}
          >
            Créez votre premier devis : vos coordonnées seront mémorisées pour les suivants.
          </EmptyState>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <label htmlFor="q-search" className="sr-only">
                  Rechercher un devis
                </label>
                <input
                  id="q-search"
                  className="field pl-9"
                  placeholder="N° ou client…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label htmlFor="q-status" className="sr-only">
                Filtrer par statut
              </label>
              <select
                id="q-status"
                className="field w-auto"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status | "")}
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">N°</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Validité</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/60">
                      <td className="num px-4 py-3">
                        <Link
                          to="/devis/$id"
                          params={{ id: q.id }}
                          search={{}}
                          className="underline-offset-2 hover:underline"
                        >
                          {q.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {q.client.name || (
                          <span className="text-muted-foreground">Sans client</span>
                        )}
                      </td>
                      <td className="num px-4 py-3 text-muted-foreground">
                        {fmtDate(q.issueDate)}
                      </td>
                      <td className="num px-4 py-3 text-muted-foreground">
                        {fmtDate(q.validUntil)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium ${statusStyle[q.status]}`}
                        >
                          {STATUS_LABEL[q.status]}
                        </span>
                      </td>
                      <td className="num whitespace-nowrap px-4 py-3 text-right">
                        {mad(quoteTotals(q).ttc)}
                      </td>
                      <td className="whitespace-nowrap px-2">
                        <button
                          aria-label={`Dupliquer ${q.number}`}
                          title="Dupliquer"
                          className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => duplicate(q)}
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          aria-label={`Supprimer ${q.number}`}
                          title="Supprimer"
                          className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                          onClick={() => remove(q)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-muted-foreground">
                        Aucun devis ne correspond à ces filtres.
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
