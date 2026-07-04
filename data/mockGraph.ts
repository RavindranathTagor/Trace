import type { GraphData, GraphNode, GraphEdge, RecallResult } from "@/lib/types";

// A hand-built decision graph mirroring data/sampleMeetings.ts. Used as the
// offline fallback so the UI (and the demo) works before Cognee is wired, and
// if the live engine ever hiccups mid-demo.

const N = (
  id: string,
  label: string,
  type: GraphNode["type"],
  properties?: Record<string, unknown>,
): GraphNode => ({ id, label, type, properties });

const E = (source: string, target: string, label: string): GraphEdge => ({
  source,
  target,
  label,
});

const nodes: GraphNode[] = [
  // People
  N("p-maya", "Maya (CEO)", "Person"),
  N("p-raj", "Raj (Eng Lead)", "Person"),
  N("p-sarah", "Sarah (PM)", "Person"),
  N("p-priya", "Priya (Sales)", "Person"),
  N("p-teddy", "Teddy (Infra)", "Person"),
  // Projects
  N("proj-selfserve", "Self-Serve Product", "Project"),
  N("proj-atlas", "Project Atlas", "Project", { confidential: true }),
  // Decisions
  N("d-pricing-usage", "Usage-based pricing", "Decision", { date: "2026-01-12", status: "superseded" }),
  N("d-pricing-flat", "Flat-tier pricing", "Decision", { date: "2026-03-09", status: "current" }),
  N("d-arch-postgres", "Self-managed Postgres", "Decision", { date: "2026-02-04", status: "superseded" }),
  N("d-arch-neon", "Managed Neon Postgres", "Decision", { date: "2026-04-07", status: "current" }),
  N("d-atlas", "Explore acquisition (Atlas)", "Decision", { date: "2026-03-23", confidential: true }),
  // Reasons
  N("r-barrier", "Lower barrier for devs", "Reason"),
  N("r-churn", "Churn 9% — unpredictable bills", "Reason"),
  N("r-control", "Full control, no lock-in", "Reason"),
  N("r-burden", "Ops/on-call burden too high", "Reason"),
  // Action items
  N("a-pricingpage", "Ship pricing page", "ActionItem", { owner: "Sarah", due: "2026-01-26", status: "done" }),
  N("a-metering", "Build usage metering", "ActionItem", { owner: "Raj", due: "2026-02-02", status: "done" }),
  N("a-pgmigration", "Self-managed Postgres migration", "ActionItem", { owner: "Teddy", due: "2026-02-20", status: "overdue" }),
  N("a-vpc", "Unblock VPC networking", "ActionItem", { owner: "Teddy", due: "2026-02-25", status: "overdue" }),
  N("a-flatpage", "Rebuild pricing page (flat)", "ActionItem", { owner: "Sarah", due: "2026-03-20", status: "done" }),
  N("a-neon", "Migrate to managed Neon", "ActionItem", { owner: "Teddy", due: "2026-04-21", status: "blocked" }),
  N("a-backfill", "Finish Neon data backfill", "ActionItem", { owner: "Teddy", due: "2026-04-28", status: "blocked" }),
  N("a-atlas-dd", "Atlas diligence doc", "ActionItem", { owner: "Maya", due: "2026-04-01", status: "open", confidential: true }),
  // Blockers
  N("b-vpc", "VPC networking issue", "Blocker"),
  N("b-backfill", "Data backfill", "Blocker"),
  N("b-vms", "Decommission old VMs", "Blocker"),
];

const edges: GraphEdge[] = [
  // supersession (temporal)
  E("d-pricing-flat", "d-pricing-usage", "supersedes"),
  E("d-arch-neon", "d-arch-postgres", "supersedes"),
  // reasons
  E("d-pricing-usage", "r-barrier", "because"),
  E("d-pricing-flat", "r-churn", "because"),
  E("d-arch-postgres", "r-control", "because"),
  E("d-arch-neon", "r-burden", "because"),
  // decisions about the product / atlas
  E("d-pricing-usage", "proj-selfserve", "about"),
  E("d-pricing-flat", "proj-selfserve", "about"),
  E("d-arch-postgres", "proj-selfserve", "about"),
  E("d-arch-neon", "proj-selfserve", "about"),
  E("d-atlas", "proj-atlas", "about"),
  E("a-atlas-dd", "proj-atlas", "about"),
  // ownership
  E("p-sarah", "a-pricingpage", "owns"),
  E("p-raj", "a-metering", "owns"),
  E("p-teddy", "a-pgmigration", "owns"),
  E("p-teddy", "a-vpc", "owns"),
  E("p-sarah", "a-flatpage", "owns"),
  E("p-teddy", "a-neon", "owns"),
  E("p-teddy", "a-backfill", "owns"),
  E("p-maya", "a-atlas-dd", "owns"),
  // who drove which decision
  E("p-priya", "d-pricing-flat", "argued_for"),
  E("p-teddy", "d-arch-postgres", "argued_for"),
  // blockers
  E("b-vpc", "a-pgmigration", "blocks"),
  E("b-backfill", "a-neon", "blocks"),
  E("b-vms", "a-neon", "blocks"),
];

export function getMockGraph(): GraphData {
  // deep copy so callers can mutate highlight flags
  return {
    nodes: nodes.map((n) => ({ ...n, properties: { ...n.properties } })),
    edges: edges.map((e) => ({ ...e })),
  };
}

interface MockAnswer {
  match: (q: string) => boolean;
  answer: string;
  context: string;
  nodeIds: string[];
}

// Ordered MOST-SPECIFIC FIRST (mockRecall uses Array.find -> first match wins):
// pricing-why before pricing-current; postgres/overdue/blocked before the
// generic "changed" summary; "changed" is the catch-all and comes last.
const ANSWERS: MockAnswer[] = [
  {
    match: (q) => q.includes("pricing") && (q.includes("why") || q.includes("decide") || q.includes("decision")),
    answer:
      "Pricing went through two decisions. Jan 12: usage-based ($0.10/1k calls) to lower the barrier for developers. Mar 9: reversed to flat tiers because churn hit 9% and customers wanted predictable bills. The flat-tier decision is current and supersedes the usage-based one.",
    context:
      "Decision[Usage-based, 2026-01-12] -because-> Reason[Lower barrier]; Decision[Flat-tier, 2026-03-09] -supersedes-> Usage-based; -because-> Reason[Churn 9%].",
    nodeIds: ["d-pricing-flat", "d-pricing-usage", "r-churn", "r-barrier"],
  },
  {
    match: (q) => q.includes("pricing") && (q.includes("current") || q.includes("now")),
    answer:
      "Your current pricing is flat-tier (Starter $49, Pro $199, Enterprise custom), decided on Mar 9, 2026. It superseded the original usage-based pricing from the Q1 kickoff. The change was made to reduce churn after three customers left citing unpredictable usage-based bills.",
    context:
      "Decision[Flat-tier pricing, 2026-03-09] -supersedes-> Decision[Usage-based pricing, 2026-01-12]; -because-> Reason[Churn 9% — unpredictable bills]; Priya -argued_for-> Flat-tier.",
    nodeIds: ["d-pricing-flat", "d-pricing-usage", "r-churn", "p-priya"],
  },
  {
    match: (q) =>
      q.includes("postgres") || q.includes("migration") || q.includes("neon") || q.includes("architecture") || q.includes("drop"),
    answer:
      "You dropped self-managed Postgres on Apr 7 and moved to managed Neon. The self-hosted approach (chosen Feb 4 for control) caused two outages and three weeks of on-call pain, so the operational burden outweighed the control benefits. Teddy owns the Neon migration and is still blocked on the data backfill.",
    context:
      "Decision[Managed Neon, 2026-04-07] -supersedes-> Decision[Self-managed Postgres, 2026-02-04]; -because-> Reason[Ops burden too high]; Teddy -owns-> Neon migration (blocked).",
    nodeIds: ["d-arch-neon", "d-arch-postgres", "r-burden", "p-teddy", "a-neon"],
  },
  {
    match: (q) => q.includes("overdue") || q.includes("assigned") || q.includes("my action") || q.includes("on me"),
    answer:
      "Overdue or blocked action items: Teddy has the Postgres migration (due Feb 20, overdue), the VPC unblock (due Feb 25, overdue), the Neon migration (due Apr 21, blocked) and the Neon backfill (due Apr 28, blocked). Teddy is the bottleneck on infrastructure.",
    context:
      "Teddy -owns-> [Postgres migration (overdue), VPC unblock (overdue), Neon migration (blocked), Neon backfill (blocked)].",
    nodeIds: ["p-teddy", "a-pgmigration", "a-vpc", "a-neon", "a-backfill"],
  },
  {
    match: (q) => q.includes("blocked") || q.includes("blocker") || q.includes("bottleneck"),
    answer:
      "Teddy owns the most blocked items. The Neon migration is blocked by the data backfill and by decommissioning the old VMs; the original Postgres migration was blocked by a VPC networking issue.",
    context:
      "Teddy -owns-> Neon migration <-blocks- [Data backfill, Decommission VMs]; Postgres migration <-blocks- VPC networking issue.",
    nodeIds: ["p-teddy", "a-neon", "b-backfill", "b-vms", "a-pgmigration", "b-vpc"],
  },
  {
    match: (q) => q.includes("changed") || q.includes("since q1") || q.includes("since january"),
    answer:
      "Since Q1, two decisions were reversed. Pricing changed from usage-based (Jan) to flat-tier (Mar) due to churn. Architecture changed from self-managed Postgres (Feb) to managed Neon (Apr) because the on-call burden was too high.",
    context:
      "Flat-tier -supersedes-> Usage-based; Managed Neon -supersedes-> Self-managed Postgres.",
    nodeIds: ["d-pricing-flat", "d-pricing-usage", "d-arch-neon", "d-arch-postgres"],
  },
];

export function mockRecall(query: string): RecallResult {
  const q = query.toLowerCase();
  const hit = ANSWERS.find((a) => a.match(q));
  if (hit) {
    return { answer: hit.answer, context: hit.context, nodeIds: hit.nodeIds, source: "mock" };
  }
  return {
    answer:
      "I searched the team's decision memory but didn't find a confident match. Try asking about pricing, the Postgres/Neon migration, what changed since Q1, or overdue action items.",
    context: "",
    nodeIds: [],
    source: "mock",
  };
}
