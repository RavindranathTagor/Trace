import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, MONO } from "./theme";
import { Broll, CatchCard, ChatBubble, Chip, fade, KineticType, Placeholder, Telemetry, TraceLockup, TraceMark, useSpringPop } from "./components";

const Stage: React.FC<{ children: React.ReactNode; tint?: string; intensity?: number }> = ({ children, tint, intensity }) => (
  <AbsoluteFill>
    <Broll tint={tint} intensity={intensity} />
    <AbsoluteFill style={{ padding: "70px 90px 190px", alignItems: "center" }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

const Panel: React.FC<{ title: string; children: React.ReactNode; w?: number }> = ({ title, children, w = 980 }) => (
  <div style={{ width: w, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, overflow: "hidden", boxShadow: C.shadowMd }}>
    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 15, color: C.dim, display: "flex", gap: 10, alignItems: "center", background: C.bg2 }}>
      <span style={{ display: "flex", gap: 6 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />)}</span>
      {title}
    </div>
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);

// ═══ BEAT 0 — COLD OPEN ═══════════════════════════════════════════════════════
export const S0ColdOpen: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const shake = f > 150 && f < 168 ? Math.sin(f * 3) * (168 - f) * 0.4 : 0;
  const chatO = fade(f, 8, 12, 188, 14);
  const kinO = fade(f, 200, 10);
  const heart = 1 + Math.sin(f / 4) * 0.06;
  return (
    <Stage tint={f > 150 ? C.drift : C.accent} intensity={f > 150 ? 1.3 : 0.8}>
      <div style={{ opacity: chatO, transform: `translate(${shake}px, ${shake * 0.4}px)`, position: "absolute", top: 150, width: 1000 }}>
        <Panel title="Slack · #nimbus-eng">
          <ChatBubble who="Karthik" text="kicking off the new billing service this sprint — going MongoDB, schema's still moving fast." delay={12} />
          {f > 60 && f < 150 && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${C.drift}`, transform: `scale(${heart})`, boxShadow: `0 0 18px ${C.drift.replace(")", " / 0.5)")}` }} />
              <span style={{ fontFamily: MONO, fontSize: 16, color: C.dim }}>guard · GRAPH_COMPLETION … nodes: 41 · conf: —</span>
            </div>
          )}
          {f > 150 && <CatchCard kind="drift" delay={150} conf={0.91} headline="MongoDB for a new service reverses a standing decision." cite="standardize ALL new services on PostgreSQL — no more Mongo." who="Priya (Staff Eng), Q1" />}
        </Panel>
      </div>
      {f > 60 && f < 150 && <Telemetry lines={["guard · GRAPH_COMPLETION", "nodes traversed: 41", "conf: —"]} />}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: kinO }}>
        <KineticType text="NOBODY ASKED IT TO." delay={202} size={120} accentWord="ASKED" />
      </AbsoluteFill>
    </Stage>
  );
};

// ═══ BEAT 1 — TITLE + THESIS ══════════════════════════════════════════════════
const Step: React.FC<{ label: string; last?: boolean; delay: number }> = ({ label, last, delay }) => {
  const p = useSpringPop(delay);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ padding: "12px 22px", borderRadius: 12, fontFamily: MONO, fontWeight: 800, fontSize: 24, letterSpacing: 1.2, color: C.accentInk, background: C.accentSoft, border: `1.5px solid oklch(0.52 0.17 266 / 0.3)`, opacity: p, transform: `translateY(${(1 - p) * 24}px)`, boxShadow: C.shadowSm }}>{label}</div>
      {!last && <div style={{ color: C.accent, fontSize: 26, opacity: p }}>→</div>}
    </div>
  );
};
export const S1Thesis: React.FC<{ dur: number }> = () => {
  const logo = useSpringPop(6);
  const steps = ["OBSERVE", "REMEMBER", "REASON", "DETECT", "GUARD", "LEARN"];
  return (
    <Stage tint={C.accent}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
        <div style={{ opacity: logo, transform: `scale(${0.85 + logo * 0.15})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <TraceLockup scale={2.1} tagline />
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: C.ink, textAlign: "center", maxWidth: 1100, marginTop: 10 }}>Not a chatbot you query — <span style={{ color: C.accent }}>an agent that speaks up.</span></div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {steps.map((s, i) => <Step key={s} label={s} last={i === steps.length - 1} delay={60 + i * 9} />)}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// ═══ BEAT 2 — THE TEAM CHAT (the spine) ═══════════════════════════════════════
export const S2TeamChat: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  return (
    <Stage tint={C.accent} intensity={0.85}>
      <div style={{ position: "absolute", top: 56, fontFamily: MONO, fontSize: 17, color: C.accentInk, letterSpacing: 2.5, opacity: fade(f, 0, 10) }}>ONE CONTINUOUS THREAD · FIVE VOICES · NOBODY QUERIED IT</div>
      <div style={{ position: "absolute", top: 104, width: 1180 }}>
        <Panel title="Slack · #nimbus-eng   (live)" w={1180}>
          <div style={{ opacity: interpolate(f, [0, 20, 90, 120], [0, 0.55, 0.55, 0.3], { extrapolateRight: "clamp" }), fontFamily: FONT, fontSize: 17, color: C.dim, borderLeft: `2px solid ${C.violet}`, paddingLeft: 12, marginBottom: 16 }}>
            <b style={{ color: C.violet }}>Priya · Q1:</b> “standardize ALL new services on PostgreSQL — no more Mongo 🐘”  ✅✅ <span style={{ fontFamily: MONO, fontSize: 13, color: C.faint }}>· scrolled into the dark…</span>
          </div>
          <ChatBubble who="Karthik" text="morning 👋 kicking off billing — going MongoDB, schema's moving." delay={20} />
          <ChatBubble who="Raj" text="nice, I'll wire payments — starting a retry queue for failed webhooks today." delay={45} />
          <ChatBubble who="Karthik" text="oh and Acme signed 🎉 they need on-prem — I think we build on-prem this quarter." delay={70} />
          {f > 110 && <CatchCard kind="drift" delay={112} headline="MongoDB reverses the Postgres standard." cite="no more Mongo for new services." who="Priya, Q1" />}
          {f > 150 && <CatchCard kind="drift" delay={152} headline="On-prem reverses a roadmap decision." cite="cloud-only this year — on-prem out of scope." who="Priya + Maya, Q1" />}
          {f > 190 && <CatchCard kind="duplicate" delay={192} headline="Retry queue duplicates shipped work." cite="added a GENERIC retry queue in platform-core." who="Sam, PR #412" />}
          {f > 250 && f < 470 && (
            <div style={{ marginTop: 8 }}>
              <ChatBubble who="Karthik" text="wait — I had no idea we ruled out Mongo. @Trace what did we decide about our database, and why?" delay={252} />
              {f > 300 && <ChatBubble who="Trace" trace text="In Q1, Priya standardized all new services on PostgreSQL to cut operational surface while the team stays small. Mongo was never approved for new services. — Priya, #architecture (Q1)." delay={302} />}
            </div>
          )}
          {f > 500 && <ChatBubble who="Maya" text="good catch. on-prem stays out of scope — Acme gets its own thread, not a silent reversal." delay={502} />}
          {f > 560 && <ChatBubble who="Sam" text="ship it. also grabbing coffee ☕" delay={562} />}
          {f > 592 && <div style={{ fontFamily: MONO, fontSize: 15, color: C.faint, marginTop: 6 }}>guard · no citable conflict · <span style={{ color: C.green }}>silent ✓</span></div>}
        </Panel>
      </div>
    </Stage>
  );
};

// ═══ BEAT 3 — UNDER THE HOOD (graph) ══════════════════════════════════════════
const GNode: React.FC<{ x: number; y: number; label: string; c: string; delay: number }> = ({ x, y, label, c, delay }) => {
  const p = useSpringPop(delay);
  return (
    <g opacity={p} transform={`translate(${x},${y}) scale(${0.6 + p * 0.4})`}>
      <circle r={16} fill={c} style={{ filter: `drop-shadow(0 2px 8px ${c.replace(")", " / 0.4)")})` }} />
      <text x={0} y={40} fill={C.ink} fontFamily={FONT} fontSize={20} fontWeight={700} textAnchor="middle">{label}</text>
    </g>
  );
};
export const S3UnderHood: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const nodes = [
    { id: "priya", x: 300, y: 240, label: "Priya", c: C.violet },
    { id: "pg", x: 640, y: 180, label: "Postgres standard", c: C.accent },
    { id: "mongo", x: 980, y: 300, label: "Mongo (billing)", c: C.drift },
    { id: "neon", x: 640, y: 420, label: "→ Neon (managed)", c: C.duplicate },
  ];
  const edgeP = interpolate(f, [30, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage tint={C.accent} intensity={0.8}>
      <div style={{ position: "absolute", top: 66, fontFamily: MONO, fontSize: 19, color: C.accentInk, letterSpacing: 2.5, opacity: fade(f, 0, 10) }}>ONE COGNEE TEMPORAL KNOWLEDGE GRAPH</div>
      <svg width={1280} height={560} style={{ position: "absolute", top: 130 }}>
        {[["priya", "pg"], ["pg", "mongo"], ["pg", "neon"]].map(([a, b], i) => {
          const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!;
          const lit = i === 1 && f > 120;
          return <line key={i} x1={na.x} y1={na.y} x2={interpolate(edgeP, [0, 1], [na.x, nb.x])} y2={interpolate(edgeP, [0, 1], [na.y, nb.y])} stroke={lit ? C.drift : C.lineStrong} strokeWidth={lit ? 4 : 2} strokeDasharray={i === 1 ? "8 6" : undefined} style={{ filter: lit ? `drop-shadow(0 0 6px ${C.drift.replace(")", " / 0.5)")})` : "none" }} />;
        })}
        {f > 120 && <text x={800} y={222} fill={C.drift} fontFamily={MONO} fontSize={18} fontWeight={700}>supersedes</text>}
        {nodes.map((n, i) => <GNode key={n.id} x={n.x} y={n.y} label={n.label} c={n.c} delay={10 + i * 10} />)}
      </svg>
      {f > 150 && (
        <div style={{ position: "absolute", bottom: 200, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 20px", fontFamily: MONO, fontSize: 20, color: C.green, opacity: fade(f, 150, 10), boxShadow: C.shadowSm }}>
          {`{ "type":"drift", "confidence":0.91, "cites":["priya-q1-postgres"] }`.slice(0, Math.max(0, Math.floor((f - 150) * 1.4)))}
          <span style={{ opacity: f % 20 < 10 ? 1 : 0 }}>▌</span>
        </div>
      )}
    </Stage>
  );
};

// ═══ BEAT 4 — MONEYSHOT: GITHUB PR ════════════════════════════════════════════
export const S4Moneyshot: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const commentIn = useSpringPop(130, 0.5);
  return (
    <Stage tint={f > 130 ? C.drift : C.accent} intensity={f > 130 ? 1 : 0.6}>
      <div style={{ position: "absolute", top: 84, width: 1180, opacity: fade(f, 0, 14, 250, 20) }}>
        <Placeholder label="LIVE: GitHub PR — “Migrate billing service to MongoDB”" sub="record: open the real PR, refresh, Trace comment lands" accent={C.drift} h={350} />
        {f > 130 && (
          <div style={{ transform: `translateY(${(1 - commentIn) * 30}px)`, opacity: commentIn, marginTop: 20 }}>
            <CatchCard kind="drift" delay={130} conf={0.91} headline="Trace commented on the PR — this reverses the Postgres standard." cite="standardize ALL new services on PostgreSQL — Priya, Q1. Confirm before merge." who="app/api/github/webhook" />
          </div>
        )}
      </div>
      {f > 230 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fade(f, 232, 10) }}>
          <KineticType text="DECIDED IN SLACK. ENFORCED ON GITHUB." delay={234} size={70} accentWord="ENFORCED" />
        </AbsoluteFill>
      )}
    </Stage>
  );
};

// ═══ BEAT 5 — COMPANY BRAIN ═══════════════════════════════════════════════════
const FileRow: React.FC<{ fn: string; delay: number }> = ({ fn, delay }) => {
  const p = useSpringPop(delay);
  return (
    <div style={{ opacity: p, transform: `translateX(${(1 - p) * 30}px)`, fontFamily: MONO, fontSize: 24, color: C.ink, display: "flex", gap: 12, alignItems: "center" }}>
      <TraceMark size={22} />{fn} <span style={{ color: C.faint, fontSize: 16 }}>← one Cognee dataset</span>
    </div>
  );
};
export const S5CompanyBrain: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const files = [".cursorrules", "CLAUDE.md", ".github/copilot-instructions.md", "AGENTS.md", "CONVENTIONS.md"];
  return (
    <Stage tint={C.violet} intensity={0.9}>
      {f < 120 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, opacity: fade(f, 0, 10, 110, 12) }}>
          <KineticType text="THREE AGENTS · ZERO MEMORY" delay={6} size={82} sub="in 2026 your code is written by a fleet of amnesiacs" accentWord="ZERO" />
          <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
            {["Cursor", "Claude Code", "Copilot"].map((n, i) => <Chip key={n} delay={40 + i * 8} color={C.accent}>◈ {n}</Chip>)}
          </div>
        </AbsoluteFill>
      )}
      {f >= 120 && f < 470 && (
        <div style={{ position: "absolute", top: 120, width: 1180, opacity: fade(f, 120, 14, 450, 16) }}>
          <div style={{ fontFamily: MONO, fontSize: 18, color: C.accentInk, letterSpacing: 1.5, marginBottom: 14 }}>trace-company-brain · check_before_coding()  — the agent asks BEFORE it writes</div>
          <Placeholder label="LIVE: Cursor + MCP — agent self-corrects mongoose → Postgres/Prisma" sub="record: Cursor mid-typing → CONFLICT banner → diff-wipe swap" accent={C.green} h={320} />
          {f > 230 && <CatchCard kind="drift" delay={230} conf={0.98} headline="⚠ CONFLICT — the fleet was about to re-make a rejected call." cite="Architecture constraint: standardize on PostgreSQL. Rejected: MongoDB for schema flexibility." who="GET /api/brain/context" />}
        </div>
      )}
      {f >= 470 && (
        <div style={{ position: "absolute", top: 150, width: 1100, opacity: fade(f, 470, 12) }}>
          <div style={{ fontFamily: MONO, fontSize: 20, color: C.green, marginBottom: 18 }}>$ npm run brain:rules</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {files.map((fn, i) => <FileRow key={fn} fn={fn} delay={490 + i * 10} />)}
          </div>
          <div style={{ marginTop: 26, fontFamily: FONT, fontSize: 32, fontWeight: 800, color: C.ink, opacity: fade(f, 560, 10) }}>One endpoint. Every agent. <span style={{ color: C.accent }}>Same brain.</span></div>
        </div>
      )}
    </Stage>
  );
};

// ═══ BEAT 6 — BUS-FACTOR / WHAT-IF ════════════════════════════════════════════
export const S6BusFactor: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const grey = interpolate(f, [40, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage tint={C.ownership} intensity={0.7}>
      <div style={{ position: "absolute", top: 150, width: 1000 }}>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderLeft: `4px solid ${C.ownership}`, borderRadius: 16, padding: "20px 24px", opacity: fade(f, 6, 12), boxShadow: C.shadowMd, display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: `oklch(0.55 ${0.13 * grey} 300)`, display: "grid", placeItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: 26, color: "#fff" }}>P</div>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT, fontSize: 13, color: C.ownership, letterSpacing: 0.6, fontWeight: 700, background: "oklch(0.62 0.13 66 / 0.1)", padding: "4px 10px", borderRadius: 99 }}>◑ OWNERSHIP RISK · BUS-FACTOR HIGH</div>
            <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.ink, marginTop: 8 }}>Auth is solely owned by Priya — and she's on leave next month.</div>
            <div style={{ fontFamily: MONO, fontSize: 15, color: C.faint, marginTop: 6 }}>cited: “I own authentication end-to-end” · “on leave all next month” — Priya</div>
          </div>
        </div>
      </div>
      {f > 120 && <div style={{ position: "absolute", top: 400, width: 1000, opacity: fade(f, 120, 12) }}><Placeholder label="LIVE: What-if — type “Priya” → cited departure impact" sub="every consequence traced to a real message · zero invented numbers" accent={C.ownership} h={260} /></div>}
    </Stage>
  );
};

// ═══ BEAT 7 — CLOSE ═══════════════════════════════════════════════════════════
const Receipt: React.FC<{ r: string; delay: number }> = ({ r, delay }) => {
  const p = useSpringPop(delay);
  const col = r === "drift" ? C.drift : r === "duplicate" ? C.duplicate : C.ownership;
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 20}px)`, padding: "8px 16px", borderRadius: 10, fontFamily: MONO, fontSize: 16, color: col, border: `1px solid ${col.replace(")", " / 0.4)")}`, background: col.replace(")", " / 0.08)") }}>✓ {r} caught</div>;
};
export const S7Close: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const logo = useSpringPop(60);
  const receipts = ["drift", "drift", "duplicate", "ownership"];
  return (
    <Stage tint={C.accent}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
        <div style={{ display: "flex", gap: 12, opacity: fade(f, 0, 12, 90, 12) }}>
          {receipts.map((r, i) => <Receipt key={i} r={r} delay={10 + i * 8} />)}
        </div>
        <div style={{ opacity: logo, transform: `scale(${0.88 + logo * 0.12})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <TraceLockup scale={2.6} />
          <div style={{ fontFamily: FONT, fontSize: 42, fontWeight: 700, color: C.ink, marginTop: 8, textAlign: "center" }}>your team's memory — <span style={{ color: C.accent }}>with a pulse.</span></div>
          <div style={{ fontFamily: MONO, fontSize: 20, color: C.accentInk, marginTop: 8, letterSpacing: 0.5 }}>Runs on Cognee Cloud · 100% self-hostable</div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
