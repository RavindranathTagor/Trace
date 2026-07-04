import { NextRequest, NextResponse } from "next/server";
import { saveIntegrations } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/teams { webhookUrl }
// Microsoft Teams: paste a channel's Incoming Webhook URL to receive briefings.
// (Ingesting Teams messages needs the Bot Framework adapter — see adapters/teams.)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { webhookUrl?: string };
  const webhookUrl = body.webhookUrl?.trim();
  if (!webhookUrl || !/^https:\/\/[\w.-]*(webhook\.office\.com|office\.com|microsoft)/i.test(webhookUrl)) {
    return NextResponse.json({ error: "Paste a Microsoft Teams Incoming Webhook URL." }, { status: 400 });
  }
  saveIntegrations({ teams: { webhookUrl } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  saveIntegrations({ teams: { webhookUrl: "" } });
  return NextResponse.json({ ok: true });
}
