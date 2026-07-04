"use client";

// The one Trace character — glowing amber antenna (the logo's lit node), blinking
// eyes, a smile, side-bolts, and a body. Shared by the guide agent AND the Talk
// avatar. `mouth` (0..1) drives lip-sync; `talk` glows the antenna/cheeks.
export function TraceBot({
  size = 60,
  blink = false,
  talk = false,
  mouth = 0,
  className,
}: {
  size?: number;
  blink?: boolean;
  talk?: boolean;
  mouth?: number;
  className?: string;
}) {
  const h = Math.round(size * (74 / 64));
  const open = Math.max(0, Math.min(1, mouth));
  const glow = talk || open > 0.08;
  return (
    <svg viewBox="0 0 64 74" width={size} height={h} className={className} aria-hidden style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.12))", overflow: "visible" }}>
      {/* antenna + amber signal node */}
      <line x1="32" y1="15" x2="32" y2="9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="6.5" r={glow ? 4.7 : 3.4} fill="#f2b04a" opacity="0.24" />
      <circle cx="32" cy="6.5" r="3" fill="#f2b04a" />
      {/* head */}
      <rect x="9" y="14" width="46" height="42" rx="15" fill="#ffffff" stroke="var(--accent)" strokeWidth="2" />
      {/* side bolts */}
      <circle cx="9" cy="35" r="2.6" fill="var(--accent)" opacity="0.5" />
      <circle cx="55" cy="35" r="2.6" fill="var(--accent)" opacity="0.5" />
      {/* screen */}
      <rect x="15" y="21" width="34" height="27" rx="10" fill="#f6f7fb" />
      {/* eyes */}
      <ellipse cx="26" cy="32" rx="2.7" ry={blink ? 0.6 : 3.5} fill="#23262f" />
      <ellipse cx="38" cy="32" rx="2.7" ry={blink ? 0.6 : 3.5} fill="#23262f" />
      {/* cheeks */}
      {glow && (
        <>
          <circle cx="20" cy="39" r="2.8" fill="#f2b04a" opacity={0.14 + open * 0.22} />
          <circle cx="44" cy="39" r="2.8" fill="#f2b04a" opacity={0.14 + open * 0.22} />
        </>
      )}
      {/* mouth — opens with amplitude, else a smile */}
      {open > 0.12 ? (
        <ellipse cx="32" cy="41" rx="4.5" ry={2 + open * 5.5} fill="#23262f" />
      ) : (
        <path d="M27 40q5 3.5 10 0" stroke="#23262f" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
      {/* body */}
      <rect x="22" y="55" width="20" height="10" rx="5" fill="#ffffff" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}
