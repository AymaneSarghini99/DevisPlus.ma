import { useEffect, useLayoutEffect, useState } from "react";
import { loadSettings, type Settings } from "./store";

/** Look of the client's own workspace (app pages only; never the documents or public pages). */
export type AppTheme = { logo: string; button: string; line: string };

export const APP_THEME_EVENT = "devisplus:app-theme";
/** Built-in colour of the main buttons and of the line under the active header link. */
export const DEFAULT_APP_COLOR = "#B7F34A";
export const APP_SWATCHES = [
  "#B7F34A",
  "#14213D",
  "#0F766E",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
];

export const isHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);

/** Dark navy or white text, whichever reads better on `hex`. */
export function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.36 ? "#14213D" : "#FFFFFF";
}

export const appThemeOf = (s: Pick<Settings, "appLogo" | "appButton" | "appLine">): AppTheme => ({
  logo: s.appLogo,
  button: s.appButton,
  line: s.appLine,
});

/** Sets (or, with null, removes) the colour variables used by the buttons and header line. */
export function applyAppTheme(t: AppTheme | null) {
  const st = document.documentElement.style;
  if (t && isHex(t.button)) {
    st.setProperty("--app-btn", t.button);
    st.setProperty("--app-btn-fg", readableOn(t.button));
  } else {
    st.removeProperty("--app-btn");
    st.removeProperty("--app-btn-fg");
  }
  if (t && isHex(t.line)) st.setProperty("--app-line", t.line);
  else st.removeProperty("--app-line");
}

/** Live preview from the settings page, before saving. */
export const previewAppTheme = (t: AppTheme) =>
  window.dispatchEvent(new CustomEvent<AppTheme>(APP_THEME_EVENT, { detail: t }));

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Saved workspace look, applied while an app page is shown; returns it for the header logo. */
export function useAppTheme(): AppTheme | null {
  const [theme, setTheme] = useState<AppTheme | null>(null);
  useIsoLayoutEffect(() => {
    let saved: AppTheme | null = null;
    try {
      saved = appThemeOf(loadSettings());
    } catch {
      saved = null;
    }
    setTheme(saved);
    applyAppTheme(saved);
    const onPreview = (e: Event) => {
      const t = (e as CustomEvent<AppTheme>).detail;
      setTheme(t);
      applyAppTheme(t);
    };
    window.addEventListener(APP_THEME_EVENT, onPreview);
    return () => {
      window.removeEventListener(APP_THEME_EVENT, onPreview);
      applyAppTheme(null);
    };
  }, []);
  return theme;
}
