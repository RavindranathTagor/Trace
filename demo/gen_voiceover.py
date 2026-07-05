# Generates the Trace demo voiceover pack (male Indian English narrator) via ElevenLabs.
# Each segment maps 1:1 to a beat in DEMO_SCRIPT.md.
import os, sys, json, urllib.request

# Read the key from the environment so it never lands in git:
#   ELEVENLABS_API_KEY=sk_... python gen_voiceover.py
API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
if not API_KEY:
    sys.exit("Set ELEVENLABS_API_KEY in your environment first (the audio is already generated in voiceover/).")
VOICE_ID = "fnyqY1A0BcjAtRpVEd7Z"          # Satyam Singh - Indian Business Narrator (confident)
MODEL = "eleven_multilingual_v2"            # highest-quality (non-realtime) narration
OUT = os.path.join(os.path.dirname(__file__), "voiceover")

# (id, filename, text). Confident narrator ~2.3 wps. Tightened to ~100s total so the
# finished cut (with on-screen action) stays comfortably under 2:00.
SEGMENTS = [
    ("01_cold_open", "01_cold_open.mp3",
     "Every A.I. call is stateless — it forgets. Your team decides something on Monday; "
     "by Friday the A.I. has no memory of it. "
     "This is Trace: team memory that never forgets, built on Cognee."),

    ("02_discord_drift", "02_discord_drift.mp3",
     "Live in Discord: a teammate says, let's move the new service to MongoDB. "
     "But this team standardized on Postgres months ago. "
     "Trace catches it instantly — citing the exact decision, and who made it. "
     "That's Cognee's graph memory reasoning over the team's history."),

    ("03_slack_duplicate", "03_slack_duplicate.mp3",
     "Same memory, in Slack. Someone starts a retry queue two teammates already built. "
     "Trace flags the duplicate before an hour is wasted. One brain, every channel."),

    ("04_github_pr", "04_github_pr.mp3",
     "The moneyshot: a pull request migrates billing to MongoDB — reversing a chat decision from weeks ago. "
     "Trace comments on the pull request itself, citing the original call. "
     "A decision made in Discord, now enforced on GitHub."),

    ("05_lifecycle", "05_lifecycle.mp3",
     "Under the hood: the full Cognee lifecycle. Every message is remembered — "
     "added and cognified into a hybrid graph-vector store. "
     "Ask anything; it recalls with citations, routing vector search and graph traversal automatically."),

    ("06_whatif", "06_whatif.mp3",
     "It even projects the future. If Priya leaves, what breaks? Authentication — she owns it, "
     "and she's on leave. Every consequence traced to a real message. Zero invented numbers."),

    ("07_close", "07_close.mp3",
     "Trace runs on Cognee Cloud and self-hosted — remember, recall, improve, forget. "
     "Give your A.I. a memory that survives the night. No more hangover."),
]

def tts(text, path):
    body = json.dumps({
        "text": text,
        "model_id": MODEL,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128",
        data=body, method="POST",
        headers={"xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    with open(path, "wb") as f:
        f.write(data)
    return len(data)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for sid, fname, text in SEGMENTS:
        path = os.path.join(OUT, fname)
        try:
            n = tts(text, path)
            total += n
            print(f"[ok] {fname:26s} {n//1024:5d} KB  ({len(text.split())} words)")
        except Exception as e:
            print(f"[FAIL] {fname}: {e}")
            sys.exit(1)
    print(f"Done. {len(SEGMENTS)} segments, {total//1024} KB total -> {OUT}")
