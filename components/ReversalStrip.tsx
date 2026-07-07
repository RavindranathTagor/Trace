"use client";

// Reusable pieces of the timeline so the temporal view isn't trapped in one tab:
//  - CompanyTimelineStrip: a slim, always-visible horizontal history for the briefing.
//  - MiniReversal: a tiny before→after two-dot timeline for a single drift finding.

import { NIMBUS_DECISIONS, decisionTime, decisionExtent, reversalPairs, type Decision } from "@/data/decisions";

/** A compact one-row history of every decision, colored by status, with reversal
 *  arrows. Clicking opens the full Timeline. Great at the top of the briefing. */
export function CompanyTimelineStrip({ onOpen }: { onOpen?: () => void }) {
  const decisions = NIMBUS_DECISIONS;
  const [minT, maxT] = decisionExtent(decisions);
  const span = maxT - minT || 1;
  const W = 100; // percent-based positioning
  const xPct = (t: number) => 3 + ((t - minT) / span) * (W - 6);
  const pairs = reversalPairs(decisions);
  const reversals = pairs.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group card relative block w-full overflow-hidden p-3 text-left transition-shadow hover:shadow-md"
      title="Open the full decision timeline"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          Decision history · {decisions.length} decisions · {reversals} reversed
        </span>
        <span className="text-[11px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
          Open timeline →
        </span>
      </div>
      <div className="relative h-9">
        {/* baseline */}
        <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded" style={{ background: "var(--line)" }} />
        {/* reversal arcs */}
        {pairs.map((p, i) => {
          const a = xPct(decisionTime(p.from));
          const b = xPct(decisionTime(p.to));
          return (
            <span
              key={i}
              className="trace-flow absolute top-1/2 h-[2px] -translate-y-1/2 rounded"
              style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%`, background: "var(--signal)" }}
            />
          );
        })}
        {/* dots */}
        {decisions.map((d) => (
          <span
            key={d.id}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform group-hover:scale-110"
            style={{
              left: `${xPct(decisionTime(d))}%`,
              background: dotBg(d),
              border: d.status === "superseded" ? "1.5px solid var(--ink-faint)" : "none",
            }}
            title={`${d.title} · ${new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
          />
        ))}
      </div>
    </button>
  );
}

function dotBg(d: Decision): string {
  if (d.status === "superseded") return "var(--surface)";
  if (d.status === "at-risk") return "var(--signal)";
  return "var(--accent)";
}

/** A tiny before→after timeline for a single reversal, drop it in a drift card. */
export function MiniReversal({
  before,
  after,
}: {
  before: { label: string; when?: string };
  after: { label: string; when?: string };
}) {
  return (
    <div className="mt-2.5 rounded-lg p-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <div className="flex items-center gap-2">
        <TinyNode tone="old" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-dim" style={{ textDecoration: "line-through" }} title={before.label}>
            {before.label}
          </div>
          {before.when && <div className="text-[10px] text-faint">{before.when}</div>}
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--signal)" }}>
          ⟲ reverses
        </span>
        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-[11px] font-medium text-ink" title={after.label}>
            {after.label}
          </div>
          {after.when && <div className="text-[10px] text-faint">{after.when}</div>}
        </div>
        <TinyNode tone="new" />
      </div>
    </div>
  );
}

function TinyNode({ tone }: { tone: "old" | "new" }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        background: tone === "new" ? "var(--accent)" : "var(--surface)",
        border: tone === "new" ? "none" : "1.5px solid var(--ink-faint)",
      }}
    />
  );
}
