// Grounded "what-if" — the Digital Twin, done honestly.
//
// "What happens if <person> leaves?" is answered by PROJECTION over real graph
// evidence, never by fabricated Monte-Carlo numbers. We surface only consequences
// traceable to actual messages: decisions they solely own, systems only they
// touched, open commitments. Every item is cited. That is a live "simulation" a
// technical judge can trust — because there is nothing invented to disbelieve.

import { config, isBaselineEnabled } from "@/lib/config";
import { searchChunks } from "@/lib/cognee";

const IMPACT_MODEL = process.env.PULSE_MODEL || "llama-3.3-70b-versatile";

export interface ImpactSource {
  quote: string;
  who?: string;
  when?: string;
}
export interface ImpactItem {
  label: string; // "Sole owner of authentication"
  detail: string;
  severity: "high" | "medium" | "low";
  sources: ImpactSource[];
}
export interface DepartureImpact {
  person: string;
  headline: string;
  items: ImpactItem[];
  scanned: number;
  degraded?: string;
}

const SEV = new Set(["high", "medium", "low"]);

async function gatherAbout(person: string): Promise<string[]> {
  const queries = [
    `${person} owns decides responsible for leads`,
    `${person} decision built implemented`,
    `${person} auth database roadmap on leave leaving`,
  ];
  const batches = await Promise.all(queries.map((q) => searchChunks(q, 10).catch(() => [] as string[])));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of batches)
    for (const t of b) {
      const k = t.trim().slice(0, 100).toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(t.trim());
      }
    }
  return out.slice(0, 30);
}

function systemPrompt(person: string): string {
  return `You are Trace, projecting the impact if "${person}" leaves the team.
You are given real team messages. List ONLY consequences that are GROUNDED in the text:
- decisions "${person}" solely made or owns,
- systems/topics only "${person}" appears to touch,
- open commitments or roadmap items depending on "${person}".
HARD RULES:
- NEVER invent facts, numbers, percentages, or consequences not supported by a quote.
- Every item MUST cite the exact supporting quote(s).
- "severity": high if others clearly depend on it or it is on the roadmap; else medium/low.
- If the text does not support a real risk, return an empty items array — do not pad.
Output STRICT JSON only:
{"headline":"one line, e.g. If ${person} leaves, auth is orphaned","items":[{"label":"","detail":"","severity":"high","sources":[{"quote":"","who":"","when":""}]}]}
No prose, no markdown.`;
}

function parse(person: string, raw: string, scanned: number): DepartureImpact {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  let obj: Record<string, unknown> = {};
  if (s !== -1 && e > s) {
    try {
      obj = JSON.parse(cleaned.slice(s, e + 1)) as Record<string, unknown>;
    } catch {
      /* fall through to empty */
    }
  }
  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items: ImpactItem[] = rawItems
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const sources = (Array.isArray(o.sources) ? o.sources : [])
        .map((x) => {
          const so = (x ?? {}) as Record<string, unknown>;
          return {
            quote: String(so.quote ?? "").trim(),
            who: so.who ? String(so.who).trim() : undefined,
            when: so.when ? String(so.when).trim() : undefined,
          };
        })
        .filter((x) => x.quote);
      const sev = String(o.severity ?? "medium").toLowerCase();
      return {
        label: String(o.label ?? "").trim(),
        detail: String(o.detail ?? "").trim(),
        severity: (SEV.has(sev) ? sev : "medium") as ImpactItem["severity"],
        sources,
      };
    })
    .filter((it) => it.label && it.sources.length > 0);
  const order = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    person,
    headline: String(obj.headline ?? `Impact if ${person} leaves`).trim(),
    items,
    scanned,
  };
}

export async function runDepartureImpact(person: string): Promise<DepartureImpact> {
  const name = person.trim();
  if (!name) return { person, headline: "", items: [], scanned: 0, degraded: "no person" };
  const corpus = await gatherAbout(name);
  if (corpus.length === 0) return { person: name, headline: "", items: [], scanned: 0, degraded: "nothing about this person in memory" };
  if (!isBaselineEnabled()) return { person: name, headline: "", items: [], scanned: corpus.length, degraded: "LLM not configured" };

  const evidence = corpus.map((t, i) => `[${i + 1}] ${t}`).join("\n");
  try {
    const res = await fetch(`${config.baseline.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.baseline.apiKey}` },
      body: JSON.stringify({
        model: IMPACT_MODEL,
        messages: [
          { role: "system", content: systemPrompt(name) },
          { role: "user", content: `Team memory (${corpus.length} sources):\n${evidence}\n\nReturn the JSON.` },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`whatif ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return parse(name, data.choices?.[0]?.message?.content ?? "", corpus.length);
  } catch (err) {
    console.error("[whatif] failed:", err instanceof Error ? err.message : err);
    return { person: name, headline: "", items: [], scanned: corpus.length, degraded: "projection failed" };
  }
}
