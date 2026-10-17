import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="text-lg font-semibold tracking-tight">
      Devis<span className="rounded-sm bg-primary px-1 text-accent">+</span>
      <span className="text-muted-foreground">.ma</span>
    </Link>
  );
}

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="no-print border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-medium" }}>
            Mes devis
          </Link>
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
