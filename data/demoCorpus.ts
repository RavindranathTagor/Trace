// A small, Cloud-independent snapshot of the team's established decisions. This is
// the SAME memory we seed into Cognee (see scripts/seed-demo.mjs), kept in-process so
// the Guardian and Recall keep working when Cognee is unreachable (Cloud stall, or a
// self-host that hasn't finished cognify). It's a resilience fallback — the reasoning
// still runs live on the LLM; only the retrieval source is local.
//
// These are the PRIOR decisions. The drift/duplicate messages a presenter types live
// (e.g. "migrating billing to MongoDB", "let's build on-prem for Acme", "I'm building
// a retry queue for payments") are intentionally NOT here, so the Guardian catches
// them against these priors.

export const DEMO_CORPUS: string[] = [
  "Ravindra (Q1, #eng): Decision — we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services.",
  "Ravindra (Q1, #eng): Decision — we will NOT support on-prem deployments this year. Cloud-only, to keep the team small.",
  "Ravindra (Q1, #eng): I own authentication end to end. All auth changes go through me.",
  "Ashwini (Q1, roadmap): Q1 focus is reliability and the analytics dashboard. On-prem is explicitly out of scope.",
  "Ravindra (Q1, PR #412 platform-core): Shipped ONE shared, generic retry queue in platform-core — every service (payments, billing, etc.) must REUSE it instead of building its own.",
  "Pushpa (Q1, #payments): Kicked off the payments service. Ravindra owns auth, I own payments.",
  "Ravindra (Q2, #eng): Heads up, I'm on leave all of next month.",
];

// The conflicting/duplicate moves — used ONLY by the briefing/pulse discovery scan so
// it can surface drift & duplicate findings from memory. The live Guardian does NOT
// use these (it reads DEMO_CORPUS only), so typing them live still triggers a fresh catch.
export const DEMO_CONFLICTS: string[] = [
  "Sandesh (Q2, #billing): Migrating the new billing service to MongoDB for schema flexibility.",
  "Sandesh (Q2, #sales): Big customer Acme needs on-prem — we should build on-prem support this quarter.",
  "Pushpa (Q2, #payments): I started building a retry queue for the payments service.",
];

// The full storyline for the morning briefing: established decisions + the moves that
// conflict with them, so the discovery engine finds drift, duplicate AND ownership.
export const PULSE_CORPUS: string[] = [...DEMO_CORPUS, ...DEMO_CONFLICTS];

const STOP = new Set([
  "the", "and", "for", "are", "our", "new", "all", "will", "not", "this", "that", "with",
  "you", "your", "who", "what", "when", "where", "why", "how", "did", "does", "was", "were",
  "have", "has", "into", "from", "about", "team", "decision", "decided", "let", "lets", "should",
]);

const tokens = (s: string) =>
  (s.toLowerCase().match(/[a-z0-9#]+/g) ?? []).filter((t) => t.length > 2 && !STOP.has(t));

/** Rank the corpus by keyword overlap with the query; return the top-scoring messages.
 *  Falls back to the full corpus when nothing overlaps (it's tiny — the LLM can judge
 *  the whole thing), so the Guardian always has the established decisions to reason over. */
export function corpusEvidence(query: string, limit = DEMO_CORPUS.length): string[] {
  const q = new Set(tokens(query));
  if (q.size === 0) return DEMO_CORPUS.slice(0, limit);
  const scored = DEMO_CORPUS.map((msg) => {
    const overlap = tokens(msg).filter((t) => q.has(t)).length;
    return { msg, overlap };
  });
  const hits = scored.filter((s) => s.overlap > 0).sort((a, b) => b.overlap - a.overlap);
  // Always include the full set for the Guardian — cross-topic drift (MongoDB vs the
  // Postgres decision) needs the prior even when few tokens literally overlap.
  return (hits.length ? hits.map((h) => h.msg) : DEMO_CORPUS).slice(0, limit);
}

/** The whole corpus as one context block, for composing an answer. */
export function corpusContext(query?: string): string {
  const msgs = query ? corpusEvidence(query) : DEMO_CORPUS;
  return msgs.join("\n");
}
