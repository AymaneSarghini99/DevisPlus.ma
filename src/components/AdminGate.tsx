import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { authClient, linkLocalWorkspace } from "@/lib/account/client";
import { accessDecision, AUTH_PATHS } from "@/lib/auth";
import { isPublicPath } from "@/lib/paths";
import { loadTenant, type Tenant } from "@/lib/tenant";

/**
 * Access to the app pages (everything except the public pages, the sign-up / sign-in pages and
 * the owner's /admin page), based on the server session (Better Auth):
 * - not signed in: sign-in page (/connexion) when this browser has an account's workspace,
 *   otherwise sign-up (/inscription); both bring the visitor back to the page they asked for;
 * - signed in with another account than the one this browser's workspace belongs to: /connexion;
 * - signed in, setup not finished: the setup wizard;
 * - otherwise the page.
 * Until the session is known, app pages render nothing (their data is local anyway).
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { locale } = useLocale();
  const free = isPublicPath(path) || path.startsWith("/admin") || AUTH_PATHS.includes(path);
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (free || isPending) return;
    setOpen(false);
    const next = path === "/onboarding" ? undefined : path;
    const search = next ? { next } : {};
    let tenant: Tenant | null = null;
    if (user) {
      tenant = linkLocalWorkspace(user, locale);
      // This browser's workspace belongs to another account: the sign-in page explains.
      if (!tenant) return void navigate({ to: "/connexion", search, replace: true });
    } else {
      try {
        tenant = loadTenant();
      } catch {
        tenant = null;
      }
    }
    const decision = accessDecision(path, tenant, !!user);
    if (decision === "signup") navigate({ to: "/inscription", search, replace: true });
    else if (decision === "login") navigate({ to: "/connexion", search, replace: true });
    else if (decision === "setup") navigate({ to: "/onboarding", replace: true });
    else setOpen(true);
    // The user object changes identity on every refetch; its id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, free, isPending, user?.id, navigate]);

  if (free || open) return <>{children}</>;
  return <div className="min-h-screen" aria-busy="true" />;
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
      onClick={async () => {
        await authClient.signOut().catch(() => {});
        window.location.assign("/connexion");
      }}
    >
      <LogOut className="size-4 rtl:-scale-x-100" />
    </button>
  );
}
