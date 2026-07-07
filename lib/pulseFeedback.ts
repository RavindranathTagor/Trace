// The confirmation loop, Trace's real moat.
//
// Every graded card is a human label of what a real "miss" looks like for THIS
// team. Confirmations reinforce; dismissals suppress the finding AND write a note
// back into the team's memory ("the team confirmed this reversal was intentional")
// so the next scan has the context and won't re-raise it. That graded corpus is
// the thing a pull-search product can never collect, nobody grades a search result.

export type Verdict = "confirmed" | "dismissed";

interface FeedbackRecord {
  verdict: Verdict;
  at: number;
}

// Signature = normalized title, so the same finding is matched across re-scans.
// globalThis-backed: written by /api/pulse/feedback, read by /api/pulse, separate
// route bundles would otherwise never see each other's grades (dismissed cards
// would keep reappearing, breaking the confirmation loop).
const g = globalThis as unknown as { __tracePulseFeedback?: Map<string, FeedbackRecord> };
const store = (g.__tracePulseFeedback ??= new Map<string, FeedbackRecord>());

function sig(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function recordFeedback(title: string, verdict: Verdict): void {
  const key = sig(title);
  if (key) store.set(key, { verdict, at: Date.now() });
}

/** A dismissed finding should not be surfaced again on the next scan. */
export function isDismissed(title: string): boolean {
  return store.get(sig(title))?.verdict === "dismissed";
}

export function feedbackStats(): { confirmed: number; dismissed: number } {
  const records = Array.from(store.values());
  return {
    confirmed: records.filter((r) => r.verdict === "confirmed").length,
    dismissed: records.filter((r) => r.verdict === "dismissed").length,
  };
}
