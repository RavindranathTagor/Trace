import { NextRequest, NextResponse } from "next/server";
import { config, isBaselineEnabled } from "@/lib/config";
import { getModel, setModel } from "@/lib/modelStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hide non-chat Groq models (speech / safety / embeddings) from the picker.
const NON_CHAT = /whisper|tts|guard|embed|distil-whisper/i;

// GET /api/models -> { models: string[], selected }
export async function GET() {
  let models: string[] = [];
  if (isBaselineEnabled()) {
    try {
      const res = await fetch(`${config.baseline.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.baseline.apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id?: string }> };
        models = (data.data ?? [])
          .map((m) => m.id ?? "")
          .filter((id) => id && !NON_CHAT.test(id))
          .sort();
      }
    } catch (err) {
      console.error("[models] list failed:", err instanceof Error ? err.message : err);
    }
  }
  const selected = getModel();
  if (!models.includes(selected)) models.unshift(selected);
  return NextResponse.json({ models, selected });
}

// POST /api/models { model } -> set the active answer model
export async function POST(req: NextRequest) {
  const { model } = (await req.json().catch(() => ({}))) as { model?: string };
  if (!model) return NextResponse.json({ error: "model is required" }, { status: 400 });
  setModel(model);
  return NextResponse.json({ ok: true, selected: getModel() });
}
