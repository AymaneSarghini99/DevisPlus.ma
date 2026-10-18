import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/devisplus-logo.png";
import { LOCALES, NATIVE_NAME } from "@/i18n/config";
import { useLocale } from "@/i18n/LocaleProvider";
import { Flag } from "./Flags";

export function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="shrink-0" aria-label={t("nav.home")}>
      {/* The logo is never mirrored, whatever the page direction. */}
      <img src={logo} alt="DevisPlus.ma" width={480} height={92} className="h-7 w-auto" />
    </Link>
  );
}

/** Interface language selector: one flag button per language, shown in every header.
 *  Switching keeps the current page and its data. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  return (
    <div
      role="group"
      aria-label={t("nav.chooseLanguage")}
      className={`flex items-center gap-0.5 ${className}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-label={NATIVE_NAME[l]}
          title={NATIVE_NAME[l]}
          aria-pressed={locale === l}
          onClick={() => locale !== l && setLocale(l)}
          className="rounded-sm p-1.5 opacity-60 transition hover:bg-muted hover:opacity-100 aria-pressed:bg-muted aria-pressed:opacity-100 aria-pressed:ring-1 aria-pressed:ring-foreground/30"
        >
          <Flag locale={l} />
        </button>
      ))}
    </div>
  );
}

const NAV = [
  { to: "/dashboard", key: "dashboard" },
  { to: "/factures", key: "invoices" },
  { to: "/relances", key: "followups" },
  { to: "/clients", key: "clients" },
  { to: "/catalogue", key: "catalogue" },
  { to: "/rapports", key: "reports" },
  { to: "/modeles", key: "templates" },
  { to: "/parametres", key: "settings" },
] as const;

export function AppHeader({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <header className="no-print border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 md:h-14 md:flex-nowrap">
        <div className="flex h-14 items-center md:h-auto">
          <Logo />
        </div>
        <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t md:order-none md:mx-0 md:w-auto md:flex-1 md:border-0">
          <nav
            aria-label={t("nav.main")}
            className="flex h-11 items-stretch gap-5 px-4 text-sm md:h-14 md:px-0"
          >
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center whitespace-nowrap border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                activeProps={{ className: "!border-accent font-medium !text-foreground" }}
                activeOptions={{ includeSearch: false }}
              >
                {t(`nav.${n.key}`)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex h-14 items-center gap-2 md:h-auto">
          {children}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mt-8 border border-dashed bg-card px-6 py-12 text-center">
      <div className="mx-auto flex size-6 items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
