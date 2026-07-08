// Trace's Guardian, the real-time agent check that makes Trace an agent, not a
// dashboard. When a new message/PR lands, we ask the team's memory: does this
// contradict or duplicate something already decided? If so (high confidence,
// cited), Trace speaks up in-thread. If not, silence.
//
// The judgment now runs on Cognee's OWN managed LLM (GRAPH_COMPLETION retrieves the
// prior decisions AND reasons over them in one call), so the guard no longer
// depends on Groq. Groq stays only as a DEEP FALLBACK if Cognee's completion is
// unavailable, judging over context we retrieve ourselves.
//
// Precision is everything here: a false "you contradicted yourself" ping kills trust.
// We only alert on a clearly-supported contradiction/duplication.

import { searchChunks, search, completeWithCognee } from "@/lib/cognee";
import { chatComplete, llmAvailable } from "@/lib/llm";
import { corpusEvidence } from "@/data/demoCorpus";
import { align, isAlertKind, type Alignment } from "@/lib/contradiction";

// Build a cited GuardAlert from a Contradiction-Aware Retrieval hit (zero LLM).
function alertFromCar(a: Alignment, author?: string): GuardAlert {
  const r = a.result;
  const kind: GuardAlert["kind"] = r.kind === "duplicate" ? "duplicate" : "drift";
  const headline =
    kind === "duplicate"
      ? `Possible duplicate work${r.a ? ` on "${r.a}"` : ""}`
      : `This may reverse an earlier decision${r.b ? ` on "${r.b}"` : ""}`;
  const why =
    kind === "duplicate"
      ? "Check the earlier work before building this again."
      : "Reconcile with whoever set the earlier decision before proceeding.";
  return { kind, headline, why, owner: author, prior: { quote: a.memory } };
}

// Contradiction-Aware Retrieval verdict: instant, cited, ZERO LLM.
//   GuardAlert -> a confident drift/duplicate (interrupt).
//   "silent"   -> a confident REAFFIRMATION (the message agrees with a standing decision);
//                 authoritative, so we do NOT escalate to an LLM that might false-positive.
//   null       -> CAR is not confident; fall through to the LLM judge.
// Disable with CAR_GUARD=false.
function carCheck(msg: string, priorMemory: string[], author?: string): GuardAlert | "silent" | null {
  if (process.env.CAR_GUARD === "false" || priorMemory.length === 0) return null;
  const top = align(msg, priorMemory, undefined, { minScore: 0.5 })[0];
  if (!top) return null;
  if (isAlertKind(top.result.kind) && top.result.score >= 0.66) return alertFromCar(top, author);
  if (top.result.kind === "reaffirm" && top.result.score >= 0.5) return "silent";
  return null;
}

export interface GuardAlert {
  kind: "drift" | "duplicate";
  headline: string; // one line the bot leads with
  why: string; // the reconciliation ask
  owner?: string; // who set the prior decision / owns the overlap
  prior: { quote: string; who?: string; when?: string };
}

const SYSTEM = `You are Trace's Guardian. You are given a NEW team message and the team's PRIOR
decisions from long-term memory. Decide if the NEW message:
- "drift": CONTRADICTS or REVERSES a prior DECISION (e.g. prior "we standardized on Postgres",
  new "migrating to MongoDB"; or prior "no on-prem this year", new "let's build on-prem"), or
- "duplicate": redoes work a prior message shows someone already did or is building, INCLUDING
  building a service-specific version of something that already exists as a shared/generic
  component (e.g. prior "platform-core ships ONE shared retry queue every service must reuse",
  new "I'm building a retry queue for the payments service" -> duplicate).
Rules:
- Only flag a GENUINE, HIGH-CONFIDENCE contradiction/duplication grounded in a specific prior message.
- If there is no clear conflict, return {"alert": null}. Silence is correct most of the time.
- Quote the exact PRIOR message you are matching against.
Output STRICT JSON only, one of:
{"alert": null}
{"alert": {"kind":"drift"|"duplicate","headline":"<=14 words","why":"the reconciliation ask","owner":"name or empty","prior":{"quote":"exact prior text","who":"","when":""}}}`;

/** Extract an alert from a model reply. `found` distinguishes "a JSON verdict was
 *  present" (authoritative, even {"alert":null} = deliberate silence) from "no
 *  parseable JSON" (garbage/error → the caller should fall back). */
export function extractAlert(raw: string): { found: boolean; alert: GuardAlert | null } {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s === -1 || e <= s) return { found: false, alert: null };
  let obj: { alert?: unknown };
  try {
    obj = JSON.parse(cleaned.slice(s, e + 1));
  } catch {
    return { found: false, alert: null };
  }
  if (!("alert" in obj)) return { found: false, alert: null };
  const a = obj.alert;
  if (!a || typeof a !== "object") return { found: true, alert: null }; // explicit silence
  const o = a as Record<string, unknown>;
  const kind = String(o.kind ?? "").toLowerCase();
  if (kind !== "drift" && kind !== "duplicate") return { found: true, alert: null };
  const prior = (o.prior ?? {}) as Record<string, unknown>;
  const quote = String(prior.quote ?? "").trim();
  const headline = String(o.headline ?? "").trim();
  if (!quote || !headline) return { found: true, alert: null }; // an alert with no cited prior isn't trustworthy
  return {
    found: true,
    alert: {
      kind,
      headline,
      why: String(o.why ?? "").trim(),
      owner: o.owner ? String(o.owner).trim() : undefined,
      prior: {
        quote,
        who: prior.who ? String(prior.who).trim() : undefined,
        when: prior.when ? String(prior.when).trim() : undefined,
      },
    },
  };
}

/** Check a new message against the team's prior memory. Returns an alert or null. */
export async function checkMessage(text: string, author?: string): Promise<GuardAlert | null> {
  const msg = text.trim();
  if (msg.length < 12) return null;

  // 0) FAST PATH, Contradiction-Aware Retrieval over the local memory snapshot. Instant,
  // cited, zero LLM. Catches the common reversal/duplicate cases before any model call;
  // falls through when CAR is not confident.
  const carFast = carCheck(msg, corpusEvidence(msg), author);
  if (carFast === "silent") return null; // confident reaffirmation, do not escalate
  if (carFast) return carFast;

  // When the backend's completion LLM is slow (e.g. a local Ollama doing
  // GRAPH_COMPLETION), skip step 1 and judge directly over fast retrieval + the local
  // snapshot. Set COGNEE_SKIP_COMPLETION=true to keep the live guard snappy.
  const skipCompletion = process.env.COGNEE_SKIP_COMPLETION === "true";

  // 1) PRIMARY, Cognee's managed LLM retrieves the prior decisions AND judges,
  // in a single GRAPH_COMPLETION call. The verdict instruction rides in the query
  // (works regardless of whether the backend honors a custom system prompt).
  const guardQuery =
    `A NEW team message just arrived${author ? ` from ${author}` : ""}: "${msg}"\n\n` +
    `Using the team's PRIOR decisions in memory, decide if this NEW message CONTRADICTS/REVERSES a prior ` +
    `decision ("drift") or REDOES work someone already did ("duplicate"). Only flag a genuine, high-confidence ` +
    `conflict grounded in a specific prior message; otherwise stay silent.\n\n` +
    `Reply with STRICT JSON only, no prose, exactly one of:\n` +
    `{"alert": null}\n` +
    `{"alert": {"kind":"drift"|"duplicate","headline":"<=14 words","why":"the reconciliation ask","owner":"name or empty","prior":{"quote":"exact prior text","who":"","when":""}}}`;
  if (!skipCompletion) {
    try {
      const raw = await completeWithCognee(guardQuery, SYSTEM, 8);
      const r = extractAlert(raw);
      if (r.found) return r.alert; // authoritative, an alert, or a deliberate silence
    } catch (err) {
      console.error("[guard] Cognee judge unavailable, falling back:", err instanceof Error ? err.message : err);
    }
  }

  // 2) FALLBACK, retrieve evidence ourselves and judge via the LLM failover chain
  // (Groq → Google → Ollama). Only when at least one provider is configured;
  // otherwise Cognee was our only judge and we stay silent.
  if (!llmAvailable()) return null;

  const head = msg.slice(0, 48).toLowerCase();
  const prior: string[] = [];
  // Cognee retrieval (chunks + graph context), SKIPPED in fast mode, because on a
  // local Ollama-backed Cognee these calls add tens of seconds. In fast mode we judge
  // over the local snapshot alone, which is what keeps the live guard replying in ~seconds.
  if (!skipCompletion) {
    const [chunks, gctx] = await Promise.all([
      searchChunks(msg, 8).catch(() => [] as string[]),
      search(msg, { searchType: "GRAPH_COMPLETION", onlyContext: true, topK: 8 })
        .then((r) => r.context || r.answer || "")
        .catch(() => ""),
    ]);
    prior.push(...chunks.filter((p) => p.trim() && !p.toLowerCase().includes(head)).slice(0, 6));
    if (gctx) {
      const cleaned = gctx
        .replace(/__node_content_start__/g, ": ")
        .replace(/__node_content_end__/g, " ")
        .replace(/\bNodes?:/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1600);
      if (cleaned.length > 20 && !cleaned.toLowerCase().includes(head)) prior.push(cleaned);
    }
  }
  // Always fold in the local memory snapshot: when Cognee is unreachable/empty (a
  // Cloud stall, or a self-host mid-cognify) this is the ONLY source of the team's
  // prior decisions, so the Guardian can still catch drift/duplication live.
  for (const m of corpusEvidence(msg)) {
    if (!m.toLowerCase().includes(head) && !prior.some((p) => p.includes(m))) prior.push(m);
  }
  if (prior.length === 0) return null;

  // CAR over the FULL retrieved memory (Cognee long-term chunks + local snapshot) before
  // spending an LLM call. This is what catches a today message contradicting a decision
  // from months ago the moment it is retrieved, with no model cost.
  const carFull = carCheck(msg, prior, author);
  if (carFull === "silent") return null;
  if (carFull) return carFull;

  const evidence = prior.map((t, i) => `[${i + 1}] ${t}`).join("\n");
  const content = await chatComplete(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `NEW message${author ? ` from ${author}` : ""}: "${msg}"\n\nPRIOR memory:\n${evidence}\n\nJSON:` },
    ],
    { temperature: 0.1, maxTokens: 400, timeoutMs: 20000 },
  );
  if (!content) return null;
  return extractAlert(content).alert;
}
