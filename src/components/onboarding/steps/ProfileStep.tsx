import { useState } from "react";
import { Check, Eye, EyeOff, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "@/components/Dropdown";
import { Flag } from "@/components/Flags";
import { F } from "@/components/Form";
import { LOCALES, NATIVE_NAME, type Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/LocaleProvider";
import { CURRENCIES, SECTORS, type Currency } from "@/onboarding/config";
import { PLATFORM_DOMAIN, slugify, type BusinessProfile } from "@/lib/tenant";
import { FIELD, FormSection, type StepProps } from "./shared";

export function ProfileStep({ tenant, update, err, secret, setSecret }: StepProps) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const p = tenant.profile;
  const set = (patch: Partial<BusinessProfile>) =>
    update((tn) => {
      // Before an account exists, the admin email follows the business email. Once the account
      // exists (sign-up page), its sign-in email is never changed from here.
      const account = !!(tn.admin.passwordHash || tn.admin.googleSub);
      const follow =
        !account &&
        patch.email !== undefined &&
        (!tn.admin.email || tn.admin.email === tn.profile.email.trim());
      return {
        ...tn,
        profile: { ...tn.profile, ...patch },
        ...(follow ? { admin: { ...tn.admin, email: patch.email!.trim() } } : {}),
      };
    });
  const [show, setShow] = useState(false);
  // Account created on the sign-up page: no need to ask for a password again.
  const hasAccount = !!(tenant.admin.passwordHash || tenant.admin.googleSub);
  const slug = tenant.domain.subdomain || slugify(p.companyName);

  const chooseLanguage = (l: Locale) => {
    set({ language: l });
    if (l !== locale) setLocale(l); // switches the whole interface (RTL for Arabic) right away
  };

  const input = (
    k: keyof BusinessProfile,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    hint?: string,
    wide = false,
  ) => (
    <F label={label} id={`ob-${k}`} error={err(k)} wide={wide} {...(hint ? { hint } : {})}>
      <input
        id={`ob-${k}`}
        className={FIELD}
        aria-invalid={!!err(k)}
        value={String(p[k])}
        onChange={(e) =>
          set({
            [k]: k === "ice" ? e.target.value.replace(/\D/g, "") : e.target.value,
          } as Partial<BusinessProfile>)
        }
        {...extra}
      />
    </F>
  );

  return (
    <>
      <FormSection title={t("onboarding.profile.identity")} delay={180}>
        {input(
          "companyName",
          t("onboarding.profile.companyName"),
          { autoComplete: "organization", dir: "auto" },
          t("onboarding.profile.companyNameHint"),
        )}
        {input("legalName", t("onboarding.profile.legalName"), { dir: "auto" })}
        <F label={t("onboarding.profile.sector")} id="ob-sector" error={err("sector")}>
          <Dropdown
            id="ob-sector"
            value={p.sector}
            invalid={!!err("sector")}
            placeholder={t("onboarding.profile.sectorPlaceholder")}
            onChange={(v) => set({ sector: v as BusinessProfile["sector"] })}
            options={[
              { value: "", label: t("onboarding.profile.sectorPlaceholder") },
              ...SECTORS.map((s) => ({ value: s, label: t(`onboarding.sectors.${s}`) })),
            ]}
          />
        </F>
        {input(
          "ice",
          t("onboarding.profile.ice"),
          { inputMode: "numeric", maxLength: 15, dir: "ltr" },
          t("onboarding.profile.iceHint"),
        )}
      </FormSection>

      <FormSection title={t("onboarding.profile.contact")} delay={260}>
        {input(
          "address",
          t("onboarding.profile.address"),
          { autoComplete: "street-address", dir: "auto" },
          undefined,
          true,
        )}
        {input("city", t("onboarding.profile.city"), {
          autoComplete: "address-level2",
          dir: "auto",
        })}
        {input("phone", t("onboarding.profile.phone"), {
          type: "tel",
          inputMode: "tel",
          autoComplete: "tel",
          dir: "ltr",
        })}
        {input("email", t("onboarding.profile.email"), {
          type: "email",
          autoComplete: "email",
          dir: "ltr",
        })}
        {input("website", t("onboarding.profile.website"), {
          type: "url",
          inputMode: "url",
          placeholder: "www.exemple.ma",
          dir: "ltr",
        })}
      </FormSection>

      {hasAccount ? (
        <p className="ob-enter flex flex-wrap items-center gap-x-2 rounded-[var(--radius)] border border-dashed px-4 py-3 text-sm">
          <span className="font-medium">{t("onboarding.profile.account")}</span>
          <bdi dir="ltr" className="text-muted-foreground">
            {tenant.admin.email}
          </bdi>
          {tenant.admin.googleSub && (
            <span className="text-xs text-muted-foreground">· Google</span>
          )}
        </p>
      ) : (
        <FormSection title={t("onboarding.profile.account")} delay={340}>
          <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">
            {t("onboarding.profile.accountText")}
          </p>
          <F
            label={t("onboarding.profile.adminEmail")}
            id="ob-adminEmail"
            error={err("adminEmail")}
            wide
          >
            <input
              id="ob-adminEmail"
              type="email"
              autoComplete="username"
              dir="ltr"
              className={FIELD}
              aria-invalid={!!err("adminEmail")}
              value={tenant.admin.email}
              onChange={(e) =>
                update((tn) => ({ ...tn, admin: { ...tn.admin, email: e.target.value.trim() } }))
              }
            />
          </F>
          <F
            label={t("onboarding.profile.password")}
            id="ob-password"
            error={err("password")}
            hint={
              tenant.admin.passwordHash
                ? t("onboarding.profile.passwordKeep")
                : t("onboarding.profile.passwordHint")
            }
          >
            <div className="relative">
              <input
                id="ob-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                dir="ltr"
                className={`${FIELD} pe-10`}
                aria-invalid={!!err("password")}
                value={secret.password}
                onChange={(e) => setSecret({ ...secret, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                aria-label={show ? t("onboarding.profile.hide") : t("onboarding.profile.show")}
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </F>
          <F label={t("onboarding.profile.confirm")} id="ob-confirm" error={err("confirm")}>
            <input
              id="ob-confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              dir="ltr"
              className={FIELD}
              aria-invalid={!!err("confirm")}
              value={secret.confirm}
              onChange={(e) => setSecret({ ...secret, confirm: e.target.value })}
            />
          </F>
        </FormSection>
      )}

      <FormSection title={t("onboarding.profile.preferences")} delay={420}>
        <F label={t("onboarding.profile.currency")} id="ob-currency">
          <Dropdown
            id="ob-currency"
            value={p.currency}
            onChange={(v) => set({ currency: v as Currency })}
            options={CURRENCIES.map((c) => ({
              value: c,
              label: t(`onboarding.currencies.${c}`),
            }))}
          />
        </F>
        <div className="sm:col-span-2">
          <span className="label" id="ob-lang-label">
            {t("onboarding.profile.language")}
          </span>
          <div
            role="radiogroup"
            aria-labelledby="ob-lang-label"
            className="grid gap-2 sm:grid-cols-3"
          >
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={p.language === l}
                lang={l}
                onClick={() => chooseLanguage(l)}
                className="flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-start transition-all duration-300 hover:border-foreground/40 aria-checked:border-foreground aria-checked:bg-accent/25 aria-checked:shadow-[0_0_0_1px_var(--foreground)]"
              >
                <Flag locale={l} />
                <span className="font-medium">{NATIVE_NAME[l]}</span>
                {p.language === l && <Check className="ob-pop ms-auto size-4" />}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("onboarding.profile.languageHint")}
          </p>
        </div>
        {slug && (
          <div className="ob-enter rounded-[var(--radius)] border border-dashed p-4 sm:col-span-2">
            <p className="label">{t("onboarding.profile.slugPreview")}</p>
            <p className="flex items-center gap-2 font-medium">
              <Globe className="size-4 text-muted-foreground" />
              <bdi dir="ltr" className="num">
                {slug}.{PLATFORM_DOMAIN}
              </bdi>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("onboarding.profile.slugNote")}</p>
          </div>
        )}
      </FormSection>
    </>
  );
}
