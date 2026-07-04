// Nimbus — a realistic B2B SaaS startup's DECISION LEDGER (the "real startup data").
// This is the structured, dated history the Timeline renders: real decisions, who
// made them, why, the exact message they came from, and — the heart of it — which
// earlier decision each one REVERSED. Authored to match data/sampleMeetings.ts so
// the graph (from Cognee) and the timeline tell the same story.
//
// Kept as clean structured records (not re-derived from fuzzy extraction) so the
// Timeline is always rich and correct in a live demo; `graphTerms` cross-links each
// decision to the live Cognee graph for the "Show in graph" action.

export type DecisionStatus = "current" | "superseded" | "at-risk";

export interface Decision {
  id: string;
  lane: string; // swimlane / topic, e.g. "Pricing"
  title: string; // the decision, in plain language
  date: string; // ISO "2026-04-09"
  quarter: string; // "Q2 2026"
  owner: string;
  role: string;
  channel: string; // where it was decided
  why: string; // rationale
  sourceQuote: string; // the exact message it came from (the receipt)
  status: DecisionStatus;
  reverses?: string; // id of the decision this one overrode
  confidential?: boolean;
  tag: "pricing" | "infra" | "api" | "ownership" | "reliability" | "company";
  graphTerms: string[]; // labels to light up in the live graph
}

export const NIMBUS_DECISIONS: Decision[] = [
  // ── Pricing ─────────────────────────────────────────────────────────────
  {
    id: "pricing-usage",
    lane: "Pricing",
    title: "Launch on usage-based pricing",
    date: "2026-01-14",
    quarter: "Q1 2026",
    owner: "Sarah",
    role: "PM",
    channel: "#product",
    why: "Aligns cost with value and lands usage-heavy enterprise accounts.",
    sourceQuote: "Let's launch metered — customers only pay for what they use, it's the fairest model.",
    status: "superseded",
    tag: "pricing",
    graphTerms: ["pricing", "usage-based", "Sarah"],
  },
  {
    id: "pricing-flat",
    lane: "Pricing",
    title: "Move everyone to flat-tier pricing",
    date: "2026-04-09",
    quarter: "Q2 2026",
    owner: "Sarah",
    role: "PM",
    channel: "#product",
    why: "Usage-based drove 9% monthly churn — buyers wanted a predictable bill they could forecast.",
    sourceQuote: "Metered is killing us — 9% churn. We're moving everyone to three flat tiers.",
    status: "current",
    reverses: "pricing-usage",
    tag: "pricing",
    graphTerms: ["pricing", "flat", "tier", "Sarah"],
  },

  // ── Database ────────────────────────────────────────────────────────────
  {
    id: "db-selfpg",
    lane: "Database",
    title: "Self-manage Postgres on EC2",
    date: "2026-02-03",
    quarter: "Q1 2026",
    owner: "Teddy",
    role: "Infra",
    channel: "#eng",
    why: "Full control over tuning and no managed-service lock-in.",
    sourceQuote: "We'll run our own Postgres on EC2 — gives us control and keeps costs down.",
    status: "superseded",
    tag: "infra",
    graphTerms: ["Postgres", "self-managed", "Teddy", "database"],
  },
  {
    id: "db-neon",
    lane: "Database",
    title: "Migrate to Neon (managed Postgres)",
    date: "2026-05-20",
    quarter: "Q2 2026",
    owner: "Teddy",
    role: "Infra",
    channel: "#eng",
    why: "Two outages from manual failover and heavy on-call load — managed branching pays for itself.",
    sourceQuote: "The on-call burden isn't worth it. Migrating to Neon — managed, branching, autoscaling.",
    status: "current",
    reverses: "db-selfpg",
    tag: "infra",
    graphTerms: ["Neon", "managed", "Postgres", "database", "Teddy"],
  },

  // ── Public API (a DOUBLE reversal — the dramatic one) ────────────────────
  {
    id: "api-rest1",
    lane: "Public API",
    title: "Ship the public API as REST v1",
    date: "2026-01-28",
    quarter: "Q1 2026",
    owner: "Raj",
    role: "Head of Eng",
    channel: "#eng",
    why: "Simple, well-understood, fast to ship for launch.",
    sourceQuote: "For v1 let's just do REST — everyone knows it, we can ship this sprint.",
    status: "superseded",
    tag: "api",
    graphTerms: ["REST", "API", "Raj"],
  },
  {
    id: "api-graphql",
    lane: "Public API",
    title: "Rebuild the API in GraphQL",
    date: "2026-03-16",
    quarter: "Q1 2026",
    owner: "Raj",
    role: "Head of Eng",
    channel: "#eng",
    why: "The dashboard needs flexible nested queries; REST endpoints were multiplying.",
    sourceQuote: "REST is sprawling. Let's move the public API to GraphQL for flexible queries.",
    status: "superseded",
    reverses: "api-rest1",
    tag: "api",
    graphTerms: ["GraphQL", "API", "Raj"],
  },
  {
    id: "api-rest2",
    lane: "Public API",
    title: "Go back to REST + a typed SDK",
    date: "2026-07-08",
    quarter: "Q3 2026",
    owner: "Raj",
    role: "Head of Eng",
    channel: "#eng",
    why: "GraphQL added ops complexity and rate-limiting pain; customers just wanted simple REST with an SDK.",
    sourceQuote: "GraphQL was a mistake for a public API. Back to REST, and we'll ship a typed SDK.",
    status: "current",
    reverses: "api-graphql",
    tag: "api",
    graphTerms: ["REST", "SDK", "API", "Raj"],
  },

  // ── Ownership / bus-factor ───────────────────────────────────────────────
  {
    id: "own-auth",
    lane: "Ownership",
    title: "Auth & billing security owned solely by Priya",
    date: "2026-03-05",
    quarter: "Q1 2026",
    owner: "Priya",
    role: "Staff Eng",
    channel: "#eng",
    why: "She built it end-to-end and iterates fastest — but she is the only one who understands it.",
    sourceQuote: "Priya owns auth and billing security end to end — she's fastest on it.",
    status: "at-risk",
    tag: "ownership",
    graphTerms: ["Priya", "auth", "billing", "security"],
  },

  // ── Reliability (a DUPLICATE-work pair) ──────────────────────────────────
  {
    id: "rel-retry-payments",
    lane: "Reliability",
    title: "Payments team builds a retry queue",
    date: "2026-04-22",
    quarter: "Q2 2026",
    owner: "Karthik",
    role: "Backend (Payments)",
    channel: "#payments",
    why: "Failed webhooks needed durable retries for billing correctness.",
    sourceQuote: "I'm adding a retry queue for failed payment webhooks this sprint.",
    status: "current",
    tag: "reliability",
    graphTerms: ["retry queue", "Karthik", "payments"],
  },
  {
    id: "rel-retry-platform",
    lane: "Reliability",
    title: "Platform team builds a retry queue",
    date: "2026-06-11",
    quarter: "Q2 2026",
    owner: "Lena",
    role: "Backend (Platform)",
    channel: "#platform",
    why: "Needed durable retries for outbound events — unaware Payments already built one.",
    sourceQuote: "Starting on a generic retry queue for platform events.",
    status: "current",
    tag: "reliability",
    graphTerms: ["retry queue", "Lena", "platform"],
  },

  // ── Company ──────────────────────────────────────────────────────────────
  {
    id: "co-atlas",
    lane: "Company",
    title: "Kick off Project Atlas",
    date: "2026-06-02",
    quarter: "Q2 2026",
    owner: "Maya",
    role: "CEO",
    channel: "#leadership",
    why: "Confidential strategic initiative (details restricted).",
    sourceQuote: "Starting Project Atlas — keep this confidential for now.",
    status: "current",
    confidential: true,
    tag: "company",
    graphTerms: ["Atlas", "project"],
  },
  {
    id: "co-soc2",
    lane: "Company",
    title: "Commit to SOC 2 Type II",
    date: "2026-07-20",
    quarter: "Q3 2026",
    owner: "Maya",
    role: "CEO",
    channel: "#leadership",
    why: "Enterprise deals now require it in security review.",
    sourceQuote: "We're committing to SOC 2 Type II — it's blocking two enterprise deals.",
    status: "current",
    tag: "company",
    graphTerms: ["SOC 2", "compliance", "Maya"],
  },
];

// Fixed lane order (top→bottom in the swimlane).
export const LANES = ["Pricing", "Database", "Public API", "Reliability", "Ownership", "Company"];

const byId = new Map(NIMBUS_DECISIONS.map((d) => [d.id, d]));
export const decisionById = (id: string): Decision | undefined => byId.get(id);

/** ms timestamp for a decision's date (stable, no Date.now involved). */
export const decisionTime = (d: Decision): number => Date.parse(d.date);

/** [minTime, maxTime] across the ledger, for positioning on the axis. */
export function decisionExtent(list: Decision[] = NIMBUS_DECISIONS): [number, number] {
  const ts = list.map(decisionTime);
  return [Math.min(...ts), Math.max(...ts)];
}

/** The reversal chains (older → newer), for arrows and the "N reversals" count. */
export function reversalPairs(list: Decision[] = NIMBUS_DECISIONS): Array<{ from: Decision; to: Decision }> {
  const pairs: Array<{ from: Decision; to: Decision }> = [];
  for (const d of list) {
    if (d.reverses) {
      const from = byId.get(d.reverses);
      if (from) pairs.push({ from, to: d });
    }
  }
  return pairs;
}

/** Decisions related to a clicked graph node (matched on its label/terms/owner).
 *  Powers the "click a node → its decision history" popover in the graph view. */
export function decisionsForLabel(label: string): Decision[] {
  const q = (label || "").toLowerCase().trim();
  if (q.length < 2) return [];
  return NIMBUS_DECISIONS.filter(
    (d) =>
      d.owner.toLowerCase() === q ||
      d.title.toLowerCase().includes(q) ||
      d.graphTerms.some((t) => {
        const tl = t.toLowerCase();
        return q.includes(tl) || tl.includes(q);
      }),
  ).sort((a, b) => decisionTime(a) - decisionTime(b));
}

/** Decisions referenced by a free-text answer/question — powers the "timeline
 *  behind the answer" strip under an Ask/Voice response. */
export function decisionsForText(text: string): Decision[] {
  const q = (text || "").toLowerCase();
  if (q.length < 3) return [];
  return NIMBUS_DECISIONS.filter(
    (d) => q.includes(d.owner.toLowerCase()) || d.graphTerms.some((t) => q.includes(t.toLowerCase())),
  ).sort((a, b) => decisionTime(a) - decisionTime(b));
}

export const laneColor: Record<string, string> = {
  Pricing: "var(--accent)",
  Database: "var(--duplicate)",
  "Public API": "oklch(0.6 0.15 300)",
  Reliability: "var(--signal)",
  Ownership: "var(--ownership)",
  Company: "var(--ink-dim)",
};
