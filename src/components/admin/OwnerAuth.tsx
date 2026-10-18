import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "@/components/Brand";
import { createAdmin, saveOwner, signInOwner, verifyAdmin } from "@/lib/auth";
import { MIN_PASSWORD } from "@/lib/tenant";
import type { AdminAccount } from "@/lib/tenant";

/** First visit: create the owner access. Later visits: sign in. */
export function OwnerAuth({
  owner,
  onDone,
}: {
  owner: AdminAccount | null;
  onDone: (a: AdminAccount) => void;
}) {
  const { t } = useTranslation();
  const setup = !owner;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (setup) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t("validation.email"));
      if (password.length < MIN_PASSWORD) return setError(t("validation.passwordShort"));
      if (password !== confirm) return setError(t("validation.passwordMatch"));
    }
    setBusy(true);
    try {
      if (setup) {
        const a = await createAdmin(email, password);
        saveOwner(a);
        signInOwner(a);
        onDone(a);
      } else if (await verifyAdmin(owner, email, password)) {
        signInOwner(owner);
        onDone(owner);
      } else {
        setError(t("admin.owner.wrong"));
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          noValidate
          className={`ob-enter w-full max-w-sm border bg-card p-6 md:p-8 ${error ? "ob-shake" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-accent">
            <ShieldCheck className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {setup ? t("admin.owner.setupTitle") : t("admin.owner.signInTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {setup ? t("admin.owner.setupText") : t("admin.owner.signInText")}
          </p>
          <label className="label mt-6 block" htmlFor="ow-email">
            {t("admin.owner.email")}
          </label>
          <input
            id="ow-email"
            type="email"
            autoComplete="username"
            dir="ltr"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="label mt-4 block" htmlFor="ow-password">
            {t("admin.owner.password")}
          </label>
          <input
            id="ow-password"
            type="password"
            autoComplete={setup ? "new-password" : "current-password"}
            dir="ltr"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {setup && (
            <>
              <label className="label mt-4 block" htmlFor="ow-confirm">
                {t("admin.owner.confirm")}
              </label>
              <input
                id="ow-confirm"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                className="field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary mt-6 h-11 w-full"
            disabled={busy || !email || !password}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {setup ? t("admin.owner.create") : t("admin.owner.signIn")}
          </button>
        </form>
      </main>
    </div>
  );
}
