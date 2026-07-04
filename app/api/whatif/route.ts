import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { runDepartureImpact } from "@/lib/whatif";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/whatif?person=Priya -> grounded departure-impact projection (cited).
export async function GET(req: NextRequest) {
  const person = (req.nextUrl.searchParams.get("person") ?? "").trim();
  if (!person) return NextResponse.json({ error: "person is required" }, { status: 400 });
  if (!isCogneeEnabled()) {
    return NextResponse.json({ person, headline: "", items: [], scanned: 0, degraded: "cognee disabled" });
  }
  return NextResponse.json(await runDepartureImpact(person));
}
