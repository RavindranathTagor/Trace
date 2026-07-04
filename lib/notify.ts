// Outbound messaging for the "post the morning briefing" feature. Each destination
// gets a NATIVELY-styled message: Discord markdown, Slack Block Kit, Teams MessageCard —
// so the briefing looks designed, not like raw text pasted everywhere.

import { postToDiscord } from "@/lib/discordRest";
import { getIntegrations } from "@/lib/integrations";
import type { PulseCard, PulseScan } from "@/lib/pulse";

export type Platform = "discord" | "slack" | "teams";

const TYPE_LABEL: Record<PulseCard["type"], string> = {
  drift: "⚠️ Decision drift",
  duplicate: "🔀 Duplicate work",
  ownership: "🔑 Ownership gap",
};
const ACCENT = "4F46E5"; // Trace indigo (Teams themeColor)
const FOOTER = "Cited, dated, zero fabricated numbers · react 👍 / 👎 in the app to train Trace.";

function heading(scan: PulseScan): string {
  const n = scan.cards.length;
  return n === 0 ? "Trace — you're all clear today" : `Trace — ${n} thing${n === 1 ? "" : "s"} your team forgot today`;
}

// ── Discord: markdown (**bold**, > quote, emoji) ──────────────────────────────
export function formatBriefingDiscord(scan: PulseScan): string {
  if (scan.cards.length === 0) return "🟢 **Trace — morning briefing**\nNothing new surfaced today. You're in the clear.";
  const lines = [`🧠 **${heading(scan)}**`, ""];
  scan.cards.forEach((c, i) => {
    lines.push(`**${i + 1}. ${TYPE_LABEL[c.type]} — ${c.title}**`);
    if (c.detail) lines.push(c.detail);
    if (c.soWhat) lines.push(`→ _${c.soWhat}_`);
    const src = c.sources[0];
    if (src?.quote) lines.push(`> ${src.quote.slice(0, 180)}${src.who ? ` — **${src.who}**` : ""}`);
    lines.push("");
  });
  lines.push(`_${FOOTER}_`);
  return lines.join("\n");
}
/** Kept for callers importing the old name. */
export const formatBriefing = formatBriefingDiscord;

// ── Slack: Block Kit (header + sections + context + dividers) ─────────────────
function slackBlocks(scan: PulseScan): unknown[] {
  if (scan.cards.length === 0)
    return [{ type: "section", text: { type: "mrkdwn", text: "🟢 *Trace — morning briefing*\nNothing new surfaced today. You're in the clear." } }];
  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: `🧠 ${heading(scan)}`, emoji: true } },
  ];
  scan.cards.forEach((c, i) => {
    const parts = [`*${i + 1}. ${TYPE_LABEL[c.type]} — ${c.title}*`];
    if (c.detail) parts.push(c.detail);
    if (c.soWhat) parts.push(`→ _${c.soWhat}_`);
    blocks.push({ type: "section", text: { type: "mrkdwn", text: parts.join("\n") } });
    const src = c.sources[0];
    if (src?.quote) blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `> ${src.quote.slice(0, 180)}${src.who ? ` — *${src.who}*` : ""}` }] });
    blocks.push({ type: "divider" });
  });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: FOOTER }] });
  return blocks;
}

// ── Teams: MessageCard with a themed section per finding ──────────────────────
function teamsCard(scan: PulseScan): Record<string, unknown> {
  const sections =
    scan.cards.length === 0
      ? [{ text: "Nothing new surfaced today. You're in the clear." }]
      : scan.cards.map((c, i) => {
          const src = c.sources[0];
          const bits = [c.detail, c.soWhat ? `➡️ _${c.soWhat}_` : "", src?.quote ? `> ${src.quote.slice(0, 180)}${src.who ? ` — ${src.who}` : ""}` : ""].filter(Boolean);
          return { activityTitle: `**${i + 1}. ${TYPE_LABEL[c.type]} — ${c.title}**`, text: bits.join("\n\n") };
        });
  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: "Trace briefing",
    themeColor: ACCENT,
    title: `🧠 ${heading(scan)}`,
    sections,
    text: scan.cards.length ? FOOTER : undefined,
  };
}

// ── delivery ──────────────────────────────────────────────────────────────────
async function postSlack(scan: PulseScan): Promise<boolean> {
  const { slack } = getIntegrations();
  const payload = { blocks: slackBlocks(scan), text: heading(scan) }; // text = notification fallback
  try {
    if (slack.webhookUrl) {
      const r = await fetch(slack.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
      return r.ok;
    }
    if (slack.botToken && slack.channel) {
      const r = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${slack.botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel: slack.channel, ...payload }),
        signal: AbortSignal.timeout(10000),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean };
      return !!j.ok;
    }
  } catch {
    /* best-effort */
  }
  return false;
}

async function postTeams(scan: PulseScan): Promise<boolean> {
  const { teams } = getIntegrations();
  if (!teams.webhookUrl) return false;
  try {
    const r = await fetch(teams.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(teamsCard(scan)), signal: AbortSignal.timeout(10000) });
    return r.ok;
  } catch {
    return false;
  }
}

type Delivered = "sent" | "skipped" | "failed";
export interface DeliveryResult {
  discord: Delivered;
  slack: Delivered;
  teams: Delivered;
}

async function send(enabled: boolean, fn: () => Promise<boolean>): Promise<Delivered> {
  if (!enabled) return "skipped";
  return (await fn()) ? "sent" : "failed";
}

/** Which platforms are actually connected (for the UI to show only these). */
export function connectedPlatforms(): Record<Platform, boolean> {
  const cfg = getIntegrations();
  return {
    discord: !!(cfg.discord.token && cfg.discord.channelId),
    slack: !!(cfg.slack.webhookUrl || (cfg.slack.botToken && cfg.slack.channel)),
    teams: !!cfg.teams.webhookUrl,
  };
}

/** Deliver the briefing. `targets` (optional) restricts to specific platforms;
 *  a platform is only sent to if it's ALSO connected. */
export async function postBriefingEverywhere(scan: PulseScan, targets?: Platform[]): Promise<DeliveryResult> {
  const cfg = getIntegrations();
  const want = (p: Platform) => !targets || targets.includes(p);
  const text = formatBriefingDiscord(scan);

  const [discord, slack, teams] = await Promise.all([
    send(want("discord") && !!(cfg.discord.token && cfg.discord.channelId), () => postToDiscord(cfg.discord.token!, cfg.discord.channelId!, text)),
    send(want("slack") && !!(cfg.slack.webhookUrl || (cfg.slack.botToken && cfg.slack.channel)), () => postSlack(scan)),
    send(want("teams") && !!cfg.teams.webhookUrl, () => postTeams(scan)),
  ]);

  return { discord, slack, teams };
}
