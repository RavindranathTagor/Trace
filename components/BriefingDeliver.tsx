"use client";

// Self-contained "deliver the briefing" bar, fetches which platforms can receive
// a briefing, lets you toggle targets (connected = selectable, not-connected =
// greyed with an "i" how-to), and posts to the ones you pick. Drop it anywhere.

import { useCallback, useEffect, useState } from "react";
import { DiscordLogo, SlackLogo, TeamsLogo } from "@/components/Logos";

const PLATFORMS: {
  id: "discord" | "slack" | "teams";
  name: string;
  Logo: (p: { className?: string }) => JSX.Element;
  howTo: string;
}[] = [
  { id: "discord", name: "Discord", Logo: DiscordLogo, howTo: "Set a Channel ID in Sources → Discord (the bot posts there, no webhook needed)." },
  { id: "slack", name: "Slack", Logo: SlackLogo, howTo: "Add an Incoming Webhook (post-only) or a bot token + channel (two-way) in Sources → Slack." },
  { id: "teams", name: "Teams", Logo: TeamsLogo, howTo: "Add a Teams Incoming Webhook URL in Sources → Teams." },
];

export default function BriefingDeliver() {
  const [connected, setConnected] = useState<{ discord?: boolean; slack?: boolean; teams?: boolean }>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({ discord: true, slack: true, teams: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const load = useCallback(() => {
    fetch("/api/briefing/post")
      .then((r) => r.json())
      .then((d) => setConnected(d.connected ?? {}))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const targets = PLATFORMS.filter((p) => connected[p.id] && (picked[p.id] ?? true)).map((p) => p.id);
  const anyConnected = PLATFORMS.some((p) => connected[p.id]);

  async function send() {
    if (!targets.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/briefing/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) });
      const d = (await r.json().catch(() => ({}))) as { delivered?: Record<string, string>; note?: string };
      const sent = Object.entries(d.delivered ?? {}).filter(([, v]) => v === "sent").map(([k]) => k);
      setMsg(sent.length ? { text: `Briefing sent to ${sent.join(", ")}.`, kind: "ok" } : { text: d.note || "Nothing was sent.", kind: "err" });
    } catch {
      setMsg({ text: "Couldn't send, try again.", kind: "err" });
    } finally {
      setBusy(false);
      load();
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px]" style={{ background: "var(--accent-soft)" }}>📨</span>
        <div className="mr-auto min-w-0">
          <div className="text-sm font-semibold text-ink">Deliver this briefing</div>
          <div className="text-[12px] text-faint">Post today&apos;s findings to the channels you pick.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PLATFORMS.map((p) => {
            const isConn = !!connected[p.id];
            if (!isConn) {
              return (
                <span
                  key={p.id}
                  title={`${p.name} not connected. ${p.howTo}`}
                  className="flex cursor-help items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium opacity-55"
                  style={{ border: "1px dashed var(--line-strong)", background: "var(--surface-2)", color: "var(--ink-faint)" }}
                >
                  <p.Logo className="h-4 w-4" />
                  {p.name}
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] font-bold" style={{ background: "var(--line)", color: "var(--ink-dim)" }} aria-hidden>i</span>
                </span>
              );
            }
            const on = picked[p.id] ?? true;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPicked((x) => ({ ...x, [p.id]: !(x[p.id] ?? true) }))}
                title={on ? `Sending to ${p.name}, click to skip` : `Skipping ${p.name}, click to include`}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium transition-colors"
                style={{ border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`, background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--accent-ink)" : "var(--ink-dim)" }}
              >
                <p.Logo className="h-4 w-4" />
                {p.name}
                <span aria-hidden>{on ? "✓" : "＋"}</span>
              </button>
            );
          })}
          <button type="button" className="btn-primary shrink-0" disabled={busy || targets.length === 0} onClick={send}>
            {busy ? "Sending…" : `Send${targets.length ? ` → ${targets.length}` : ""}`}
          </button>
        </div>
      </div>
      {!anyConnected && <p className="mt-2 text-[11px] text-faint">No channels connected, hover a greyed platform to see how, or open Sources.</p>}
      {msg && (
        <div className="mt-2 rounded-lg px-3 py-1.5 text-[12px]" style={{ background: msg.kind === "ok" ? "oklch(0.5 0.13 155 / 0.1)" : "color-mix(in oklab, var(--drift) 10%, transparent)", color: msg.kind === "ok" ? "oklch(0.45 0.13 155)" : "var(--drift)" }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
