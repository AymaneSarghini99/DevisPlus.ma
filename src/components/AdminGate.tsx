import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { authClient } from "@/lib/account/client";
import { accessDecision, AUTH_PATHS } from "@/lib/auth";
import { isPublicPath } from "@/lib/paths";
import { loadTenant, type Tenant } from "@/lib/tenant";
import {
  closeWorkspace,
  flushWorkspace,
  onWorkspaceSync,
  openWorkspace,
} from "@/lib/workspace/client";

/** Page shown while the DevisPlus team has not approved the company. */
export const WAITING_PATH = "/attente";

/**
 * Access to the app pages (everything except the public pages, the sign-up / sign-in pages, the
 * waiting page and the owner's /admin page), based on the server session (Better Auth):
 * - not signed in: sign-in page (/connexion) when this browser has an account's workspace,
 *   otherwise sign-up (/inscription); both bring the visitor back to the page they asked for;
 * - signed in: the company's workspace is loaded from the server. While the DevisPlus team has
 *   not approved the company (or after a rejection / suspension): the waiting page;
 * - setup not finished: the setup wizard;
 * - otherwise the page.
 * Until the workspace is loaded, app pages render nothing.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const free =
    isPublicPath(path) ||
    path.startsWith("/admin") ||
    AUTH_PATHS.includes(path) ||
    path === WAITING_PATH;
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (free || isPending) return;
    let live = true;
    setOpen(false);
    setFailed(false);
    const next = path === "/onboarding" ? undefined : path;
    const search = next ? { next } : {};
    const decide = (tenant: Tenant | null, signedIn: boolean) => {
      const decision = accessDecision(path, tenant, signedIn);
      if (decision === "signup") navigate({ to: "/inscription", search, replace: true });
      else if (decision === "login") navigate({ to: "/connexion", search, replace: true });
      else if (decision === "setup") navigate({ to: "/onboarding", replace: true });
      else setOpen(true);
    };
    if (!user) {
      closeWorkspace();
      let tenant: Tenant | null = null;
      try {
        tenant = loadTenant();
      } catch {
        tenant = null;
      }
      decide(tenant, false);
      return;
    }
    openWorkspace(user, locale).then((r) => {
      if (!live) return;
      if (r.kind === "waiting") return void navigate({ to: WAITING_PATH, replace: true });
      if (r.kind === "error") return setFailed(true);
      if (r.imported) toast.success(t("account.sync.imported"), { id: "sync-imported" });
      // The tenant as saved now (the wizard may have finished since the workspace opened).
      let tenant: Tenant | null = null;
      try {
        tenant = loadTenant();
      } catch {
        tenant = null;
      }
      decide(tenant ?? r.tenant, true);
    });
    return () => {
      live = false;
    };
    // The user object changes identity on every refetch; its id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, free, isPending, user?.id, navigate, attempt]);

  // Saves that the server refused, or that keep failing, are reported (one message each).
  useEffect(
    () =>
      onWorkspaceSync((s, error) => {
        if (s === "error")
          toast.error(
            error === "issuedLocked" ? t("errors.issuedLocked") : t("account.sync.refused"),
            { id: "sync-error" },
          );
        else if (s === "retrying") toast.warning(t("account.sync.retrying"), { id: "sync-retry" });
        else if (s === "saved") toast.dismiss("sync-retry");
      }),
    [t],
  );

  if (free || open) return <>{children}</>;
  if (failed)
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="font-medium">{t("account.sync.loadFailed")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("account.sync.loadFailedText")}</p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => {
              closeWorkspace();
              setAttempt((a) => a + 1);
            }}
          >
            <RefreshCw className="size-4" />
            {t("account.sync.retry")}
          </button>
        </div>
      </div>
    );
  return <div className="min-h-screen" aria-busy="true" />;
}

/** Signs out after sending the changes not saved yet. */
export async function signOutAndLeave(to = "/connexion") {
  // Never wait more than a few seconds (offline): the rest is retried after the next sign-in.
  await Promise.race([flushWorkspace().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
  await authClient.signOut().catch(() => {});
  closeWorkspace();
  window.location.assign(to);
}

/** Sign-out button for the app header; only shown when someone is signed in. */
export function LogoutButton() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  if (!session?.user) return null;
  return (
    <button
      type="button"
      className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      aria-label={t("auth.logout")}
      title={t("auth.logout")}
      onClick={() => signOutAndLeave()}
    >
      <LogOut className="size-4 rtl:-scale-x-100" />
    </button>
  );
}
