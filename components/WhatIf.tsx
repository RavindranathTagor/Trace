"use client";

import { useMemo, useState } from "react";
import type { GraphNode } from "@/lib/types";

interface ImpactSource {
  quote: string;
  who?: string;
  when?: string;
}
interface ImpactItem {
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
  sources: ImpactSource[];
}
interface DepartureImpact {
  person: string;
  headline: string;
  items: ImpactItem[];
  scanned: number;
  degraded?: string;
}

const SEV_COLOR: Record<ImpactItem["severity"], string> = {
  high: "var(--drift)",
  medium: "var(--ownership)",
  low: "var(--duplicate)",
};

export default function WhatIf({ graphNodes }: { graphNodes: GraphNode[] }) {
  const [person, setPerson] = useState("");
  const [result, setResult] = useState<DepartureImpact | null>(null);
  const [loading, setLoading] = useState(false);

  const people = useMemo(() => {
    const names = graphNodes.filter((n) => n.type === "Person").map((n) => n.label).filter((l) => l && l.length < 24);
    return Array.from(new Set(names)).slice(0, 8);
  }, [graphNodes]);

  async function run(name: string) {
    const p = name.trim();
    if (!p) return;
    setPerson(p);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/whatif?person=${encodeURIComponent(p)}`, { cache: "no-store" });
      setResult((await res.json()) as DepartureImpact);
    } catch {
      setResult({ person: p, headline: "", items: [], scanned: 0, degraded: "unreachable" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="What-if departure impact">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        Trace · Query the future
      </div>
      <h1 className="mt-2.5 text-balance text-[26px] font-semibold leading-tight text-ink">What happens if someone leaves?</h1>
      <p className="mt-2 text-xs text-faint">
        A grounded projection from the memory graph, every consequence cited, nothing invented.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(person);
        }}
        className="mt-5 flex gap-2"
      >
        <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Type a name, e.g. Priya" className="input" aria-label="Person" />
        <button type="submit" className="btn-primary shrink-0" disabled={loading || !person.trim()}>
          {loading ? "Projecting…" : "Project impact"}
        </button>
      </form>

      {people.length > 0 && !result && !loading && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {people.map((p) => (
            <button key={p} type="button" onClick={() => void run(p)} className="chip">
              {p}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="brief-card animate-pulse" style={{ ["--accent-card" as string]: "var(--line-strong)" }}>
              <div className="h-4 w-1/2 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="mt-2 h-3 w-2/3 rounded" style={{ background: "var(--surface-2)" }} />
            </div>
          ))}
        </div>
      )}

      {result && !loading && (
        <div className="mt-6">
          {result.items.length === 0 ? (
            <div className="card p-6 text-center text-sm text-dim">
              {result.degraded
                ? `No grounded impact, ${result.degraded}.`
                : `Nothing in memory shows ${result.person} as a single point of failure. That's good news.`}
            </div>
          ) : (
            <>
              <div className="brief-card trace-rise" style={{ ["--accent-card" as string]: SEV_COLOR.high }}>
                <span className="brief-tag" style={{ ["--accent-card" as string]: SEV_COLOR.high }}>
                  ◑ Departure impact
                </span>
                <h3 className="mt-2 text-[18px] font-semibold leading-snug text-ink">{result.headline}</h3>
                <p className="mt-1 text-xs text-faint">
                  Projected from {result.scanned} sources · {result.items.length} grounded consequence
                  {result.items.length === 1 ? "" : "s"}
                </p>
              </div>

              <ol className="mt-3 space-y-3">
                {result.items.map((it, i) => (
                  <li key={i} className="brief-card trace-rise" style={{ ["--accent-card" as string]: SEV_COLOR[it.severity], animationDelay: `${i * 70}ms` }}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[15px] font-semibold text-ink">{it.label}</h4>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: SEV_COLOR[it.severity], background: `color-mix(in oklab, ${SEV_COLOR[it.severity]} 12%, transparent)` }}
                      >
                        {it.severity}
                      </span>
                    </div>
                    {it.detail && <p className="mt-1 text-sm text-dim">{it.detail}</p>}
                    <div className="mt-2.5 space-y-1.5">
                      {it.sources.map((s, j) => (
                        <div key={j} className="evidence">
                          {s.quote}
                          {(s.who || s.when) && (
                            <span className="ml-2 text-[11px] text-faint">- {[s.who, s.when].filter(Boolean).join(" · ")}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}
