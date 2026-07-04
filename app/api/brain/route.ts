import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { search, searchChunks } from "@/lib/cognee";
import { composeAnswer } from "@/lib/compose";
import { redactRecall } from "@/lib/forget";
import { decisionsForText, reversalPairs, type Decision } from "@/data/decisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET|POST /api/brain?q=...  — the COMPANY BRAIN API.
//
// The machine-consumable face of Trace: an AI agent (or any service) calls this
// *before it acts* to check what the company has actually decided — the current
// call, who owns it, why, and what it reversed — so the agent operates on live
// org truth instead of a stale prompt. This is "the missing layer between raw
// company data and reliable AI automation" (YC "Company Brain").
//
// Contract (structured, not prose):
//   { query, answer, asOf, facts:[{decision,status,owner,date,why,supersededBy,source}],
//     citations:[...], confidence }
//
// Robust by design: `facts` always come from the decision ledger (Cloud-independent),
// while `answer` is composed from live Cognee memory when reachable and falls back to
// a deterministic ledger answer when it isn't.
export async function GET(req: NextRequest) {
  return handle(new URL(req.url).searchParams.get("q") ?? "");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { query?: string };
  return handle(body.query ?? "");
}

async function handle(query: string) {
  const q = query.trim();
  if (!q) return NextResponse.json({ error: "query (q) is required" }, { status: 400 });

  // 1) Structured facts from the decision ledger — always available, agent-consumable.
  const related = decisionsForText(q);
  const reversedBy = new Map<string, Decision>();
  reversalPairs().forEach((p) => reversedBy.set(p.from.id, p.to));
  const facts = related.map((d) => ({
    decision: d.title,
    status: d.status, // "current" | "superseded" | "at-risk"
    owner: `${d.owner} (${d.role})`,
    date: d.date,
    why: d.why,
    supersededBy: reversedBy.get(d.id)?.title ?? null,
    source: d.sourceQuote,
  }));

  // 2) Composed answer from live memory (best effort). Bounded by BRAIN_LLM_BUDGET_MS
  // so a stalling/slow Cloud can NEVER block the brain — the ledger facts are already
  // ready, so we'd rather answer fast from them than hang waiting on a completion.
  const BRAIN_LLM_BUDGET_MS = 5000;
  let answer = "";
  const citations: string[] = [];
  if (isCogneeEnabled()) {
    const cognee = (async () => {
      const [ctx, chunks] = await Promise.all([
        search(q, { searchType: "GRAPH_COMPLETION", onlyContext: true, topK: 8 }),
        searchChunks(q, 4),
      ]);
      citations.push(...chunks);
      const context = [...chunks, ctx.context || ctx.answer].filter(Boolean).join("\n\n");
      const redacted = redactRecall({ answer: await composeAnswer(q, context), context, nodeIds: ctx.nodeIds, sources: chunks, source: "cognee" });
      return redacted.answer;
    })().catch(() => ""); // swallow so a late rejection can't crash the request
    answer = await Promise.race([cognee, new Promise<string>((r) => setTimeout(() => r(""), BRAIN_LLM_BUDGET_MS))]);
  }

  // 3) Deterministic ledger fallback so the brain always answers (demo-proof) — used
  // when Cognee returned nothing OR a "no memory" answer while the ledger DOES know.
  // Status-aware: NEVER present a superseded decision as the current one.
  const noMemory = /don.?t have|do not have|not in the team|no relevant|haven.?t/i.test(answer);
  if (!answer || answer.trim().length < 2 || (related.length > 0 && noMemory)) {
    const current = related.find((d) => d.status === "current");
    if (current) {
      answer =
        `Current: ${current.title} (${current.date}), owned by ${current.owner}. ${current.why}` +
        (current.reverses ? " This reversed an earlier decision." : "");
    } else if (related.length > 0) {
      // Only superseded/at-risk matched — point to whatever replaced it, if known.
      const d0 = related[0];
      const newer = reversedBy.get(d0.id);
      answer = newer
        ? `“${d0.title}” was superseded. Current: ${newer.title} (${newer.date}), owned by ${newer.owner}. ${newer.why}`
        : `${d0.title} (${d0.date}) — status: ${d0.status}. ${d0.why}`;
    } else {
      answer = "No decision on that is recorded in the team's memory yet.";
    }
  }

  // Fold ledger sources into citations.
  for (const f of facts) if (f.source && !citations.includes(f.source)) citations.push(f.source);

  const confidence = facts.length > 0 ? 0.9 : /don't have|no decision/i.test(answer) ? 0.3 : 0.6;

  return NextResponse.json({
    query: q,
    answer,
    asOf: new Date().toISOString(),
    facts,
    citations: citations.slice(0, 5),
    confidence,
  });
}
