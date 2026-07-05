# Builds Trace demo title cards as on-brand HTML (matches app/globals.css tokens),
# then renders each to a 1920x1080 PNG via headless Chrome. No AI image gen needed —
# pixel-consistent with the real product.
import os, subprocess, glob

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, "cards")
FONT = os.path.abspath(os.path.join(HERE, "..", "app", "fonts", "GeistVF.woff")).replace("\\", "/")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# Trace logo: indigo decision-thread bending at the amber "lit" node (the caught finding).
LOGO = """
<svg viewBox="0 0 132 48" width="132" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="66" cy="15" r="15" fill="#F2B04A" opacity="0.16"/>
  <path d="M8 36 C 30 36, 40 16, 66 15 S 100 30, 124 17" stroke="#4F46E5" stroke-width="3" stroke-linecap="round"/>
  <circle cx="8" cy="36" r="4.2" fill="#4F46E5" opacity="0.82"/>
  <circle cx="124" cy="17" r="4.2" fill="#4F46E5"/>
  <circle cx="66" cy="15" r="7.5" fill="#F2B04A"/>
  <circle cx="66" cy="15" r="7.5" stroke="#ffffff" stroke-width="2"/>
</svg>
"""

BASE_CSS = f"""
@font-face {{ font-family:'Geist'; src:url('file:///{FONT}'); font-weight:100 900; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
html,body {{ width:1920px; height:1080px; }}
body {{
  font-family:'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  background:#FAFAFB; color:#23262F; letter-spacing:-0.01em;
  -webkit-font-smoothing:antialiased;
  display:flex; align-items:center; justify-content:center;
}}
.stage {{ width:1520px; }}
.logo {{ display:flex; align-items:center; gap:18px; margin-bottom:56px; }}
.logo .wm {{ font-size:34px; font-weight:600; letter-spacing:-0.02em; }}
.kicker {{ font-size:19px; font-weight:600; text-transform:uppercase; letter-spacing:0.22em; color:#9297A0; margin-bottom:26px; }}
h1 {{ font-size:96px; font-weight:600; line-height:1.02; letter-spacing:-0.03em; }}
h1 .amber {{ color:#E0A54A; }}
h1 .indigo {{ color:#4F46E5; }}
.sub {{ font-size:34px; line-height:1.4; color:#6B6F78; margin-top:34px; max-width:1180px; }}
.row {{ display:flex; gap:16px; margin-top:52px; flex-wrap:wrap; }}
.chip {{ font-size:24px; font-weight:500; color:#23262F; background:#fff; border:1px solid rgba(0,0,0,.08);
        border-radius:999px; padding:14px 26px; box-shadow:0 1px 2px rgba(0,0,0,.05); }}
.chip.accent {{ color:#3B34B8; background:rgba(79,70,229,.10); border-color:rgba(79,70,229,.25); }}
.foot {{ position:fixed; left:200px; bottom:96px; font-size:22px; color:#9297A0; }}
.badge {{ font-size:22px; font-weight:600; padding:8px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:10px; }}
.dot {{ width:11px; height:11px; border-radius:50%; display:inline-block; }}
.lifecycle {{ display:flex; gap:22px; margin-top:56px; }}
.life {{ flex:1; background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:20px; padding:32px 30px; box-shadow:0 1px 2px rgba(0,0,0,.05); }}
.life .op {{ font-family:'Geist'; font-size:30px; font-weight:600; color:#4F46E5; }}
.life .d {{ font-size:21px; color:#6B6F78; margin-top:12px; line-height:1.4; }}
"""

def logo_block(tag="Trace"):
    return f'<div class="logo">{LOGO}<span class="wm">{tag}</span></div>'

CARDS_HTML = {
# ── 00 · Cold-open title ────────────────────────────────────────────────
"card_00_title": f"""
<div class="stage">
  {logo_block()}
  <div class="kicker">The memory layer for AI teams</div>
  <h1>Your AI has a<br><span class="amber">hangover.</span></h1>
  <div class="sub">Every model call is stateless — it forgets what your team decided last night.
  <b style="color:#23262F">Trace</b> is the cure: a permanent, hybrid graph-vector memory, built on Cognee.</div>
  <div class="foot">catch what your team forgot it decided</div>
</div>
""",

# ── 01 · The problem ────────────────────────────────────────────────────
"card_01_problem": f"""
<div class="stage">
  <div class="kicker">The problem</div>
  <h1 style="font-size:78px">Decisions get made.<br>Then everyone <span class="indigo">forgets.</span></h1>
  <div class="row">
    <span class="chip">↩︎ Reversed decisions get re-litigated</span>
    <span class="chip">⧉ Two teams build the same thing</span>
    <span class="chip">⚠ The one owner goes on leave</span>
    <span class="chip">🕔 Context dies in the scrollback</span>
  </div>
  <div class="sub" style="margin-top:48px">A chatbot only answers what you <i>ask</i>. Trace surfaces what nobody thought to ask.</div>
</div>
""",

# ── 04 · Cross-source bumper ────────────────────────────────────────────
"card_04_crosssource": f"""
<div class="stage" style="text-align:center">
  <div style="display:flex;justify-content:center">{LOGO}</div>
  <h1 style="margin-top:40px">One memory.<br><span class="indigo">Every surface.</span></h1>
  <div class="row" style="justify-content:center;margin-top:56px">
    <span class="chip">Discord</span>
    <span class="chip">Slack</span>
    <span class="chip">GitHub PRs</span>
    <span class="chip">Voice</span>
    <span class="chip">Files & URLs</span>
  </div>
  <div class="sub" style="margin:44px auto 0">A decision made in chat is enforced on a pull request. Same graph, everywhere your team works.</div>
</div>
""",

# ── 06 · Tech stack + orchestration ─────────────────────────────────────
"card_06_stack": f"""
<div class="stage">
  <div class="kicker">Tech stack &amp; orchestration</div>
  <h1 style="font-size:70px">Powered end-to-end<br>by <span class="indigo">Cognee.</span></h1>
  <div class="lifecycle">
    <div class="life"><div class="op">remember()</div><div class="d">add + cognify every message into a hybrid graph-vector store</div></div>
    <div class="life"><div class="op">recall()</div><div class="d">GRAPH_COMPLETION · TEMPORAL · CHUNKS — auto-routed, cited</div></div>
    <div class="life"><div class="op">improve()</div><div class="d">every dismissed alert re-cognifies precision back in</div></div>
    <div class="life"><div class="op">forget()</div><div class="d">node-level redaction + dataset delete on demand</div></div>
  </div>
  <div class="row" style="margin-top:44px">
    <span class="chip accent">Cognee Cloud + self-hosted</span>
    <span class="chip">Next.js 14</span>
    <span class="chip">ElevenLabs voice</span>
    <span class="chip">Discord · Slack · GitHub webhooks</span>
    <span class="chip">Groq failover</span>
  </div>
</div>
""",

# ── 07 · Outro ──────────────────────────────────────────────────────────
"card_07_outro": f"""
<div class="stage" style="text-align:center">
  <div style="display:flex;justify-content:center">{LOGO}</div>
  <h1 style="margin-top:44px;font-size:104px">No more <span class="amber">hangover.</span></h1>
  <div class="sub" style="margin:40px auto 0;font-size:36px">Give your agents a memory that survives the night.</div>
  <div class="row" style="justify-content:center;margin-top:54px">
    <span class="badge" style="background:rgba(79,70,229,.10);color:#3B34B8"><span class="dot" style="background:#4F46E5"></span>Runs on Cognee Cloud</span>
    <span class="badge" style="background:rgba(224,165,74,.14);color:#8a5a12"><span class="dot" style="background:#E0A54A"></span>100% self-hostable</span>
  </div>
  <div class="foot" style="left:0;right:0;text-align:center;bottom:70px">Trace · built on the open-source Cognee memory layer</div>
</div>
""",
}

def build():
    os.makedirs(CARDS, exist_ok=True)
    for name, inner in CARDS_HTML.items():
        html = f"<!doctype html><html><head><meta charset='utf-8'><style>{BASE_CSS}</style></head><body>{inner}</body></html>"
        with open(os.path.join(CARDS, name + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
    print(f"Wrote {len(CARDS_HTML)} HTML cards.")

def render():
    for html in sorted(glob.glob(os.path.join(CARDS, "*.html"))):
        png = html[:-5] + ".png"
        url = "file:///" + html.replace("\\", "/")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=1", "--window-size=1920,1080",
                        f"--screenshot={png}", url], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ok = os.path.exists(png) and os.path.getsize(png) > 0
        print(f"  {'[ok]' if ok else '[FAIL]'} {os.path.basename(png)} ({os.path.getsize(png)//1024 if ok else 0} KB)")

if __name__ == "__main__":
    build()
    render()
    print("Cards ->", CARDS)
