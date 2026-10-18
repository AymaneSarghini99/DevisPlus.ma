import { Link, useRouterState } from "@tanstack/react-router";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LEGAL_DOCS } from "@/legal/documents";
import { CONTACT } from "@/legal/operator";
import { LanguageSwitcher, Logo } from "./Brand";
import { LegalLink } from "./LegalPage";
import { isPublicPath } from "@/lib/paths";

const tel = CONTACT.phone.replace(/\s/g, "");
const site = CONTACT.website.replace(/^https?:\/\//, "");

/** Full footer on the landing and legal pages, compact footer under the app screens. Never printed. */
export function SiteFooter() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return isPublicPath(path) ? <FullFooter /> : <CompactFooter />;
}

function FullFooter() {
  const { t } = useTranslation();
  return (
    <footer id="contact" className="no-print scroll-mt-20">
      <div className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.4fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t("site.tagline")}</p>
            <Link
              to="/nexx-entreprise-group"
              className="mt-4 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("site.partOfGroup")}
            </Link>
          </div>

          <FooterCol title={t("site.product")}>
            <FooterLink to="/tarifs" label={t("site.navPricing")} />
            <FooterLink to="/creer-devis-en-ligne" label={t("site.navCreateOnline")} />
            <FooterLink to="/guides" label={t("site.navGuides")} />
            <FooterLink to="/devis/$id" label={t("landing.cta")} />
            <FooterLink to="/dashboard" label={t("nav.myQuotes")} />
            <FooterLink to="/factures" label={t("nav.invoices")} />
            <FooterLink to="/clients" label={t("nav.clients")} />
            <FooterLink to="/modeles" label={t("nav.templates")} />
          </FooterCol>

          <FooterCol title={t("site.legal")}>
            {LEGAL_DOCS.map((d) => (
              <li key={d}>
                <LegalLink id={d} className="text-muted-foreground hover:text-foreground" />
              </li>
            ))}
          </FooterCol>

          <FooterCol title={t("site.contact")}>
            <li className="flex gap-2.5">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-label={t("site.addressLabel")}
              />
              <address className="not-italic">
                {t("site.street")}
                <br />
                {CONTACT.postalCode} {t("site.city")}
                {t("doc.listSep")}
                {t("site.country")}
              </address>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail
                className="size-4 shrink-0 text-muted-foreground"
                aria-label={t("site.emailLabel")}
              />
              <a href={`mailto:${CONTACT.email}`} className="underline-offset-2 hover:underline">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone
                className="size-4 shrink-0 text-muted-foreground"
                aria-label={t("site.phoneLabel")}
              />
              <a href={`tel:${tel}`} dir="ltr" className="num underline-offset-2 hover:underline">
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Globe
                className="size-4 shrink-0 text-muted-foreground"
                aria-label={t("site.websiteLabel")}
              />
              <a href={CONTACT.website} dir="ltr" className="underline-offset-2 hover:underline">
                {site}
              </a>
            </li>
          </FooterCol>
        </div>

        <div className="border-t">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground">
            <p>
              {t("common.footer")} · {t("site.rights")}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}

function CompactFooter() {
  const { t } = useTranslation();
  return (
    <footer className="no-print mt-8 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t("common.footer")}</span>
          <a href={`mailto:${CONTACT.email}`} className="underline-offset-2 hover:underline">
            {CONTACT.email}
          </a>
          <a href={`tel:${tel}`} dir="ltr" className="num underline-offset-2 hover:underline">
            {CONTACT.phone}
          </a>
        </div>
        <nav aria-label={t("legal.hubTitle")}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <a href="/legal" className="underline-offset-2 hover:underline">
                {t("legal.hubTitle")}
              </a>
            </li>
            {LEGAL_DOCS.map((d) => (
              <li key={d}>
                <LegalLink id={d} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  to,
  label,
}: {
  to:
    | "/dashboard"
    | "/factures"
    | "/clients"
    | "/modeles"
    | "/tarifs"
    | "/guides"
    | "/creer-devis-en-ligne"
    | "/devis/$id";
  label: string;
}) {
  return (
    <li>
      {to === "/devis/$id" ? (
        <Link
          to="/devis/$id"
          params={{ id: "nouveau" }}
          search={{}}
          className="text-muted-foreground hover:text-foreground"
        >
          {label}
        </Link>
      ) : (
        <Link to={to} className="text-muted-foreground hover:text-foreground">
          {label}
        </Link>
      )}
    </li>
  );
}
