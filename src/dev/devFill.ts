/**
 * Local test helper: lets the dev toolbar fill or clear the setup wizard and the quote
 * editor with test data. Active only under `vite dev` (import.meta.env.DEV); in a production
 * build the hook does nothing and the toolbar is not even bundled.
 */
import { useEffect, useRef } from "react";

export type DevScope = "onboarding" | "quote";
export type DevAction = "fill" | "clear";
export const DEV_EVENT = "devisplus:dev-fill";

export function useDevFill(scope: DevScope, handler: (action: DevAction) => void) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ scope: DevScope; action: DevAction }>).detail;
      if (d?.scope === scope) latest.current(d.action);
    };
    window.addEventListener(DEV_EVENT, on);
    return () => window.removeEventListener(DEV_EVENT, on);
  }, [scope]);
}
