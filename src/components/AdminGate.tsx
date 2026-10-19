import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { accessDecision, AUTH_PATHS, hasLock, isUnlocked, lock } from "@/lib/auth";
import { isPublicPath } from "@/lib/paths";
import { loadTenant, type Tenant } from "@/lib/tenant";

/**
 * Access to the app pages (everything except the public pages, the sign-up / sign-in pages and
 * the owner's /admin page):
 * - no account in this browser: sign-up page (/inscription), then the setup wizard;
 * - account, not signed in during this browser session: sign-in page (/connexion), which
 *   brings the visitor back to the page they asked for;
 * - signed in, setup not finished: the setup wizard;
 * - otherwise the page.
 * Until the browser check has run, app pages render nothing (their data is local anyway).
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const free = isPublicPath(path) || path.startsWith("/admin") || AUTH_PATHS.includes(path);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (free) return;
    setOpen(false);
    let tenant: Tenant | null = null;
    try {
      tenant = loadTenant();
    } catch {
      tenant = null;
    }
    const decision = accessDecision(path, tenant, !!tenant && isUnlocked(tenant));
    const next = path === "/onboarding" ? undefined : path;
    if (decision === "signup")
      navigate({ to: "/inscription", search: next ? { next } : {}, replace: true });
    else if (decision === "login")
      navigate({ to: "/connexion", search: next ? { next } : {}, replace: true });
    else if (decision === "setup") navigate({ to: "/onboarding", replace: true });
    else setOpen(true);
  }, [path, free, navigate]);

  if (free || open) return <>{children}</>;
  return <div className="min-h-screen" aria-busy="true" />;
}

/** Sign-out button for the app header; only shown when an account exists. */
export function LogoutButton() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      setVisible(hasLock(loadTenant()));
    } catch {
      setVisible(false);
    }
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      aria-label={t("auth.logout")}
      title={t("auth.logout")}
      onClick={() => {
        lock();
        window.location.assign("/connexion");
      }}
    >
      <LogOut className="size-4 rtl:-scale-x-100" />
    </button>
  );
}
