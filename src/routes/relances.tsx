import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellRing, ClipboardCopy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, PageTitle } from "@/components/Brand";
import {
  daysBetween,
  fmtDate,
  loadQuotes,
  mad,
  quoteTotals,
  reminderText,
  saveQuote,
  STATUS_LABEL,
  today,
  whatsappUrl,
  type Quote,
} from "@/lib/quotes";
import { errorMessage } from "@/lib/storage";

export const Route = createFileRoute("/relances")({
  head: () => ({
    meta: [
      { title: "Relances — DevisPlus.ma" },
      {
        name: "description",
        content: "Devis en attente de réponse et devis proches de leur date d'expiration.",
      },
    ],
  }),
  component: FollowUps,
});

const SOON = 7; // days before expiry

function FollowUps() {
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
      toast.success("Relance notée dans l'historique du devis.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const prepare = (q: Quote) => {
    window.open(whatsappUrl(q.client.phone, reminderText(q)), "_blank", "noopener");
    toast("Message de relance préparé dans WhatsApp", {
      description:
        "Envoyez-le depuis WhatsApp, puis notez la relance ici. DevisPlus ne sait pas si le message a été envoyé ou lu.",
      duration: 12000,
      action: { label: "Noter la relance", onClick: () => logReminder(q) },
    });
  };
  const copy = async (q: Quote) => {
    try {
      await navigator.clipboard.writeText(reminderText(q));
      toast.success("Message copié.");
    } catch {
      toast.error("Copie impossible dans ce navigateur.");
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
                    {q.number}
                  </Link>
                  <span className="truncate">{q.client.name || "Sans client"}</span>
                  <span className="num text-sm">{mad(quoteTotals(q).ttc)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {STATUS_LABEL[q.status]} · {note(q)}
                  {last
                    ? ` · dernière relance notée le ${fmtDate(last.date)} (${q.reminders.length})`
                    : " · aucune relance notée"}
                  {!q.client.phone && " · pas de téléphone : choisissez le contact dans WhatsApp"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button className="btn btn-ghost h-9" onClick={() => copy(q)}>
                  <ClipboardCopy className="size-4" /> Copier
                </button>
                <button className="btn btn-ghost h-9" onClick={() => logReminder(q)}>
                  Noter une relance
                </button>
                <button className="btn btn-primary h-9" onClick={() => prepare(q)}>
                  <MessageCircle className="size-4" /> Préparer la relance
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="mt-2 text-sm text-muted-foreground">Rien à signaler.</p>
    );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageTitle title="Relances" />
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Les relances sont préparées dans WhatsApp et envoyées par vous. L'historique indique les
          relances que vous avez notées, pas leur réception par le client.
        </p>

        {quotes === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Chargement…</p>
        ) : !awaiting.length && !expiring.length && !expired.length ? (
          <EmptyState
            icon={<BellRing className="size-6" />}
            title="Aucune relance à faire"
            action={
              <Link to="/dashboard" className="btn btn-ghost">
                Voir mes devis
              </Link>
            }
          >
            Les devis marqués « Envoyé » et ceux qui expirent dans les {SOON} prochains jours
            apparaîtront ici.
          </EmptyState>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <h2 className="font-semibold">
                En attente de réponse{" "}
                <span className="num font-normal text-muted-foreground">({awaiting.length})</span>
              </h2>
              {rows(awaiting, (q) =>
                q.sentAt
                  ? daysBetween(q.sentAt, now) === 0
                    ? "envoyé aujourd'hui"
                    : `envoyé il y a ${daysBetween(q.sentAt, now)} j`
                  : `daté du ${fmtDate(q.issueDate)}`,
              )}
            </section>
            <section>
              <h2 className="font-semibold">
                Expirent dans les {SOON} jours{" "}
                <span className="num font-normal text-muted-foreground">({expiring.length})</span>
              </h2>
              {rows(expiring, (q) => {
                const d = daysBetween(now, q.validUntil);
                return d === 0
                  ? "expire aujourd'hui"
                  : `expire le ${fmtDate(q.validUntil)} (J-${d})`;
              })}
            </section>
            {expired.length > 0 && (
              <section>
                <h2 className="font-semibold">
                  Expirés sans réponse{" "}
                  <span className="num font-normal text-muted-foreground">({expired.length})</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Prolongez la validité dans le devis ou passez-le en « Refusé ».
                </p>
                {rows(expired, (q) => `expiré le ${fmtDate(q.validUntil)}`)}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
