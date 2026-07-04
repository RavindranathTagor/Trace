// Compose a concise answer from the team's memory. PRIMARY path uses Cognee's OWN
// managed LLM (GRAPH_COMPLETION) — one call that retrieves the subgraph AND writes
// the answer, so we no longer depend on Groq for question-answering. Groq remains
// only as a DEEP FALLBACK for when Cognee's completion is unavailable/empty (it can
// stall when its LLM is rate-limited), composing over the context we already pulled.

import { config, isBaselineEnabled } from "@/lib/config";
import { getModel } from "@/lib/modelStore";
import { completeWithCognee } from "@/lib/cognee";

const MAX_CONTEXT_CHARS = 3200; // ~800 tokens: fits chunks + graph, well under the fallback TPM budget

const ANSWER_PROMPT =
  "You answer questions about a team's decisions using ONLY the team's memory. " +
  "Be concise and specific (1-3 sentences). Lead with the decision/answer, then who and why. " +
  "If the memory doesn't contain the answer, say you don't have that in the team's memory yet. " +
  "Reply with only the final answer — no reasoning.";

/** Turn Cognee's raw context markup into readable text (fallback display). */
export function cleanContext(ctx: string): string {
  if (!ctx) return "";
  return ctx
    .replace(/__node_content_start__/g, ": ")
    .replace(/__node_content_end__/g, "")
    .replace(/\bNodes:\s*/gi, "")
    .replace(/\bNode:\s*/gi, "• ")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 700);
}

function looksUnhelpful(a: string): boolean {
  const s = a.trim().toLowerCase();
  // Empty, or Cognee returned raw context markup instead of a composed sentence.
  return s.length < 2 || a.includes("__node_content_start__") || a.includes("__node_content_end__");
}

export async function composeAnswer(question: string, context: string): Promise<string> {
  // 1) PRIMARY — Cognee's managed LLM composes the answer over its own retrieval.
  try {
    const cogneeAnswer = await completeWithCognee(question, ANSWER_PROMPT);
    if (cogneeAnswer && !looksUnhelpful(cogneeAnswer)) {
      // Strip any reasoning-model <think> block just in case.
      return cogneeAnswer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    }
  } catch (err) {
    console.error("[compose] Cognee LLM unavailable, falling back:", err instanceof Error ? err.message : err);
  }

  // 2) FALLBACK — compose over the context we already retrieved.
  const ctx = (context || "").trim().slice(0, MAX_CONTEXT_CHARS);
  if (!ctx) return "I don't have anything about that in the team's memory yet.";
  if (!isBaselineEnabled()) return cleanContext(ctx);

  for (let attempt = 1; attempt <= 2; attempt++) {
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
            { role: "system", content: ANSWER_PROMPT },
            { role: "user", content: `Team memory context:\n${ctx}\n\nQuestion: ${question}` },
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(15000),
      });

      // Rate-limited? wait out the window once, then retry.
      if (res.status === 429 && attempt === 1) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      if (!res.ok) throw new Error(`compose ${res.status}`);

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content ?? "";
      const answer = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      return answer || cleanContext(ctx);
    } catch (err) {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      console.error("[compose] fallback failed, returning context:", err instanceof Error ? err.message : err);
      return cleanContext(ctx);
    }
  }
  return cleanContext(ctx);
}
