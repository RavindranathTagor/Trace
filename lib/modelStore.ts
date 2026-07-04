// Runtime-selectable answer model (Groq). In-memory on the server; resets to the
// GROQ_MODEL env default when the app restarts. Controls the model used to
// COMPOSE recall answers (text panel) and the Stateless baseline. Note: Cognee's
// extraction model is set separately in cognee/.env (LLM_MODEL) at container level.

import { config } from "@/lib/config";

// globalThis-backed: Next.js bundles each API route separately, so a plain
// module-level `let` would give /api/models (writer) and /api/recall (reader)
// DIFFERENT instances — the dropdown would silently do nothing.
const g = globalThis as unknown as { __traceModel?: { selected: string } };
const state = (g.__traceModel ??= { selected: config.baseline.model });

export function getModel(): string {
  return state.selected;
}

export function setModel(model: string): void {
  if (model && typeof model === "string") state.selected = model.trim();
}
