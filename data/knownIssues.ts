// Seeded "known issues" for the Company-Brain pre-code context pack. Trace doesn't
// model bugs as first-class yet, so the pack blends these curated entries with
// Cognee-derived caveats and open GitHub issues (see /api/brain/context). Authored
// to match the Nimbus decision history in data/decisions.ts.

export type Severity = "low" | "medium" | "high";

export interface KnownIssue {
  id: string;
  area: string; // matches a decision lane where possible (Database, Auth, Public API…)
  issue: string;
  workaround: string;
  severity: Severity;
  source: string;
}

export const KNOWN_ISSUES: KnownIssue[] = [
  {
    id: "iss-neon-coldstart",
    area: "Database",
    issue: "Neon scale-to-zero adds ~800ms latency on the first query after idle.",
    workaround: "Disable scale-to-zero on prod branches, or keep a warm connection / cron ping.",
    severity: "medium",
    source: "eng notes",
  },
  {
    id: "iss-auth-refresh-race",
    area: "Auth",
    issue: "Token-refresh race under load can 401 concurrent requests when the token rotates.",
    workaround: "Single-flight the refresh and retry once on a 401 before surfacing an error.",
    severity: "high",
    source: "incident #142",
  },
  {
    id: "iss-billing-double-charge",
    area: "Billing",
    issue: "The retry queue can double-charge if a payment webhook is redelivered.",
    workaround: "Attach an idempotency key to every payment intent; dedupe on it before charging.",
    severity: "high",
    source: "payments post-mortem",
  },
  {
    id: "iss-graphql-deprecated",
    area: "Public API",
    issue: "Old GraphQL clients still hit the deprecated endpoint after the REST migration.",
    workaround: "Return 410 Gone with a Deprecation header pointing to the typed REST SDK.",
    severity: "low",
    source: "API migration",
  },
  {
    id: "iss-terraform-statelock",
    area: "Provisioning",
    issue: "Terraform state lock occasionally sticks in CI after a cancelled apply.",
    workaround: "Run `terraform force-unlock <id>` only after confirming no apply is in flight.",
    severity: "medium",
    source: "infra runbook",
  },
];
