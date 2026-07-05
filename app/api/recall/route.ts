import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { search, searchChunks, type SearchType } from "@/lib/cognee";
import { composeAnswer } from "@/lib/compose";
import { mockRecall } from "@/data/mockGraph";
import { corpusContext } from "@/data/demoCorpus";
import { redactRecall } from "@/lib/forget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/recall  { query, onlyContext? }
// We ALWAYS retrieve from Cognee with only_context=true (reliable — no LLM
// completion in Cognee, which can hang). Then:
//   - onlyContext=true (voice tool): return the subgraph context; the ElevenLabs
//     agent's own LLM speaks it.
//   - onlyContext=false (text panel): compose a concise answer ourselves with a
//     single timeout-guarded Groq call (falls back to clean context).
// Both paths use the SAME retrieval, so text + voice are aligned.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    searchType?: SearchType;
    onlyContext?: boolean;
  };
  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  if (isCogneeEnabled()) {
    try {
      // Retrieve from BOTH the graph (entities + relationships) AND the raw
      // chunks (original messages/files), in parallel. Merging them makes recall
      // robust: a fact stated in a message ("Jayanth joined the data science
      // team…") is answerable via its chunk even when entity extraction didn't
      // mint a dedicated node for it.
      // Fast mode: skip Cognee retrieval (slow on a local Ollama-backed Cognee) and
      // answer from the local memory snapshot via direct Ollama — keeps @mention
      // replies snappy in the live demo.
      const fast = process.env.COGNEE_SKIP_COMPLETION === "true";
      let ctx: { context?: string; answer?: string } = {};
      let chunks: string[] = [];
      if (!fast) {
        [ctx, chunks] = await Promise.all([
          search(query, { searchType: body.searchType ?? "GRAPH_COMPLETION", onlyContext: true, topK: 8 }),
          searchChunks(query, 3),
        ]);
      }
      const graphCtx = (ctx.context || ctx.answer || "").trim();
      // Chunks first (precise, query-matched), then graph context (relationships).
      let combined = [...chunks, graphCtx].filter(Boolean).join("\n\n");
      let sources = chunks;
      // No Cognee context (fast mode, or an empty/stalled backend) → use the local
      // memory snapshot so recall still answers.
      if (!combined.trim()) {
        combined = corpusContext(query);
        sources = combined.split("\n").filter(Boolean).slice(0, 3);
      }

      // Voice tool wants raw context (the ElevenLabs agent speaks it).
      if (body.onlyContext !== false) {
        return NextResponse.json(redactRecall({ answer: ctx.answer ?? "", context: combined, nodeIds: [], sources, source: "cognee" }));
      }
      // Text panel wants a composed answer + citations (source messages).
      const answer = await composeAnswer(query, combined);
      return NextResponse.json(redactRecall({ answer, context: combined, nodeIds: [], sources, source: "cognee" }));
    } catch (err) {
      // Cognee is CONFIGURED but momentarily unreachable (e.g. a Cloud data-plane
      // stall, or a self-host mid-cognify). Fall back to the local memory snapshot
      // so the bot still answers from the team's established decisions.
      console.error("[recall] Cognee unavailable, using local memory snapshot:", err instanceof Error ? err.message : err);
      const ctx = corpusContext(query);
      const answer = await composeAnswer(query, ctx);
      return NextResponse.json(
        redactRecall({
          answer: answer || "I can't reach the team's memory right now — give me a few seconds and ask again.",
          context: ctx,
          nodeIds: [],
          sources: ctx.split("\n").filter(Boolean).slice(0, 3),
          source: "cognee",
        }),
      );
    }
  }

  // Only when Cognee is NOT configured at all do we serve the built-in demo memory.
  return NextResponse.json(redactRecall(mockRecall(query)));
}
