"use client";

import { useCallback, useEffect, useState } from "react";
import { IllusAllClear, IllusEmptyGraph } from "@/components/Illustrations";
import { MiniReversal } from "@/components/ReversalStrip";

// Mirrors lib/pulse PulseCard (kept local so this stays a pure client component).
type PulseCardType = "drift" | "duplicate" | "ownership";
interface PulseSource {
  quote: string;
  who?: string;
  when?: string;
}
interface PulseCard {
  id: string;
  type: PulseCardType;
  title: string;
  detail: string;
  soWhat: string;
  owner?: string;
  confidence: number;
  sources: PulseSource[];
}
interface PulseScan {
  cards: PulseCard[];
  scanned: number;
  generatedAt: string;
  degraded?: string;
}

const TYPE_META: Record<PulseCardType, { label: string; accent: string; glyph: string }> = {
  drift: { label: "Decision drift", accent: "var(--drift)", glyph: "⟳" },
  duplicate: { label: "Duplicate work", accent: "var(--duplicate)", glyph: "⧉" },
  ownership: { label: "Ownership risk", accent: "var(--ownership)", glyph: "◑" },
};

function relTime(iso: string): string {
  try {
    const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
    return `${Math.round(secs / 3600)}h ago`;
  } catch {
    return "just now";
  }
}

interface Stats {
  confirmed: number;
  dismissed: number;
  graded: number;
  precision: number | null;
}

export default function DigestFeed({ onCiteNodes, nodeCount = 0 }: { onCiteNodes?: (card: PulseCard) => void; nodeCount?: number }) {
  const [scan, setScan] = useState<PulseScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [acted, setActed] = useState<Record<string, "confirmed" | "dismissed">>({});
  const [speaking, setSpeaking] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [coverage, setCoverage] = useState<{ channels: number; repos: number } | null>(null);

  // On mount we use the cached scan (fast, no LLM re-run); "Re-scan" forces a fresh one.
  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pulse${force ? "?force=1" : ""}`, { cache: "no-store" });
      setScan((await res.json()) as PulseScan);
    } catch {
      setScan({ cards: [], scanned: 0, generatedAt: new Date().toISOString(), degraded: "unreachable" });
    } finally {
      setLoading(false);
    }
  }, []);

  // The confirmation-loop scoreboard — refetched after every grade so it climbs live.
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/pulse/feedback", { cache: "no-store" });
      setStats((await res.json()) as Stats);
    } catch {
      /* ignore */
    }
  }, []);

  const loadCoverage = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      const d = (await res.json()) as Record<string, { configured?: boolean }>;
      const channels = [d.discord?.configured, d.slack?.configured, d.teams?.configured].filter(Boolean).length;
      setCoverage({ channels, repos: d.github?.configured ? 1 : 0 });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadStats();
    void loadCoverage();
  }, [load, loadStats, loadCoverage]);

  const grade = useCallback(
    async (card: PulseCard, verdict: "confirmed" | "dismissed") => {
      setActed((a) => ({ ...a, [card.id]: verdict }));
      try {
        await fetch("/api/pulse/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: card.id, type: card.type, title: card.title, verdict, sources: card.sources }),
        });
        void loadStats(); // precision updates immediately after grading
      } catch {
        /* optimistic */
      }
    },
    [loadStats],
  );

  const cards = scan?.cards ?? [];
  const count = cards.length;

  // The cold open: Trace reads the briefing aloud. Browser TTS = reliable, zero
  // latency, no key. (Swap for an ElevenLabs /api/tts call for a premium voice.)
  function speakBriefing() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const ordinals = ["First", "Second", "Third", "Fourth", "Fifth"];
    const intro =
      count > 0
        ? `Good morning. ${count} thing${count === 1 ? "" : "s"} your company doesn't know yet. `
        : "Good morning. Nothing new surfaced today — you're in the clear.";
    const body = cards.map((c, i) => `${ordinals[i] ?? "Next"}. ${c.title}. ${c.detail} ${c.soWhat}`).join(" ");
    const u = new SpeechSynthesisUtterance(intro + body);
    u.rate = 1.03;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }
  function stopSpeak() {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <section aria-label="Trace morning briefing">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          Trace · Morning briefing
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-4">
          <h1 className="text-balance text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
            {loading
              ? "Scanning your team's memory…"
              : count > 0
                ? `${count} thing${count === 1 ? "" : "s"} your company doesn't know yet`
                : "Nothing new surfaced — you're in the clear"}
          </h1>
          <div className="flex shrink-0 gap-2">
            {count > 0 && !loading && (
              <button type="button" onClick={speaking ? stopSpeak : speakBriefing} className="btn" title="Read the briefing aloud">
                {speaking ? "⏹ Stop" : "▶ Play"}
              </button>
            )}
            <button type="button" onClick={() => void load(true)} className="btn" disabled={loading}>
              <span className={loading ? "animate-spin" : ""}>↻</span>
              {loading ? "Scanning" : "Re-scan"}
            </button>
          </div>
        </div>

        {/* live meta row: what Trace is watching + how precise it's getting */}
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <SourceCoverage coverage={coverage} nodeCount={nodeCount} />
          <PrecisionMeter stats={stats} />
        </div>

        {scan && !loading && (
          <p className="mt-2 text-xs text-faint">
            Scanned {scan.scanned} source{scan.scanned === 1 ? "" : "s"} · {relTime(scan.generatedAt)}
            {scan.degraded ? ` · ${scan.degraded}` : " · every finding cited, zero fabricated numbers"}
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="brief-card animate-pulse" style={{ ["--accent-card" as string]: "var(--line-strong)" }}>
              <div className="h-3 w-24 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="mt-3 h-4 w-2/3 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="mt-2 h-3 w-1/2 rounded" style={{ background: "var(--surface-2)" }} />
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="card flex flex-col items-center p-8 text-center">
          {scan?.degraded === "no memory yet" ? (
            <>
              <IllusEmptyGraph className="mb-4 h-32 w-auto" />
              <h3 className="text-[15px] font-semibold text-ink">No memory yet</h3>
              <p className="mt-1 max-w-sm text-sm text-dim">
                Connect a source (Discord / GitHub) and Trace will start surfacing what your team forgot.
              </p>
            </>
          ) : (
            <>
              <IllusAllClear className="mb-4 h-32 w-auto" />
              <h3 className="text-[15px] font-semibold text-ink">You&apos;re in the clear</h3>
              <p className="mt-1 max-w-sm text-sm text-dim">
                No drift, duplicate work, or ownership gaps found in the current memory. Trace keeps watching.
              </p>
            </>
          )}
        </div>
      ) : (
        <ol className="space-y-3">
          {cards.map((card, i) => {
            const meta = TYPE_META[card.type];
            const verdict = acted[card.id];
            return (
              <li
                key={card.id}
                className="brief-card trace-rise"
                style={{ ["--accent-card" as string]: meta.accent, animationDelay: `${i * 70}ms`, opacity: verdict === "dismissed" ? 0.5 : 1 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="brief-tag">
                    <span aria-hidden>{meta.glyph}</span>
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-faint">
                    <ConfidenceMeter value={card.confidence} />
                    {card.owner && (
                      <span className="rounded-full px-2 py-0.5 text-dim" style={{ border: "1px solid var(--line)" }}>
                        @{card.owner}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-3 text-[17px] font-semibold leading-snug text-ink">{card.title}</h3>
                {card.detail && <p className="mt-1 text-sm leading-relaxed text-dim">{card.detail}</p>}

                {card.sources.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {card.sources.map((s, j) => (
                      <div key={j} className="evidence">
                        {s.quote}
                        {(s.who || s.when) && (
                          <span className="ml-2 whitespace-nowrap text-[11px] text-faint">
                            — {[s.who, s.when].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* For a drift finding, show the reversal as a mini timeline. */}
                {card.type === "drift" && card.sources.length >= 2 && (
                  <MiniReversal
                    before={{ label: card.sources[0].quote, when: [card.sources[0].who, card.sources[0].when].filter(Boolean).join(" · ") || undefined }}
                    after={{ label: card.title, when: [card.sources[1].who, card.sources[1].when].filter(Boolean).join(" · ") || undefined }}
                  />
                )}

                {card.soWhat && (
                  <p className="mt-3 text-[13px] font-medium text-accent">→ {card.soWhat}</p>
                )}

                <div className="mt-4 flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                  {verdict ? (
                    <span className="text-xs text-faint">
                      {verdict === "confirmed"
                        ? "✓ Confirmed — Trace will remember this matters."
                        : "✕ Dismissed — Trace won't raise this again."}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void grade(card, "confirmed")}
                        className="btn-ghost text-accent"
                        title="This is a real, useful catch. Trace reinforces it in memory — raising its precision score."
                      >
                        ✓ Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => void grade(card, "dismissed")}
                        className="btn-ghost"
                        title="Intentional / not a real problem. Trace suppresses it and won't raise this finding again."
                      >
                        ✕ Not real
                      </button>
                      {onCiteNodes && (
                        <button type="button" onClick={() => onCiteNodes(card)} className="btn-ghost ml-auto">
                          Show in graph →
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** The confirmation-loop scoreboard — the moat, made visible. Climbs as you grade. */
function PrecisionMeter({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const { confirmed, dismissed, graded, precision } = stats;
  if (graded === 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-faint" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} title="Confirm or dismiss findings — Trace's precision improves as you grade">
        <span aria-hidden>🎯</span> Precision · grade findings to train Trace
      </span>
    );
  }
  const pct = Math.round((precision ?? 0) * 100);
  const color = pct >= 85 ? "oklch(0.5 0.13 155)" : pct >= 60 ? "var(--signal)" : "var(--drift)";
  return (
    <span
      className="flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
      title={`${confirmed} confirmed · ${dismissed} dismissed — precision = confirmed ÷ graded, and it climbs as the team trains Trace`}
    >
      <span aria-hidden>🎯</span>
      <span className="text-dim">Precision</span>
      <span className="tabular-nums" style={{ color }}>{pct}%</span>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="text-faint">{confirmed}✓ · {dismissed}✕</span>
    </span>
  );
}

/** Per-finding confidence as a small donut ring — green ≥85%, amber ≥70%, muted below. */
function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)));
  const color = pct >= 85 ? "oklch(0.5 0.13 155)" : pct >= 70 ? "var(--signal)" : "var(--ink-faint)";
  const r = 7;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <span className="flex items-center gap-1" title={`${pct}% confidence in this finding`}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" stroke="var(--line)" strokeWidth="2" />
        <circle cx="9" cy="9" r={r} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 9 9)" />
      </svg>
      <span className="tabular-nums" style={{ color }}>{pct}%</span>
    </span>
  );
}

/** What Trace is currently watching — cheap proof it's a real, connected product. */
function SourceCoverage({ coverage, nodeCount }: { coverage: { channels: number; repos: number } | null; nodeCount: number }) {
  const parts: string[] = [];
  if (coverage) {
    if (coverage.channels) parts.push(`${coverage.channels} channel${coverage.channels === 1 ? "" : "s"}`);
    if (coverage.repos) parts.push(`${coverage.repos} repo${coverage.repos === 1 ? "" : "s"}`);
  }
  parts.push(`${nodeCount || 0} in memory`);
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-dim" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} title="Sources Trace is watching and how much it has learned">
      <span aria-hidden>👁</span>
      Watching {parts.join(" · ")}
    </span>
  );
}
