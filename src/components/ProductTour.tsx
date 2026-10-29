import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { markTourDone, tourPending } from "@/lib/tenant";
import { TOURS, type TourId } from "@/onboarding/tours";

type Box = { top: number; left: number; width: number; height: number };

/** Space around the highlighted element, viewport margin, note width, badge size. */
const PAD = 6;
const GUTTER = 16;
const CARD_W = 320;
const EDGE = 4;
const BADGE = 20;

const find = (target: string) => document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
const visible = (el: HTMLElement | null): el is HTMLElement =>
  !!el && el.getClientRects().length > 0;
/**
 * The element's box with some space around it, kept inside the screen (e.g. header links);
 * null while it is scrolled out of view (phone menu, long pages).
 */
const boxOf = (el: HTMLElement): Box | null => {
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth)
    return null;
  const top = Math.max(EDGE, r.top - PAD);
  const left = Math.max(EDGE, r.left - PAD);
  const bottom = Math.min(window.innerHeight - EDGE, r.bottom + PAD);
  const right = Math.min(window.innerWidth - EDGE, r.right + PAD);
  return { top, left, width: right - left, height: bottom - top };
};
const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/**
 * First-visit guided tour of a page, in the style of the landing page's illustrated quote
 * (FeatureShowcase): the current element is outlined in green with a green numbered badge, the
 * other steps keep a grey badge. One step at a time with Précédent / Suivant / Passer; finishing
 * or skipping is saved on the account (tenant.onboarding.toursDone), so it shows once.
 */
export function ProductTour({ tour }: { tour: TourId }) {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [boxes, setBoxes] = useState<(Box | null)[]>([]);
  const [view, setView] = useState({ w: 0, h: 0, cardH: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Starts once the page has rendered its elements (lists load after the first paint).
  useEffect(() => {
    if (!tourPending(tour)) return;
    let timer: ReturnType<typeof setTimeout>;
    const poll = setInterval(() => {
      if (!TOURS[tour].some((s) => visible(find(s)))) return;
      clearInterval(poll);
      timer = setTimeout(() => {
        const shown = TOURS[tour].filter((s) => visible(find(s)));
        if (shown.length) setSteps(shown);
      }, 300);
    }, 200);
    return () => {
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, [tour]);

  // Follows the elements while the page scrolls, resizes or re-renders.
  useEffect(() => {
    if (!steps) return;
    let raf = 0;
    const tick = () => {
      const next = steps.map((s) => {
        const el = find(s);
        return visible(el) ? boxOf(el) : null;
      });
      setBoxes((prev) =>
        prev.length === next.length && prev.every((b, i) => sameBox(b, next[i] ?? null))
          ? prev
          : next,
      );
      const cardH = cardRef.current?.offsetHeight ?? 0;
      setView((v) =>
        v.w === window.innerWidth && v.h === window.innerHeight && v.cardH === cardH
          ? v
          : { w: window.innerWidth, h: window.innerHeight, cardH },
      );
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [steps]);

  useEffect(() => {
    const target = steps?.[index];
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    find(target)?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
    nextRef.current?.focus({ preventScroll: true });
  }, [steps, index]);

  const close = () => {
    try {
      markTourDone(tour);
    } catch {
      // Not saved (storage refused): the tour simply shows again next time.
    }
    setSteps(null);
  };
  const last = !!steps && index === steps.length - 1;
  const next = () => (last ? close() : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!steps) return;
    const onKey = (e: KeyboardEvent) => {
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "Escape") close();
      else if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) next();
      else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!steps) return null;
  const step = steps[index];
  const box = boxes[index] ?? null;
  const rtl = document.documentElement.dir === "rtl";
  const phone = view.w < 640;

  // The note goes under the element, or above it when there is no room; on phones, at the bottom.
  let cardStyle: React.CSSProperties | undefined;
  if (!phone && box) {
    const below = box.top + box.height + 12;
    const above = box.top - 12 - view.cardH;
    // An element taller than the screen: the note sits at the bottom of the screen, over it.
    const top =
      below + view.cardH + GUTTER <= view.h
        ? below
        : above >= GUTTER
          ? above
          : view.h - view.cardH - GUTTER;
    const start = rtl ? box.left + box.width - CARD_W : box.left;
    const left = Math.min(Math.max(GUTTER, start), view.w - CARD_W - GUTTER);
    cardStyle = { top, left, width: CARD_W };
  }

  return createPortal(
    <>
      {/* Clicks on the page are held while the tour is open. */}
      <div
        className={`fixed inset-0 z-[1000] ${box ? "" : "bg-[rgb(20_33_61/0.45)]"}`}
        aria-hidden="true"
      />
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[1001] rounded-[var(--radius)] bg-[#B7F34A]/20 shadow-[0_0_0_2px_#B7F34A,0_0_0_9999px_rgb(20_33_61/0.45)] transition-[top,left,width,height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={box}
        />
      )}
      {boxes.map((b, i) => {
        if (!b) return null;
        const on = i === index;
        return (
          <button
            key={steps[i]}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t("onboarding.stepOf", { n: i + 1, total: steps.length })}
            aria-current={on ? "step" : undefined}
            className={`num fixed z-[1002] flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-500 ${
              on ? "ob-pop bg-[#B7F34A] text-[#14213D]" : "bg-muted text-muted-foreground"
            }`}
            style={{
              top: Math.max(EDGE, b.top - BADGE / 2),
              left: Math.min(
                view.w - BADGE - EDGE,
                Math.max(EDGE, rtl ? b.left - BADGE / 2 : b.left + b.width - BADGE / 2),
              ),
            }}
          >
            {i + 1}
          </button>
        );
      })}

      <div
        ref={cardRef}
        key={step}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        className={`ob-enter fixed z-[1003] border bg-card p-4 shadow-lg ${
          phone || !cardStyle ? "inset-x-4 bottom-4" : ""
        }`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="label" aria-live="polite">
            {t("onboarding.stepOf", { n: index + 1, total: steps.length })}
          </span>
          <button
            type="button"
            onClick={close}
            className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("tour.skip")}
          >
            <X className="size-4" />
          </button>
        </div>
        <h2 id="tour-title" className="mt-1 font-semibold">
          {t(`tour.${tour}.${step}.title` as never)}
        </h2>
        <p id="tour-text" className="mt-1 text-sm text-muted-foreground">
          {t(`tour.${tour}.${step}.text` as never)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={close}
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            {t("tour.skip")}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button type="button" onClick={prev} className="btn btn-ghost h-9 border px-3">
                <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t("tour.prev")}
              </button>
            )}
            <button ref={nextRef} type="button" onClick={next} className="btn btn-primary h-9 px-4">
              {last ? t("tour.done") : t("tour.next")}
              {!last && <ArrowRight className="size-4 rtl:-scale-x-100" />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
