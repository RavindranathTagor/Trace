// Minimal GitHub helper: fetch open "bug"-labelled issues from a repo, mapped into
// the Company-Brain known-bugs shape. Fail-soft by design — returns [] on any error
// (no token, missing Issues:read scope, network), so the context pack never breaks.

import type { KnownIssue, Severity } from "@/data/knownIssues";

function severityFromLabels(labels: Array<{ name?: string }>): Severity {
  const names = labels.map((l) => (l.name ?? "").toLowerCase());
  if (names.some((n) => /critical|p0|sev-?1|high/.test(n))) return "high";
  if (names.some((n) => /low|minor|p3/.test(n))) return "low";
  return "medium";
}

/** Open issues labelled `bug` on `owner/repo`, as KnownIssue[]. Never throws. */
export async function fetchOpenIssues(repo: string, token: string, max = 8): Promise<KnownIssue[]> {
  if (!repo || !token) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&labels=bug&per_page=${max}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return []; // 403/404 → PAT lacks Issues:read, or repo not found; degrade quietly
    const issues = (await res.json()) as Array<{ number: number; title: string; body?: string; pull_request?: unknown; labels?: Array<{ name?: string }> }>;
    return issues
      .filter((i) => !i.pull_request) // the issues endpoint also returns PRs
      .slice(0, max)
      .map((i) => ({
        id: `gh-${i.number}`,
        area: repo.split("/")[1] ?? "repo",
        issue: i.title,
        workaround: (i.body ?? "").replace(/\s+/g, " ").slice(0, 140) || "(see issue)",
        severity: severityFromLabels(i.labels ?? []),
        source: `github#${i.number}`,
      }));
  } catch {
    return [];
  }
}
