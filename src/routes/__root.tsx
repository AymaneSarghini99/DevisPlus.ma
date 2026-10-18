import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_LOCALE,
  dirOf,
  isLocale,
  LOCALE_COOKIE,
  localeFromCookie,
  type Locale,
} from "../i18n/config";
import { LocaleProvider, useLocale } from "../i18n/LocaleProvider";
import { AdminGate } from "../components/AdminGate";
import { ConfirmHost } from "../components/ConfirmHost";
import { SiteFooter } from "../components/SiteFooter";
import { WhatsAppWidget } from "../components/WhatsAppWidget";

function LocalizedToaster() {
  const { dir } = useLocale();
  return (
    <Toaster
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      dir={dir}
      closeButton
      offset={{ bottom: 92 }}
      mobileOffset={{ bottom: 88 }}
    />
  );
}

function LocalizedFallback({ children }: { children: ReactNode }) {
  // Error and not-found screens can render outside RootComponent, so they get their own provider.
  const { locale } = Route.useRouteContext();
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}

function NotFoundComponent() {
  return (
    <LocalizedFallback>
      <NotFoundContent />
    </LocalizedFallback>
  );
}

function NotFoundContent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.notFoundText")}</p>
        <div className="mt-6">
          <Link to="/" className="btn btn-primary">
            {t("errors.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent(props: ErrorComponentProps) {
  return (
    <LocalizedFallback>
      <ErrorContent {...props} />
    </LocalizedFallback>
  );
}

function ErrorContent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const { t } = useTranslation();
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.crashTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.crashText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary"
          >
            {t("errors.retry")}
          </button>
          <a href="/" className="btn btn-ghost">
            {t("errors.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

/** Interface language from the cookie: read from the request on the server, from document.cookie
 *  in the browser. Both renders agree, so Arabic pages are RTL from the first paint. */
const readLocale = createIsomorphicFn()
  .server((): Locale => {
    const v = getCookie(LOCALE_COOKIE);
    return isLocale(v) ? v : DEFAULT_LOCALE;
  })
  .client((): Locale => localeFromCookie(document.cookie));

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: () => ({ locale: readLocale() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DevisPlus.ma" },
      { name: "description", content: "Devis professionnels pour entreprises marocaines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=IBM+Plex+Serif:wght@400;600&display=swap",
        // Readable by scripts (Google allows it) so "Download PDF" can embed the fonts.
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { locale } = Route.useRouteContext();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, locale } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider locale={locale}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <AdminGate>
          <Outlet />
        </AdminGate>
        <SiteFooter />
        <WhatsAppWidget />
        <LocalizedToaster />
        <ConfirmHost />
      </LocaleProvider>
    </QueryClientProvider>
  );
}
