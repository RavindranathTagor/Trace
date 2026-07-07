import type { GraphData, GraphNode, GraphEdge, RecallResult } from "@/lib/types";

// A hand-built decision graph mirroring the team's established decisions (see
// data/demoCorpus.ts / scripts/seed-demo.mjs). Used as the offline fallback so the
// UI (and the demo) keeps working before Cognee is wired, and if the live engine
// hiccups mid-demo. Cast: Ravindra (platform/infra), Ashwini (PM), Sandesh
// (billing), Pushpa (payments).

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
  N("p-ravindra", "Ravindra (Platform)", "Person"),
  N("p-ashwini", "Ashwini (PM)", "Person"),
  N("p-sandesh", "Sandesh (Billing)", "Person"),
  N("p-pushpa", "Pushpa (Payments)", "Person"),
  // Areas / projects
  N("proj-platform", "Platform Core", "Project"),
  N("proj-payments", "Payments Service", "Project"),
  N("proj-billing", "Billing Service", "Project"),
  N("proj-auth", "Authentication", "Project"),
  // Established decisions (current)
  N("d-postgres", "Standardize on PostgreSQL", "Decision", { date: "2026-01-15", status: "current" }),
  N("d-noonprem", "No on-prem this year (cloud-only)", "Decision", { date: "2026-01-15", status: "current" }),
  N("d-retryqueue", "Generic retry queue in platform-core", "Decision", { date: "2026-01-22", status: "current" }),
  // Conflicting / duplicate moves (what the Guardian catches)
  N("d-mongo", "Migrate billing to MongoDB", "Decision", { date: "2026-04-18", status: "at-risk" }),
  N("d-onprem-acme", "Build on-prem support for Acme", "Decision", { date: "2026-04-18", status: "at-risk" }),
  N("d-pay-retry", "Retry queue for payments service", "Decision", { date: "2026-04-20", status: "at-risk" }),
  // Reasons
  N("r-onedb", "One database to operate", "Reason"),
  N("r-smallteam", "Keep the team small", "Reason"),
  N("r-reuse", "Reuse across all services", "Reason"),
  N("r-flex", "Schema flexibility", "Reason"),
  N("r-acme", "Big customer Acme needs it", "Reason"),
  // Ownership / action items
  N("a-auth", "Owns authentication end-to-end", "ActionItem", { owner: "Ravindra", status: "at-risk" }),
  N("a-payments", "Owns payments service", "ActionItem", { owner: "Pushpa", status: "open" }),
  N("a-roadmap", "Q1 roadmap: reliability + analytics", "ActionItem", { owner: "Ashwini", status: "open" }),
  // Risk
  N("b-leave", "Ravindra on leave next month", "Blocker"),
];

const edges: GraphEdge[] = [
  // who made the established decisions
  E("p-ravindra", "d-postgres", "decided"),
  E("p-ravindra", "d-noonprem", "decided"),
  E("p-ravindra", "d-retryqueue", "decided"),
  E("p-ashwini", "d-noonprem", "argued_for"),
  // reasons
  E("d-postgres", "r-onedb", "because"),
  E("d-noonprem", "r-smallteam", "because"),
  E("d-retryqueue", "r-reuse", "because"),
  E("d-mongo", "r-flex", "because"),
  E("d-onprem-acme", "r-acme", "because"),
  // the catches: conflicts + duplicate
  E("d-mongo", "d-postgres", "conflicts_with"),
  E("d-onprem-acme", "d-noonprem", "conflicts_with"),
  E("d-pay-retry", "d-retryqueue", "duplicates"),
  // who proposed the conflicting moves
  E("p-sandesh", "d-mongo", "proposed"),
  E("p-sandesh", "d-onprem-acme", "proposed"),
  E("p-pushpa", "d-pay-retry", "proposed"),
  // decisions about which area
  E("d-mongo", "proj-billing", "about"),
  E("d-pay-retry", "proj-payments", "about"),
  E("d-retryqueue", "proj-platform", "about"),
  // ownership
  E("p-ravindra", "a-auth", "owns"),
  E("p-pushpa", "a-payments", "owns"),
  E("p-ashwini", "a-roadmap", "owns"),
  E("a-auth", "proj-auth", "about"),
  E("a-payments", "proj-payments", "about"),
  // bus-factor risk: Ravindra owns auth AND is going on leave
  E("b-leave", "a-auth", "blocks"),
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

// Ordered MOST-SPECIFIC FIRST (mockRecall uses Array.find -> first match wins).
const ANSWERS: MockAnswer[] = [
  {
    match: (q) => q.includes("mongo") || q.includes("database") || q.includes("postgres") || q.includes("db "),
    answer:
      "The team standardized on PostgreSQL for all new services, no MongoDB for new services, to keep one database to operate. Ravindra set that decision. Moving the billing service to MongoDB would reverse it.",
    context:
      "Decision[Standardize on PostgreSQL, 2026-01-15] -because-> Reason[One database to operate]; Ravindra -decided-> it. Decision[Migrate billing to MongoDB] -conflicts_with-> PostgreSQL standard.",
    nodeIds: ["d-postgres", "r-onedb", "p-ravindra", "d-mongo"],
  },
  {
    match: (q) => q.includes("on-prem") || q.includes("on prem") || q.includes("onprem") || q.includes("acme") || q.includes("self-host"),
    answer:
      "On-prem is out of scope. Ravindra decided cloud-only this year to keep the team small, and Ashwini's Q1 roadmap explicitly lists on-prem as out of scope. Building on-prem for Acme would reverse that.",
    context:
      "Decision[No on-prem this year, 2026-01-15] -because-> Reason[Keep the team small]; Ashwini roadmap: on-prem out of scope. Decision[Build on-prem for Acme] -conflicts_with-> it.",
    nodeIds: ["d-noonprem", "r-smallteam", "p-ashwini", "d-onprem-acme"],
  },
  {
    match: (q) => q.includes("retry") || q.includes("queue"),
    answer:
      "There is already a generic retry queue in platform-core (Ravindra, PR #412) meant for all services to reuse. Building a separate retry queue for the payments service would duplicate it, reuse platform-core instead.",
    context:
      "Decision[Generic retry queue in platform-core, 2026-01-22] -because-> Reason[Reuse across all services]. Decision[Retry queue for payments] -duplicates-> it.",
    nodeIds: ["d-retryqueue", "r-reuse", "p-ravindra", "d-pay-retry"],
  },
  {
    match: (q) => q.includes("auth") || q.includes("who owns") || q.includes("ownership") || q.includes("leave") || q.includes("bus"),
    answer:
      "Ravindra owns authentication end-to-end, all auth changes go through him. Heads up: he's on leave all of next month, so auth is a single-owner / bus-factor risk while he's out. Pushpa owns the payments service.",
    context:
      "Ravindra -owns-> Authentication (at-risk); Ravindra on leave next month -blocks-> auth ownership. Pushpa -owns-> Payments.",
    nodeIds: ["a-auth", "p-ravindra", "b-leave", "a-payments", "p-pushpa"],
  },
  {
    match: (q) => q.includes("changed") || q.includes("drift") || q.includes("conflict") || q.includes("reverse"),
    answer:
      "Three recent moves conflict with established decisions: migrating billing to MongoDB (vs the PostgreSQL standard), building on-prem for Acme (vs cloud-only), and a payments retry queue (duplicates the platform-core queue).",
    context:
      "MongoDB -conflicts_with-> PostgreSQL standard; On-prem for Acme -conflicts_with-> cloud-only; Payments retry queue -duplicates-> platform-core retry queue.",
    nodeIds: ["d-mongo", "d-postgres", "d-onprem-acme", "d-noonprem", "d-pay-retry", "d-retryqueue"],
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
      "I searched the team's decision memory but didn't find a confident match. Try asking about the database (Postgres) standard, on-prem, the platform retry queue, or who owns auth.",
    context: "",
    nodeIds: [],
    source: "mock",
  };
}
