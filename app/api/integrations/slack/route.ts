import { NextRequest, NextResponse } from "next/server";
import { getIntegrations, saveIntegrations } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/slack { botToken?, channel?, webhookUrl? }
// Two modes: (a) bot token + channel = two-way (ingest via Events API + post),
// or (b) an incoming webhook URL = post-only. Saving either connects Slack.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { botToken?: string; channel?: string; webhookUrl?: string };
  const webhookUrl = body.webhookUrl?.trim();
  if (webhookUrl && !/^https:\/\/hooks\.slack\.com\//.test(webhookUrl)) {
    return NextResponse.json({ error: "That doesn't look like a Slack incoming-webhook URL." }, { status: 400 });
  }
  const botToken = body.botToken?.trim();
  if (botToken && !/^xox[bp]-/.test(botToken)) {
    return NextResponse.json({ error: "Slack bot tokens start with xoxb-." }, { status: 400 });
  }
  saveIntegrations({
    slack: {
      ...(botToken !== undefined ? { botToken } : {}),
      ...(body.channel !== undefined ? { channel: body.channel.trim() } : {}),
      ...(webhookUrl !== undefined ? { webhookUrl } : {}),
    },
  });
  return NextResponse.json({ ok: true, configured: !!(getIntegrations().slack.webhookUrl || getIntegrations().slack.botToken) });
}

export async function DELETE() {
  saveIntegrations({ slack: { botToken: "", channel: "", webhookUrl: "" } });
  return NextResponse.json({ ok: true });
}
