// Generate the Trace demo voiceover with the ElevenLabs API.
// Narrator = one expressive voice; lines are placed per beat in the Remotion timeline.
// Usage:  ELEVENLABS_API_KEY=sk_... node scripts/gen-voiceover.mjs
// Output: demo/video/public/audio/vo/n01.mp3 ...  + a manifest.json with durations.
//
// v3 audio tags ([excited] etc.) are kept in the script for reference but STRIPPED
// before the API call and expressed via per-line voice_settings, so this works on any
// key/model. Set MODEL=eleven_v3 if your key has v3 access to keep the tags instead.

import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "demo", "video", "public", "audio", "vo");
mkdirSync(OUT, { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY;
if (!KEY) throw new Error("Set ELEVENLABS_API_KEY");
const MODEL = process.env.MODEL || "eleven_multilingual_v2"; // set eleven_v3 if you have access
const NARRATOR = process.env.NARRATOR_VOICE || "IKne3meq"; // Charlie — Deep, Confident, Energetic

// mood → voice_settings (expressiveness without v3 tags)
const MOOD = {
  whisper: { stability: 0.6, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true },
  excited: { stability: 0.32, similarity_boost: 0.8, style: 0.7, use_speaker_boost: true },
  curious: { stability: 0.45, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true },
  serious: { stability: 0.5, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
  confident: { stability: 0.4, similarity_boost: 0.82, style: 0.55, use_speaker_boost: true },
  warm: { stability: 0.5, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true },
};

// The narrator VO — ONE clear line per moment. Cast: Sandesh, Ravindra, Pushpa, Ashwini.
const LINES = [
  { id: "n01", beat: 1, mood: "excited", text: "That's Trace — and it is not a chatbot you query." },
  { id: "n02", beat: 1, mood: "excited", text: "It's an agent that watches your team, and speaks up the second you contradict yourselves." },
  { id: "n03", beat: 1, mood: "confident", text: "Observe. Remember. Reason. Detect. Guard. Learn." },
  { id: "n04", beat: 2, mood: "warm", text: "Here's a real engineering team — Sandesh, Ravindra, Pushpa and Ashwini — shipping fast across Slack and Discord." },
  { id: "n05", beat: 2, mood: "curious", text: "Nobody is querying anything. Trace is simply watching." },
  { id: "n06", beat: 3, mood: "excited", text: "Sandesh reaches for MongoDB on the new billing service. But months ago, Ravindra standardized every new service on PostgreSQL. Trace catches it instantly — cited, dated, and owned." },
  { id: "n07", beat: 4, mood: "excited", text: "Then Sandesh pushes on-prem for a big customer. But the roadmap said cloud-only. Trace flags the reversal, and loops in Ashwini." },
  { id: "n08", beat: 5, mood: "excited", text: "Pushpa starts a retry queue — one that Ravindra already shipped in platform-core. Duplicate work, caught before a day is wasted." },
  { id: "n09", beat: 6, mood: "curious", text: "And when you do want to ask, it answers — with citations." },
  { id: "n10", beat: 6, mood: "confident", text: "What did we decide about our database? It traces straight back to Ravindra's Q1 call." },
  { id: "n11", beat: 7, mood: "serious", text: "And when there is nothing to say, it says nothing." },
  { id: "n12", beat: 8, mood: "confident", text: "Underneath is one Cognee temporal knowledge graph." },
  { id: "n13", beat: 8, mood: "excited", text: "When you drift, it walks the graph back to the exact decision, and pulls it into the light." },
  { id: "n14", beat: 8, mood: "serious", text: "One graph-completion call retrieves the prior decision and judges the contradiction, in a single hop." },
  { id: "n15", beat: 9, mood: "serious", text: "The money shot. A pull request migrates billing to MongoDB. Trace comments on the pull request itself, citing Ravindra's call. Decided in Slack — enforced on GitHub." },
  { id: "n16", beat: 10, mood: "excited", text: "Here's the twist. In 2026, your code is written by a whole fleet of A-I agents that forget." },
  { id: "n17", beat: 10, mood: "curious", text: "So before Cursor writes a line, it asks Trace: has the team already decided this? Postgres. Decided by Ravindra. Mongo, rejected. It corrects itself." },
  { id: "n18", beat: 10, mood: "confident", text: "One endpoint. Every agent. The same company brain." },
  { id: "n19", beat: 11, mood: "serious", text: "And it watches the people, not just the code. Authentication is owned by Ravindra alone — and he is on leave next month." },
  { id: "n20", beat: 11, mood: "serious", text: "Ask what breaks if he is out, and every consequence is cited to a real message." },
  { id: "n21", beat: 12, mood: "confident", text: "Trace. It observes, remembers, reasons — and it acts. Nobody has to ask." },
  { id: "n22", beat: 12, mood: "warm", text: "Your team's memory — with a pulse." },
];

const clean = (t) => t.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();

async function tts(line) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${NARRATOR}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: clean(line.text), model_id: MODEL, voice_settings: MOOD[line.mood] || MOOD.confident }),
  });
  if (!res.ok) throw new Error(`${line.id}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(OUT, `${line.id}.mp3`), buf);
  return buf.length;
}

console.log(`Generating ${LINES.length} narrator lines → ${OUT} (model=${MODEL}, voice=${NARRATOR})`);
const manifest = [];
for (const line of LINES) {
  const p = join(OUT, `${line.id}.mp3`);
  if (existsSync(p) && statSync(p).size > 2000 && !process.env.FORCE) {
    console.log(`  ${line.id} · cached`);
    manifest.push({ id: line.id, beat: line.beat, mood: line.mood, text: clean(line.text) });
    continue;
  }
  try {
    const bytes = await tts(line);
    console.log(`  ${line.id} · ${(bytes / 1024).toFixed(0)}KB · "${clean(line.text).slice(0, 48)}…"`);
    manifest.push({ id: line.id, beat: line.beat, mood: line.mood, text: clean(line.text) });
  } catch (e) {
    console.error(`  ${line.id} · FAILED: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400)); // gentle on rate limits
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Done. ${manifest.length}/${LINES.length} lines. Manifest written.`);
