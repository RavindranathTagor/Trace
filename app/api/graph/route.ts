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
const GRAPH_TTL_MS = 60_000;
// When Cloud fails, don't re-probe (and block) on every poll — back off for this long
// and serve last-good/mock INSTANTLY. Prevents the per-poll hang during an outage.
const DOWN_TTL_MS = 20_000;
interface GraphCache {
  graph?: GraphData;
  at: number;
  failedUntil?: number;
  refreshing?: boolean;
}
const g = globalThis as unknown as { __traceGraphCache?: GraphCache };

function serve(graph: GraphData, extra: Record<string, unknown>) {
  return NextResponse.json({ ...applyForget(graph), ...extra });
}

// Fetch a fresh graph and update the cache. Never throws — on failure it keeps the
// last-good graph and arms a short backoff so the next poll doesn't re-block.
async function refreshGraph(now: number): Promise<GraphData | null> {
  try {
    const graph = await getGraph();
    // Only cache a non-empty graph (an empty result may be a momentary datasetId
    // miss; don't let it evict a real graph).
    if (graph.nodes.length > 0) {
      g.__traceGraphCache = { graph, at: now };
      return graph;
    }
    // Empty (e.g. a momentary datasetId miss) — treat as a soft failure and back off
    // so the next polls fast-path to last-good/mock instead of re-blocking on Cloud.
    const prev = g.__traceGraphCache;
    g.__traceGraphCache = { graph: prev?.graph, at: prev?.at ?? 0, failedUntil: now + DOWN_TTL_MS };
    return null;
  } catch (err) {
    const e = err as { message?: string; name?: string; cause?: { code?: string; message?: string } };
    console.error("[graph] Cognee unavailable (backing off " + DOWN_TTL_MS / 1000 + "s):", { name: e?.name, cause: e?.cause?.code ?? e?.message });
    const prev = g.__traceGraphCache;
    g.__traceGraphCache = { graph: prev?.graph, at: prev?.at ?? 0, failedUntil: now + DOWN_TTL_MS };
    return null;
  }
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

  // Stale-while-revalidate: once we have a real graph, ALWAYS serve it instantly and
  // never block a poll on slow Cloud again. Refresh in the background when stale (and
  // Cloud isn't in a backoff window). This is what keeps the graph up during Cloud's
  // 20-40s stalls — the UI shows the last-good live graph, never flaps to mock.
  if (cached?.graph) {
    const fresh = now - cached.at < GRAPH_TTL_MS;
    const backingOff = cached.failedUntil && now < cached.failedUntil;
    if (!fresh && !cached.refreshing && !backingOff && isCogneeEnabled()) {
      cached.refreshing = true;
      void refreshGraph(now).finally(() => {
        if (g.__traceGraphCache) g.__traceGraphCache.refreshing = false;
      });
    }
    return serve(cached.graph, { source: "cognee", cached: fresh, stale: !fresh });
  }

  // No live graph cached yet. If Cloud recently failed, serve mock without blocking.
  if (cached?.failedUntil && now < cached.failedUntil) {
    return serve(getMockGraph(), { source: "mock", degraded: "cognee unavailable" });
  }

  // Cold start: block ONCE to warm the cache (this is the only slow request).
  if (isCogneeEnabled()) {
    const graph = await refreshGraph(now);
    if (graph) return serve(graph, { source: "cognee" });
  }
  return serve(getMockGraph(), { source: "mock" });
}
