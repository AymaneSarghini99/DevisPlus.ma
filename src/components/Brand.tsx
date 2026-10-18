import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Logo() {
  return (
    <Link to="/" className="shrink-0 text-lg font-semibold tracking-tight">
      Devis<span className="rounded-sm bg-primary px-1 text-accent">+</span>
      <span className="text-muted-foreground">.ma</span>
    </Link>
  );
}

const NAV = [
  { to: "/dashboard", label: "Devis" },
  { to: "/factures", label: "Factures" },
  { to: "/relances", label: "Relances" },
  { to: "/clients", label: "Clients" },
  { to: "/catalogue", label: "Catalogue" },
  { to: "/rapports", label: "Rapports" },
  { to: "/modeles", label: "Modèles" },
  { to: "/parametres", label: "Paramètres" },
] as const;

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="no-print border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 md:h-14 md:flex-nowrap">
        <div className="flex h-14 items-center md:h-auto">
          <Logo />
        </div>
        <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t md:order-none md:mx-0 md:w-auto md:flex-1 md:border-0">
          <nav
            aria-label="Navigation principale"
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
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex h-14 items-center gap-2 md:h-auto">{children}</div>
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
