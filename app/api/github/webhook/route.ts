import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { checkMessage } from "@/lib/guard";
import { add } from "@/lib/cognee";
import { recordGithubAlert } from "@/lib/githubAlerts";
import { getIntegrations } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This endpoint is exposed to the public internet via the tunnel, so:
//  - if GITHUB_WEBHOOK_SECRET is set, we verify GitHub's X-Hub-Signature-256 HMAC
//    over the RAW body and reject anything unsigned/mis-signed;
//  - URLs from the payload are only trusted if they point at github.com.
function verifySignature(raw: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice("sha256=".length);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
}

const safeGithubUrl = (u: unknown): string =>
  typeof u === "string" && /^https:\/\/(www\.)?github\.com\//.test(u) ? u : "";
const safeAvatarUrl = (u: unknown): string | undefined =>
  typeof u === "string" && /^https:\/\/avatars\.githubusercontent\.com\//.test(u) ? u : undefined;

// POST /api/github/webhook — GitHub PR events. The cross-source drift catch:
// a PR that reverses a decision made in chat. We guard the PR against the team's
// memory, ingest it, record a dashboard alert, and (with GITHUB_TOKEN) comment
// on the PR in-line.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET || getIntegrations().github.secret;
  if (secret && !verifySignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event") ?? "manual";
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Only PR opens/edits matter; ignore pings, pushes, reviews, etc.
  if (event !== "manual" && event !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: event });
  }
  const pr = payload.pull_request ?? payload;
  const action = payload.action as string | undefined;
  if (event === "pull_request" && action && !["opened", "edited", "reopened", "synchronize"].includes(action)) {
    return NextResponse.json({ ok: true, ignored: action });
  }

  const title = String(pr.title ?? payload.title ?? "").trim();
  const bodyText = String(pr.body ?? payload.body ?? "").trim();
  const author = String(pr.user?.login ?? payload.author ?? "a teammate");
  const commentsUrl = String(pr.comments_url ?? payload.commentsUrl ?? "");
  const text = [title, bodyText].filter(Boolean).join(". ");
  if (!text) return NextResponse.json({ ok: true, ignored: "empty PR" });
  if (!isCogneeEnabled()) return NextResponse.json({ ok: true, alert: null, degraded: "cognee disabled" });

  const meta = {
    number: typeof pr.number === "number" ? pr.number : undefined,
    title,
    url: safeGithubUrl(pr.html_url ?? payload.url),
    author,
    avatarUrl: safeAvatarUrl(pr.user?.avatar_url),
    commentsUrl,
    text,
  };

  // REAL GitHub deliveries: respond instantly (GitHub times out webhooks at ~10s,
  // and the guard's retrieval + LLM can take much longer), then process in the
  // background — the dashboard polls the alert store, so the catch appears async.
  if (event === "pull_request") {
    void processDrift(meta);
    return NextResponse.json({ ok: true, queued: true });
  }
  // Manual/test calls: process synchronously and return the alert so it's verifiable.
  const alert = await processDrift(meta);
  return NextResponse.json({ ok: true, alert });
}

interface DriftMeta {
  number?: number;
  title: string;
  url: string;
  author: string;
  avatarUrl?: string;
  commentsUrl: string;
  text: string;
}

async function processDrift(m: DriftMeta) {
  // Guard the PR against prior decisions in memory (cross-source drift).
  const alert = await checkMessage(m.text, m.author);

  // Record the catch so the dashboard can surface it (with PR link + author).
  if (alert) {
    recordGithubAlert({
      number: m.number,
      title: m.title,
      url: m.url,
      author: m.author,
      avatarUrl: m.avatarUrl,
      headline: alert.headline,
      why: alert.why,
      prior: alert.prior,
    });
  }

  // Ingest the PR so it's part of memory going forward.
  void add([`github (PR) ${m.author}: ${m.text}`], ["github"]).catch(() => {});

  // Comment back on the PR if we caught something. Only ever POST to api.github.com.
  const token = process.env.GITHUB_TOKEN || getIntegrations().github.token;
  if (alert && token && /^https:\/\/api\.github\.com\//.test(m.commentsUrl)) {
    const cite =
      `> ${alert.prior.quote}` +
      (alert.prior.who || alert.prior.when ? ` — ${[alert.prior.who, alert.prior.when].filter(Boolean).join(", ")}` : "");
    const comment = [`**Trace** · ${alert.headline}`, "⚠️ This PR may reverse an earlier decision:", cite, alert.why]
      .filter(Boolean)
      .join("\n\n");
    try {
      await fetch(m.commentsUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment }),
      });
    } catch {
      /* comment is best-effort */
    }
  }
  return alert;
}
