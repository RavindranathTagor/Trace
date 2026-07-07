"use client";

import { useState } from "react";

// A live, demoable window into the Company Brain API (/api/brain), the endpoint an
// AI agent calls before it acts. Shows the structured answer + facts so a judge can
// see "agents consult the company's live decisions," not just read about it.

interface BrainFact {
  decision: string;
  status: "current" | "superseded" | "at-risk";
  owner: string;
  date: string;
  why: string;
  supersededBy: string | null;
  source: string;
}
interface BrainResult {
  query: string;
  answer: string;
  asOf: string;
  facts: BrainFact[];
  citations: string[];
  confidence: number;
  error?: string;
}

const EXAMPLES = ["what is our current pricing?", "what database are we on?", "who owns auth?", "what did we decide about the API?"];

export default function BrainApiCard() {
  const [q, setQ] = useState(EXAMPLES[0]);
  const [res, setRes] = useState<BrainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(false);

  async function run(query: string) {
    const question = query.trim();
    if (!question || loading) return;
    setQ(question);
    setLoading(true);
    try {
      const r = await fetch(`/api/brain?q=${encodeURIComponent(question)}`, { cache: "no-store" });
      setRes((await r.json()) as BrainResult);
    } catch {
      setRes({ query: question, answer: "", asOf: "", facts: [], citations: [], confidence: 0, error: "request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl text-[17px]" style={{ background: "var(--accent-soft)" }}>🧠</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Company Brain API</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>for agents</span>
          </div>
          <div className="text-[12px] text-faint">Any agent can check your live decisions before it acts.</div>
        </div>
      </div>

      <code className="mb-3 block rounded-lg px-2.5 py-1.5 text-[11px] text-dim" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        GET /api/brain?q=…
      </code>

      <div className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(q)} placeholder="Ask the company brain…" />
        <button type="button" onClick={() => run(q)} disabled={loading || !q.trim()} className="btn-primary shrink-0 px-4">
          {loading ? "…" : "Query"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => run(ex)} className="chip">
            {ex}
          </button>
        ))}
      </div>

      {res && !res.error && (
        <div className="mt-3.5 space-y-3">
          <div className="rounded-lg p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-faint">
              <span>Answer</span>
              <span className="tabular-nums" style={{ color: res.confidence >= 0.85 ? "oklch(0.5 0.13 155)" : res.confidence >= 0.6 ? "var(--signal)" : "var(--ink-faint)" }}>
                {Math.round(res.confidence * 100)}% confident
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-ink">{res.answer}</p>
          </div>

          {res.facts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-faint">Structured facts (what an agent consumes)</div>
              {res.facts.map((f, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px]" style={{ border: "1px solid var(--line)", borderLeft: `3px solid ${f.status === "current" ? "oklch(0.5 0.13 155)" : f.status === "at-risk" ? "var(--signal)" : "var(--ink-faint)"}` }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink" style={{ textDecoration: f.status === "superseded" ? "line-through" : "none" }}>{f.decision}</div>
                    <div className="text-[11px] text-faint">{f.status} · {f.owner} · {f.date}{f.supersededBy ? ` · superseded by ${f.supersededBy}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => setRaw((r) => !r)} className="text-[11px] text-accent hover:underline">
            {raw ? "Hide" : "Show"} raw JSON
          </button>
          {raw && (
            <pre className="overflow-x-auto rounded-lg p-2.5 text-[10.5px] leading-snug text-dim" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              {JSON.stringify(res, null, 2)}
            </pre>
          )}
        </div>
      )}
      {res?.error && <p className="mt-3 text-[12px]" style={{ color: "var(--drift)" }}>Request failed.</p>}
    </div>
  );
}
