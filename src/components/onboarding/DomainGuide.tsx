import { useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CUSTOM_DOMAIN_TARGET } from "@/onboarding/config";
import { dnsHost } from "@/lib/tenant";

/** Step-by-step instructions to point a custom domain at DevisPlus (one CNAME record). */
export function DomainGuide({ domain, valid }: { domain: string; valid: boolean }) {
  const { t } = useTranslation();
  const { host, apex } = dnsHost(domain);
  const steps = ["s1", "s2", "s3", "s4", "s5"] as const;

  return (
    <div className="ob-enter rounded-[var(--radius)] border bg-card p-5">
      <h3 className="font-semibold">{t("onboarding.domain.guide.title")}</h3>
      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm">
            <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p>{t(`onboarding.domain.guide.${s}`)}</p>
              {s === "s2" &&
                (valid && !apex ? (
                  <RecordTable host={host} />
                ) : !valid ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("onboarding.domain.guide.enterDomain")}
                  </p>
                ) : null)}
              {s === "s2" && valid && apex && (
                <div className="mt-2 flex gap-2 rounded-sm bg-amber-50 p-3 text-amber-950">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">{t("onboarding.domain.guide.apexTitle")}</p>
                    <p className="text-xs">{t("onboarding.domain.guide.apexText")}</p>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RecordTable({ host }: { host: string }) {
  const { t } = useTranslation();
  const rows: [string, string, boolean][] = [
    [t("onboarding.domain.guide.type"), "CNAME", false],
    [t("onboarding.domain.guide.host"), host, true],
    [t("onboarding.domain.guide.value"), CUSTOM_DOMAIN_TARGET, true],
    [t("onboarding.domain.guide.ttl"), t("onboarding.domain.guide.ttlAuto"), false],
  ];
  return (
    <dl className="mt-2 divide-y overflow-hidden rounded-sm border">
      {rows.map(([label, value, copy]) => (
        <div key={label} className="flex items-center gap-3 px-3 py-2">
          <dt className="w-28 shrink-0 text-xs text-muted-foreground">{label}</dt>
          <dd className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <bdi dir="ltr" className="num truncate font-medium">
              {value}
            </bdi>
            {copy && <CopyButton value={value} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked: the value stays visible to copy by hand.
        }
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? t("onboarding.domain.guide.copied") : t("onboarding.domain.guide.copy")}
    </button>
  );
}
