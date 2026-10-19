import { useEffect, useState } from "react";
import { AnatomyQuote, ON_DOC, type Zone } from "./FeatureShowcase";

const STEP_MS = 2000;

/**
 * Homepage hero illustration: the annotated quote, touring its features on its own.
 * The tour pauses while hovered and does not run for people who prefer reduced motion.
 */
export function HeroQuote() {
  const [active, setActive] = useState<Zone>("f1");
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || still) return;
    const id = setInterval(
      () => setActive((a) => ON_DOC[(ON_DOC.indexOf(a) + 1) % ON_DOC.length]!),
      STEP_MS,
    );
    return () => clearInterval(id);
  }, [paused, still]);

  return (
    <div
      className="min-w-0 self-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-hidden
    >
      <AnatomyQuote active={active} />
    </div>
  );
}
