"use client";

import { useEffect, useState } from "react";

interface Status {
  preference: "auto" | "cloud" | "local";
  active: "cloud" | "local";
  hasCloud: boolean;
  hasLocal: boolean;
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.5 9.5a3.5 3.5 0 0 1-.5 8.5z" />
    </svg>
  );
}
function ServerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="4.5" width="16" height="6.5" rx="1.6" />
      <rect x="4" y="13" width="16" height="6.5" rx="1.6" />
      <path d="M7.4 7.75h.01M7.4 16.25h.01" />
    </svg>
  );
}

// Icon-only switch between Cognee Cloud and local Cognee. Both are kept in sync
// (dual-write), so switching, or an auto-failover, never loses data.
export default function BackendSwitch() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/backend")
        .then((r) => r.json())
        .then((d) => live && setS(d))
        .catch(() => {});
    load();
    const t = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) load();
    }, 15000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  if (!s || !(s.hasCloud && s.hasLocal)) return null;

  const set = (preference: "cloud" | "local") =>
    fetch("/api/backend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preference }) })
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});

  const seg = (key: "cloud" | "local", Icon: (p: { className?: string }) => JSX.Element, label: string) => {
    const on = s.active === key;
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={on ? "true" : "false"}
        onClick={() => set(key)}
        className={`grid h-6 w-6 place-items-center rounded-full transition-colors ${on ? "bg-[var(--accent)] text-white" : "text-[var(--ink-faint)]"}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-0.5"
      style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
    >
      {seg("cloud", CloudIcon, "Use Cognee Cloud")}
      {seg("local", ServerIcon, "Use local Cognee")}
    </div>
  );
}
