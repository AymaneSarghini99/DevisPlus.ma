import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { resizeLogo } from "@/lib/logo";
import { errorMessage } from "@/lib/storage";
import type { StepProps } from "./shared";

export function LogoStep({ tenant, update }: StepProps) {
  const { t } = useTranslation();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const logo = tenant.branding.logo;
  const setLogo = (v: string) => update((tn) => ({ ...tn, branding: { ...tn.branding, logo: v } }));

  const load = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      setLogo(await resizeLogo(file));
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="ob-enter space-y-5" style={{ animationDelay: "180ms" }}>
      <input
        ref={fileInput}
        id="ob-logo"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(e) => load(e.target.files?.[0])}
      />

      {logo ? (
        <div key={logo.slice(-32)} className="ob-pop space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <figure className="flex h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border bg-white p-6">
              <img src={logo} alt="" className="max-h-20 max-w-full object-contain" />
              <figcaption className="text-xs text-neutral-500">
                {t("onboarding.logo.onLight")}
              </figcaption>
            </figure>
            <figure className="flex h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border bg-[#14213D] p-6">
              <span className="rounded-sm bg-white/95 px-3 py-2">
                <img src={logo} alt="" className="max-h-14 max-w-full object-contain" />
              </span>
              <figcaption className="text-xs text-white/70">
                {t("onboarding.logo.onDark")}
              </figcaption>
            </figure>
          </div>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="ob-logo" className="btn btn-ghost cursor-pointer">
              <Upload className="size-4" /> {t("onboarding.logo.replace")}
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => setLogo("")}>
              <Trash2 className="size-4" /> {t("onboarding.logo.remove")}
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor="ob-logo"
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            load(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius)] border-2 border-dashed px-6 py-12 text-center transition-all duration-300 ${
            over ? "scale-[1.01] border-foreground bg-accent/20" : "hover:border-foreground/40"
          }`}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-accent">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          </span>
          <span className="text-sm">
            {t("onboarding.logo.drop")}{" "}
            <span className="font-semibold underline underline-offset-2">
              {t("onboarding.logo.browse")}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">{t("onboarding.logo.hint")}</span>
        </label>
      )}
      <p className="text-xs text-muted-foreground">{t("onboarding.logo.optional")}</p>
    </div>
  );
}
