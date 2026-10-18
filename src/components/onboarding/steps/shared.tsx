import type { ReactNode } from "react";
import type { OnboardingStep } from "@/onboarding/config";
import type { StepField, Tenant } from "@/lib/tenant";

/** What every wizard step receives from the onboarding page. */
export type StepProps = {
  tenant: Tenant;
  /** Applies a change to the draft (auto-saved by the page). */
  update: (fn: (t: Tenant) => Tenant) => void;
  /** Translated error of a field, shown once the user has tried to continue. */
  err: (k: StepField) => string | undefined;
  goTo: (s: OnboardingStep) => void;
  /** Password being typed in the profile step: kept in memory only, never saved as typed. */
  secret: Secret;
  setSecret: (s: Secret) => void;
};
export type Secret = { password: string; confirm: string };

/** Input style shared by the wizard fields (soft lime focus halo). */
export const FIELD =
  "field transition-shadow focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_35%,transparent)]";

export function FormSection({
  title,
  delay,
  children,
}: {
  title?: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <fieldset className="ob-enter" style={{ animationDelay: `${delay}ms` }}>
      {title && (
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </legend>
      )}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Large selectable card used for single-choice options (radio semantics). */
export function ChoiceCard({
  checked,
  onSelect,
  title,
  text,
  icon,
  lang,
}: {
  checked: boolean;
  onSelect: () => void;
  title: ReactNode;
  text?: ReactNode;
  icon?: ReactNode;
  lang?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      lang={lang}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-start transition-all duration-300 hover:border-foreground/40 aria-checked:border-foreground aria-checked:bg-accent/25 aria-checked:shadow-[0_0_0_1px_var(--foreground)]"
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        {text && <span className="mt-0.5 block text-xs text-muted-foreground">{text}</span>}
      </span>
    </button>
  );
}
