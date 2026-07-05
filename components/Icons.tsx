// Line icons (currentColor, 1.6 stroke) for the landing page + small brand marks
// for the AI coding agents and the tech stack. No emojis anywhere — these are the
// visual vocabulary of the marketing sections.

type P = { className?: string; style?: React.CSSProperties };
const S = ({ children, className = "h-5 w-5", style }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    {children}
  </svg>
);

export const IconDrift = (p: P) => (<S {...p}><path d="M4 7h11a4 4 0 0 1 0 8H9" /><path d="m7 12-3 3 3 3" /><path d="M20 7l-3-3M20 7l-3 3" /></S>);
export const IconDuplicate = (p: P) => (<S {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></S>);
export const IconKnowledge = (p: P) => (<S {...p}><path d="M12 3v18" /><path d="M12 6c-1.5-1.6-4-2-6-1.5v12c2-.5 4.5-.1 6 1.5 1.5-1.6 4-2 6-1.5v-12c-2-.5-4.5-.1-6 1.5" /></S>);
export const IconRobot = (p: P) => (<S {...p}><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 8V4M8 13h.01M16 13h.01M9 17h6" /><path d="M2 12v3M22 12v3" /></S>);
export const IconObserve = (p: P) => (<S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></S>);
export const IconRemember = (p: P) => (<S {...p}><circle cx="6" cy="7" r="2" /><circle cx="18" cy="9" r="2" /><circle cx="11" cy="17" r="2" /><path d="m8 8 2 8M17 11l-5 5M8 7l8 1.6" /></S>);
export const IconReason = (p: P) => (<S {...p}><path d="M9.5 3.5 11 8l4.5 1.5L11 11l-1.5 4.5L8 11 3.5 9.5 8 8z" /><path d="M18 4v3M18 17v3M16.5 5.5 19.5 5.5M16.5 18.5H19.5" /></S>);
export const IconShield = (p: P) => (<S {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></S>);
export const IconImprove = (p: P) => (<S {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7h-5M21 7v5" /></S>);
export const IconApi = (p: P) => (<S {...p}><path d="m8 6-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" /></S>);
export const IconGraph = (p: P) => (<S {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="9" cy="18" r="2.5" /><path d="M8 7.5 15.5 8.2M8 16 7.2 8.4M11 16.5l5.5-6.5" /></S>);
export const IconClock = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>);
export const IconServer = (p: P) => (<S {...p}><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></S>);
export const IconCloud = (p: P) => (<S {...p}><path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 1 6.9" /><path d="M7 18h10" /></S>);
export const IconAudit = (p: P) => (<S {...p}><path d="M4 5h16M4 12h10M4 19h7" /><path d="m15 17 2 2 4-4" /></S>);
export const IconLock = (p: P) => (<S {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></S>);
export const IconCitation = (p: P) => (<S {...p}><path d="M8 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3a3 3 0 0 1-3 3" /><path d="M19 6h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3a3 3 0 0 1-3 3" /></S>);
export const IconRedaction = (p: P) => (<S {...p}><path d="M3 3l18 18M10.5 6.2A9.3 9.3 0 0 1 12 6c6.5 0 10 6 10 6a13 13 0 0 1-2.8 3.4M6.6 6.7C3.9 8.3 2 12 2 12s3.5 6 10 6a9 9 0 0 0 3.4-.66" /></S>);
export const IconCheck = (p: P) => (<S {...p}><path d="m5 12 5 5 9-11" /></S>);
export const IconArrowRight = (p: P) => (<S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>);
export const IconArrowDown = (p: P) => (<S {...p}><path d="M12 5v14M6 13l6 6 6-6" /></S>);
export const IconPlay = (p: P) => (<S {...p}><path d="M7 5l12 7-12 7z" /></S>);
export const IconUsers = (p: P) => (<S {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></S>);
export const IconBolt = (p: P) => (<S {...p}><path d="M13 3 4 14h6l-1 7 9-11h-6z" /></S>);

// ── AI coding-agent marks (monogram badges — brand-coloured, recognizable) ──────
function Badge({ bg, fg = "#fff", label, className = "h-6 w-6", glyph }: { bg: string; fg?: string; label: string; className?: string; glyph: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={label}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill={bg} />
      <g fill={fg} stroke={fg}>{glyph}</g>
    </svg>
  );
}
export const ClaudeMark = (p: P) => (
  <Badge {...p} bg="#D97757" label="Claude"
    glyph={<path strokeWidth="0" d="M12 5.5c.4 2 1 3 2.5 3.9-1.5.9-2.1 1.9-2.5 3.9-.4-2-1-3-2.5-3.9 1.5-.9 2.1-1.9 2.5-3.9zM7 12c.3 1.4.7 2 1.7 2.6-1 .6-1.4 1.2-1.7 2.6-.3-1.4-.7-2-1.7-2.6 1-.6 1.4-1.2 1.7-2.6z" />} />
);
export const CursorMark = (p: P) => (
  <Badge {...p} bg="#0B0B0F" label="Cursor"
    glyph={<path strokeWidth="0" d="M7 5l10 5.6v0L12 12l-1.4 5z M7 5l3.6 12L12 12l5-1.4z" opacity="0.95" />} />
);
export const CopilotMark = (p: P) => (
  <Badge {...p} bg="#111827" label="GitHub Copilot"
    glyph={<g strokeWidth="0"><ellipse cx="12" cy="13" rx="7" ry="5.2" fill="#fff" /><circle cx="9.4" cy="13" r="1.5" fill="#111827" /><circle cx="14.6" cy="13" r="1.5" fill="#111827" /><path d="M12 5c1.6 0 2.5 1.2 2.5 2.6H9.5C9.5 6.2 10.4 5 12 5z" fill="#fff" /></g>} />
);
export const WindsurfMark = (p: P) => (
  <Badge {...p} bg="#0EA5A0" label="Windsurf"
    glyph={<path strokeWidth="0" d="M6 15c3-1 4.5-6 6.5-9 .5 4 .5 7-1 10-2 .3-3.8.1-5.5-1zM13 17c2-.6 3.2-.6 5 .2-1.8 1-3.4 1.2-5 .8z" />} />
);
export const AiderMark = (p: P) => (
  <Badge {...p} bg="#16A34A" label="Aider"
    glyph={<g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l3 3-3 3M13 15h3" /></g>} />
);

// ── tech-stack marks ───────────────────────────────────────────────────────────
export const NextjsMark = (p: P) => (
  <Badge {...p} bg="#000" label="Next.js"
    glyph={<g strokeWidth="0"><path d="M8 7v10M8 7l8 11" stroke="#fff" strokeWidth="1.8" fill="none" /><path d="M15.5 7v6" stroke="#fff" strokeWidth="1.8" /></g>} />
);
export const GroqMark = (p: P) => (
  <Badge {...p} bg="#F55036" label="Groq"
    glyph={<g fill="none" stroke="#fff" strokeWidth="1.8"><circle cx="12" cy="12" r="4.2" /><path d="M14 15l2 2" strokeLinecap="round" /></g>} />
);
export const ElevenLabsMark = (p: P) => (
  <Badge {...p} bg="#0B0B0F" label="ElevenLabs"
    glyph={<g strokeWidth="0"><rect x="8.5" y="7" width="2" height="10" fill="#fff" /><rect x="13.5" y="7" width="2" height="10" fill="#fff" /></g>} />
);
