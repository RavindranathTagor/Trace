import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { forget, clearForget, forgottenList } from "@/lib/forget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/forget  { target: "Project Atlas" }  — redact matching nodes.
// { clear: true } resets the redaction list.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { target?: string; clear?: boolean };

  if (body.clear) {
    clearForget();
    return NextResponse.json({ ok: true, forgotten: forgottenList() });
  }

  const target = (body.target ?? "").trim();
  if (!target) return NextResponse.json({ error: "target is required" }, { status: 400 });

  forget(target);

  // Live Cognee node-level deletion: best-effort.
  // VERIFY Day 0: the exact node/entity delete endpoint. The graph-filter above
  // guarantees the visual redaction regardless.
  if (isCogneeEnabled()) {
    // TODO(day0): call a node/entity delete endpoint for `target` when confirmed.
  }

  return NextResponse.json({ ok: true, forgotten: forgottenList() });
}
