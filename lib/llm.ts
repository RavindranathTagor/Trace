// Central LLM client with provider failover so a single provider's rate limit or
// outage never breaks the agent. Chain, in priority order:
//   1. Groq  , fast, free (primary)
//   2. Google, Gemini via its OpenAI-compatible endpoint (fallback on 429/error)
//   3. Ollama, local, no key, no rate limit (offline last resort)
// Every provider speaks the OpenAI /chat/completions shape, so one code path covers
// all three. On HTTP 429 we wait out the window once, then fail over to the next
// provider rather than hammering a capped bucket.

import { config } from "@/lib/config";
import { getModel } from "@/lib/modelStore";

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOpts {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface Provider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

// A provider that just rate-limited (or hard-errored) is skipped for this long so we
// don't waste a round-trip + retry on a capped bucket on every single call. This is
// what makes failover "on the spot": once Groq returns its daily-limit 429, every
// subsequent call goes STRAIGHT to the next working provider (e.g. Ollama).
const COOLDOWN_MS = 10 * 60 * 1000;
const cooldownUntil: Record<string, number> = {};
function coolDown(name: string) {
  cooldownUntil[name] = Date.now() + COOLDOWN_MS;
}

/** The active provider chain (only providers that are configured AND not cooling down).
 *  The last configured provider is always kept even if cooling, a degraded provider
 *  beats no answer at all. */
function providerChain(): Provider[] {
  const all: Provider[] = [];
  // Ollama FIRST: it's local, has no rate limit, and answers on the spot. Groq's free
  // daily token cap is easily exhausted, so trying it first just burns a round-trip on
  // a 429. Set LLM_PREFER_OLLAMA=false to restore Groq-first.
  const ollamaFirst = config.ollama.enabled && process.env.LLM_PREFER_OLLAMA !== "false";
  if (ollamaFirst) {
    all.push({ name: "ollama", baseUrl: config.ollama.baseUrl, model: config.ollama.model });
  }
  if (config.baseline.apiKey) {
    all.push({ name: "groq", baseUrl: config.baseline.baseUrl, apiKey: config.baseline.apiKey, model: getModel() });
  }
  if (config.google.apiKey) {
    all.push({ name: "google", baseUrl: config.google.baseUrl, apiKey: config.google.apiKey, model: config.google.model });
  }
  if (config.ollama.enabled && !ollamaFirst) {
    all.push({ name: "ollama", baseUrl: config.ollama.baseUrl, model: config.ollama.model });
  }
  const now = Date.now();
  const live = all.filter((p) => !(cooldownUntil[p.name] && now < cooldownUntil[p.name]));
  return live.length ? live : all.slice(-1);
}

/** True if at least one LLM provider is configured (Groq key, Google key, or Ollama). */
export function llmAvailable(): boolean {
  return providerChain().length > 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run a chat completion through the failover chain. Returns the answer text, or
 *  null if every provider is unavailable. Never throws. */
export async function chatComplete(messages: ChatMsg[], opts: ChatOpts = {}): Promise<string | null> {
  const { temperature = 0.2, maxTokens = 400, timeoutMs = 15000 } = opts;
  let lastErr: unknown = null;

  for (const p of providerChain()) {
    // Up to 2 attempts per provider (one retry after a 429/transient), then move on.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(p.apiKey ? { Authorization: `Bearer ${p.apiKey}` } : {}),
          },
          body: JSON.stringify({ model: p.model, messages, temperature, max_tokens: maxTokens }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (res.status === 429) {
          // Rate-limited (e.g. Groq daily token cap): DON'T burn time retrying a
          // capped bucket, cool the provider down and fail over immediately so the
          // next provider (Ollama) answers now, and later calls skip this one entirely.
          coolDown(p.name);
          lastErr = new Error(`${p.name} rate-limited (429)`);
          break;
        }
        if (!res.ok) throw new Error(`${p.name} ${res.status}`);

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const answer = (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        if (answer) return answer;
        break; // empty completion → try the next provider
      } catch (err) {
        lastErr = err;
        if (attempt === 1) {
          await sleep(800);
          continue;
        }
        break; // exhausted this provider → next one
      }
    }
  }

  console.error("[llm] all providers failed:", lastErr instanceof Error ? lastErr.message : lastErr);
  return null;
}
