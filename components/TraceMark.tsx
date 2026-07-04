// Trace logo: a decision timeline (left→right through time) that bends at the one
// node Trace lights up — the caught drift/finding. The thread is a subtle indigo→
// violet gradient; the lit node is amber with a soft halo. Themed via CSS vars.
export function TraceMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="trace-thread" x1="2" y1="18" x2="22" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent, #4f46e5)" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* soft halo behind the lit node */}
      <circle cx="12" cy="7.4" r="5" fill="var(--signal, #f2b04a)" opacity="0.18" />
      {/* the decision trace — a thread through time that bends at the finding */}
      <path
        d="M3.2 17.2 C7 17.2 8.3 7.4 12 7.4 S16.9 14.6 20.8 11.2"
        stroke="url(#trace-thread)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* nodes along the trace */}
      <circle cx="3.2" cy="17.2" r="1.9" fill="var(--accent, #4f46e5)" />
      <circle cx="20.8" cy="11.2" r="1.9" fill="#8b5cf6" opacity="0.85" />
      {/* the lit node — the decision/drift Trace surfaces */}
      <circle cx="12" cy="7.4" r="2.8" fill="var(--signal, #f2b04a)" />
      <circle cx="12" cy="7.4" r="2.8" fill="none" stroke="var(--surface, #fff)" strokeWidth="0.9" />
    </svg>
  );
}

// The full wordmark — larger, crisper. `size` scales the whole lockup.
export function TraceWordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid place-items-center ${lg ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-[14px]"}`}
        style={{
          background:
            "linear-gradient(155deg, color-mix(in oklab, var(--accent) 16%, transparent), color-mix(in oklab, #8b5cf6 8%, transparent))",
          boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--accent) 24%, transparent), var(--shadow-sm)",
        }}
      >
        <TraceMark className={lg ? "h-7 w-7" : "h-[23px] w-[23px]"} />
      </span>
      <div className="leading-tight">
        <div className={`font-semibold tracking-tight text-ink ${lg ? "text-[22px]" : "text-[18px]"}`}>Trace</div>
        <div className={`text-faint ${lg ? "text-xs" : "hidden text-[11.5px] sm:block"}`}>
          catch what your team forgot it decided
        </div>
      </div>
    </div>
  );
}
