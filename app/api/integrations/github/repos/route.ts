import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/github/repos { token } -> { repos: [{ full_name, private }] }
// Lists the repositories a PAT can access so the Sources UI can offer a dropdown
// instead of asking the user to hand-type owner/name. The token is used transiently
// server-side (never persisted here) and results are sorted most-recently-updated.
export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const t = token?.trim();
  if (!t) return NextResponse.json({ error: "Provide a GitHub token first." }, { status: 400 });

  try {
    const repos: { full_name: string; private: boolean }[] = [];
    // Paginate (max 5 pages / 500 repos) so large accounts still resolve quickly.
    for (let page = 1; page <= 5; page++) {
      const r = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json", "User-Agent": "trace" },
        cache: "no-store",
      });
      if (!r.ok) {
        const error = r.status === 401 ? "Token rejected (401) — check the PAT." : `GitHub returned ${r.status}.`;
        return NextResponse.json({ error }, { status: r.status === 401 ? 401 : 502 });
      }
      const batch = (await r.json()) as { full_name: string; private: boolean }[];
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const x of batch) repos.push({ full_name: x.full_name, private: !!x.private });
      if (batch.length < 100) break;
    }
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json({ error: "Could not reach GitHub." }, { status: 502 });
  }
}
