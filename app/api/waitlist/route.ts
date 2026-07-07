import { NextRequest, NextResponse } from "next/server";
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight validation capture for the landing page:
//   POST { email?, vote: "up"|"down", comment?, source? }
// Appends to data/waitlist.jsonl AND (reliably, since Render's disk is ephemeral)
// forwards each submission to WAITLIST_WEBHOOK_URL, a Discord or Slack incoming
// webhook, so you get a live feed of who liked/disliked and their comments.
//   GET -> { count, up, down } for the "N people already interested" social proof.

const FILE = join(process.cwd(), "data", "waitlist.jsonl");

interface Entry {
  email?: string;
  vote?: "up" | "down";
  comment?: string;
  source?: string;
  ts: string;
}

// In-memory aggregate so we don't read+parse the whole file on every request.
// Lazily hydrated from disk once per process; then every POST/GET is O(1).
interface Counts { count: number; up: number; down: number; loaded: boolean }
const g = globalThis as unknown as { __traceWaitlist?: Counts };
const counts = (g.__traceWaitlist ??= { count: 0, up: 0, down: 0, loaded: false });

async function ensureLoaded(): Promise<void> {
  if (counts.loaded) return;
  counts.loaded = true; // set before awaiting so concurrent requests don't double-count
  try {
    const raw = await readFile(FILE, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as Entry;
        if (e.email) counts.count++;
        if (e.vote === "up") counts.up++;
        else if (e.vote === "down") counts.down++;
      } catch {
        /* skip malformed line */
      }
    }
  } catch {
    /* no file yet */
  }
}

async function notify(e: Entry) {
  const url = process.env.WAITLIST_WEBHOOK_URL;
  if (!url) return;
  const line =
    `🟢 **Trace waitlist / feedback**\n` +
    (e.vote ? `• Reaction: ${e.vote === "up" ? "👍 likes it" : "👎 not for me"}\n` : "") +
    (e.email ? `• Email: ${e.email}\n` : "") +
    (e.comment ? `• Comment: ${e.comment}\n` : "") +
    (e.source ? `• From: ${e.source}\n` : "");
  try {
    // Discord expects `content`, Slack expects `text`, send both; each ignores the other.
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: line, text: line }),
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    /* best-effort */
  }
}

export async function POST(req: NextRequest) {
  await ensureLoaded();
  const body = (await req.json().catch(() => ({}))) as Partial<Entry>;
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : undefined;
  const vote = body.vote === "up" || body.vote === "down" ? body.vote : undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : undefined;
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 60) : undefined;

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (!email && !vote && !comment) {
    return NextResponse.json({ error: "nothing to submit" }, { status: 400 });
  }

  const entry: Entry = { email, vote, comment, source, ts: new Date().toISOString() };
  try {
    await appendFile(FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    /* ephemeral FS, the webhook is the durable record */
  }
  void notify(entry);

  if (email) counts.count++;
  if (vote === "up") counts.up++;
  else if (vote === "down") counts.down++;

  return NextResponse.json({ ok: true, count: counts.count });
}

export async function GET() {
  await ensureLoaded();
  return NextResponse.json({ count: counts.count, up: counts.up, down: counts.down });
}
