import { Move, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "./Dropdown";
import { defaultWatermark, normalizeWatermark, type Watermark } from "@/lib/design";

export function WatermarkControls({
  value,
  onChange,
  hasLogo,
  idPrefix = "wm",
}: {
  value: Watermark;
  onChange: (w: Watermark) => void;
  hasLogo: boolean;
  idPrefix?: string;
}) {
  const { t } = useTranslation();
  const set = (patch: Partial<Watermark>) => onChange(normalizeWatermark({ ...value, ...patch }));
  const id = (k: string) => `${idPrefix}-${k}`;

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <span
          aria-hidden
          className="relative h-6 w-10 shrink-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring after:absolute after:start-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-card after:shadow-sm after:transition-transform peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4"
        />
        {t("watermark.enable")}
      </label>

      {value.enabled && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={id("kind")}>
                {t("watermark.type")}
              </label>
              <Dropdown
                id={id("kind")}
                value={value.kind}
                onChange={(v) => set({ kind: v as Watermark["kind"] })}
                options={[
                  { value: "text", label: t("watermark.text") },
                  {
                    value: "logo",
                    label: t("watermark.logo"),
                    ...(hasLogo ? {} : { hint: t("watermark.logoMissing") }),
                  },
                ]}
              />
            </div>
            {value.kind === "text" || !hasLogo ? (
              <div>
                <label className="label" htmlFor={id("text")}>
                  {t("watermark.text")}
                </label>
                <input
                  id={id("text")}
                  className="field"
                  maxLength={40}
                  value={value.text}
                  placeholder={t("watermark.textPlaceholder")}
                  dir="auto"
                  onChange={(e) => onChange({ ...value, text: e.target.value })}
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          <Range
            id={id("opacity")}
            label={t("watermark.opacity")}
            min={2}
            max={60}
            value={Math.round(value.opacity * 100)}
            unit="%"
            onChange={(v) => set({ opacity: v / 100 })}
          />
          <Range
            id={id("size")}
            label={t("watermark.size")}
            min={10}
            max={100}
            value={value.size}
            unit="%"
            onChange={(v) => set({ size: v })}
          />
          <Range
            id={id("rotation")}
            label={t("watermark.rotation")}
            min={-90}
            max={90}
            value={value.rotation}
            unit="°"
            onChange={(v) => set({ rotation: v })}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Move className="size-3.5" /> {t("watermark.dragHint")}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm px-2 py-1 font-medium text-foreground hover:bg-muted"
              onClick={() => {
                const d = defaultWatermark();
                set({ x: d.x, y: d.y, rotation: d.rotation });
              }}
            >
              <RotateCcw className="size-3.5" /> {t("watermark.recenter")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Range({
  id,
  label,
  min,
  max,
  value,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <bdi dir="ltr" className="num text-xs text-muted-foreground">
          {value} {unit}
        </bdi>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--primary)]"
      />
    </div>
  );
}
