import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Smile, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CONTACT } from "@/legal/operator";
import { whatsappUrl } from "@/lib/quotes";

/** WhatsApp logo (Simple Icons, CC0). */
export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const EMOJIS = ["👋", "😊", "🙏", "👍", "📄", "💬", "✅", "❓"];

/** Floating WhatsApp contact chat (bottom end corner). The visitor types a message here and it
 *  opens in WhatsApp, ready to send; nothing is sent until they press send in WhatsApp. */
export function WhatsAppWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [emojis, setEmojis] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const send = () => {
    const message = text.trim() || t("site.waGreeting");
    window.open(whatsappUrl(CONTACT.phone, message), "_blank", "noopener,noreferrer");
    setText("");
    setEmojis(false);
    setOpen(false);
  };

  return (
    <div className="no-print fixed bottom-5 end-5 z-50 flex flex-col items-end gap-4">
      {open && (
        <div
          ref={panel}
          id="wa-panel"
          role="dialog"
          aria-labelledby="wa-title"
          className="wa-enter w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl bg-[#efedf1] shadow-[0_18px_44px_-14px_rgb(20_30_60/0.35)]"
        >
          <div className="relative bg-[#4a9179] px-4 pb-3 pt-3.5 pe-10 text-white">
            <p id="wa-title" className="text-[15px] font-bold">
              DevisPlus.ma
            </p>
            <p className="mt-0.5 text-xs opacity-90">{t("site.waSubtitle")}</p>
            <button
              type="button"
              className="absolute end-3 top-3 rounded-sm p-0.5 text-white/60 transition hover:text-white"
              aria-label={t("common.close")}
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-[6.5rem] bg-[#e7dfda] px-3 py-4">
            <p
              dir="auto"
              className="wa-bubble inline-block max-w-[85%] rounded-2xl bg-white px-3.5 py-2 text-[13px] text-[#1f2328] shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
            >
              {t("site.waHello")}
            </p>
          </div>

          <form
            className="relative flex items-center gap-2.5 px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            {emojis && (
              <div className="absolute bottom-full start-3 mb-2 flex gap-1 rounded-full bg-white px-2 py-1 shadow-md">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="rounded-full p-1 text-base leading-none hover:bg-[#efedf1]"
                    onClick={() => {
                      setText((v) => v + em);
                      setEmojis(false);
                      input.current?.focus();
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1">
              <input
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("site.waPlaceholder")}
                aria-label={t("site.waPlaceholder")}
                className="h-10 w-full rounded-full border-0 bg-white ps-4 pe-10 text-[13px] text-[#1f2328] shadow-[0_1px_2px_rgb(0_0_0/0.06)] outline-none placeholder:text-[#9a9aa3] focus:ring-2 focus:ring-[#4a9179]/40"
              />
              <button
                type="button"
                aria-label={t("site.waEmoji")}
                aria-expanded={emojis}
                onClick={() => setEmojis(!emojis)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#8a8a93] transition hover:text-[#4a9179]"
              >
                <Smile className="size-[18px]" />
              </button>
            </div>
            <button
              type="submit"
              aria-label={t("site.waSend")}
              title={t("site.waSend")}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4a9179] text-white transition hover:scale-105 hover:bg-[#3f806a]"
            >
              <SendHorizontal className="size-[18px] fill-current rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      )}
      <button
        ref={button}
        type="button"
        aria-label={t("site.waOpen")}
        title={t("site.waOpen")}
        aria-expanded={open}
        aria-controls="wa-panel"
        onClick={() => setOpen(!open)}
        className="flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {open ? <X className="size-6" /> : <WhatsAppIcon className="size-8" />}
      </button>
    </div>
  );
}
