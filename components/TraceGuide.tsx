"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MockGitHubPR, MockDiscord, MockSlack, MockBriefing, MiniGraphAnim } from "@/components/tourGraphics";
import { TraceBot } from "@/components/TraceBot";

type Graphic = "github" | "discord" | "slack" | "briefing" | "graphanim";
interface Step {
  nav?: string;
  target?: string;
  title: string;
  text: string;
  graphic?: Graphic;
}

const TOUR: Step[] = [
  { title: "Hey — I'm Trace 👋", text: "Your team's memory, with a face. Drag me anywhere. Let me give you the 30-second tour of what I do." },
  { nav: "briefing", target: '[data-tour="nav-briefing"]', title: "Your morning briefing", text: "Every day I surface the things your team forgot — cited, dated, and owned. Like this:", graphic: "briefing" },
  { target: '[data-tour="nav-briefing"]', title: "I comment on PRs", text: "When someone opens a pull request that reverses a past decision, I flag it right on the PR:", graphic: "github" },
  { target: '[data-tour="nav-briefing"]', title: "…and reply in Discord", text: "In Discord I jump into the thread the second a decision drifts:", graphic: "discord" },
  { target: '[data-tour="nav-briefing"]', title: "…and in Slack", text: "Same in Slack — the moment a new call reverses an earlier one, I speak up with the receipt:", graphic: "slack" },
  { nav: "graph", target: '[data-tour="nav-graph"]', title: "The living decision graph", text: "Every decision, person and project — connected. When I answer, the exact subgraph I traversed lights up, like this:", graphic: "graphanim" },
  { nav: "ask", target: '[data-tour="nav-ask"]', title: "Ask me anything", text: "Query your team's whole history and I answer with citations to the real messages." },
  { nav: "talk", target: '[data-tour="nav-talk"]', title: "Or just talk to me", text: "Prefer voice? That face on the Talk tab is me — same character, speaking your answers out loud." },
  { nav: "whatif", target: '[data-tour="nav-whatif"]', title: "Query the future", text: "Wondering what breaks if a key person leaves? I'll project the impact, grounded in what they own." },
  { nav: "sources", target: '[data-tour="nav-sources"]', title: "Connect your tools", text: "Discord, GitHub, Slack, Teams — plug them in here in a few clicks. No terminal, no config files." },
  { target: '[data-tour="header"]', title: "Cloud or local — your call", text: "Flip my memory backend right here. If one goes down, I keep working from the other." },
  { title: "That's the tour! 🎉", text: "I'll hang out here and speak up only when something matters. Drag me wherever you like — replay this anytime from my ? button." },
];

const GRAPHIC: Record<Graphic, () => JSX.Element> = {
  github: MockGitHubPR,
  discord: MockDiscord,
  slack: MockSlack,
  briefing: MockBriefing,
  graphanim: MiniGraphAnim,
};
const AV = 60;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TraceGuide({ navigate, autoStart = false }: { navigate: (v: string) => void; autoStart?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -999, y: -999 });
  const [ready, setReady] = useState(false);
  const [tour, setTour] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [blink, setBlink] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [narrate, setNarrate] = useState(true);
  const narrateRef = useRef(true);
  const [talking, setTalking] = useState(false);
  const [mouth, setMouth] = useState(0);

  const base = () => rootRef.current?.getBoundingClientRect();

  // Voice narration — Trace reads each step aloud with the browser's speech engine
  // (no API key, works offline). While it speaks, `talking` drives the bot's mouth.
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      setTalking(false);
      if (!narrateRef.current) return;
      const clean = text.replace(/👋|🎉|⚠️|↗|🔍/g, "").replace(/[—…]/g, ",");
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.04;
      u.pitch = 1.06;
      u.onstart = () => setTalking(true);
      u.onend = () => setTalking(false);
      u.onerror = () => setTalking(false);
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unavailable */
    }
  }, []);

  // Animate the mouth open/closed while narrating (no audio amplitude to sample here).
  useEffect(() => {
    if (!talking) {
      setMouth(0);
      return;
    }
    const id = setInterval(() => setMouth(0.3 + Math.random() * 0.55), 95);
    return () => clearInterval(id);
  }, [talking]);

  // Stop any speech if the component unmounts.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // initial dock: bottom-right
  useEffect(() => {
    const r = base();
    if (r && r.width) {
      setPos({ x: r.width - AV - 24, y: r.height - AV * (74 / 64) - 28 });
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const b = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4200);
    return () => clearInterval(b);
  }, []);

  const measure = useCallback((sel?: string): Rect | null => {
    const b = base();
    if (!b || !sel) return null;
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const t = el.getBoundingClientRect();
    return { top: t.top - b.top, left: t.left - b.left, width: t.width, height: t.height };
  }, []);

  const placeCoach = useCallback((r: Rect | null) => {
    const b = base();
    if (!b) return;
    const W = b.width;
    const H = b.height;
    const cw = 320;
    const ch = 260;
    let x: number;
    let y: number;
    if (!r) {
      x = (W - cw) / 2;
      y = H - ch - 24;
    } else {
      x = r.left + r.width + 20;
      y = r.top - 8;
      if (x + cw > W - 8) {
        x = r.left;
        y = r.top + r.height + 14;
      }
      if (y + ch > H - 8) y = Math.max(8, r.top - ch - 10);
    }
    setPos({ x: Math.max(8, Math.min(x, W - AV - 8)), y: Math.max(8, Math.min(y, H - AV - 8)) });
  }, []);

  const goStep = useCallback(
    (i: number) => {
      const s = TOUR[i];
      if (!s) return;
      if (s.nav) navigate(s.nav);
      setStep(i);
      speak(`${s.title}. ${s.text}`);
      window.setTimeout(
        () => {
          const r = s.target ? measure(s.target) : null;
          setRect(r);
          placeCoach(r);
        },
        s.nav ? 280 : 130,
      );
    },
    [measure, navigate, placeCoach, speak],
  );

  const startTour = useCallback(() => {
    setTour(true);
    goStep(0);
  }, [goStep]);

  const endTour = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setTalking(false);
    setTour(false);
    setRect(null);
    try {
      localStorage.setItem("trace-tour-done", "1");
    } catch {
      /* ignore */
    }
    const r = base();
    if (r) setPos({ x: r.width - AV - 24, y: r.height - AV * (74 / 64) - 28 });
  }, []);

  const toggleNarrate = useCallback(() => {
    setNarrate((prev) => {
      const next = !prev;
      narrateRef.current = next;
      if (!next) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
        setTalking(false);
      } else {
        const s = TOUR[step];
        if (s) speak(`${s.title}. ${s.text}`);
      }
      return next;
    });
  }, [step, speak]);

  // auto-start once (only full-screen /app, not the landing's embedded frame)
  useEffect(() => {
    if (!autoStart) return;
    let done = true;
    try {
      done = !!localStorage.getItem("trace-tour-done");
    } catch {
      /* ignore */
    }
    if (!done) {
      const t = window.setTimeout(() => startTour(), 1100);
      return () => window.clearTimeout(t);
    }
  }, [autoStart, startTour]);

  // drag
  const onDown = (e: React.PointerEvent) => {
    const b = base();
    if (!b) return;
    movedRef.current = false;
    dragRef.current = { dx: e.clientX - (b.left + pos.x), dy: e.clientY - (b.top + pos.y) };
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    movedRef.current = true;
    const b = base();
    if (!b) return;
    setPos({
      x: Math.max(4, Math.min(e.clientX - b.left - dragRef.current.dx, b.width - AV - 4)),
      y: Math.max(4, Math.min(e.clientY - b.top - dragRef.current.dy, b.height - AV - 4)),
    });
  };
  const onUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const s = TOUR[step];
  const Graphic = tour && s.graphic ? GRAPHIC[s.graphic] : null;
  const avCx = pos.x + AV / 2;
  const avCy = pos.y + AV / 2;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-40 overflow-hidden" style={{ opacity: ready ? 1 : 0 }}>
      {/* spotlight (visual only; app stays clickable) */}
      {tour && rect && (
        <div
          className="absolute rounded-xl"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(20,22,34,0.40)",
            border: "2px solid var(--accent)",
            transition: "all .38s cubic-bezier(.22,1,.36,1)",
          }}
        />
      )}
      {/* pointer arrow from the avatar to the target */}
      {tour && rect && (
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
          <line
            x1={avCx}
            y1={avCy}
            x2={rect.left + rect.width / 2}
            y2={rect.top + rect.height / 2}
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="4 5"
            strokeLinecap="round"
            opacity="0.7"
          >
            <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
          </line>
          <circle cx={rect.left + rect.width / 2} cy={rect.top + rect.height / 2} r="4" fill="var(--accent)" />
        </svg>
      )}

      {/* coach unit: avatar + bubble */}
      <div
        className="pointer-events-auto absolute flex items-start gap-2.5"
        style={{ left: pos.x, top: pos.y, transition: dragging ? "none" : "left .38s cubic-bezier(.22,1,.36,1), top .38s cubic-bezier(.22,1,.36,1)" }}
      >
        <button
          type="button"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className={`shrink-0 cursor-grab touch-none active:cursor-grabbing ${dragging ? "" : "trace-bob"}`}
          title="Drag me · click for a tour"
          onClick={() => {
            if (!movedRef.current && !tour) startTour();
          }}
          aria-label="Trace guide"
        >
          <TraceBot size={AV} blink={blink} talk={tour || talking} mouth={mouth} />
        </button>

        {tour ? (
          <div className="trace-rise w-[248px] rounded-2xl rounded-tl-sm p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)" }}>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                Trace · guide
                {talking && (
                  <span className="flex items-end gap-[1.5px]" aria-hidden>
                    <span className="w-[2px] animate-pulse rounded-full" style={{ height: 5, background: "var(--accent)" }} />
                    <span className="w-[2px] animate-pulse rounded-full" style={{ height: 8, background: "var(--accent)", animationDelay: "0.15s" }} />
                    <span className="w-[2px] animate-pulse rounded-full" style={{ height: 4, background: "var(--accent)", animationDelay: "0.3s" }} />
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleNarrate}
                  className="text-[12px] text-faint hover:text-ink"
                  title={narrate ? "Mute narration" : "Unmute narration"}
                  aria-label={narrate ? "Mute narration" : "Unmute narration"}
                >
                  {narrate ? "🔊" : "🔇"}
                </button>
                <button type="button" onClick={endTour} className="text-[11px] text-faint hover:text-ink">
                  Skip
                </button>
              </div>
            </div>
            <div className="text-[13px] font-semibold text-ink">{s.title}</div>
            <p className="mt-1 text-[12.5px] leading-snug text-dim">{s.text}</p>
            {Graphic && (
              <div className="mt-2.5">
                <Graphic />
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1">
                {TOUR.map((_, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === step ? "var(--accent)" : "var(--line-strong)" }} />
                ))}
              </div>
              <div className="flex gap-1.5">
                {step > 0 && (
                  <button type="button" onClick={() => goStep(step - 1)} className="btn px-2.5 py-1 text-[12px]">
                    Back
                  </button>
                )}
                {step < TOUR.length - 1 ? (
                  <button type="button" onClick={() => goStep(step + 1)} className="btn-primary px-3 py-1 text-[12px]">
                    Next
                  </button>
                ) : (
                  <button type="button" onClick={endTour} className="btn-primary px-3 py-1 text-[12px]">
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startTour}
            className="trace-rise pointer-events-auto mt-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)", color: "var(--accent-ink)" }}
            title="Replay the tour"
          >
            ? Tour
          </button>
        )}
      </div>
    </div>
  );
}
