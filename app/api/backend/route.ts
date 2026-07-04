import { NextRequest, NextResponse } from "next/server";
import { backendStatus, setBackendPreference } from "@/lib/cognee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET  /api/backend           -> { preference, active, hasCloud, hasLocal }
// POST /api/backend {preference:"auto"|"cloud"|"local"} -> set + return status
export async function GET() {
  return NextResponse.json(backendStatus());
}

export async function POST(req: NextRequest) {
  const { preference } = (await req.json().catch(() => ({}))) as { preference?: string };
  if (preference !== "auto" && preference !== "cloud" && preference !== "local") {
    return NextResponse.json({ error: "preference must be auto | cloud | local" }, { status: 400 });
  }
  setBackendPreference(preference);
  return NextResponse.json(backendStatus());
}
