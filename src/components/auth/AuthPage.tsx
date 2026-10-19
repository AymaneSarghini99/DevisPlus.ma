import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "@/components/Brand";
import { LegalLink } from "@/components/LegalPage";
import { authClient } from "@/lib/account/client";
import { hasLock, safeNext } from "@/lib/auth";
import type { SignupMode } from "@/lib/deployment";
import { loadTenant, MIN_PASSWORD, type Tenant } from "@/lib/tenant";

export type AuthMode = "signin" | "signup";
/** Result of the return from Google (?google=…, plus Better Auth's ?error=…). */
const GOOGLE_RESULTS: Record<string, string> = {
  denied: "auth.gDenied",
  not_configured: "auth.gNotConfigured",
};
/** Better Auth error codes shown with the app's own messages. */
const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "auth.wrong",
  USER_ALREADY_EXISTS: "auth.exists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "auth.exists",
  INVALID_EMAIL: "validation.email",
  PASSWORD_TOO_SHORT: "validation.passwordShort",
};

/** Google "G" mark (official colours). */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

/**
 * Sign-up and sign-in pages. Accounts are server accounts (Better Auth): an email + password
 * (hashed) or Google. After signing in, the page guard (AdminGate) loads the company's workspace
 * from the server, or shows the approval waiting page.
 */
export function AuthPage({
  mode,
  next,
  google,
}: {
  mode: AuthMode;
  next?: string | undefined;
  google?: string | undefined;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signup = mode === "signup";
  const page = signup ? "/inscription" : "/connexion";
  const [tenant, setTenant] = useState<Tenant | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"" | "form" | "google" | "session">("session");
  const [error, setError] = useState("");
  // One deployment per customer: accounts are created by the DevisPlus team.
  const [signupMode, setSignupMode] = useState<SignupMode>("approval");

  /** After sign-up / sign-in: the page asked for (the page guard opens the workspace). */
  const finish = () => {
    navigate({ to: safeNext(next) ?? "/dashboard", replace: true } as never);
  };
  const failWith = (code: string | undefined) =>
    setError(t((ERRORS[code ?? ""] ?? "auth.failed") as never));

  useEffect(() => {
    try {
      setTenant(loadTenant());
    } catch {
      setTenant(null);
    }
    // Back from Google: show the result, then clean the address bar.
    const params = new URLSearchParams(window.location.search);
    if (google || params.get("error")) {
      const code = params.get("error") === "access_denied" ? "denied" : (google ?? "error");
      if (code !== "ok") setError(t((GOOGLE_RESULTS[code] ?? "auth.gError") as never));
      window.history.replaceState(
        null,
        "",
        next ? `${page}?next=${encodeURIComponent(next)}` : page,
      );
    }
    if (signup)
      fetch("/api/app-config")
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (c: { signupMode?: SignupMode } | null) => c?.signupMode && setSignupMode(c.signupMode),
        )
        .catch(() => {});
    // Already signed in (e.g. just back from Google): go on.
    authClient
      .getSession()
      .then(({ data }) => {
        if (data?.user) finish();
      })
      .catch(() => {})
      .finally(() => setBusy(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (signup) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t("validation.email"));
      if (password.length < MIN_PASSWORD) return setError(t("validation.passwordShort"));
      if (password !== confirm) return setError(t("validation.passwordMatch"));
    }
    setBusy("form");
    try {
      const res = signup
        ? await authClient.signUp.email({ email: email.trim(), password, name: "" })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (res.error || !res.data?.user) {
        failWith(res.error?.code);
        if (!signup) setPassword("");
        return;
      }
      finish();
    } catch {
      failWith(undefined);
    } finally {
      setBusy("");
    }
  };

  const withGoogle = async () => {
    setError("");
    setBusy("google");
    const back = next ? `${page}?next=${encodeURIComponent(next)}` : page;
    const sep = back.includes("?") ? "&" : "?";
    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: back,
        newUserCallbackURL: back,
        errorCallbackURL: `${back}${sep}google=error`,
      });
      // On success the browser is already on its way to Google.
      if (res.error) {
        setError(t("auth.gNotConfigured"));
        setBusy("");
      }
    } catch {
      setError(t("auth.gError"));
      setBusy("");
    }
  };

  const exists = signup && tenant !== undefined && hasLock(tenant);
  const field = "field h-11";

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="ob-enter w-full max-w-sm">
            <h1 className="text-3xl font-semibold tracking-tight">
              {signup ? t("auth.signupTitle") : t("auth.title")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {signup ? t("auth.signupIntro") : t("auth.intro")}
            </p>

            {signup && signupMode === "closed" ? (
              <div className="mt-8 rounded-[var(--radius)] border bg-card p-5 text-sm">
                <p>{t("account.signupClosed")}</p>
                <Link
                  to="/connexion"
                  search={next ? { next } : {}}
                  className="btn btn-primary mt-4 w-full"
                >
                  {t("auth.toSignin")}
                </Link>
              </div>
            ) : exists ? (
              <div className="mt-8 rounded-[var(--radius)] border bg-card p-5 text-sm">
                <p>{t("auth.existing")}</p>
                <Link
                  to="/connexion"
                  search={next ? { next } : {}}
                  className="btn btn-primary mt-4 w-full"
                >
                  {t("auth.toSignin")}
                </Link>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={withGoogle}
                  disabled={!!busy}
                  className="mt-8 flex h-11 w-full items-center justify-center gap-3 rounded-[var(--radius)] border bg-card font-medium transition hover:bg-muted disabled:opacity-60"
                >
                  {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleG />}
                  {t("auth.google")}
                </button>

                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {t("auth.divider")}
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form noValidate onSubmit={submit} className={error ? "ob-shake" : ""}>
                  <label className="label" htmlFor="auth-email">
                    {t("auth.email")}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete={signup ? "email" : "username"}
                    dir="ltr"
                    className={field}
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
                      autoComplete={signup ? "new-password" : "current-password"}
                      dir="ltr"
                      className={`${field} pe-10`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                      aria-label={show ? t("auth.hide") : t("auth.show")}
                      aria-pressed={show}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {signup && (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
                      <label className="label mt-4 block" htmlFor="auth-confirm">
                        {t("auth.confirm")}
                      </label>
                      <input
                        id="auth-confirm"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        dir="ltr"
                        className={field}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </>
                  )}
                  {error && (
                    <p id="auth-error" role="alert" className="mt-3 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary mt-6 h-11 w-full"
                    disabled={!!busy || !email || !password}
                  >
                    {busy === "form" && <Loader2 className="size-4 animate-spin" />}
                    {signup
                      ? busy === "form"
                        ? t("auth.creating")
                        : t("auth.create")
                      : busy === "form"
                        ? t("auth.checking")
                        : t("auth.submit")}
                  </button>
                </form>

                {signup && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {t("auth.termsBefore")}{" "}
                    <LegalLink id="terms" className="underline underline-offset-2" />{" "}
                    {t("auth.termsAnd")}{" "}
                    <LegalLink id="privacy" className="underline underline-offset-2" />.
                  </p>
                )}
              </>
            )}

            <p className="mt-8 text-sm text-muted-foreground">
              {signup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
              <Link
                to={signup ? "/connexion" : "/inscription"}
                search={next ? { next } : {}}
                className="font-medium text-foreground underline underline-offset-2"
              >
                {signup ? t("auth.toSignin") : t("auth.toSignup")}
              </Link>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("auth.localNote")}</p>
          </div>
        </main>
      </div>

      {/* Brand panel (wide screens). */}
      <aside className="relative hidden overflow-hidden bg-[#14213D] p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-x-0 top-0 h-2 bg-[#B7F34A]" aria-hidden />
        <p className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
          {t("auth.sideTitle")}
        </p>
        <ul className="mt-8 space-y-3 text-white/80">
          {(["side1", "side2", "side3"] as const).map((k) => (
            <li key={k} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#B7F34A] text-[#14213D]">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {t(`auth.${k}`)}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
