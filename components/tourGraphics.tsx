"use client";

// Mini, real-looking interface cards the guide agent shows during the tour — so
// the tutorial demonstrates what Trace actually does, visually.
import { GitHubLogo, DiscordLogo, SlackLogo } from "@/components/Logos";
import { TraceMark } from "@/components/TraceMark";

function TraceStamp() {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: "var(--accent-soft)" }}>
      <TraceMark className="h-3.5 w-3.5" />
    </span>
  );
}

/** A GitHub PR with Trace's drift comment — the cross-source catch. */
export function MockGitHubPR() {
  return (
    <div className="overflow-hidden rounded-xl text-[11px]" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <GitHubLogo className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">Pull request #42</span>
        <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ background: "#1a7f37" }}>Open</span>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-[12px] font-semibold text-ink">Migrate billing service to MongoDB</div>
        <div className="mt-2.5 rounded-lg p-2.5" style={{ border: "1px solid var(--line)", borderLeft: "3px solid var(--drift)", background: "var(--surface)" }}>
          <div className="flex items-center gap-1.5">
            <TraceStamp />
            <span className="font-semibold text-ink">Trace</span>
            <span className="text-faint">commented just now</span>
          </div>
          <div className="mt-1.5 leading-snug text-dim">
            ⚠️ This PR may reverse an earlier decision:
            <div className="mt-1 rounded px-2 py-1 italic" style={{ background: "var(--surface-2)", borderLeft: "2px solid var(--line-strong)" }}>
              &ldquo;we&apos;re standardizing all new services on PostgreSQL&rdquo; — priya, Q1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A Discord thread where Trace replies to a drifting message. */
export function MockDiscord() {
  return (
    <div className="overflow-hidden rounded-xl text-[11px]" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <DiscordLogo className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">#engineering</span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <div className="flex gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: "#5865F2" }}>K</span>
          <div>
            <div><span className="font-semibold text-ink">karthik</span> <span className="text-faint">10:24</span></div>
            <div className="text-dim">let&apos;s just move billing to MongoDB, easier schema</div>
          </div>
        </div>
        <div className="flex gap-2 rounded-lg p-2" style={{ background: "var(--accent-soft)" }}>
          <TraceStamp />
          <div>
            <div><span className="font-semibold text-ink">Trace</span> <span className="text-faint">10:24 · replying</span></div>
            <div className="text-dim">⚠️ Heads up @karthik — this reverses the Q1 call to standardize on PostgreSQL. <span className="text-faint">(priya)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A Slack channel where Trace replies to a drifting message. */
export function MockSlack() {
  return (
    <div className="overflow-hidden rounded-xl text-[11px]" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <SlackLogo className="h-3.5 w-3.5" />
        <span className="font-medium text-ink">#product</span>
      </div>
      <div className="space-y-2.5 px-3 py-2.5">
        <div className="flex gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[9px] font-semibold text-white" style={{ background: "#e01e5a" }}>M</span>
          <div>
            <div><span className="font-semibold text-ink">maya</span> <span className="text-faint">2:11 PM</span></div>
            <div className="text-dim">shipping free trials at 30 days for everyone 🎉</div>
          </div>
        </div>
        <div className="flex gap-2 rounded-lg p-2" style={{ background: "var(--accent-soft)" }}>
          <TraceStamp />
          <div>
            <div><span className="font-semibold text-ink">Trace</span> <span className="text-faint">2:11 PM · APP</span></div>
            <div className="text-dim">⚠️ Q2 we moved trials to 14 days to protect conversion <span className="text-faint">(decided by sam).</span> Reopen that?</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A self-animating mini decision graph — nodes light up and an edge pulses, so
 *  the tour shows the "graph lights up the subgraph it traversed" idea in motion. */
export function MiniGraphAnim() {
  // deterministic layout; SMIL animates opacity + a travelling pulse
  const nodes = [
    { id: "d", x: 78, y: 24, c: "var(--drift)", r: 9, delay: "0s" },
    { id: "p1", x: 26, y: 54, c: "var(--accent)", r: 7, delay: "0.3s" },
    { id: "p2", x: 128, y: 50, c: "var(--duplicate)", r: 7, delay: "0.6s" },
    { id: "o", x: 70, y: 84, c: "var(--ownership)", r: 7, delay: "0.9s" },
  ];
  const edges = [
    { x1: 78, y1: 24, x2: 26, y2: 54 },
    { x1: 78, y1: 24, x2: 128, y2: 50 },
    { x1: 78, y1: 24, x2: 70, y2: 84 },
  ];
  return (
    <div className="rounded-xl p-2" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
      <svg viewBox="0 0 156 108" className="h-[108px] w-full">
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--line-strong)" strokeWidth="1.5">
            <animate attributeName="stroke" values="var(--line-strong);var(--accent);var(--line-strong)" dur="2.4s" begin={`${0.3 * i}s`} repeatCount="indefinite" />
          </line>
        ))}
        {edges.map((e, i) => (
          <circle key={`p${i}`} r="2.5" fill="var(--accent)">
            <animate attributeName="cx" values={`${e.x1};${e.x2}`} dur="2.4s" begin={`${0.3 * i}s`} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${e.y1};${e.y2}`} dur="2.4s" begin={`${0.3 * i}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin={`${0.3 * i}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.r + 4} fill={n.c} opacity="0.14">
              <animate attributeName="opacity" values="0.05;0.22;0.05" dur="2.4s" begin={n.delay} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.c}>
              <animate attributeName="r" values={`${n.r};${n.r + 1.5};${n.r}`} dur="2.4s" begin={n.delay} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** A tiny "3 findings" briefing preview. */
export function MockBriefing() {
  const rows = [
    { c: "var(--drift)", t: "Decision drift", d: "Billing → MongoDB reverses the Postgres standard" },
    { c: "var(--duplicate)", t: "Duplicate work", d: "Two teams building a retry queue" },
    { c: "var(--ownership)", t: "Ownership gap", d: "Auth solely owned by Priya" },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.t} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]" style={{ border: "1px solid var(--line)", borderLeft: `3px solid ${r.c}`, background: "var(--surface)" }}>
          <span className="font-semibold" style={{ color: r.c }}>{r.t}</span>
          <span className="truncate text-dim">{r.d}</span>
        </div>
      ))}
    </div>
  );
}
