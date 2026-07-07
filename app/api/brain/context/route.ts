import { NextRequest, NextResponse } from "next/server";
import { isCogneeEnabled } from "@/lib/config";
import { searchChunks } from "@/lib/cognee";
import { containsForgotten } from "@/lib/forget";
import { getIntegrations } from "@/lib/integrations";
import { fetchOpenIssues } from "@/lib/github";
import { KNOWN_ISSUES, type KnownIssue, type Severity } from "@/data/knownIssues";
import { NIMBUS_DECISIONS, reversalPairs, decisionsForText, type Decision } from "@/data/decisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/brain/context?topic=&format=json|md|rules&target=cursor|copilot|claude|agents|aider
//
// The COMPANY BRAIN pre-code context pack. A coding agent (Claude Code / Cursor /
// Copilot / Aider / Windsurf) calls this BEFORE it writes code and gets the org's
// live memory, architecture constraints, conventions, past mistakes, rejected
// designs, known bugs, and current ownership, so every agent shares one memory and
// stops reintroducing things the team already ruled out.
//
// Derived instantly from the decision ledger (Cloud-independent), enriched best-effort
// from Cognee + open GitHub issues, and always redacted for forgotten/confidential terms.

const CATEGORY: Record<Decision["tag"], string> = {
  infra: "infrastructure",
  api: "api",
  reliability: "reliability",
  pricing: "product",
  ownership: "ownership",
  company: "company",
};

interface Pack {
  generatedAt: string;
  scope: string;
  architectureConstraints: Array<{ rule: string; category: string; since: string; owner: string; source: string }>;
  conventions: Array<{ rule: string; category: string; source: string }>;
  pastMistakes: Array<{ tried: string; revertedTo: string; why: string; when: string }>;
  rejectedDesigns: Array<{ design: string; rejectedFor: string | null; why: string }>;
  knownBugs: Array<{ area: string; issue: string; workaround: string; severity: Severity; source: string }>;
  ownership: Array<{ area: string; owner: string; risk: string }>;
  citations: string[];
  confidence: number;
}

function buildLedgerPack(topic: string) {
  const scoped = topic ? new Set(decisionsForText(topic).map((d) => d.id)) : null;
  const inScope = (d: Decision) => !scoped || scoped.has(d.id);
  const reversedBy = new Map<string, Decision>();
  reversalPairs().forEach((p) => reversedBy.set(p.from.id, p.to));

  const current = NIMBUS_DECISIONS.filter((d) => d.status === "current" && inScope(d));

  const architectureConstraints = current
    .filter((d) => ["infra", "api", "reliability", "company"].includes(d.tag))
    .map((d) => ({ rule: d.title, category: CATEGORY[d.tag], since: d.date, owner: `${d.owner} (${d.role})`, source: d.sourceQuote }));

  const conventions = current
    .filter((d) => ["api", "pricing"].includes(d.tag))
    .map((d) => ({ rule: d.title, category: CATEGORY[d.tag], source: d.sourceQuote }));

  const pastMistakes = reversalPairs()
    .filter((p) => !scoped || scoped.has(p.to.id) || scoped.has(p.from.id))
    .map((p) => ({ tried: p.from.title, revertedTo: p.to.title, why: p.to.why, when: p.to.date }));

  const rejectedDesigns = NIMBUS_DECISIONS.filter((d) => d.status === "superseded" && inScope(d)).map((d) => ({
    design: d.title,
    rejectedFor: reversedBy.get(d.id)?.title ?? null,
    why: reversedBy.get(d.id)?.why ?? d.why,
  }));

  const ownershipMap = new Map<string, { area: string; owner: string; risk: string }>();
  NIMBUS_DECISIONS.filter((d) => (d.status === "current" || d.status === "at-risk") && inScope(d)).forEach((d) => {
    const existing = ownershipMap.get(d.lane);
    if (!existing) ownershipMap.set(d.lane, { area: d.lane, owner: `${d.owner} (${d.role})`, risk: d.status === "at-risk" ? "single-owner / bus-factor" : "ok" });
    else if (d.status === "at-risk") existing.risk = "single-owner / bus-factor";
  });

  return { architectureConstraints, conventions, pastMistakes, rejectedDesigns, ownership: Array.from(ownershipMap.values()) };
}

/** seed + open GitHub issues + Cognee-derived caveats, all fail-soft, bounded. */
async function gatherBugs(topic: string): Promise<KnownIssue[]> {
  const t = topic.toLowerCase();
  const seed = KNOWN_ISSUES.filter((b) => !t || `${b.area} ${b.issue}`.toLowerCase().includes(t));

  const { github } = getIntegrations();
  const token = process.env.GITHUB_TOKEN || github.token || "";
  const ghP = github.repo && token ? fetchOpenIssues(github.repo, token) : Promise.resolve([] as KnownIssue[]);

  const cogP: Promise<KnownIssue[]> = isCogneeEnabled()
    ? searchChunks("known bugs gotchas caveats regressions workarounds", 6)
        .then((chunks) =>
          chunks
            .filter((c) => /\b(bug|broke|fails?|regress|gotcha|workaround|flaky|race|deadlock|leak|outage)\b/i.test(c))
            .slice(0, 4)
            .map((c, i) => ({ id: `mem-${i}`, area: "from memory", issue: c.replace(/\s+/g, " ").slice(0, 160), workaround: "(see source)", severity: "medium" as Severity, source: "team memory" })),
        )
        .catch(() => [])
    : Promise.resolve([]);

  const [gh, cog] = await Promise.all([ghP, cogP]);
  const seen = new Set<string>();
  return [...seed, ...gh, ...cog].filter((b) => {
    const k = b.issue.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function redactPack(p: Pack): Pack {
  const keep = (...parts: Array<string | null | undefined>) => !containsForgotten(parts.filter(Boolean).join(" "));
  return {
    ...p,
    architectureConstraints: p.architectureConstraints.filter((c) => keep(c.rule, c.source)),
    conventions: p.conventions.filter((c) => keep(c.rule, c.source)),
    pastMistakes: p.pastMistakes.filter((m) => keep(m.tried, m.revertedTo, m.why)),
    rejectedDesigns: p.rejectedDesigns.filter((d) => keep(d.design, d.rejectedFor, d.why)),
    knownBugs: p.knownBugs.filter((b) => keep(b.area, b.issue, b.workaround)),
    ownership: p.ownership.filter((o) => keep(o.area, o.owner)),
    citations: p.citations.filter((c) => keep(c)),
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const topic = (url.searchParams.get("topic") || url.searchParams.get("q") || "").trim();
  const format = (url.searchParams.get("format") || "json").toLowerCase();
  const target = (url.searchParams.get("target") || "agents").toLowerCase();

  const ledger = buildLedgerPack(topic);
  // Bound the enrichment so an agent's pre-code call never hangs on a slow Cloud/GitHub.
  // The timeout fallback is the (topic-scoped) seed list, so scoping survives a stall.
  const seedFallback = KNOWN_ISSUES.filter((b) => !topic || `${b.area} ${b.issue}`.toLowerCase().includes(topic.toLowerCase()));
  const bugs = await Promise.race([gatherBugs(topic), new Promise<KnownIssue[]>((r) => setTimeout(() => r(seedFallback), 3500))]);

  const citations = Array.from(new Set([
    ...ledger.architectureConstraints.map((c) => c.source),
    ...ledger.conventions.map((c) => c.source),
  ])).filter(Boolean).slice(0, 6);

  const total = ledger.architectureConstraints.length + ledger.pastMistakes.length + ledger.rejectedDesigns.length + ledger.ownership.length + bugs.length;

  let pack: Pack = {
    generatedAt: new Date().toISOString(),
    scope: topic || "all",
    ...ledger,
    knownBugs: bugs,
    citations,
    confidence: total === 0 ? 0.3 : Math.min(0.95, 0.6 + total * 0.03),
  };
  pack = redactPack(pack);

  if (format === "md" || format === "rules") {
    const body = renderRules(pack, format === "rules" ? target : "md");
    return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  }
  return NextResponse.json(pack);
}

// ── rules / markdown rendering ────────────────────────────────────────────────
function renderRules(p: Pack, target: string): string {
  const header: Record<string, string> = {
    md: "## Company Brain, org context (from Trace)",
    cursor: "# Cursor rules, generated from the Trace company brain. Do not edit by hand.",
    copilot: "# Copilot instructions, generated from the Trace company brain. Do not edit by hand.",
    claude: "# CLAUDE.md, generated from the Trace company brain. Do not edit by hand.",
    agents: "# AGENTS.md, generated from the Trace company brain. Do not edit by hand.",
    aider: "# Conventions, generated from the Trace company brain. Do not edit by hand.",
  };
  const L: string[] = [header[target] ?? header.md, "", "> Consult this before writing code. It is the team's live, cited memory.", ""];

  if (p.architectureConstraints.length) {
    L.push("### Architecture constraints");
    p.architectureConstraints.forEach((c) => L.push(`- **${c.rule}** _(since ${c.since}, ${c.owner})_`));
    L.push("");
  }
  if (p.conventions.length) {
    L.push("### Conventions");
    p.conventions.forEach((c) => L.push(`- ${c.rule}`));
    L.push("");
  }
  if (p.pastMistakes.length) {
    L.push("### Past mistakes, do NOT repeat");
    p.pastMistakes.forEach((m) => L.push(`- Tried **${m.tried}** → reverted to **${m.revertedTo}** (${m.when}). Why: ${m.why}`));
    L.push("");
  }
  if (p.rejectedDesigns.length) {
    L.push("### Rejected designs");
    p.rejectedDesigns.forEach((d) => L.push(`- **${d.design}**${d.rejectedFor ? `, rejected for ${d.rejectedFor}` : ""}. ${d.why}`));
    L.push("");
  }
  if (p.knownBugs.length) {
    L.push("### Known bugs / gotchas");
    p.knownBugs.forEach((b) => L.push(`- [${b.severity}] **${b.area}**: ${b.issue}, _workaround:_ ${b.workaround} (${b.source})`));
    L.push("");
  }
  if (p.ownership.length) {
    L.push("### Ownership");
    p.ownership.forEach((o) => L.push(`- **${o.area}** → ${o.owner}${o.risk !== "ok" ? ` ⚠️ ${o.risk}` : ""}`));
    L.push("");
  }
  L.push(`_Generated ${p.generatedAt} · scope: ${p.scope} · source: Trace company brain._`);
  return L.join("\n");
}
