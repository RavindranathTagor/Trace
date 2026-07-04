// In-memory ring buffer of GitHub PR drift catches, so the dashboard can show
// what Trace flagged on PRs (the webhook writes here; /api/github/alerts reads).
// In-memory is fine for the demo — it resets on server restart.

export interface GithubAlert {
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

// Back the buffer with globalThis: Next.js can bundle each API route separately,
// so a plain module-level array would NOT be shared between the webhook (writer)
// and the alerts route (reader). globalThis is one instance across all routes + HMR.
const g = globalThis as unknown as { __traceGithubAlerts?: GithubAlert[] };
const alerts: GithubAlert[] = g.__traceGithubAlerts ?? (g.__traceGithubAlerts = []);
const MAX = 20;

export function recordGithubAlert(a: Omit<GithubAlert, "id" | "ts">): GithubAlert {
  // De-dupe by PR number (a re-opened/edited PR replaces its prior entry).
  if (typeof a.number === "number") {
    const i = alerts.findIndex((x) => x.number === a.number);
    if (i >= 0) alerts.splice(i, 1);
  }
  const rec: GithubAlert = { ...a, id: `gh-${a.number ?? "x"}-${Date.now()}`, ts: Date.now() };
  alerts.unshift(rec);
  if (alerts.length > MAX) alerts.length = MAX;
  return rec;
}

export function getGithubAlerts(): GithubAlert[] {
  return alerts;
}

export function clearGithubAlerts(): void {
  alerts.length = 0;
}
