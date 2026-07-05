// Central env/config. All secrets stay server-side (never imported into client components).

export const config = {
  cognee: {
    baseUrl: process.env.COGNEE_BASE_URL || "http://localhost:8000",
    email: process.env.COGNEE_EMAIL || "",
    password: process.env.COGNEE_PASSWORD || "",
    dataset: process.env.COGNEE_DATASET || "hindsight",
    // When false, the API routes serve the deterministic mock graph so the UI
    // works before Cognee is running / keys are wired.
    enabled: process.env.COGNEE_ENABLED === "true",
    // Single-user self-host runs with ENABLE_BACKEND_ACCESS_CONTROL=false, so
    // no register/login/Bearer is needed. Set COGNEE_AUTH=true only if the
    // server has access control enabled.
    auth: process.env.COGNEE_AUTH === "true",
    // Cognee Cloud (managed): set COGNEE_API_KEY + COGNEE_TENANT_ID and point
    // COGNEE_BASE_URL at your tenant URL. When both are present the client
    // authenticates with X-Api-Key + X-Tenant-Id headers (no Bearer/login).
    apiKey: process.env.COGNEE_API_KEY || "",
    tenantId: process.env.COGNEE_TENANT_ID || "",
    // Auto-failover target: if the primary (e.g. Cloud) is slow/down, the client
    // transparently uses this local self-hosted instance and re-probes primary
    // after a cooldown. Empty (or equal to baseUrl) disables failover.
    fallbackUrl: process.env.COGNEE_FALLBACK_BASE_URL || "",
  },
  // ── LLM fallback chain (all OpenAI-compatible /chat/completions) ──────────
  // Primary: Groq (fast, free). Used for the "Stateless AI" baseline panel AND as
  // the deep fallback judge/composer when Cognee's own LLM is unavailable.
  baseline: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  },
  // Fallback: Google Gemini via its OpenAI-compatible endpoint. Kicks in when Groq
  // rate-limits (429) or errors, so the agent keeps working under load.
  google: {
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
    model: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
    baseUrl: process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  // Offline: local Ollama (no key, no rate limit). Last-resort so the app never goes
  // fully dark on LLM. Enabled by default; set OLLAMA_ENABLED=false to drop it.
  ollama: {
    enabled: process.env.OLLAMA_ENABLED !== "false",
    model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  },
  elevenlabs: {
    // Public agent id is safe to expose to the client; the key is not used client-side.
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "",
  },
} as const;

export const isCogneeEnabled = () => config.cognee.enabled;

export const isBaselineEnabled = () => !!config.baseline.apiKey;
