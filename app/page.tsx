"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Dashboard from "@/components/Dashboard";
import { TraceMark } from "@/components/TraceMark";
import { GitHubLogo, DiscordLogo, SlackLogo, TeamsLogo, LinearLogo, NotionLogo, DriveLogo, CogneeLogo } from "@/components/Logos";
import { IllusObserve, IllusMemory } from "@/components/Illustrations";

/* ── scroll-reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity .6s ease ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── live stats (proves it's a real running product) ───────────────────── */
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
    return () => {
      live = false;
    };
  }, []);
  return s;
}

const INTEGRATIONS = [
  { name: "Discord", Logo: DiscordLogo, live: true },
  { name: "Slack", Logo: SlackLogo },
  { name: "MS Teams", Logo: TeamsLogo },
  { name: "GitHub", Logo: GitHubLogo, live: true },
  { name: "Linear", Logo: LinearLogo },
  { name: "Notion", Logo: NotionLogo },
  { name: "Drive", Logo: DriveLogo },
];

export default function Landing() {
  const stats = useLiveStats();

  return (
    <main style={{ background: "var(--canvas)" }}>
      {/* Sticky top nav */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 sm:px-8"
        style={{ borderBottom: "1px solid var(--line)", background: "color-mix(in oklab, var(--surface) 82%, transparent)", backdropFilter: "blur(10px)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[11px]" style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)", boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--accent) 24%, transparent)" }}>
            <TraceMark className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Trace</span>
        </div>
        <div className="hidden items-center gap-7 text-[13px] text-dim md:flex">
          <a href="#problem" className="hover:text-ink">The problem</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#integrations" className="hover:text-ink">Integrations</a>
          <a href="#live" className="hover:text-ink">Live demo</a>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="#live" className="btn hidden sm:inline-flex">See it live</a>
          <Link href="/app" className="btn-primary">Open app</Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% -8%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%), radial-gradient(40% 40% at 85% 10%, color-mix(in oklab, #8b5cf6 12%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
          <Reveal>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.5 0.13 155)" }} />
              <span className="text-dim">AI agent · powered by</span>
              <CogneeLogo className="h-3.5 w-3.5" />
              <span className="font-semibold text-ink">Cognee</span>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Catch what your team
              <br />
              <span style={{ background: "linear-gradient(90deg, var(--accent), #8b5cf6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                forgot it decided.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-balance mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-dim">
              Trace is an AI agent that watches your team&apos;s chat, PRs and docs — and speaks up the moment a decision
              contradicts one you already made, two teams build the same thing, or knowledge is about to walk out the door.
              You don&apos;t ask. It notices.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-8 flex items-center justify-center gap-3">
              <a href="#live" className="btn-primary px-5 py-2.5 text-sm">See it live ↓</a>
              <Link href="/app" className="btn px-5 py-2.5 text-sm">Open the app</Link>
            </div>
          </Reveal>

          {/* live stat row */}
          <Reveal delay={260}>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-3">
              <StatTile value={stats ? String(stats.nodes) : "—"} label="Decisions in memory" />
              <StatTile value={stats ? String(stats.findings) : "—"} label="Findings surfaced" accent />
              <StatTile value={stats ? String(stats.catches) : "—"} label="Caught on GitHub" />
            </div>
            <p className="mt-3 text-[11px] text-faint">Live numbers from the running instance below — not a mockup.</p>
          </Reveal>
        </div>
      </header>

      {/* Problem / user stories */}
      <section id="problem" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">It happens every week</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">Decisions get made in chat — and then quietly forgotten.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { q: "“Wait… didn’t we already decide this?”", d: "A PR ships something the team explicitly ruled out last quarter. Nobody remembered the thread.", tag: "Decision drift", color: "var(--drift)" },
            { q: "“Two teams built the same service.”", d: "Payments and Platform each shipped a retry queue. Different channels, neither knew.", tag: "Duplicate work", color: "var(--duplicate)" },
            { q: "“Priya left — who owned auth?”", d: "Nine auth decisions and forty docs lived in one person’s head. Now they’re orphaned.", tag: "Ownership gap", color: "var(--ownership)" },
          ].map((s, i) => (
            <Reveal key={s.tag} delay={i * 80}>
              <div className="brief-card h-full p-6" style={{ ["--accent-card" as string]: s.color }}>
                <p className="text-[17px] font-medium leading-snug text-ink">{s.q}</p>
                <p className="mt-3 text-sm leading-relaxed text-dim">{s.d}</p>
                <span className="brief-tag mt-4">{s.tag}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — agentic loop */}
      <section id="how" className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="flex items-center justify-between gap-8">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">A different interaction model</p>
                <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">You don&apos;t prompt an agent. This one watches, and interrupts only when it matters.</h2>
              </div>
              <IllusObserve className="hidden h-32 w-auto shrink-0 lg:block" />
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Observe", d: "Every message, PR and doc flows into a Cognee temporal memory graph — continuously, no one has to ask." },
              { n: "02", t: "Discover", d: "Trace re-reasons over the whole graph: what contradicts, what’s duplicated, what only one person knows." },
              { n: "03", t: "Interrupt", d: "It speaks up in-thread and on the PR — cited, dated, with an owner — only when confident. Silence otherwise." },
              { n: "04", t: "Learn", d: "You confirm or dismiss each catch. That grade writes back to memory, so precision compounds over time." },
            ].map((step, i) => (
              <Reveal key={step.t} delay={i * 70}>
                <div className="card h-full p-5">
                  <div className="text-[12px] font-semibold tabular-nums text-accent">{step.n}</div>
                  <div className="mt-1 text-base font-semibold text-ink">{step.t}</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-dim">{step.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-center text-sm">
              <span className="rounded-full px-3 py-1 text-dim" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                ChatGPT: <span className="text-ink">you ask → it answers</span>
              </span>
              <span className="text-faint">vs</span>
              <span className="rounded-full px-3 py-1" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}>
                Trace: <span className="font-semibold">it notices → it tells you</span>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex items-center justify-between gap-8">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">What the agent catches</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">Four things only a long-lived memory graph can see.</h2>
            </div>
            <IllusMemory className="hidden h-32 w-auto shrink-0 lg:block" />
          </div>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { t: "Decision drift", color: "var(--drift)", ex: "“This PR moves billing to MongoDB — but Q1 standardized on Postgres.”", d: "A later decision reverses an earlier one. The single hardest thing to catch without dated memory — and the most expensive to miss." },
            { t: "Duplicate work", color: "var(--duplicate)", ex: "“Payments and Platform are both building a retry queue.”", d: "Two teams solving the same problem, unaware. Trace matches across channels and repos." },
            { t: "Ownership gaps", color: "var(--ownership)", ex: "“Auth is solely owned by Priya — who’s on leave next month.”", d: "Bus-factor risk, computed from the graph. Know it before the person leaves, not after." },
            { t: "Cross-source drift", color: "var(--accent)", ex: "A GitHub PR that reverses a decision made in Discord.", d: "Memory spans tools. Trace comments on the PR, citing the chat message it contradicts." },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 70}>
              <div className="brief-card h-full p-6" style={{ ["--accent-card" as string]: c.color }}>
                <div className="flex items-center gap-2">
                  <span className="brief-tag">{c.t}</span>
                </div>
                <p className="mt-4 text-[15px] font-medium italic leading-snug text-ink">{c.ex}</p>
                <p className="mt-3 text-sm leading-relaxed text-dim">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">Connects to where work happens</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Plug in your tools. Trace builds the memory automatically.</h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-7">
              {INTEGRATIONS.map(({ name, Logo, live }) => (
                <div key={name} className="card relative flex flex-col items-center gap-2 p-4">
                  {live && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.5 0.13 155)" }} title="Live" />}
                  <Logo className="h-7 w-7" />
                  <span className="text-[11px] text-dim">{name}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px]" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <CogneeLogo className="h-4 w-4" />
              <span className="text-dim">Memory powered by</span>
              <span className="font-semibold text-ink">Cognee</span>
              <span className="text-faint">· temporal graph · Cloud + self-hosted</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Live embedded app */}
      <section id="live" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">Not a screenshot</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">This is the product, running right here.</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-dim">
              Scroll into the briefing, watch the graph, ask it a question, project who&apos;s a bus-factor risk. It&apos;s fully usable.
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div
            className="mx-auto mt-10 overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--line-strong)", boxShadow: "var(--shadow-md)", background: "var(--surface)" }}
          >
            {/* browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
              </span>
              <span className="mx-auto flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] text-faint" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <TraceMark className="h-3 w-3" /> trace.app
              </span>
              <Link href="/app" className="text-[11px] font-medium text-accent hover:underline">Full screen →</Link>
            </div>
            {/* the real app */}
            <div className="h-[86vh] min-h-[620px]">
              <Dashboard />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="flex items-center gap-2.5">
            <TraceMark className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight text-ink">Trace</span>
          </div>
          <p className="max-w-md text-sm text-dim">Catch what your team forgot it decided. The organizational memory that speaks up before you repeat yourself.</p>
          <Link href="/app" className="btn-primary mt-2">Open the app</Link>
          <p className="mt-4 text-[11px] text-faint">Runs on Cognee Cloud and self-hosted · built for the Cognee × WeMakeDevs hackathon</p>
        </div>
      </footer>
    </main>
  );
}

function StatTile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums" style={{ color: accent ? "var(--accent)" : "var(--ink)" }}>
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-tight text-faint">{label}</div>
    </div>
  );
}
