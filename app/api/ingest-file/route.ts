import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { enqueueIngest } from "@/lib/ingestBuffer";
import { parseFileToText } from "@/lib/parseFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ingest-file (multipart form, field "files") -> parse PDF/DOCX/XLSX/CSV/
// text into plain text and ingest into Cognee. Auto-ingest: drop a file, done.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected multipart form-data" }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "no files uploaded" }, { status: 400 });

  const texts: string[] = [];
  const results: Array<{ name: string; chars: number; error?: string }> = [];

  for (const f of files) {
    try {
      const buf = await f.arrayBuffer();
      const text = (await parseFileToText(f.name, buf)).trim();
      if (text) {
        texts.push(`[${f.name}]\n${text}`);
        results.push({ name: f.name, chars: text.length });
      } else {
        results.push({ name: f.name, chars: 0, error: "no extractable text" });
      }
    } catch (err) {
      console.error("[ingest-file] parse failed:", f.name, err);
      results.push({ name: f.name, chars: 0, error: String(err) });
    }
  }

  if (texts.length === 0) {
    return NextResponse.json({ ok: false, error: "no extractable text", files: results }, { status: 422 });
  }

  if (isCogneeEnabled()) enqueueIngest(texts);
  return NextResponse.json({ ok: true, files: results, source: isCogneeEnabled() ? "cognee" : "mock" });
}
