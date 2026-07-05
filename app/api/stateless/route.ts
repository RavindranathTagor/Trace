import { NextRequest, NextResponse } from "next/server";
import { chatComplete, llmAvailable } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stateless { query } -> the honest "Stateless AI" baseline: a plain
// LLM with NO memory of the team. It genuinely can't answer team-specific
// questions — that's the side-by-side contrast with Hindsight (Cognee).
export async function POST(req: NextRequest) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query?.trim()) return NextResponse.json({ error: "query is required" }, { status: 400 });

  if (!llmAvailable()) {
    return NextResponse.json({
      answer:
        "I don't have any memory of your team's meetings or decisions, so I can't answer that. (This is a plain LLM with no memory — set GROQ_API_KEY / GOOGLE_API_KEY, or run Ollama, to make the baseline live.)",
      source: "stateless-canned",
    });
  }

  // Runs through the failover chain (Groq → Google → Ollama) so a rate limit
  // never breaks the baseline demo.
  const answer = await chatComplete(
    [
      {
        role: "system",
        content:
          "You are a generic assistant with NO access to the user's team, meetings, or decisions. You have no memory of prior context. If asked about specific team decisions, owners, dates, or what changed, you must honestly say you don't have that information. Reply with only the final answer (no reasoning).",
      },
      { role: "user", content: query },
    ],
    { temperature: 0.2, maxTokens: 512 },
  );

  if (!answer) {
    return NextResponse.json({
      answer: "I don't have any memory of your team's decisions, so I can't answer that question.",
      source: "stateless-fallback",
    });
  }
  return NextResponse.json({ answer, source: "stateless" });
}
