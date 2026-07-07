import type { Meeting } from "@/lib/types";

// A fake startup "Nimbus" across Q1-Q2 2026. The narrative is engineered so the
// hero demo questions are only answerable via multi-hop + temporal reasoning:
//   - Pricing: decided usage-based (Jan) -> REVERSED to flat-tier (Mar) because churn.
//   - Architecture: chose self-managed Postgres (Feb) -> REVERSED to managed Neon (Apr).
//   - Action items with owners + due dates (some now overdue).
//   - Project Atlas is confidential -> the "forget / redact" beat.
//   - Teddy owns several blocked items -> "who owns the most blocked items?".

export const sampleMeetings: Meeting[] = [
  {
    id: "m1-kickoff",
    date: "2026-01-12",
    title: "Q1 Kickoff",
    attendees: ["Maya", "Raj", "Sarah", "Priya"],
    text: `Q1 Kickoff, Jan 12, 2026. Attendees: Maya (CEO), Raj (Eng Lead), Sarah (PM), Priya (Sales).
Maya: Our goal this quarter is to launch the self-serve product.
DECISION: We will go with usage-based pricing ($0.10 per 1k API calls). Rationale: it lowers the barrier for new developers to start.
Sarah will own the pricing page. Raj will own the metering service.
ACTION: Sarah to ship the pricing page by Jan 26. ACTION: Raj to build usage metering by Feb 2.`,
  },
  {
    id: "m2-arch",
    date: "2026-02-04",
    title: "Architecture Review",
    attendees: ["Raj", "Teddy", "Maya"],
    text: `Architecture Review, Feb 4, 2026. Attendees: Raj (Eng Lead), Teddy (Infra), Maya (CEO).
DECISION: We will self-host PostgreSQL on our own VMs for the metering store. Rationale: Teddy argued it gives us full control and avoids vendor lock-in.
Teddy will own the database migration and on-call.
ACTION: Teddy to complete the self-managed Postgres migration by Feb 20.
Raj raised a concern that self-hosting will add on-call burden, but the team proceeded with Teddy's recommendation.`,
  },
  {
    id: "m3-standup-feb",
    date: "2026-02-18",
    title: "Standup, mid Feb",
    attendees: ["Raj", "Sarah", "Teddy", "Priya"],
    text: `Standup, Feb 18, 2026.
Sarah: pricing page shipped on time. Raj: usage metering is live.
Teddy: the Postgres migration is BLOCKED on a networking issue with the VPC; slipping past Feb 20.
ACTION: Teddy to unblock the VPC networking for the Postgres migration by Feb 25 (now overdue).
Priya: two enterprise leads are asking for predictable monthly bills, not usage-based.`,
  },
  {
    id: "m4-pricing-debate",
    date: "2026-03-09",
    title: "Pricing Strategy Debate",
    attendees: ["Maya", "Sarah", "Priya", "Raj"],
    text: `Pricing Strategy Debate, Mar 9, 2026. Attendees: Maya (CEO), Sarah (PM), Priya (Sales), Raj (Eng Lead).
Priya presented data: churn hit 9% last month and three customers cited unpredictable usage-based bills as the reason they left.
DECISION: We are REVERSING the January pricing decision. We will move from usage-based pricing to flat-tier pricing (Starter $49, Pro $199, Enterprise custom). This SUPERSEDES the usage-based decision from the Q1 kickoff. Rationale: reduce churn and give customers predictable bills.
ACTION: Sarah to rebuild the pricing page for flat tiers by Mar 20. ACTION: Raj to keep metering for internal analytics only.`,
  },
  {
    id: "m5-atlas",
    date: "2026-03-23",
    title: "Project Atlas (Confidential)",
    attendees: ["Maya", "Raj"],
    text: `Project Atlas, Mar 23, 2026. CONFIDENTIAL. Attendees: Maya (CEO), Raj (Eng Lead).
DECISION: We will quietly explore an acquisition of a competitor under the codename Project Atlas. This is strictly confidential and must not be shared outside this room.
ACTION: Maya to prepare the Project Atlas diligence doc by Apr 1.`,
  },
  {
    id: "m6-arch-reversal",
    date: "2026-04-07",
    title: "Infra Retro",
    attendees: ["Raj", "Teddy", "Maya"],
    text: `Infra Retro, Apr 7, 2026. Attendees: Raj (Eng Lead), Teddy (Infra), Maya (CEO).
The self-managed Postgres migration caused two outages and three weeks of on-call pain.
DECISION: We are REVERSING the February architecture decision. We will drop self-managed Postgres and move to managed Neon Postgres. This SUPERSEDES the self-hosted Postgres decision. Rationale: the operational burden of self-hosting outweighed the control benefits.
ACTION: Teddy to migrate to managed Neon by Apr 21. Teddy is still the owner of the database and remains blocked on the data backfill.`,
  },
  {
    id: "m7-standup-apr",
    date: "2026-04-20",
    title: "Standup, late Apr",
    attendees: ["Raj", "Sarah", "Teddy", "Priya"],
    text: `Standup, Apr 20, 2026.
Sarah: flat-tier pricing page is live; early signups look healthy and churn is trending down.
Teddy: the Neon migration is BLOCKED on the data backfill; also still BLOCKED on decommissioning the old VMs. Two open blockers on me.
ACTION: Teddy to finish the Neon backfill by Apr 28. Priya: enterprise pipeline is up 20% since flat pricing.`,
  },
];

/** Concatenate a meeting into the text blob sent to Cognee `add`. */
export function meetingToText(m: Meeting): string {
  return m.text.trim();
}

/** All sample meetings as ingestible text blobs. */
export function allMeetingTexts(): string[] {
  return sampleMeetings.map(meetingToText);
}
