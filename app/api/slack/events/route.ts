import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isCogneeEnabled } from "@/lib/config";
import { getIntegrations } from "@/lib/integrations";
import { enqueueIngest } from "@/lib/ingestBuffer";
import { checkMessage } from "@/lib/guard";
import { search, searchChunks } from "@/lib/cognee";
import { composeAnswer } from "@/lib/compose";
import { redactRecall } from "@/lib/forget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify a Slack request signature: v0=HMAC-SHA256 over `v0:{ts}:{rawBody}` with
// the app's signing secret, plus a 5-minute replay window. Returns false on any
// mismatch/stale timestamp. https://api.slack.com/authentication/verifying-requests-from-slack
function verifySlackSignature(raw: string, ts: string | null, sig: string | null, secret: string): boolean {
  if (!ts || !sig) return false;
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 60 * 5) return false; // replay guard
  const expected = "v0=" + createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST /api/slack/events — Slack Events API. Handles the one-time URL-verification
// challenge, then ingests channel messages and posts a cited drift alert back into
// the thread (same guardian behavior as the Discord bot). Responds in <3s (Slack's
// requirement) and does the guard work in the background.
export async function POST(req: NextRequest) {
  // Read the RAW body first — signature verification must run over the exact bytes.
  const raw = await req.text();

  // Authenticate the request when a signing secret is configured. If it's unset we
  // fail open (dev/hackathon setup) but warn loudly — set SLACK_SIGNING_SECRET in prod.
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (secret) {
    const ok = verifySlackSignature(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"), secret);
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  } else {
    console.warn("[slack] SLACK_SIGNING_SECRET not set — accepting UNVERIFIED events (dev only)");
  }

  let payload: {
    type?: string;
    challenge?: string;
    event?: { type?: string; subtype?: string; bot_id?: string; text?: string; user?: string; channel?: string; ts?: string; thread_ts?: string };
  };
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const e = payload.event;
  // @mention the bot → answer the question from memory (parity with Discord).
  if (e?.type === "app_mention" && e.text?.trim() && isCogneeEnabled()) {
    void handleSlackMention(e.text.trim(), e.user, e.channel);
    return NextResponse.json({ ok: true });
  }
  // Any other channel message → ingest + guard for drift/duplication.
  if (e?.type === "message" && !e.subtype && !e.bot_id && e.text?.trim() && isCogneeEnabled()) {
    void handleSlackMessage(e.text.trim(), e.user, e.channel);
  }
  return NextResponse.json({ ok: true });
}

async function slackPost(channel: string, text: string, thread_ts?: string) {
  const { slack } = getIntegrations();
  if (!slack.botToken) return; // two-way replies need a bot token (not just a webhook)
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${slack.botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text, thread_ts }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}

// Q&A: strip the bot mention, recall from memory (chunks + graph + composed answer),
// and reply in-thread with a cited answer.
async function handleSlackMention(text: string, user: string | undefined, channel: string | undefined) {
  const query = text.replace(/<@[^>]+>/g, "").trim();
  if (!query || !channel) return;
  let answer = "I couldn't find that in the team's memory yet.";
  try {
    const [ctx, chunks] = await Promise.all([
      search(query, { searchType: "GRAPH_COMPLETION", onlyContext: true, topK: 8 }).catch(
        () => ({ answer: "", context: "", nodeIds: [], source: "cognee" as const }),
      ),
      searchChunks(query, 3).catch(() => [] as string[]),
    ]);
    const context = [...chunks, ctx.context || ctx.answer].filter(Boolean).join("\n\n");
    const composed = redactRecall({ answer: await composeAnswer(query, context), context, nodeIds: ctx.nodeIds, sources: chunks, source: "cognee" });
    if (composed.answer?.trim()) {
      answer = composed.answer.slice(0, 1500);
      if (composed.sources?.[0]) answer += `\n> 📎 ${String(composed.sources[0]).replace(/\s+/g, " ").slice(0, 180)}`;
    }
  } catch {
    answer = "The team memory service is unavailable right now.";
  }
  // Discord-style reply: post INLINE in the channel (no thread) with the asker's
  // question quoted as the reply reference, then the clean answer. No "*Trace*"
  // header — Slack already shows the bot's name + avatar, just like Discord.
  const reference = `> ${user ? `<@${user}> ` : ""}${query}`;
  await slackPost(channel, `${reference}\n${answer}`);
}

async function handleSlackMessage(text: string, user: string | undefined, channel: string | undefined) {
  enqueueIngest([`slack ${user ? `<@${user}>` : ""}: ${text}`]);
  try {
    const alert = await checkMessage(text, user ? `<@${user}>` : undefined);
    if (alert && channel) {
      // Discord-style inline reply: quote the message that triggered it, then the
      // cited prior decision — posted inline in the channel (no thread wrap).
      const reference = `> ${user ? `<@${user}> ` : ""}${text.slice(0, 220)}`;
      const cite = `> ${alert.prior.quote}${alert.prior.who ? ` — ${alert.prior.who}` : ""}`;
      const body = `${reference}\n⚠️ *Trace · ${alert.headline}*\nThis may reverse an earlier decision:\n${cite}\n${alert.why}`;
      await slackPost(channel, body);
    }
  } catch {
    /* best-effort */
  }
}
