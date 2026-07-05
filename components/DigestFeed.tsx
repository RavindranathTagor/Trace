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

const G = ({ children, className = "h-3.5 w-3.5" }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{children}</svg>
);
const IconDriftG = () => (<G><path d="M4 7h11a4 4 0 0 1 0 8H9" /><path d="m7 12-3 3 3 3" /><path d="M20 7l-3-3M20 7l-3 3" /></G>);
const IconDupG = () => (<G><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></G>);
const IconOwnG = () => (<G><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6" /></G>);
const IconTarget = ({ className }: { className?: string }) => (<G className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></G>);
const IconEye = ({ className }: { className?: string }) => (<G className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></G>);
const IconPlayG = ({ className }: { className?: string }) => (<G className={className}><path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" /></G>);
const IconStopG = ({ className }: { className?: string }) => (<G className={className}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" /></G>);
const IconRescanG = ({ className }: { className?: string }) => (<G className={className}><path d="M20 11a8 8 0 1 0-.5 4" /><path d="M20 5v6h-6" /></G>);
const IconCheckG = ({ className }: { className?: string }) => (<G className={className}><path d="m5 12 5 5 9-11" /></G>);
const IconXG = ({ className }: { className?: string }) => (<G className={className}><path d="M6 6l12 12M18 6 6 18" /></G>);

const TYPE_META: Record<PulseCardType, { label: string; accent: string; Glyph: () => JSX.Element }> = {
  drift: { label: "Decision drift", accent: "var(--drift)", Glyph: IconDriftG },
  duplicate: { label: "Duplicate work", accent: "var(--duplicate)", Glyph: IconDupG },
  ownership: { label: "Ownership risk", accent: "var(--ownership)", Glyph: IconOwnG },
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
                {speaking ? <IconStopG className="h-3.5 w-3.5" /> : <IconPlayG className="h-3.5 w-3.5" />}
                {speaking ? "Stop" : "Play"}
              </button>
            )}
            <button type="button" onClick={() => void load(true)} className="btn" disabled={loading}>
              <IconRescanG className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
                    <meta.Glyph />
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
                    <span className="flex items-center gap-1.5 text-xs text-faint">
                      {verdict === "confirmed" ? <IconCheckG className="h-3.5 w-3.5" /> : <IconXG className="h-3.5 w-3.5" />}
                      {verdict === "confirmed"
                        ? "Confirmed — Trace will remember this matters."
                        : "Dismissed — Trace won't raise this again."}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void grade(card, "confirmed")}
                        className="btn-ghost text-accent"
                        title="This is a real, useful catch. Trace reinforces it in memory — raising its precision score."
                      >
                        <IconCheckG className="h-3.5 w-3.5" /> Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => void grade(card, "dismissed")}
                        className="btn-ghost"
                        title="Intentional / not a real problem. Trace suppresses it and won't raise this finding again."
                      >
                        <IconXG className="h-3.5 w-3.5" /> Not real
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
        <IconTarget className="h-3.5 w-3.5" /> Precision · grade findings to train Trace
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
      <IconTarget className="h-3.5 w-3.5" />
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
      <IconEye className="h-3.5 w-3.5" />
      Watching {parts.join(" · ")}
    </span>
  );
}
