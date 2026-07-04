import { NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { getGraph } from "@/lib/cognee";
import { getMockGraph } from "@/data/mockGraph";
import { applyForget } from "@/lib/forget";
import type { GraphData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve the live decision graph, but SHIELD Cognee Cloud from the client's polling.
// The dashboard polls this every ~30s (and several tabs may be open); hitting Cloud
// on every request hammers the tenant and can trip its rate limit / overload it.
// So we cache the last good graph for GRAPH_TTL_MS and, on a Cloud stall, serve the
// last-good LIVE graph (flagged `stale`) instead of flapping to mock.
const GRAPH_TTL_MS = 30_000;
interface GraphCache {
  graph: GraphData;
  at: number;
}
const g = globalThis as unknown as { __traceGraphCache?: GraphCache };

// GET /api/graph -> the live decision graph {nodes, edges}, minus forgotten nodes.
export async function GET() {
  const cached = g.__traceGraphCache;

  // Fresh cache → answer WITHOUT touching Cloud (the main load-reduction path).
  if (cached && Date.now() - cached.at < GRAPH_TTL_MS) {
    return NextResponse.json({ ...applyForget(cached.graph), source: "cognee", cached: true });
  }

  if (isCogneeEnabled()) {
    try {
      const graph = await getGraph();
      // Only cache a non-empty graph as "last good" (an empty result may just be a
      // momentary datasetId miss; don't let it evict a real graph).
      if (graph.nodes.length > 0) g.__traceGraphCache = { graph, at: Date.now() };
      return NextResponse.json({ ...applyForget(graph), source: "cognee" });
    } catch (err) {
      const e = err as { message?: string; name?: string; cause?: { code?: string; message?: string } };
      console.error("[graph] Cognee unavailable:", { name: e?.name, message: e?.message, cause: e?.cause?.code ?? e?.cause?.message });
      // Prefer the last-good LIVE graph over mock so the UI doesn't flap during a
      // transient Cloud stall — the demo keeps showing real data.
      if (cached) return NextResponse.json({ ...applyForget(cached.graph), source: "cognee", stale: true });
    }
  }
  return NextResponse.json({ ...applyForget(getMockGraph()), source: "mock" });
}
