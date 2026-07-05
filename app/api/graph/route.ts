import { NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { getGraph } from "@/lib/cognee";
import { getMockGraph } from "@/data/mockGraph";
import { applyForget } from "@/lib/forget";
import { maybeAutoStart } from "@/lib/botManager";
import type { GraphData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve the live decision graph, but SHIELD Cognee Cloud from the client's polling.
// The dashboard polls this every ~30s (and several tabs may be open); hitting Cloud
// on every request hammers the tenant and can trip its rate limit / overload it.
// So we cache the last good graph for GRAPH_TTL_MS and, on a Cloud stall, serve the
// last-good LIVE graph (flagged `stale`) instead of flapping to mock.
const GRAPH_TTL_MS = 30_000;
// When Cloud fails, don't re-probe (and block) on every poll — back off for this long
// and serve last-good/mock INSTANTLY. Prevents the 8s-per-poll hang during an outage.
const DOWN_TTL_MS = 20_000;
interface GraphCache {
  graph?: GraphData;
  at: number;
  failedUntil?: number;
}
const g = globalThis as unknown as { __traceGraphCache?: GraphCache };

function serve(graph: GraphData, extra: Record<string, unknown>) {
  return NextResponse.json({ ...applyForget(graph), ...extra });
}

// GET /api/graph -> the live decision graph {nodes, edges}, minus forgotten nodes.
export async function GET() {
  // Self-heal the Discord agent: this route is polled by the landing page AND the
  // dashboard, so whenever the app is open the bot re-starts after a server restart
  // (no-op with a cooldown when it's already running). Cheap, never throws.
  try {
    maybeAutoStart();
  } catch {
    /* best-effort */
  }

  const cached = g.__traceGraphCache;
  const now = Date.now();

  // 1) Fresh cache → answer WITHOUT touching Cloud (main load-reduction path).
  if (cached?.graph && now - cached.at < GRAPH_TTL_MS) {
    return serve(cached.graph, { source: "cognee", cached: true });
  }

  // 2) Cloud recently failed → skip the (slow) probe entirely; serve last-good or
  //    mock immediately so polling never blocks during an outage. Re-probe after DOWN_TTL.
  if (cached?.failedUntil && now < cached.failedUntil) {
    return cached.graph
      ? serve(cached.graph, { source: "cognee", stale: true })
      : serve(getMockGraph(), { source: "mock", degraded: "cognee unavailable" });
  }

  if (isCogneeEnabled()) {
    try {
      const graph = await getGraph();
      // Only cache a non-empty graph as "last good" (an empty result may be a
      // momentary datasetId miss; don't let it evict a real graph).
      if (graph.nodes.length > 0) g.__traceGraphCache = { graph, at: now };
      else if (cached) cached.failedUntil = 0; // reachable again
      return serve(graph, { source: "cognee" });
    } catch (err) {
      const e = err as { message?: string; name?: string; cause?: { code?: string; message?: string } };
      console.error("[graph] Cognee unavailable (backing off " + DOWN_TTL_MS / 1000 + "s):", { name: e?.name, cause: e?.cause?.code ?? e?.message });
      // Remember the outage so the next polls fast-path instead of blocking again.
      g.__traceGraphCache = { graph: cached?.graph, at: cached?.at ?? 0, failedUntil: now + DOWN_TTL_MS };
      if (cached?.graph) return serve(cached.graph, { source: "cognee", stale: true });
    }
  }
  return serve(getMockGraph(), { source: "mock" });
}
