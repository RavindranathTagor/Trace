// EXACT Trace app palette (from app/globals.css :root). Chrome (Remotion's renderer)
// supports oklch() so we use the real token values. Light-first, premium-minimal.
export const C = {
  bg: "oklch(0.985 0.002 265)", // --canvas
  bg2: "oklch(0.975 0.003 265)", // --surface-2
  panel: "#ffffff", // --surface
  ink: "oklch(0.24 0.012 265)", // --ink
  dim: "oklch(0.47 0.012 265)", // --ink-dim
  faint: "oklch(0.62 0.012 265)", // --ink-faint
  line: "oklch(0 0 0 / 0.08)", // --line
  lineStrong: "oklch(0 0 0 / 0.14)", // --line-strong
  accent: "oklch(0.52 0.17 266)", // --accent (indigo)
  accentInk: "oklch(0.4 0.17 266)", // --accent-ink
  accentSoft: "oklch(0.52 0.17 266 / 0.12)", // --accent-soft
  violet: "#8b5cf6",
  drift: "oklch(0.55 0.19 27)", // --drift (red)
  ownership: "oklch(0.62 0.13 66)", // --ownership (amber)
  duplicate: "oklch(0.53 0.14 245)", // --duplicate (blue)
  signal: "oklch(0.74 0.15 66)", // --signal (logo amber)
  green: "oklch(0.5 0.13 155)", // confirm / learn
  // compatibility aliases used across components:
  cyan: "oklch(0.53 0.14 245)", // → duplicate blue (citation accent)
  amber: "oklch(0.62 0.13 66)", // → ownership amber
  shadowSm: "0 1px 2px oklch(0 0 0 / 0.05)",
  shadowMd: "0 10px 34px oklch(0 0 0 / 0.08), 0 2px 6px oklch(0 0 0 / 0.05)",
};

export const FONT = "'Inter','Segoe UI',system-ui,-apple-system,sans-serif";
export const MONO = "'JetBrains Mono','Cascadia Code','Consolas',monospace";

export const STATIONS = ["OBSERVE", "REMEMBER", "REASON", "DETECT", "GUARD", "LEARN"] as const;
