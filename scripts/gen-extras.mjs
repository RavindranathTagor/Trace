// Generate the multi-voice team dialogue + Trace voice + SFX + a music bed for the
// Trace demo video, via the ElevenLabs API.
//   ELEVENLABS_API_KEY=sk_... node scripts/gen-extras.mjs
// Output: demo/video/public/audio/{dialogue,sfx,music}/*.mp3

import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "demo", "video", "public", "audio");
for (const d of ["dialogue", "sfx", "music"]) mkdirSync(join(ROOT, d), { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY;
if (!KEY) throw new Error("Set ELEVENLABS_API_KEY");
const MODEL = "eleven_multilingual_v2";

// ── cast (real ElevenLabs voice ids in this account) ──────────────────────────
const V = {
  Karthik: "TX3LPaxmHKxFdv7VOQHJ", // Liam — energetic
  Raj: "CwhRBWXzGAHq8TQ4Fs17", // Roger — laid-back
  Maya: "hpp4J3VqNfWAUOO0d1Us", // Bella — professional warm
  Sam: "SAz9YHcvj6GT2YYXdXww", // River — relaxed neutral
  Trace: "onwK4e9ZLuTAKqWW03F9", // Daniel — steady broadcaster (cool)
  Priya: "EXAVITQu4vr4xnSDxMaL", // Sarah — mature, confident
};
const SET = {
  human: { stability: 0.4, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true },
  eager: { stability: 0.3, similarity_boost: 0.78, style: 0.65, use_speaker_boost: true },
  trace: { stability: 0.72, similarity_boost: 0.85, style: 0.1, use_speaker_boost: true },
};

const DIALOGUE = [
  { id: "k0", who: "Karthik", set: "eager", text: "kicking off the new billing service this sprint — going MongoDB, schema's still moving fast." },
  { id: "priya_q1", who: "Priya", set: "human", text: "we're standardizing all new services on PostgreSQL. No more Mongo for new services." },
  { id: "k1", who: "Karthik", set: "eager", text: "morning everyone. kicking off billing — going MongoDB, the schema's still moving." },
  { id: "r1", who: "Raj", set: "human", text: "nice, I'll wire up payments. starting a retry queue for failed webhooks today." },
  { id: "k2", who: "Karthik", set: "eager", text: "oh, and Acme just signed. they need on-prem — I think we build an on-prem deploy this quarter." },
  { id: "kask", who: "Karthik", set: "eager", text: "wait — I had no idea we ruled out Mongo. Trace, what did we actually decide about our database, and why?" },
  { id: "trace1", who: "Trace", set: "trace", text: "In Q1, Priya standardized all new services on PostgreSQL, to cut operational surface while the team stays small. MongoDB was never approved for new services." },
  { id: "m1", who: "Maya", set: "human", text: "good catch. on-prem stays out of scope. Let's discuss Acme as its own thread, not a silent reversal of the roadmap." },
  { id: "s1", who: "Sam", set: "human", text: "ship it. also, grabbing coffee." },
];

const SFX = [
  { id: "chime", dur: 1.2, text: "a short clean two-note digital UI notification chime, bright and positive" },
  { id: "whoosh", dur: 0.9, text: "a quick sharp digital whoosh swipe transition sound" },
  { id: "bass", dur: 1.6, text: "a deep cinematic sub-bass drop impact hit, powerful, trailer" },
  { id: "heartbeat", dur: 2.2, text: "a slow low tense heartbeat pulse, deep, suspenseful" },
  { id: "thunk", dur: 0.8, text: "a solid mechanical lock clunk, heavy, satisfying" },
  { id: "stamp", dur: 0.7, text: "a crisp paper receipt stamp thud with a soft whoosh" },
];

async function tts(voiceId, text, settings) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: settings }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 140)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function sfx(text, duration) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, duration_seconds: duration, prompt_influence: 0.6 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 140)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function music(prompt, ms) {
  // Best-effort: ElevenLabs Music (newer). Falls back to a long sound-generation loop.
  for (const url of ["https://api.elevenlabs.io/v1/music", "https://api.elevenlabs.io/v1/music/compose"]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ prompt, music_length_ms: ms }),
      });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      console.log(`  music via ${url}: HTTP ${res.status} ${(await res.text()).slice(0, 100)}`);
    } catch (e) { console.log(`  music via ${url} err: ${e.message}`); }
  }
  return null;
}

const save = (dir, id, buf) => writeFileSync(join(ROOT, dir, `${id}.mp3`), buf);
const skip = (dir, id) => existsSync(join(ROOT, dir, `${id}.mp3`)) && statSync(join(ROOT, dir, `${id}.mp3`)).size > 1500 && !process.env.FORCE;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("── dialogue ──");
for (const d of DIALOGUE) {
  if (skip("dialogue", d.id)) { console.log(`  ${d.id} cached`); continue; }
  try { save("dialogue", d.id, await tts(V[d.who], d.text, SET[d.set])); console.log(`  ${d.id} (${d.who}) ok`); }
  catch (e) { console.error(`  ${d.id} FAIL: ${e.message}`); }
  await wait(350);
}

console.log("── sfx ──");
for (const s of SFX) {
  if (skip("sfx", s.id)) { console.log(`  ${s.id} cached`); continue; }
  try { save("sfx", s.id, await sfx(s.text, s.dur)); console.log(`  ${s.id} ok`); }
  catch (e) { console.error(`  ${s.id} FAIL: ${e.message}`); }
  await wait(350);
}

console.log("── music ──");
if (skip("music", "bed")) { console.log("  bed cached"); }
else {
  const buf = await music("124 BPM dark synthwave tech-house instrumental, driving arpeggiated bass, cinematic, confident, for a startup product launch demo", 128000);
  if (buf) { save("music", "bed", buf); console.log("  bed ok"); }
  else console.log("  music endpoint unavailable — skipping (video works without it; add a bed in ElevenLabs Studio)");
}
console.log("Done.");
