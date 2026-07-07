import type { GraphNode } from "@/lib/types";

// Decide which graph nodes to light up for a given answer/context by matching the
// nodes' labels against the text. This is robust for BOTH the mock graph and live
// Cognee (where the search response doesn't carry our node ids), whatever the
// agent says, the entities it mentions glow in the graph.
export function nodeIdsInText(nodes: GraphNode[], text: string, max = 14): string[] {
  if (!text) return [];
  const hay = text.toLowerCase();
  const hits: Array<{ id: string; idx: number; len: number }> = [];
  for (const n of nodes) {
    const raw = (n.label || "").toLowerCase().trim();
    // strip a trailing "(role)" suffix, e.g. "Teddy (Infra)" -> "teddy"
    const core = raw.split("(")[0].trim();
    const term = core.length >= 3 ? core : raw;
    if (term.length < 3) continue;
    const idx = hay.indexOf(term);
    if (idx >= 0) hits.push({ id: n.id, idx, len: term.length });
  }
  // order by FIRST MENTION so the highlight chain follows the narration order;
  // tie-break by longer (more specific) label.
  hits.sort((a, b) => a.idx - b.idx || b.len - a.len);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    out.push(h.id);
    if (out.length >= max) break;
  }
  return out;
}

/** Union of explicit ids returned by the backend and text-matched ids. */
export function combineHighlights(returned: string[] | undefined, textIds: string[]): string[] {
  return Array.from(new Set([...(returned ?? []), ...textIds]));
}
