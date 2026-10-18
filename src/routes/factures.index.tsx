import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { useTranslation } from "react-i18next";
import { invoiceTotals, loadInvoices, type Invoice } from "@/lib/invoices";
import { today } from "@/lib/quotes";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";

export const Route = createFileRoute("/factures/")({
  head: ({ match }) => pageMeta(match, "invoices"),
  component: Invoices,
});

const sumC = (xs: number[]) => xs.reduce((s, x) => s + Math.round(x * 100), 0) / 100;

function Invoices() {
  const { t } = useTranslation();
  const fmt = useFormat();
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
        <PageTitle title={t("invoices.title")} />

        {invoices === null ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title={t("invoices.emptyTitle")}
            action={
              <Link to="/dashboard" className="btn btn-ghost">
                {t("invoices.seeQuotes")}
              </Link>
            }
          >
            {t("invoices.emptyText")}
          </EmptyState>
        ) : (
          <>
            <dl className="mt-6 grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                [t("invoices.kpiIssued"), fmt.money(sumC(issued.map((i) => invoiceTotals(i).ttc)))],
                [
                  t("invoices.kpiReceived"),
                  fmt.money(sumC(issued.map((i) => invoiceTotals(i).paid))),
                ],
                [
                  t("invoices.kpiOutstanding"),
                  fmt.money(sumC(issued.map((i) => invoiceTotals(i).outstanding))),
                ],
              ].map(([k, v]) => (
                <div key={k} className="py-4 sm:px-4 sm:first:ps-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="num mt-1 text-xl font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">{t("invoices.draftsNotCounted")}</p>

            <div className="relative mt-6 max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="inv-search" className="sr-only">
                {t("invoices.searchLabel")}
              </label>
              <input
                id="inv-search"
                className="field ps-9"
                placeholder={t("invoices.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-3 overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colNumber")}</th>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colClient")}</th>
                    <th className="px-4 py-3 font-medium">{t("invoices.colQuote")}</th>
                    <th className="px-4 py-3 font-medium">{t("invoices.colDue")}</th>
                    <th className="px-4 py-3 font-medium">{t("dashboard.colStatus")}</th>
                    <th className="px-4 py-3 text-end font-medium">{t("dashboard.colTotal")}</th>
                    <th className="px-4 py-3 text-end font-medium">
                      {t("invoices.colOutstanding")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((i) => {
                    const tt = invoiceTotals(i);
                    const late = i.status === "emise" && tt.outstanding > 0 && i.dueDate < today();
                    return (
                      <tr key={i.id} className="hover:bg-muted/60">
                        <td className="num px-4 py-3">
                          <Link
                            to="/factures/$id"
                            params={{ id: i.id }}
                            className="underline-offset-2 hover:underline"
                          >
                            {i.number ? <bdi>{i.number}</bdi> : t("status.invoice.brouillon")}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <bdi>{i.client.name}</bdi>
                        </td>
                        <td className="num px-4 py-3 text-muted-foreground">
                          <bdi>{i.quoteNumber || "—"}</bdi>
                        </td>
                        <td
                          className={`num px-4 py-3 ${late ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {fmt.date(i.dueDate)}
                          {late ? ` · ${t("invoices.late")}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium ${i.status === "emise" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {i.status === "emise" && tt.outstanding <= 0
                              ? t("status.invoice.paid")
                              : t(`status.invoice.${i.status}`)}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3 text-end">
                          <bdi>{fmt.money(tt.ttc)}</bdi>
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3 text-end">
                          <bdi>{i.status === "emise" ? fmt.money(tt.outstanding) : "—"}</bdi>
                        </td>
                      </tr>
                    );
                  })}
                  {!list.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-muted-foreground">
                        {t("common.noMatch", { query: search })}
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
