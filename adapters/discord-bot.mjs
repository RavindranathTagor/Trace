// Hindsight Discord adapter.
// - Auto-ingests every channel message into Cognee via POST /api/ingest.
// - Mentioning the bot ("@Hindsight what did we decide about pricing?") answers
//   from the team's memory right in the channel.
//
// Run:  cd adapters && npm install && node discord-bot.mjs
// Env:  DISCORD_BOT_TOKEN (required), HINDSIGHT_BASE_URL (default http://localhost:3001),
//       DISCORD_CHANNEL_ID (optional — restrict ingest to one channel)
//
// Discord setup: create an app + bot at https://discord.com/developers, enable the
// "MESSAGE CONTENT INTENT", invite it to your server, then run this script.
// Discord uses an outbound gateway (WebSocket) so NO public tunnel is needed.

import { Client, GatewayIntentBits, Events } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
// Default 3001 — matches where the app runs (3000 is often taken, e.g. Grafana).
// TRACE_BASE_URL is the current name; HINDSIGHT_BASE_URL kept for backward compat.
const BASE = process.env.TRACE_BASE_URL ?? process.env.HINDSIGHT_BASE_URL ?? "http://localhost:3001";
const ONLY_CHANNEL = process.env.DISCORD_CHANNEL_ID ?? "";
const BACKFILL_ON_START = (process.env.BACKFILL_ON_START ?? "true") !== "false";
const BACKFILL_LIMIT = parseInt(process.env.BACKFILL_LIMIT ?? "200", 10);

if (!TOKEN) {
  console.error("Set DISCORD_BOT_TOKEN. Aborting.");
  process.exit(1);
}

// Friendly guidance for the most common setup error.
process.on("uncaughtException", (err) => {
  if (String(err?.message).includes("disallowed intents")) {
    console.error(
      "\n[Hindsight] Discord rejected the connection: the MESSAGE CONTENT INTENT is not enabled.\n" +
        "Fix: https://discord.com/developers/applications → your app → Bot →\n" +
        "  Privileged Gateway Intents → turn ON 'Message Content Intent' → Save, then re-run.\n",
    );
    process.exit(1);
  }
  throw err;
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function ingestBatch(messages, attempt = 1) {
  if (!messages.length) return;
  try {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      return ingestBatch(messages, attempt + 1);
    }
    console.error("ingest batch failed after retries:", err?.message || err);
  }
}

// Automatically load a channel's recent history on startup, so memory is always
// up to date without running a separate backfill step.
async function autoBackfill(channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.messages) return;
    const collected = [];
    let before;
    while (collected.length < BACKFILL_LIMIT) {
      const batch = await channel.messages.fetch({ limit: Math.min(100, BACKFILL_LIMIT - collected.length), before });
      if (!batch.size) break;
      const arr = [...batch.values()];
      collected.push(...arr);
      before = arr[arr.length - 1].id;
    }
    const payload = collected
      .filter((m) => !m.author.bot && m.content && m.content.trim())
      .reverse()
      .map((m) => ({
        source: "discord",
        channel: m.channelId,
        author: m.author.username,
        text: m.content,
        ts: new Date(m.createdTimestamp).toISOString(),
      }));
    for (let i = 0; i < payload.length; i += 25) await ingestBatch(payload.slice(i, i + 25));
    console.log(`Auto-backfill: ingested ${payload.length} past messages from channel ${channelId}.`);
  } catch (err) {
    console.error("Auto-backfill failed:", err);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Hindsight Discord adapter ready as ${c.user.tag}`);
  console.log(`Ingesting -> ${BASE}/api/ingest`);
  if (ONLY_CHANNEL) {
    console.log(`Filter: ONLY ingesting channel id ${ONLY_CHANNEL}. (Messages elsewhere are skipped.)`);
  } else {
    console.log("Filter: none — ingesting every channel the bot can see.");
  }
  if (BACKFILL_ON_START && ONLY_CHANNEL) {
    console.log(`Auto-backfilling last ${BACKFILL_LIMIT} messages...`);
    await autoBackfill(ONLY_CHANNEL);
  }
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;
  if (ONLY_CHANNEL && msg.channelId !== ONLY_CHANNEL) {
    console.log(`[skip] message in channel ${msg.channelId} — filter is set to ${ONLY_CHANNEL}. (Fix DISCORD_CHANNEL_ID or remove it.)`);
    return;
  }

  // Auto-ingest any attached files (PDF / Word / Excel / CSV / Markdown / text).
  if (msg.attachments.size > 0) {
    console.log(`[attach] ${msg.attachments.size} attachment(s) from ${msg.author.username}`);
    for (const att of msg.attachments.values()) {
      const fname = att.name || "file";
      if (!/\.(pdf|docx|xlsx|xls|csv|txt|md|markdown|vtt|srt|json|log)$/i.test(fname)) {
        console.log(`[attach] skipped ${fname} (unsupported type)`);
        continue;
      }
      try {
        const r = await fetch(att.url);
        const buf = await r.arrayBuffer();
        const fd = new FormData();
        fd.append("files", new Blob([buf]), fname);
        const res = await fetch(`${BASE}/api/ingest-file`, { method: "POST", body: fd });
        console.log(`[file] ingested attachment: ${fname} -> ${res.status}`);
      } catch (err) {
        console.error("[file] attachment ingest failed:", fname, err);
      }
    }
  }

  const mentioned = client.user && msg.mentions.has(client.user.id);

  if (mentioned) {
    // Treat as a question to the team's memory.
    const query = msg.content.replace(/<@!?\d+>/g, "").trim();
    if (!query) return;
    console.log(`[ask] ${msg.author.username}: ${query}`);
    try {
      const res = await fetch(`${BASE}/api/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, onlyContext: false }),
      });
      const data = await res.json();
      let reply = data.answer?.slice(0, 1600) || "I couldn't find that in the team's memory.";
      if (data.sources && data.sources[0]) {
        reply += `\n\n> 📎 ${String(data.sources[0]).replace(/\s+/g, " ").slice(0, 180)}`;
      }
      await msg.reply(reply.slice(0, 1900));
    } catch (err) {
      console.error("recall failed:", err);
      await msg.reply("Memory service is unavailable right now.");
    }
    return;
  }

  // Skip empty / file-only messages — the attachment was already ingested above.
  if (!msg.content.trim()) return;

  // GUARDIAN (the agent): check this message against PRIOR memory BEFORE ingesting
  // it. If it contradicts or duplicates a past decision, Trace speaks up in-thread.
  try {
    const g = await fetch(`${BASE}/api/guard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg.content, author: msg.author.username }),
    });
    const gd = await g.json().catch(() => ({}));
    if (gd && gd.message) {
      console.log(`[guard] ⚠ alert on ${msg.author.username}'s message`);
      await msg.reply(String(gd.message).slice(0, 1900));
    }
  } catch (err) {
    console.error("guard check failed:", err?.message || err);
  }

  // Then auto-ingest the message so it becomes part of memory for future checks.
  console.log(`[ingest] ${msg.author.username}: ${msg.content.slice(0, 80)}`);
  try {
    await fetch(`${BASE}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "discord",
        channel: msg.channelId,
        author: msg.author.username,
        text: msg.content,
        ts: new Date(msg.createdTimestamp).toISOString(),
      }),
    });
  } catch (err) {
    console.error("ingest failed:", err);
  }
});

client.login(TOKEN);
