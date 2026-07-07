import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getIntegrations, saveIntegrations } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/github { token, repo:"owner/name", publicUrl }
// Saves the PAT + repo, then AUTO-CREATES the pull_request webhook on the repo
// pointing at <publicUrl>/api/github/webhook with a generated HMAC secret, the
// whole GitHub setup in one click (no manual webhook page).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; repo?: string; publicUrl?: string };
  const token = body.token?.trim();
  const repo = body.repo?.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  const publicUrl = body.publicUrl?.trim().replace(/\/$/, "");

  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "Provide a GitHub token and repo as owner/name." }, { status: 400 });
  }
  if (!publicUrl || !/^https:\/\//.test(publicUrl)) {
    return NextResponse.json({ error: "Provide the public tunnel URL (https://…) GitHub can reach." }, { status: 400 });
  }

  const gh = (path: string, init: RequestInit) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

  // Verify token+repo access.
  const check = await gh("", { method: "GET" }).catch(() => null);
  if (!check || !check.ok) {
    return NextResponse.json({ error: `Can't access ${repo} with that token (${check?.status ?? "network error"}).` }, { status: 400 });
  }

  const secret = getIntegrations().github.secret || randomBytes(16).toString("hex");
  const hookUrl = `${publicUrl}/api/github/webhook`;

  // Reuse an existing hook for this URL if present, else create one.
  let webhookId: number | undefined;
  try {
    const hooksRes = await gh("/hooks", { method: "GET" });
    const hooks = (await hooksRes.json().catch(() => [])) as Array<{ id: number; config?: { url?: string } }>;
    const existing = Array.isArray(hooks) ? hooks.find((h) => h.config?.url === hookUrl) : undefined;
    if (existing) {
      webhookId = existing.id;
      await gh(`/hooks/${existing.id}/config`, { method: "PATCH", body: JSON.stringify({ url: hookUrl, secret, content_type: "json" }) });
    } else {
      const createRes = await gh("/hooks", {
        method: "POST",
        body: JSON.stringify({ name: "web", active: true, events: ["pull_request"], config: { url: hookUrl, content_type: "json", secret } }),
      });
      const created = (await createRes.json().catch(() => ({}))) as { id?: number; message?: string };
      if (!createRes.ok) {
        return NextResponse.json({ error: `Webhook create failed: ${created.message ?? createRes.status}` }, { status: 400 });
      }
      webhookId = created.id;
    }
  } catch (err) {
    return NextResponse.json({ error: `Webhook setup error: ${err instanceof Error ? err.message : err}` }, { status: 500 });
  }

  saveIntegrations({ github: { token, repo, publicUrl, secret, webhookId } });
  // Expose the secret to the webhook verifier via env for this process.
  process.env.GITHUB_TOKEN = token;
  process.env.GITHUB_WEBHOOK_SECRET = secret;

  return NextResponse.json({ ok: true, repo, webhookId, hookUrl });
}

export async function DELETE() {
  const { github } = getIntegrations();
  if (github.token && github.repo && github.webhookId) {
    await fetch(`https://api.github.com/repos/${github.repo}/hooks/${github.webhookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${github.token}`, Accept: "application/vnd.github+json" },
    }).catch(() => {});
  }
  saveIntegrations({ github: { token: "", repo: "", publicUrl: "", secret: "", webhookId: undefined } });
  return NextResponse.json({ ok: true });
}
