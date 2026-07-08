import { describe, it, expect } from "vitest";
import { classify, align, extractChoices, isAlertKind, CAR_THRESHOLDS, type ContradictionKind, type SimFn } from "@/lib/contradiction";

// Benchmark for Contradiction-Aware Retrieval (CAR), DOMAIN-GENERAL version.
//
// No hardcoded vocabulary. Semantic similarity comes from a REAL embedding model
// (nomic-embed-text via Ollama). The claim: pure embedding SIMILARITY cannot separate a
// contradiction from a same-topic agreement (both are "about the same thing"); CAR's
// stance layer can, with zero LLM calls for detection.
//
// Requires Ollama on localhost:11434 with nomic-embed-text pulled. If unavailable, the
// test skips (so CI without Ollama does not fail).

const OLLAMA = process.env.OLLAMA_BASE_URL?.replace(/\/v1$/, "") || "http://localhost:11434";

async function embed(text: string): Promise<number[] | null> {
  try {
    const r = await fetch(`${OLLAMA}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: "search_query: " + text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { embedding?: number[] };
    return j.embedding ?? null;
  } catch {
    return null;
  }
}
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const DECISIONS = {
  DB: "We are standardizing all new services on PostgreSQL. No more MongoDB for new services.",
  DEPLOY: "We will not support on-prem this year. Cloud-only, to keep the team small.",
  RETRY: "Added a generic retry queue in platform-core for all services to reuse.",
  API: "The public API is REST with a typed SDK.",
  AUTH: "Auth uses OAuth via our identity provider.",
  RUNTIME: "We deploy on Kubernetes.",
  FE: "The frontend is built in React.",
  // deliberately NON-engineering, to prove domain-generality:
  DESIGN: "The design team standardized on Figma for all product design work.",
  ACCT: "Finance standardized on NetSuite as our accounting system.",
};

interface Case { claim: string; decision: keyof typeof DECISIONS; gold: ContradictionKind }

const CASES: Case[] = [
  { claim: "Migrating the billing service to MongoDB for schema flexibility.", decision: "DB", gold: "drift" },
  { claim: "Let's just ship an on-prem deployment for Acme this quarter.", decision: "DEPLOY", gold: "drift" },
  { claim: "I'm going to move the public API to GraphQL.", decision: "API", gold: "drift" },
  { claim: "Switching auth over to SAML.", decision: "AUTH", gold: "drift" },
  { claim: "Thinking we move new services to DynamoDB.", decision: "DB", gold: "drift" },
  { claim: "Let's run this new service on bare-metal instead of Kubernetes.", decision: "RUNTIME", gold: "drift" },
  { claim: "Rewrite the frontend in Svelte.", decision: "FE", gold: "drift" },
  { claim: "The new mocks are going in Sketch this sprint.", decision: "DESIGN", gold: "drift" },
  { claim: "Let's move accounting to QuickBooks.", decision: "ACCT", gold: "drift" },
  { claim: "I started building a retry queue for the payments service.", decision: "RETRY", gold: "duplicate" },

  // same topic, NOT a contradiction (the precision traps)
  { claim: "Let's tune our PostgreSQL indexes for the reporting queries.", decision: "DB", gold: "none" },
  { claim: "We should upgrade Postgres to v16.", decision: "DB", gold: "none" },
  { claim: "Our cloud costs went up this month.", decision: "DEPLOY", gold: "none" },
  { claim: "Documenting the REST API endpoints.", decision: "API", gold: "none" },
  { claim: "Rotating the OAuth client secrets.", decision: "AUTH", gold: "none" },
  { claim: "Scaling the Kubernetes cluster for the traffic spike.", decision: "RUNTIME", gold: "none" },
  { claim: "The retry queue in platform-core had a bug, we fixed it.", decision: "RETRY", gold: "none" },
  { claim: "Exporting the Figma components to a shared library.", decision: "DESIGN", gold: "none" },
  { claim: "Reconciling last month's invoices in NetSuite.", decision: "ACCT", gold: "none" },
  { claim: "Confirmed we're staying on PostgreSQL for the new analytics service.", decision: "DB", gold: "none" },

  // unrelated
  { claim: "Team lunch on Friday.", decision: "DB", gold: "none" },
  { claim: "Standup moved to 10am.", decision: "RETRY", gold: "none" },
  { claim: "Good morning everyone.", decision: "DEPLOY", gold: "none" },
];

// reaffirm is a real relation but NOT an alert (it strengthens memory, never interrupts),
// so for the precision/recall of "should we ping a human" it counts as silent.
const isAlert = (k: ContradictionKind) => isAlertKind(k);
function prf(preds: boolean[], gold: boolean[]) {
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] && gold[i]) tp++;
    else if (preds[i] && !gold[i]) fp++;
    else if (!preds[i] && gold[i]) fn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1, tp, fp, fn };
}

describe("Contradiction-Aware Retrieval benchmark (embeddings, domain-general)", () => {
  it("beats the embedding-similarity baseline with zero LLM calls", async () => {
    // Collect every string that needs an embedding: claims, decisions, and their choices.
    const strings = new Set<string>();
    for (const c of CASES) {
      strings.add(c.claim);
      strings.add(DECISIONS[c.decision]);
      for (const ch of extractChoices(c.claim)) strings.add(ch.phrase);
      for (const ch of extractChoices(DECISIONS[c.decision])) strings.add(ch.phrase);
    }
    const cache = new Map<string, number[]>();
    for (const s of Array.from(strings)) {
      const e = await embed(s);
      if (!e) {
        // eslint-disable-next-line no-console
        console.warn("Ollama/nomic-embed-text unavailable, skipping CAR benchmark.");
        return;
      }
      cache.set(s, e);
    }
    const sim: SimFn = (a, b) => {
      const ea = cache.get(a), eb = cache.get(b);
      return ea && eb ? Math.max(0, cosine(ea, eb)) : 0;
    };

    // Diagnostics: real cosine bands, so the thresholds are grounded, not guessed.
    const same = sim("postgresql", "postgres");
    const cat = sim("postgresql", "mongodb");
    const unrel = sim("postgresql", "team lunch");
    // eslint-disable-next-line no-console
    console.log(`\ncosine diagnostics (nomic): same(postgres,postgresql)=${same.toFixed(2)} category(postgres,mongodb)=${cat.toFixed(2)} unrelated(postgres,lunch)=${unrel.toFixed(2)}`);

    const goldAlert = CASES.map((c) => isAlert(c.gold));

    // Baseline: pure embedding similarity, best-case threshold (sweep tau).
    const sims = CASES.map((c) => sim(c.claim, DECISIONS[c.decision]));
    let baseBest = { f1: -1, tau: 0, precision: 0, recall: 0 };
    for (let tau = 0.3; tau <= 0.95; tau += 0.01) {
      const m = prf(sims.map((s) => s >= tau), goldAlert);
      if (m.f1 > baseBest.f1) baseBest = { f1: m.f1, tau: Number(tau.toFixed(2)), precision: m.precision, recall: m.recall };
    }

    // CAR.
    const car = CASES.map((c) => classify(c.claim, DECISIONS[c.decision], sim));
    const carPreds = car.map((r) => isAlert(r.kind));
    const carM = prf(carPreds, goldAlert);

    let kindRight = 0, kindTotal = 0;
    CASES.forEach((c, i) => { if (isAlert(c.gold)) { kindTotal++; if (car[i].kind === c.gold) kindRight++; } });

    const naiveLlm = sims.filter((s) => s >= CAR_THRESHOLDS.topicGate).length; // judge every same-topic candidate
    const carLlm = carPreds.filter(Boolean).length; // only cite confirmed

    const misses = CASES.map((c, i) => ({ c, r: car[i] })).filter(({ c, r }) => isAlert(c.gold) !== isAlert(r.kind));
    // eslint-disable-next-line no-console
    console.log(
      `\n=== CAR vs embedding-similarity baseline (${CASES.length} cases, ${goldAlert.filter(Boolean).length} alerts) ===\n` +
      `baseline (best tau=${baseBest.tau}): precision ${(baseBest.precision * 100).toFixed(0)}%  recall ${(baseBest.recall * 100).toFixed(0)}%  F1 ${(baseBest.f1 * 100).toFixed(0)}%\n` +
      `CAR (0 LLM to detect):            precision ${(carM.precision * 100).toFixed(0)}%  recall ${(carM.recall * 100).toFixed(0)}%  F1 ${(carM.f1 * 100).toFixed(0)}%\n` +
      `CAR kind accuracy: ${kindRight}/${kindTotal}   LLM calls: naive=${naiveLlm} CAR=${carLlm} (${Math.round((1 - carLlm / Math.max(1, naiveLlm)) * 100)}% fewer)\n` +
      (misses.length ? "misses:\n" + misses.map(({ c, r }) => `  gold=${c.gold} got=${r.kind} topic=${r.topicSim.toFixed(2)} :: ${c.claim}`).join("\n") : "no misses"),
    );

    expect(carM.f1).toBeGreaterThan(baseBest.f1 + 0.15);
    expect(carM.precision).toBeGreaterThanOrEqual(0.85);
    expect(carLlm).toBeLessThan(naiveLlm);
  }, 60000);

  // The temporal USP: a message TODAY must be caught against a decision made long ago.
  // CAR takes only text and never looks at recency, so an old decision buried among many
  // fresh unrelated messages still surfaces as the top match. Uses lexicalSim (no infra).
  it("is age-blind: catches a months-old decision buried in recent chatter", () => {
    const oldDecision = "Q1 2024: we standardized on PostgreSQL for all new services, no more MongoDB.";
    const recentNoise = [
      "lunch is at 1pm today",
      "the deploy finished, all green",
      "can someone review PR 5123",
      "standup moved to 10:30 tomorrow",
      "coffee machine on 3rd floor is broken",
      "welcome to the new intern on the data team",
      "reminder: submit timesheets by friday",
      "the staging DB was restarted",
    ];
    const memory = [...recentNoise, oldDecision]; // old decision is LAST (most-buried)
    const todayClaim = "Kicking off the new analytics service on MongoDB for flexibility.";

    const hits = align(todayClaim, memory); // lexicalSim, no embeddings needed
    expect(hits.length).toBeGreaterThan(0);
    // The old, buried decision is the top relation, not any of the recent noise.
    expect(hits[0].memory).toBe(oldDecision);
    expect(hits[0].result.kind).toBe("drift");

    // And reaffirmation is detected (signal, not alert): restating the standing decision.
    const reaffirm = classify("Confirming we're staying on PostgreSQL for the new billing service.", oldDecision);
    expect(reaffirm.kind).toBe("reaffirm");
    expect(isAlertKind(reaffirm.kind)).toBe(false);
  });
});
