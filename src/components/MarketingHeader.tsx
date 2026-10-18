import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "./Brand";

/** Sticky header of the public pages (landing, pricing): anchor links, language flags, app entry and main call to action. */
export function MarketingHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/#how", label: t("site.navHow") },
    { href: "/tarifs", label: t("site.navPricing") },
    { href: "/modeles", label: t("site.navTemplates") },
    { href: "/tarifs#contact", label: t("site.navContact") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t("nav.main")} className="hidden md:block">
            <ul className="flex items-center gap-6 text-sm">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          <Link to="/dashboard" className="btn btn-ghost hidden lg:inline-flex">
            {t("nav.myQuotes")}
          </Link>
          <Link
            to="/devis/$id"
            params={{ id: "nouveau" }}
            search={{}}
            className="btn btn-accent hidden sm:inline-flex"
          >
            {t("landing.cta")} <ArrowRight className="size-4 rtl:-scale-x-100" />
          </Link>
          <button
            type="button"
            className="btn btn-ghost size-10 px-0 md:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={t("site.menu")}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="landing-menu" aria-label={t("nav.main")} className="border-t bg-card md:hidden">
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-2 py-2.5 hover:bg-muted"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/dashboard" className="block rounded-sm px-2 py-2.5 hover:bg-muted">
                {t("nav.myQuotes")}
              </Link>
            </li>
            <li className="flex items-center justify-between gap-3 pt-2">
              <LanguageSwitcher />
              <Link
                to="/devis/$id"
                params={{ id: "nouveau" }}
                search={{}}
                className="btn btn-accent sm:hidden"
              >
                {t("landing.cta")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
