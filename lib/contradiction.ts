// Contradiction-Aware Retrieval (CAR).
//
// The novel primitive behind Trace's Guardian. Vector/semantic search answers "what is
// SIMILAR to X" and is BLIND to negation: "use PostgreSQL" and "use MongoDB" are highly
// similar vectors, so similarity finds them related but cannot tell you one reverses the
// other. Every other memory system (mem0, Zep/Graphiti, Cognee, Glean) is retrieval, so
// contradiction detection today falls back to an expensive, inconsistent
// LLM-judges-every-pair loop.
//
// CAR decomposes a claim into TOPIC (what it is about) and STANCE (the position, per
// choice), then:
//   - drift      = same topic + OPPOSING stance  (a reversal or a different choice in the
//                  same category)
//   - duplicate  = same topic + SAME stance + a build/create action (redundant work)
//   - none       = otherwise
//
// It is DOMAIN-GENERAL: there is NO hardcoded vocabulary of technologies. Whether two
// choices are alternatives in the same category ("Postgres" vs "MongoDB", "Figma" vs
// "Sketch", "NetSuite" vs "QuickBooks") is decided by an injected semantic similarity
// `sim(a,b)` (an embedding cosine in production), not a list. Stance comes from generic
// negation/substitution grammar. Candidate detection uses zero LLM calls; an LLM is spent
// only to WRITE the citation for a confirmed hit.

// The full relation set between a NEW claim and a PRIOR memory. This is what makes CAR a
// general temporal-alignment primitive rather than only an alarm:
//   drift      -> the new claim REVERSES the prior (alert)
//   duplicate  -> the new claim REDOES the prior work (alert)
//   reaffirm   -> the new claim RESTATES/COMMITS to the prior (signal: the decision is
//                 alive; feeds decision health, never alerts)
//   none       -> unrelated
export type ContradictionKind = "drift" | "duplicate" | "reaffirm" | "none";

/** Which relations warrant interrupting a human. reaffirm is signal, not noise. */
export const isAlertKind = (k: ContradictionKind): boolean => k === "drift" || k === "duplicate";

export interface ContradictionResult {
  kind: ContradictionKind;
  score: number;
  topicSim: number;
  stance: number; // -1 opposing, 0 unrelated, +1 same
  reason: string;
  a?: string; // the new claim's choice
  b?: string; // the prior decision's choice
}

/** Semantic similarity in [0,1]. Inject an embedding cosine in production. */
export type SimFn = (a: string, b: string) => number;

// Tunable thresholds, CALIBRATED against measured nomic-embed-text cosines (see the
// benchmark diagnostics). Key empirical finding: bare-token embeddings do NOT separate
// "same category, different member" from "cross-category" (postgres~mongodb=0.60 but
// postgres~react=0.53), so we do NOT rely on a category band. Instead: topic similarity
// (reliable) gates, same-choice similarity (reliable) plus per-choice polarity catches
// reversals, and REPLACEMENT GRAMMAR catches a different choice on an already-decided
// topic. Domain-general, no vocabulary.
export const CAR_THRESHOLDS = {
  topicGate: 0.5, // claim vs decision below this = unrelated
  sameChoice: 0.72, // object embeddings this close = the same choice (handles spelling variants)
  dupTopic: 0.62, // build-vs-build duplicate needs at least this topic similarity
};

// Strong replacement/commitment verbs: their presence means the claim is proposing to
// REPLACE an incumbent, so a different choice on an already-decided topic is a reversal.
const REPLACEMENT_RE = /\b(migrat\w*|switch\w*|mov(?:e|ing|ed)|rewrit\w*|rebuild\w*|replac\w*|adopt\w*|go(?:ing)? with|instead of|standardiz\w*|convert\w*|port\w*)\b/;
// Small morphological alias map (abbreviations/spelling), NOT a category taxonomy.
const ALIAS: Record<string, string> = { k8s: "kubernetes", mongo: "mongodb", postgres: "postgresql", pg: "postgresql", ts: "typescript", js: "javascript" };
// strip surrounding punctuation ("mongodb." -> "mongodb") before aliasing, so a choice at
// the end of a sentence matches the same choice elsewhere.
const canon = (s: string) => {
  const c = s.trim().replace(/^[.\-+#]+|[.\-+#]+$/g, "");
  return ALIAS[c] ?? c;
};

const NEGATION = ["no more", "instead of", "not", "stop using", "stop", "deprecate", "drop", "move off", "moving off", "away from", "roll back", "revert", "reverse", "kill", "sunset", "abandon", "no", "off", "from"];

// Generic decision/action context: an object phrase that follows one of these (optionally
// via a preposition/article) is a "choice" the claim takes a stance on. No tech terms.
const OBJECT_RE =
  /\b(?:standardiz\w*|migrat\w*|mov\w*|switch\w*|adopt\w*|use\w*|run\w*|deploy\w*|build\w*|ship\w*|rebuild\w*|rewrit\w*|choos\w*|chose|pick\w*|replac\w*|introduc\w*|convert\w*|port\w*|go with|going with|going in|is|are|on|onto|to|with|off|from|instead of|no more|not|stop|drop|deprecat\w*)\s+(?:the|a|an|our|new|using|over to)?\s*([a-z][a-z0-9.+#-]{2,}(?:\s+[a-z][a-z0-9.+#-]{2,})?)/g;

const BUILD_RE = /\b(build|built|building|create|created|creating|implement\w*|start\w*|kick(?:ing)? off|kicked off|ship\w*|add|added|adding|set up|setting up|write|writing|wrote|make|making|roll(?:ing)? out|introduc\w*|stand up)\b/;

const STOP = new Set(["the", "a", "an", "our", "new", "using", "service", "services", "team", "this", "that", "for", "and", "to", "of", "in", "on", "we", "it", "is", "are", "will", "all", "them", "everything", "quarter", "week", "month", "year", "sprint", "today"]);

function norm(t: string): string {
  return " " + t.toLowerCase().replace(/[^a-z0-9\s#+.-]/g, " ").replace(/\s+/g, " ").trim() + " ";
}

interface Choice {
  phrase: string;
  negated: boolean;
}

/** Extract the choices a claim takes a stance on, with per-choice polarity, using generic
 *  decision grammar (no domain vocabulary). "standardize on Postgres, no more Mongo" yields
 *  Postgres:affirm and Mongo:negate. */
export function extractChoices(text: string): Choice[] {
  const n = norm(text);
  const out: Choice[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  OBJECT_RE.lastIndex = 0;
  while ((m = OBJECT_RE.exec(n))) {
    const cue = m[0].slice(0, m[0].length - m[1].length).trim();
    let phrase = m[1].trim();
    // strip a trailing stopword from a 2-word phrase ("retry queue for" already excluded)
    const words = phrase.split(" ").filter((w) => !STOP.has(w));
    if (words.length === 0) continue;
    phrase = words.join(" ");
    if (phrase.length < 3 || STOP.has(phrase)) continue;
    const negated = NEGATION.some((c) => cue === c || cue.endsWith(" " + c) || cue.startsWith(c + " ") || cue === c);
    const key = phrase;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ phrase, negated });
  }
  return out;
}

const hasBuild = (t: string) => BUILD_RE.test(norm(t));

/** Zero-dependency lexical similarity (token overlap coefficient). Used as the default so
 *  CAR works with no embedding infra; inject an embedding cosine for full category power. */
export function lexicalSim(a: string, b: string): number {
  const tok = (s: string) => new Set(norm(s).split(" ").map((w) => canon(w.replace(/s$/, ""))).filter((w) => w.length > 2 && !STOP.has(w)));
  const ta = tok(a), tb = tok(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach((t) => { if (tb.has(t)) shared++; });
  return shared / Math.min(ta.size, tb.size);
}

/** Classify a NEW claim against a PRIOR decision. `sim` provides semantic similarity
 *  (embedding cosine in production, lexical by default); nothing about the domain is
 *  hardcoded. */
export function classify(newClaim: string, decision: string, sim: SimFn = lexicalSim, th = CAR_THRESHOLDS): ContradictionResult {
  const topic = sim(newClaim, decision);
  const none: ContradictionResult = { kind: "none", score: 0, topicSim: topic, stance: 0, reason: "" };

  const na = extractChoices(newClaim);
  const da = extractChoices(decision);
  const sameObject = (a: string, b: string) => canon(a) === canon(b) || sim(a, b) >= th.sameChoice;

  let best: ContradictionResult = none;
  const consider = (r: ContradictionResult) => {
    if (r.kind !== "none" && r.score > best.score) best = r;
  };

  // Rule 1, same-object stance relation. A SHARED choice object IS the topic link, so this
  // runs regardless of overall text similarity: a message that names the exact excluded
  // choice ("MongoDB") conflicts with "no more MongoDB" even if the rest of the sentence
  // shares no words (which is exactly the months-apart, differently-worded case).
  for (const a of na) {
    for (const b of da) {
      if (!sameObject(a.phrase, b.phrase)) continue;
      if (a.negated !== b.negated) {
        consider({ kind: "drift", score: 0.7 + topic * 0.3, topicSim: topic, stance: -1, reason: `reverses the decision on "${b.phrase}"`, a: a.phrase, b: b.phrase });
      } else if (!a.negated && hasBuild(newClaim)) {
        consider({ kind: "duplicate", score: 0.55 + topic * 0.35, topicSim: topic, stance: 1, reason: `re-does "${b.phrase}" work already committed`, a: a.phrase, b: b.phrase });
      } else {
        // Same choice, same polarity, no new build work: the claim REAFFIRMS the prior.
        // Not an alert; it is the "this decision is still alive" signal for decision health.
        consider({ kind: "reaffirm", score: 0.4 + topic * 0.4, topicSim: topic, stance: 1, reason: `restates the standing decision on "${b.phrase}"`, a: a.phrase, b: b.phrase });
      }
    }
  }

  // Rules 2 and 3 have no shared object, so they need a semantic topic link (the gate).
  if (best.kind === "none" && topic >= th.topicGate) {
    // Rule 2, replacement grammar: the claim uses a REPLACE/MIGRATE/SWITCH verb and names a
    // choice DIFFERENT from the one the decision established. Domain-general way to catch "a
    // different choice in the same category" WITHOUT an (unreliable) embedding category band.
    if (REPLACEMENT_RE.test(norm(newClaim))) {
      const claimAff = na.filter((c) => !c.negated);
      const decAff = da.filter((c) => !c.negated);
      if (claimAff.length && decAff.length) {
        const different = claimAff.some((a) => decAff.every((b) => !sameObject(a.phrase, b.phrase)));
        if (different) {
          const a = claimAff[0].phrase, b = decAff[0].phrase;
          consider({ kind: "drift", score: 0.6 + topic * 0.35, topicSim: topic, stance: -1, reason: `switches to "${a}" where the team chose "${b}"`, a, b });
        }
      }
    }
    // Rule 3, build-vs-build duplicate: both are build actions on the same topic.
    if (best.kind === "none" && hasBuild(newClaim) && hasBuild(decision) && topic >= th.dupTopic) {
      consider({ kind: "duplicate", score: 0.45 + topic * 0.4, topicSim: topic, stance: 1, reason: "builds something the team already built or is building" });
    }
  }

  best.score = Math.min(1, best.score);
  return best;
}

export interface Alignment {
  memory: string;
  result: ContradictionResult;
}

/**
 * align: the general primitive. Given a NEW claim and a set of PRIOR memories (any age,
 * pulled from Cognee long-term memory), return every non-trivial relation, ranked. This
 * is the thing incumbents do not have: a "how does this new statement relate to what we
 * already know" operator, not just similarity. Callers decide what to do with each kind
 * (alert on drift/duplicate, strengthen decision-health on reaffirm). Zero LLM calls.
 *
 * `memories` may be thousands of items from months ago; CAR does not care about recency,
 * it aligns on topic + stance, so a chat today can be caught contradicting a decision
 * made a year ago the moment its text is retrieved from memory.
 */
export function align(
  newClaim: string,
  memories: string[],
  sim: SimFn = lexicalSim,
  opts: { minScore?: number; kinds?: ContradictionKind[] } = {},
): Alignment[] {
  const min = opts.minScore ?? 0.4;
  const keep = new Set<ContradictionKind>(opts.kinds ?? ["drift", "duplicate", "reaffirm"]);
  return memories
    .map((memory) => ({ memory, result: classify(newClaim, memory, sim) }))
    .filter((m) => keep.has(m.result.kind) && m.result.score >= min)
    .sort((a, b) => b.result.score - a.result.score);
}

/** Alert-only view of align(): ranked drift/duplicate matches, zero LLM. Backwards-compat. */
export function retrieveContradictions(
  newClaim: string,
  decisions: string[],
  sim: SimFn = lexicalSim,
  opts: { minScore?: number } = {},
): Alignment[] {
  return align(newClaim, decisions, sim, { minScore: opts.minScore ?? 0.5, kinds: ["drift", "duplicate"] });
}
