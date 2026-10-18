import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { useTranslation } from "react-i18next";
import {
  deleteQuote,
  duplicateQuote,
  loadQuotes,
  quoteTotals,
  saveQuote,
  STATUSES,
  type Quote,
  type Status,
} from "@/lib/quotes";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { errorMessage } from "@/lib/storage";
import { Dropdown } from "@/components/Dropdown";

export const Route = createFileRoute("/dashboard")({
  head: ({ match }) => pageMeta(match, "dashboard"),
  component: Dashboard,
});

const statusStyle: Record<Status, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoye: "bg-primary text-primary-foreground",
  accepte: "bg-accent text-accent-foreground",
  refuse: "border border-destructive text-destructive",
};

function Dashboard() {
  const { t } = useTranslation();
  const fmt = useFormat();
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
      toast.success(t("dashboard.copied", { number: copy.number }));
      navigate({ to: "/devis/$id", params: { id: copy.id }, search: {} });
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };
  const remove = (q: Quote) => {
    if (!confirm(t("dashboard.confirmDelete", { number: q.number }))) return;
    try {
      deleteQuote(q.id);
      setQuotes(loadQuotes());
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };

  const create = (
    <Link to="/devis/$id" params={{ id: "nouveau" }} search={{}} className="btn btn-accent">
      <Plus className="size-4" /> {t("dashboard.create")}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title={t("dashboard.title")}>{create}</PageTitle>

        {quotes && quotes.length > 0 && (
          <dl className="mt-6 grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              [t("dashboard.kpiCount"), fmt.number(quotes.length)],
              [t("dashboard.kpiPending"), fmt.money(sum(pending))],
              [t("dashboard.kpiAccepted"), fmt.money(sum(accepted))],
            ].map(([k, v]) => (
              <div key={k} className="py-4 sm:px-4 sm:first:ps-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="num mt-1 text-xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {quotes === null ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            title={t("dashboard.emptyTitle")}
            action={create}
          >
            {t("dashboard.emptyText")}
          </EmptyState>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <label htmlFor="q-search" className="sr-only">
                  {t("dashboard.searchLabel")}
                </label>
                <input
                  id="q-search"
                  className="field ps-9"
                  placeholder={t("dashboard.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label htmlFor="q-status" className="sr-only">
                {t("dashboard.filterStatus")}
              </label>
              <Dropdown
                id="q-status"
                className="w-48"
                ariaLabel={t("dashboard.filterStatus")}
                value={status}
                onChange={(v) => setStatus(v as Status | "")}
                options={[
                  { value: "", label: t("status.all") },
                  ...STATUSES.map((k) => ({ value: k, label: t(`status.quote.${k}`) })),
                ]}
              />
            </div>
            <div className="mt-3 overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colNumber")}</th>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colClient")}</th>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colDate")}</th>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colValidity")}</th>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colStatus")}</th>
                    <th className="px-4 py-3 text-end font-medium">{t("dashboard.colTotal")}</th>
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
                          <bdi>{q.number}</bdi>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {q.client.name ? (
                          <bdi>{q.client.name}</bdi>
                        ) : (
                          <span className="text-muted-foreground">{t("common.noClient")}</span>
                        )}
                      </td>
                      <td className="num px-4 py-3 text-muted-foreground">
                        {fmt.date(q.issueDate)}
                      </td>
                      <td className="num px-4 py-3 text-muted-foreground">
                        {fmt.date(q.validUntil)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium ${statusStyle[q.status]}`}
                        >
                          {t(`status.quote.${q.status}`)}
                        </span>
                      </td>
                      <td className="num whitespace-nowrap px-4 py-3 text-end">
                        <bdi>{fmt.money(quoteTotals(q).ttc)}</bdi>
                      </td>
                      <td className="whitespace-nowrap px-2">
                        <button
                          aria-label={t("dashboard.duplicateOf", { number: q.number })}
                          title={t("common.duplicate")}
                          className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => duplicate(q)}
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          aria-label={t("dashboard.deleteOf", { number: q.number })}
                          title={t("common.delete")}
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
                        {t("dashboard.noMatch")}
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
