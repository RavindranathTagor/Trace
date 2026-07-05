"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DecisionGraph from "@/components/DecisionGraph";
import AskTalk from "@/components/AskTalk";
import IntegrationsHub from "@/components/IntegrationsHub";
import ModelSelector from "@/components/ModelSelector";
import DigestFeed from "@/components/DigestFeed";
import GitHubDrift from "@/components/GitHubDrift";
import WhatIf from "@/components/WhatIf";
import BackendSwitch from "@/components/BackendSwitch";
import TraceGuide from "@/components/TraceGuide";
import DecisionTimeline from "@/components/DecisionTimeline";
import BriefingDeliver from "@/components/BriefingDeliver";
import { CompanyTimelineStrip } from "@/components/ReversalStrip";
import { TraceWordmark } from "@/components/TraceMark";
import { IllusEmptyGraph } from "@/components/Illustrations";
import { nodeIdsInText } from "@/lib/highlight";
import { decisionsForLabel, type Decision } from "@/data/decisions";
import type { GraphData, GraphNode } from "@/lib/types";

interface GraphResponse extends GraphData {
  source: "cognee" | "mock";
}

type View = "briefing" | "graph" | "timeline" | "ask" | "whatif" | "sources";

const NAV: { id: View; label: string; icon: JSX.Element; hint: string }[] = [
  { id: "briefing", label: "Briefing", icon: <IconBriefing />, hint: "What your team forgot today" },
  { id: "graph", label: "Graph", icon: <IconGraph />, hint: "The living decision graph" },
  { id: "timeline", label: "Timeline", icon: <IconTimeline />, hint: "Decisions over time — and reversals" },
  { id: "ask", label: "Ask", icon: <IconAsk />, hint: "Query the memory by text or voice, get cited answers" },
  { id: "whatif", label: "What-if", icon: <IconFuture />, hint: "Project the impact if someone leaves" },
  { id: "sources", label: "Sources", icon: <IconPlug />, hint: "Connect Discord, GitHub, files" },
];

/** The live Trace product. `h-full` so it works both full-screen (/app) and
 *  embedded inside the landing page's product frame. */
export default function Dashboard({ autoTour = false }: { autoTour?: boolean }) {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [source, setSource] = useState<"cognee" | "mock">("mock");
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [view, setView] = useState<View>("briefing");
  const [busy, setBusy] = useState<string | null>(null);
  const [graphPick, setGraphPick] = useState<{ node: GraphNode; decisions: Decision[] } | null>(null);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inFlightRef = useRef(false);
  const liveRef = useRef(false);

  const revealHighlights = useCallback((ids: string[]) => {
    revealTimers.current.forEach((t) => clearTimeout(t));
    revealTimers.current = [];
    if (!ids.length) return setHighlightedIds([]);
    setHighlightedIds([]);
    const step = Math.min(700, Math.max(250, Math.floor(4000 / ids.length)));
    ids.forEach((id, i) => {
      const t = setTimeout(() => setHighlightedIds((p) => (p.includes(id) ? p : [...p, id])), i * step);
      revealTimers.current.push(t);
    });
  }, []);
  useEffect(() => () => revealTimers.current.forEach((t) => clearTimeout(t)), []);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/graph", { cache: "no-store" });
      const data = (await res.json()) as GraphResponse;
      if (data.source === "cognee") liveRef.current = true;
      if (data.source === "mock" && liveRef.current) return;
      setGraph({ nodes: data.nodes, edges: data.edges });
      setSource(data.source);
    } catch {
      /* keep last good graph */
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);
  useEffect(() => {
    // 30s aligns with the server-side graph cache (GRAPH_TTL_MS) so polling never
    // adds Cloud load beyond one refresh per window; also pauses when tab is hidden.
    const id = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) void refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  async function clearMemory() {
    if (!window.confirm("Clear all team memory? This deletes the knowledge graph and can't be undone.")) return;
    setBusy("clearing");
    try {
      await fetch("/api/clear", { method: "POST" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const active = NAV.find((n) => n.id === view);

  return (
    <div className="relative flex h-full overflow-hidden">
      <TraceGuide navigate={(v) => setView(v as View)} autoStart={autoTour} />
      {/* Left rail */}
      <nav
        className="flex w-[64px] flex-col items-center gap-0.5 py-4 lg:w-[220px] lg:items-stretch lg:px-3"
        style={{ borderRight: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="mb-5 px-1 lg:px-2">
          <TraceWordmark />
        </div>
        {NAV.map((n) => {
          const on = view === n.id;
          return (
            <button
              key={n.id}
              type="button"
              data-tour={`nav-${n.id}`}
              onClick={() => setView(n.id)}
              title={n.hint}
              aria-current={on ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors lg:px-3 ${
                on ? "font-medium text-ink" : "text-dim hover:text-ink"
              }`}
              style={on ? { background: "var(--surface-2)" } : undefined}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center" style={on ? { color: "var(--accent)" } : undefined}>
                {n.icon}
              </span>
              <span className="hidden lg:block">{n.label}</span>
            </button>
          );
        })}
        <div className="mt-auto hidden px-2 lg:block">
          <div className="rounded-xl p-3" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div className="text-[11px] font-semibold text-ink">Runs on Cognee</div>
            <p className="mt-1 text-[11px] leading-relaxed text-faint">Temporal memory graph · Cloud + self-hosted.</p>
          </div>
        </div>
      </nav>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between gap-3 px-5 py-3"
          style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink">{active?.label}</h2>
            <p className="truncate text-[11px] text-faint">{active?.hint}</p>
          </div>
          <div className="flex items-center gap-2.5" data-tour="header">
            <BackendSwitch />
            <ModelSelector />
            <LiveBadge source={source} count={graph.nodes.length} />
            <button type="button" onClick={clearMemory} disabled={!!busy} className="btn-ghost" title="Delete all memory">
              {busy === "clearing" ? "Clearing…" : "Clear"}
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto" style={{ background: "var(--canvas)" }}>
          {view === "briefing" && (
            <div className="mx-auto max-w-6xl px-6 py-9">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* The briefing itself — the reason you're here (findings + Play / Re-scan). */}
                <div className="min-w-0">
                  <DigestFeed
                    nodeCount={graph.nodes.length}
                    onCiteNodes={(card) => {
                      const text = `${card.title} ${card.detail} ${card.sources.map((s) => s.quote).join(" ")}`;
                      revealHighlights(nodeIdsInText(graph.nodes, text));
                      setView("graph");
                    }}
                  />
                </div>

                {/* Sidebar: act on it + supporting context — beside the feed, not below. */}
                <aside className="space-y-5 lg:sticky lg:top-0 lg:self-start">
                  <BriefingDeliver />
                  <div className="space-y-4 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">More context</div>
                    <GitHubDrift />
                    <CompanyTimelineStrip onOpen={() => setView("timeline")} />
                  </div>
                </aside>
              </div>
            </div>
          )}

          {view === "graph" && (
            <div className="h-full p-4">
              <section className="card relative h-full overflow-hidden">
                <DecisionGraph
                  graph={graph}
                  highlightedIds={highlightedIds}
                  onNodeClick={(node) => setGraphPick({ node, decisions: decisionsForLabel(node.label) })}
                />
                {graph.nodes.length === 0 && source === "cognee" && <GraphEmpty onConnect={() => setView("sources")} />}
                {graphPick && (
                  <NodeHistoryPopover
                    pick={graphPick}
                    onClose={() => setGraphPick(null)}
                    onOpenTimeline={() => {
                      setGraphPick(null);
                      setView("timeline");
                    }}
                  />
                )}
              </section>
            </div>
          )}

          {view === "timeline" && (
            <DecisionTimeline
              onShowInGraph={(d) => {
                revealHighlights(nodeIdsInText(graph.nodes, d.graphTerms.join(" ")));
                setView("graph");
              }}
            />
          )}

          {view === "ask" && (
            <div className="mx-auto max-w-2xl px-6 py-9">
              <div className="card min-h-[60vh] p-6">
                <AskTalk onHighlight={revealHighlights} graphNodes={graph.nodes} />
              </div>
            </div>
          )}

          {view === "whatif" && (
            <div className="mx-auto max-w-2xl px-6 py-9">
              <WhatIf graphNodes={graph.nodes} />
            </div>
          )}

          {view === "sources" && (
            <div className="mx-auto max-w-5xl px-6 py-9">
              <IntegrationsHub onIngested={() => void refresh()} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LiveBadge({ source, count }: { source: "cognee" | "mock"; count: number }) {
  const live = source === "cognee";
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        color: live ? "oklch(0.5 0.13 155)" : "oklch(0.55 0.13 66)",
        background: live ? "oklch(0.5 0.13 155 / 0.1)" : "oklch(0.55 0.13 66 / 0.1)",
      }}
      title={live ? "Live memory (Cognee)" : "Demo data — Cognee not connected"}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
      {live ? `Live · ${count} nodes` : "Demo"}
    </span>
  );
}

function NodeHistoryPopover({
  pick,
  onClose,
  onOpenTimeline,
}: {
  pick: { node: GraphNode; decisions: Decision[] };
  onClose: () => void;
  onOpenTimeline: () => void;
}) {
  const { node, decisions } = pick;
  return (
    <div
      className="trace-rise absolute right-4 top-4 z-10 w-72 rounded-xl p-3.5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Decision history</div>
          <div className="truncate text-[13px] font-semibold text-ink" title={node.label}>{node.label}</div>
        </div>
        <button type="button" onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">✕</button>
      </div>
      {decisions.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-dim">
          No decisions in the ledger reference this node yet. Open the full timeline to see the company&apos;s history.
        </p>
      ) : (
        <ol className="space-y-2">
          {decisions.map((d) => (
            <li key={d.id} className="flex items-start gap-2">
              <span
                className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                style={{ background: d.status === "superseded" ? "var(--surface)" : d.status === "at-risk" ? "var(--signal)" : "var(--accent)", border: d.status === "superseded" ? "1.5px solid var(--ink-faint)" : "none" }}
              />
              <div className="min-w-0">
                <div className="text-[12px] font-medium leading-snug text-ink" style={{ textDecoration: d.status === "superseded" ? "line-through" : "none" }}>
                  {d.title}
                </div>
                <div className="text-[10.5px] tabular-nums text-faint">
                  {new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  {d.reverses ? " · reversed an earlier call" : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={onOpenTimeline} className="btn mt-3 w-full justify-center text-[12px]">
        See full timeline →
      </button>
    </div>
  );
}

function GraphEmpty({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="card max-w-md p-6 text-center">
        <IllusEmptyGraph className="mx-auto mb-3 h-32 w-auto" />
        <h2 className="text-base font-semibold text-ink">Your team&apos;s memory is empty</h2>
        <p className="mt-2 text-sm leading-relaxed text-dim">
          Connect a source and Trace builds the decision graph automatically — then it starts catching drift,
          duplicate work, and ownership gaps for you.
        </p>
        <button type="button" onClick={onConnect} className="btn-primary mt-4">
          Connect a source
        </button>
      </div>
    </div>
  );
}

/* ── icons (1.6 stroke, currentColor) ─────────────────────────────────── */
function IconBriefing() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="19" cy="15" r="3" />
    </svg>
  );
}
function IconGraph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.6">
      <circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="9" r="2.2" /><circle cx="9" cy="18" r="2.2" />
      <path d="M7.8 7.2 16 8.4M8 16 7 8M11 17l6-6" strokeLinecap="round" />
    </svg>
  );
}
function IconTimeline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 4v16" />
      <circle cx="5" cy="8" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="5" cy="16" r="2.2" />
      <path d="M9 8h10M9 16h7" />
    </svg>
  );
}
function IconAsk() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-4 3v-3H4z" />
    </svg>
  );
}
function IconFuture() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" />
    </svg>
  );
}
function IconPlug() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />
    </svg>
  );
}
