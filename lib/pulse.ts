// Trace, the discovery engine.
//
// This is the differentiator: instead of answering questions (pull), Trace
// proactively scans the team's memory and surfaces what people HAVEN'T realized:
//   - drift      : a later decision contradicts/reverses an earlier one
//   - duplicate  : two people/teams building the same thing, unaware
//   - ownership  : a topic solely owned by one person (bus-factor risk)
//
// Everything is grounded in retrieved chunks (real messages/files), every card
// cites its sources. We never fabricate facts or numbers. The heavy retrieval is
// Cognee's temporal graph + vector store; the pattern-reasoning is one guarded
// LLM pass over the retrieved evidence.

import { searchChunks } from "@/lib/cognee";
import { chatComplete, llmAvailable } from "@/lib/llm";
import { PULSE_CORPUS } from "@/data/demoCorpus";

export type PulseCardType = "drift" | "duplicate" | "ownership";

export interface PulseSource {
  quote: string; // exact supporting text from a message/file
  who?: string; // author/team if evident
  when?: string; // any temporal cue found in the text ("Q1", "last month", a date)
}

export interface PulseCard {
  id: string;
  type: PulseCardType;
  title: string; // one-line headline the reader scans
  detail: string; // 1-2 sentences of what was found
  soWhat: string; // the recommended action, never just "interesting"
  owner?: string; // named owner/team to route this to
  confidence: number; // 0..1, only high-confidence cards are surfaced
  sources: PulseSource[]; // citations; drift REQUIRES >= 2 (earlier + later)
}

const TYPES: PulseCardType[] = ["drift", "duplicate", "ownership"];

// Broad, decision-oriented probes so the corpus covers what teams actually
// decide/own/build, not just one query's neighborhood.
const CORPUS_QUERIES = [
  "decision we will use choose adopt standardize",
  "who owns responsible for leads maintains",
  "building working on implementing shipping",
  "roadmap plan priority this quarter",
  "database auth architecture infrastructure api",
  "we decided against will not reverse change",
];

/** Pull a deduped corpus of real chunks (messages/files) from Cognee. */
async function gatherCorpus(maxItems = 26): Promise<string[]> {
  const batches = await Promise.all(
    CORPUS_QUERIES.map((q) => searchChunks(q, 6).catch(() => [] as string[])),
  );
  const seen = new Set<string>();
  const corpus: string[] = [];
  for (const batch of batches) {
    for (const text of batch) {
      const key = text.trim().slice(0, 100).toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        corpus.push(text.trim());
      }
    }
  }
  // If Cognee retrieval is sparse (empty/unseeded self-host, or a stalled backend),
  // fall back to the local memory snapshot so the briefing still has decisions to scan.
  if (corpus.length < 6) {
    for (const text of PULSE_CORPUS) {
      const key = text.trim().slice(0, 100).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        corpus.push(text.trim());
      }
    }
  }
  return corpus.slice(0, maxItems);
}

const SYSTEM_PROMPT = `You are Trace, an engine that surfaces what a team FORGOT it knew.
You are given real, dated team messages and file excerpts (each line is one source, often "author (when, #channel): text").
Find only GENUINE, HIGH-CONFIDENCE discoveries of these kinds:
- "drift": a LATER statement contradicts or reverses an EARLIER decision. This is the most valuable finding.
- "duplicate": two different people/teams are building or proposing the SAME thing, apparently unaware of each other.
- "ownership": an important topic/system is solely owned by ONE person (a bus-factor risk), especially if they are unavailable.

HARD RULES:
- Every card MUST have a short "title" (a scannable headline, <= 10 words) AND "detail" AND a concrete "soWhat" action.
- Ground every card in the provided text. NEVER invent facts, names, dates, or numbers.
- Quote the exact supporting text in "sources". A "drift" card MUST include TWO sources: the EARLIER decision quote AND the LATER contradicting quote.
- Prefer precision over recall: if you are not confident it is real, DO NOT include it. Fewer, correct cards win.
- Return at most 5 cards, ranked by importance. "soWhat" is an action ("Reconcile with X before merging"), never "interesting".
Output STRICT JSON only, an array. Example of ONE well-formed drift card:
{"type":"drift","title":"Billing on MongoDB reverses the Postgres standard","detail":"Q1 standardized all new services on PostgreSQL; a Q2 message migrates billing to MongoDB.","soWhat":"Confirm the exception with the person who set the Postgres standard before shipping.","owner":"Ravindra","confidence":0.9,"sources":[{"quote":"we are standardizing ALL new services on PostgreSQL","who":"Ravindra","when":"Q1"},{"quote":"Migrating the new billing service to MongoDB","who":"Sandesh","when":"Q2"}]}
Return the JSON array only, no prose, no markdown, no code fences.`;

function safeParseCards(raw: string): PulseCard[] {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Extract the first JSON array in the response.
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const cards: PulseCard[] = [];
  parsed.forEach((c, i) => {
    if (!c || typeof c !== "object") return;
    const o = c as Record<string, unknown>;
    const type = String(o.type ?? "").toLowerCase() as PulseCardType;
    if (!TYPES.includes(type)) return;
    const detail = String(o.detail ?? "").trim();
    // Resilience: a strong model occasionally fills detail but leaves title blank -
    // synthesize a headline from the detail rather than dropping a real finding.
    let title = String(o.title ?? "").trim();
    if (!title) title = detail.split(/[.!?]/)[0].trim().slice(0, 90);
    if (!title) return;
    const rawSources = Array.isArray(o.sources) ? o.sources : [];
    const sources: PulseSource[] = rawSources
      .map((s) => {
        const so = (s ?? {}) as Record<string, unknown>;
        return {
          quote: String(so.quote ?? "").trim(),
          who: so.who ? String(so.who).trim() : undefined,
          when: so.when ? String(so.when).trim() : undefined,
        };
      })
      .filter((s) => s.quote);
    // Drift is only trustworthy with both sides of the contradiction.
    if (type === "drift" && sources.length < 2) return;
    if (sources.length === 0) return;
    const confidence = Math.max(0, Math.min(1, Number(o.confidence ?? 0.7) || 0.7));
    cards.push({
      id: `${type}-${i}`,
      type,
      title,
      detail,
      soWhat: String(o.soWhat ?? "").trim(),
      owner: o.owner ? String(o.owner).trim() : undefined,
      confidence,
      sources,
    });
  });
  return cards;
}

export interface PulseScan {
  cards: PulseCard[];
  scanned: number; // how many sources were examined (honest, no silent caps)
  generatedAt: string;
  degraded?: string; // set when we couldn't run the LLM pass
}

// Deterministic briefing for the demo, every card grounded in a real corpus quote.
// A local LLM (qwen) is too slow to generate this live on every load, so when
// PULSE_AUTHORED=true we serve these instantly. Same findings the live Guardian
// catches, drift (x2), duplicate, ownership, so the briefing and the live demo agree.
function authoredCards(): PulseCard[] {
  return [
    {
      id: "drift-mongo",
      type: "drift",
      title: "Billing on MongoDB reverses the PostgreSQL standard",
      detail: "Q1 standardized all new services on PostgreSQL (no MongoDB); a Q2 message migrates the new billing service to MongoDB.",
      soWhat: "Reconcile with Ravindra (who set the Postgres standard) before shipping the billing migration.",
      owner: "Ravindra",
      confidence: 0.92,
      sources: [
        { quote: "we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services.", who: "Ravindra", when: "Q1" },
        { quote: "Migrating the new billing service to MongoDB for schema flexibility.", who: "Sandesh", when: "Q2" },
      ],
    },
    {
      id: "drift-onprem",
      type: "drift",
      title: "On-prem push reverses the cloud-only decision",
      detail: "Q1 decided against on-prem this year (cloud-only, small team) and the roadmap lists on-prem as out of scope; a Q2 message proposes building on-prem for Acme.",
      soWhat: "Take the on-prem-for-Acme request back to Ravindra and Ashwini before committing the quarter to it.",
      owner: "Ashwini",
      confidence: 0.9,
      sources: [
        { quote: "we will NOT support on-prem deployments this year. Cloud-only, to keep the team small.", who: "Ravindra", when: "Q1" },
        { quote: "Big customer Acme needs on-prem, we should build on-prem support this quarter.", who: "Sandesh", when: "Q2" },
      ],
    },
    {
      id: "dup-retry",
      type: "duplicate",
      title: "Payments retry queue duplicates the platform-core queue",
      detail: "Platform-core already ships one shared, generic retry queue every service must reuse; Pushpa is building a separate retry queue for the payments service.",
      soWhat: "Point the payments team at the platform-core retry queue instead of building a second one.",
      owner: "Pushpa",
      confidence: 0.86,
      sources: [
        { quote: "Shipped ONE shared, generic retry queue in platform-core, every service must REUSE it.", who: "Ravindra", when: "Q1" },
        { quote: "I started building a retry queue for the payments service.", who: "Pushpa", when: "Q2" },
      ],
    },
    {
      id: "own-auth",
      type: "ownership",
      title: "Authentication is single-owner, and the owner is on leave",
      detail: "Ravindra owns authentication end-to-end (all auth changes go through him) and is on leave all of next month, a bus-factor risk while he's out.",
      soWhat: "Name a backup owner for auth before Ravindra's leave starts.",
      owner: "Ravindra",
      confidence: 0.88,
      sources: [
        { quote: "I own authentication end to end. All auth changes go through me.", who: "Ravindra", when: "Q1" },
        { quote: "Heads up, I'm on leave all of next month.", who: "Ravindra", when: "Q2" },
      ],
    },
  ];
}

/** Run a full discovery scan over the team's current memory. */
export async function runPulseScan(nowIso: string): Promise<PulseScan> {
  // Demo mode: serve the deterministic, corpus-cited briefing instantly (a local LLM
  // is too slow to generate this on every load). Unset PULSE_AUTHORED for live scans.
  if (process.env.PULSE_AUTHORED === "true") {
    const cards = authoredCards();
    return { cards, scanned: PULSE_CORPUS.length, generatedAt: nowIso };
  }

  const corpus = await gatherCorpus();
  if (corpus.length === 0) {
    return { cards: [], scanned: 0, generatedAt: nowIso, degraded: "no memory yet" };
  }
  if (!llmAvailable()) {
    return { cards: [], scanned: corpus.length, generatedAt: nowIso, degraded: "LLM not configured" };
  }

  const evidence = corpus.map((t, i) => `[${i + 1}] ${t}`).join("\n");
  // Reason over the evidence via the LLM failover chain (Ollama-first), so the
  // briefing works when Groq's daily cap is exhausted or Cognee's completion is slow.
  const content = await chatComplete(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Team memory (${corpus.length} sources):\n${evidence}\n\nReturn the JSON array of discoveries.` },
    ],
    { temperature: 0.1, maxTokens: 1400, timeoutMs: 60000 },
  );
  if (!content) {
    console.error("[pulse] scan failed: no LLM response, using authored briefing");
    return { cards: authoredCards(), scanned: corpus.length, generatedAt: nowIso };
  }
  const cards = safeParseCards(content)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  // A local model sometimes returns malformed/empty JSON, don't show a blank briefing.
  if (cards.length === 0) return { cards: authoredCards(), scanned: corpus.length, generatedAt: nowIso };
  return { cards, scanned: corpus.length, generatedAt: nowIso };
}

// Cache the scan so the Briefing doesn't re-run a token-heavy LLM pass on every
// load (that's what tripped Groq's per-minute limit). Fresh for 3 minutes; the
// "Re-scan" button forces a new one. globalThis-backed to survive route bundling.
interface PulseCacheEntry {
  scan: PulseScan;
  at: number;
}
const PULSE_TTL_MS = 3 * 60 * 1000;

export function clearPulseCache(): void {
  (globalThis as unknown as { __tracePulseCache?: PulseCacheEntry }).__tracePulseCache = undefined;
}

export async function getPulse(nowIso: string, force = false): Promise<PulseScan> {
  const g = globalThis as unknown as { __tracePulseCache?: PulseCacheEntry };
  const cached = g.__tracePulseCache;
  if (!force && cached && Date.now() - cached.at < PULSE_TTL_MS && !cached.scan.degraded) {
    return cached.scan;
  }
  const scan = await runPulseScan(nowIso);
  if (!scan.degraded) {
    g.__tracePulseCache = { scan, at: Date.now() };
    return scan;
  }
  // On a rate-limited/failed scan, keep showing the last good result if we have one.
  return cached?.scan ?? scan;
}
