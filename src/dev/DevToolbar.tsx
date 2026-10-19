import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eraser, FlaskConical, Wand2, X } from "lucide-react";
import { DEV_EVENT, type DevAction, type DevScope } from "./devFill";
import { MOCK_EMAIL, MOCK_PASSWORD } from "./mock";

/** Types into a React-controlled input (sets the value, then fires the input event). */
function typeInto(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Signs out and deletes this browser's workspace (setup, local data link), then reloads. The
 * account itself stays in the dev database: sign in with it again, or sign up with another email.
 */
async function resetAccount() {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).catch(() => {});
  localStorage.removeItem("devisplus.tenant");
  sessionStorage.clear();
  window.location.reload();
}

const HIDDEN = "devisplus.devbar.hidden";

/**
 * Local-only test toolbar (bottom center): fill or clear the setup wizard and the quote editor.
 * Rendered only under `vite dev`; × collapses it to a small button.
 */
export default function DevToolbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(HIDDEN) === "1");
    } catch {
      // ignore
    }
  }, []);
  // The sign-in screen replaces the page: watch for it.
  const [onLogin, setOnLogin] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOnLogin(!!document.getElementById("auth-password")), 600);
    return () => clearInterval(id);
  }, []);
  const toggle = (v: boolean) => {
    setHidden(v);
    try {
      sessionStorage.setItem(HIDDEN, v ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const scope: DevScope | "login" | null = onLogin
    ? "login"
    : path.startsWith("/onboarding")
      ? "onboarding"
      : path.startsWith("/devis/")
        ? "quote"
        : null;
  if (!scope) return null;
  const send = (action: DevAction) => {
    if (scope === "login") {
      if (action === "clear") void resetAccount();
      else {
        typeInto("auth-email", MOCK_EMAIL);
        typeInto("auth-password", MOCK_PASSWORD);
        typeInto("auth-confirm", MOCK_PASSWORD);
      }
      return;
    }
    // Restarting the wizard does not need the page (it may be behind the sign-in screen).
    if (scope === "onboarding" && action === "clear") return void resetAccount();
    window.dispatchEvent(new CustomEvent(DEV_EVENT, { detail: { scope, action } }));
  };

  if (hidden)
    return (
      <button
        type="button"
        onClick={() => toggle(false)}
        title="Outils de test (local)"
        aria-label="Afficher les outils de test"
        className="no-print fixed bottom-24 left-1/2 z-[65] flex size-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#14213D] text-[#B7F34A] shadow-lg"
      >
        <FlaskConical className="size-4" />
      </button>
    );

  return (
    <div
      role="toolbar"
      aria-label="Outils de test (local uniquement)"
      className="no-print fixed bottom-24 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#14213D] p-1.5 text-sm text-white shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)]"
    >
      <span className="flex items-center gap-1.5 px-2 text-xs text-[#B7F34A]">
        <FlaskConical className="size-3.5" /> Test
      </span>
      <button
        type="button"
        onClick={() => send("fill")}
        className="flex items-center gap-1.5 rounded-full bg-[#B7F34A] px-3 py-1.5 font-medium text-[#14213D] hover:brightness-95"
      >
        <Wand2 className="size-3.5" />
        {scope === "login"
          ? "Remplir les identifiants"
          : scope === "onboarding"
            ? "Remplir l'étape"
            : "Remplir le devis"}
      </button>
      <button
        type="button"
        onClick={() => send("clear")}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/10"
      >
        <Eraser className="size-3.5" /> {scope === "login" ? "Réinitialiser le compte" : "Vider"}
      </button>
      <button
        type="button"
        onClick={() => toggle(true)}
        aria-label="Masquer les outils de test"
        title="Masquer"
        className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
