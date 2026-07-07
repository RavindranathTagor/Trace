"use client";

import { useMemo, useState } from "react";
import {
  NIMBUS_DECISIONS,
  LANES,
  laneColor,
  decisionExtent,
  decisionTime,
  reversalPairs,
  type Decision,
} from "@/data/decisions";
import { TraceBot } from "@/components/TraceBot";

// The Decision Timeline, a horizontal SWIMLANE view of a company's real decision
// history. Each row is a topic (Pricing, Database, …); each dot is a decision at
// its date; an amber flowing arrow is drawn wherever a later decision REVERSED an
// earlier one. Hover a dot to preview it below; click to pin it and jump into the
// graph. This is the one view only a temporal memory graph can produce, the proof
// that Trace reasons across time, not just similarity.

const LANE_LABEL_W = 116;
const PAD_L = 18;
const PAD_R = 54;
const AXIS_H = 30;
const LANE_H = 60;
const PLOT_W = 680;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthTicks(minT: number, maxT: number): Array<{ t: number; label: string }> {
  const ticks: Array<{ t: number; label: string }> = [];
  const d = new Date(minT);
  let y = d.getFullYear();
  let m = d.getMonth();
  let t = new Date(y, m, 1).getTime();
  let guard = 0;
  while (t <= maxT + 24 * 3600 * 1000 && guard++ < 36) {
    ticks.push({ t, label: new Date(t).toLocaleDateString("en-US", { month: "short" }) });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    t = new Date(y, m, 1).getTime();
  }
  return ticks;
}

export default function DecisionTimeline({ onShowInGraph }: { onShowInGraph?: (d: Decision) => void }) {
  const decisions = NIMBUS_DECISIONS;
  const [minT, maxT] = useMemo(() => decisionExtent(decisions), [decisions]);
  const ticks = useMemo(() => monthTicks(minT, maxT), [minT, maxT]);
  const pairs = useMemo(() => reversalPairs(decisions), [decisions]);
  const reversedBy = useMemo(() => {
    const m = new Map<string, Decision>();
    pairs.forEach((p) => m.set(p.from.id, p.to));
    return m;
  }, [pairs]);
  const chronoIndex = useMemo(() => {
    const order = [...decisions].sort((a, b) => decisionTime(a) - decisionTime(b));
    return new Map(order.map((d, i) => [d.id, i]));
  }, [decisions]);

  const [selected, setSelected] = useState<Decision | null>(null);
  const [hovered, setHovered] = useState<Decision | null>(null);
  const active = hovered ?? selected;

  const innerW = LANE_LABEL_W + PLOT_W;
  const plotInnerW = PLOT_W - PAD_L - PAD_R;
  const height = AXIS_H + LANES.length * LANE_H;
  const span = maxT - minT || 1;
  const x = (t: number) => LANE_LABEL_W + PAD_L + ((t - minT) / span) * plotInnerW;
  const laneY = (lane: string) => AXIS_H + Math.max(0, LANES.indexOf(lane)) * LANE_H + LANE_H / 2;

  return (
    <div className="mx-auto max-w-4xl px-6 py-9">
      {/* header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="shrink-0">
          <TraceBot size={44} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            Trace · Decision timeline
          </div>
          <h1 className="mt-2 text-balance text-[24px] font-semibold leading-tight text-ink sm:text-[27px]">
            Every decision Nimbus made, and where it changed its mind
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-dim">
            Each row is a topic; each dot is a decision, placed on the month it was made. Where a later decision
            <span className="mx-1 font-medium" style={{ color: "var(--signal)" }}>⟲ reversed</span>
            an earlier one, Trace draws the arrow. Hover any dot to see the story; click to pin it and open it in the graph.
          </p>
        </div>
      </div>

      {/* legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-faint">
        <Legend kind="current" label="Current decision" />
        <Legend kind="superseded" label="Superseded (overridden)" />
        <Legend kind="at-risk" label="At risk (single owner)" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-5 rounded" style={{ background: "var(--signal)" }} />
          reversal
        </span>
      </div>

      {/* the swimlane chart */}
      <div className="card p-4">
        <div className="overflow-x-auto pb-1">
          <div className="relative" style={{ width: innerW, height }}>
            <svg width={innerW} height={height} className="absolute inset-0" style={{ overflow: "visible" }}>
              {/* month gridlines + labels */}
              {ticks.map((tk, i) => (
                <g key={i}>
                  <line x1={x(tk.t)} y1={AXIS_H - 6} x2={x(tk.t)} y2={height} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
                  <text x={x(tk.t)} y={16} textAnchor="middle" fontSize="10" fill="var(--ink-faint)" className="tabular-nums">
                    {tk.label}
                  </text>
                </g>
              ))}
              {/* lane guide lines */}
              {LANES.map((lane) => (
                <line key={lane} x1={LANE_LABEL_W} y1={laneY(lane)} x2={innerW - 6} y2={laneY(lane)} stroke="var(--line)" strokeWidth="1" />
              ))}
              {/* reversal arrows (flowing amber) */}
              {pairs.map((p, i) => {
                const y = laneY(p.to.lane);
                const x1 = x(decisionTime(p.from)) + 10;
                const x2 = x(decisionTime(p.to)) - 12;
                if (x2 <= x1) return null;
                const midX = (x1 + x2) / 2;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--signal)" strokeWidth="2" strokeLinecap="round" className="trace-flow" opacity="0.9" />
                    <polygon points={`${x2},${y} ${x2 - 6},${y - 4} ${x2 - 6},${y + 4}`} fill="var(--signal)" />
                    <text x={midX} y={y - 7} textAnchor="middle" fontSize="12" fill="var(--signal)">⟲</text>
                  </g>
                );
              })}
            </svg>

            {/* lane labels */}
            {LANES.map((lane) => (
              <div
                key={lane}
                className="absolute flex items-center gap-1.5 text-[12px] font-medium text-dim"
                style={{ left: 0, top: laneY(lane), transform: "translateY(-50%)", width: LANE_LABEL_W - 8 }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: laneColor[lane] ?? "var(--accent)" }} />
                <span className="truncate">{lane}</span>
              </div>
            ))}

            {/* decision dots */}
            {decisions.map((d) => {
              const isSel = selected?.id === d.id;
              const isActive = active?.id === d.id;
              const delay = (chronoIndex.get(d.id) ?? 0) * 90;
              return (
                <button
                  key={d.id}
                  type="button"
                  className="trace-pop group absolute"
                  style={{ left: x(decisionTime(d)), top: laneY(d.lane), transform: "translate(-50%,-50%)", animationDelay: `${delay}ms` }}
                  onMouseEnter={() => setHovered(d)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(d)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected((s) => (s?.id === d.id ? null : d))}
                  aria-label={`${d.title} (${fmtDate(d.date)})`}
                >
                  <Dot decision={d} active={isActive} pinned={isSel} />
                  <span
                    className="pointer-events-none absolute left-1/2 top-[14px] w-[92px] -translate-x-1/2 text-center text-[10px] leading-tight"
                    style={{ color: isActive ? "var(--ink)" : "var(--ink-dim)" }}
                  >
                    <span className="line-clamp-2">{d.title}</span>
                  </span>
                </button>
              );
            })}

            {/* on-hover tooltip: shows the decision content right at the dot */}
            {hovered && (
              <HoverTip
                decision={hovered}
                left={x(decisionTime(hovered))}
                top={laneY(hovered.lane)}
                laneIdx={LANES.indexOf(hovered.lane)}
                innerW={innerW}
              />
            )}
          </div>
        </div>
      </div>

      {/* detail panel, shows the hovered dot (live preview), else the pinned one */}
      <div className="mt-4">
        {active ? (
          <DetailPanel decision={active} reverses={active.reverses ? decisions.find((d) => d.id === active.reverses) : undefined} reversedBy={reversedBy.get(active.id)} pinned={selected?.id === active.id} onShowInGraph={onShowInGraph} />
        ) : (
          <div className="card flex items-center gap-3 p-4 text-[13px] text-dim">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px]" style={{ background: "var(--accent-soft)" }}>👆</span>
            Hover a dot to see the decision, who made it, and why. Click to pin it and jump into the graph.
          </div>
        )}
      </div>
    </div>
  );
}

function HoverTip({ decision, left, top, laneIdx, innerW }: { decision: Decision; left: number; top: number; laneIdx: number; innerW: number }) {
  const W = 234;
  const clampedLeft = Math.max(6, Math.min(left - W / 2, innerW - W - 6));
  const below = laneIdx <= 1; // top lanes → below the dot; lower lanes → above it (never clips)
  const posStyle = below ? { top: top + 16 } : { top: top - 16, transform: "translateY(-100%)" };
  return (
    <div
      className="trace-rise pointer-events-none absolute z-20 rounded-xl p-3"
      style={{ left: clampedLeft, width: W, background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)", borderLeft: `3px solid ${statusColor(decision.status)}`, ...posStyle }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[10px] font-medium tabular-nums text-faint">{fmtDate(decision.date)}</span>
        <StatusBadge status={decision.status} />
      </div>
      <div className="text-[13px] font-semibold leading-snug text-ink">{decision.title}</div>
      <div className="mt-0.5 text-[11px] text-faint">
        {decision.owner} · {decision.role} · {decision.channel}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-dim">{decision.why}</p>
      {decision.reverses && (
        <div className="mt-1.5 text-[11px] font-medium" style={{ color: "var(--signal)" }}>
          ⟲ reversed an earlier decision
        </div>
      )}
      <div className="mt-1.5 text-[10px] text-faint">Click to pin & open in graph →</div>
    </div>
  );
}

function Dot({ decision, active, pinned }: { decision: Decision; active: boolean; pinned: boolean }) {
  const superseded = decision.status === "superseded";
  const atRisk = decision.status === "at-risk";
  const ring = pinned ? "0 0 0 4px color-mix(in oklab, var(--accent) 22%, transparent)" : active ? "0 0 0 3px color-mix(in oklab, var(--accent) 16%, transparent)" : "none";
  const bg = superseded ? "var(--surface)" : atRisk ? "var(--signal)" : "var(--accent)";
  const border = superseded ? "2px solid var(--ink-faint)" : atRisk ? "2px solid var(--signal)" : "2px solid var(--accent)";
  return (
    <span className="relative grid place-items-center transition-transform duration-150 group-hover:scale-125" style={{ boxShadow: ring, borderRadius: "9999px" }}>
      {atRisk && <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full" style={{ background: "var(--signal)", opacity: 0.4 }} />}
      <span className="relative h-3.5 w-3.5 rounded-full" style={{ background: bg, border, opacity: superseded ? 0.85 : 1 }} />
    </span>
  );
}

function DetailPanel({
  decision,
  reverses,
  reversedBy,
  pinned,
  onShowInGraph,
}: {
  decision: Decision;
  reverses?: Decision;
  reversedBy?: Decision;
  pinned: boolean;
  onShowInGraph?: (d: Decision) => void;
}) {
  return (
    <div className="card trace-rise p-5" style={{ borderLeft: `3px solid ${statusColor(decision.status)}` }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--surface-2)", color: "var(--ink-dim)", border: "1px solid var(--line)" }}>
          {decision.lane}
        </span>
        <StatusBadge status={decision.status} />
        {decision.confidential && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-dim)", background: "var(--surface-2)" }}>
            🔒 Confidential
          </span>
        )}
        {pinned && <span className="text-[11px] text-faint">📌 pinned</span>}
      </div>

      <h3 className="text-[17px] font-semibold leading-snug text-ink">{decision.title}</h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-dim">
        <span className="tabular-nums">{fmtDate(decision.date)}</span>
        <span className="text-faint">·</span>
        <span>{decision.owner} <span className="text-faint">({decision.role})</span></span>
        <span className="text-faint">·</span>
        <span className="text-faint">{decision.channel}</span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-dim">
        <span className="font-medium text-ink">Why:</span> {decision.why}
      </p>

      <div className="mt-3 rounded-lg px-3 py-2 text-[12px] italic text-dim" style={{ background: "var(--surface-2)", borderLeft: "2px solid var(--line-strong)" }}>
        “{decision.sourceQuote}”
      </div>

      {reverses && (
        <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]" style={{ background: "color-mix(in oklab, var(--signal) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--signal) 32%, transparent)" }}>
          <span className="mt-[1px]" style={{ color: "var(--signal)" }}>⟲</span>
          <span className="text-dim">Reversed an earlier decision: <span className="font-medium text-ink">{reverses.title}</span> <span className="text-faint">({fmtDate(reverses.date)})</span></span>
        </div>
      )}
      {reversedBy && (
        <div className="mt-2 flex items-start gap-2 text-[12px] text-faint">
          <span>↳</span>
          <span>Later overridden by <span className="font-medium text-dim">{reversedBy.title}</span> ({fmtDate(reversedBy.date)})</span>
        </div>
      )}

      {onShowInGraph && (
        <button type="button" onClick={() => onShowInGraph(decision)} className="btn mt-4 text-[12px]">
          Show in graph →
        </button>
      )}
    </div>
  );
}

function statusColor(s: Decision["status"]): string {
  return s === "superseded" ? "var(--ink-faint)" : s === "at-risk" ? "var(--signal)" : "var(--accent)";
}

function StatusBadge({ status }: { status: Decision["status"] }) {
  if (status === "superseded")
    return <Badge color="var(--ink-faint)" bg="var(--surface-2)">Superseded</Badge>;
  if (status === "at-risk")
    return <Badge color="oklch(0.5 0.14 66)" bg="color-mix(in oklab, var(--signal) 16%, transparent)">At risk</Badge>;
  return <Badge color="oklch(0.5 0.13 155)" bg="oklch(0.5 0.13 155 / 0.12)">Current</Badge>;
}

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color, background: bg }}>
      {children}
    </span>
  );
}

function Legend({ kind, label }: { kind: Decision["status"]; label: string }) {
  const superseded = kind === "superseded";
  const atRisk = kind === "at-risk";
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          background: superseded ? "var(--surface)" : atRisk ? "var(--signal)" : "var(--accent)",
          border: superseded ? "2px solid var(--ink-faint)" : "none",
        }}
      />
      {label}
    </span>
  );
}
