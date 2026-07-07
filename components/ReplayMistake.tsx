"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandIcon";
import { TraceMark } from "@/components/TraceMark";
import { IconPlay, IconShield } from "@/components/Icons";

// "Replay a mistake", the unforgettable hero demo. A visitor hits Replay and
// watches a real drift play out on a timeline: a decision is made and remembered,
// months later a PR reverses it, and 2 seconds later Trace comments with citations.
// Ends on the with/without contrast. Pure client animation (no backend needed).

interface Beat {
  date: string;
  kind: "decide" | "store" | "pr" | "catch";
  title: string;
  detail: string;
}

const BEATS: Beat[] = [
  { date: "Mar 12", kind: "decide", title: "Team standardizes on PostgreSQL", detail: "“All new services use Postgres, we're done running Mongo in prod.”, Priya, #architecture" },
  { date: "Apr 2", kind: "store", title: "Decision remembered by Trace", detail: "Written to the temporal memory graph, cited, dated, owned." },
  { date: "Jul 5", kind: "pr", title: "PR #482, migrate billing to MongoDB", detail: "A new engineer opens a PR that reverses the standard. Nobody remembers the thread." },
  { date: "+2s", kind: "catch", title: "Trace comments on the PR", detail: "⟲ This reverses the Q1 decision to standardize on PostgreSQL (Priya). Reconcile before merge." },
];

export default function ReplayMistake() {
  const [step, setStep] = useState(-1); // -1 = idle
  const [playing, setPlaying] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clear(), []);

  const play = useCallback(() => {
    clear();
    setPlaying(true);
    setStep(0);
    const delays = [1400, 1400, 1900, 1600];
    let acc = 0;
    BEATS.forEach((_, i) => {
      if (i === 0) return;
      acc += delays[i - 1];
      timers.current.push(setTimeout(() => setStep(i), acc));
    });
    const end = acc + delays[delays.length - 1];
    timers.current.push(setTimeout(() => setPlaying(false), end)); // hold on the payoff…
    timers.current.push(setTimeout(() => play(), end + 3400)); // …then loop
  }, []);

  // Auto-play on open, then loop continuously.
  useEffect(() => {
    const t = setTimeout(() => play(), 500);
    return () => clearTimeout(t);
  }, [play]);

  const done = step >= BEATS.length - 1 && !playing;

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: "var(--accent-soft)" }}><TraceMark className="h-4 w-4" /></span>
          <span className="text-[13px] font-semibold text-ink">Replay a mistake</span>
        </div>
        <button type="button" onClick={play} className="btn-primary px-3 py-1.5 text-[12px]">
          <IconPlay className="h-3.5 w-3.5" />
          {step === -1 ? "Replay" : "Replay again"}
        </button>
      </div>

      <div className="relative px-5 py-5">
        {step === -1 ? (
          <div className="flex items-center gap-3 py-6 text-[13px] text-dim">
            <IconPlay className="h-5 w-5 text-accent" />
            Press <span className="font-medium text-ink">Replay</span> to watch Trace catch a reversed decision in real time.
          </div>
        ) : (
          <div className="relative ml-1">
            <span aria-hidden className="absolute left-[9px] top-2 bottom-2 w-[2px] rounded-full" style={{ background: "var(--line)" }} />
            <ol>
            {BEATS.map((b, i) => {
              const on = i <= step;
              const isCatch = b.kind === "catch";
              return (
                <li key={i} className="relative mb-3 pl-8 transition-all duration-500" style={{ opacity: on ? 1 : 0.28, transform: on ? "none" : "translateY(4px)" }}>
                  <span
                    className="absolute left-0 top-[3px] grid h-5 w-5 place-items-center rounded-full"
                    style={{ background: on ? (isCatch ? "var(--accent)" : "var(--surface)") : "var(--surface)", border: `2px solid ${on ? (isCatch ? "var(--accent)" : "var(--line-strong)") : "var(--line)"}` }}
                  >
                    {isCatch && on ? <TraceMark className="h-3 w-3" /> : b.kind === "pr" && on ? <BrandLogo slug="github" className="h-3 w-3" color={false} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? "var(--accent)" : "var(--line-strong)" }} />}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums" style={{ background: "var(--surface-2)", color: "var(--ink-dim)", border: "1px solid var(--line)" }}>{b.date}</span>
                    <span className="text-[13px] font-semibold text-ink">{b.title}</span>
                  </div>
                  <div
                    className="mt-1 rounded-lg px-2.5 py-1.5 text-[12px] leading-snug"
                    style={isCatch ? { background: "color-mix(in oklab, var(--signal) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--signal) 32%, transparent)", color: "var(--ink)" } : { color: "var(--ink-dim)" }}
                  >
                    {b.detail}
                  </div>
                </li>
              );
            })}
            </ol>
          </div>
        )}

        {/* the payoff */}
        <div className="mt-2 grid gap-2 sm:grid-cols-2 transition-opacity duration-500" style={{ opacity: done ? 1 : 0 }}>
          <div className="rounded-lg p-3" style={{ border: "1px solid color-mix(in oklab, var(--drift) 30%, transparent)", background: "color-mix(in oklab, var(--drift) 8%, transparent)" }}>
            <div className="text-[11px] font-semibold" style={{ color: "var(--drift)" }}>Without Trace</div>
            <div className="mt-0.5 text-[12px] text-dim">The mistake reaches production.</div>
          </div>
          <div className="rounded-lg p-3" style={{ border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)", background: "var(--accent-soft)" }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-ink"><IconShield className="h-3.5 w-3.5" /> With Trace</div>
            <div className="mt-0.5 text-[12px] text-dim">The organization remembers, before merge.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
