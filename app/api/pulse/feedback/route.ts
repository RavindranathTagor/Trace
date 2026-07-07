import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { recordFeedback, feedbackStats, type Verdict } from "@/lib/pulseFeedback";
import { add } from "@/lib/cognee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pulse/feedback -> the confirmation-loop scoreboard: how many findings the
// team confirmed vs dismissed, and the precision that climbs as they grade. This is
// the moat made measurable, the number a pull-search product can never show.
export async function GET() {
  const { confirmed, dismissed } = feedbackStats();
  const graded = confirmed + dismissed;
  const precision = graded > 0 ? confirmed / graded : null; // null until anything is graded
  return NextResponse.json({ confirmed, dismissed, graded, precision });
}

// POST /api/pulse/feedback { id, type, title, verdict, sources? }
// Grades a discovery. This is the moat: the grade is stored AND written back into
// the team's memory as a note, so the next scan learns from it (improve/forget).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    type?: string;
    verdict?: Verdict;
  };
  const title = (body.title ?? "").trim();
  const verdict = body.verdict === "dismissed" ? "dismissed" : "confirmed";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  recordFeedback(title, verdict);

  // Close the loop through Cognee: a dismissal teaches the memory that this was
  // intentional/not-real so it won't be re-raised; a confirmation reinforces it.
  if (isCogneeEnabled()) {
    const note =
      verdict === "dismissed"
        ? `[trace-feedback] The team reviewed the finding "${title}" and confirmed it is intentional / not a real ${body.type ?? "issue"}. Do not raise it again.`
        : `[trace-feedback] The team confirmed the finding "${title}" is a real ${body.type ?? "issue"} worth acting on.`;
    // Fire-and-forget: never block the UI on the write.
    void add([note], ["trace-feedback"]).catch((e) =>
      console.error("[pulse/feedback] memory write failed:", e instanceof Error ? e.message : e),
    );
  }

  return NextResponse.json({ ok: true, verdict });
}
