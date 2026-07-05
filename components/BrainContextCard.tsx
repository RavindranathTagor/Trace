"use client";

import { useCallback, useEffect, useState } from "react";

// The "before-you-code" context pack — the Company Brain a coding agent consults
// before it writes anything. Shows the live pack (constraints / mistakes / rejected /
// bugs / ownership) and lets you copy it as a rules file, or grab the MCP config so
// Claude Code / Cursor / Windsurf call it automatically.

interface Pack {
  scope: string;
  architectureConstraints: Array<{ rule: string; since: string; owner: string }>;
  conventions: Array<{ rule: string }>;
  pastMistakes: Array<{ tried: string; revertedTo: string; why: string; when: string }>;
  rejectedDesigns: Array<{ design: string; rejectedFor: string | null }>;
  knownBugs: Array<{ area: string; issue: string; severity: string }>;
  ownership: Array<{ area: string; owner: string; risk: string }>;
  confidence: number;
}

const MCP_SNIPPET = `{
  "mcpServers": {
    "trace-company-brain": {
      "command": "node",
      "args": ["adapters/brain-mcp.mjs"],
      "env": { "TRACE_BASE_URL": "http://localhost:3001" }
    }
  }
}`;

const RULE_TARGETS = [
  { target: "cursor", label: ".cursorrules" },
  { target: "claude", label: "CLAUDE.md" },
  { target: "copilot", label: "Copilot" },
];

export default function BrainContextCard() {
  const [topic, setTopic] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback((t: string) => {
    setLoading(true);
    fetch(`/api/brain/context${t ? `?topic=${encodeURIComponent(t)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setPack)
      .catch(() => setPack(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(""), [load]);

  async function copy(kind: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }
  async function copyRules(target: string, label: string) {
    try {
      const r = await fetch(`/api/brain/context?format=rules&target=${target}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`);
      await copy(label, await r.text());
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl text-[17px]" style={{ background: "var(--accent-soft)" }}>🧩</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Before-you-code context</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>shared by all agents</span>
          </div>
          <div className="text-[12px] text-faint">What Claude / Cursor / Copilot / Aider get before they write code.</div>
        </div>
      </div>

      <code className="mb-3 block rounded-lg px-2.5 py-1.5 text-[11px] text-dim" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        GET /api/brain/context?topic=…
      </code>

      <div className="flex gap-2">
        <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(topic)} placeholder="Scope to an area (optional): database, billing, api…" />
        <button type="button" onClick={() => load(topic)} disabled={loading} className="btn shrink-0 px-4">{loading ? "…" : "Refresh"}</button>
      </div>

      {pack && (
        <div className="mt-3.5 space-y-3">
          <Section title="Architecture constraints" tone="var(--accent)" items={pack.architectureConstraints.map((c) => `${c.rule} · ${c.owner}`)} />
          <Section title="Conventions" tone="var(--duplicate)" items={pack.conventions.map((c) => c.rule)} />
          <Section title="Past mistakes — do not repeat" tone="var(--signal)" items={pack.pastMistakes.map((m) => `Tried ${m.tried} → ${m.revertedTo} (${m.when}) — ${m.why}`)} />
          <Section title="Rejected designs" tone="var(--drift)" items={pack.rejectedDesigns.map((d) => `${d.design}${d.rejectedFor ? ` → replaced by ${d.rejectedFor}` : ""}`)} strike />
          <Section title="Known bugs" tone="var(--drift)" items={pack.knownBugs.map((b) => `[${b.severity}] ${b.area}: ${b.issue}`)} />
          <Section title="Ownership" tone="var(--ownership)" items={pack.ownership.map((o) => `${o.area} → ${o.owner}${o.risk !== "ok" ? ` ⚠️ ${o.risk}` : ""}`)} />

          {/* delivery: copy as rules file, or wire the MCP server */}
          <div className="rounded-lg p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div className="mb-2 text-[10px] uppercase tracking-wide text-faint">Give it to your coding agent</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-dim">Copy as</span>
              {RULE_TARGETS.map((t) => (
                <button key={t.target} type="button" onClick={() => copyRules(t.target, t.label)} className="chip">
                  {copied === t.label ? "✓ copied" : t.label}
                </button>
              ))}
              <button type="button" onClick={() => copy("mcp", MCP_SNIPPET)} className="chip">
                {copied === "mcp" ? "✓ copied" : "MCP config"}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-faint">
              Or run <code className="font-mono">npm run brain:rules</code> to write every tool&apos;s rules file. Live via MCP: Claude Code / Cursor / Windsurf call <code className="font-mono">company_brain</code> before coding.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, tone, items, strike }: { title: string; tone: string; items: string[]; strike?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: tone }}>{title}</div>
      <ul className="space-y-1">
        {items.slice(0, 6).map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] leading-snug text-dim">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
            <span style={{ textDecoration: strike ? "line-through" : "none" }}>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
