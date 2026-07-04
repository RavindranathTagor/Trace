import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { getPulse } from "@/lib/pulse";
import { containsForgotten } from "@/lib/forget";
import { isDismissed } from "@/lib/pulseFeedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pulse[?force=1] -> the daily discovery digest: up to 5 things the team
// hasn't realized yet (drift / duplicate / ownership), each cited. Cached 3 min so
// repeated loads don't re-run the LLM scan (?force=1 = the "Re-scan" button).
export async function GET(req: NextRequest) {
  if (!isCogneeEnabled()) {
    return NextResponse.json({ cards: [], scanned: 0, generatedAt: new Date().toISOString(), degraded: "cognee disabled" });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  const scan = await getPulse(new Date().toISOString(), force);
  const cards = scan.cards.filter(
    (c) =>
      // Never surface a card whose evidence mentions a forgotten term…
      !containsForgotten(`${c.title} ${c.detail} ${c.sources.map((s) => s.quote).join(" ")}`) &&
      // …or a finding the team already graded as dismissed (the loop learning).
      !isDismissed(c.title),
  );
  return NextResponse.json({ ...scan, cards });
}
