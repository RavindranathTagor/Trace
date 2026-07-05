// Generate agent rules files from the Trace company brain.
// The app must be running (npm run dev). Usage: npm run brain:rules
//
// Writes each coding tool's rules file so agents that read a rules file (Copilot,
// Aider, Cursor, Claude Code) share the org's live memory. Re-run to refresh, or
// wire into CI. Generated files are gitignored by default.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BASE = process.env.TRACE_BASE_URL ?? "http://localhost:3001";
const TOPIC = process.env.BRAIN_TOPIC ?? ""; // optional: scope the rules to a topic

const TARGETS = [
  { target: "cursor", file: ".cursorrules" },
  { target: "copilot", file: ".github/copilot-instructions.md" },
  { target: "claude", file: "CLAUDE.md" },
  { target: "agents", file: "AGENTS.md" },
  { target: "aider", file: "CONVENTIONS.md" },
];

let ok = 0;
for (const { target, file } of TARGETS) {
  try {
    const url = `${BASE}/api/brain/context?format=rules&target=${target}${TOPIC ? `&topic=${encodeURIComponent(TOPIC)}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`✗ ${file}: HTTP ${res.status}`);
      continue;
    }
    const body = await res.text();
    mkdirSync(dirname(file) === "." ? "." : dirname(file), { recursive: true });
    writeFileSync(file, body + "\n", "utf-8");
    console.log(`✓ wrote ${file} (${body.length}B)`);
    ok++;
  } catch (err) {
    console.error(`✗ ${file}: ${err?.message || err}`);
  }
}
console.log(`\n${ok}/${TARGETS.length} rules files written from ${BASE}/api/brain/context`);
if (!ok) {
  console.error("Is the app running?  npm run dev  (then re-run this).");
  process.exit(1);
}
