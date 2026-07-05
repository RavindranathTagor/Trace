# TRACE — "Nobody Asked It To." (Final Production Script v1.0)

> An engineering team quietly reverses its own past decision — and before a single human notices, an autonomous agent slams a cited receipt into the chat thread, comments on the pull request, and rewrites what the team's AI coding agents are about to build. This is Trace: your org's memory, with a pulse.

**Positioning.** Trace is not a memory tool you query — it is an autonomous agent that runs one continuous loop over your team's real work: Observe → Remember → Reason → Detect → GUARD → Learn. It perceives Slack, Discord and GitHub through thin adapters; it remembers every decision in a Cognee temporal knowledge graph (add + cognify); it reasons and judges contradiction in a single Cognee GRAPH_COMPLETION call that retrieves the prior decision AND rules on the conflict at once; and then it ACTS on the world — posting a cited, dated, owned interrupt in the thread and commenting on the pull request before merge — all without anyone querying it. The same one Cognee dataset also serves as the company brain every AI coding agent (Cursor, Claude Code, Copilot) consults BEFORE it writes a line, so the whole fleet stops reintroducing what the team already ruled out. Uniquely, Trace closes the loop from conversation to code: a decision made in chat is enforced on the pull request. Nobody asked it to. That is the entire point.

**Target feel.** Driving, cinematic, edge-of-2am-terminal energy — synthwave/tech-house at 124 BPM with beat-synced cuts, a record-scratch cold-open jolt, a full cut-to-silence for the GitHub moneyshot, and a warm resolve on the close. Technically credible and confident, never salesy. The opposite of the old flat, monotone demo: modulated multi-voice VO, real latency turned into suspense, and momentum that compounds catch by catch.

**Length.** ~2:30 (target 2:25–2:35). Eight beats. Hard rule: no shot longer than 3.5s except the two deliberate held beats — the ~2s GRAPH_COMPLETION latency pause and the PR cut-to-silence.

---

## Voice direction

- **Narrator voice:** ElevenLabs v3 — a cloned, human host voice in a warm-but-wired baritone/alto (think a confident senior engineer narrating a launch, not a movie-trailer guy). Recommended base: a cloned voice of the presenter for authenticity, or ElevenLabs 'Adam'/'Antoni'-class expressive preset if no clone. Why: the whole thesis is 'an agent that speaks up' — a human, credible, slightly conspiratorial narrator who is clearly excited by what the agent just did lands the autonomy framing far better than a polished announcer. Keep it human so the machine feels like the star.
- **Modulation:** Ride a deliberate emotional arc instead of one flat read: [whispers] on the cold-open loss line, [excited] and fast on the thesis and the rising catches, [curious] on the @ask, [serious] and punchy on the PR moneyshot, [confident] and warm on the close. Use hard [pause] beats BEFORE payoff words ('...FLEET', '...it corrects ITSELF', '...enforced on code'). Let the VO react to the product on screen ('watch —', 'nobody typed that') so narration feels live, not scripted-over. The music sidechains under VO; VO drops out entirely for the 2s latency beat and the PR silence so the product does the talking.
- **ElevenLabs v3 settings:** v3 expressive TTS. Global: Stability ~35–45 (loose enough for real modulation, tight enough to stay on-character), Similarity 75–85, Style/Exaggeration moderate-high on VO for energy, LOWER on Trace's own voice for a cool synthetic calm. Use inline audio tags per line: [whispers],[excited],[curious],[serious],[confident],[emphatic] plus [pause]/'—' for timing. Render VO in short per-line segments (one clip per beat) so Flows can re-align to beat markers if a line changes. Generate 3 takes per key line (cold-open whisper, PR moneyshot, close) and pick the best. Normalize to -16 LUFS, de-ess, light bus compression.
- **Team voices:** Cast as a five-voice radio drama, each a DISTINCT ElevenLabs v3 voice so the thread reads as real people: PRIYA (Staff Eng) — calm, authoritative, measured alto. MAYA (CEO) — warm, decisive, unhurried. RAJ — casual, friendly, quick, laughs easily. KARTHIK (joined Q2, sales-driven) — fast, eager, upbeat, a little overconfident. SAM — dry, understated, deadpan. TRACE speaks in its OWN separate register: cool, precise, faintly synthetic, low style/exaggeration, a two-note chime before it speaks — clearly not one of the humans. Give each a slightly different pace and stability setting so overlapping chat lines never blur together.

---

> **PRODUCTION BIBLE — read first.**
> **Canonical agent loop (never deviate, exactly six verbs):** `OBSERVE → REMEMBER → REASON → DETECT → GUARD → LEARN`.
> **Persistent HUD:** a thin bottom-edge loop-rail with those six stations lives on screen the ENTIRE film; the currently-active station glows + a soft mechanical "clunk" marks each transition. This hard-codes the agentic framing into every frame.
> **Golden rule:** NEVER show a query box being used before a catch. Every catch is the agent surfacing what nobody asked. If a query box appears before a catch, the whole "nobody asked it to" thesis cracks.
> **No faked UI.** All product footage = the real Next.js Trace app + real Slack/Discord/GitHub + a real Cursor/MCP capture. Sora/Veo B-roll is for abstract interstitials ONLY (particle graphs, neural pulse), never fake screens.
> **Keep the real latency.** The ~2s Cognee `GRAPH_COMPLETION` round-trip stays on camera as scored suspense (heartbeat + telemetry), never faked, never cut.
> **Signature SFX:** a two-note **Trace chime** every time the agent acts (by catch #4 the audience anticipates it); a **"receipt stamp" whoosh** every time a citation lands (cited · dated · owned).
> **Cast:** Priya (Staff Eng), Maya (CEO), Raj (payments), Karthik (Q2, sales-driven), Sam (platform). Trace = its own cool synthetic voice.

---

## BEAT 0 — COLD OPEN / THE DROP (0:00 – 0:11)
**Nobody asked it to.**

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 0.1 | 0:00–0:02 | Cold black. Then a real **Slack #nimbus-eng** composer, cursor blinking. A message types itself LIVE. | One lonely synth stab. Keystroke SFX. No VO. | Typewriter-in on the real capture. Bottom loop-rail fades up dim, **OBSERVE** faintly lit. | OBSERVE — the adapter is already ingesting the thread. |
| 0.2 | 0:02–0:04 | Karthik's line lands: **"kicking off the new billing service — going MongoDB, schema's still moving."** Casual. Real. | Music holds low. A single low **heartbeat** starts. | Message pops with spring physics. | Perceive: adapter → `checkMessage()`. |
| 0.3 | 0:04–0:06 | **THE KEPT LATENCY.** ~2s of near-dead air. A tiny mono **telemetry HUD** appears top-right: `guard · GRAPH_COMPLETION … nodes traversed: 41 · conf: —`. | Heartbeat only. Music filters down to almost nothing. VO silent. | REASON station on the rail pulses; a faint subgraph flickers. Hold the dread. | **REASON** — one real Cognee `GRAPH_COMPLETION` call retrieving prior decisions AND judging the conflict. This dead air is REAL, not faked. |
| 0.4 | 0:06–0:08 | **RECORD-SCRATCH + BASS DROP.** A red-bordered card SLAMS up from the composer, unprompted: **"⚠️ This may reverse a standing decision — 'standardize ALL new services on PostgreSQL, no more Mongo.' — Priya (Staff Eng), Q1."** Telemetry snaps to `conf: 0.91`. | Record-scratch SFX → hard **bass drop**. **Two-note Trace chime.** Receipt-stamp whoosh. | Card slams with a stamp wipe; screen shake on the drop; **GUARD** station flares. | **DETECT + GUARD** — high-confidence, citable conflict → the agent ACTS in-thread. Nobody queried it. |
| 0.5 | 0:08–0:11 | **HARD FREEZE-FRAME** on the citation. Kinetic type stamps across frame: **"NOBODY ASKED IT TO."** No logo. No VO yet. | One held sub-bass note. Silence tail. | Freeze + chromatic-aberration snap; type slams letter-by-letter on the beat. | The product did the talking for 11 seconds. THIS is the hook. |

---

## BEAT 1 — TITLE + THESIS (0:11 – 0:24)

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 1.1 | 0:11–0:15 | The red drift card's **shield glyph** morphs and resolves into the **TRACE** logo lockup. | **VO [excited, fast]:** "That's Trace — [pause] and it is NOT a chatbot you query." | Logo resolves from the glyph; beat-synced whoosh. | Verb-first, agentic from word one. |
| 1.2 | 0:15–0:20 | The real app's **AgenticFlow** pipeline snaps in and locks its six nodes to the beat. | **VO [excited]:** "It's an agent that watches your team — and speaks up the SECOND you contradict yourselves." | `components/AgenticFlow.tsx` motion, sped to tempo; packets of light travel the pipe on the bass hits. | The six-verb loop, on screen as the app's REAL animation. |
| 1.3 | 0:20–0:24 | The loop locks: **OBSERVE → REMEMBER → REASON → DETECT → GUARD → LEARN**, each verb stamping. | **VO [confident]:** "Observe. Remember. Reason. Detect. Guard. Learn." Music pumps. | Each verb ignites its rail station in sequence; persistent HUD is now "armed." | The visual spine. It recurs 3× and every catch physically travels it. |

---

## BEAT 2 — THE TEAM CHAT, LIVE (0:24 – 1:04)
**One continuous screen take. Rewind two seconds, let the real conversation breathe, then fire all four catches in a rising run. Five distinct voices. This is the spine.**

> **Director's note:** This entire beat is ONE unbroken screen recording of the real Slack thread (switch to the **Discord** surface mid-run for ~3s to prove "same bot, same memory, different adapter"). Speed-ramp: fast IN on each human line, slow-mo HOLD on each catch. Every Trace catch = two-note chime + receipt-stamp whoosh + the rail lighting REASON→DETECT→GUARD.

**— Q1 context flickers (0:24–0:27, 3s):** a "scroll into the dark" micro-beat — Priya's Jan line **"standardize ALL new services on PostgreSQL — no more Mongo 🐘"** with two green ✅, then the thread dims and scrolls UP, timestamps blurring *Jan… Feb… Mar…* (simple dim/scroll on the real capture — NOT bespoke animation). VO **[whispers]:** "This is the thread that settled it. Nobody scrolls back this far."

**— Q2, the live run (0:27 onward):**

```
KARTHIK:  morning all 👋 kicking off the new billing service this sprint.
          going MongoDB — schema's still moving fast, don't want migrations slowing us down.
RAJ:      nice, I'll wire payments in. starting a retry queue for failed payment webhooks today too.
KARTHIK:  oh and Acme signed 🎉 they need on-prem. I think we build an on-prem deploy this
          quarter — it's a huge deal.
```
*(latency beat — heartbeat SFX, telemetry ticks — kept on camera)*
```
⚠️ TRACE → @Karthik   MongoDB for a new service may reverse a standing decision.
                      > "standardizing ALL new services on PostgreSQL — no more Mongo."
                      — Priya (Staff Eng), Q1 · #architecture.
                      Reconcile with Priya, or document why billing is the exception.

⚠️ TRACE → @Karthik   On-prem this quarter reverses a roadmap call.
                      > "Cloud-only this year, on-prem explicitly out of scope —
                        it keeps the team small." — Priya + Maya, Q1 roadmap.
                      Loop in Maya before committing Acme.

⧉ TRACE → @Raj        A payments retry queue may duplicate shipped work.
                      > "Added a GENERIC retry queue in platform-core for all services."
                      — Sam, PR #412. Reuse platform-core instead of a second queue.
```
- **VO rides the run [excited, accelerating]:** "Nobody typed a query. Karthik reaches for Mongo — [chime] cited. Pushes on-prem — [chime] cited, and dated, and OWNED. Raj starts a queue Sam already shipped — [chime] duplicate, caught." (VO tags each catch to the chime.)
- **Motion:** each catch card slides up with a stamp; on each, the rail runs REASON→DETECT→GUARD in a half-second sweep; visible timestamps (Q1 vs Q2) make "cited · dated · owned" tangible.

**— THE LIVE @ASK (a human addresses Trace and gets a cited answer, streaming):**
```
KARTHIK:  wait what — I had no idea we ruled out Mongo.
          @Trace what did we actually decide about our database, and why?
```
- **On-screen contrast card (from Glass Box graft):** **"recall() answers what you ask · the guard surfaced what nobody asked."**
- **VO [curious]:** "And when you DO want to ask — [pause] it answers. Cited."
```
💬 TRACE (streams word-by-word, UI-tick per token):
   In Q1, Priya standardized all new services on PostgreSQL to cut operational surface
   while the team stays small. MongoDB was never approved for new services.
   Sources: Priya, #architecture (Q1).
   Related: the team later moved self-managed Postgres → Neon (managed) after two
   failover outages — Teddy, #eng (Q2).
```
- **Motion:** answer streams token-by-token with soft UI ticks; graph node-ids faintly light in the corner to prove it's real recall, not a guess.
- **Callout:** `recall()` = Cognee `search()` (GRAPH_COMPLETION + vector) with citations. The "Related: Neon migration" line is REAL seeded memory (`data/decisions.ts`) — proves temporal depth, not a canned answer.

**— TEAM REACTS (proves the catch changed behavior):**
```
MAYA (CEO):  good catch. on-prem stays out of scope — let's discuss Acme as its own
             thread, not silently reverse the roadmap.
RAJ:         and I'll just use platform-core's queue 🙌 saved myself a day.
KARTHIK:     okay Postgres it is. adding a note on why billing's tricky.
```
- **On camera:** cursor clicks **✓ real** on the drift card. **VO [confident]:** "A human grades the catch — and it re-cognifies into memory. The agent gets sharper for THIS team."
- **Callout:** LEARN — graded catch re-`add()`s into the dataset; precision compounds (`lib/pulseFeedback.ts`). The rail's **LEARN** station pulses.

**— SILENCE-IS-CORRECT micro-beat (0:59–1:04, DO NOT CUT for runtime):**
```
SAM:  ship it. also grabbing coffee ☕
```
- Trace does NOT flag it. A tiny ghost-grey telemetry line reads `guard · no citable conflict · silent`.
- **VO [serious, low]:** "And when there's nothing to say — [pause] it says nothing." 
- **Callout:** This is what separates a precision agent with judgment from a noisy bot. No other concept has this beat. The guard only fires on high-confidence, citable conflict; silence is the default.

---

## BEAT 3 — UNDER THE HOOD (1:04 – 1:20)
**15s micro-explainer. Make Cognee retrieval visible and emotional.**

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 3.1 | 1:04–1:09 | Whip-pan to the app's live **DecisionGraph**. The exact cited nodes light: **Priya → decides → "Postgres standard" → supersedes → "Mongo (billing)"**. | **VO [confident]:** "Underneath is one Cognee temporal knowledge graph." | `components/DecisionGraph.tsx`; nodes pulse on the bass hits. | REMEMBER: `remember()` = Cognee `add` + `cognify` → temporal graph. |
| 3.2 | 1:09–1:14 | **The signature retrieval visual (Scrolled-Into-the-Dark graft):** a glowing citation thread physically REDRAWS from Karthik's new message back DOWN into the dark and RE-IGNITES Priya's original Q1 line. | **VO [excited]:** "When you drift, it doesn't search a database — it walks the graph back to the exact decision, and pulls it into the light." | Animated light-thread redraw; the old dimmed line flares back to full brightness. | This is retrieval made VISIBLE — the graph edge `supersedes` traversed live. |
| 3.3 | 1:14–1:20 | Split micro-inset: the REASON station opens to a **strict-JSON verdict typing char-by-char** — `{ "type":"drift", "confidence":0.91, "cites":["priya-q1-postgres"] }`. | **VO [serious]:** "One GRAPH_COMPLETION call retrieves the prior decision AND judges the contradiction — in a single hop." | Mono JSON typewriter; telemetry HUD shows `latency 2.1s · nodes 8 · conf 0.91`. | REASON+DETECT: `lib/guard.ts → checkMessage → completeWithCognee`. Retrieve + reason + decide in ONE call. |

---

## BEAT 4 — THE MONEYSHOT: GITHUB PR ENFORCEMENT (1:20 – 1:42)
**Emotional peak. Cut the music to a single held note. Silence is the loudest moment.**

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 4.1 | 1:20–1:24 | 3s "scroll into the dark" interstitial re-flickers: the Q1 Postgres decision, dimming — the loss we're about to reverse. Then a real **GitHub PR page**: **"Migrate billing service to MongoDB."** Karthik, human, overrode the agent and hand-wrote it. | Music thins to a **single held note.** SFX: a page-load tick. | Slow push-in on the PR title. | Bridge logic: a human can OVERRIDE an agent — so Trace guards the CODE itself. |
| 4.2 | 1:24–1:34 | **Refresh.** ~5s beat. Then a **Trace bot comment LANDS on the PR**, citing Priya's Q1 Postgres call + who made it + date, ending "Confirm with Priya before merge." | **FULL CUT TO SILENCE.** Then a single mechanical **"lock" thunk** as the comment lands. **Two-note Trace chime.** | Comment slides in; a bright receipt-stamp on the citation; everything else dims. | GUARD on code: `app/api/github/webhook` runs the PR text through the SAME memory → cited comment BEFORE merge. |
| 4.3 | 1:34–1:42 | Kinetic type stamps over the frozen PR (stolen from Company-Brain concept): **"DECIDED IN SLACK. ENFORCED ON GITHUB."** | **VO [serious, punchy]:** "A decision made in chat — [pause] enforced on code. No other memory tool closes that loop." | Type slams on the beat; music resumes with a hard downbeat as we cut out. | THE thesis of the whole product. |

---

## BEAT 5 — COMPANY BRAIN (1:42 – 2:08)
**The reframe. The same memory that scolded a human now steers the AIs. Lead with the fleet stakes, then the live self-correction hero shot.**

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 5.1 | 1:42–1:47 | Kinetic card (Company-Brain graft): **"IT'S 2026. YOU DON'T HAVE ONE ENGINEER WHO FORGETS — YOU HAVE A WHOLE FLEET."** Then a triptych of IDE cursors (Cursor / Claude Code / Copilot) blinking. Slam type: **THREE AGENTS · ZERO MEMORY.** | **VO [excited]:** "Here's the twist. In 2026 your code isn't written by one engineer who forgets — [pause] it's written by a whole FLEET of them." | Downbeat hit on "FLEET"; triptych snaps to a dark grid. | Sets the inevitability of a shared company brain. |
| 5.2 | 1:47–1:58 | **THE HERO SHOT — real Cursor + MCP capture.** Cursor is mid-typing a **`mongoose`** schema for billing. A tool-call chip fires: **`trace-company-brain · check_before_coding(...)`**. A red **⚠️ CONFLICT** banner + context pack streams back: *Architecture constraint: "Standardize ALL new services on PostgreSQL — Priya, Q1" · Rejected design (struck through): "MongoDB for schema flexibility."* The agent REVERSES itself in its own words and an animated **diff-wipe swaps `mongoose` → Postgres/Prisma.** | **VO [curious → impressed]:** "Watch — before it writes one line, the agent asks Trace: has the team already decided this? [pause] Postgres. Decided by Priya. Mongo, rejected. So it corrects... [pause] ITSELF." | Tool-call chip animates; CONFLICT banner pulses; diff-wipe swaps the schema live; whoosh on the wipe. | COMPANY BRAIN, made literal: `GET /api/brain/context` via the `trace-company-brain` MCP server. Returns architecture constraints, conventions, past mistakes, rejected designs, known bugs, owners — the 6 real return types from `app/api/brain/context/route.ts`. |
| 5.3 | 1:58–2:03 | Terminal runs **`npm run brain:rules`**; five real filenames stamp in on the beat: **`.cursorrules` · `CLAUDE.md` · `.github/copilot-instructions.md` · `AGENTS.md` · `CONVENTIONS.md`**. A hub-and-spoke draws ONE Cognee dataset feeding all five. | **VO [energetic]:** "One endpoint. Every agent. Same brain — so the whole fleet stops re-making the same rejected calls." | Filenames stamp; hub-and-spoke lines draw outward from a single breathing brain node. | One brain, whole fleet. Adapters (Slack/Discord/GitHub/agents) captioned as thin I/O over ONE dataset. |
| 5.4 | 2:03–2:08 | Live **`curl`**: `GET /api/brain/context?topic=billing&format=rules&target=cursor` renders a REAL `.cursorrules` file on screen. | **VO [confident]:** "Cited. Live. Checkable." | Mono JSON → rules render; receipt-stamp on the header line. | `format=rules&target=cursor` is a real code path. Highest-credibility receipt. |

---

## BEAT 6 — BUS-FACTOR / WHAT-IF (2:08 – 2:22)
**The quieter, human-stakes USP. Zero invented numbers.**

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 6.1 | 2:08–2:13 | A yellow **proactive** Morning-Briefing nudge — no query — **"🔑 Auth is solely owned by Priya, and she's on leave next month. Bus-factor: HIGH."** Priya's avatar fades to grey. | **VO [whispers]:** "And it watches the people, not just the code." | Yellow card slides in; avatar desaturates (leitmotif). | DETECT on ownership risk: Priya "owns auth end-to-end" (`data/decisions.ts`) + on leave = bus-factor. |
| 6.2 | 2:13–2:22 | Cut to the **What-if** view (`components/WhatIf.tsx`). Type **"Priya."** The projection resolves — every consequence cited to a REAL message. | **VO [serious]:** "Ask what happens if she's out — and every consequence is cited to a real message. No invented numbers." | Consequence cards cascade, each with a source-quote receipt-stamp. | `lib/whatif.ts → runDepartureImpact` — consequences GROUNDED in quotes only; never fabricated stats. |

---

## BEAT 7 — CLOSE (2:22 – 2:32)

| # | Time | ON-SCREEN | Audio / Dialogue | Motion & FX | Callout |
|---|------|-----------|------------------|-------------|---------|
| 7.1 | 2:22–2:27 | The six-verb loop-rail breathes once more, full glowing revolution. The four catches (drift · drift · duplicate · ownership) stack as glowing receipts. | **VO [confident, warm]:** "Trace. It observes, remembers, reasons — [pause] and it acts. Nobody has to ask." | Rail completes one revolution on the bass; receipts stack with stamp SFX. | The loop closes visually — Observe→…→Learn, back to Observe. |
| 7.2 | 2:27–2:32 | Endcard: **"TRACE — your team's memory, with a pulse."** Sub: **"Runs on Cognee Cloud · 100% self-hostable."** | **VO [warm]:** "Your team's memory — with a pulse." Music resolves; hard cut to silence on the logo. | Logo lockup; single neural pulse; cut to black. | Hits BOTH hackathon prize tracks (Cognee Cloud primary + self-host) in the last frame. |

---

### CONTINUITY / QA CHECKLIST (for the editor)
- [ ] Loop is ALWAYS six verbs. Never five. Never drop DETECT.
- [ ] No query box visible before ANY catch (Beats 0, 2).
- [ ] The 2s latency pause is scored (heartbeat + telemetry), never faked, never cut.
- [ ] The "silence is correct" micro-beat (Sam's coffee line) survives to final cut.
- [ ] Every citation on screen shows author + date + surface (cited · dated · owned).
- [ ] All product footage is real capture; Sora/Veo only for abstract interstitials.
- [ ] Trace chime fires on all 4 catches + PR comment + @ask (6 total) so it becomes anticipated.
- [ ] "DECIDED IN SLACK. ENFORCED ON GITHUB." lands during the PR cut-to-silence.
- [ ] Cognee terms are correct: remember = add+cognify; recall = search (GRAPH_COMPLETION + vector); guard = one GRAPH_COMPLETION (retrieve+judge).

---

## Edit / automation plan (ElevenLabs Studio + Flows)

ASSEMBLE IN ELEVENLABS STUDIO, ORCHESTRATE WITH A FLOW so the whole cut is one-click re-renderable if a line changes.
1) SCREEN CAPTURES (source of truth, record first): (a) Beat 0/2 — ONE continuous take of the real Slack thread with all four catches + @ask + team reactions + the Sam "silence" line; capture the real latency; do 4–5 takes, keep the one where the GRAPH_COMPLETION round-trip is a clean ~2s. (b) a 3s Discord surface-switch mid-run. (c) Beat 3 — the DecisionGraph node pulse + retrieval redraw + JSON verdict. (d) Beat 4 — real GitHub PR page, refresh, Trace comment landing. (e) Beat 5 — real Cursor+MCP self-correction (mongoose→Postgres), `npm run brain:rules`, `curl …?format=rules&target=cursor`. (f) Beat 6 — Morning Briefing bus-factor card + What-if("Priya"). Frame everything for the persistent bottom loop-rail overlay.
2) FLOW GRAPH (node-based): Node A generates ALL VO segments (one v3 render per beat, tagged) → Node B generates the 5 team voices + Trace voice → Node C generates the sectioned Music bed with beat markers → Node D generates the SFX pack → Node E imports the screen captures + Sora/Veo B-roll → Node F composites onto the Studio timeline aligned to the music's beat markers → Node G renders. Re-running any upstream node (e.g. a rewritten VO line) re-flows to a fresh render.
3) TIMELINE LAYERS in Studio: (L1) screen captures + B-roll; (L2) persistent six-station loop-rail HUD + telemetry HUD overlays; (L3) kinetic-type cards ("NOBODY ASKED IT TO", "DECIDED IN SLACK. ENFORCED ON GITHUB.", "THREE AGENTS · ZERO MEMORY"); (L4) VO; (L5) team/Trace voices; (L6) music bed (sidechained under VO); (L7) SFX. Snap every cut to a beat marker.
4) BEAT-MAP FIRST: lay the music + markers, place the record-scratch/drop at 0:06 and the cut-to-silence at 1:24 BEFORE cutting picture, so momentum is locked. Enforce the "no shot >3.5s except the two held beats" rule with marker spacing.
5) TRANSITIONS: beat-synced whooshes between all surfaces; stamp-wipes when citations land; whip-pans Slack↔graph↔PR; speed-ramps (fast-in / slow-mo hold on each catch); diff-wipe for the schema swap.
6) MIX: master to -14 LUFS (web), VO ducks music ~-9dB, full silence gate on the PR moneyshot, tighten the latency-pause heartbeat so it reads as suspense not stall.
7) RE-CUT SAFETY: because the Flow is node-based, a judge-driven tweak (shorter runtime, reworded VO, swapped B-roll) is a single node re-run + re-render, not a manual re-edit.

---

## ElevenLabs shot plan

VOICE / TTS (ElevenLabs v3 expressive): (1) NARRATOR VO — cloned host voice, rendered per-line with inline audio tags; one clip per beat for re-alignment. (2) TEAM CHAT — five distinct v3 voices (Priya/Maya/Raj/Karthik/Sam) as a radio drama; render each speaker separately, then layer in Studio so overlapping chat pops read as different people. (3) TRACE'S OWN VOICE — a separate cool/synthetic v3 preset (low style, high stability) for the streamed @ask answer and any spoken catch; distinct from all humans. Optional light pitch/formant shift + subtle reverb to make it feel "system."
AI B-ROLL (ElevenLabs Image & Video → Sora 2 / Veo 3.1 / Kling 2.5), abstract interstitials ONLY, never fake UI: (a) Beat 1 title — a memory-graph particle field resolving into the shield glyph (Sora 2, ~4s). (b) Beat 3 — a neural "pulse" traveling a dark graph, to underlay the DecisionGraph retrieval redraw (Veo 3.1, ~5s). (c) Beat 5.1 — a fleet of glowing agent-cursors syncing to one breathing brain core (Sora 2 or Kling 2.5, ~5s). (d) Beat 7 — a single warm neural pulse for the endcard. Keep each ≤5s; grade to the synthwave palette (deep navy/violet + hot-red drift accent + cyan citation glow).
MUSIC (ElevenLabs Music): one 124 BPM synthwave/tech-house bed generated in sections — (i) tense filtered intro with a hard bass DROP mapped to 0:06; (ii) four-on-the-floor drive across the team-chat catches; (iii) a FULL cut-to-silence + single held note for the PR moneyshot (1:24); (iv) an orchestral-tinged swell on the Company Brain reveal; (v) a warm resolve on the close. Provide beat markers to Flows for cut-syncing.
SFX (ElevenLabs SFX generation): record-scratch (0:06), sub-bass drop, the signature two-note Trace CHIME (reused 6×), receipt-stamp whoosh (every citation), mechanical station "clunk" (each rail transition), low heartbeat (latency pauses), mechanical "lock" thunk (PR comment lands), UI ticks (per streamed token), coin-up "tick" (LEARN precision counter), diff-wipe whoosh (Beat 5.2).
LIP-SYNC: none required — the film is screen-capture + VO/B-roll, no talking heads. (If a human presenter cameo is ever added, use ElevenLabs lip-sync on that clip only.)
MODEL-PER-SHOT SUMMARY: v3 TTS = all VO + team + Trace voice; Sora 2 = title particle field + agent-fleet-to-brain; Veo 3.1 = neural pulse graph underlay; Kling 2.5 = optional alt for the fleet shot; ElevenLabs Music = the single scored bed; ElevenLabs SFX = all cues above.

---

## Animations to add / use

- Persistent bottom-edge six-station loop-rail HUD (OBSERVE→REMEMBER→REASON→DETECT→GUARD→LEARN) that glows the active station with a mechanical 'clunk' on every transition — on screen the entire film
- Cold-open record-scratch + bass-drop as the red drift card SLAMS up from the composer, unprompted, with a stamp-wipe and screen shake
- 'NOBODY ASKED IT TO.' kinetic-type freeze-frame, letters slamming in on the beat
- Logo resolving out of the drift card's shield glyph
- The real app AgenticFlow pipeline locking its six nodes to the beat with packets-of-light traveling the pipe on bass hits
- Receipt-stamp whoosh + two-note Trace chime on every citation (cited·dated·owned) — 6 total so it becomes anticipated
- Scored latency pause: telemetry HUD (latency ms · nodes traversed · confidence 0.91) with a low heartbeat, turning real dead-air into suspense
- Strict-JSON guard verdict typing char-by-char in mono
- DecisionGraph nodes pulsing on bass hits and lighting the exact cited node (Priya→Postgres→supersedes→Mongo)
- THE signature retrieval visual: a glowing citation thread physically redrawing from the new message back DOWN into the dark and re-igniting Priya's original Q1 decision line
- 'Scroll into the dark' micro-beat — the founding thread dimming and scrolling up, timestamps blurring Jan→Feb→Mar
- Full cut-to-silence + mechanical 'lock' thunk as the Trace comment lands on the GitHub PR
- 'DECIDED IN SLACK. ENFORCED ON GITHUB.' kinetic type stamped over the frozen PR
- 'THREE AGENTS · ZERO MEMORY' slam type over a triptych of blinking IDE cursors
- Live agent self-correction: check_before_coding tool-call chip → red CONFLICT banner → animated diff-wipe swapping a mongoose schema to Postgres/Prisma
- npm run brain:rules stamping five real filenames (.cursorrules, CLAUDE.md, .github/copilot-instructions.md, AGENTS.md, CONVENTIONS.md) over a hub-and-spoke drawing one Cognee dataset feeding all agents
- Priya's avatar desaturating to grey when the bus-factor card fires (ownership leitmotif)
- What-if consequence cards cascading, each with a source-quote receipt-stamp
- 'recall() answers what you ask · the guard surfaced what nobody asked' contrast card at the @ask beat
- Streamed @ask answer, token-by-token with UI ticks and faint graph node-ids lighting to prove real recall
- Final full glowing revolution of the six-verb loop-rail with the four catches stacking as glowing receipts
