import { NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { forgetDataset, resetDatasetCache } from "@/lib/cognee";
import { clearForget } from "@/lib/forget";
import { clearPulseCache } from "@/lib/pulse";
import { clearGithubAlerts } from "@/lib/githubAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/clear -> wipe the team memory (delete the Cognee dataset) AND all
// derived state (redactions, cached briefing, GitHub catches) so the product
// truly starts fresh and fills from real chat.
export async function POST() {
  clearForget();
  clearPulseCache();
  clearGithubAlerts();
  if (!isCogneeEnabled()) {
    return NextResponse.json({ ok: true, source: "mock" });
  }
  try {
    await forgetDataset();
    resetDatasetCache();
    return NextResponse.json({ ok: true, source: "cognee" });
  } catch (err) {
    console.error("[clear] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
