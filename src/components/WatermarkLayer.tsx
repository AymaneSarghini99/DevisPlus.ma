import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { normalizeWatermark, type Watermark } from "@/lib/design";

/** Watermark drawn over the page. Sizes use container units, so it keeps the same place and
 *  proportions in the scaled preview and on paper (printing repeats it on every page). */
export function WatermarkLayer({
  w,
  logo,
  onChange,
}: {
  w: Watermark;
  logo: string;
  onChange?: ((w: Watermark) => void) | undefined;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const useLogo = w.kind === "logo" && !!logo;
  if (!useLogo && !w.text.trim()) return null;

  const moveTo = (e: PointerEvent<HTMLDivElement>) => {
    const page = ref.current?.parentElement?.getBoundingClientRect();
    if (!page || !onChange) return;
    onChange(
      normalizeWatermark({
        ...w,
        x: Math.round(((e.clientX - page.left) / page.width) * 1000) / 10,
        y: Math.round(((e.clientY - page.top) / page.height) * 1000) / 10,
      }),
    );
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const step = e.shiftKey ? 5 : 1;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(normalizeWatermark({ ...w, x: w.x + d[0]!, y: w.y + d[1]! }));
  };

  const editable = !!onChange;
  return (
    <div
      ref={ref}
      className={`watermark absolute z-10 select-none whitespace-nowrap mix-blend-multiply ${
        editable
          ? "cursor-move touch-none rounded-sm outline-1 outline-offset-4 outline-transparent hover:outline-dashed hover:outline-foreground/40 focus-visible:outline-dashed focus-visible:outline-foreground"
          : "pointer-events-none"
      }`}
      style={{
        left: `${w.x}%`,
        top: `${w.y}%`,
        opacity: w.opacity,
        transform: `translate(-50%, -50%) rotate(${w.rotation}deg)`,
      }}
      aria-hidden={!editable}
      {...(editable
        ? {
            role: "slider",
            tabIndex: 0,
            "aria-label": t("watermark.positionLabel"),
            "aria-valuetext": t("watermark.positionValue", {
              x: Math.round(w.x),
              y: Math.round(w.y),
            }),
            onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
              e.preventDefault(); // no text selection while dragging
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              e.currentTarget.focus();
            },
            onPointerMove: (e: PointerEvent<HTMLDivElement>) => dragging.current && moveTo(e),
            onPointerUp: () => (dragging.current = false),
            onPointerCancel: () => (dragging.current = false),
            onKeyDown: onKey,
            onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault(),
          }
        : {})}
    >
      {useLogo ? (
        <img
          src={logo}
          alt=""
          draggable={false}
          style={{ width: `${w.size}cqw` }}
          className="block max-w-none"
        />
      ) : (
        <span
          className="block font-bold uppercase tracking-[0.12em] text-[#14213D]"
          style={{ fontSize: `${w.size * 0.25}cqw`, lineHeight: 1 }}
        >
          {w.text}
        </span>
      )}
    </div>
  );
}
