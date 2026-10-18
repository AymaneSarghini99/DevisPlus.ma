import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; hint?: string };

// Radix Select reserves "" for "no value", so an empty option travels under this key.
const EMPTY = "__vide__";
const toKey = (v: string) => (v === "" ? EMPTY : v);
const fromKey = (v: string) => (v === EMPTY ? "" : v);

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  ariaLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Brand-styled select built on Radix: keyboard navigation, type-ahead and screen-reader support. */
export function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  invalid,
  disabled,
  className = "",
}: Props) {
  return (
    <Select.Root
      value={toKey(value)}
      onValueChange={(v) => onChange(fromKey(v))}
      disabled={disabled ?? false}
    >
      <Select.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          "group flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[var(--radius)] border border-input bg-card px-3 text-start text-sm transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=open]:border-foreground",
          className,
        )}
      >
        <span className="min-w-0 truncate data-[placeholder]:text-muted-foreground">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius)] border bg-card text-sm text-foreground shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--foreground)_35%,transparent)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Select.Viewport className="p-1">
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={toKey(o.value)}
                className="relative flex cursor-pointer select-none items-start gap-2 rounded-sm py-2 ps-8 pe-3 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[state=checked]:font-medium"
              >
                <Select.ItemIndicator className="absolute start-2 top-2.5">
                  <Check className="size-4" />
                </Select.ItemIndicator>
                <span className="min-w-0">
                  <Select.ItemText>{o.label}</Select.ItemText>
                  {o.hint && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {o.hint}
                    </span>
                  )}
                </span>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
