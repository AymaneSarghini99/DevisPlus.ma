import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { F, PartyFields } from "@/components/Form";
import { fmtDate, loadQuotes, mad, quoteTotals, STATUS_LABEL, type Quote } from "@/lib/quotes";
import { INVOICE_STATUS_LABEL, invoiceTotals, loadInvoices, type Invoice } from "@/lib/invoices";
import {
  deleteClient,
  loadClients,
  newClient,
  partyErrors,
  saveClient,
  type Client,
} from "@/lib/store";
import { errorMessage } from "@/lib/storage";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — DevisPlus.ma" },
      {
        name: "description",
        content:
          "Fiches clients avec ICE, IF, RC, coordonnées, conditions de paiement et historique des devis.",
      },
    ],
  }),
  component: Clients,
});

function Clients() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Client | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setClients(loadClients());
    setQuotes(loadQuotes());
    setInvoices(loadInvoices());
  }, []);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = [...(clients ?? [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return s
      ? all.filter((c) =>
          [c.name, c.ice, c.city, c.contact, c.phone, c.email].join(" ").toLowerCase().includes(s),
        )
      : all;
  }, [clients, search]);

  const open = (c: Client) => {
    setEdit(structuredClone(c));
    setTried(false);
  };
  const errors = edit ? partyErrors(edit) : {};
  const err = (k: string) =>
    tried ? (errors as Record<string, string>)[k.replace("client.", "")] : undefined;
  const isNew = edit && !clients?.some((c) => c.id === edit.id);

  const save = () => {
    if (!edit) return;
    setTried(true);
    if (Object.keys(errors).length) return;
    try {
      saveClient(edit);
      setClients(loadClients());
      toast.success(isNew ? "Client ajouté." : "Fiche client enregistrée.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const remove = () => {
    if (
      !edit ||
      !confirm(
        `Supprimer la fiche « ${edit.name || "sans nom"} » ? Les devis déjà créés restent inchangés.`,
      )
    )
      return;
    try {
      deleteClient(edit.id);
      setClients(loadClients());
      setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const history = edit ? quotes.filter((q) => q.clientId === edit.id) : [];
  const billed = edit ? invoices.filter((i) => i.clientId === edit.id) : [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title="Clients">
          <button className="btn btn-accent" onClick={() => open(newClient())}>
            <Plus className="size-4" /> Nouveau client
          </button>
        </PageTitle>

        {clients === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Chargement…</p>
        ) : clients.length === 0 && !edit ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="Aucun client enregistré"
            action={
              <button className="btn btn-accent" onClick={() => open(newClient())}>
                <Plus className="size-4" /> Ajouter un client
              </button>
            }
          >
            Enregistrez vos clients une fois : leurs coordonnées, ICE et conditions de paiement
            seront reprises dans chaque devis.
          </EmptyState>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <label htmlFor="client-search" className="sr-only">
                  Rechercher un client
                </label>
                <input
                  id="client-search"
                  className="field pl-9"
                  placeholder="Nom, ICE, ville, contact…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ul className="mt-3 divide-y border bg-card">
                {list.map((c) => {
                  const n = quotes.filter((q) => q.clientId === c.id).length;
                  return (
                    <li key={c.id}>
                      <button
                        className={`w-full px-4 py-3 text-left hover:bg-muted ${edit?.id === c.id ? "bg-muted" : ""}`}
                        aria-current={edit?.id === c.id}
                        onClick={() => open(c)}
                      >
                        <span className="block truncate font-medium">{c.name || "Sans nom"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[c.city, c.ice && `ICE ${c.ice}`, `${n} devis`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {!list.length && (
                  <li className="px-4 py-6 text-sm text-muted-foreground">
                    Aucun client ne correspond à « {search} ».
                  </li>
                )}
              </ul>
            </div>

            {edit ? (
              <div className="min-w-0 space-y-6">
                <section className="border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">
                      {isNew ? "Nouveau client" : edit.name || "Client"}
                    </h2>
                    <div className="flex gap-2">
                      {!isNew && (
                        <button
                          className="btn btn-ghost"
                          onClick={remove}
                          aria-label="Supprimer ce client"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                      {!isNew && (
                        <Link
                          to="/devis/$id"
                          params={{ id: "nouveau" }}
                          search={{ client: edit.id }}
                          className="btn btn-ghost"
                        >
                          Créer un devis
                        </Link>
                      )}
                      <button className="btn btn-primary" onClick={save}>
                        Enregistrer
                      </button>
                    </div>
                  </div>
                  <PartyFields
                    who="client"
                    p={edit}
                    set={(p) => setEdit({ ...edit, ...p })}
                    err={err}
                  />
                  <div className="mt-3">
                    <F
                      label="Conditions de paiement habituelles"
                      id="pterms"
                      hint="Reprises automatiquement dans les devis de ce client."
                    >
                      <textarea
                        id="pterms"
                        rows={2}
                        className="field h-auto py-2"
                        value={edit.paymentTerms}
                        placeholder="Ex. : 50 % à la commande, solde à 30 jours"
                        onChange={(e) => setEdit({ ...edit, paymentTerms: e.target.value })}
                      />
                    </F>
                  </div>
                </section>

                {!isNew && (
                  <section>
                    <h2 className="text-sm font-semibold">Historique des devis</h2>
                    {history.length ? (
                      <div className="mt-3 overflow-x-auto border bg-card">
                        <table className="w-full text-sm">
                          <thead className="border-b text-left text-xs text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 font-medium">N°</th>
                              <th className="px-4 py-2 font-medium">Date</th>
                              <th className="px-4 py-2 font-medium">Statut</th>
                              <th className="px-4 py-2 text-right font-medium">Total TTC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {history.map((q) => (
                              <tr key={q.id}>
                                <td className="num px-4 py-2">
                                  <Link
                                    to="/devis/$id"
                                    params={{ id: q.id }}
                                    className="underline-offset-2 hover:underline"
                                  >
                                    {q.number}
                                  </Link>
                                </td>
                                <td className="num px-4 py-2 text-muted-foreground">
                                  {fmtDate(q.issueDate)}
                                </td>
                                <td className="px-4 py-2">{STATUS_LABEL[q.status]}</td>
                                <td className="num px-4 py-2 text-right">
                                  {mad(quoteTotals(q).ttc)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Aucun devis lié à cette fiche pour l'instant.
                      </p>
                    )}
                  </section>
                )}
                {!isNew && billed.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold">Factures</h2>
                    <ul className="mt-3 divide-y border bg-card text-sm">
                      {billed.map((i) => (
                        <li key={i.id} className="flex justify-between gap-4 px-4 py-2">
                          <Link
                            to="/factures/$id"
                            params={{ id: i.id }}
                            className="num underline-offset-2 hover:underline"
                          >
                            {i.number || "Brouillon"}
                          </Link>
                          <span className="text-muted-foreground">
                            {INVOICE_STATUS_LABEL[i.status]}
                          </span>
                          <span className="num">{mad(invoiceTotals(i).ttc)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <p className="hidden border border-dashed p-8 text-center text-sm text-muted-foreground lg:block">
                Sélectionnez un client pour voir sa fiche et ses devis.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
