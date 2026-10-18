import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { INVOICE_STATUS_LABEL, invoiceTotals, loadInvoices, type Invoice } from "@/lib/invoices";
import { fmtDate, mad, today } from "@/lib/quotes";

export const Route = createFileRoute("/factures/")({
  head: () => ({
    meta: [
      { title: "Factures — DevisPlus.ma" },
      {
        name: "description",
        content: "Factures issues de vos devis acceptés, paiements reçus et restes à payer.",
      },
    ],
  }),
  component: Invoices,
});

const sumC = (xs: number[]) => xs.reduce((s, x) => s + Math.round(x * 100), 0) / 100;

function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => setInvoices(loadInvoices()), []);

  const issued = (invoices ?? []).filter((i) => i.status === "emise");
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (invoices ?? []).filter(
      (i) => !s || `${i.number} ${i.quoteNumber} ${i.client.name}`.toLowerCase().includes(s),
    );
  }, [invoices, search]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title="Factures" />

        {invoices === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Chargement…</p>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="Aucune facture"
            action={
              <Link to="/dashboard" className="btn btn-ghost">
                Voir mes devis
              </Link>
            }
          >
            Une facture se crée à partir d'un devis accepté : ouvrez le devis et choisissez «
            Convertir en facture ». Le devis d'origine reste inchangé.
          </EmptyState>
        ) : (
          <>
            <dl className="mt-6 grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                ["Factures émises (TTC)", mad(sumC(issued.map((i) => invoiceTotals(i).ttc)))],
                ["Paiements reçus", mad(sumC(issued.map((i) => invoiceTotals(i).paid)))],
                ["Reste à encaisser", mad(sumC(issued.map((i) => invoiceTotals(i).outstanding)))],
              ].map(([k, v]) => (
                <div key={k} className="py-4 sm:px-4 sm:first:pl-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="num mt-1 text-xl font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Les brouillons ne sont pas comptés.
            </p>

            <div className="relative mt-6 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="inv-search" className="sr-only">
                Rechercher une facture
              </label>
              <input
                id="inv-search"
                className="field pl-9"
                placeholder="N°, devis ou client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-3 overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">N°</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Devis</th>
                    <th className="px-4 py-3 font-medium">Échéance</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                    <th className="px-4 py-3 text-right font-medium">Reste dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((i) => {
                    const t = invoiceTotals(i);
                    const late = i.status === "emise" && t.outstanding > 0 && i.dueDate < today();
                    return (
                      <tr key={i.id} className="hover:bg-muted/60">
                        <td className="num px-4 py-3">
                          <Link
                            to="/factures/$id"
                            params={{ id: i.id }}
                            className="underline-offset-2 hover:underline"
                          >
                            {i.number || "Brouillon"}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{i.client.name}</td>
                        <td className="num px-4 py-3 text-muted-foreground">
                          {i.quoteNumber || "—"}
                        </td>
                        <td
                          className={`num px-4 py-3 ${late ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {fmtDate(i.dueDate)}
                          {late ? " · en retard" : ""}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium ${i.status === "emise" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {i.status === "emise" && t.outstanding <= 0
                              ? "Payée"
                              : INVOICE_STATUS_LABEL[i.status]}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3 text-right">{mad(t.ttc)}</td>
                        <td className="num whitespace-nowrap px-4 py-3 text-right">
                          {i.status === "emise" ? mad(t.outstanding) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {!list.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-muted-foreground">
                        Aucune facture ne correspond à « {search} ».
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
