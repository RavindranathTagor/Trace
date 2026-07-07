// Notion-style spot illustrations, soft, friendly, two-tone (accent indigo +
// amber signal), theme-aware via CSS vars. Used in empty states and landing
// sections to make the product feel warm and hand-made rather than clinical.

type Props = { className?: string };

const wrap = "select-none";

/** Empty decision graph waiting for a source, dashed canvas, faint nodes, an
 *  amber "+" invite, and Trace peeking in. For the graph/memory empty state. */
export function IllusEmptyGraph({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={`${wrap} ${className ?? ""}`} role="img" aria-label="Empty decision graph">
      <rect x="14" y="20" width="172" height="104" rx="14" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" strokeDasharray="5 6" />
      {/* faint placeholder graph */}
      <g opacity="0.5">
        <line x1="70" y1="56" x2="118" y2="46" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="3 4" />
        <line x1="70" y1="56" x2="92" y2="96" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="3 4" />
        <line x1="118" y1="46" x2="140" y2="88" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="3 4" />
        <circle cx="70" cy="56" r="9" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        <circle cx="118" cy="46" r="7" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        <circle cx="92" cy="96" r="7" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
        <circle cx="140" cy="88" r="7" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
      </g>
      {/* amber "+" invite node */}
      <circle cx="150" cy="40" r="13" fill="var(--surface)" stroke="#f2b04a" strokeWidth="2" />
      <path d="M150 34v12M144 40h12" stroke="#f2b04a" strokeWidth="2.4" strokeLinecap="round" />
      {/* Trace peeking bottom-left */}
      <g transform="translate(22,86)">
        <rect x="0" y="6" width="34" height="30" rx="11" fill="#ffffff" stroke="var(--accent)" strokeWidth="2.2" />
        <line x1="17" y1="6" x2="17" y2="1" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="17" cy="-1.5" r="2.4" fill="#f2b04a" />
        <ellipse cx="11" cy="20" rx="2" ry="2.6" fill="#23262f" />
        <ellipse cx="23" cy="20" rx="2" ry="2.6" fill="#23262f" />
        <path d="M12 27q5 3 10 0" stroke="#23262f" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/** All-clear, a soft check shield with sparkles. For the "nothing surfaced" state. */
export function IllusAllClear({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={`${wrap} ${className ?? ""}`} role="img" aria-label="All clear">
      <circle cx="100" cy="76" r="46" fill="var(--accent-soft)" />
      <path d="M100 36c14 8 26 10 30 9 2 22-6 44-30 58-24-14-32-36-30-58 4 1 16-1 30-9Z" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.4" />
      <path d="M86 78l10 10 20-24" stroke="var(--accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* sparkles */}
      <g fill="#f2b04a">
        <path d="M150 34l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
        <path d="M48 52l1.8 4.3 4.3 1.8-4.3 1.8-1.8 4.3-1.8-4.3-4.3-1.8 4.3-1.8z" opacity="0.8" />
        <circle cx="52" cy="104" r="2.5" opacity="0.7" />
        <circle cx="152" cy="98" r="3" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Connect, two rounded plug pieces meeting with a spark. For the integrations header. */
export function IllusConnect({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={`${wrap} ${className ?? ""}`} role="img" aria-label="Connect your tools">
      <rect x="16" y="58" width="70" height="34" rx="17" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.2" />
      <rect x="114" y="58" width="70" height="34" rx="17" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.2" />
      <path d="M86 75h14M100 75h14" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="3 4" />
      {/* prongs */}
      <circle cx="32" cy="68" r="3" fill="var(--accent)" />
      <circle cx="32" cy="82" r="3" fill="var(--accent)" />
      <rect x="150" y="66" width="8" height="4" rx="2" fill="var(--accent)" />
      <rect x="150" y="80" width="8" height="4" rx="2" fill="var(--accent)" />
      {/* spark */}
      <g transform="translate(100,75)">
        <circle r="12" fill="#f2b04a" opacity="0.18" />
        <path d="M-3 -8l6 0-3 6 5 0-8 10 2-8-4 0z" fill="#f2b04a" />
      </g>
      {/* floating source dots */}
      <circle cx="40" cy="34" r="4" fill="var(--drift)" opacity="0.7" />
      <circle cx="100" cy="26" r="4" fill="var(--duplicate)" opacity="0.7" />
      <circle cx="160" cy="34" r="4" fill="var(--ownership)" opacity="0.7" />
    </svg>
  );
}

/** Observe, radar rings sweeping channels. For the landing "observe" beat. */
export function IllusObserve({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={`${wrap} ${className ?? ""}`} role="img" aria-label="Trace observes your channels">
      <g transform="translate(100,78)">
        <circle r="54" fill="none" stroke="var(--line)" strokeWidth="2" />
        <circle r="36" fill="none" stroke="var(--line)" strokeWidth="2" />
        <circle r="18" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
        {/* sweep */}
        <path d="M0 0 L46 -28 A54 54 0 0 1 54 0 Z" fill="var(--accent)" opacity="0.14" />
        <line x1="0" y1="0" x2="52" y2="-16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        {/* the center bot node */}
        <circle r="5" fill="var(--accent)" />
        {/* detected channel blips */}
        <circle cx="-40" cy="-20" r="4" fill="var(--drift)" />
        <circle cx="44" cy="18" r="4" fill="var(--duplicate)" />
        <circle cx="-8" cy="46" r="4" fill="var(--ownership)" />
        <circle cx="30" cy="-40" r="4" fill="#f2b04a" />
      </g>
    </svg>
  );
}

/** Memory graph, a tidy little decision graph, the payoff. For landing. */
export function IllusMemory({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={`${wrap} ${className ?? ""}`} role="img" aria-label="A living decision graph">
      <g strokeWidth="2" stroke="var(--line-strong)">
        <line x1="64" y1="46" x2="112" y2="34" />
        <line x1="64" y1="46" x2="52" y2="98" />
        <line x1="112" y1="34" x2="150" y2="72" />
        <line x1="52" y1="98" x2="104" y2="110" />
        <line x1="150" y1="72" x2="104" y2="110" />
      </g>
      <g strokeWidth="2.4">
        <circle cx="64" cy="46" r="13" fill="var(--surface)" stroke="var(--drift)" />
        <circle cx="112" cy="34" r="10" fill="var(--surface)" stroke="var(--accent)" />
        <circle cx="150" cy="72" r="10" fill="var(--surface)" stroke="var(--duplicate)" />
        <circle cx="52" cy="98" r="10" fill="var(--surface)" stroke="var(--ownership)" />
        <circle cx="104" cy="110" r="12" fill="var(--surface)" stroke="var(--accent)" />
      </g>
      <circle cx="64" cy="46" r="4" fill="var(--drift)" />
      <circle cx="104" cy="110" r="4" fill="var(--accent)" />
      <path d="M158 30l1.8 4.3 4.3 1.8-4.3 1.8-1.8 4.3-1.8-4.3-4.3-1.8 4.3-1.8z" fill="#f2b04a" />
    </svg>
  );
}
