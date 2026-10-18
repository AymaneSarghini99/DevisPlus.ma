import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Loader2, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { accessDecision, hasLock, isUnlocked, lock, unlock, verifyAdmin } from "@/lib/auth";
import { isPublicPath } from "@/lib/paths";
import { loadTenant, type Tenant } from "@/lib/tenant";
import { LanguageSwitcher, Logo } from "./Brand";

type State =
  | { status: "checking" }
  | { status: "open" }
  | { status: "setup" }
  | { status: "locked"; tenant: Tenant };

/**
 * Access to the app pages (everything except the public pages and the owner's /admin page):
 * - no account yet, or setup not finished: the visitor is sent to the setup wizard, whose
 *   first step creates the account (admin email and password);
 * - account but not signed in during this browser session: the sign-in screen;
 * - otherwise the page.
 * Until the browser check has run, app pages render nothing (their data is local anyway).
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isPublic = isPublicPath(path) || path.startsWith("/admin");
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    if (isPublic) return;
    let tenant: Tenant | null = null;
    try {
      tenant = loadTenant();
    } catch {
      tenant = null;
    }
    const decision = accessDecision(path, tenant, !!tenant && isUnlocked(tenant));
    if (decision === "login" && tenant) setState({ status: "locked", tenant });
    else if (decision === "setup") {
      setState({ status: "setup" });
      navigate({ to: "/onboarding", replace: true });
    } else setState({ status: "open" });
  }, [path, isPublic, navigate]);

  if (isPublic) return <>{children}</>;
  if (state.status === "checking" || state.status === "setup")
    return <div className="min-h-screen" aria-busy="true" />;
  if (state.status === "locked")
    return (
      <SignIn
        tenant={state.tenant}
        onDone={() => {
          // Signed in: continue the setup if it is not finished yet.
          if (accessDecision(path, state.tenant, true) === "setup") {
            setState({ status: "setup" });
            navigate({ to: "/onboarding", replace: true });
          } else setState({ status: "open" });
        }}
      />
    );
  return <>{children}</>;
}

function SignIn({ tenant, onDone }: { tenant: Tenant; onDone: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  const submit = async () => {
    setBusy(true);
    setWrong(false);
    try {
      if (await verifyAdmin(tenant.admin, email, password)) {
        unlock(tenant);
        onDone();
      } else {
        setWrong(true);
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          noValidate
          className={`ob-enter w-full max-w-sm border bg-card p-6 md:p-8 ${wrong ? "ob-shake" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-accent">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("auth.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.intro")}</p>

          <label className="label mt-6 block" htmlFor="auth-email">
            {t("auth.email")}
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="username"
            dir="ltr"
            required
            className="field"
            aria-invalid={wrong}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="label mt-4 block" htmlFor="auth-password">
            {t("auth.password")}
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              dir="ltr"
              required
              className="field pe-10"
              aria-invalid={wrong}
              aria-describedby={wrong ? "auth-error" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
              aria-label={show ? t("onboarding.profile.hide") : t("onboarding.profile.show")}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {wrong && (
            <p id="auth-error" role="alert" className="mt-2 text-sm text-destructive">
              {t("auth.wrong")}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary mt-6 h-11 w-full"
            disabled={busy || !email || !password}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {t("auth.checking")}
              </>
            ) : (
              t("auth.submit")
            )}
          </button>
          <p className="mt-4 text-xs text-muted-foreground">{t("auth.localNote")}</p>
        </form>
      </main>
    </div>
  );
}

/** Sign-out button for the app header; only shown when an admin password exists. */
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
        toast(t("auth.loggedOut"));
        window.location.assign("/dashboard");
      }}
    >
      <LogOut className="size-4 rtl:-scale-x-100" />
    </button>
  );
}
