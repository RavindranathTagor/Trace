"use client";

import { useMemo, useState } from "react";
import type { GraphNode, RecallResult } from "@/lib/types";
import { combineHighlights, nodeIdsInText } from "@/lib/highlight";
import { decisionsForText, decisionById } from "@/data/decisions";
import { MiniReversal } from "@/components/ReversalStrip";

const FALLBACK_SUGGESTED = [
  "What did we decide recently, and why?",
  "What's blocked, and who owns it?",
  "What changed our plans this month?",
  "Who is responsible for what?",
];

// Build suggestions from REAL entities in the graph so the examples are relevant
// to this team's memory (not generic). Falls back to the generic set when empty.
function suggestionsFromGraph(nodes: GraphNode[]): string[] {
  const label = (n: GraphNode) => (n.label || "").trim();
  const clean = (arr: string[]) => {
    const seen = new Set<string>();
    return arr.filter((l) => l.length > 1 && l.length < 34 && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()));
  };
  const of = (t: GraphNode["type"]) => clean(nodes.filter((n) => n.type === t).map(label));
  const topics = clean([...of("Project"), ...of("Entity")]);
  const people = of("Person");

  const out: string[] = [];
  if (topics[0]) out.push(`What did we decide about ${topics[0]}?`);
  if (people[0]) out.push(`What does ${people[0]} own?`);
  if (topics[1]) out.push(`Why did we choose ${topics[1]}?`);
  if (topics[2]) out.push(`What's the latest on ${topics[2]}?`);
  for (const f of FALLBACK_SUGGESTED) {
    if (out.length >= 4) break;
    if (!out.includes(f)) out.push(f);
  }
  return out.slice(0, 4);
}

/** Under an answer: if it touches decisions in the ledger, show their timeline -
 *  and if one reversed another, the before→after. Ties every answer to time. */
function RelatedTimeline({ text }: { text: string }) {
  const related = useMemo(() => decisionsForText(text), [text]);
  if (related.length === 0) return null;
  const reversal = related.find((d) => d.reverses && decisionById(d.reverses));
  const before = reversal?.reverses ? decisionById(reversal.reverses) : undefined;
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-faint">On the timeline</div>
      {reversal && before && (
        <MiniReversal
          before={{ label: before.title, when: new Date(before.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) }}
          after={{ label: reversal.title, when: new Date(reversal.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) }}
        />
      )}
      <div className="mt-1.5 space-y-1">
        {related.slice(0, 4).map((d) => (
          <div key={d.id} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: d.status === "superseded" ? "var(--surface)" : d.status === "at-risk" ? "var(--signal)" : "var(--accent)", border: d.status === "superseded" ? "1.5px solid var(--ink-faint)" : "none" }}
            />
            <span className="tabular-nums text-faint">{new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>
            <span className="truncate text-dim" style={{ textDecoration: d.status === "superseded" ? "line-through" : "none" }}>{d.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AskPanelProps {
  onHighlight: (ids: string[]) => void;
  graphNodes: GraphNode[];
}

interface AnswerState {
  q?: string;
  trace?: RecallResult;
  stateless?: { answer: string; source: string };
}

export default function AskPanel({ onHighlight, graphNodes }: AskPanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [compare, setCompare] = useState(false);
  const suggested = useMemo(() => suggestionsFromGraph(graphNodes), [graphNodes]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setQuery(question);
    setLoading(true);
    setAnswers({ q: question });
    onHighlight([]);

    const recallP = fetch("/api/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question, onlyContext: false }),
    }).then((r) => r.json() as Promise<RecallResult>);

    const statelessP = compare
      ? fetch("/api/stateless", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: question }),
        }).then((r) => r.json() as Promise<{ answer: string; source: string }>)
      : Promise.resolve(undefined);

    const [trace, stateless] = await Promise.all([recallP, statelessP]);
    setAnswers({ q: question, trace, stateless });
    const textIds = nodeIdsInText(graphNodes, `${trace.answer ?? ""} ${trace.context ?? ""}`);
    onHighlight(combineHighlights(trace.nodeIds, textIds));
    setLoading(false);
  }

  const hasAnswer = !!answers.trace || loading;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Ask your memory</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-dim">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          compare w/o memory
        </label>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {!hasAnswer && (
          <div className="space-y-3 pt-1">
            <p className="text-xs leading-relaxed text-dim">
              Ask anything your team decided, type here, or switch to Voice above.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="chip">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {answers.q && (
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-accent"
              style={{ background: "var(--accent-soft)" }}
            >
              {answers.q}
            </div>
          </div>
        )}

        {loading && <div className="text-xs text-faint">Searching the team&apos;s memory…</div>}

        {answers.trace && (
          <div className="card p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="text-xs font-semibold text-ink">Trace</span>
              <span className="text-[10px] text-faint">{answers.trace.source === "cognee" ? "from memory" : "demo"}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{answers.trace.answer}</p>

            {answers.trace.sources && answers.trace.sources.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wide text-faint">Sources</div>
                {answers.trace.sources.slice(0, 3).map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] leading-snug text-dim"
                    style={{ borderLeft: "2px solid var(--accent)", background: "var(--surface-2)" }}
                  >
                    {s.replace(/\s+/g, " ").slice(0, 200)}
                  </div>
                ))}
              </div>
            )}

            <RelatedTimeline text={`${answers.q ?? ""} ${answers.trace.answer ?? ""}`} />
          </div>
        )}

        {compare && answers.stateless && (
          <div className="rounded-2xl p-3.5" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--ink-faint)" }} />
              <span className="text-xs font-semibold text-dim">Without memory</span>
            </div>
            <p className="text-sm leading-relaxed text-dim">{answers.stateless.answer}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(query)}
          placeholder="Ask the team's memory…"
          className="input"
        />
        <button type="button" onClick={() => ask(query)} disabled={loading || !query.trim()} className="btn-primary shrink-0 px-4 py-2.5">
          {loading ? "…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
