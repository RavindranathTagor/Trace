import { NextResponse } from "next/server";
import { getGithubAlerts, clearGithubAlerts } from "@/lib/githubAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/github/alerts -> recent GitHub PR drift catches for the dashboard.
export async function GET() {
  return NextResponse.json({ alerts: getGithubAlerts() });
}

// DELETE /api/github/alerts -> clear the panel (real PR events repopulate it).
export async function DELETE() {
  clearGithubAlerts();
  return NextResponse.json({ ok: true, cleared: true });
}
