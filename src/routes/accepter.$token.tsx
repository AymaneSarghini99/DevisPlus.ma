import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { A4Preview } from "@/components/QuoteDocument";
import { LanguageSwitcher } from "@/components/Brand";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { quoteTotals, today, type Quote } from "@/lib/quotes";

export const Route = createFileRoute("/accepter/$token")({
  head: ({ match }) => pageMeta(match, "share"),
  component: SharedQuote,
});

/** The fields the server shares (lib/share/server.ts PUBLIC_FIELDS). */
type SharedData = Pick<
  Quote,
  | "number"
  | "status"
  | "issueDate"
  | "validUntil"
  | "company"
  | "client"
  | "lines"
  | "globalDiscount"
  | "deposit"
  | "terms"
  | "delivery"
  | "exemptionNote"
  | "template"
  | "accent"
  | "lang"
  | "style"
  | "watermark"
  | "acceptedAt"
  | "acceptedBy"
>;

/** Page the client opens from the quote's link: reads the quote and accepts it. No account. */
function SharedQuote() {
  const { token } = Route.useParams();
  const { t } = useTranslation();
  const { fmt } = useLocale();
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [quote, setQuote] = useState<SharedData | null>(null);
  const [logo, setLogo] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [sending, setSending] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/public/quote/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { quote: SharedData; logo: string } | null) => {
        if (!live) return;
        if (!d) return setState("missing");
        setQuote(d.quote);
        setLogo(d.logo);
        setState("ready");
      })
      .catch(() => live && setState("missing"));
    return () => {
      live = false;
    };
  }, [token]);

  const accept = async () => {
    if (!quote) return;
    if (name.trim().length < 2) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setSending(true);
    setFailed("");
    try {
      const r = await fetch(`/api/public/quote/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { acceptedAt?: string; error?: string };
      if (!r.ok) {
        setFailed(d.error === "expired" ? "expired" : d.error === "refused" ? "refused" : "failed");
        return;
      }
      setQuote({
        ...quote,
        status: "accepte",
        acceptedAt: d.acceptedAt ?? new Date().toISOString(),
        acceptedBy: name.trim(),
      });
      setJustAccepted(true);
    } catch {
      setFailed("failed");
    } finally {
      setSending(false);
    }
  };

  if (state !== "ready" || !quote)
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center text-sm text-muted-foreground">
        {state === "loading" ? t("share.loading") : t("share.notFound")}
      </main>
    );

  const company = quote.company.name;
  const amount = fmt.money(quoteTotals(quote).ttc);
  const expired = quote.status !== "accepte" && quote.validUntil < today();

  return (
    <div className="min-h-screen">
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {logo && <img src={logo} alt="" className="max-h-9 max-w-[120px] object-contain" />}
            <bdi className="truncate font-semibold">{company}</bdi>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="print-page mx-auto max-w-4xl space-y-6 px-4 py-6">
        <p className="no-print text-sm text-muted-foreground">{t("share.intro", { company })}</p>

        <A4Preview
          d={{
            ...quote,
            kind: "devis",
            secondDate: quote.validUntil,
            logo,
          }}
        />

        <section className="no-print space-y-3 border bg-card p-4">
          {quote.status === "accepte" ? (
            <p className="flex items-start gap-2 text-sm font-medium">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              {justAccepted
                ? t("share.acceptedNow")
                : t("share.accepted", {
                    date: fmt.date((quote.acceptedAt ?? "").slice(0, 10) || quote.issueDate),
                    name: quote.acceptedBy ?? "—",
                  })}
            </p>
          ) : quote.status === "refuse" || failed === "refused" ? (
            <p className="text-sm">{t("share.refused")}</p>
          ) : expired || failed === "expired" ? (
            <p className="text-sm">
              {t("share.expired", { date: fmt.date(quote.validUntil), company })}
            </p>
          ) : (
            <>
              <h2 className="font-semibold">{t("share.acceptTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("share.acceptText", { number: quote.number, amount, company })}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="acc-name" className="mb-1 block text-xs text-muted-foreground">
                    {t("share.name")}
                  </label>
                  <input
                    id="acc-name"
                    className="field"
                    dir="auto"
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    aria-invalid={nameError}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" onClick={accept} disabled={sending}>
                  <CheckCircle2 className="size-4" />{" "}
                  {sending ? t("share.accepting") : t("share.accept")}
                </button>
              </div>
              {nameError && (
                <p className="text-xs text-destructive" role="alert">
                  {t("share.nameInvalid")}
                </p>
              )}
              {failed === "failed" && (
                <p className="text-xs text-destructive" role="alert">
                  {t("share.failed")}
                </p>
              )}
            </>
          )}
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Printer className="size-4" /> {t("share.print")}
          </button>
        </section>
        <p className="no-print text-center text-xs text-muted-foreground">{t("share.by")}</p>
      </main>
    </div>
  );
}
