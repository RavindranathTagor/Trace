import { NextRequest, NextResponse } from "next/server";
import { getIntegrations, saveIntegrations } from "@/lib/integrations";
import { startBot, stopBot, botStatus } from "@/lib/botManager";
import { inviteUrl, botIdFromToken } from "@/lib/discordRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/discord { token?, channelId?, action?: "start" | "stop" }
// Saving a token + hitting start is the whole Discord setup — the app runs the
// agent as a managed child process (no terminal needed).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; channelId?: string; action?: string };

  if (body.token !== undefined || body.channelId !== undefined) {
    const token = body.token?.trim();
    if (token && !botIdFromToken(token)) {
      return NextResponse.json({ error: "That doesn't look like a Discord bot token." }, { status: 400 });
    }
    saveIntegrations({
      discord: {
        ...(token !== undefined ? { token } : {}),
        ...(body.channelId !== undefined ? { channelId: body.channelId.trim() } : {}),
      },
    });
  }

  if (body.action === "stop") {
    saveIntegrations({ discord: { autoStart: false } }); // don't auto-respawn after a deliberate stop
    stopBot();
  } else if (body.action === "start" || body.token) {
    const r = startBot();
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    saveIntegrations({ discord: { autoStart: true } }); // re-spawn on future server boots
  }

  const cfg = getIntegrations();
  return NextResponse.json({
    ok: true,
    inviteUrl: cfg.discord.token ? inviteUrl(cfg.discord.token) : null,
    bot: botStatus(),
  });
}

// DELETE -> stop the agent and forget the connection.
export async function DELETE() {
  stopBot();
  saveIntegrations({ discord: { token: "", channelId: "", autoStart: false } });
  return NextResponse.json({ ok: true });
}
