import { NextResponse } from "next/server";
import { cogneeHealthy, backendStatus } from "@/lib/cognee";
import { ingestStatus } from "@/lib/ingestBuffer";
import { isCogneeEnabled, isBaselineEnabled } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bootedAt = Date.now();

// GET /api/health — liveness + dependency readiness for load balancers / uptime
// monitors. Returns 200 when the app is up; `ready:false` (still 200) signals a
// degraded dependency so an orchestrator can decide whether to route traffic.
export async function GET() {
  let cognee = false;
  try {
    cognee = await cogneeHealthy();
  } catch {
    cognee = false;
  }
  const backend = backendStatus();
  const ready = !isCogneeEnabled() || cognee; // in mock mode the app is "ready" without Cognee

  return NextResponse.json(
    {
      status: "ok",
      ready,
      uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
      deps: {
        cogneeEnabled: isCogneeEnabled(),
        cogneeHealthy: cognee,
        baselineLLM: isBaselineEnabled(),
        activeBackend: backend.active,
        backendPreference: backend.preference,
      },
      ingest: ingestStatus(),
    },
    { status: 200 },
  );
}
