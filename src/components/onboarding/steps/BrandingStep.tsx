import { useMemo } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccentPicker } from "@/components/Form";
import { A4Preview } from "@/components/QuoteDocument";
import { TEMPLATES } from "@/lib/quotes";
import { previewDoc } from "@/onboarding/preview";
import type { Tenant } from "@/lib/tenant";
import type { StepProps } from "./shared";

export function BrandingStep({ tenant, update }: StepProps) {
  const { t } = useTranslation();
  const b = tenant.branding;
  const set = (patch: Partial<Tenant["branding"]>) =>
    update((tn) => ({ ...tn, branding: { ...tn.branding, ...patch } }));
  const doc = useMemo(() => previewDoc(tenant), [tenant]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="ob-enter space-y-6" style={{ animationDelay: "180ms" }}>
        <AccentPicker value={b.accent} onChange={(accent) => set({ accent })} />
        <div>
          <span className="label" id="ob-tpl-label">
            {t("onboarding.branding.template")}
          </span>
          <div
            role="radiogroup"
            aria-labelledby="ob-tpl-label"
            className="grid gap-2 sm:grid-cols-2"
          >
            {TEMPLATES.map(({ id }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={b.template === id}
                onClick={() => set({ template: id })}
                className="relative rounded-[var(--radius)] border px-4 py-3 text-start transition-all duration-300 hover:border-foreground/40 aria-checked:border-foreground aria-checked:bg-accent/25 aria-checked:shadow-[0_0_0_1px_var(--foreground)]"
              >
                <span className="block pe-6 font-medium">{t(`templates.names.${id}.name`)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`templates.names.${id}.hint`)}
                </span>
                {b.template === id && <Check className="ob-pop absolute end-3 top-3 size-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="ob-enter lg:sticky lg:top-6 lg:self-start"
        style={{ animationDelay: "260ms" }}
      >
        <p className="label">{t("onboarding.branding.preview")}</p>
        <div className="overflow-hidden rounded-[var(--radius)] border bg-muted/40 p-3">
          <A4Preview d={doc} className="pointer-events-none select-none" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("onboarding.branding.previewNote")}</p>
      </div>
    </div>
  );
}
