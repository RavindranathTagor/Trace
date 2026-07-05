import { NextRequest, NextResponse } from "next/server";
import { checkMessage } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/guard-test { text, author? } -> runs the Guardian's drift/duplicate check
// against memory and returns the raw alert (or null). Dev diagnostic for the guard.
export async function POST(req: NextRequest) {
  const { text, author } = (await req.json().catch(() => ({}))) as { text?: string; author?: string };
  if (!text?.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const started = Date.now();
  const alert = await checkMessage(text.trim(), author);
  return NextResponse.json({ alert, tookMs: Date.now() - started });
}
