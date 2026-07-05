# 🎬 Trace — 2-Minute Demo Script (shot-by-shot)

> **One line:** *Trace catches what your team forgot it decided — live, across Discord, Slack, and GitHub — powered end-to-end by the Cognee memory lifecycle.*

**Target length:** 1:53 (hard cap < 2:00). Everything below is already built in this folder — voiceover (`voiceover/`), title cards (`cards/`), finished bookend clips (`output/`).

**The story arc:** *stateless AI forgets → Trace remembers → it catches drift the instant it happens, in the tools your team already uses → it enforces a chat decision on a GitHub PR → it's the full Cognee lifecycle underneath.*

---

## The timeline at a glance

| # | Time | Screen you record | Voiceover file | Card / clip |
|---|------|-------------------|----------------|-------------|
| 0 | 0:00–0:13 | — (play the clip) | `01_cold_open.mp3` | ▶ `output/intro.mp4` |
| 1 | 0:13–0:34 | **Discord** — Sandesh types, Trace replies | `02_discord_drift.mp3` | live screen |
| 2 | 0:34–0:47 | **Slack** — Pushpa types, Trace replies | `03_slack_duplicate.mp3` | live screen |
| — | 0:47–0:49 | — | (silent) | ▶ `output/crosssource_bumper.mp4` |
| 3 | 0:49–1:05 | **GitHub** — open the PR, Trace comments | `04_github_pr.mp3` | live screen |
| 4 | 1:05–1:23 | **Trace app** — Graph + Ask | `05_lifecycle.mp3` | live screen |
| 5 | 1:23–1:37 | **Trace app** — What-if | `06_whatif.mp3` | live screen |
| 6 | 1:37–1:53 | — (play the clip) | `07_close.mp3` | ▶ `output/close.mp4` |

> The live-screen narration (segments 1–5) is also pre-stitched with correct gaps as **`output/voiceover_bed_screen.mp3`** (88.6s) — if you record the middle in one continuous take, just drop that single audio file underneath. See `RECORDING_GUIDE.md`.

---

## BEAT 0 — Cold open (0:00–0:13)  ▶ `output/intro.mp4`

**On screen:** the title card animates in — *"Your AI has a hangover."*
**Voiceover (already in the clip):**
> "Every A.I. call is stateless — it forgets. Your team decides something on Monday; by Friday the A.I. has no memory of it. This is Trace: team memory that never forgets, built on Cognee."

**Why it opens strong:** names the hackathon's own thesis ("your AI has a hangover") and immediately says *Cognee*.

---

## BEAT 1 — Drift caught live, in Discord (0:13–0:34)

**On screen:** your Discord channel, Trace bot online. **Sandesh** sends (see `CHAT_SCRIPT.md`):
> *"Starting the new analytics service this sprint — going with MongoDB since the schema keeps changing."*

Within a few seconds the **Trace bot replies in-thread**, e.g.:
> **Trace ·** New service on MongoDB reverses the Postgres standard
> ⚠️ Heads up — this may reverse an earlier decision.
> \> *we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services.* — priya, Q1
> Reconcile with Priya before starting — or document why analytics is the exception.

**Voiceover:** `02_discord_drift.mp3`
> "Live in Discord: a teammate says, let's move the new service to MongoDB. But this team standardized on Postgres months ago. Trace catches it instantly — citing the exact decision, and who made it. That's Cognee's graph memory reasoning over the team's history."

**🧠 Cognee highlight to point at:** nobody queried anything. Trace ran a **`GRAPH_COMPLETION`** search against the team's memory — Cognee *retrieved the prior decision AND reasoned that it's a contradiction, in one call* (`lib/guard.ts → checkMessage`). A chatbot answers what you ask; this surfaces what nobody asked.

---

## BEAT 2 — Duplicate work caught, in Slack (0:34–0:47)

**On screen:** switch to Slack (same channel your bot is in). **Pushpa** sends:
> *"I'll build a retry queue for our failed webhook events this week."*

**Trace replies in the channel:**
> ⚠️ *Trace · Retry queue duplicates work already shipped*
> This looks like duplicate work:
> \> *Added a generic retry queue in platform-core for all services to use.* — sam (PR #412)
> Reuse platform-core's queue instead of building a third one.

**Voiceover:** `03_slack_duplicate.mp3`
> "Same memory, in Slack. Someone starts a retry queue two teammates already built. Trace flags the duplicate before an hour is wasted. One brain, every channel."

**🧠 Cognee highlight:** *the exact same memory* answered in a different tool. Discord and Slack are just adapters (`app/api/slack/events`, `adapters/discord-bot.mjs`) writing into and reading from **one Cognee dataset**. This is the "carry context across infinite sessions" promise, made literal.

---

## BUMPER (0:47–0:49)  ▶ `output/crosssource_bumper.mp4`
*"One memory. Every surface."* — 2-second breath before the moneyshot.

---

## BEAT 3 — The moneyshot: a chat decision enforced on a GitHub PR (0:49–1:05)

**On screen:** the GitHub PR page for a PR titled **"Migrate billing service to MongoDB"** (you open it — see `CHAT_SCRIPT.md`). Refresh, and a **Trace comment** appears on the PR:
> **Trace ·** This PR reverses the Postgres standard
> ⚠️ This PR may reverse an earlier decision:
> \> *we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services.* — priya, Q1
> Confirm with Priya before merging.

**Voiceover:** `04_github_pr.mp3`
> "The moneyshot: a pull request migrates billing to MongoDB — reversing a chat decision from weeks ago. Trace comments on the pull request itself, citing the original call. A decision made in Discord, now enforced on GitHub."

**🧠 Cognee highlight (this is the winning moment):** memory made in **chat** is enforced on **code**. The GitHub webhook (`app/api/github/webhook`) guards the PR against the *same* Cognee memory and comments inline. No other "team memory" tool closes the loop from conversation to pull request. **This is the single most important 15 seconds of the demo.**

---

## BEAT 4 — Under the hood: the living graph + cited recall (1:05–1:23)

**On screen:** the Trace app. Show the **Graph** view (the live Cognee knowledge graph — nodes = people, decisions, projects). Click a node to show its decision history. Then open **Ask** and type:
> *"What did we decide about our database, and why?"*
→ a **cited** answer streams back (Postgres standard, Neon migration, the why).

**Voiceover:** `05_lifecycle.mp3`
> "Under the hood: the full Cognee lifecycle. Every message is remembered — added and cognified into a hybrid graph-vector store. Ask anything; it recalls with citations, routing vector search and graph traversal automatically."

**🧠 Cognee highlight:** the graph on screen is `GET /datasets/{id}/graph` rendered directly (`lib/cognee.ts → getGraph`). The answer uses `GRAPH_COMPLETION` + `CHUNKS` for citations. Say the words: **remember() = add + cognify, recall() = search.** The graph *is* the UI.

---

## BEAT 5 — Query the future: the grounded What-if (1:23–1:37)

**On screen:** the **What-if** view. Type **`Priya`** → run.
→ *"If Priya leaves, authentication is orphaned."* HIGH — sole owner of auth (cited) · she's on leave next month (cited).

**Voiceover:** `06_whatif.mp3`
> "It even projects the future. If Priya leaves, what breaks? Authentication — she owns it, and she's on leave. Every consequence traced to a real message. Zero invented numbers."

**🧠 Cognee highlight:** this is a projection over **real graph evidence** — every consequence cites the exact message (`lib/whatif.ts`). No fabricated Monte-Carlo percentages. A technical judge can trust it *because there's nothing invented to disbelieve.*

---

## BEAT 6 — Close (1:37–1:53)  ▶ `output/close.mp4`

**On screen:** the tech-stack card (`remember / recall / improve / forget`), then the outro card — *"No more hangover."*
**Voiceover (in the clip):** `07_close.mp3`
> "Trace runs on Cognee Cloud and self-hosted — remember, recall, improve, forget. Give your A.I. a memory that survives the night. No more hangover."

**Last frame holds:** *Runs on Cognee Cloud · 100% self-hostable.* → hits **both** prize tracks in one breath.

---

## Judge Q&A cheat-sheet (have these ready)

- **"Is this just a Cognee wrapper?"** No. Cognee is the memory substrate. Trace is (a) a *proactive* discovery engine — it speaks up unprompted, which is impossible without temporal graph memory — and (b) a cross-surface enforcement layer (chat → PR). The dismiss-and-grade loop feeds corrections back via `add()` — a graded corpus Cognee's dashboard doesn't collect.
- **"How is drift detected?"** A single Cognee `GRAPH_COMPLETION` call retrieves prior decisions and judges the new message against them. High-confidence + cited only; silence is the default. Groq is a deep fallback only.
- **"Which Cognee lifecycle ops do you use?"** All four: `remember` (add+cognify), `recall` (GRAPH_COMPLETION / TEMPORAL / CHUNKS), `improve` (re-cognify on dismissals), `forget` (node redaction + dataset delete).
- **"Cloud or self-hosted?"** Both — live. Cognee Cloud is primary (`X-Api-Key`/`X-Tenant-Id`); a local self-hosted instance is automatic failover (`lib/cognee.ts` circuit breaker). Same code, both tracks.
