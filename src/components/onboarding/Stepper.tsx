import { useTranslation } from "react-i18next";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/onboarding/config";

/** Progress indicator of the onboarding wizard. The bar fills smoothly as steps complete. */
export function Stepper({
  current,
  completed,
}: {
  current: OnboardingStep;
  completed: OnboardingStep[];
}) {
  const { t } = useTranslation();
  const index = ONBOARDING_STEPS.indexOf(current);
  const total = ONBOARDING_STEPS.length;
  const progress = Math.round((completed.length / total) * 100);

  return (
    <nav aria-label={t("onboarding.title")}>
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">
          {t("onboarding.stepOf", { n: index + 1, total })}
          <span className="text-muted-foreground"> · {t(`onboarding.steps.${current}`)}</span>
        </p>
        <p className="num text-muted-foreground">{progress}%</p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>
    </nav>
  );
}
