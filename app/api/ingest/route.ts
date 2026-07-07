import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { enqueueIngest, ingestStatus } from "@/lib/ingestBuffer";
import type { IngestMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ingest , a chat-platform adapter (Discord/Teams/Slack) posts one
// message or an array. We buffer + debounce cognify (see lib/ingestBuffer).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const messages: IngestMessage[] = Array.isArray(body) ? body : [body];
  const texts = messages
    .map((m) => (m?.author ? `${m.author}: ${m.text}` : m?.text))
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0);

  if (texts.length === 0) {
    return NextResponse.json({ error: "no text in messages" }, { status: 400 });
  }

  if (isCogneeEnabled()) {
    enqueueIngest(texts);
    return NextResponse.json({ ok: true, queued: texts.length, status: ingestStatus() });
  }

  // Mock mode: acknowledge but no graph mutation (the mock graph is static).
  return NextResponse.json({ ok: true, queued: texts.length, source: "mock" });
}

// GET /api/ingest -> current buffer status (handy for the UI).
export async function GET() {
  return NextResponse.json(ingestStatus());
}
