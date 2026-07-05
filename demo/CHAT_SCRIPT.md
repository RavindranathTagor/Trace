# 💬 Live Chat Choreography — Discord · Slack · GitHub

Exactly what each person types, in order, so Trace fires **drift**, **duplicate-work**, and **cross-source PR** catches on camera. Every message here is engineered to contradict or duplicate something **already in Trace's memory** (the seeded `trace-demo` dataset), so the bot *will* respond.

> **The memory Trace already holds** (so you know *why* each line triggers):
> 1. *"we are standardizing ALL new services on PostgreSQL. No more MongoDB."* — Priya, Q1
> 2. *"we will NOT support on-prem this year. Cloud-only."* — Priya / Maya, Q1
> 3. *"Priya owns authentication end to end"* + *"I'm on leave all next month."*
> 4. *"I started building a retry queue for payments"* (Raj) + *"Added a generic retry queue in platform-core, PR #412"* (Sam)

---

## 🎭 Cast & roles

| Person | Role in the demo | Where |
|---|---|---|
| **You (Ravindra / host)** | Drive the app + open the GitHub PR + ask the @Trace questions | screen |
| **Sandesh** | Triggers the **database drift** catch | Discord |
| **Pushpa** | Triggers the **duplicate-work** catch | Slack |
| **Ravindra (2nd friend)** *or Pushpa* | Triggers the **on-prem drift** (backup/bonus line) | Slack |

Tell your friends: **send the message only when you point at them / say "go."** One message at a time — let Trace's reply land fully before the next.

---

## ✅ 10-minute pre-flight (do this BEFORE recording)

1. App running on `http://localhost:3001` (`npm run dev` in `hindsight/`). Header badge shows **"Live · N nodes"** (green) = Cognee Cloud connected.
2. Memory seeded: `npm run seed:demo` (only needed once; the Briefing should show findings).
3. **Discord bot online** — in the app go to **Sources → Discord → Start** (token is saved). The bot appears online in your server.
4. **Slack** — bot token is saved; the Slack app's **Event Subscriptions → Request URL** points at `https://deserving-disgrace-donation.ngrok-free.dev/api/slack/events` and is **Verified**, with `message.channels` (and `app_mention`) subscribed, and the bot invited to the channel (`/invite @Trace`).
5. **GitHub** — the repo you'll open the PR in has a webhook → `https://deserving-disgrace-donation.ngrok-free.dev/api/github/webhook` (content-type `application/json`), and `GITHUB_TOKEN` has write access to that repo.
6. **ngrok tunnel running** and pointing at port 3001 (needed for Slack + GitHub; Discord does **not** need it).
7. Do **one throwaway test** of each surface off-camera (see "Dry run" at the bottom) so you know the exact reply latency.

> ⏱️ **Latency note:** Trace's reply takes ~2–8s (Cognee GRAPH_COMPLETION round-trip). That pause is *good on camera* — narrate over it: "…and it's checking the team's memory…". Don't cut it out; it proves it's real.

---

## 1️⃣ DISCORD — database drift  (demo beat 1)

**Channel:** your server's `#general` (channel id `750602132616511623`).

**Sandesh types (copy-paste):**
```
Starting the new analytics service this sprint — going with MongoDB since the schema keeps changing a lot.
```

**Trace bot replies (generated live; will read close to this):**
> **Trace ·** New service on MongoDB reverses the Postgres standard
> ⚠️ Heads up — this may reverse an earlier decision.
> \> we are standardizing ALL new services on PostgreSQL. No more MongoDB for new services. — priya
> Reconcile with Priya before starting, or note why analytics is the exception.

**(Optional, 5s later) You type — shows Q&A recall:**
```
@Trace what did we actually decide about our database, and why?
```
→ Trace cites the Postgres standard + the Neon migration.

---

## 2️⃣ SLACK — duplicate work  (demo beat 2)

**Channel:** `C0BF7LYTFRP` (the one the bot is invited to).

**Pushpa types (copy-paste):**
```
Heads up team — I'm going to build a retry queue for our failed webhook events this week.
```

**Trace bot replies in-channel (generated live):**
> ⚠️ *Trace · Retry queue duplicates work already shipped*
> This looks like duplicate work:
> \> Added a generic retry queue in platform-core for all services to use. — sam (PR #412)
> Reuse platform-core's queue instead of building a third one.

**(Optional bonus line — on-prem drift) Ravindra/Pushpa types:**
```
Acme is huge — let's just ship an on-prem deployment for them this quarter.
```
→ Trace flags it against *"we will NOT support on-prem this year. Cloud-only."*

---

## 3️⃣ GITHUB — the cross-source moneyshot  (demo beat 3)

You open a real Pull Request in the repo wired to the webhook. Two ways — pick one:

### Option A — from the GitHub UI (most cinematic)
1. In the repo, create a branch `billing-mongo`, edit any file (e.g. add a line to `README.md`).
2. Open a PR with **exactly this title + body** (they're written to trip the Postgres standard):

**PR title:**
```
Migrate billing service to MongoDB
```
**PR body:**
```
Switching the billing service off Postgres to MongoDB for schema flexibility as we scale. Updates the data layer and connection config.
```
3. On the PR page, wait ~5–10s and **refresh** → a **Trace** comment appears citing Priya's Postgres decision.

### Option B — one command (fastest, if you have `gh` CLI)
```bash
gh pr create --repo RavindranathTagor/Trace-Test \
  --title "Migrate billing service to MongoDB" \
  --body "Switching the billing service off Postgres to MongoDB for schema flexibility as we scale."
```

> **The comment is posted by Trace's webhook** (`app/api/github/webhook`): it guards the PR text against the same Cognee memory, and if it finds a reversal, comments inline via the GitHub API using `GITHUB_TOKEN`. Make sure the webhook is on **the repo you open the PR in** (`Trace-Test` *or* `Trace-AI` — whichever your webhook targets; confirm in repo → Settings → Webhooks → recent deliveries show `200`).

**Voiceover for this beat:** `voiceover/04_github_pr.mp3`.

---

## 🔁 Full running order (what happens, in sequence)

```
[intro.mp4 plays]                                        0:00
── you switch to Discord ──
Sandesh  ➜ "…new analytics service … MongoDB …"          0:14   ⚠ Trace: Postgres drift
(you)    ➜ "@Trace what did we decide about the DB?"     0:28   💬 Trace: cited answer
── you switch to Slack ──
Pushpa   ➜ "…build a retry queue for webhook events…"    0:36   ⧉ Trace: duplicate work
[crosssource_bumper.mp4]                                 0:47
── you switch to the GitHub PR page ──
(you)    ➜ open PR "Migrate billing service to MongoDB"  0:50   ⚠ Trace comments on the PR
── you switch to the Trace app ──
Graph → click a node → Ask "database decision?"          1:05
What-if → type "Priya"                                   1:23
[close.mp4 plays]                                        1:37
                                                          END ≈ 1:53
```

---

## 🧪 Dry run (off-camera, 5 min before)

Send each trigger once to confirm the bot replies, THEN clear the noise so the recording is clean:
- Discord: send the MongoDB line → confirm reply → delete both messages.
- Slack: send the retry-queue line → confirm reply → delete.
- GitHub: you can leave a test PR open, or close it and open a fresh one on camera.

If a trigger **doesn't** fire: the message wasn't a clear enough contradiction, or memory isn't seeded. Re-run `npm run seed:demo`, and use the exact copy-paste lines above (they're tuned to the seeded decisions).

> 🔐 **After the demo:** the Discord/Slack/GitHub tokens in `data/integrations.json` and `.env.local` were shared in chat — **rotate them**. They're gitignored; keep them that way.
