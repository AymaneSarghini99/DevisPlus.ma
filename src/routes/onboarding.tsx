import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { ArrowLeft, ArrowRight, CloudCheck, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, Logo } from "@/components/Brand";
import { Stepper } from "@/components/onboarding/Stepper";
import { VideoGuide } from "@/components/onboarding/VideoGuide";
import { BrandingStep } from "@/components/onboarding/steps/BrandingStep";
import { DomainStep } from "@/components/onboarding/steps/DomainStep";
import { LogoStep } from "@/components/onboarding/steps/LogoStep";
import { ProfileStep } from "@/components/onboarding/steps/ProfileStep";
import { QuotesStep } from "@/components/onboarding/steps/QuotesStep";
import { ReviewStep } from "@/components/onboarding/steps/ReviewStep";
import type { Secret, StepProps } from "@/components/onboarding/steps/shared";
import { createAdmin, unlock } from "@/lib/auth";
import { useDevFill } from "@/dev/devFill";
import type { Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/LocaleProvider";
import { pageMeta } from "@/i18n/meta";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/onboarding/config";
import { errorMessage } from "@/lib/storage";
import { hasProfile, loadSettings } from "@/lib/store";
import {
  completeStep,
  incompleteSteps,
  loadTenant,
  newTenant,
  passwordErrors,
  prevStep,
  saveTenant,
  stepErrors,
  type StepField,
  type Tenant,
} from "@/lib/tenant";

export const Route = createFileRoute("/onboarding")({
  head: ({ match }) => pageMeta(match, "onboarding"),
  component: Onboarding,
});

const STEP_VIEWS: Record<OnboardingStep, ComponentType<StepProps>> = {
  profile: ProfileStep,
  logo: LogoStep,
  branding: BrandingStep,
  quotes: QuotesStep,
  domain: DomainStep,
  review: ReviewStep,
};

/** New tenant, prefilled from company details already entered in the app (if any). */
function startTenant(locale: Locale): Tenant {
  const s = loadSettings();
  const t = newTenant(locale, s);
  if (!hasProfile(s)) return t;
  const c = s.company;
  return {
    ...t,
    profile: {
      ...t.profile,
      companyName: c.name,
      ice: c.ice,
      address: c.address,
      city: c.city,
      phone: c.phone,
      email: c.email,
    },
    admin: { ...t.admin, email: c.email.trim() },
  };
}

function Onboarding() {
  const { t } = useTranslation();
  const { locale, dir } = useLocale();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const navigate = useNavigate();
  const [secret, setSecret] = useState<Secret>({ password: "", confirm: "" });
  // Local test toolbar (vite dev only): fill the current step, or start the setup over.
  useDevFill("onboarding", (action) => {
    if (import.meta.env.DEV) {
      if (action === "clear") {
        localStorage.removeItem("devisplus.tenant");
        sessionStorage.clear();
        window.location.reload();
        return;
      }
      void import("@/dev/mock").then(({ mockStep, MOCK_PASSWORD }) => {
        setTenant((tn) => (tn ? mockStep(tn, tn.onboarding.current) : tn));
        // Only a wizard without an account gets the test password (never replace a real one).
        if (!(tenant?.admin.passwordHash || tenant?.admin.googleSub))
          setSecret({ password: MOCK_PASSWORD, confirm: MOCK_PASSWORD });
      });
    }
  });
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [shake, setShake] = useState(false);
  const [savedPulse, setSavedPulse] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const cardRef = useRef<HTMLFormElement>(null);
  const firstSave = useRef(true);

  // Save-and-resume: reload the draft saved in this browser, at the step where it stopped.
  useEffect(() => {
    let tn: Tenant;
    try {
      tn = loadTenant() ?? startTenant(locale);
    } catch {
      tn = startTenant(locale);
    }
    setTenant(tn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save the draft shortly after each change.
  useEffect(() => {
    if (!tenant) return;
    const id = setTimeout(() => {
      try {
        saveTenant(tenant);
        if (firstSave.current) firstSave.current = false;
        else setSavedPulse((n) => n + 1);
      } catch (e) {
        toast.error(errorMessage(e, t));
      }
    }, 600);
    return () => clearTimeout(id);
  }, [tenant, t]);

  if (!tenant) return <p className="p-8 text-sm text-muted-foreground">{t("common.loading")}</p>;

  const step = tenant.onboarding.current;
  const index = ONBOARDING_STEPS.indexOf(step);
  // The password is checked as typed; an existing one can be kept by leaving the fields empty.
  const errors = { ...stepErrors(tenant, step) };
  if (step === "profile") {
    delete errors.password;
    Object.assign(errors, passwordErrors(tenant.admin, secret.password, secret.confirm));
  }
  const blocked = step === "review" ? incompleteSteps(tenant) : [];
  const err = (k: StepField) =>
    tried && errors[k] ? t(`validation.${errors[k]}` as never) : undefined;
  const update = (fn: (tn: Tenant) => Tenant) => setTenant((tn) => (tn ? fn(tn) : tn));

  const scrollToCard = () =>
    requestAnimationFrame(() => {
      const top = (cardRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 16;
      if (top < window.scrollY) window.scrollTo({ top, behavior: "smooth" });
    });

  const goTo = (s: OnboardingStep) => {
    setDirection(ONBOARDING_STEPS.indexOf(s) >= index ? 1 : -1);
    setTried(false);
    update((tn) => ({ ...tn, onboarding: { ...tn.onboarding, current: s } }));
    scrollToCard();
  };

  const fail = (message: string) => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
    toast.error(message);
  };

  const submit = async () => {
    if (busy) return;
    setTried(true);
    if (step === "review" && blocked.length) return fail(t("onboarding.review.fixFirst"));
    if (Object.keys(errors).length) {
      fail(t("onboarding.fixFields"));
      // Bring the first invalid field into view.
      requestAnimationFrame(() => {
        const first = cardRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        first?.focus({ preventScroll: true });
      });
      return;
    }
    setBusy(true);
    try {
      let current = tenant;
      if (step === "profile" && secret.password) {
        // Only the salted hash is kept; the typed password is dropped right away.
        current = { ...current, admin: await createAdmin(current.admin.email, secret.password) };
        setSecret({ password: "", confirm: "" });
      } else if (step === "profile") {
        current = {
          ...current,
          admin: { ...current.admin, email: current.admin.email.trim().toLowerCase() },
        };
      }
      const next = completeStep(current, step);
      if (step === "profile") unlock(next); // the person who set the password is signed in
      setDirection(1);
      setTried(false);
      setTenant(next);
      if (step === "review") {
        toast.success(t("onboarding.ready"), { description: t("onboarding.readyText") });
        navigate({ to: "/dashboard" });
      } else scrollToCard();
    } catch (e) {
      toast.error(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const View = STEP_VIEWS[step];
  // Steps slide in from the reading direction: forward from the end side, back from the start.
  const slide = (direction * (dir === "rtl" ? -1 : 1) * 28) as number;

  return (
    <div className="min-h-screen">
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/dashboard" className="btn btn-ghost hidden sm:inline-flex">
              {t("nav.myQuotes")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-12">
        <div className="ob-enter">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("onboarding.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("onboarding.subtitle")}</p>
        </div>

        <div className="ob-enter border bg-card p-5" style={{ animationDelay: "60ms" }}>
          <Stepper current={step} completed={tenant.onboarding.completed} />
        </div>

        <VideoGuide />

        <form
          ref={cardRef}
          noValidate
          className={`ob-enter scroll-mt-4 border bg-card ${shake ? "ob-shake" : ""}`}
          style={{ animationDelay: "120ms" }}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div
            key={step}
            className="ob-slide"
            style={{ "--ob-dx": `${slide}px` } as React.CSSProperties}
          >
            <div className="border-b px-5 py-5 md:px-8">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("onboarding.stepOf", { n: index + 1, total: ONBOARDING_STEPS.length })}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{t(`onboarding.${step}.title`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(`onboarding.${step}.intro`)}</p>
            </div>
            <div className="space-y-8 px-5 py-6 md:px-8">
              <View
                tenant={tenant}
                update={update}
                err={err}
                goTo={goTo}
                secret={secret}
                setSecret={setSecret}
              />
              {step === "review" && (
                <p
                  className={`text-sm ${tried && blocked.length ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {tried && blocked.length
                    ? t("onboarding.review.fixFirst")
                    : t("onboarding.review.launchHint")}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 md:px-8">
            <p
              key={savedPulse}
              className="ob-enter flex items-center gap-1.5 text-xs text-muted-foreground"
              role="status"
            >
              {savedPulse > 0 && (
                <>
                  <CloudCheck className="size-4" /> {t("onboarding.autosaved")}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {index > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => goTo(prevStep(step))}
                >
                  <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t("onboarding.back")}
                </button>
              )}
              {step === "logo" && !tenant.branding.logo && (
                <button type="submit" className="btn btn-ghost">
                  {t("onboarding.skip")}
                </button>
              )}
              {step === "review" ? (
                <button type="submit" className="btn btn-primary px-6">
                  <Rocket className="size-4" /> {t("onboarding.launch")}
                </button>
              ) : (
                (step !== "logo" || tenant.branding.logo) && (
                  <button type="submit" className="btn btn-primary px-6" disabled={busy}>
                    {t("onboarding.next")}{" "}
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4 rtl:-scale-x-100" />
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
