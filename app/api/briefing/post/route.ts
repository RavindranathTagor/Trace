import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { getPulse } from "@/lib/pulse";
import { containsForgotten } from "@/lib/forget";
import { isDismissed } from "@/lib/pulseFeedback";
import { postBriefingEverywhere, connectedPlatforms, type Platform } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/briefing/post -> which platforms are connected (for the UI to show only
// those as send targets).
export async function GET() {
  return NextResponse.json({ connected: connectedPlatforms() });
}

// POST /api/briefing/post { targets?: ("discord"|"slack"|"teams")[] } -> build
// today's briefing and deliver it to the selected connected channels (default all).
export async function POST(req: NextRequest) {
  if (!isCogneeEnabled()) return NextResponse.json({ error: "Cognee not connected" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { targets?: Platform[] };
  const targets = Array.isArray(body.targets) && body.targets.length ? body.targets : undefined;
  const scan = await getPulse(new Date().toISOString());
  const cards = scan.cards.filter(
    (c) => !containsForgotten(`${c.title} ${c.detail} ${c.sources.map((s) => s.quote).join(" ")}`) && !isDismissed(c.title),
  );
  const result = await postBriefingEverywhere({ ...scan, cards }, targets);
  const anySent = Object.values(result).includes("sent");
  const anyTarget = Object.values(result).some((v) => v !== "skipped");
  return NextResponse.json({
    ok: anySent || !anyTarget,
    delivered: result,
    cards: cards.length,
    note: anyTarget ? undefined : "No channels connected — connect Discord, Slack, or Teams first.",
  });
}
