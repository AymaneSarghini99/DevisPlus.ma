import { useId } from "react";
import type { Locale } from "@/i18n/config";

/** Small inline flags (no emoji: Windows does not render flag emoji). Decorative: the
 *  surrounding button carries the language name. Arabic uses the Moroccan flag. */
export function Flag({ locale, className = "" }: { locale: Locale; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cls = `block h-4 w-6 rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.12)] ${className}`;
  if (locale === "fr")
    return (
      <svg viewBox="0 0 3 2" className={cls} aria-hidden>
        <rect width="1" height="2" fill="#002395" />
        <rect x="1" width="1" height="2" fill="#fff" />
        <rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    );
  if (locale === "ar")
    return (
      <svg viewBox="0 0 90 60" className={cls} aria-hidden>
        <rect width="90" height="60" fill="#C1272D" />
        <path
          d="M45 17.64 36.18 44.78 59.27 28.01H30.73L53.82 44.78Z"
          fill="none"
          stroke="#006233"
          strokeWidth="3"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 60 30" className={cls} aria-hidden>
      <clipPath id={id}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${id})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
