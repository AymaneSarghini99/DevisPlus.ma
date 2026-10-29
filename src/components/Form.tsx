import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Party } from "@/lib/quotes";

export const ACCENTS = ["#14213D", "#1F4E79", "#0F766E", "#7C2D12", "#4C1D95", "#B7F34A"];

export function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <span className="label" id="accent-label">
        {t("design.accent")}
      </span>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-labelledby="accent-label"
      >
        {ACCENTS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={t("design.colourOf", { value: c })}
            aria-pressed={value.toLowerCase() === c.toLowerCase()}
            className="size-8 rounded-sm border-2 border-transparent aria-pressed:border-foreground"
            style={{ background: c, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / .12)" }}
            onClick={() => onChange(c)}
          />
        ))}
        <label className="relative flex h-8 items-center gap-2 rounded-sm border px-2 text-xs text-muted-foreground">
          <input
            type="color"
            className="size-5 cursor-pointer border-0 bg-transparent p-0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="num">{value.toUpperCase()}</span>
        </label>
      </div>
    </div>
  );
}

export function PartyFields({
  who,
  p,
  set,
  err,
  compact,
  placeholders = {},
}: {
  who: "company" | "client";
  p: Party;
  set: (p: Partial<Party>) => void;
  err: (k: string) => string | undefined;
  compact?: boolean;
  placeholders?: Partial<Record<keyof Party, string>>;
}) {
  const { t } = useTranslation();
  // Identifiers, phones and emails are always left-to-right; names and addresses follow their text.
  const ltr = new Set<keyof Party>(["ice", "if_", "rc", "phone", "email"]);
  const f = (
    k: keyof Party,
    label: string,
    extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {},
    wide: boolean | "phone" = false,
  ) => (
    <F label={label} id={`${who}-${k}`} error={err(`${who}.${k}`)} wide={wide}>
      <input
        id={`${who}-${k}`}
        className="field"
        aria-invalid={!!err(`${who}.${k}`)}
        value={p[k]}
        placeholder={placeholders[k]}
        dir={ltr.has(k) ? "ltr" : "auto"}
        {...extra}
        onChange={(e) =>
          set({ [k]: k === "ice" ? e.target.value.replace(/\D/g, "") : e.target.value })
        }
      />
    </F>
  );
  return (
    // Two fields per row even on phones (short ones side by side) to keep the form short.
    <div className="mt-3 grid grid-cols-2 gap-3">
      {f("name", t("party.name"), {}, true)}
      {f("ice", t("party.ice"), { inputMode: "numeric", maxLength: 15, className: "field num" })}
      {!compact && f("contact", t("party.contact"))}
      {f("address", t("party.address"), {}, true)}
      {f("city", t("party.city"))}
      {f("phone", t("party.phone"), { type: "tel", inputMode: "tel" })}
      {f("email", t("party.email"), { type: "email" }, "phone")}
      {!compact && f("if_", t("party.if"), { className: "field num" })}
      {!compact && f("rc", t("party.rc"), { className: "field num" })}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
  collapsible = false,
  forceOpen = false,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  /** Folded on phones until tapped (always open from lg up), to keep long forms short. */
  collapsible?: boolean;
  /** Keeps a folded section open, e.g. when it holds a field with an error. */
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shown = !collapsible || open || forceOpen;
  return (
    <section className={`border-t ${shown ? "space-y-3 pt-6" : "pt-6 max-lg:pb-0"} lg:space-y-3`}>
      <div className="flex items-baseline justify-between gap-4">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={shown}
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 text-sm font-semibold lg:pointer-events-none"
          >
            <ChevronDown
              className={`size-4 transition-transform lg:hidden ${shown ? "" : "-rotate-90 rtl:rotate-90"}`}
            />
            {title}
          </button>
        ) : (
          <h2 className="text-sm font-semibold">{title}</h2>
        )}
        {aside}
      </div>
      <div className={`space-y-3 ${shown ? "" : "max-lg:hidden"}`}>{children}</div>
    </section>
  );
}

export function F({
  label,
  id,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  id: string;
  error?: string | undefined;
  hint?: string;
  /** Spans the row (two columns from sm up); "phone": full row on phones only. */
  wide?: boolean | "phone";
  children: ReactNode;
}) {
  return (
    <div
      className={
        wide === "phone" ? "max-sm:col-span-full" : wide ? "max-sm:col-span-full sm:col-span-2" : ""
      }
    >
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TotalRow({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted-foreground"}>{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}
