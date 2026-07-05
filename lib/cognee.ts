// Server-side client for self-hosted Cognee (Docker, http://localhost:8000).
// Request/response shapes verified against the cognee source (cognee/api/v1/*).
//
// Notes from the upstream contract:
//   - /add is multipart/form-data: `data` = uploaded files, `datasetName` + `node_set` = form fields.
//   - /cognify + /search are JSON DTOs whose base uses a camelCase alias generator
//     (so searchType/runInBackground are accepted). There is NO temporal flag on /cognify;
//     temporal behavior is requested at search time via search_type=TEMPORAL.
//   - /search returns an ARRAY of { search_result, dataset_id, dataset_name }.
//   - GET /datasets/{id}/graph -> { nodes:[{id,label,type,properties}], edges:[{source,target,label}] }.
//   - Auth is OFF when the server runs with ENABLE_BACKEND_ACCESS_CONTROL=false (our default);
//     set COGNEE_AUTH=true to use register/login -> Bearer.

import { config } from "@/lib/config";
import type { GraphData, GraphNode, NodeType, RecallResult } from "@/lib/types";

const DATASET = config.cognee.dataset;

// Cognee targets. PRIMARY is what env points at (e.g. Cognee Cloud); FALLBACK is
// a local self-hosted instance used AUTOMATICALLY when PRIMARY is slow/down.
// Cloud auth = X-Api-Key + X-Tenant-Id (+ trailing-slash /datasets/); self-host
// uses an optional Bearer login. Same snake_case DTOs work on both.
interface Target {
  base: string;
  cloud: boolean;
  auth: boolean;
}
const PRIMARY: Target = {
  base: config.cognee.baseUrl,
  cloud: !!(config.cognee.apiKey && config.cognee.tenantId),
  auth: config.cognee.auth,
};
const FALLBACK: Target | null =
  config.cognee.fallbackUrl && config.cognee.fallbackUrl !== config.cognee.baseUrl
    ? { base: config.cognee.fallbackUrl, cloud: false, auth: false }
    : null;

// Circuit breaker: after PRIMARY fails, prefer FALLBACK for this long, then re-probe.
// 60s (not 30s) so a stalled Cloud is re-probed less often — we don't want the 8s
// graph poll piling hung connections onto a DB that's already connection-exhausted.
const PENALTY_MS = 60_000;
// Shared across ALL API-route bundles: Next.js can bundle each route separately, so
// a plain module-level `let` would NOT be shared — but the manual switch, circuit
// breaker, and active-backend badge must all agree. globalThis is one instance.
interface CogneeState {
  preference: "auto" | "cloud" | "local";
  primaryDownUntil: number;
  servedBase: string;
  // Per-target "hard down" cooldown (base URL -> unreachable-until timestamp). A
  // target that connection-refuses / can't-resolve is marked here so we never
  // PREFER it (and never trip PRIMARY's breaker for a failover that can't help).
  downUntil: Record<string, number>;
}
const state: CogneeState = ((globalThis as unknown as { __traceCogneeState?: CogneeState }).__traceCogneeState ??= {
  preference: "auto",
  primaryDownUntil: 0,
  servedBase: PRIMARY.base,
  downUntil: {},
});
// Older globalThis instances (hot-reload) may predate downUntil — ensure it exists.
if (!state.downUntil) state.downUntil = {};

// A target that hard-fails to connect is unreachable for this long. Distinct from
// PENALTY_MS (PRIMARY circuit breaker) — this is about "don't bother trying it".
const HARD_DOWN_MS = 30_000;

/** A connect-level failure meaning the target is genuinely down (not a transient
 *  reset or a slow response). ECONNREFUSED = nothing listening; ENOTFOUND/EAI_AGAIN
 *  = DNS. These should mark the target unreachable rather than fail over into it. */
function isHardDownError(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  const code = String(e?.cause?.code ?? e?.code ?? "");
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN";
}

function targetDown(base: string): boolean {
  return Date.now() < (state.downUntil[base] ?? 0);
}

// The two logical backends. "auto" = cloud-primary with failover; "cloud"/"local"
// pin a preferred order but STILL fail over, so we keep working if one is down.
// Writes are SINGLE-WRITE with failover (see writeAll) — a write lands on the
// first reachable target, not replicated across both. If PRIMARY and FALLBACK
// diverge, a failover can serve the other backend's (possibly staler) data.
const ALL: Target[] = [PRIMARY, ...(FALLBACK ? [FALLBACK] : [])];
const CLOUD_T = ALL.find((t) => t.cloud) ?? null;
const LOCAL_T = ALL.find((t) => !t.cloud) ?? null;

export function setBackendPreference(p: "auto" | "cloud" | "local"): void {
  state.preference = p;
  state.primaryDownUntil = 0; // a manual switch clears any penalty so it takes effect now
}
export function backendStatus(): {
  preference: "auto" | "cloud" | "local";
  active: "cloud" | "local";
  hasCloud: boolean;
  hasLocal: boolean;
} {
  return { preference: state.preference, active: activeBackend(), hasCloud: !!CLOUD_T, hasLocal: !!LOCAL_T };
}

/** Order to try targets in: preferred first, the other as automatic fallback. */
function targetOrder(): Target[] {
  if (ALL.length < 2) return ALL;
  let order: Target[];
  if (state.preference === "cloud" && CLOUD_T && LOCAL_T) order = [CLOUD_T, LOCAL_T];
  else if (state.preference === "local" && LOCAL_T && CLOUD_T) order = [LOCAL_T, CLOUD_T];
  // auto: PRIMARY first unless it's in the penalty box
  else order = Date.now() < state.primaryDownUntil ? [ALL[1], ALL[0]] : [...ALL];
  // Never PREFER a hard-down target — push unreachable ones to the back (stable),
  // so we don't waste the first attempt on a dead localhost while Cloud is healthy.
  return order.slice().sort((a, b) => Number(targetDown(a.base)) - Number(targetDown(b.base)));
}

/** Which backend is currently serving requests — for the UI badge. */
export function activeBackend(): "cloud" | "local" {
  const t = ALL.find((x) => x.base === state.servedBase);
  return t && t.cloud ? "cloud" : "local";
}

let cachedToken: string | null = null;

async function authenticate(): Promise<string> {
  const { email, password } = config.cognee;
  try {
    await fetch(`${PRIMARY.base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    /* already registered or registration disabled */
  }
  const form = new URLSearchParams({ username: email, password });
  const res = await fetch(`${PRIMARY.base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error(`Cognee login failed: ${res.status} ${await safeText(res)}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Cognee login: no access_token in response");
  cachedToken = json.access_token;
  return cachedToken;
}

async function token(): Promise<string> {
  return cachedToken ?? (await authenticate());
}

/** A transient network error worth ONE fresh-socket retry vs. a hard "it's down".
 *  undici reuses keep-alive sockets; when the peer (e.g. a cloud LB) closes an idle
 *  one, the next reuse throws `TypeError: fetch failed` with cause ECONNRESET/UND_ERR.
 *  A fresh connection then succeeds. But ECONNREFUSED/ENOTFOUND mean genuinely down —
 *  don't burn a retry there. Timeouts (AbortError) are also not retried here. */
function isTransientNetError(err: unknown): boolean {
  const e = err as { name?: string; message?: string; code?: string; cause?: { code?: string; message?: string } };
  if (e?.name === "AbortError" || e?.name === "TimeoutError") return false;
  const code = String(e?.cause?.code ?? e?.code ?? "");
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN") return false; // hard down
  const msg = `${e?.message ?? ""} ${e?.cause?.message ?? ""}`.toLowerCase();
  return (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code.startsWith("UND_ERR") ||
    msg.includes("fetch failed") ||
    msg.includes("terminated") ||
    msg.includes("other side closed") ||
    msg.includes("socket hang up")
  );
}

/** Fetch against the Cognee API; adds bearer auth only when COGNEE_AUTH=true.
 *  Aborts after timeoutMs so a stalled Cognee/LLM call can never hang the app
 *  (a hung /search previously blocked recall for 300s). */
/** Issue one request to a specific target, with per-target auth + a hard timeout.
 *  Retries ONCE on a transient socket error (stale keep-alive reset) with a fresh
 *  connection — this is the common "fetch failed" seen when polling a cloud LB —
 *  before the caller fails over. String/empty bodies only; a FormData body can't be
 *  replayed, so multipart writes are attempted once. */
async function callTarget(t: Target, path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (t.cloud) {
    headers["X-Api-Key"] = config.cognee.apiKey;
    headers["X-Tenant-Id"] = config.cognee.tenantId;
  } else if (t.auth) {
    headers.Authorization = `Bearer ${await token()}`;
  }
  // Leave FormData alone so fetch sets the multipart boundary itself.
  if (typeof init.body === "string" && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  // The datasets LIST needs a trailing slash on Cloud, none on self-host.
  let p = path;
  if (t.cloud && p === "/datasets") p = "/datasets/";
  else if (!t.cloud && p === "/datasets/") p = "/datasets";
  const url = `${t.base}/api/v1${p}`;
  const replayable = init.body === undefined || typeof init.body === "string";

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // cache:"no-store" is REQUIRED — Next.js App Router caches GET fetches by default.
      return await fetch(url, { ...init, headers, cache: "no-store", signal: controller.signal });
    } catch (err) {
      lastErr = err;
      // Only retry a replayable request on a transient (stale-socket) error.
      if (attempt === 0 && replayable && isTransientNetError(err)) {
        await new Promise((r) => setTimeout(r, 250));
        continue; // fresh connection
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Fetch against Cognee with automatic PRIMARY -> FALLBACK failover. A hung/
 *  timed-out or 5xx PRIMARY (e.g. a Cloud data-plane stall) transparently
 *  switches to local self-hosted Cognee; PRIMARY is re-probed after a cooldown. */
async function api(path: string, init: RequestInit = {}, timeoutMs = 30000, retry = true): Promise<Response> {
  const order = targetOrder();
  let lastErr: unknown = new Error("no cognee target reachable");
  for (let i = 0; i < order.length; i++) {
    const t = order[i];
    const isLast = i === order.length - 1;
    try {
      let res = await callTarget(t, path, init, timeoutMs);
      // Refresh a stale Bearer once (self-host with access control).
      if (res.status === 401 && retry && t.auth && !t.cloud) {
        cachedToken = null;
        res = await callTarget(t, path, init, timeoutMs);
      }
      // A bad-gateway / unavailable from PRIMARY should also fail over.
      if (res.status >= 502 && !isLast) {
        // Only trip the breaker if failing over is actually useful (fallback reachable).
        if (t === PRIMARY && FALLBACK && !targetDown(FALLBACK.base)) state.primaryDownUntil = Date.now() + PENALTY_MS;
        continue;
      }
      state.servedBase = t.base;
      state.downUntil[t.base] = 0; // reachable again
      if (t === PRIMARY) state.primaryDownUntil = 0; // primary healthy again
      return res;
    } catch (err) {
      lastErr = err;
      // A genuine connect failure marks the target unreachable so we stop preferring it.
      if (isHardDownError(err)) state.downUntil[t.base] = Date.now() + HARD_DOWN_MS;
      // Only trip PRIMARY's circuit breaker when there's a REACHABLE fallback to
      // switch to. If the only fallback is down, keep PRIMARY first and retry it —
      // failing over into a dead target just guarantees a mock response.
      if (t === PRIMARY && FALLBACK && !targetDown(FALLBACK.base)) state.primaryDownUntil = Date.now() + PENALTY_MS;
      // fall through to the next target
    }
  }
  throw lastErr;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function expectOk(res: Response, what: string): Promise<Response> {
  if (!res.ok) throw new Error(`Cognee ${what} failed: ${res.status} ${await safeText(res)}`);
  return res;
}

export async function cogneeHealthy(): Promise<boolean> {
  try {
    // Hard timeout — a stalled tenant must not hang /api/health (or its callers).
    const res = await fetch(`${PRIMARY.base}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Lifecycle: remember (add + cognify), recall (search), graph, forget
// ---------------------------------------------------------------------------

/** Durable write to the ACTIVE backend, with automatic failover to the other if
 *  the preferred one is down. Single-write (no cross-backend replica) so ingest
 *  stays fast — when Cloud is up, everything goes to Cloud. A body FACTORY is
 *  required because a FormData/stream body can't be reused across a failover. */
async function writeAll(path: string, makeInit: () => RequestInit, timeoutMs: number, what: string): Promise<void> {
  const order = targetOrder();
  let lastErr: unknown = new Error(`no cognee target for ${what}`);
  for (const t of order) {
    try {
      await expectOk(await callTarget(t, path, makeInit(), timeoutMs), what);
      state.servedBase = t.base;
      state.downUntil[t.base] = 0;
      if (t === PRIMARY) state.primaryDownUntil = 0;
      return;
    } catch (err) {
      lastErr = err;
      if (isHardDownError(err)) state.downUntil[t.base] = Date.now() + HARD_DOWN_MS;
      if (t === PRIMARY && FALLBACK && !targetDown(FALLBACK.base)) state.primaryDownUntil = Date.now() + PENALTY_MS;
    }
  }
  throw lastErr;
}

/** add: ingest raw text blobs into the dataset (multipart), single-write with failover. */
export async function add(texts: string[], nodeSet?: string[]): Promise<void> {
  const makeInit = (): RequestInit => {
    const form = new FormData();
    texts.forEach((t, i) => form.append("data", new Blob([t], { type: "text/plain" }), `memory-${i}.txt`));
    form.append("datasetName", DATASET);
    (nodeSet ?? []).forEach((n) => form.append("node_set", n));
    return { method: "POST", body: form };
  };
  await writeAll("/add", makeInit, 120000, "add");
}

// Dataset UUID is stable per name — resolve once so we can poll pipeline status.
let cachedDatasetId: string | null = null;
async function resolveDatasetId(): Promise<string | null> {
  if (cachedDatasetId) return cachedDatasetId;
  try {
    const res = await expectOk(await api("/datasets/", { method: "GET" }, 15000), "datasets");
    const list = (await res.json()) as Array<{ id?: string; name?: string }>;
    cachedDatasetId = (Array.isArray(list) ? list.find((d) => d.name === DATASET)?.id : undefined) ?? null;
  } catch {
    /* leave null → cognify falls back to a fixed wait */
  }
  return cachedDatasetId;
}

/** Poll GET /datasets/status?dataset=<id> until the pipeline is terminal or the
 *  deadline passes. Cheap, bounded reads — never a long-held blocking connection. */
async function awaitCognify(datasetId: string | null, maxMs: number): Promise<void> {
  if (!datasetId) {
    // No id to poll → a short fixed wait so we don't immediately launch an
    // overlapping cognify job on the same tenant.
    await new Promise((r) => setTimeout(r, 8000));
    return;
  }
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const res = await api(`/datasets/status?dataset=${encodeURIComponent(datasetId)}`, { method: "GET" }, 12000);
      if (!res.ok) continue;
      const map = (await res.json()) as Record<string, string>;
      const st = (map[datasetId] ?? Object.values(map)[0] ?? "").toLowerCase();
      if (st === "completed" || st === "failed") return;
    } catch {
      /* keep polling until the deadline */
    }
  }
}

/** cognify: build the knowledge graph. Runs ASYNC (run_in_background) — a BLOCKING
 *  cognify pins the managed tenant's single worker, so every other call (even
 *  /health) times out for the whole extraction; async keeps it query-able (Cognee
 *  supports concurrent search during cognify). We poll dataset status so callers
 *  still know when the data is ready and we never overlap two cognify jobs. */
export async function cognify(customPrompt?: string): Promise<void> {
  const body = JSON.stringify({
    datasets: [DATASET],
    run_in_background: true,
    chunk_size: 1024,
    ...(customPrompt ? { custom_prompt: customPrompt } : {}),
  });
  // Kick off — returns fast with PipelineRunInfo (may carry dataset_id).
  const res = await expectOk(await api("/cognify", { method: "POST", body }, 30000), "cognify");
  let datasetId: string | null = null;
  try {
    const info = await res.json();
    const one = Array.isArray(info) ? info[0] : info;
    datasetId = one?.dataset_id ?? one?.datasetId ?? null;
  } catch {
    /* fall through to lookup */
  }
  if (!datasetId) datasetId = await resolveDatasetId();
  await awaitCognify(datasetId, 240000);
}

/** remember = add + cognify. */
export async function remember(texts: string[], nodeSet?: string[]): Promise<void> {
  await add(texts, nodeSet);
  await cognify();
}

export type SearchType = "GRAPH_COMPLETION" | "TEMPORAL" | "CHUNKS";

/**
 * recall: query the graph. For the low-latency voice path pass onlyContext=true
 * so Cognee returns the traversed subgraph WITHOUT its completion LLM.
 */
export async function search(
  query: string,
  opts: { searchType?: SearchType; onlyContext?: boolean; topK?: number } = {},
): Promise<RecallResult> {
  const { searchType = "GRAPH_COMPLETION", onlyContext = false, topK = 8 } = opts;
  const res = await api("/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      search_type: searchType,
      datasets: [DATASET],
      top_k: topK,
      only_context: onlyContext,
    }),
  }, 30000);
  await expectOk(res, "search");
  const data = await res.json();
  const { answer, context } = normalizeSearch(data);
  const nodeIds = extractNodeIds(data);
  return { answer, context, nodeIds, source: "cognee" };
}

/**
 * Compose an answer with Cognee's OWN managed LLM. Runs a GRAPH_COMPLETION search
 * with only_context=false, so Cognee both retrieves the subgraph AND writes the
 * answer — no external LLM (Groq) round-trip. `systemPrompt` steers tone/format
 * when the backend honors it; the instruction can also be folded into `query`.
 * Returns "" on empty so callers can fall back.
 */
export async function completeWithCognee(query: string, systemPrompt?: string, topK = 8): Promise<string> {
  const res = await api(
    "/search",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        search_type: "GRAPH_COMPLETION",
        datasets: [DATASET],
        top_k: topK,
        only_context: false,
        ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
      }),
    },
    30000,
  );
  await expectOk(res, "complete");
  const data = await res.json();
  const { answer } = normalizeSearch(data);
  return (answer || "").trim();
}

/** Retrieve the top source chunks (original messages / transcript text) for citations. */
export async function searchChunks(query: string, topK = 3): Promise<string[]> {
  try {
    const res = await api(
      "/search",
      { method: "POST", body: JSON.stringify({ query, search_type: "CHUNKS", datasets: [DATASET], top_k: topK }) },
      12000,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    // Cloud wraps chunks as { search_result: [ {text}, ... ] } (one entry per
    // dataset); self-host returns chunk objects directly. Flatten both shapes.
    const texts: string[] = [];
    for (const item of items) {
      const sr =
        item && typeof item === "object" && "search_result" in (item as object)
          ? (item as { search_result?: unknown }).search_result
          : item;
      const arr = Array.isArray(sr) ? sr : [sr];
      for (const c of arr) texts.push(extractChunkText(c));
    }
    return texts
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, topK);
  } catch {
    return [];
  }
}

function extractChunkText(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const sr = o.search_result ?? o;
    if (typeof sr === "string") return sr;
    if (sr && typeof sr === "object") {
      const s = sr as Record<string, unknown>;
      return String(s.text ?? s.content ?? s.chunk ?? "");
    }
  }
  return "";
}

/** Get the dataset's graph as {nodes, edges} for visualization. */
export async function getGraph(): Promise<GraphData> {
  const id = await datasetId();
  if (!id) return { nodes: [], edges: [] };
  // Cloud can take 20-40s to serialize a large graph while healthy-but-busy. The
  // route caches the result (stale-while-revalidate), so a generous cap here only
  // affects the very first warm fetch — after that every poll is served instantly.
  const res = await api(`/datasets/${id}/graph`, { method: "GET" }, 45000);
  await expectOk(res, "getGraph");
  const raw = (await res.json()) as {
    nodes?: Array<{ id: string; label?: string; type?: string; properties?: Record<string, unknown> }>;
    edges?: Array<{ source: string; target: string; label?: string }>;
  };

  // Drop ingestion plumbing (documents/chunks/summaries) so the viz shows the
  // semantic decision graph (entities + their types + relationships).
  const STRUCTURAL = new Set(["textdocument", "documentchunk", "textsummary", "indexschema"]);
  const kept = (raw.nodes ?? []).filter((n) => !STRUCTURAL.has(String(n.type ?? "").toLowerCase()));
  const keptIds = new Set(kept.map((n) => n.id));
  const edges = (raw.edges ?? []).filter((e) => keptIds.has(e.source) && keptIds.has(e.target));

  // Color each entity by the EntityType it links to (e.g. raj -> person).
  const typeLabel = new Map<string, string>();
  kept.forEach((n) => {
    if (String(n.type ?? "").toLowerCase() === "entitytype") typeLabel.set(n.id, (n.label ?? "").toLowerCase());
  });
  const category = new Map<string, string>();
  edges.forEach((e) => {
    if (typeLabel.has(e.target)) category.set(e.source, typeLabel.get(e.target) as string);
    if (typeLabel.has(e.source)) category.set(e.target, typeLabel.get(e.source) as string);
  });

  return {
    nodes: kept.map((n) => toGraphNode(n, category.get(n.id))),
    edges: edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  };
}

/** forget: delete the whole dataset. (Node-level redaction is handled by lib/forget.) */
export async function forgetDataset(): Promise<void> {
  const id = await datasetId();
  if (!id) return;
  const res = await api(`/datasets/${id}`, { method: "DELETE" }, 30000);
  await expectOk(res, "forgetDataset");
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// Cached per-backend: Cloud and local self-host assign different dataset ids.
const dsCache: Record<string, string> = {};

async function datasetId(): Promise<string | null> {
  // Known id → skip the (slow) /datasets list entirely and go straight to the graph.
  // A busy Cloud tenant can take 20-25s just to list datasets; when we already know
  // the id (set once from a successful lookup) this shaves that off every cold fetch.
  const pinned = process.env.COGNEE_DATASET_ID?.trim();
  if (pinned) return pinned;
  // Read AND write the cache under the same key: the backend that LAST served a
  // request (state.servedBase) is the one this call will most likely hit, and is
  // exactly the base api() will re-stamp below. Keying the read on a separate
  // "likelyBase" guess (the old bug) could miss an id already cached by name.
  if (dsCache[state.servedBase]) return dsCache[state.servedBase];
  // callTarget adds the trailing slash for Cloud; cap generously — a busy Cloud
  // tenant can be slow to list datasets, and the id is cached after the first hit.
  const res = await api("/datasets", { method: "GET" }, 25000);
  if (!res.ok) return dsCache[state.servedBase] ?? null;
  const list = (await res.json()) as Array<{ id: string; name?: string }>;
  const match = Array.isArray(list) ? list.find((d) => d.name === DATASET) : null;
  const id = match?.id ?? null;
  // Cache under the base that ACTUALLY served this request (api() set servedBase).
  if (id) dsCache[state.servedBase] = id;
  return id;
}

export function resetDatasetCache(): void {
  for (const k of Object.keys(dsCache)) delete dsCache[k];
}

function toGraphNode(
  n: { id: string; label?: string; type?: string; properties?: Record<string, unknown> },
  category?: string,
): GraphNode {
  return {
    id: n.id,
    label: n.label ?? String(n.id),
    type: classifyNode(n.label, n.type, category),
    properties: n.properties,
  };
}

// Classify using ONLY the label, the cognee `type`, and (for entities) the
// EntityType category it links to — NOT the full properties blob, which carries
// noise like `source_task` that caused false ActionItem matches.
function classifyNode(label?: string, cogneeType?: string, category?: string): NodeType {
  const hay = `${category ?? ""} ${cogneeType ?? ""} ${label ?? ""}`.toLowerCase();
  const test = (k: string) => hay.includes(k);
  if (test("decision")) return "Decision";
  if (test("action") || test("task")) return "ActionItem";
  if (test("blocker") || test("blocked")) return "Blocker";
  if (test("reason") || test("rationale") || test("cause")) return "Reason";
  if (test("project") || test("product")) return "Project";
  if (test("person") || test("people")) return "Person";
  if (test("meeting") || test("document")) return "Meeting";
  return "Entity";
}

/** search_result may be a string, an array, or a nested object — flatten to text. */
function flattenSearchResult(sr: unknown): string {
  if (sr == null) return "";
  if (typeof sr === "string") return sr;
  if (Array.isArray(sr)) return sr.map(flattenSearchResult).filter(Boolean).join("\n");
  if (typeof sr === "object") {
    const o = sr as Record<string, unknown>;
    if (o.search_result != null) return flattenSearchResult(o.search_result);
    return (
      (o.text as string) ??
      (o.answer as string) ??
      (o.content as string) ??
      JSON.stringify(o)
    );
  }
  return String(sr);
}

function normalizeSearch(data: unknown): { answer: string; context: string } {
  if (typeof data === "string") return { answer: data, context: data };
  if (Array.isArray(data)) {
    const text = data
      .map((d) =>
        typeof d === "string" ? d : flattenSearchResult((d as { search_result?: unknown }).search_result ?? d),
      )
      .filter(Boolean)
      .join("\n");
    return { answer: text, context: text };
  }
  const obj = data as { search_result?: unknown; answer?: string; result?: string; context?: string };
  const answer = obj.search_result != null ? flattenSearchResult(obj.search_result) : obj.answer ?? obj.result ?? "";
  return { answer: String(answer), context: obj.context ?? String(answer) };
}

function extractNodeIds(data: unknown): string[] {
  const ids = new Set<string>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(o)) {
      if ((k === "id" || k === "node_id") && (typeof val === "string" || typeof val === "number")) {
        ids.add(String(val));
      }
      walk(val);
    }
  };
  walk(data);
  return Array.from(ids);
}
