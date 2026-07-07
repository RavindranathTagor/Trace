import { NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { remember, resetDatasetCache, forgetDataset } from "@/lib/cognee";
import { clearForget } from "@/lib/forget";
import { allMeetingTexts } from "@/data/sampleMeetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/seed -> ingest the sample quarter-of-meetings into Cognee
// (add + cognify). Run once to populate the demo graph. No-op in mock mode.
export async function POST() {
  clearForget();
  resetDatasetCache();

  if (!isCogneeEnabled()) {
    return NextResponse.json({
      ok: true,
      source: "mock",
      message: "Cognee disabled, the UI is serving the built-in mock graph already.",
    });
  }

  try {
    // Clean rebuild: drop the existing dataset so re-cognify picks up the
    // current config (e.g. the ontology) instead of layering on stale nodes.
    await forgetDataset().catch(() => {});
    resetDatasetCache();
    const texts = allMeetingTexts();
    await remember(texts);
    resetDatasetCache();
    return NextResponse.json({ ok: true, source: "cognee", ingested: texts.length });
  } catch (err) {
    console.error("[seed] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
