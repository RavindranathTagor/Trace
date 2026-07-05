# 🎬 Trace Demo Kit

Everything to record a **< 2-minute** demo that wins the Cognee × WeMakeDevs hackathon. Voiceover, title cards, and finished bookend clips are **already generated** — you record one screen capture and stitch.

## Read in this order
1. **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)** — the shot-by-shot, timed 2-minute script (the spine).
2. **[CHAT_SCRIPT.md](CHAT_SCRIPT.md)** — exact copy-paste messages your friends send in Discord/Slack + the GitHub PR.
3. **[RECORDING_GUIDE.md](RECORDING_GUIDE.md)** — how to record + assemble, zero video skills needed.
4. **[SUBMISSION.md](SUBMISSION.md)** — how to win: criteria mapping, both prize tracks, submission copy.

## What's generated
| Folder | Contents |
|---|---|
| `voiceover/` | 7 narration clips, **male Indian-English** (ElevenLabs "Satyam Singh"), one per beat — 1:41 total |
| `cards/` | 5 on-brand 1080p title cards (PNG + HTML source) |
| `output/` | `intro.mp4`, `close.mp4`, `crosssource_bumper.mp4`, `problem_bumper.mp4`, `voiceover_bed_screen.mp3` |

## Regenerate anything
```bash
cd demo
ELEVENLABS_API_KEY=sk_... python gen_voiceover.py   # re-make the voiceover
python gen_cards.py          # re-make the title cards (headless Chrome)
bash   build_clips.sh        # re-make intro/close/bumpers + the voiceover bed
bash   stitch_final.sh screen_narrated.mp4   # assemble the final video
```

## The 90-second summary
Trace is proactive team memory on **Cognee**. It watches Discord, Slack, and GitHub, and speaks up — unprompted — when a new message **contradicts a past decision** (drift), **duplicates work** someone already did, or when a **PR reverses a decision made in chat**. It cites the exact source every time. Under the hood it's the full Cognee lifecycle — `remember` (add + cognify), `recall` (GRAPH_COMPLETION / TEMPORAL / CHUNKS), `improve`, `forget` — running live on **Cognee Cloud** with automatic failover to **self-hosted** Cognee.

> 🔐 Tokens for Discord/Slack/GitHub/Cognee were pasted in chat during setup — **rotate them** after the demo. They stay gitignored.
