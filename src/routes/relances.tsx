import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellRing, ClipboardCopy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import { useTranslation } from "react-i18next";
import { makeFormat } from "@/i18n/format";
import { tFor } from "@/i18n/index";
import { useFormat } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import {
  daysBetween,
  loadQuotes,
  quoteTotals,
  reminderText,
  saveQuote,
  today,
  whatsappUrl,
  type Quote,
} from "@/lib/quotes";
import { errorMessage } from "@/lib/storage";

export const Route = createFileRoute("/relances")({
  head: ({ match }) => pageMeta(match, "followups"),
  component: FollowUps,
});

const SOON = 7; // days before expiry

/** Reminder message in the quote's document language. */
const reminderFor = (q: Quote) => {
  const lang = q.lang ?? "fr";
  return reminderText(q, tFor(lang), makeFormat(lang));
};

function FollowUps() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  useEffect(() => setQuotes(loadQuotes()), []);

  const now = today();
  const open = (quotes ?? []).filter((q) => q.status === "envoye" || q.status === "brouillon");
  const awaiting = open
    .filter((q) => q.status === "envoye" && q.validUntil >= now)
    .sort((a, b) => (a.sentAt || a.issueDate).localeCompare(b.sentAt || b.issueDate));
  const expiring = open
    .filter((q) => q.validUntil >= now && daysBetween(now, q.validUntil) <= SOON)
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil));
  const expired = open
    .filter((q) => q.validUntil < now)
    .sort((a, b) => b.validUntil.localeCompare(a.validUntil));

  const logReminder = (q: Quote) => {
    try {
      saveQuote({ ...q, reminders: [...q.reminders, { date: today(), channel: "whatsapp" }] });
      setQuotes(loadQuotes());
      toast.success(t("followups.logged"));
    } catch (e) {
      toast.error(errorMessage(e, t));
    }
  };
  const prepare = (q: Quote) => {
    window.open(whatsappUrl(q.client.phone, reminderFor(q)), "_blank", "noopener");
    toast(t("followups.preparedTitle"), {
      description: t("followups.preparedText"),
      duration: 12000,
      action: { label: t("followups.logReminder"), onClick: () => logReminder(q) },
    });
  };
  const copy = async (q: Quote) => {
    try {
      await navigator.clipboard.writeText(reminderFor(q));
      toast.success(t("followups.copied"));
    } catch {
      toast.error(t("errors.copyFailed"));
    }
  };

  const rows = (list: Quote[], note: (q: Quote) => string) =>
    list.length ? (
      <ul className="mt-3 divide-y border bg-card">
        {list.map((q) => {
          const last = q.reminders.at(-1);
          return (
            <li
              key={q.id}
              className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <Link
                    to="/devis/$id"
                    params={{ id: q.id }}
                    search={{}}
                    className="num font-medium underline-offset-2 hover:underline"
                  >
                    <bdi>{q.number}</bdi>
                  </Link>
                  <bdi className="truncate">{q.client.name || t("common.noClient")}</bdi>
                  <bdi className="num text-sm">{fmt.money(quoteTotals(q).ttc)}</bdi>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`status.quote.${q.status}`)} · {note(q)}
                  {" · "}
                  {last
                    ? t("followups.lastReminder", {
                        date: fmt.date(last.date),
                        count: q.reminders.length,
                      })
                    : t("followups.noReminder")}
                  {!q.client.phone && ` · ${t("followups.noPhone")}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button className="btn btn-ghost h-9" onClick={() => copy(q)}>
                  <ClipboardCopy className="size-4" /> {t("common.copy")}
                </button>
                <button className="btn btn-ghost h-9" onClick={() => logReminder(q)}>
                  {t("followups.logReminder")}
                </button>
                <button className="btn btn-primary h-9" onClick={() => prepare(q)}>
                  <MessageCircle className="size-4" /> {t("followups.prepare")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="mt-2 text-sm text-muted-foreground">{t("common.nothingToReport")}</p>
    );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title={t("followups.title")} />
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("followups.intro")}</p>

        {quotes === null ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !awaiting.length && !expiring.length && !expired.length ? (
          <EmptyState
            icon={<BellRing className="size-6" />}
            title={t("followups.emptyTitle")}
            action={
              <Link to="/dashboard" className="btn btn-ghost">
                {t("invoices.seeQuotes")}
              </Link>
            }
          >
            {t("followups.emptyText", { days: SOON })}
          </EmptyState>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <h2 className="font-semibold">
                {t("followups.awaiting")}{" "}
                <span className="num font-normal text-muted-foreground">({awaiting.length})</span>
              </h2>
              {rows(awaiting, (q) =>
                q.sentAt
                  ? daysBetween(q.sentAt, now) === 0
                    ? t("followups.sentToday")
                    : t("followups.sentDaysAgo", { count: daysBetween(q.sentAt, now) })
                  : t("followups.datedOn", { date: fmt.date(q.issueDate) }),
              )}
            </section>
            <section>
              <h2 className="font-semibold">
                {t("followups.expiring", { days: SOON })}{" "}
                <span className="num font-normal text-muted-foreground">({expiring.length})</span>
              </h2>
              {rows(expiring, (q) => {
                const d = daysBetween(now, q.validUntil);
                return d === 0
                  ? t("followups.expiresToday")
                  : t("followups.expiresOn", { date: fmt.date(q.validUntil), count: d });
              })}
            </section>
            {expired.length > 0 && (
              <section>
                <h2 className="font-semibold">
                  {t("followups.expired")}{" "}
                  <span className="num font-normal text-muted-foreground">({expired.length})</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("followups.expiredHint")}</p>
                {rows(expired, (q) => t("followups.expiredOn", { date: fmt.date(q.validUntil) }))}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
