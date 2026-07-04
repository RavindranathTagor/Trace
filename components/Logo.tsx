// Hindsight mark — a small knowledge-graph constellation (memory you can see).
export default function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 5 L6.5 7.5 M12 5 L17.5 9 M6.5 7.5 L9.5 16 M17.5 9 L9.5 16 M12 5 L9.5 16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />
      <circle cx="12" cy="5" r="2.3" fill="currentColor" />
      <circle cx="6.5" cy="7.5" r="1.6" fill="currentColor" fillOpacity="0.75" />
      <circle cx="17.5" cy="9" r="1.6" fill="currentColor" fillOpacity="0.75" />
      <circle cx="9.5" cy="16" r="1.7" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}
