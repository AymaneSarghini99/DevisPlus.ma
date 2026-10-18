import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, PageTitle } from "@/components/Brand";
import { loadInvoices, type Invoice } from "@/lib/invoices";
import { loadQuotes, mad, today, type Quote } from "@/lib/quotes";
import { clientsCsv, invoicesCsv, paymentsCsv, quotesCsv, report } from "@/lib/reports";
import { loadClients, type Client } from "@/lib/store";

export const Route = createFileRoute("/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — DevisPlus.ma" },
      {
        name: "description",
        content:
          "Devis par mois, taux d'acceptation, factures émises, encaissements et exports CSV.",
      },
    ],
  }),
  component: Reports,
});

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const monthLabel = (m: string) => MONTH.format(new Date(m + "-15T12:00:00")).replace(".", "");
const monthLong = (m: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(m + "-15T12:00:00"),
  );

function download(name: string, csv: string) {
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    toast.error("Export impossible dans ce navigateur.");
  }
}

function Reports() {
  const [data, setData] = useState<{
    quotes: Quote[];
    invoices: Invoice[];
    clients: Client[];
  } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(
    () => setData({ quotes: loadQuotes(), invoices: loadInvoices(), clients: loadClients() }),
    [],
  );

  if (!data) return <p className="p-8 text-sm text-muted-foreground">Chargement…</p>;
  const now = today();
  const r = report(data.quotes, data.invoices, now);
  const max = Math.max(1, ...r.months.map((m) => m.count));
  const stamp = now.replaceAll("-", "");
  const exports: [string, string, () => string, number][] = [
    ["Clients", `clients-${stamp}.csv`, () => clientsCsv(data.clients), data.clients.length],
    ["Devis", `devis-${stamp}.csv`, () => quotesCsv(data.quotes), data.quotes.length],
    ["Factures", `factures-${stamp}.csv`, () => invoicesCsv(data.invoices), data.invoices.length],
    [
      "Paiements",
      `paiements-${stamp}.csv`,
      () => paymentsCsv(data.invoices),
      data.invoices.reduce((s, i) => s + i.payments.length, 0),
    ],
  ];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div>
          <PageTitle title="Rapports" />
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Calculés uniquement à partir des devis et factures enregistrés dans ce navigateur. Un
            montant devisé n'est pas un chiffre d'affaires : seules les factures émises et les
            paiements enregistrés le sont.
          </p>
        </div>

        <section>
          <h2 className="font-semibold">Devis</h2>
          <dl className="mt-3 grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-4 sm:divide-y-0">
            <Tile
              k="Devis créés"
              v={String(r.quotes.count)}
              sub={`${r.quotes.drafts} brouillon(s), ${r.quotes.pending} en attente`}
            />
            <Tile
              k="Montant total devisé (TTC)"
              v={mad(r.quotes.quotedTtc)}
              sub="Tous statuts confondus"
            />
            <Tile
              k="Acceptés"
              v={String(r.quotes.accepted.count)}
              sub={mad(r.quotes.accepted.ttc)}
            />
            <Tile k="Refusés" v={String(r.quotes.refused.count)} sub={mad(r.quotes.refused.ttc)} />
          </dl>
          <p className="mt-2 text-sm text-muted-foreground">
            {r.quotes.acceptanceRate === null
              ? "Taux d'acceptation : aucun devis accepté ou refusé pour l'instant."
              : `Taux d'acceptation : ${Math.round(r.quotes.acceptanceRate * 100)} % des devis tranchés (acceptés ou refusés).`}
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Devis créés par mois</h2>
          <p className="text-xs text-muted-foreground">12 derniers mois, selon la date du devis</p>
          <div className="mt-4 border bg-card p-4">
            <div
              className="relative flex h-44 items-end gap-0.5 border-b"
              role="img"
              aria-label={`Devis créés par mois : ${r.months.map((m) => `${monthLong(m.month)} ${m.count}`).join(", ")}`}
            >
              {r.months.map((m, i) => (
                <div
                  key={m.month}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {m.count > 0 && (
                    <div
                      className="w-full max-w-10 rounded-t bg-primary"
                      style={{ height: `${(m.count / max) * 100}%` }}
                    />
                  )}
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-sm border bg-card px-2 py-1 text-xs shadow-sm">
                      <div className="font-medium">{monthLong(m.month)}</div>
                      <div className="num">
                        {m.count} devis · {mad(m.ttc)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-0.5 text-[11px] text-muted-foreground">
              {r.months.map((m) => (
                <span key={m.month} className="flex-1 text-center">
                  {monthLabel(m.month)}
                </span>
              ))}
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Voir le tableau
              </summary>
              <table className="mt-2 w-full">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Mois</th>
                    <th className="py-1 text-right font-medium">Devis</th>
                    <th className="py-1 text-right font-medium">Montant TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.months.map((m) => (
                    <tr key={m.month}>
                      <td className="py-1">{monthLong(m.month)}</td>
                      <td className="num py-1 text-right">{m.count}</td>
                      <td className="num py-1 text-right">{mad(m.ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </section>

        <section>
          <h2 className="font-semibold">Factures et encaissements</h2>
          <dl className="mt-3 grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-4 sm:divide-y-0">
            <Tile
              k="Factures émises"
              v={String(r.invoices.issued)}
              sub={`${r.invoices.drafts} brouillon(s) non comptés`}
            />
            <Tile k="Facturé (TTC)" v={mad(r.invoices.issuedTtc)} />
            <Tile k="Paiements reçus" v={mad(r.invoices.received)} />
            <Tile k="Reste à encaisser" v={mad(r.invoices.outstanding)} />
          </dl>
        </section>

        <section>
          <h2 className="font-semibold">Exporter</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fichiers CSV (séparateur « ; », virgule décimale) qui s'ouvrent directement dans Excel.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {exports.map(([label, file, make, n]) => (
              <button
                key={label}
                className="btn btn-ghost"
                disabled={!n}
                onClick={() => download(file, make())}
              >
                <Download className="size-4" /> {label}{" "}
                <span className="num text-xs text-muted-foreground">({n})</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="p-4">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="num mt-1 text-xl font-semibold">{v}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
