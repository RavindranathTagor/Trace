"use client";

import { useEffect, useState } from "react";

interface GAlert {
  id: string;
  number?: number;
  title: string;
  url?: string;
  author: string;
  avatarUrl?: string;
  headline: string;
  why?: string;
  prior: { quote: string; who?: string; when?: string };
  ts: number;
}

function ago(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function GitHubDrift() {
  const [alerts, setAlerts] = useState<GAlert[]>([]);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/github/alerts")
        .then((r) => r.json())
        .then((d) => live && setAlerts(d.alerts ?? []))
        .catch(() => {});
    load();
    const t = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) load();
    }, 10000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <GitHubMark className="h-4 w-4 text-ink" />
        <h2 className="text-sm font-semibold text-ink">Caught on GitHub</h2>
        {alerts.length > 0 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: "color-mix(in oklab, var(--drift) 12%, transparent)", color: "var(--drift)" }}
          >
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="card flex items-center gap-2 p-4 text-xs text-dim">
          <GitHubMark className="h-4 w-4 shrink-0 opacity-50" />
          Watching your connected repos, a pull request that reverses a past decision will appear here.
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((a) => (
            <a
              key={a.id}
              href={a.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="card block p-3.5 transition hover:-translate-y-px hover:shadow-md"
              style={{ borderLeft: "3px solid var(--drift)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <GitHubMark className="h-4 w-4 shrink-0 text-ink" />
                  {a.number != null && <span className="text-xs font-medium text-dim">PR #{a.number}</span>}
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                  >
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      <span
                        className="grid h-4 w-4 place-items-center rounded-full text-[9px]"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {a.author[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="text-ink">@{a.author}</span>
                  </span>
                </div>
                <span className="shrink-0 text-[11px] font-medium" style={{ color: "var(--accent)" }}>
                  View on GitHub ↗
                </span>
              </div>

              <div className="mt-2 truncate text-sm font-semibold text-ink">{a.title}</div>

              <div
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "color-mix(in oklab, var(--drift) 10%, transparent)", color: "var(--drift)" }}
              >
                ⚠ Reverses a decision
              </div>

              <blockquote
                className="mt-2 rounded-lg px-2.5 py-1.5 text-[12px] leading-snug text-dim"
                style={{ borderLeft: "2px solid var(--line-strong)", background: "var(--surface-2)" }}
              >
                “{a.prior.quote.slice(0, 180)}”
                {(a.prior.who || a.prior.when) && (
                  <span className="text-faint">, {[a.prior.who, a.prior.when].filter(Boolean).join(", ")}</span>
                )}
              </blockquote>

              <div className="mt-1.5 text-[10px] text-faint">{ago(a.ts)}</div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
