# 🏆 How to Win — Cognee × WeMakeDevs Hackathon

Trace is aimed at **both** grand-prize tracks at once, because it runs on **Cognee Cloud** (primary) *and* **self-hosted Cognee** (automatic failover) from the same codebase.

| Track | Prize | Why Trace qualifies |
|---|---|---|
| **Best Use of Cognee Cloud** | iPhone 17 × team | Cloud is the live primary backend (`X-Api-Key`/`X-Tenant-Id`), doing all extraction + graph completion on the managed tenant. |
| **Best Use of Open Source** | MacBook × team | The *identical* app runs on self-hosted Cognee (Docker `:8000`) — shown live via the failover + backend switch. |
| **Open Source Track ($100/PR)** | up to 5 PRs | Contribute the real integration fixes you made against the Cognee API back upstream (see below). |
| **Best Blog** | Keychron | "How we gave our team's AI a memory" — the drift-catch story writes itself. |
| **Social Buzz** | Swag | Post the 15-second GitHub-PR moneyshot clip, tag @wemakedevs + Cognee. |

---

## The 6 judging criteria → your evidence

**01 · Potential Impact — 🟢 strong.**
Every team loses the *what/why/who/when* of decisions across Slack, Discord, meetings, and code. Trace is a real paid category (decision memory / audit trail) with clear monetization (per-seat SaaS + on-prem license). Say it: *"re-litigated decisions and duplicated work are a tax every eng org pays — Trace is the first tool that catches them the moment they happen."*

**02 · Creativity & Innovation — 🟢 strong.**
The novel move is **push, not pull**: Trace speaks up *unprompted*, and it enforces a **chat** decision on a **GitHub PR**. Nobody else closes the conversation-to-code loop. That's only possible with a persistent temporal graph — a stateless chatbot structurally cannot do it.

**03 · Technical Excellence — 🟢 strong.**
- Cloud-primary with a **circuit-breaker failover** to self-hosted, per-target health cooldowns, single-write with replay-safe bodies (`lib/cognee.ts`).
- Multi-surface adapters: Discord gateway bot, Slack Events API (signed), GitHub webhook (HMAC-verified), voice.
- LLM failover chain (Cognee's managed LLM → Groq → Google → Ollama) so it never goes dark.
- Verified against the real Cognee API contract (multipart `/add`, `search_type`, `only_context`, dataset graph).

**04 · Best Use of Cognee — 🟢 the decisive lever.**
The **full lifecycle**, not a wrapper:
- **remember()** = `add` (multipart, `node_set`) + `cognify` (async, status-polled) — `lib/cognee.ts`.
- **recall()** = `search` across **`GRAPH_COMPLETION`**, **`TEMPORAL`**, and **`CHUNKS`** (citations), with `only_context` for the low-latency voice path.
- **improve()** = dismissed alerts re-`add` a correction → the graph learns this team's precision.
- **forget()** = node-level redaction + dataset delete.
- **The graph *is* the UI** (`GET /datasets/{id}/graph`, rendered live).
- Drift detection is **Cognee reasoning over its own graph** in one `GRAPH_COMPLETION` call — the deepest possible use of the memory layer.

**05 · User Experience — 🟢 good.**
It meets people where they already work (Discord/Slack/GitHub) — zero new habit. In-app: a calm, premium command center, a talking voice teammate, one-click seed, live graph. Cited answers build trust.

**06 · Presentation Quality — 🟢 (this is where you win or lose).**
The 1:53 demo in this folder nails all six beats with pro voiceover and on-brand cards. Pair it with the README below. **Judges skim — lead with the GitHub-PR moneyshot.**

---

## Submission copy (paste into Devpost / README)

**Tagline:**
> Trace catches what your team forgot it decided — live, across Discord, Slack, and GitHub. Built on Cognee.

**Elevator (100 words):**
> Every LLM call is stateless: your team's AI wakes up each day with no memory of what you decided last night. Trace fixes that. It auto-ingests your team's conversations into a Cognee hybrid graph-vector memory, then does what a chatbot can't — it *proactively* speaks up: when a Discord message contradicts a past decision, when two teammates build the same thing in Slack, or when a GitHub PR reverses a call made weeks ago in chat, Trace comments inline with the exact cited source. Remember, recall, improve, forget — the full Cognee lifecycle, live on Cloud and self-hosted.

**The three-line pitch for the video description:**
> 🧠 Proactive team memory on Cognee. Catches decision-drift & duplicate work the instant it happens — in Discord, Slack, and on GitHub PRs. Full Cognee lifecycle (remember/recall/improve/forget), live on Cloud + self-hosted.
> Demo: <your video link> · Code: <repo link>

---

## Open Source Track ($100/PR) — quick wins

You already read Cognee's source and adapted to its real API contract. Turn those into upstream PRs (max 5, don't spam):
1. **Docs:** clarify the multipart `/add` contract (`data` files + `datasetName` + `node_set` form fields) — an easy, welcomed docs PR.
2. **Docs/DX:** document the Cloud auth headers (`X-Api-Key` + `X-Tenant-Id`) and the `/datasets/` trailing-slash quirk you hit.
3. **Example:** contribute a minimal "guard a message against prior decisions with `GRAPH_COMPLETION`" example to `examples/`.
4. Comment on an existing issue first, get it assigned, *then* PR (per the rules).

---

## Final pre-submission checklist

- [ ] Demo video < 2:00, uploaded, link in README + Devpost.
- [ ] README leads with the problem → the GitHub-PR moneyshot → the Cognee lifecycle.
- [ ] Repo public, clean, `.env.example` present, **secrets rotated & gitignored**.
- [ ] Call out **both** tracks explicitly ("runs on Cognee Cloud *and* self-hosted").
- [ ] One social post with the 15-second PR clip, tagging @wemakedevs + Cognee.
- [ ] (Optional) a short blog for the Keychron side-track.
