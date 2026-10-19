import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "@/components/Brand";
import { CONTACT } from "@/legal/operator";
import { authClient } from "@/lib/account/client";
import { whatsappUrl } from "@/lib/quotes";
import { MIN_PASSWORD } from "@/lib/tenant";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same frame as the sign-in page: logo, language, one card. */
function Frame({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="ob-enter w-full max-w-sm border bg-card p-6 md:p-8">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent">
            <KeyRound className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

function Done({ text, to, label }: { text: string; to: string; label: string }) {
  return (
    <div className="mt-6 space-y-4 text-sm">
      <p className="flex gap-2 rounded-sm border-s-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-emerald-950">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        {text}
      </p>
      <Link to={to} className="btn btn-primary w-full">
        {label}
      </Link>
    </div>
  );
}

/** New password + confirmation, with the app's checks. */
function NewPasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
}: {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <label className="label mt-4 block" htmlFor="pw-new">
        {t("account.password.new")}
      </label>
      <input
        id="pw-new"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        className="field h-11"
        value={password}
        onChange={(e) => onPassword(e.target.value)}
      />
      <p className="mt-1 text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
      <label className="label mt-4 block" htmlFor="pw-confirm">
        {t("auth.confirm")}
      </label>
      <input
        id="pw-confirm"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        className="field h-11"
        value={confirm}
        onChange={(e) => onConfirm(e.target.value)}
      />
    </>
  );
}

const checkNew = (password: string, confirm: string) =>
  password.length < MIN_PASSWORD
    ? "validation.passwordShort"
    : password !== confirm
      ? "validation.passwordMatch"
      : null;

/**
 * "Mot de passe oublié": a reset link by email when the deployment has an email service;
 * otherwise the DevisPlus team sets a new password (admin portal), so the page offers to ask them.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [byEmail, setByEmail] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/app-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { resetByEmail?: boolean } | null) => setByEmail(!!c?.resetByEmail))
      .catch(() => setByEmail(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!EMAIL.test(email.trim())) return setError(t("validation.email"));
    setBusy(true);
    try {
      const res = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reinitialiser",
      });
      // Same answer whether the account exists or not (no way to test addresses).
      if (res.error && res.error.status >= 500) setError(t("auth.failed"));
      else setSent(true);
    } catch {
      setError(t("auth.failed"));
    } finally {
      setBusy(false);
    }
  };

  const message = `${t("account.password.contactMessage")} ${email.trim()}`.trim();

  return (
    <Frame title={t("account.password.forgotTitle")} intro={t("account.password.forgotIntro")}>
      {byEmail === null ? (
        <Loader2 className="mt-6 size-5 animate-spin text-muted-foreground" />
      ) : sent ? (
        <Done text={t("account.password.sent")} to="/connexion" label={t("auth.toSignin")} />
      ) : (
        <form noValidate onSubmit={submit} className={error ? "ob-shake" : ""}>
          <label className="label mt-6 block" htmlFor="pw-email">
            {t("auth.email")}
          </label>
          <input
            id="pw-email"
            type="email"
            autoComplete="username"
            dir="ltr"
            className="field h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {byEmail ? (
            <button
              type="submit"
              className="btn btn-primary mt-6 h-11 w-full"
              disabled={busy || !email}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("account.password.sendLink")}
            </button>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted-foreground">{t("account.password.byTeam")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  className="btn btn-primary"
                  href={whatsappUrl(CONTACT.whatsapp, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
                <a
                  className="btn btn-ghost border"
                  href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(t("account.password.contactSubject"))}&body=${encodeURIComponent(message)}`}
                >
                  <Mail className="size-4" />
                  {t("account.waiting.email")}
                </a>
              </div>
            </>
          )}
          <p className="mt-6 text-sm">
            <Link to="/connexion" className="font-medium underline underline-offset-2">
              {t("account.password.back")}
            </Link>
          </p>
        </form>
      )}
    </Frame>
  );
}

/** From the email link (/reinitialiser?token=…): choose the new password. */
export function ResetPasswordPage({
  token,
  error: linkError,
}: {
  token?: string | undefined;
  error?: string | undefined;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError || !token ? t("account.password.badLink") : "");
  const [done, setDone] = useState(false);
  const usable = !!token && !linkError;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const bad = checkNew(password, confirm);
    if (bad) return setError(t(bad));
    setError("");
    setBusy(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token: token! });
      if (res.error) setError(t("account.password.badLink"));
      else setDone(true);
    } catch {
      setError(t("auth.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame title={t("account.password.resetTitle")} intro={t("account.password.resetIntro")}>
      {done ? (
        <Done text={t("account.password.resetDone")} to="/connexion" label={t("auth.toSignin")} />
      ) : (
        <form noValidate onSubmit={submit} className={error ? "ob-shake" : ""}>
          {usable && (
            <NewPasswordFields
              password={password}
              confirm={confirm}
              onPassword={setPassword}
              onConfirm={setConfirm}
            />
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {usable ? (
            <button type="submit" className="btn btn-primary mt-6 h-11 w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("account.password.save")}
            </button>
          ) : (
            <Link to="/mot-de-passe-oublie" className="btn btn-primary mt-6 h-11 w-full">
              {t("account.password.newLink")}
            </Link>
          )}
        </form>
      )}
    </Frame>
  );
}

/** Signed in: change the password (current one required); other devices are signed out. */
export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user)
      navigate({ to: "/connexion", search: { next: "/mot-de-passe" }, replace: true });
  }, [isPending, session?.user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const bad = checkNew(password, confirm);
    if (bad) return setError(t(bad));
    setError("");
    setBusy(true);
    try {
      const res = await authClient.changePassword({
        currentPassword: current,
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (res.error)
        setError(
          res.error.code === "INVALID_PASSWORD"
            ? t("account.password.wrongCurrent")
            : res.error.code === "CREDENTIAL_ACCOUNT_NOT_FOUND"
              ? t("account.password.googleOnly")
              : t("auth.failed"),
        );
      else setDone(true);
    } catch {
      setError(t("auth.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame
      title={t("account.password.changeTitle")}
      intro={
        session?.user
          ? t("account.password.changeIntro", { email: session.user.email })
          : t("common.loading")
      }
    >
      {done ? (
        <Done
          text={t("account.password.changed")}
          to="/dashboard"
          label={t("account.password.toApp")}
        />
      ) : (
        <form noValidate onSubmit={submit} className={error ? "ob-shake" : ""}>
          <label className="label mt-6 block" htmlFor="pw-current">
            {t("account.password.current")}
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            className="field h-11"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <NewPasswordFields
            password={password}
            confirm={confirm}
            onPassword={setPassword}
            onConfirm={setConfirm}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary mt-6 h-11 w-full"
            disabled={busy || !current || !password}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("account.password.save")}
          </button>
          <p className="mt-6 text-sm">
            <Link to="/mot-de-passe-oublie" className="underline underline-offset-2">
              {t("account.password.forgotLink")}
            </Link>
          </p>
        </form>
      )}
    </Frame>
  );
}
