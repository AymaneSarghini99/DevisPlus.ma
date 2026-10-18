import { DirectionProvider } from "@radix-ui/react-direction";
import { useRouter } from "@tanstack/react-router";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { dirOf, localeCookieValue, type Locale } from "./config";
import { makeFormat, type Format } from "./format";
import { getI18n } from "./index";

type Ctx = { locale: Locale; dir: "ltr" | "rtl"; fmt: Format; setLocale: (l: Locale) => void };
const LocaleContext = createContext<Ctx | null>(null);

/** Single source of the interface language. The value comes from the router context, which
 *  reads the language cookie on the server and in the browser, so the first render is right. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const value = useMemo<Ctx>(
    () => ({
      locale,
      dir: dirOf(locale),
      fmt: makeFormat(locale),
      setLocale: (l) => {
        document.cookie = localeCookieValue(l);
        document.documentElement.lang = l;
        document.documentElement.dir = dirOf(l);
        // Re-reads the cookie in the root route; pages keep their state (no remount).
        void router.invalidate();
      },
    }),
    [locale, router],
  );
  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={getI18n(locale)}>
        <DirectionProvider dir={value.dir}>{children}</DirectionProvider>
      </I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const c = useContext(LocaleContext);
  if (!c) throw new Error("useLocale must be used inside LocaleProvider");
  return c;
}

/** Formatting for the interface language. */
export const useFormat = () => useLocale().fmt;
