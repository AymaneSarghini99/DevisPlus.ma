import { Clock, Globe, Mail, Server } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { F } from "@/components/Form";
import { WhatsAppIcon } from "@/components/WhatsAppWidget";
import { useFormat } from "@/i18n/LocaleProvider";
import { CONTACT } from "@/legal/operator";
import { whatsappUrl } from "@/lib/quotes";
import { domainErrors, PLATFORM_DOMAIN, type DomainSettings, type Tenant } from "@/lib/tenant";
import { workspaceAddress } from "@/onboarding/preview";
import { DomainGuide } from "../DomainGuide";
import { ChoiceCard, FIELD, FormSection, type StepProps } from "./shared";

export function DomainStep({ tenant, update, err }: StepProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const d = tenant.domain;
  const set = (patch: Partial<DomainSettings>) =>
    update((tn: Tenant) => ({ ...tn, domain: { ...tn.domain, ...patch } }));
  const valid = Object.keys(domainErrors(d)).length === 0;

  /** Opens a prepared activation request; the user sends it from their own app. */
  const request = (channel: "email" | "whatsapp") => {
    const p = tenant.profile;
    const subject = t("onboarding.domain.requestSubject", { company: p.companyName.trim() });
    const body = t("onboarding.domain.requestBody", {
      company: p.companyName.trim(),
      subdomain: `${d.subdomain.trim()}.${PLATFORM_DOMAIN}`,
      custom: d.mode === "custom" ? d.customDomain.trim() : t("onboarding.domain.none"),
      email: p.email.trim(),
      phone: p.phone.trim(),
    });
    if (channel === "email")
      window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    else window.open(whatsappUrl(CONTACT.phone, `${subject}\n\n${body}`), "_blank", "noopener");
    set({ requestedAt: new Date().toISOString() });
    toast(t("onboarding.domain.prepared"), {
      description: t("onboarding.domain.preparedText"),
      duration: 8000,
    });
  };

  return (
    <>
      <div
        role="radiogroup"
        aria-label={t("onboarding.domain.title")}
        className="ob-enter grid gap-2 sm:grid-cols-2"
        style={{ animationDelay: "180ms" }}
      >
        <ChoiceCard
          checked={d.mode === "subdomain"}
          onSelect={() => set({ mode: "subdomain" })}
          icon={<Globe className="size-5" />}
          title={t("onboarding.domain.modeSubdomain")}
          text={t("onboarding.domain.modeSubdomainText")}
        />
        <ChoiceCard
          checked={d.mode === "custom"}
          onSelect={() => set({ mode: "custom" })}
          icon={<Server className="size-5" />}
          title={t("onboarding.domain.modeCustom")}
          text={t("onboarding.domain.modeCustomText")}
        />
      </div>

      <FormSection delay={240}>
        <F
          label={t("onboarding.domain.subdomain")}
          id="ob-subdomain"
          error={err("subdomain")}
          wide={d.mode === "subdomain"}
          {...(d.mode === "custom" ? { hint: t("onboarding.domain.fallbackNote") } : {})}
        >
          <div dir="ltr" className="flex items-stretch">
            <input
              id="ob-subdomain"
              dir="ltr"
              autoCapitalize="none"
              spellCheck={false}
              className={`${FIELD} rounded-e-none`}
              aria-invalid={!!err("subdomain")}
              value={d.subdomain}
              onChange={(e) =>
                set({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
              }
            />
            <span className="num flex items-center rounded-e-[var(--radius)] border border-s-0 bg-muted px-3 text-sm text-muted-foreground">
              .{PLATFORM_DOMAIN}
            </span>
          </div>
        </F>
        {d.mode === "custom" && (
          <F
            label={t("onboarding.domain.customDomain")}
            id="ob-custom"
            error={err("customDomain")}
            hint={t("onboarding.domain.customHint")}
          >
            <input
              id="ob-custom"
              dir="ltr"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="url"
              placeholder="devis.monentreprise.ma"
              className={`${FIELD} ob-enter`}
              aria-invalid={!!err("customDomain")}
              value={d.customDomain}
              onChange={(e) => set({ customDomain: e.target.value.replace(/\s/g, "") })}
            />
          </F>
        )}
      </FormSection>

      {d.mode === "custom" && (
        <DomainGuide domain={d.customDomain} valid={!domainErrors(d).customDomain} />
      )}

      <div
        className="ob-enter space-y-4 rounded-[var(--radius)] border bg-muted/30 p-5"
        style={{ animationDelay: "300ms" }}
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-medium">{t("onboarding.domain.statusLabel")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            <Clock className="size-3.5" /> {t("onboarding.domain.statusPending")}
          </span>
          <bdi dir="ltr" className="num text-sm font-semibold">
            {workspaceAddress(d)}
          </bdi>
        </div>
        <p className="text-sm text-muted-foreground">{t("onboarding.domain.statusText")}</p>
        <div>
          <p className="label">{t("onboarding.domain.request")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost bg-card"
              disabled={!valid}
              onClick={() => request("email")}
            >
              <Mail className="size-4" /> {t("onboarding.domain.requestEmail")}
            </button>
            <button
              type="button"
              className="btn btn-ghost bg-card"
              disabled={!valid}
              onClick={() => request("whatsapp")}
            >
              <WhatsAppIcon className="size-4" /> {t("onboarding.domain.requestWhatsapp")}
            </button>
          </div>
          {d.requestedAt && (
            <p className="ob-enter mt-2 text-xs text-muted-foreground">
              {t("onboarding.domain.requested", { date: fmt.date(d.requestedAt.slice(0, 10)) })}{" "}
              {t("onboarding.domain.requestedNote")}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
