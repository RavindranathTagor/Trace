"use client";

import { useEffect, useRef, useState } from "react";

// Demo-video showcase for the landing.
// Browsers only allow autoplay when MUTED, so: when the section scrolls into view we
// autoplay a muted, looping teaser; a prominent pulsing "Play with sound" button
// reloads the embed unmuted from the start (a user gesture, so sound is allowed).
const VIDEO_ID = "5f_USSYVek0";

export default function VideoShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [withSound, setWithSound] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src = withSound
    ? `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div ref={ref} className="mx-auto w-full max-w-4xl">
      <div
        className="group relative overflow-hidden rounded-2xl"
        style={{
          border: "1px solid var(--line)",
          background: "var(--surface)",
          boxShadow: "0 24px 60px -24px oklch(0.52 0.17 266 / 0.35), 0 1px 2px oklch(0 0 0 / 0.05)",
        }}
      >
        {/* animated accent glow ring */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-60"
          style={{
            background: "linear-gradient(120deg, transparent, oklch(0.52 0.17 266 / 0.25), transparent)",
            maskImage: "linear-gradient(#000 0 0)",
            animation: "traceSheen 6s ease-in-out infinite",
          }}
        />
        <div className="relative aspect-video w-full">
          {inView ? (
            <iframe
              key={withSound ? "sound" : "muted"}
              src={src}
              title="Trace — demo"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              frameBorder="0"
            />
          ) : (
            <img
              src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
              alt="Trace demo preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* Play-with-sound button — shown until the user opts into sound */}
          {!withSound && (
            <button
              type="button"
              onClick={() => setWithSound(true)}
              className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
              style={{ background: "var(--accent)" }}
              aria-label="Play the demo with sound"
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                <svg viewBox="0 0 24 24" className="relative h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              Play with sound
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-faint">2-minute demo · watch Trace catch a decision going wrong, live</p>

      <style>{`@keyframes traceSheen {0%{transform:translateX(-30%)}50%{transform:translateX(30%)}100%{transform:translateX(-30%)}}`}</style>
    </div>
  );
}
