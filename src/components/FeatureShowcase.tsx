import { useEffect, useState, type ReactNode } from "react";
import { BellRing, FileDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/LocaleProvider";
import { amountInWords } from "@/lib/quotes";
import { GoogleDriveIcon } from "./GoogleDriveIcon";

/** The four features that show on the document itself, each tied to a zone of the quote. */
export const ON_DOC = ["f1", "f2", "f3", "f4"] as const;
export type Zone = (typeof ON_DOC)[number];
/** The workflow features around the document. */
const AROUND = [
  { key: "f5", icon: <FileDown className="size-4" /> },
  { key: "f6", icon: <BellRing className="size-4" /> },
  { key: "f7", icon: <GoogleDriveIcon className="size-4" /> },
  { key: "f8", icon: <Languages className="size-4" /> },
] as const;
const CYCLE_MS = 5000;

/**
 * "Anatomy of a quote": a feature list next to an illustrated quote. Each feature lights up
 * the part of the document it affects (hover, focus or tap); the list also advances on its
 * own, except for people who prefer reduced motion or after the visitor picks one.
 */
export function FeatureShowcase() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Zone>("f1");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setActive((a) => ON_DOC[(ON_DOC.indexOf(a) + 1) % ON_DOC.length]!),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, [auto]);

  const pick = (z: Zone) => {
    setAuto(false);
    setActive(z);
  };

  return (
    <section className="border-y bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
          {t("landing.features.title")}
        </h2>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          {/* Feature list */}
          <ol className="space-y-1">
            {ON_DOC.map((f, i) => {
              const on = active === f;
              return (
                <li key={f}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onMouseEnter={() => pick(f)}
                    onFocus={() => pick(f)}
                    onClick={() => pick(f)}
                    className="group relative w-full rounded-sm py-4 ps-14 pe-3 text-start transition-colors"
                  >
                    <span
                      className={`num absolute start-0 top-4 text-3xl font-semibold leading-none transition-colors duration-500 ${
                        on ? "text-foreground" : "text-foreground/20 group-hover:text-foreground/40"
                      }`}
                    >
                      0{i + 1}
                    </span>
                    <span
                      className={`block text-lg font-semibold transition-colors duration-500 ${
                        on ? "text-foreground" : "text-foreground/55"
                      }`}
                    >
                      {t(`landing.features.${f}.title`)}
                    </span>
                    <span
                      className={`grid transition-all duration-500 ${
                        on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <span className="overflow-hidden">
                        <span className="block pt-1.5 text-sm text-muted-foreground">
                          {t(`landing.features.${f}.text`)}
                        </span>
                      </span>
                    </span>
                    {/* Progress of the automatic tour. */}
                    <span className="absolute inset-x-0 bottom-0 h-px bg-border">
                      {on && auto && (
                        <span
                          key={active}
                          className="feature-progress block h-full bg-foreground"
                          style={{ animationDuration: `${CYCLE_MS}ms` }}
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Illustrated quote */}
          <figure className="min-w-0">
            <AnatomyQuote active={active} />
            <figcaption className="mt-2 text-xs text-muted-foreground">
              {t("landing.features.illustration")}
            </figcaption>
          </figure>
        </div>

        {/* Around the quote: one slim line, no cards. */}
        <ul className="mt-14 grid gap-y-6 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {AROUND.map(({ key, icon }, i) => (
            <li key={key} className={`flex gap-3 lg:px-6 ${i === 0 ? "lg:ps-0" : "lg:border-s"}`}>
              <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
              <span>
                <span className="block font-semibold">{t(`landing.features.${key}.title`)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {t(`landing.features.${key}.text`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The illustrated quote; the zone of the `active` feature is highlighted. */
export function AnatomyQuote({ active }: { active: Zone | null }) {
  const { t } = useTranslation();
  const { fmt, locale } = useLocale();

  // Illustration figures: 8 400 + 2 × 1 200 HT, VAT 20 %.
  const ht = 10800;
  const vat = 2160;
  const ttc = 12960;

  /** A zone of the illustrated quote, highlighted when its feature is active. */
  const zone = (z: Zone, children: ReactNode, className = "") => (
    <div
      className={`relative rounded-sm transition-all duration-500 ${
        active === z ? "bg-[#B7F34A]/20 opacity-100 shadow-[0_0_0_2px_#B7F34A]" : "opacity-45"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`num absolute -end-2.5 -top-2.5 z-10 flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-500 ${
          active === z ? "bg-[#B7F34A] text-[#14213D]" : "bg-muted text-muted-foreground"
        }`}
      >
        {ON_DOC.indexOf(z) + 1}
      </span>
      {children}
    </div>
  );

  return (
    <div className="relative border bg-paper text-[11px] shadow-[0_24px_48px_-24px_rgb(20_33_61/0.4)] sm:text-xs">
      {zone(
        "f4",
        <div className="h-2.5 w-full bg-[#14213D]">
          <div className="h-full w-1/3 bg-[#B7F34A]" />
        </div>,
        "rounded-none",
      )}
      <div className="space-y-4 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3 [&>*:first-child]:min-w-0 [&>*:last-child]:shrink-0">
          {zone(
            "f2",
            <div className="p-1.5">
              <p className="text-sm font-semibold">Atelier Bennani SARL</p>
              <p className="text-muted-foreground">{t("landing.sampleCity")}</p>
              <p className="num mt-1 text-[10px] text-muted-foreground" dir="ltr">
                ICE 002345678000091 · IF 45678912 · RC 512345 · TP 34512678
              </p>
            </div>,
          )}
          {zone(
            "f1",
            <div className="whitespace-nowrap p-1.5 text-end">
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                {t("doc.title.devis")}
              </p>
              <p className="num text-muted-foreground" dir="ltr">
                DV-2026-014
              </p>
            </div>,
          )}
        </div>

        {zone(
          "f2",
          <div className="border p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("doc.client")}
            </p>
            <p className="font-medium">Hôtel Tanger Bay</p>
            <p className="num text-[10px] text-muted-foreground" dir="ltr">
              ICE 001987654000072
            </p>
          </div>,
        )}

        <div className="opacity-60">
          <div className="flex justify-between border-b-2 border-[#14213D] pb-1 text-[10px] font-semibold uppercase">
            <span>{t("doc.col.designation")}</span>
            <span>{t("doc.col.totalHt")}</span>
          </div>
          {(
            [
              [t("landing.sampleLine1"), 8400],
              [t("landing.sampleLine2"), 2400],
            ] as const
          ).map(([d, v]) => (
            <div key={d} className="flex justify-between gap-3 border-b py-1.5">
              <span>{d}</span>
              <bdi className="num whitespace-nowrap">{fmt.money(v)}</bdi>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          {zone(
            "f2",
            <p className="max-w-[16rem] p-1.5 text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">{t("doc.wordsDevis")}</span>{" "}
              {t("doc.wordsFull", { words: amountInWords(ttc, locale) })}
            </p>,
          )}
          {zone(
            "f3",
            <div className="num min-w-44 p-1.5">
              <div className="flex justify-between gap-4">
                <span>{t("doc.totalHt")}</span>
                <bdi>{fmt.money(ht)}</bdi>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("doc.vat", { rate: fmt.percent(20) })}</span>
                <bdi>{fmt.money(vat)}</bdi>
              </div>
              <div className="mt-1 flex justify-between gap-4 bg-[#14213D] px-1.5 py-1 font-semibold text-white">
                <span>{t("doc.totalTtc")}</span>
                <bdi>{fmt.money(ttc)}</bdi>
              </div>
            </div>,
          )}
        </div>
      </div>
    </div>
  );
}
