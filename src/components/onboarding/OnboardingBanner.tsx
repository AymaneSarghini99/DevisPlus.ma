import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { loadTenant, type Tenant } from "@/lib/tenant";

/** Invites the user to set up their business space until the setup is launched.
 *  Rendered after mount only (the draft lives in localStorage). */
export function OnboardingBanner() {
  const { t } = useTranslation();
  const [tenant, setTenant] = useState<Tenant | null | undefined>(undefined);
  useEffect(() => {
    try {
      setTenant(loadTenant());
    } catch {
      setTenant(null);
    }
  }, []);

  if (tenant === undefined || tenant?.onboarding.finishedAt) return null;
  return (
    <div className="ob-enter mt-6 flex flex-wrap items-center justify-between gap-4 border bg-card p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent">
          <Building2 className="size-4" />
        </span>
        <div>
          <p className="font-semibold">{t("onboarding.bannerTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("onboarding.bannerText")}</p>
        </div>
      </div>
      <Link to="/onboarding" className="btn btn-primary">
        {tenant ? t("onboarding.bannerResume") : t("onboarding.bannerCta")}
        <ArrowRight className="size-4 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
