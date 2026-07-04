import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { checkMessage, type GuardAlert } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/guard { text, author? } -> { alert, message } | { alert: null }
// The real-time Guardian: does this new message contradict/duplicate a past
// decision? Adapters (Discord/Slack/GitHub) call this and post `message` in-thread.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; author?: string };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ alert: null });
  if (!isCogneeEnabled()) return NextResponse.json({ alert: null });

  const alert = await checkMessage(text, body.author);
  return NextResponse.json({ alert, message: alert ? formatAlert(alert) : null });
}

/** Render an alert as a chat message the adapter can post verbatim. */
function formatAlert(a: GuardAlert): string {
  const tag = a.kind === "drift" ? "⚠️ Heads up — this may reverse an earlier decision." : "⧉ Heads up — this looks like duplicate work.";
  const cite = `> ${a.prior.quote}` + (a.prior.who || a.prior.when ? ` — ${[a.prior.who, a.prior.when].filter(Boolean).join(", ")}` : "");
  const parts = [`**Trace** · ${a.headline}`, tag, cite];
  if (a.why) parts.push(a.why);
  if (a.owner) parts.push(`cc @${a.owner}`);
  return parts.join("\n");
}
