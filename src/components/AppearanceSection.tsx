import { useEffect, useRef } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logoDevisPlus from "@/assets/devisplus-logo.png";
import {
  APP_SWATCHES,
  appThemeOf,
  DEFAULT_APP_COLOR,
  isHex,
  previewAppTheme,
  readableOn,
} from "@/lib/appTheme";
import { resizeLogo } from "@/lib/logo";
import { errorMessage } from "@/lib/storage";
import type { Settings } from "@/lib/store";

type Patch = Partial<Pick<Settings, "appLogo" | "appButton" | "appLine">>;

/**
 * Settings block for the look of the client's workspace: header logo, button colour and the
 * line under the active header link. Changes show at once in the header above (preview) and
 * are kept when the settings are saved. Quotes and invoices are not affected.
 */
export function AppearanceSection({ s, update }: { s: Settings; update: (patch: Patch) => void }) {
  const { t } = useTranslation();
  const file = useRef<HTMLInputElement>(null);

  // Live preview in the header; the saved look comes back on other pages if not saved.
  useEffect(() => {
    previewAppTheme(appThemeOf(s));
  }, [s]);

  const onLogo = async (f: File | undefined) => {
    if (!f) return;
    try {
      update({ appLogo: await resizeLogo(f) });
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  const button = isHex(s.appButton) ? s.appButton : DEFAULT_APP_COLOR;
  const line = isHex(s.appLine) ? s.appLine : DEFAULT_APP_COLOR;

  return (
    <section id="appearance" className="scroll-mt-24">
      <h2 className="font-semibold">{t("settings.appearance")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("settings.appearanceHint")}</p>
      <div className="mt-3 space-y-6 rounded-[var(--radius)] border bg-card p-5">
        {/* Header logo */}
        <div>
          <span className="label">{t("settings.headerLogo")}</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-14 min-w-40 items-center rounded-sm border bg-background px-4">
              {s.appLogo ? (
                <img
                  src={s.appLogo}
                  alt={t("settings.headerLogoCurrent")}
                  className="h-9 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <img src={logoDevisPlus} alt="DevisPlus.ma" className="h-7 w-auto" />
              )}
            </div>
            <input
              ref={file}
              id="app-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => void onLogo(e.target.files?.[0])}
            />
            <label htmlFor="app-logo" className="btn btn-ghost cursor-pointer">
              <ImagePlus className="size-4" />
              {s.appLogo ? t("settings.headerLogoReplace") : t("settings.headerLogoUpload")}
            </label>
            {s.logo && s.logo !== s.appLogo && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => update({ appLogo: s.logo })}
              >
                {t("settings.headerLogoFromDocs")}
              </button>
            )}
            {s.appLogo && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => update({ appLogo: "" })}
              >
                <RotateCcw className="size-3.5" /> {t("settings.headerLogoReset")}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("settings.headerLogoHint")}</p>
        </div>

        <ColorChoice
          id="app-button"
          label={t("settings.buttonColor")}
          value={button}
          custom={!!s.appButton}
          onChange={(c) => update({ appButton: c === DEFAULT_APP_COLOR ? "" : c })}
          preview={
            <span
              className="inline-flex h-9 items-center rounded-[var(--radius)] px-4 text-sm font-medium"
              style={{ background: button, color: readableOn(button) }}
            >
              {t("settings.buttonSample")}
            </span>
          }
        />

        <ColorChoice
          id="app-line"
          label={t("settings.lineColor")}
          value={line}
          custom={!!s.appLine}
          onChange={(c) => update({ appLine: c === DEFAULT_APP_COLOR ? "" : c })}
          preview={
            <span className="inline-flex items-end gap-4 text-sm">
              <span className="border-b-2 pb-1 font-medium" style={{ borderColor: line }}>
                {t("nav.dashboard")}
              </span>
              <span className="border-b-2 border-transparent pb-1 text-muted-foreground">
                {t("nav.clients")}
              </span>
            </span>
          }
        />
      </div>
    </section>
  );
}

function ColorChoice({
  id,
  label,
  value,
  custom,
  onChange,
  preview,
}: {
  id: string;
  label: string;
  value: string;
  custom: boolean;
  onChange: (c: string) => void;
  preview: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {APP_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={
              c === DEFAULT_APP_COLOR
                ? t("settings.colorDefault")
                : t("design.colourOf", { value: c })
            }
            title={c === DEFAULT_APP_COLOR ? t("settings.colorDefault") : c}
            aria-pressed={value.toLowerCase() === c.toLowerCase()}
            className="size-8 rounded-sm border-2 border-transparent aria-pressed:border-foreground"
            style={{ background: c, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / .12)" }}
            onClick={() => onChange(c)}
          />
        ))}
        <label className="relative flex h-8 items-center gap-2 rounded-sm border px-2 text-xs text-muted-foreground">
          <input
            id={id}
            type="color"
            aria-label={t("settings.colorCustom")}
            className="size-5 cursor-pointer border-0 bg-transparent p-0"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
          />
          <span className="num">{value.toUpperCase()}</span>
        </label>
        {custom && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange(DEFAULT_APP_COLOR)}
          >
            <RotateCcw className="size-3.5" /> {t("settings.colorReset")}
          </button>
        )}
      </div>
      <div className="mt-3">{preview}</div>
    </div>
  );
}
