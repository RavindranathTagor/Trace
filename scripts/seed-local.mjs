// Seed the SELF-HOSTED Cognee (localhost:8000) with the team's ESTABLISHED decisions
// (the drift/duplicate messages are typed live during the demo, so they're NOT seeded).
// Uses async cognify + status polling so a slow local LLM (Ollama) can't time out the client.
//   node scripts/seed-local.mjs
const BASE = process.env.LOCAL_COGNEE || "http://localhost:8000";
const DATASET = "trace-demo-v2";
const h = { "Content-Type": "application/json" };

const CORPUS = [
  "Ravindra (Q1, #eng): Decision — we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services.",
  "Ravindra (Q1, #eng): Decision — we will NOT support on-prem deployments this year. Cloud-only, to keep the team small.",
  "Ravindra (Q1, #eng): I own authentication end to end. All auth changes go through me.",
  "Ashwini (Q1, roadmap): Q1 focus is reliability and the analytics dashboard. On-prem is explicitly out of scope.",
  "Ravindra (Q1, PR #412 platform-core): Added a generic retry queue in platform-core for ALL services to use.",
  "Pushpa (Q1, #payments): Kicked off the payments service. Ravindra owns auth, I own payments.",
  "Ravindra (Q2, #eng): Heads up, I'm on leave all of next month.",
];

const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: h, body: JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
};
const get = async (path) => {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, text: await r.text() };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Seeding ${CORPUS.length} established decisions into "${DATASET}" on LOCAL ${BASE}…`);
const add = await post("/api/v1/add_text", { textData: CORPUS, datasetName: DATASET });
console.log(`  add_text: HTTP ${add.status} ${add.status < 300 ? "✓" : add.text.slice(0, 160)}`);

// Kick cognify in the background, then poll dataset status until it completes.
const cog = await post("/api/v1/cognify", { datasets: [DATASET], runInBackground: true });
console.log(`  cognify kicked: HTTP ${cog.status}`);

// Resolve the dataset id for status polling.
const ds = await get("/api/v1/datasets");
let id = "";
try {
  const arr = JSON.parse(ds.text);
  id = (arr.find?.((d) => d.name === DATASET) || {}).id || "";
} catch {}
console.log(`  dataset id: ${id || "(unknown — will poll graph instead)"}`);

let done = false;
for (let i = 1; i <= 60 && !done; i++) {
  await sleep(6000);
  if (id) {
    const st = await get(`/api/v1/datasets/status?dataset=${id}`);
    const done1 = st.text.includes("DATASET_PROCESSING_COMPLETED") || st.text.includes("PipelineRunCompleted");
    const errored = st.text.includes("DATASET_PROCESSING_ERRORED") || st.text.includes("ERRORED");
    process.stdout.write(`  [${i}] status: ${st.text.replace(/\s+/g, " ").slice(0, 120)}\n`);
    if (errored) { console.log("  ✗ cognify ERRORED — check container logs (docker logs cognee)."); break; }
    if (done1) done = true;
  }
  if (!done && id) {
    const g = await get(`/api/v1/datasets/${id}/graph`);
    try {
      const gj = JSON.parse(g.text);
      const n = (gj.nodes || (gj.data && gj.data.nodes) || []).length;
      if (n > 5) { console.log(`  graph now has ${n} nodes ✓`); done = true; }
    } catch {}
  }
}
console.log(done ? "Local seeded ✓ — the app will show live memory from local Cognee." : "Did not confirm completion — check docker logs cognee.");
