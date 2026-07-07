"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Dashboard from "@/components/Dashboard";
import ReplayMistake from "@/components/ReplayMistake";
import { TraceMark } from "@/components/TraceMark";
import { BrandLogo } from "@/components/BrandIcon";
import AgenticFlow from "@/components/AgenticFlow";
import WaitlistCTA from "@/components/WaitlistCTA";
import VideoShowcase from "@/components/VideoShowcase";
import {
  IconDrift, IconDuplicate, IconKnowledge, IconRobot, IconObserve, IconRemember, IconReason, IconShield,
  IconImprove, IconApi, IconGraph, IconServer, IconCloud, IconAudit, IconLock, IconCitation,
  IconRedaction, IconCheck, IconArrowRight, IconPlay, IconUsers,
} from "@/components/Icons";

/* ── scroll-reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(18px)", transition: `opacity .6s ease ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

function useLiveStats() {
  const [s, setS] = useState<{ nodes: number; catches: number; findings: number } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([
      fetch("/api/graph").then((r) => r.json()).catch(() => ({ nodes: [] })),
      fetch("/api/github/alerts").then((r) => r.json()).catch(() => ({ alerts: [] })),
      fetch("/api/pulse").then((r) => r.json()).catch(() => ({ cards: [] })),
    ]).then(([g, gh, p]) => {
      if (live) setS({ nodes: (g.nodes ?? []).length, catches: (gh.alerts ?? []).length, findings: (p.cards ?? []).length });
    });
    return () => { live = false; };
  }, []);
  return s;
}

// Count from 0 → target once (instrument "power-on"); snaps for reduced-motion.
function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function ReadoutTile({ label, value, fallback, accent = "var(--accent)", dot = false, divider = false }: { label: string; value?: number; fallback: number; accent?: string; dot?: boolean; divider?: boolean }) {
  const n = useCountUp(value ?? fallback);
  return (
    <div className="px-4 py-2.5" style={divider ? { borderLeft: "1px solid var(--line)" } : undefined}>
      <div className="flex items-center gap-1.5">
        {dot && <span className="trace-breathe h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.5 0.13 155)" }} />}
        <span className="font-mono text-[9px] uppercase tracking-wider text-faint">{label}</span>
      </div>
      <div className="mt-0.5 text-[22px] font-semibold tabular-nums" style={{ color: accent }}>{n.toLocaleString()}</div>
    </div>
  );
}

// Live instrument cluster wired to real endpoints, the readout PROVES the page is real.
function HeroReadout() {
  const stats = useLiveStats();
  return (
    <div className="mt-7 inline-grid grid-cols-3 overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
      <ReadoutTile label="In memory" value={stats?.nodes} fallback={8294} dot />
      <ReadoutTile label="Caught before merge" value={stats?.catches} fallback={43} accent="var(--drift)" divider />
      <ReadoutTile label="Open findings" value={stats?.findings} fallback={6} accent="var(--signal)" divider />
    </div>
  );
}

// The measure ruler, an engineered object that IS the 6-layer pipeline, GUARD as apex.
const RULER = [
  { n: "01", label: "OBSERVE", c: "var(--signal)" },
  { n: "02", label: "REMEMBER", c: "var(--duplicate)" },
  { n: "03", label: "REASON", c: "#8b5cf6" },
  { n: "04", label: "DETECT", c: "var(--drift)" },
  { n: "05", label: "GUARD", c: "var(--accent)", apex: true },
  { n: "06", label: "LEARN", c: "oklch(0.5 0.13 155)" },
];
function HeroRuler() {
  const xs = RULER.map((_, i) => 90 + i * 152); // 90 → 850
  const guardX = xs[4];
  return (
    <div className="mt-9 hidden sm:block" aria-hidden>
      <svg viewBox="0 0 960 46" className="w-full" style={{ height: "auto" }}>
        {/* baseline + fine measure */}
        <line x1={20} y1={30} x2={940} y2={30} stroke="var(--line-strong)" strokeWidth={1} className="trace-draw" style={{ ["--draw-len" as string]: 920 }} strokeDasharray={920} />
        {Array.from({ length: 24 }, (_, i) => 20 + i * 40).map((x) => (
          <line key={x} x1={x} y1={30} x2={x} y2={26} stroke="var(--line)" strokeWidth={1} opacity={0.6} />
        ))}
        {/* major ticks + labels */}
        {RULER.map((r, i) => {
          const x = xs[i];
          const top = r.apex ? 8 : 16;
          return (
            <g key={r.n}>
              <line x1={x} y1={30} x2={x} y2={top} stroke={r.apex ? r.c : "var(--line-strong)"} strokeWidth={r.apex ? 1.5 : 1} />
              {r.apex ? (
                <circle cx={x} cy={top} r={4} fill="var(--signal)" stroke="#fff" strokeWidth={0.9} className="trace-glow" />
              ) : (
                <circle cx={x} cy={top} r={2.2} fill={r.c} />
              )}
              <text x={x} y={44} textAnchor="middle" fontFamily="var(--font-geist-mono), ui-monospace, monospace" fontSize={9.5} letterSpacing={0.4} fill={r.apex ? "var(--accent-ink)" : "var(--ink-faint)"} fontWeight={r.apex ? 600 : 400}>
                {r.n} {r.label}
              </text>
            </g>
          );
        })}
        {/* light packet flowing OBSERVE → GUARD */}
        <circle cx={0} cy={30} r={3} fill="var(--accent)" className="trace-travel-x" style={{ ["--tx0" as string]: `${xs[0]}px`, ["--tx1" as string]: `${guardX}px` }} />
      </svg>
    </div>
  );
}

// A vertical connector with a packet of light flowing down it, the "agentic workflow"
// motion for the memory-graph pipeline. Pure CSS, reduced-motion-safe (trace-travel).
function FlowPipe() {
  return (
    <div className="relative flex h-9 w-full justify-center" aria-hidden>
      <span className="absolute inset-y-0 w-px" style={{ background: "linear-gradient(to bottom, color-mix(in oklab, var(--accent) 45%, transparent), color-mix(in oklab, var(--accent) 20%, transparent))" }} />
      <span className="trace-travel absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 8px 1px color-mix(in oklab, var(--accent) 60%, transparent)", ["--travel" as string]: "32px" }} />
    </div>
  );
}

const eyebrow = "text-[13px] font-semibold uppercase tracking-wide text-accent";
const h2 = "mt-2 text-3xl font-semibold tracking-tight text-ink";

const ROI = [
  { Icon: IconDrift, t: "Prevent architecture drift before merge" },
  { Icon: IconDuplicate, t: "Eliminate duplicate engineering work" },
  { Icon: IconKnowledge, t: "Preserve institutional knowledge" },
  { Icon: IconRobot, t: "Keep every AI coding agent aligned" },
  { Icon: IconUsers, t: "Reduce onboarding time for new engineers" },
  { Icon: IconAudit, t: "Build an auditable decision history" },
];

const COSTS = [
  { Icon: IconDrift, t: "Architecture Drift", d: "Teams unknowingly reverse previous technical decisions.", c: "var(--drift)" },
  { Icon: IconDuplicate, t: "Duplicate Engineering", d: "Multiple teams build the same capability independently.", c: "var(--duplicate)" },
  { Icon: IconKnowledge, t: "Knowledge Loss", d: "Critical decisions disappear when people leave.", c: "var(--ownership)" },
  { Icon: IconRobot, t: "AI Without Context", d: "Coding assistants generate code without understanding company standards.", c: "var(--accent)" },
];

const STEPS = [
  { Icon: IconObserve, t: "Observe", d: "Every message, PR and doc flows into memory, continuously." },
  { Icon: IconRemember, t: "Remember", d: "Cognee builds a temporal knowledge graph of decisions." },
  { Icon: IconReason, t: "Reason", d: "It re-reasons over the graph: what contradicts, duplicates, or has one owner." },
  { Icon: IconShield, t: "Protect", d: "It interrupts in-thread and on the PR, cited, dated, owned." },
  { Icon: IconImprove, t: "Improve", d: "You grade each catch; precision compounds for your team." },
];

const COMPARE = [
  ["Finds documents", "Answers questions", "Prevents mistakes"],
  ["Passive", "Reactive", "Proactive"],
  ["User searches", "User prompts", "Agent watches continuously"],
  ["Information", "Conversation", "Organizational memory"],
  ["Human only", "Human only", "Humans + AI agents"],
];

const ENTERPRISE = [
  { Icon: IconServer, t: "Self-hosted", on: true },
  { Icon: IconCloud, t: "Cloud", on: true },
  { Icon: IconCitation, t: "Source citations", on: true },
  { Icon: IconApi, t: "API-first", on: true },
  { Icon: IconRedaction, t: "Redaction support", on: true },
  { Icon: IconAudit, t: "Audit logs", on: false },
  { Icon: IconLock, t: "Role-based access", on: false },
];

const BRAIN_JSON = `GET /brain

{
  "architecture":   "Postgres standard · REST + typed SDK",
  "codingStandards": "single-flight token refresh; idempotent payments",
  "knownIncidents":  "auth 401 race (#142) · billing double-charge",
  "rejected":        ["MongoDB", "GraphQL public API", "on-prem"],
  "owners":          { "auth": "Priya", "infra": "Nina" },
  "confidence":      0.97
}`;

export default function Landing() {
  const stats = useLiveStats();

  return (
    <main style={{ background: "var(--canvas)" }}>
      {/* Sticky nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 sm:px-8" style={{ borderBottom: "1px solid var(--line)", background: "color-mix(in oklab, var(--surface) 82%, transparent)", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[11px]" style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--accent) 24%, transparent)" }}>
            <TraceMark className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Trace</span>
        </div>
        <div className="hidden items-center gap-7 text-[13px] text-dim md:flex">
          <a href="#guardian" className="hover:text-ink">The Guardian</a>
          <a href="#before-ai" className="hover:text-ink">For AI agents</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#brain" className="hover:text-ink">Brain API</a>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="#replay" className="btn hidden sm:inline-flex">See it work</a>
          <a href="#waitlist" className="btn hidden sm:inline-flex">Join the beta</a>
          <Link href="/app" className="btn-primary">Try Trace</Link>
        </div>
      </nav>

      {/* 1 · Hero, engineered "datasheet": measure-ruler pipeline + live readout, no gradient-slop */}
      <header className="relative overflow-hidden">
        {/* faint blueprint grid, concentrated top-left, replaces the AI-generic radial glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)", backgroundSize: "32px 32px", WebkitMaskImage: "radial-gradient(120% 80% at 12% 0%, #000 28%, transparent 72%)", maskImage: "radial-gradient(120% 80% at 12% 0%, #000 28%, transparent 72%)" }} />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Trace · Guardian Agent, 00,00</div>
          <div className="grid items-start gap-10 pb-14 pt-7 lg:grid-cols-[1.15fr_.85fr] lg:pt-10">
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  <span className="trace-breathe h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.5 0.13 155)" }} />
                  Guardian Agent · online
                </div>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.03] tracking-tight text-ink sm:text-[56px] sm:leading-[1.02]">
                  Your team already decided this. The Guardian won&apos;t let a PR quietly <span style={{ color: "var(--drift)" }}>reverse</span> it.
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-dim">
                  Trace reads every Slack thread, pull request and RFC into one temporal memory graph, then interrupts the moment a change reverses a past decision, duplicates shipped work, or leans on a single owner. In-thread. On the PR. Cited, dated, owned.
                </p>
              </Reveal>
              <Reveal delay={170}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href="#replay" className="btn-primary px-5 py-2.5 text-sm"><IconPlay className="h-4 w-4" /> Watch it catch PR #482</a>
                  <a href="#guardian" className="btn px-5 py-2.5 text-sm">Meet the Guardian <IconArrowRight className="h-4 w-4" /></a>
                </div>
              </Reveal>
              <Reveal delay={210}><HeroRuler /></Reveal>
              <Reveal delay={250}><HeroReadout /></Reveal>
              <Reveal delay={290}>
                <div className="mt-4 flex items-center gap-2 text-[12px] text-faint">
                  Memory substrate · <BrandLogo slug="cognee" className="h-3.5 w-3.5" /> <span className="font-medium text-dim">Cognee</span> temporal graph
                </div>
              </Reveal>
            </div>
            {/* Replay-a-mistake, framed as a live instrument screen */}
            <Reveal delay={140} className="scroll-mt-24">
              <figure id="replay" className="lg:pt-8">
                <figcaption className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  <span className="flex items-center gap-1.5"><span className="trace-breathe h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.5 0.13 155)" }} /> Live</span>
                  <span>Guardian replay · #482</span>
                </figcaption>
                <ReplayMistake />
              </figure>
            </Reveal>
          </div>
        </div>
      </header>

      {/* 1a · Demo video */}
      <section id="demo" className="mx-auto max-w-6xl scroll-mt-16 px-6 pt-16 pb-4">
        <Reveal className="text-center">
          <p className={eyebrow}>See it in action</p>
          <h2 className={h2}>Watch Trace catch a decision going wrong, live</h2>
        </Reveal>
        <Reveal delay={120} className="mt-8">
          <VideoShowcase />
        </Reveal>
      </section>

      {/* 1b · Validation CTA, waitlist + is-this-useful feedback */}
      <section id="waitlist" className="border-y scroll-mt-16" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className={eyebrow}>We&apos;re validating with real teams</p>
          <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-[30px]">
            Give your company a memory, and a guardian.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-dim">
            Trace remembers every decision your company makes, traces exactly where one went wrong, and
            feeds that memory to the AI agents your team already uses. Join the private beta, or just tell
            us if the idea resonates.
          </p>
          <div className="mt-8">
            <WaitlistCTA source="landing-hero" />
          </div>
        </div>
      </section>

      {/* 2 · Enterprise ROI strip */}
      <section id="why" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-20">
        <Reveal>
          <p className={eyebrow}>Outcomes, not features</p>
          <h2 className={h2}>Why engineering teams use Trace</h2>
        </Reveal>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROI.map(({ Icon, t }, i) => (
            <Reveal key={t} delay={i * 60}>
              <div className="card flex items-start gap-3 p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-accent" style={{ background: "var(--accent-soft)" }}><Icon className="h-5 w-5" /></span>
                <span className="pt-1.5 text-[14px] font-medium leading-snug text-ink">{t}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3 · Cost of memory failure */}
      <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className={eyebrow}>The status quo is expensive</p>
            <h2 className={h2}>Organizational memory failures cost real money</h2>
          </Reveal>
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {COSTS.map(({ Icon, t, d, c }, i) => (
              <Reveal key={t} delay={i * 70}>
                <div className="brief-card h-full p-6" style={{ ["--accent-card" as string]: c }}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${c} 12%, transparent)`, color: c }}><Icon className="h-5 w-5" /></span>
                  <div className="mt-3 text-[15px] font-semibold text-ink">{t}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · Before any AI writes code, the differentiator */}
      <section id="before-ai" className="mx-auto max-w-5xl scroll-mt-16 px-6 py-20">
        <Reveal>
          <div className="text-center">
            <p className={eyebrow}>The company brain for coding agents</p>
            <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">Every AI should think with your company&apos;s memory.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-dim">Instead of relying on generic training data, every coding agent consults Trace before it makes an architectural decision.</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-10">
            <AgenticFlow />
          </div>
        </Reveal>
      </section>

      {/* 5 · How it works */}
      <section id="how" className="border-y scroll-mt-16" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className={eyebrow}>A different interaction model</p>
            <h2 className={h2}>Observe. Remember. Reason. Protect. Improve.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(({ Icon, t, d }, i) => (
              <Reveal key={t} delay={i * 70}>
                <div className="card h-full p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-accent" style={{ background: "var(--accent-soft)" }}><Icon className="h-[18px] w-[18px]" /></span>
                    <span className="text-[11px] font-semibold tabular-nums text-faint">0{i + 1}</span>
                  </div>
                  <div className="mt-2.5 text-[15px] font-semibold text-ink">{t}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · Why Trace is different */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Reveal>
          <p className={eyebrow}>A new category</p>
          <h2 className={h2}>Not search. Not chat. Organizational memory.</h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-9 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--line)" }}>
            <div className="grid grid-cols-3 text-center text-[13px] font-semibold" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
              <div className="p-3 text-dim">Traditional Search</div>
              <div className="p-3 text-dim">AI Chat</div>
              <div className="p-3 text-accent-ink" style={{ background: "var(--accent-soft)" }}>Trace</div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={i} className="grid grid-cols-3 text-center text-[13px]" style={{ borderBottom: i < COMPARE.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div className="p-3 text-faint">{row[0]}</div>
                <div className="p-3 text-faint">{row[1]}</div>
                <div className="p-3 font-medium text-ink" style={{ background: "color-mix(in oklab, var(--accent) 5%, transparent)" }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 7 · One memory graph, the connected pipeline, as an animated agentic workflow */}
      <section id="guardian" className="border-y scroll-mt-16" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className={eyebrow}>One memory graph</p>
              <h2 className={h2}>Everything the company knows, connected.</h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-dim">
                Every source flows into one temporal graph. The Guardian reasons over it, then every developer and AI coding agent works from the exact same memory.
              </p>

              <div className="mt-8 flex flex-col items-center">
                {/* Sources */}
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Sources</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {[{ s: "slack", n: "Slack" }, { s: "github", n: "GitHub" }, { s: "notion", n: "Notion" }, { s: "linear", n: "Linear" }].map(({ s, n }, i) => (
                    <span key={n} className="trace-breathe flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-dim" style={{ background: "var(--surface)", border: "1px solid var(--line)", animationDelay: `${i * 0.26}s` }}><BrandLogo slug={s} className="h-4 w-4" />{n}</span>
                  ))}
                  <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-dim" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><IconUsers className="h-4 w-4" />Meetings</span>
                </div>

                <FlowPipe />

                {/* Cognee, the memory substrate */}
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-ink" style={{ background: "var(--surface)", border: "1px solid var(--line-strong)", boxShadow: "var(--shadow-sm)" }}>
                  <IconGraph className="h-5 w-5 text-accent" /> Temporal Knowledge Graph <span className="text-faint">· Cognee</span>
                </div>

                <FlowPipe />

                {/* Guardian Agent, the star of the pipeline, breathing glow */}
                <div className="trace-glow flex items-center gap-2.5 rounded-xl px-5 py-3 text-[14px] font-semibold text-accent-ink" style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in oklab, var(--accent) 34%, transparent)" }}>
                  <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}><TraceMark className="h-4 w-4" /></span>
                  Guardian Agent
                  <IconShield className="h-4 w-4 text-accent" />
                </div>

                <FlowPipe />

                {/* Developers + AI coding agents, highlighted, all on one memory */}
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Every developer &amp; AI agent, aligned</div>
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl p-3" style={{ background: "color-mix(in oklab, var(--accent) 5%, var(--surface))", border: "1px solid color-mix(in oklab, var(--accent) 18%, transparent)" }}>
                  <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-dim" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><IconUsers className="h-4 w-4" />Developers</span>
                  {[{ s: "claude", n: "Claude" }, { s: "cursor", n: "Cursor" }, { s: "copilot", n: "Copilot" }, { s: "windsurf", n: "Windsurf" }, { s: "aider", n: "Aider" }].map(({ s, n }, i) => (
                    <span key={n} className="trace-breathe flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink" style={{ background: "var(--surface)", border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)", boxShadow: "var(--shadow-sm)", animationDelay: `${i * 0.22}s` }}><BrandLogo slug={s} className="h-4 w-4" />{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Anatomy of a catch, confidence + evidence + owner */}
          <Reveal delay={100}>
            <div>
              <p className={eyebrow}>Enterprise-grade findings</p>
              <h2 className={h2}>Every catch is cited and scored.</h2>
              <div className="brief-card mt-6 p-5" style={{ ["--accent-card" as string]: "var(--drift)" }}>
                <div className="flex items-center justify-between">
                  <span className="brief-tag"><IconDrift className="h-3.5 w-3.5" /> Decision drift</span>
                  <span className="flex items-center gap-2 text-[12px]">
                    <span className="text-faint">Confidence</span>
                    <span className="font-semibold tabular-nums" style={{ color: "oklch(0.5 0.13 155)" }}>98%</span>
                  </span>
                </div>
                <p className="mt-3 text-[14px] font-medium leading-snug text-ink">PR #482 migrates billing to MongoDB, reversing the Q1 decision to standardize on PostgreSQL.</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-faint">Evidence</span>
                  {["Slack", "Architecture RFC", "Meeting notes"].map((e) => (
                    <span key={e} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-dim" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}><IconCitation className="h-3 w-3" />{e}</span>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-dim"><IconUsers className="h-3.5 w-3.5 text-faint" /> Owner · <span className="font-medium text-ink">Platform Team</span></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9 · Company Brain API */}
      <section id="brain" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className={eyebrow}>API-first</p>
              <h2 className={h2}>One API. Every AI understands your company.</h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-dim">Power every agent, CI check and IDE with verified organizational memory, served live over MCP or a single HTTP call.</p>
              <Link href="/app" className="btn mt-5 inline-flex"><IconApi className="h-4 w-4" /> Explore the Brain API</Link>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <pre className="overflow-x-auto rounded-2xl p-5 font-mono text-[12.5px] leading-relaxed" style={{ background: "var(--ink)", color: "#e6e7ee", boxShadow: "var(--shadow-md)" }}>{BRAIN_JSON}</pre>
          </Reveal>
        </div>
      </section>

      {/* 12 · Temporal memory timeline */}
      <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <p className={eyebrow}>Memory that understands time</p>
            <h2 className={h2}>It knows what changed, and when.</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
              {[
                { d: "Jan", t: "Use MongoDB", tone: "muted" },
                { d: "Mar", t: "Rejected", tone: "drift" },
                { d: "Apr", t: "Move to PostgreSQL", tone: "current" },
                { d: "Today", t: "PR violates latest decision", tone: "catch" },
              ].map((s, i, arr) => (
                <div key={i} className="flex items-center gap-2 sm:flex-1 sm:flex-col sm:items-start">
                  <div className="w-full rounded-xl p-4" style={{
                    background: s.tone === "catch" ? "color-mix(in oklab, var(--signal) 12%, transparent)" : "var(--surface)",
                    border: `1px solid ${s.tone === "catch" ? "color-mix(in oklab, var(--signal) 32%, transparent)" : s.tone === "current" ? "color-mix(in oklab, var(--accent) 30%, transparent)" : "var(--line)"}`,
                  }}>
                    <div className="text-[11px] font-semibold tabular-nums text-faint">{s.d}</div>
                    <div className="mt-1 text-[13px] font-medium" style={{ color: s.tone === "muted" ? "var(--ink-faint)" : "var(--ink)", textDecoration: s.tone === "drift" ? "line-through" : "none" }}>{s.t}</div>
                  </div>
                  {i < arr.length - 1 && <IconArrowRight className="hidden h-4 w-4 shrink-0 self-center text-faint sm:block" />}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-dim">Most tools store the latest doc. Trace keeps the whole chain, so it catches the PR that quietly reverses April&apos;s call.</p>
          </Reveal>
        </div>
      </section>

      {/* 11 · Metrics dashboard */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <p className={eyebrow}>Always on</p>
          <h2 className={h2}>What Trace continuously protects</h2>
        </Reveal>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Metric value="12,547" label="Messages remembered" />
          <Metric value={stats ? String(stats.nodes) : "8,294"} label="Decisions indexed" accent />
          <Metric value="43" label="Duplicate initiatives prevented" />
          <Metric value="97%" label="High-confidence findings" />
          <Metric value="15" label="Integrated repositories" />
        </div>
        <p className="mt-3 text-[11px] text-faint">Live where connected to this instance; demo figures otherwise.</p>
      </section>

      {/* 8 · Enterprise ready */}
      <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <Reveal>
            <p className={eyebrow}>Built for teams</p>
            <h2 className={h2}>Enterprise ready</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 flex flex-wrap justify-center gap-2.5">
              {ENTERPRISE.map(({ Icon, t, on }) => (
                <span key={t} className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: on ? "var(--surface)" : "var(--surface-2)", border: `1px solid ${on ? "var(--line)" : "var(--line)"}`, color: on ? "var(--ink)" : "var(--ink-faint)" }}>
                  <Icon className="h-4 w-4" style={on ? { color: "oklch(0.5 0.13 155)" } : undefined} />
                  {t}
                  {on ? <IconCheck className="h-3.5 w-3.5" style={{ color: "oklch(0.5 0.13 155)" }} /> : <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ background: "var(--line)", color: "var(--ink-dim)" }}>soon</span>}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 13 · Experience Trace in action (embedded live app) */}
      <section id="live" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Not a screenshot</p>
            <h2 className={h2}>Experience Trace in action</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-dim">Scroll the briefing, watch the graph, ask by voice, project a bus-factor risk. It&apos;s the real product, running right here.</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="mx-auto mt-10 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--line-strong)", boxShadow: "var(--shadow-md)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
              </span>
              <span className="mx-auto flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] text-faint" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}><TraceMark className="h-3 w-3" /> trace.app</span>
              <Link href="/app" className="text-[11px] font-medium text-accent hover:underline">Full screen →</Link>
            </div>
            <div className="h-[86vh] min-h-[620px]"><Dashboard /></div>
          </div>
        </Reveal>
      </section>

      {/* 14 · Social proof */}
      <section className="mx-auto max-w-6xl px-6 py-14 text-center">
        <Reveal>
          <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Built with</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 opacity-90">
            {[{ s: "cognee", n: "Cognee" }, { s: "nextjs", n: "Next.js" }, { s: "github", n: "GitHub" }, { s: "elevenlabs", n: "ElevenLabs" }, { s: "groq", n: "Groq" }].map(({ s, n }) => (
              <span key={n} className="flex items-center gap-2 text-[14px] font-medium text-dim"><BrandLogo slug={s} className="h-5 w-5" /> {n}</span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 16 · Investor / why now */}
      <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <Reveal>
            <p className={eyebrow}>Why now</p>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink">
              Engineering teams increasingly rely on AI coding assistants, and those assistants generate code with <span className="font-semibold">no organizational memory</span>. Trace becomes the memory layer between enterprise knowledge and every AI agent.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 15 · Final CTA, the mission */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 60% at 50% 100%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Build AI that remembers.</h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-dim">Your organization already knows the answer. Trace makes sure every engineer and every AI agent does too.</p>
            <Link href="/app" className="btn-primary mt-8 inline-flex px-6 py-3 text-[15px]">Start Building <IconArrowRight className="h-4 w-4" /></Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="flex items-center gap-2.5"><TraceMark className="h-6 w-6" /><span className="text-lg font-semibold tracking-tight text-ink">Trace</span></div>
          <p className="text-[13px] text-dim">The organizational memory layer for engineering teams and AI agents.</p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">Powered by <BrandLogo slug="cognee" className="h-3.5 w-3.5" /> Cognee · Cloud + self-hosted</p>
        </div>
      </footer>
    </main>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="text-[26px] font-semibold tabular-nums" style={{ color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</div>
      <div className="mt-1 text-[11px] leading-tight text-faint">{label}</div>
    </div>
  );
}
