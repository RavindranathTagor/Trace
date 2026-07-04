import { NextResponse } from "next/server";
import { getIntegrations, hint } from "@/lib/integrations";
import { botStatus, maybeAutoStart } from "@/lib/botManager";
import { inviteUrl } from "@/lib/discordRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/integrations -> connection status for the hub (tokens redacted).
export async function GET() {
  // Self-heal: if the user had the Discord agent running but a server restart
  // killed the child process, re-spawn it (no-op unless needed).
  maybeAutoStart();
  const cfg = getIntegrations();
  const bot = botStatus();
  return NextResponse.json({
    discord: {
      configured: !!cfg.discord.token,
      tokenHint: hint(cfg.discord.token),
      channelId: cfg.discord.channelId ?? "",
      inviteUrl: cfg.discord.token ? inviteUrl(cfg.discord.token) : null,
      bot,
    },
    github: {
      configured: !!cfg.github.token && !!cfg.github.repo,
      tokenHint: hint(cfg.github.token),
      repo: cfg.github.repo ?? "",
      publicUrl: cfg.github.publicUrl ?? "",
      webhookId: cfg.github.webhookId ?? null,
    },
    slack: {
      configured: !!(cfg.slack.botToken || cfg.slack.webhookUrl),
      mode: cfg.slack.botToken ? "two-way" : cfg.slack.webhookUrl ? "post-only" : null,
      tokenHint: hint(cfg.slack.botToken),
      channel: cfg.slack.channel ?? "",
      webhookSet: !!cfg.slack.webhookUrl,
    },
    teams: {
      configured: !!cfg.teams.webhookUrl,
      webhookSet: !!cfg.teams.webhookUrl,
    },
  });
}
