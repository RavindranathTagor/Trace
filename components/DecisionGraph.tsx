"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData, GraphNode, NodeType } from "@/lib/types";

// react-force-graph touches `window`, so load it client-only.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const TYPE_COLOR: Record<NodeType, string> = {
  Decision: "#f59e0b", // amber
  Person: "#3b82f6", // blue
  Project: "#a855f7", // purple
  ActionItem: "#22c55e", // green
  Reason: "#9ca3af", // gray
  Blocker: "#ef4444", // red
  Meeting: "#64748b", // slate
  Entity: "#64748b",
};

const ALL_NODE_TYPES = Object.keys(TYPE_COLOR) as NodeType[];

function nodeColor(n: GraphNode): string {
  if (n.type === "ActionItem") {
    const status = String(n.properties?.status ?? "").toLowerCase();
    if (status === "overdue" || status === "blocked") return "#ef4444";
  }
  return TYPE_COLOR[n.type] ?? "#64748b";
}

interface ForceLink {
  source: string;
  target: string;
  label?: string;
}
interface ForceNode extends GraphNode {
  x?: number;
  y?: number;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

export interface DecisionGraphProps {
  graph: GraphData;
  highlightedIds: string[];
  onNodeClick?: (node: GraphNode) => void;
}

export default function DecisionGraph({ graph, highlightedIds, onNodeClick }: DecisionGraphProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  // Keep highlight in a ref so the canvas paint loop reflects it WITHOUT
  // re-supplying graphData (which would reheat the force simulation).
  const highlightRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    highlightRef.current = new Set(highlightedIds);
  }, [highlightedIds]);
  const hasHighlightRef = useRef(false);
  useEffect(() => {
    hasHighlightRef.current = highlightedIds.length > 0;
  }, [highlightedIds]);

  // Stable graphData identity keyed by the set of node/edge ids.
  const graphData = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n })) as ForceNode[],
      links: graph.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })) as ForceLink[],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.nodes.map((n) => n.id).join(","), graph.edges.map((e) => `${e.source}>${e.target}`).join(",")],
  );

  // Search + type filter. Matching ids live in a ref so the canvas paint reflects
  // the filter WITHOUT re-supplying graphData (which would reheat the simulation).
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(() => new Set(ALL_NODE_TYPES));
  const presentTypes = useMemo(
    () => ALL_NODE_TYPES.filter((t) => graph.nodes.some((n) => n.type === t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.nodes.map((n) => n.type).join(",")],
  );
  const matchRef = useRef<Set<string>>(new Set());
  const filterActiveRef = useRef(false);
  useEffect(() => {
    const qq = query.trim().toLowerCase();
    const allTypesOn = presentTypes.every((t) => activeTypes.has(t));
    const active = qq.length > 0 || !allTypesOn;
    filterActiveRef.current = active;
    matchRef.current = active
      ? new Set(
          graph.nodes
            .filter((n) => activeTypes.has(n.type) && (qq === "" || n.label.toLowerCase().includes(qq)))
            .map((n) => n.id),
        )
      : new Set();
  }, [query, activeTypes, graph.nodes, presentTypes]);
  const toggleType = (t: NodeType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div ref={ref} className="relative h-full w-full">
      {/* search + type filter overlay */}
      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the graph…"
          className="w-52 rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
          style={{ background: "color-mix(in oklab, var(--surface) 90%, transparent)", border: "1px solid var(--line)", backdropFilter: "blur(6px)" }}
        />
        <div className="flex max-w-[280px] flex-wrap gap-1">
          {presentTypes.map((t) => {
            const on = activeTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-opacity"
                style={{ background: "color-mix(in oklab, var(--surface) 88%, transparent)", border: "1px solid var(--line)", opacity: on ? 1 : 0.4 }}
                title={on ? `Hide ${t}` : `Show ${t}`}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />
                {t}
              </button>
            );
          })}
        </div>
      </div>
      {size.width > 0 && (
        <ForceGraph2D
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="#ffffff"
          cooldownTicks={120}
          // Keep repainting so subgraph highlight (driven by a ref, not graphData)
          // appears after the force simulation cools down. Cheap for ~30 nodes.
          autoPauseRedraw={false}
          onNodeClick={(node: object) => onNodeClick?.(node as ForceNode)}
          linkColor={() => "rgba(100,116,139,0.30)"}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkWidth={1}
          nodeRelSize={5}
          nodeLabel={(node: object) => {
            const n = node as ForceNode;
            const props = n.properties ?? {};
            const extra = props.status ? ` · ${props.status}` : props.date ? ` · ${props.date}` : "";
            return `${n.type}: ${n.label}${extra}`;
          }}
          nodeCanvasObject={(node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const n = node as ForceNode;
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const isHot = highlightRef.current.has(n.id);
            const filteredOut = filterActiveRef.current && !matchRef.current.has(n.id);
            const dimmed = filteredOut || (hasHighlightRef.current && !isHot);
            const r = isHot ? 7 : 5;

            ctx.globalAlpha = filteredOut ? 0.08 : dimmed ? 0.25 : 1;

            // pulsing glow ring for highlighted nodes (reads as "alive")
            if (isHot) {
              const pulse = 1 + 0.3 * (0.5 + 0.5 * Math.sin(performance.now() / 280));
              ctx.beginPath();
              ctx.arc(x, y, (r + 5) * pulse, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(79,70,229,0.16)";
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = nodeColor(n);
            ctx.fill();
            if (isHot) {
              ctx.lineWidth = 2 / globalScale;
              ctx.strokeStyle = "#4f46e5";
              ctx.stroke();
            }

            // label
            const fontSize = Math.max(10 / globalScale, 2.5);
            ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
            ctx.fillStyle = dimmed ? "rgba(51,65,85,0.35)" : "#334155";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const label = n.label.length > 26 ? n.label.slice(0, 25) + "…" : n.label;
            ctx.fillText(label, x, y + r + 1);

            ctx.globalAlpha = 1;
          }}
        />
      )}
      <Legend />
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["Decision", TYPE_COLOR.Decision],
    ["Person", TYPE_COLOR.Person],
    ["Project", TYPE_COLOR.Project],
    ["Action", TYPE_COLOR.ActionItem],
    ["Blocked/Overdue", "#ef4444"],
    ["Reason", TYPE_COLOR.Reason],
  ];
  return (
    <div
      className="absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-xs"
      style={{ background: "color-mix(in oklab, var(--surface) 85%, transparent)", border: "1px solid var(--line)", backdropFilter: "blur(6px)" }}
    >
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-dim">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}
