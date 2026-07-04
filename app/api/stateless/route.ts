import { NextRequest, NextResponse } from "next/server";
import { config, isBaselineEnabled } from "@/lib/config";
import { getModel } from "@/lib/modelStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stateless { query } -> the honest "Stateless AI" baseline: a plain
// LLM with NO memory of the team. It genuinely can't answer team-specific
// questions — that's the side-by-side contrast with Hindsight (Cognee).
export async function POST(req: NextRequest) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query?.trim()) return NextResponse.json({ error: "query is required" }, { status: 400 });

  if (!isBaselineEnabled()) {
    return NextResponse.json({
      answer:
        "I don't have any memory of your team's meetings or decisions, so I can't answer that. (This is a plain LLM with no memory — set GROQ_API_KEY to make the baseline live.)",
      source: "stateless-canned",
    });
  }

  try {
    const res = await fetch(`${config.baseline.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.baseline.apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          {
            role: "system",
            content:
              "You are a generic assistant with NO access to the user's team, meetings, or decisions. You have no memory of prior context. If asked about specific team decisions, owners, dates, or what changed, you must honestly say you don't have that information. Reply with only the final answer (no reasoning).",
          },
          { role: "user", content: query },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const answer = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || "I don't have that context.";
    return NextResponse.json({ answer, source: "stateless" });
  } catch (err) {
    console.error("[stateless] Groq error:", err);
    return NextResponse.json({
      answer:
        "I don't have any memory of your team's decisions, so I can't answer that question.",
      source: "stateless-fallback",
    });
  }
}
