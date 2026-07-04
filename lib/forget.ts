// "Forget / redact" layer. Tracks forgotten terms and filters them out of any
// graph OR recall answer we serve, so the redaction is visible immediately and
// consistently across the graph and the Q&A panels.
//
// NOTE on semantics: Cognee's REST API does not (yet) expose per-node deletion, so
// "forget" is enforced as a serve-time redaction filter over everything we return —
// NOT a hard delete from the underlying graph. To make it durable, the forgotten
// set is PERSISTED to data/forgotten.json and reloaded on boot, so the redaction
// survives a server restart (previously it was in-memory only and reset on restart).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GraphData, RecallResult } from "@/lib/types";

const FILE = join(process.cwd(), "data", "forgotten.json");

// globalThis-backed: written by /api/forget but read by /api/recall, /api/graph
// and /api/pulse — separate route bundles would otherwise each see an empty set
// and redaction would silently not apply.
const g = globalThis as unknown as { __traceForgotten?: Set<string> };
const forgotten = (g.__traceForgotten ??= loadForgotten());

function loadForgotten(): Set<string> {
  try {
    if (existsSync(FILE)) {
      const arr = JSON.parse(readFileSync(FILE, "utf-8")) as unknown;
      if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    /* corrupt/absent → start empty */
  }
  return new Set<string>();
}

function persist(): void {
  try {
    writeFileSync(FILE, JSON.stringify(Array.from(forgotten)), "utf-8");
  } catch (err) {
    console.error("[forget] failed to persist forgotten set:", err instanceof Error ? err.message : err);
  }
}

export function forget(target: string): void {
  const t = target.trim().toLowerCase();
  if (t) {
    forgotten.add(t);
    persist();
  }
}

export function clearForget(): void {
  forgotten.clear();
  persist();
}

export function forgottenList(): string[] {
  return Array.from(forgotten);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word match so a short target (e.g. "on") can't nuke "Neon". */
export function containsForgotten(text: string): boolean {
  if (forgotten.size === 0 || !text) return false;
  return Array.from(forgotten).some((f) => new RegExp(`\\b${escapeRegex(f)}\\b`, "i").test(text));
}

const wantsConfidential = () => Array.from(forgotten).some((f) => f.includes("confidential"));

/** Remove forgotten nodes (and edges touching them) from a graph. */
export function applyForget(graph: GraphData): GraphData {
  if (forgotten.size === 0) return graph;
  const dropConfidential = wantsConfidential();
  const hidden = new Set<string>();
  const nodes = graph.nodes.filter((n) => {
    const hay = `${n.label} ${JSON.stringify(n.properties ?? {})}`;
    const drop = containsForgotten(hay) || (dropConfidential && n.properties?.confidential === true);
    if (drop) {
      hidden.add(n.id);
      return false;
    }
    return true;
  });
  const edges = graph.edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  return { nodes, edges };
}

/** Redact a recall result whose answer/context references a forgotten term. */
export function redactRecall(r: RecallResult): RecallResult {
  if (forgotten.size === 0) return r;
  if (containsForgotten(r.answer) || containsForgotten(r.context)) {
    return {
      ...r,
      answer: "That topic has been forgotten — it was redacted from the team's memory.",
      context: "",
      nodeIds: [],
      sources: [],
    };
  }
  // also drop any individual source snippets that mention forgotten terms
  return { ...r, sources: (r.sources ?? []).filter((s) => !containsForgotten(s)) };
}
