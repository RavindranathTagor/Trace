import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, MONO, STATIONS } from "./theme";
import timeline from "./timeline.json";

// ─── helpers ──────────────────────────────────────────────────────────────────
export const fade = (f: number, inAt: number, inDur = 12, outAt?: number, outDur = 12) => {
  let o = interpolate(f, [inAt, inAt + inDur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (outAt != null) o *= interpolate(f, [outAt, outAt + outDur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return o;
};
export const useSpringPop = (delay = 0, mass = 0.6) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 15, mass, stiffness: 120 } });
};

// ─── the REAL Trace logo (from components/TraceMark.tsx) ───────────────────────
export const TraceMark: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="trace-thread" x1="2" y1="18" x2="22" y2="8" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="oklch(0.52 0.17 266)" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="7.4" r="5" fill="oklch(0.74 0.15 66)" opacity="0.18" />
    <path d="M3.2 17.2 C7 17.2 8.3 7.4 12 7.4 S16.9 14.6 20.8 11.2" stroke="url(#trace-thread)" strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="3.2" cy="17.2" r="1.9" fill="oklch(0.52 0.17 266)" />
    <circle cx="20.8" cy="11.2" r="1.9" fill="#8b5cf6" opacity="0.85" />
    <circle cx="12" cy="7.4" r="2.8" fill="oklch(0.74 0.15 66)" />
    <circle cx="12" cy="7.4" r="2.8" fill="none" stroke="#fff" strokeWidth="0.9" />
  </svg>
);

export const TraceLockup: React.FC<{ scale?: number; tagline?: boolean }> = ({ scale = 1, tagline }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 * scale }}>
    <div style={{ width: 56 * scale, height: 56 * scale, borderRadius: 16 * scale, display: "grid", placeItems: "center", background: "linear-gradient(155deg, oklch(0.52 0.17 266 / 0.16), oklch(0.7 0.16 300 / 0.1))", boxShadow: `inset 0 0 0 1px oklch(0.52 0.17 266 / 0.24), ${C.shadowSm}` }}>
      <TraceMark size={34 * scale} />
    </div>
    <div style={{ lineHeight: 1.1 }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34 * scale, letterSpacing: -0.5, color: C.ink }}>Trace</div>
      {tagline && <div style={{ fontFamily: FONT, fontSize: 15 * scale, color: C.faint }}>catch what your team forgot it decided</div>}
    </div>
  </div>
);

// ─── premium light background (matches the app hero: soft radial washes + hairline grid) ─
export const Broll: React.FC<{ tint?: string; intensity?: number }> = ({ tint = "oklch(0.52 0.17 266)", intensity = 1 }) => {
  const f = useCurrentFrame();
  const drift = (f * 0.25) % 40;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(58% 50% at 50% -6%, ${tint.replace(")", " / " + 0.14 * intensity + ")")}, transparent 62%), radial-gradient(44% 44% at 88% 96%, oklch(0.7 0.16 300 / ${0.1 * intensity}), transparent 62%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.7 }}>
        <defs>
          <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse" patternTransform={`translate(${drift} ${drift})`}>
            <path d="M40 0H0V40" fill="none" stroke="oklch(0 0 0 / 0.035)" strokeWidth={1} />
          </pattern>
          <radialGradient id="gf" cx="50%" cy="35%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
          </radialGradient>
          <mask id="gm"><rect width={1920} height={1080} fill="url(#gf)" /></mask>
        </defs>
        <rect width={1920} height={1080} fill="url(#grid)" mask="url(#gm)" />
      </svg>
    </AbsoluteFill>
  );
};

// ─── persistent 6-station loop rail HUD (on-brand) ─────────────────────────────
export const LoopRail: React.FC<{ active: number }> = ({ active }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", justifyContent: "center", gap: 8, fontFamily: MONO, zIndex: 40 }}>
      {STATIONS.map((s, i) => {
        const on = i === active;
        const passed = i < active;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ padding: "7px 14px", borderRadius: 9, fontSize: 14, letterSpacing: 1.4, fontWeight: 700, color: on ? "#fff" : passed ? C.dim : C.faint, background: on ? C.accent : C.panel, border: `1px solid ${on ? C.accent : C.line}`, boxShadow: on ? `0 0 ${16 + Math.sin(f / 5) * 5}px oklch(0.52 0.17 266 / 0.5), ${C.shadowSm}` : C.shadowSm }}>{s}</div>
            {i < STATIONS.length - 1 && <div style={{ width: 12, height: 2, borderRadius: 2, background: passed ? C.accent : C.line }} />}
          </div>
        );
      })}
    </div>
  );
};

// ─── synced captions (light pill, ink text) ────────────────────────────────────
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const line = (timeline.lines as any[]).find((l) => f >= l.startFrame - 3 && f <= l.startFrame + l.durFrames + 6);
  if (!line) return null;
  const local = f - line.startFrame;
  const o = fade(local, 0, 6, line.durFrames, 8);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 92, display: "flex", justifyContent: "center", zIndex: 45 }}>
      <div style={{ maxWidth: 1180, textAlign: "center", fontFamily: FONT, fontSize: 33, lineHeight: 1.32, fontWeight: 600, color: C.ink, opacity: o, padding: "12px 28px", background: "oklch(1 0 0 / 0.86)", borderRadius: 14, border: `1px solid ${C.line}`, boxShadow: C.shadowMd, backdropFilter: "blur(6px)", transform: `translateY(${interpolate(o, [0, 1], [10, 0])}px)` }}>{line.text}</div>
    </div>
  );
};

export const VoiceTrack: React.FC = () => (
  <>
    {(timeline.lines as any[]).map((l) => (
      <Sequence key={l.id} from={l.startFrame} durationInFrames={l.durFrames + 6}>
        <Audio src={staticFile(`audio/vo/${l.id}.mp3`)} volume={1} />
      </Sequence>
    ))}
  </>
);

// ─── labelled placeholder for live screen-recording / AI b-roll ────────────────
export const Placeholder: React.FC<{ label: string; sub?: string; accent?: string; w?: number | string; h?: number | string }> = ({ label, sub, accent = C.accent, w = 1180, h = 600 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ width: w, height: h, borderRadius: 20, border: `2px dashed ${accent}`, background: C.panel, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, boxShadow: C.shadowMd, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(135deg, transparent 0 22px, oklch(0.52 0.17 266 / 0.03) 22px 44px)`, transform: `translateX(${(f * 0.6) % 44}px)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: accent }}><TraceMark size={18} /> DROP LIVE FOOTAGE HERE</div>
      <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.ink, textAlign: "center", maxWidth: 940, padding: "0 30px" }}>{label}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 16, color: C.dim, textAlign: "center", maxWidth: 860 }}>{sub}</div>}
    </div>
  );
};

// ─── chat bubble (app-matched) ─────────────────────────────────────────────────
const AVATAR: Record<string, string> = { Priya: C.violet, Maya: C.ownership, Raj: C.duplicate, Karthik: C.green, Sam: C.dim };
export const ChatBubble: React.FC<{ who: string; text: string; delay: number; trace?: boolean }> = ({ who, text, delay, trace }) => {
  const s = useSpringPop(delay);
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", opacity: s, transform: `translateY(${(1 - s) * 22}px)`, marginBottom: 15 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: trace ? C.accentSoft : AVATAR[who] || C.dim, display: "grid", placeItems: "center", fontFamily: FONT, fontWeight: 800, color: trace ? C.accent : "#fff", fontSize: 18, border: trace ? `1px solid oklch(0.52 0.17 266 / 0.3)` : "none" }}>{trace ? <TraceMark size={24} /> : who[0]}</div>
      <div>
        <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: trace ? C.accentInk : C.ink, marginBottom: 3 }}>{trace ? "Trace" : who}{trace && <span style={{ marginLeft: 8, fontSize: 11, fontFamily: MONO, background: C.accent, color: "#fff", padding: "1px 6px", borderRadius: 5 }}>APP</span>}</div>
        <div style={{ fontFamily: FONT, fontSize: 21, lineHeight: 1.42, color: C.dim, maxWidth: 780 }}>{text}</div>
      </div>
    </div>
  );
};

// ─── Trace catch card (matches .brief-card: white, left accent rail, brief-tag) ─
export const CatchCard: React.FC<{ kind: "drift" | "duplicate" | "ownership"; headline: string; cite: string; who: string; delay: number; conf?: number }> = ({ kind, headline, cite, who, delay, conf = 0.91 }) => {
  const s = useSpringPop(delay, 0.5);
  const color = kind === "drift" ? C.drift : kind === "duplicate" ? C.duplicate : C.ownership;
  const glyph = kind === "drift" ? "⟳" : kind === "duplicate" ? "⧉" : "◑";
  const label = kind === "drift" ? "DECISION DRIFT" : kind === "duplicate" ? "DUPLICATE WORK" : "OWNERSHIP RISK";
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * 16}px)`, background: C.panel, border: `1px solid ${C.line}`, borderLeft: `4px solid ${color}`, borderRadius: 16, padding: "16px 20px", maxWidth: 880, boxShadow: C.shadowMd, marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT, fontSize: 13, letterSpacing: 0.6, fontWeight: 700, color, background: `${color.replace(")", " / 0.1)")}`, padding: "4px 10px", borderRadius: 99 }}><span style={{ fontSize: 15 }}>{glyph}</span> {label}</div>
        <div style={{ fontFamily: MONO, fontSize: 13.5, color: C.green, fontWeight: 600 }}>confidence {conf.toFixed(2)}</div>
      </div>
      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.ink, marginBottom: 10, lineHeight: 1.25 }}>{headline}</div>
      <div style={{ fontFamily: FONT, fontSize: 17.5, color: C.dim, borderLeft: `2px solid ${color}`, paddingLeft: 12 }}>
        <span style={{ fontStyle: "italic" }}>“{cite}”</span>
        <span style={{ display: "block", fontStyle: "normal", fontFamily: MONO, fontSize: 13, color: C.faint, marginTop: 5 }}>— {who} · cited · dated · owned</span>
      </div>
    </div>
  );
};

// ─── kinetic type slam (ink on light, accent moment) ───────────────────────────
export const KineticType: React.FC<{ text: string; delay?: number; size?: number; color?: string; sub?: string; accentWord?: string }> = ({ text, delay = 0, size = 92, color = C.ink, sub, accentWord }) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 18px", maxWidth: 1560 }}>
        {words.map((w, i) => {
          const d = delay + i * 3;
          const p = spring({ frame: f - d, fps: 30, config: { damping: 13, mass: 0.5, stiffness: 140 } });
          const isAccent = accentWord && w.replace(/[.,]/g, "").toUpperCase() === accentWord.toUpperCase();
          return <span key={i} style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -1.5, color: isAccent ? C.accent : color, opacity: p, transform: `translateY(${(1 - p) * 36}px) scale(${0.75 + p * 0.25})` }}>{w}</span>;
        })}
      </div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 22, color: C.dim, opacity: fade(f - delay, 14, 12), letterSpacing: 0.5 }}>{sub}</div>}
    </div>
  );
};

// ─── mono telemetry HUD ────────────────────────────────────────────────────────
export const Telemetry: React.FC<{ lines: string[]; delay?: number }> = ({ lines, delay = 0 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 40, right: 48, fontFamily: MONO, fontSize: 16, color: C.accentInk, textAlign: "right", opacity: fade(f, delay, 10), lineHeight: 1.7 }}>
      {lines.map((l, i) => <div key={i} style={{ opacity: 0.6 + 0.4 * Math.abs(Math.sin((f + i * 8) / 10)) }}>{l}</div>)}
    </div>
  );
};

export const Chip: React.FC<{ children: React.ReactNode; color?: string; delay?: number }> = ({ children, color = C.accent, delay = 0 }) => {
  const s = useSpringPop(delay);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 99, fontFamily: MONO, fontSize: 15, color, border: `1px solid ${color.replace(")", " / 0.4)")}`, background: color.replace(")", " / 0.08)"), opacity: s, transform: `scale(${0.8 + s * 0.2})`, margin: 4 }}>{children}</span>;
};
