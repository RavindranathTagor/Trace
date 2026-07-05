// Seed a realistic "quarter" with planted signals so Trace's discovery engine has
// real drift, duplicate work, and an ownership gap to find. Reproducible demos.
//
//   npm run seed:demo
//
// Reads Cognee creds from .env.local. Adds to the configured COGNEE_DATASET (it
// does NOT delete first — deleting-and-recreating a cloud dataset can corrupt its
// state; to start clean, set COGNEE_DATASET to a fresh name and re-run).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, "..", ".env.local"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const BASE = env.COGNEE_BASE_URL;
const KEY = env.COGNEE_API_KEY;
const TENANT = env.COGNEE_TENANT_ID;
const DATASET = env.COGNEE_DATASET || "trace-demo";
if (!BASE) throw new Error("COGNEE_BASE_URL missing from .env.local");

const headers = { "Content-Type": "application/json" };
if (KEY) headers["X-Api-Key"] = KEY;
if (TENANT) headers["X-Tenant-Id"] = TENANT;

const CORPUS = [
  "ravindra (Q1, #eng): Decision: we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services.",
  "ravindra (Q1, #eng): Decision: we will NOT support on-prem deployments this year. Cloud-only, to keep the team small.",
  "ravindra (Q1, #eng): I own authentication end to end. All auth changes go through me.",
  "ashwini (Q1, roadmap): Q1 focus is reliability and the analytics dashboard. On-prem is explicitly out of scope.",
  "ravindra (Q1, PR #412 platform-core): Added a generic retry queue in platform-core for all services to use.",
  "pushpa (Q1, #payments): Kicked off the payments service. Ravindra owns auth, I own payments.",
  "sandesh (Q2, #sales): Big customer Acme needs on-prem. We should build on-prem support this quarter.",
  "sandesh (Q2, #billing): Migrating the new billing service to MongoDB for schema flexibility.",
  "pushpa (Q2, #payments): I started building a retry queue for the payments service.",
  "ravindra (Q2, #eng): Heads up, I'm on leave all of next month.",
];

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body), redirect: "follow" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

console.log(`Seeding ${CORPUS.length} messages into dataset "${DATASET}" at ${BASE}…`);
const add = await post("/api/v1/add_text", { textData: CORPUS, datasetName: DATASET });
console.log(`  add_text: HTTP ${add.status} ${add.ok ? "✓" : add.text.slice(0, 120)}`);

let cognified = false;
for (let attempt = 1; attempt <= 3 && !cognified; attempt++) {
  const cog = await post("/api/v1/cognify", { datasets: [DATASET], runInBackground: false });
  cognified = cog.text.includes("PipelineRunCompleted");
  console.log(`  cognify ${attempt}: HTTP ${cog.status} ${cognified ? "✓" : cog.text.slice(0, 120)}`);
  if (!cognified) await new Promise((r) => setTimeout(r, 6000));
}

console.log(cognified ? "Done. Open the Briefing — Trace should surface 4 findings." : "Cognify failed after retries — try a fresh COGNEE_DATASET name.");
