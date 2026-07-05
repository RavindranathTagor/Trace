// Compose a concise answer from the team's memory. PRIMARY path uses Cognee's OWN
// managed LLM (GRAPH_COMPLETION) — one call that retrieves the subgraph AND writes
// the answer, so we no longer depend on Groq for question-answering. Groq remains
// only as a DEEP FALLBACK for when Cognee's completion is unavailable/empty (it can
// stall when its LLM is rate-limited), composing over the context we already pulled.

import { completeWithCognee } from "@/lib/cognee";
import { chatComplete, llmAvailable } from "@/lib/llm";

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
  // Skipped when COGNEE_SKIP_COMPLETION=true (a slow local completion LLM) — we then
  // compose directly over the context the caller already retrieved, via Ollama.
  if (process.env.COGNEE_SKIP_COMPLETION !== "true") {
    try {
      const cogneeAnswer = await completeWithCognee(question, ANSWER_PROMPT);
      if (cogneeAnswer && !looksUnhelpful(cogneeAnswer)) {
        // Strip any reasoning-model <think> block just in case.
        return cogneeAnswer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      }
    } catch (err) {
      console.error("[compose] Cognee LLM unavailable, falling back:", err instanceof Error ? err.message : err);
    }
  }

  // 2) FALLBACK — compose over the context we already retrieved, via the LLM
  //    failover chain (Groq → Google → Ollama). If none are configured, return the
  //    cleaned raw context so the user still gets an answer.
  const ctx = (context || "").trim().slice(0, MAX_CONTEXT_CHARS);
  if (!ctx) return "I don't have anything about that in the team's memory yet.";
  if (!llmAvailable()) return cleanContext(ctx);

  const answer = await chatComplete(
    [
      { role: "system", content: ANSWER_PROMPT },
      { role: "user", content: `Team memory context:\n${ctx}\n\nQuestion: ${question}` },
    ],
    { temperature: 0.2, maxTokens: 400 },
  );
  return answer || cleanContext(ctx);
}
