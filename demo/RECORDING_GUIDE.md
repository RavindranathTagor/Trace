# 🎥 Recording Guide — zero-guesswork

You don't need any video skills. Record **one screen capture of the middle**, drop the provided audio under it, and stitch it between the two finished bookend clips. ~30 minutes end to end.

---

## What's already done for you (in this folder)

```
demo/
├── voiceover/              7 narration MP3s (male Indian-English), one per beat
├── cards/                  5 title cards as 1080p PNGs (on-brand)
├── output/
│   ├── intro.mp4           0:00–0:13  finished title clip (VO baked in)
│   ├── crosssource_bumper.mp4   2.5s  "One memory. Every surface."
│   ├── problem_bumper.mp4       2.5s  optional problem card
│   ├── close.mp4           finished closing clip (stack + outro, VO baked in)
│   └── voiceover_bed_screen.mp3  88.6s  the middle narration, gaps pre-timed
├── DEMO_SCRIPT.md          the shot-by-shot script (read this first)
├── CHAT_SCRIPT.md          exact messages your friends type
├── build_clips.sh          rebuilds intro/close/bumpers (already run)
└── stitch_final.sh         assembles the final video (one command)
```

You only produce **one file**: a screen recording of the middle section.

---

## Step 1 — Set up the screen (5 min)

- **Resolution:** record at **1920×1080**. Set your display to 1080p (or record a 1080p region) so it matches the bookend clips exactly.
- Open, in separate windows/tabs, ready to Alt-Tab in this order: **Discord → Slack → the GitHub PR tab → the Trace app (`localhost:3001`)**.
- In the Trace app, start on the **Graph** view with the header showing green **"Live · N nodes"**.
- Hide desktop clutter: close notifications, clear the taskbar, use a clean browser profile (no bookmarks bar with personal tabs).
- Do the **pre-flight checklist in `CHAT_SCRIPT.md`** (bot online, memory seeded, ngrok up).

---

## Step 2 — Pick a recorder (any one)

| Recorder | How | Notes |
|---|---|---|
| **OBS Studio** (best) | Scene → Display/Window Capture → Start Recording | Free, 1080p60, records mic too if you want a backup VO. |
| **Windows Game Bar** | `Win + G` → Record | Built into Windows 11, zero install. Captures the active window. |
| **Windows + Alt + R** | shortcut to start/stop Game Bar capture | Fastest. |

Record **video only** (we add the provided audio afterward) — or record with your mic as a backup. Save as MP4.

---

## Step 3 — Record the middle section (the only take you make)

Follow `CHAT_SCRIPT.md`'s **"Full running order."** Rough timing (don't stress the seconds — the audio is added after and you can trim):

1. **Discord** (~0:00–0:22 of your take): Sandesh sends the MongoDB line → Trace replies. (Optional: you ask `@Trace what did we decide about the DB?`)
2. **Slack** (~0:22–0:34): Pushpa sends the retry-queue line → Trace replies.
3. **GitHub** (~0:34–0:52): switch to the PR tab, open the PR (or refresh a just-opened one) → the Trace comment appears.
4. **Trace app — Graph + Ask** (~0:52–1:10): click a node; open **Ask**; type *"What did we decide about our database, and why?"* → cited answer.
5. **Trace app — What-if** (~1:10–1:24): open **What-if**, type **`Priya`**, run → the impact list.

Tips:
- **Move deliberately and pause** when Trace is "thinking" — that latency reads as *real* on camera.
- If you fumble, just pause 3s and redo that action; you'll trim it later.
- Total middle take target: **~85–90s** (matches `voiceover_bed_screen.mp3` = 88.6s).

---

## Step 4 — Add the voiceover (2 options)

**Option A — one file (easiest).** In any editor (CapCut, DaVinci Resolve, Clipchamp, even PowerPoint):
1. Put your screen recording on the video track.
2. Put **`output/voiceover_bed_screen.mp3`** on the audio track, starting at 0:00.
3. Nudge your video so the actions line up with the narration (the bed has built-in gaps: 1s before Discord, 2s before Slack, 3s before GitHub, 3s before the app, 2s before What-if). Trim dead space.

**Option B — per-beat control.** Drop the individual `voiceover/02…06.mp3` files where each beat starts. More control, slightly more fiddly.

Export this middle section as **`screen_narrated.mp4`** (1920×1080).

---

## Step 5 — Stitch the final video (one command)

From `demo/` in Git Bash:
```bash
bash stitch_final.sh path/to/screen_narrated.mp4
```
This normalizes and joins **intro.mp4 + your middle + close.mp4** into `output/trace_demo_final.mp4` (~1:53). It auto-scales your recording to 1080p and matches codecs, so concat is seamless.

Want the 2-second cross-source bumper inserted between Slack and GitHub? Easiest is to place `output/crosssource_bumper.mp4` on your editor timeline at that cut in Step 4; otherwise the demo reads fine without it.

---

## Step 6 — Final check (2 min)

- [ ] Length **< 2:00** (target 1:53).
- [ ] The **three catches** are clearly visible: Discord drift, Slack duplicate, GitHub PR comment.
- [ ] Audio is clear, no clipping, VO matches the on-screen action.
- [ ] The header **"Live"** badge (Cognee connected) is visible at least once.
- [ ] Ends on the **"No more hangover / Runs on Cognee Cloud · self-hostable"** card.
- [ ] Upload as **unlisted YouTube / Loom / MP4** for the submission; put the link in the README + Devpost.

---

## If you'd rather not edit at all (fallback)

Record the **whole thing in one continuous take** — play `output/intro.mp4` fullscreen, then do the middle live while `output/voiceover_bed_screen.mp3` plays out loud, then play `output/close.mp4` fullscreen — and screen-record the entire session start to finish. One file, no stitching. Slightly less polished, but fully hands-off.

---

## Troubleshooting

- **Bot didn't reply in Discord/Slack** → memory not seeded or message not a clear contradiction. Re-run `npm run seed:demo`; use the exact lines in `CHAT_SCRIPT.md`.
- **No Trace comment on the PR** → webhook not on that repo, or `GITHUB_TOKEN` lacks write. Check repo → Settings → Webhooks → Recent Deliveries (want `200`).
- **Header shows "Demo" not "Live"** → Cognee not connected; check `.env.local` (`COGNEE_ENABLED=true`, Cloud key) and that the tenant is up.
- **Slack Request URL won't verify** → ngrok not running / app not on 3001. The URL must be `https://<tunnel>/api/slack/events`.
- **Final video has black bars** → your recording wasn't 16:9; `stitch_final.sh` pads it — fine, or re-record at 1920×1080.
