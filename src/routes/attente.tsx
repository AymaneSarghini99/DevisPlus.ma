import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Clock,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  PauseCircle,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "@/components/Brand";
import { signOutAndLeave } from "@/components/AdminGate";
import { pageMeta } from "@/i18n/meta";
import { CONTACT } from "@/legal/operator";
import { authClient } from "@/lib/account/client";
import { whatsappUrl } from "@/lib/quotes";
import { closeWorkspace, type Approval } from "@/lib/workspace/client";

export const Route = createFileRoute("/attente")({
  head: ({ match }) => pageMeta(match, "waiting"),
  component: WaitingPage,
});

const ICONS = { pending: Clock, rejected: Ban, suspended: PauseCircle } as const;

/**
 * Shown to a signed-in user whose company the DevisPlus team has not approved yet (or has
 * rejected / suspended). The team decides from the admin portal; this page only checks again.
 */
function WaitingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [state, setState] = useState<{ approval: Approval; note: string; email: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/workspace/status", { credentials: "same-origin" });
      if (res.status === 401) return void navigate({ to: "/connexion", replace: true });
      const body = (await res.json().catch(() => null)) as {
        email?: string;
        org?: { approval: Approval; note: string };
      } | null;
      if (!body?.org) return;
      if (body.org.approval === "approved") {
        closeWorkspace();
        return void navigate({ to: "/dashboard", replace: true });
      }
      setState({ approval: body.org.approval, note: body.org.note, email: body.email ?? "" });
    } finally {
      setBusy(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) return void navigate({ to: "/connexion", replace: true });
    void check();
  }, [isPending, session?.user, check, navigate]);

  const approval = state?.approval === "approved" ? "pending" : (state?.approval ?? "pending");
  const Icon = ICONS[approval];
  const message = `${t("account.waiting.contactMessage")} ${state?.email ?? ""}`.trim();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {!state ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="…" />
        ) : (
          <div className="ob-enter w-full max-w-md border bg-card p-6 md:p-8">
            <span className="flex size-11 items-center justify-center rounded-full bg-accent">
              <Icon className="size-5" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {t(`account.waiting.${approval}Title`)}
            </h1>
            <p className="mt-2 text-muted-foreground">{t(`account.waiting.${approval}Text`)}</p>
            {state.email && (
              <p className="mt-4 text-sm">
                {t("account.waiting.signedInAs")} <bdi dir="ltr">{state.email}</bdi>
              </p>
            )}
            {state.note && approval !== "pending" && (
              <p className="mt-3 whitespace-pre-wrap rounded-[var(--radius)] bg-muted p-3 text-sm">
                {state.note}
              </p>
            )}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <a
                className="btn btn-ghost border"
                href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(t("account.waiting.contactSubject"))}&body=${encodeURIComponent(message)}`}
              >
                <Mail className="size-4" />
                {t("account.waiting.email")}
              </a>
              <a
                className="btn btn-ghost border"
                href={whatsappUrl(CONTACT.whatsapp, message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="btn btn-primary" onClick={check} disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t("account.waiting.check")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => signOutAndLeave()}>
                <LogOut className="size-4 rtl:-scale-x-100" />
                {t("auth.logout")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
