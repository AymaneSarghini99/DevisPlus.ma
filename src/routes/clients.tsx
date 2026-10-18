import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { F, PartyFields } from "@/components/Form";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { loadQuotes, quoteTotals, type Quote } from "@/lib/quotes";
import { invoiceTotals, loadInvoices, type Invoice } from "@/lib/invoices";
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
  head: ({ match }) => pageMeta(match, "clients"),
  component: Clients,
});

function Clients() {
  const { t } = useTranslation();
  const { fmt, locale } = useLocale();
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
    const all = [...(clients ?? [])].sort((a, b) => a.name.localeCompare(b.name, locale));
    return s
      ? all.filter((c) =>
          [c.name, c.ice, c.city, c.contact, c.phone, c.email].join(" ").toLowerCase().includes(s),
        )
      : all;
  }, [clients, search, locale]);

  const open = (c: Client) => {
    setEdit(structuredClone(c));
    setTried(false);
  };
  const errors = edit ? partyErrors(edit) : {};
  const err = (k: string) => {
    const code = tried ? (errors as Record<string, string>)[k.replace("client.", "")] : undefined;
    return code ? t(`validation.${code}` as never) : undefined;
  };
  const isNew = edit && !clients?.some((c) => c.id === edit.id);

  const save = () => {
    if (!edit) return;
    setTried(true);
    if (Object.keys(errors).length) return;
    try {
      saveClient(edit);
      setClients(loadClients());
      toast.success(isNew ? t("clients.added") : t("clients.saved"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };
  const remove = () => {
    if (!edit || !confirm(t("clients.confirmDelete", { name: edit.name || t("clients.noName") })))
      return;
    try {
      deleteClient(edit.id);
      setClients(loadClients());
      setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const history = edit ? quotes.filter((q) => q.clientId === edit.id) : [];
  const billed = edit ? invoices.filter((i) => i.clientId === edit.id) : [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title={t("clients.title")}>
          <button className="btn btn-accent" onClick={() => open(newClient())}>
            <Plus className="size-4" /> {t("clients.new")}
          </button>
        </PageTitle>

        {clients === null ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : clients.length === 0 && !edit ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title={t("clients.emptyTitle")}
            action={
              <button className="btn btn-accent" onClick={() => open(newClient())}>
                <Plus className="size-4" /> {t("clients.addFirst")}
              </button>
            }
          >
            {t("clients.emptyText")}
          </EmptyState>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <label htmlFor="client-search" className="sr-only">
                  {t("clients.searchLabel")}
                </label>
                <input
                  id="client-search"
                  className="field ps-9"
                  placeholder={t("clients.searchPlaceholder")}
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
                        className={`w-full px-4 py-3 text-start hover:bg-muted ${edit?.id === c.id ? "bg-muted" : ""}`}
                        aria-current={edit?.id === c.id}
                        onClick={() => open(c)}
                      >
                        <bdi className="block truncate font-medium">
                          {c.name || t("clients.noName")}
                        </bdi>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[c.city, c.ice && `ICE ${c.ice}`, t("clients.quoteCount", { count: n })]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {!list.length && (
                  <li className="px-4 py-6 text-sm text-muted-foreground">
                    {t("common.noMatch", { query: search })}
                  </li>
                )}
              </ul>
            </div>

            {edit ? (
              <div className="min-w-0 space-y-6">
                <section className="border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">
                      {isNew ? t("clients.new") : <bdi>{edit.name || t("clients.noName")}</bdi>}
                    </h2>
                    <div className="flex gap-2">
                      {!isNew && (
                        <button
                          className="btn btn-ghost"
                          onClick={remove}
                          aria-label={t("clients.deleteThis")}
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
                          {t("dashboard.create")}
                        </Link>
                      )}
                      <button className="btn btn-primary" onClick={save}>
                        {t("common.save")}
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
                      label={t("clients.usualTerms")}
                      id="pterms"
                      hint={t("clients.usualTermsHint")}
                    >
                      <textarea
                        id="pterms"
                        dir="auto"
                        rows={2}
                        className="field h-auto py-2"
                        value={edit.paymentTerms}
                        placeholder={t("clients.usualTermsPlaceholder")}
                        onChange={(e) => setEdit({ ...edit, paymentTerms: e.target.value })}
                      />
                    </F>
                  </div>
                </section>

                {!isNew && (
                  <section>
                    <h2 className="text-sm font-semibold">{t("clients.history")}</h2>
                    {history.length ? (
                      <div className="mt-3 overflow-x-auto border bg-card">
                        <table className="w-full text-sm">
                          <thead className="border-b text-start text-xs text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 font-medium">{t("dashboard.colNumber")}</th>
                              <th className="px-4 py-2 font-medium">{t("dashboard.colDate")}</th>
                              <th className="px-4 py-2 font-medium">{t("dashboard.colStatus")}</th>
                              <th className="px-4 py-2 text-end font-medium">
                                {t("dashboard.colTotal")}
                              </th>
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
                                    <bdi>{q.number}</bdi>
                                  </Link>
                                </td>
                                <td className="num px-4 py-2 text-muted-foreground">
                                  {fmt.date(q.issueDate)}
                                </td>
                                <td className="px-4 py-2">{t(`status.quote.${q.status}`)}</td>
                                <td className="num px-4 py-2 text-end">
                                  <bdi>{fmt.money(quoteTotals(q).ttc)}</bdi>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">{t("clients.noHistory")}</p>
                    )}
                  </section>
                )}
                {!isNew && billed.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold">{t("invoices.title")}</h2>
                    <ul className="mt-3 divide-y border bg-card text-sm">
                      {billed.map((i) => (
                        <li key={i.id} className="flex justify-between gap-4 px-4 py-2">
                          <Link
                            to="/factures/$id"
                            params={{ id: i.id }}
                            className="num underline-offset-2 hover:underline"
                          >
                            {i.number ? <bdi>{i.number}</bdi> : t("status.invoice.brouillon")}
                          </Link>
                          <span className="text-muted-foreground">
                            {t(`status.invoice.${i.status}`)}
                          </span>
                          <bdi className="num">{fmt.money(invoiceTotals(i).ttc)}</bdi>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <p className="hidden border border-dashed p-8 text-center text-sm text-muted-foreground lg:block">
                {t("clients.selectHint")}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
