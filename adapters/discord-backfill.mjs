// Hindsight Discord BACKFILL — load a channel's PREVIOUS messages into Cognee.
// Fetches up to BACKFILL_LIMIT past messages from one channel and posts them to
// /api/ingest (oldest-first), so your existing history becomes memory.
//
// Run:  cd adapters && node --env-file=.env discord-backfill.mjs
// Env:  DISCORD_BOT_TOKEN (required), DISCORD_CHANNEL_ID (required — the channel to backfill),
//       HINDSIGHT_BASE_URL (default http://localhost:3000), BACKFILL_LIMIT (default 300)

import { Client, GatewayIntentBits, Events } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const BASE = process.env.TRACE_BASE_URL ?? process.env.HINDSIGHT_BASE_URL ?? "http://localhost:3001";
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const LIMIT = parseInt(process.env.BACKFILL_LIMIT ?? "300", 10);

if (!TOKEN || !CHANNEL_ID) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID (the channel to backfill). Aborting.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Backfill bot ready as ${c.user.tag}; fetching up to ${LIMIT} messages from ${CHANNEL_ID}...`);
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel || !channel.messages) throw new Error("Channel not found or not a text channel");

    const collected = [];
    let before;
    while (collected.length < LIMIT) {
      const batch = await channel.messages.fetch({ limit: Math.min(100, LIMIT - collected.length), before });
      if (!batch.size) break;
      const arr = [...batch.values()];
      collected.push(...arr);
      before = arr[arr.length - 1].id;
    }

    // oldest-first, skip bots + empty
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

    const CHUNK = 25;
    for (let i = 0; i < payload.length; i += CHUNK) {
      await fetch(`${BASE}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.slice(i, i + CHUNK)),
      });
      console.log(`  ingested ${Math.min(i + CHUNK, payload.length)}/${payload.length}`);
    }
    console.log(`Backfill complete: ${payload.length} messages queued. Cognee will cognify them in batches.`);
  } catch (err) {
    console.error("Backfill failed:", err);
  } finally {
    await client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);
