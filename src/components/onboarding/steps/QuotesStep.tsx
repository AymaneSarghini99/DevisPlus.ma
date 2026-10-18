import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "@/components/Dropdown";
import { F } from "@/components/Form";
import { LOCALES, NATIVE_NAME, type Locale } from "@/i18n/config";
import { useFormat } from "@/i18n/LocaleProvider";
import { loadQuotes, nextNumber, VAT_RATES } from "@/lib/quotes";
import { docTerms } from "@/lib/store";
import type { QuoteSettings } from "@/lib/tenant";
import { FIELD, FormSection, type StepProps } from "./shared";

export function QuotesStep({ tenant, update, err }: StepProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const q = tenant.quotes;
  const set = (patch: Partial<QuoteSettings>) =>
    update((tn) => ({ ...tn, quotes: { ...tn.quotes, ...patch } }));
  const [number, setNumber] = useState("");
  useEffect(() => setNumber(nextNumber(loadQuotes())), []);

  return (
    <>
      <FormSection delay={180}>
        <F
          label={t("settings.validity")}
          id="ob-validity"
          error={err("validityDays")}
          hint={t("onboarding.quotes.validityHint")}
        >
          <input
            id="ob-validity"
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            dir="ltr"
            className={`${FIELD} num`}
            aria-invalid={!!err("validityDays")}
            value={Number.isFinite(q.validityDays) ? q.validityDays : ""}
            onChange={(e) => set({ validityDays: Math.trunc(Number(e.target.value)) })}
          />
        </F>
        <F
          label={t("settings.deposit")}
          id="ob-deposit"
          error={err("deposit")}
          hint={t("onboarding.quotes.depositHint")}
        >
          <input
            id="ob-deposit"
            type="number"
            min={0}
            max={100}
            inputMode="decimal"
            dir="ltr"
            className={`${FIELD} num`}
            aria-invalid={!!err("deposit")}
            value={Number.isFinite(q.deposit) ? q.deposit : ""}
            onChange={(e) => set({ deposit: Number(e.target.value) })}
          />
        </F>
        <F label={t("settings.defaultVat")} id="ob-vat" error={err("defaultVat")}>
          <Dropdown
            id="ob-vat"
            value={String(q.defaultVat)}
            onChange={(v) => set({ defaultVat: Number(v) })}
            options={VAT_RATES.map((r) => ({ value: String(r), label: fmt.percent(r) }))}
          />
        </F>
        <F label={t("settings.docLang")} id="ob-doclang" hint={t("settings.docLangHint")}>
          <Dropdown
            id="ob-doclang"
            value={q.docLang}
            onChange={(v) => set({ docLang: v as Locale })}
            options={LOCALES.map((l) => ({ value: l, label: NATIVE_NAME[l] }))}
          />
        </F>
        <F label={t("settings.terms")} id="ob-terms" hint={t("settings.termsHint")} wide>
          <textarea
            id="ob-terms"
            rows={3}
            dir="auto"
            className={`${FIELD} h-auto py-2`}
            value={docTerms(q, q.docLang)}
            onChange={(e) => set({ terms: e.target.value })}
          />
        </F>
      </FormSection>

      {number && (
        <div
          className="ob-enter flex items-start gap-3 rounded-[var(--radius)] border border-dashed p-4"
          style={{ animationDelay: "260ms" }}
        >
          <Hash className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="label">{t("onboarding.quotes.numbering")}</p>
            <p className="text-sm">
              {t("onboarding.quotes.numberingText")}{" "}
              <bdi dir="ltr" className="num font-semibold">
                {number}
              </bdi>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
