"use client";

import { BrandLogo } from "@/components/BrandIcon";
import { TraceMark } from "@/components/TraceMark";
import { IconShield, IconApi, IconClock, IconBolt, IconDrift, IconUsers } from "@/components/Icons";

// The "every coding agent consults the brain before it writes code" workflow, as a
// light, always-looping pipeline: real agent logos → GET /api/brain/context → the
// six things it returns → code that respects your history. Pure CSS motion (a packet
// of light travels each connector; the brain node breathes; returns light in sequence),
// so it's cheap and honours prefers-reduced-motion.

const AGENTS = [
  { slug: "claude", name: "Claude" },
  { slug: "cursor", name: "Cursor" },
  { slug: "copilot", name: "Copilot" },
  { slug: "windsurf", name: "Windsurf" },
  { slug: "aider", name: "Aider" },
];

const RETURNS = [
  { Icon: IconShield, t: "Architecture constraints" },
  { Icon: IconApi, t: "Coding conventions" },
  { Icon: IconClock, t: "Past incidents" },
  { Icon: IconBolt, t: "Known bugs" },
  { Icon: IconDrift, t: "Rejected approaches" },
  { Icon: IconUsers, t: "Current owners" },
];

/** A vertical connector with a packet of light travelling down it, forever. */
function Pipe() {
  return (
    <div className="relative flex h-8 w-full justify-center" aria-hidden>
      <span className="absolute inset-y-0 w-px" style={{ background: "linear-gradient(to bottom, var(--line-strong), color-mix(in oklab, var(--accent) 45%, transparent))" }} />
      <span
        className="trace-travel absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
        style={{ background: "var(--accent)", boxShadow: "0 0 8px 1px color-mix(in oklab, var(--accent) 60%, transparent)", ["--travel" as string]: "30px" }}
      />
    </div>
  );
}

export default function AgenticFlow() {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl p-6 sm:p-8" style={{ border: "1px solid var(--line)", background: "linear-gradient(to bottom, var(--surface), var(--surface-2))", boxShadow: "var(--shadow-md)" }}>
      <div className="flex flex-col items-center">
        {/* Stage 1, the agents */}
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">AI coding agents</div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {AGENTS.map(({ slug, name }, i) => (
            <span
              key={name}
              className="trace-breathe flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-ink"
              style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)", animationDelay: `${i * 0.28}s` }}
            >
              <BrandLogo slug={slug} className="h-4 w-4" /> {name}
            </span>
          ))}
        </div>

        <Pipe />

        {/* Stage 2, the request */}
        <div className="trace-glow flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[13px] font-semibold" style={{ background: "var(--ink)", color: "var(--surface)" }}>
          <IconApi className="h-4 w-4" /> GET /api/brain/context
        </div>

        <Pipe />

        {/* Stage 3, what the brain returns */}
        <div className="w-full">
          <div className="mb-2.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            <span className="grid h-4 w-4 place-items-center rounded" style={{ background: "var(--accent-soft)" }}><TraceMark className="h-3 w-3" /></span>
            The company brain returns
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RETURNS.map(({ Icon, t }, i) => (
              <div
                key={t}
                className="trace-breathe flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-dim"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", animationDelay: `${i * 0.22}s` }}
              >
                <Icon className="h-4 w-4 shrink-0 text-accent" /> {t}
              </div>
            ))}
          </div>
        </div>

        <Pipe />

        {/* Stage 4, the payoff */}
        <div className="trace-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-accent-ink" style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}>
          <IconShield className="h-4 w-4" /> Generate code that respects your history
        </div>
      </div>
    </div>
  );
}
