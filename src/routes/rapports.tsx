import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, PageTitle } from "@/components/Brand";
import { loadInvoices, type Invoice } from "@/lib/invoices";
import { loadQuotes, today, type Quote } from "@/lib/quotes";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import {
  clientsCsv,
  invoicesCsv,
  journalDocs,
  journalVat,
  paymentsCsv,
  quotesCsv,
  report,
  salesJournalCsv,
} from "@/lib/reports";
import { Dropdown } from "@/components/Dropdown";
import { loadClients, type Client } from "@/lib/store";

export const Route = createFileRoute("/rapports")({
  head: ({ match }) => pageMeta(match, "reports"),
  component: Reports,
});

function download(name: string, csv: string, onError: () => void) {
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    onError();
  }
}

type PeriodKind = "month" | "quarter" | "year";
const pad = (n: number) => String(n).padStart(2, "0");
/** The last periods of a kind, newest first: { value, from, to } with inclusive dates. */
function periods(kind: PeriodKind, ref: string) {
  const [y, m] = ref.split("-").map(Number) as [number, number];
  const lastDay = (yy: number, mm: number) => new Date(yy, mm, 0).getDate();
  if (kind === "year")
    return [y, y - 1, y - 2].map((yy) => ({
      value: String(yy),
      from: `${yy}-01-01`,
      to: `${yy}-12-31`,
    }));
  if (kind === "quarter") {
    const q0 = Math.floor((m - 1) / 3);
    return Array.from({ length: 6 }, (_, i) => {
      const n = y * 4 + q0 - i;
      const yy = Math.floor(n / 4),
        q = n % 4;
      return {
        value: `${yy}-T${q + 1}`,
        from: `${yy}-${pad(q * 3 + 1)}-01`,
        to: `${yy}-${pad(q * 3 + 3)}-${lastDay(yy, q * 3 + 3)}`,
      };
    });
  }
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(y, m - 1 - i, 1);
    const yy = d.getFullYear(),
      mm = d.getMonth() + 1;
    return {
      value: `${yy}-${pad(mm)}`,
      from: `${yy}-${pad(mm)}-01`,
      to: `${yy}-${pad(mm)}-${lastDay(yy, mm)}`,
    };
  });
}

function Reports() {
  const { t } = useTranslation();
  const { fmt, locale } = useLocale();
  const [data, setData] = useState<{
    quotes: Quote[];
    invoices: Invoice[];
    clients: Client[];
  } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [periodKind, setPeriodKind] = useState<PeriodKind>("month");
  const [periodValue, setPeriodValue] = useState("");
  useEffect(
    () => setData({ quotes: loadQuotes(), invoices: loadInvoices(), clients: loadClients() }),
    [],
  );

  if (!data) return <p className="p-8 text-sm text-muted-foreground">{t("common.loading")}</p>;
  const now = today();
  const r = report(data.quotes, data.invoices, now);
  const max = Math.max(1, ...r.months.map((m) => m.count));
  const stamp = now.replaceAll("-", "");
  const periodList = periods(periodKind, now);
  const period = periodList.find((p) => p.value === periodValue) ?? periodList[0]!;
  const journal = journalDocs(data.invoices, period.from, period.to);
  const exports: [string, string, () => string, number][] = [
    [
      t("reports.export.clients"),
      `${t("reports.file.clients")}-${stamp}.csv`,
      () => clientsCsv(data.clients, t, locale),
      data.clients.length,
    ],
    [
      t("reports.export.quotes"),
      `${t("reports.file.quotes")}-${stamp}.csv`,
      () => quotesCsv(data.quotes, t, locale),
      data.quotes.length,
    ],
    [
      t("reports.export.invoices"),
      `${t("reports.file.invoices")}-${stamp}.csv`,
      () => invoicesCsv(data.invoices, t, locale),
      data.invoices.length,
    ],
    [
      t("reports.export.payments"),
      `${t("reports.file.payments")}-${stamp}.csv`,
      () => paymentsCsv(data.invoices, t, locale),
      data.invoices.reduce((s, i) => s + i.payments.length, 0),
    ],
  ];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div>
          <PageTitle title={t("reports.title")} />
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("reports.intro")}</p>
        </div>

        <section>
          <h2 className="font-semibold">{t("reports.quotes")}</h2>
          <dl className="mt-3 grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-4 sm:divide-y-0">
            <Tile
              k={t("reports.created")}
              v={fmt.number(r.quotes.count)}
              sub={t("reports.createdSub", { drafts: r.quotes.drafts, pending: r.quotes.pending })}
            />
            <Tile
              k={t("reports.quotedTotal")}
              v={fmt.money(r.quotes.quotedTtc)}
              sub={t("reports.allStatuses")}
            />
            <Tile
              k={t("reports.accepted")}
              v={fmt.number(r.quotes.accepted.count)}
              sub={fmt.money(r.quotes.accepted.ttc)}
            />
            <Tile
              k={t("reports.refused")}
              v={fmt.number(r.quotes.refused.count)}
              sub={fmt.money(r.quotes.refused.ttc)}
            />
          </dl>
          <p className="mt-2 text-sm text-muted-foreground">
            {r.quotes.acceptanceRate === null
              ? t("reports.rateNone")
              : t("reports.rate", { pct: fmt.percent(Math.round(r.quotes.acceptanceRate * 100)) })}
          </p>
        </section>

        <section>
          <h2 className="font-semibold">{t("reports.perMonth")}</h2>
          <p className="text-xs text-muted-foreground">{t("reports.perMonthHint")}</p>
          <div className="mt-4 border bg-card p-4">
            <div
              className="relative flex h-44 items-end gap-0.5 border-b"
              role="img"
              aria-label={`${t("reports.perMonth")}${t("doc.colon")}${r.months.map((m) => `${fmt.monthLong(m.month)} ${m.count}`).join(t("doc.listSep"))}`}
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
                      <div className="font-medium">{fmt.monthLong(m.month)}</div>
                      <div className="num">
                        {t("reports.tooltip", { count: m.count, amount: fmt.money(m.ttc) })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-0.5 text-[11px] text-muted-foreground">
              {r.months.map((m) => (
                <span key={m.month} className="flex-1 text-center">
                  {fmt.monthShort(m.month)}
                </span>
              ))}
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {t("reports.showTable")}
              </summary>
              <table className="mt-2 w-full">
                <thead className="text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">{t("reports.month")}</th>
                    <th className="py-1 text-end font-medium">{t("reports.quotes")}</th>
                    <th className="py-1 text-end font-medium">{t("reports.amountTtc")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.months.map((m) => (
                    <tr key={m.month}>
                      <td className="py-1">{fmt.monthLong(m.month)}</td>
                      <td className="num py-1 text-end">{m.count}</td>
                      <td className="num py-1 text-end">
                        <bdi>{fmt.money(m.ttc)}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </section>

        <section>
          <h2 className="font-semibold">{t("reports.invoicesTitle")}</h2>
          <dl className="mt-3 grid grid-cols-2 divide-x divide-y border-y sm:grid-cols-4 sm:divide-y-0">
            <Tile
              k={t("reports.issued")}
              v={fmt.number(r.invoices.issued)}
              sub={t("reports.draftsSub", { drafts: r.invoices.drafts })}
            />
            <Tile k={t("reports.invoiced")} v={fmt.money(r.invoices.issuedTtc)} />
            <Tile k={t("invoices.kpiReceived")} v={fmt.money(r.invoices.received)} />
            <Tile k={t("invoices.kpiOutstanding")} v={fmt.money(r.invoices.outstanding)} />
          </dl>
        </section>

        <section className="border bg-card p-4">
          <h2 className="font-semibold">{t("journal.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("journal.text")}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Dropdown
                id="jkind"
                ariaLabel={t("journal.period")}
                value={periodKind}
                onChange={(v) => {
                  setPeriodKind(v as PeriodKind);
                  setPeriodValue("");
                }}
                options={(["month", "quarter", "year"] as const).map((k) => ({
                  value: k,
                  label: t(`journal.${k}`),
                }))}
              />
            </div>
            <div className="w-40">
              <Dropdown
                id="jvalue"
                ariaLabel={t("journal.period")}
                value={period.value}
                onChange={setPeriodValue}
                options={periodList.map((p) => ({ value: p.value, label: p.value }))}
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={!journal.length}
              onClick={() =>
                download(
                  `${t("journal.title")} ${period.value}.csv`,
                  salesJournalCsv(data.invoices, period.from, period.to, t, locale),
                  () => toast.error(t("errors.exportFailed")),
                )
              }
            >
              <Download className="size-4" /> {t("journal.download")}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {journal.length
              ? t("journal.summary", {
                  count: journal.length,
                  vat: fmt.money(journalVat(journal)),
                })
              : t("journal.empty")}
          </p>
        </section>

        <section>
          <h2 className="font-semibold">{t("reports.exportTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reports.exportHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {exports.map(([label, file, make, n]) => (
              <button
                key={label}
                className="btn btn-ghost"
                disabled={!n}
                onClick={() => download(file, make(), () => toast.error(t("errors.exportFailed")))}
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
      <dd className="num mt-1 text-xl font-semibold">
        <bdi>{v}</bdi>
      </dd>
      {sub && <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
