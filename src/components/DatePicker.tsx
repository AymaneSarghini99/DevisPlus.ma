import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { CalendarDays } from "lucide-react";

const toDate = (iso: string) => (iso ? new Date(iso + "T12:00:00") : undefined);
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const label = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

type Props = {
  id?: string;
  value: string; // yyyy-mm-dd or ""
  onChange: (value: string) => void;
  /** Earliest selectable date (yyyy-mm-dd). */
  min?: string;
  invalid?: boolean;
  disabled?: boolean;
};

/** French calendar picker (weeks start on Monday) that reads and writes yyyy-mm-dd strings. */
export function DatePicker({ id, value, onChange, min, invalid, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const pick = (d: Date | undefined) => {
    if (!d) return;
    onChange(toISO(d));
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="group flex h-10 w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border border-input bg-card px-3 text-left text-sm transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=open]:border-foreground"
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className={`min-w-0 truncate ${selected ? "" : "text-muted-foreground"}`}>
          {selected ? label.format(selected) : "Choisir une date"}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 rounded-[var(--radius)] border bg-card p-3 shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--foreground)_35%,transparent)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DayPicker
            mode="single"
            locale={fr}
            weekStartsOn={1}
            {...(selected ? { selected, defaultMonth: selected } : {})}
            onSelect={pick}
            {...(min ? { disabled: { before: toDate(min)! } } : {})}
            className="dp"
          />
          <div className="mt-2 flex justify-between border-t pt-2">
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-xs font-medium hover:bg-muted"
              onClick={() => pick(new Date())}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
