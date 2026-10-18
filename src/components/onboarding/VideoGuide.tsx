import { useState } from "react";
import { ChevronDown, Play, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INTRO_VIDEO } from "@/onboarding/config";

/**
 * "How the app works" video. Plays the file or YouTube video set in onboarding/config.ts;
 * until one is set, shows an honest placeholder. YouTube is only loaded after a click
 * (youtube-nocookie), so no third-party request happens before the visitor asks for it.
 */
export function VideoGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!INTRO_VIDEO.src || !!INTRO_VIDEO.youtubeId;

  return (
    <section className="ob-enter overflow-hidden border bg-card" aria-labelledby="ob-video-title">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
        aria-expanded={open}
        aria-controls="ob-video-body"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Video className="size-4" />
          </span>
          <span>
            <span id="ob-video-title" className="block font-semibold">
              {t("onboarding.video.title")}
            </span>
            <span className="block text-sm text-muted-foreground">
              {open ? t("onboarding.video.text") : t("onboarding.video.show")}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Smooth open/close: grid rows animate from 0fr to 1fr. */}
      <div
        id="ob-video-body"
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-5">
            <div className="relative aspect-video overflow-hidden rounded-[var(--radius)] bg-primary">
              {INTRO_VIDEO.src ? (
                <video
                  className="size-full object-cover"
                  src={INTRO_VIDEO.src}
                  poster={INTRO_VIDEO.poster ?? undefined}
                  controls
                  preload="metadata"
                  playsInline
                />
              ) : INTRO_VIDEO.youtubeId && playing ? (
                <iframe
                  className="size-full"
                  src={`https://www.youtube-nocookie.com/embed/${INTRO_VIDEO.youtubeId}?autoplay=1&rel=0`}
                  title={t("onboarding.video.title")}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  disabled={!hasVideo}
                  onClick={() => setPlaying(true)}
                  className="group flex size-full flex-col items-center justify-center gap-3 text-primary-foreground disabled:cursor-default"
                  aria-label={
                    hasVideo ? t("onboarding.video.title") : t("onboarding.video.placeholderTitle")
                  }
                >
                  <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform duration-300 group-enabled:group-hover:scale-110">
                    <Play className="size-7 translate-x-0.5" fill="currentColor" />
                  </span>
                  {!hasVideo && (
                    <span className="px-6 text-center">
                      <span className="block font-semibold">
                        {t("onboarding.video.placeholderTitle")}
                      </span>
                      <span className="mt-1 block text-sm text-primary-foreground/70">
                        {t("onboarding.video.placeholderText")}
                      </span>
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
