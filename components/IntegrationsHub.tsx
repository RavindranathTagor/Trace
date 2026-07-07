"use client";

import { useCallback, useEffect, useState } from "react";
import AddSource from "@/components/AddSource";
import { DiscordLogo, GitHubLogo, SlackLogo, TeamsLogo } from "@/components/Logos";
import { IllusConnect } from "@/components/Illustrations";
import BrainApiCard from "@/components/BrainApiCard";
import BrainContextCard from "@/components/BrainContextCard";

interface Status {
  discord: { configured: boolean; tokenHint?: string; channelId: string; inviteUrl: string | null; bot: { status: string; logs: string[]; lastError?: string } };
  github: { configured: boolean; tokenHint?: string; repo: string; publicUrl: string; webhookId: number | null };
  slack: { configured: boolean; mode: string | null; channel: string; webhookSet: boolean };
  teams: { configured: boolean; webhookSet: boolean };
}

async function jpost(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as Record<string, any> };
}

// Step-by-step setup shown in each tool's (i) tooltip, with an official doc link.
const STEPS: Record<string, { how: string[]; use: string; link: { url: string; label: string } }> = {
  discord: {
    link: { url: "https://discord.com/developers/applications", label: "Discord Developer Portal" },
    how: [
      "Open discord.com/developers → New Application → Bot.",
      "Reset & copy the Bot Token; enable “Message Content Intent”.",
      "Paste the token here and Connect.",
      "Click “Invite the bot” and pick your server.",
      "Set a Channel ID to ALSO receive briefings there (no webhook needed).",
      "Press “Start agent”, Trace backfills then watches live.",
    ],
    use: "Reads messages and replies in-thread on drift; @mention it to ask. The Channel ID doubles as the briefing target, leave blank to watch all channels but note briefings need one set.",
  },
  github: {
    link: { url: "https://github.com/settings/personal-access-tokens", label: "GitHub → Fine-grained tokens" },
    how: [
      "Create a fine-grained PAT (Pull requests: Read+Write) in GitHub settings.",
      "Enter the repo as owner/name.",
      "Paste your public URL (a Cloudflare/ngrok tunnel to this app).",
      "Connect, Trace auto-creates the webhook for you.",
    ],
    use: "Open a PR that reverses a past decision, Trace comments on it with the earlier call and who made it.",
  },
  slack: {
    link: { url: "https://api.slack.com/apps", label: "Slack → Your Apps" },
    how: [
      "TWO-WAY (replies to @mentions + drift): create a Slack app → OAuth & Permissions → add bot scopes chat:write + app_mentions:read → Install → copy the Bot Token (xoxb-…).",
      "Event Subscriptions → Request URL = https://<your-tunnel>/api/slack/events → subscribe to app_mention (and message.channels).",
      "Invite the bot to the channel, paste the bot token + Channel ID here → Connect two-way.",
      "POST-ONLY (briefings only): instead create an Incoming Webhook (api.slack.com/messaging/webhooks) and paste its URL.",
    ],
    use: "A webhook is POST-ONLY, it can push briefings but CANNOT reply to @mentions. For questions & drift replies you MUST use a bot token + Events API on a public tunnel.",
  },
  teams: {
    link: { url: "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook", label: "Teams → Add an Incoming Webhook" },
    how: [
      "In your Teams channel → ⋯ → Connectors → Incoming Webhook.",
      "Name it “Trace”, create, and copy the URL.",
      "Paste it here and Connect.",
    ],
    use: "That channel receives the morning briefing when you pick it in the Briefing page.",
  },
};

type Tab = "connect" | "brain";

export default function IntegrationsHub({ onIngested }: { onIngested: () => void }) {
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [tab, setTab] = useState<Tab>("connect");

  // form fields
  const [dToken, setDToken] = useState("");
  const [dChannel, setDChannel] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghUrl, setGhUrl] = useState("");
  const [ghRepos, setGhRepos] = useState<{ full_name: string; private: boolean }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [slHook, setSlHook] = useState("");
  const [slBot, setSlBot] = useState("");
  const [slChannel, setSlChannel] = useState("");
  const [teamsHook, setTeamsHook] = useState("");

  const load = useCallback(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    // Poll less often and pause when the tab is hidden: /api/integrations also runs a
    // bot-autostart check, so a 4s always-on poll was ~15 needless calls/min per tab.
    const t = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) load();
    }, 10000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (key: string, fn: () => Promise<{ ok: boolean; data: Record<string, any> }>, okText: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const { ok, data } = await fn();
      if (ok) setMsg({ text: okText, kind: "ok" });
      else setMsg({ text: data.error || "Something went wrong.", kind: "err" });
    } finally {
      setBusy(null);
      load();
    }
  };

  // Fetch the repos this PAT can access so the user can pick from a dropdown.
  const loadRepos = async () => {
    if (!ghToken.trim()) return;
    setLoadingRepos(true);
    setMsg(null);
    try {
      const { ok, data } = await jpost("/api/integrations/github/repos", { token: ghToken.trim() });
      const repos = (data.repos as { full_name: string; private: boolean }[]) || [];
      if (ok && repos.length) {
        setGhRepos(repos);
        if (!ghRepo) setGhRepo(repos[0].full_name);
      } else {
        setMsg({ text: ok ? "No repositories found for this token." : data.error || "Couldn't load repositories.", kind: "err" });
      }
    } finally {
      setLoadingRepos(false);
    }
  };

  const running = s?.discord.bot.status === "running";

  return (
    <div className="space-y-5">
      {/* Compact header + tabs so the page reads as two short views, not one long column */}
      <div className="card flex items-center gap-4 overflow-hidden p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink">Sources &amp; integrations</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-dim">
            Connect your team&apos;s tools and Trace builds memory + catches drift automatically. Tokens stay server-side.
          </p>
        </div>
        <IllusConnect className="hidden h-20 w-auto shrink-0 sm:block" />
      </div>

      <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        {([
          { id: "connect", label: "Channels, repos & files" },
          { id: "brain", label: "Company Brain API" },
        ] as const).map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors"
              style={{ background: on ? "var(--surface)" : "transparent", color: on ? "var(--ink)" : "var(--ink-dim)", boxShadow: on ? "var(--shadow-sm)" : "none" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <div className="rounded-lg px-3 py-2 text-[13px]" style={{ background: msg.kind === "ok" ? "oklch(0.5 0.13 155 / 0.1)" : "color-mix(in oklab, var(--drift) 10%, transparent)", color: msg.kind === "ok" ? "oklch(0.45 0.13 155)" : "var(--drift)" }}>
          {msg.text}
        </div>
      )}

      {tab === "brain" ? (
        <div className="space-y-5">
          {/* Company Brain API, the agent-facing endpoint, live and demoable */}
          <BrainApiCard />
          {/* Pre-code context pack, what every coding agent gets before it writes code */}
          <BrainContextCard />
        </div>
      ) : (
      <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] text-dim" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <IconTip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <span>New here? Hover the <InfoDot /> on any tool for step-by-step setup. Two-way agents (Discord, GitHub) catch drift live; Slack &amp; Teams receive briefings.</span>
      </p>

      {/* Connect your tools, 2-up grid so it reads as a set, not a long column */}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">Channels &amp; repos</div>
      <div className="grid gap-4 sm:grid-cols-2">
      {/* Discord */}
      <Card logo={<DiscordLogo className="h-6 w-6" />} name="Discord" info={STEPS.discord} connected={!!s?.discord.configured} status={running ? "Agent running" : s?.discord.configured ? "Connected · agent stopped" : undefined}>
        {s?.discord.configured ? (
          <div className="space-y-2.5">
            <Row label="Bot token" value={s.discord.tokenHint ?? "saved"} />
            {s.discord.inviteUrl && (
              <a href={s.discord.inviteUrl} target="_blank" rel="noopener noreferrer" className="btn w-full justify-center">
                Invite the bot to your server →
              </a>
            )}
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Channel ID, watched + briefing target (blank = all)" value={dChannel || s.discord.channelId} onChange={(e) => setDChannel(e.target.value)} />
              <button type="button" className="btn shrink-0" disabled={busy === "d"} onClick={() => run("d", () => jpost("/api/integrations/discord", { channelId: dChannel || s.discord.channelId || "" }), "Channel saved, briefings will post here (no webhook needed).")}>
                Save
              </button>
            </div>
            <p className="text-[11px] text-faint">The channel ID is where briefings post, no webhook needed for Discord.</p>
            <div className="flex gap-2">
              {running ? (
                <button type="button" className="btn flex-1" disabled={busy === "d"} onClick={() => run("d", () => jpost("/api/integrations/discord", { channelId: dChannel || s.discord.channelId, action: "stop" }), "Agent stopped.")}>
                  Stop agent
                </button>
              ) : (
                <button type="button" className="btn-primary flex-1" disabled={busy === "d"} onClick={() => run("d", () => jpost("/api/integrations/discord", { channelId: dChannel || s.discord.channelId, action: "start" }), "Agent started, backfilling & watching.")}>
                  {busy === "d" ? "Starting…" : "Start agent"}
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={() => run("d", () => jpost("/api/integrations/discord", undefined, "DELETE"), "Disconnected.")}>
                Disconnect
              </button>
            </div>
            {s.discord.bot.lastError && (
              <p className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--drift)" }}>
                <IconWarn className="mt-0.5 h-3 w-3 shrink-0" /> {s.discord.bot.lastError}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[12px] text-faint">
              Create a bot at{" "}
              <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">discord.com/developers</a>, enable the Message Content Intent, and paste its token.
            </p>
            <input className="input" placeholder="Discord bot token" value={dToken} onChange={(e) => setDToken(e.target.value)} />
            <button type="button" className="btn-primary w-full" disabled={busy === "d" || !dToken.trim()} onClick={() => run("d", () => jpost("/api/integrations/discord", { token: dToken.trim(), channelId: dChannel.trim() }), "Connected, now invite the bot to your server.")}>
              {busy === "d" ? "Connecting…" : "Connect Discord"}
            </button>
          </div>
        )}
      </Card>

      {/* GitHub */}
      <Card logo={<GitHubLogo className="h-6 w-6" />} name="GitHub" info={STEPS.github} connected={!!s?.github.configured} status={s?.github.configured ? `Watching ${s.github.repo}` : undefined}>
        {s?.github.configured ? (
          <div className="space-y-2.5">
            <Row label="Repo" value={s.github.repo} />
            <Row label="Webhook" value={s.github.webhookId ? `#${s.github.webhookId} · auto-created` : "-"} />
            <button type="button" className="btn-ghost" onClick={() => run("gh", () => jpost("/api/integrations/github", undefined, "DELETE"), "Disconnected & webhook removed.")}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[12px] text-faint">
              A fine-grained token (Pull requests: read+write) from{" "}
              <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub settings</a>. Trace creates the webhook for you.
            </p>
            <input className="input" placeholder="GitHub token (github_pat_… or ghp_…)" value={ghToken} onChange={(e) => setGhToken(e.target.value)} />

            {/* Repo: pick from a dropdown of the token's repos, or type it manually. */}
            {ghRepos.length > 0 ? (
              <div className="flex gap-2">
                <select className="input flex-1" aria-label="Repository to watch" title="Repository to watch" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)}>
                  <option value="" disabled>Select a repository…</option>
                  {ghRepos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>{r.full_name}{r.private ? " (private)" : ""}</option>
                  ))}
                </select>
                <button type="button" className="btn shrink-0" title="Type the repo manually instead" onClick={() => setGhRepos([])}>Type</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Repo, owner/name" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} />
                <button type="button" className="btn shrink-0" disabled={!ghToken.trim() || loadingRepos} title="List repositories this token can access" onClick={loadRepos}>
                  {loadingRepos ? "Loading…" : "Load my repos"}
                </button>
              </div>
            )}

            <input className="input" placeholder="Public URL (your tunnel, https://…)" value={ghUrl} onChange={(e) => setGhUrl(e.target.value)} />
            <button type="button" className="btn-primary w-full" disabled={busy === "gh" || !ghToken.trim() || !ghRepo.trim() || !ghUrl.trim()} onClick={() => run("gh", () => jpost("/api/integrations/github", { token: ghToken.trim(), repo: ghRepo.trim(), publicUrl: ghUrl.trim() }), "Connected, webhook created. Open a PR to test.")}>
              {busy === "gh" ? "Creating webhook…" : "Connect GitHub"}
            </button>
          </div>
        )}
      </Card>

      {/* Slack */}
      <Card logo={<SlackLogo className="h-6 w-6" />} name="Slack" info={STEPS.slack} connected={!!s?.slack.configured} status={s?.slack.configured ? `Connected · ${s.slack.mode}` : undefined}>
        {s?.slack.configured ? (
          <div className="space-y-2.5">
            <Row label="Mode" value={s.slack.mode === "two-way" ? "Two-way · replies + briefings" : "Post-only · briefings"} />
            {s.slack.mode !== "two-way" && (
              <div className="space-y-2 rounded-lg p-2.5" style={{ background: "color-mix(in oklab, var(--signal) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--signal) 30%, transparent)" }}>
                <p className="text-[12px] text-dim">
                  <span className="font-semibold text-ink">Want @mention replies?</span> A webhook is post-only, it can&apos;t reply. Add a bot token + channel for two-way.
                </p>
                <input className="input" placeholder="Bot token (xoxb-…)" value={slBot} onChange={(e) => setSlBot(e.target.value)} />
                <input className="input" placeholder="Channel ID (e.g. C0123ABC)" value={slChannel} onChange={(e) => setSlChannel(e.target.value)} />
                <button type="button" className="btn-primary w-full" disabled={busy === "sl" || !slBot.trim() || !slChannel.trim()} onClick={() => run("sl", () => jpost("/api/integrations/slack", { botToken: slBot.trim(), channel: slChannel.trim() }), "Two-way enabled, mention the bot to test.")}>
                  {busy === "sl" ? "Enabling…" : "Enable two-way"}
                </button>
              </div>
            )}
            <button type="button" className="btn-ghost" onClick={() => run("sl", () => jpost("/api/integrations/slack", undefined, "DELETE"), "Disconnected.")}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-ink">Two-way, reply to @mentions + drift + briefings</p>
              <input className="input" placeholder="Bot token (xoxb-…)" value={slBot} onChange={(e) => setSlBot(e.target.value)} />
              <input className="input" placeholder="Channel ID (e.g. C0123ABC)" value={slChannel} onChange={(e) => setSlChannel(e.target.value)} />
              <button type="button" className="btn-primary w-full" disabled={busy === "sl" || !slBot.trim() || !slChannel.trim()} onClick={() => run("sl", () => jpost("/api/integrations/slack", { botToken: slBot.trim(), channel: slChannel.trim() }), "Slack connected (two-way). Point the Events API at /api/slack/events.")}>
                {busy === "sl" ? "Connecting…" : "Connect two-way"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-faint">
              <span className="h-px flex-1" style={{ background: "var(--line)" }} /> or post-only <span className="h-px flex-1" style={{ background: "var(--line)" }} />
            </div>
            <div className="space-y-2">
              <input className="input" placeholder="Incoming Webhook URL (https://hooks.slack.com/…)" value={slHook} onChange={(e) => setSlHook(e.target.value)} />
              <button type="button" className="btn w-full justify-center" disabled={busy === "sl" || !slHook.trim()} onClick={() => run("sl", () => jpost("/api/integrations/slack", { webhookUrl: slHook.trim() }), "Slack connected (post-only briefings).")}>
                {busy === "sl" ? "Connecting…" : "Connect post-only"}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Teams */}
      <Card logo={<TeamsLogo className="h-6 w-6" />} name="Microsoft Teams" info={STEPS.teams} connected={!!s?.teams.configured} status={s?.teams.configured ? "Connected · briefings on" : undefined}>
        {s?.teams.configured ? (
          <button type="button" className="btn-ghost" onClick={() => run("tm", () => jpost("/api/integrations/teams", undefined, "DELETE"), "Disconnected.")}>
            Disconnect
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[12px] text-faint">Add an Incoming Webhook to a Teams channel and paste its URL to receive briefings.</p>
            <input className="input" placeholder="https://…webhook.office.com/…" value={teamsHook} onChange={(e) => setTeamsHook(e.target.value)} />
            <button type="button" className="btn-primary w-full" disabled={busy === "tm" || !teamsHook.trim()} onClick={() => run("tm", () => jpost("/api/integrations/teams", { webhookUrl: teamsHook.trim() }), "Teams connected.")}>
              {busy === "tm" ? "Connecting…" : "Connect Teams"}
            </button>
          </div>
        )}
      </Card>
      </div>

      {/* Files */}
      <div className="card p-5">
        <AddSource onIngested={onIngested} />
      </div>
      </div>
      )}
    </div>
  );
}

function Card({ logo, name, connected, status, info, children }: { logo: React.ReactNode; name: string; connected: boolean; status?: string; info?: StepInfo; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>{logo}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-semibold text-ink">{name}</div>
            {info && <InfoTip title={`How to connect ${name}`} info={info} />}
          </div>
          {status && <div className="truncate text-[12px] text-dim">{status}</div>}
        </div>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={connected ? { color: "oklch(0.45 0.13 155)", background: "oklch(0.5 0.13 155 / 0.1)" } : { color: "var(--ink-faint)", background: "var(--surface-2)" }}>
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      {children}
    </div>
  );
}

const IconTip = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.1V16h6v-.4c0-.8.4-1.5 1-2.1A6 6 0 0 0 12 3z" />
  </svg>
);
const IconWarn = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" />
  </svg>
);
const IconDoc = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" />
  </svg>
);

/** The little "i" glyph (also used inline in the intro line). */
function InfoDot() {
  return (
    <span className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }} aria-hidden>
      i
    </span>
  );
}

interface StepInfo {
  how: string[];
  use: string;
  link?: { url: string; label: string };
}

/** Hover/focus tooltip with numbered setup steps, a "what you get" line, and a
 *  clickable official setup link. Click the “i” to pin it open (focus-within), so
 *  the link is reliably clickable. */
function InfoTip({ title, info }: { title: string; info: StepInfo }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold transition-transform hover:scale-110"
        style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
        aria-label={title}
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-5 z-20 w-64 -translate-x-1/4 rounded-xl p-3 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)" }}
      >
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-accent">{title}</span>
        <ol className="space-y-1.5">
          {info.how.map((step, i) => (
            <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug text-dim">
              <span className="shrink-0 font-semibold text-accent-ink">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <span className="mt-2 block border-t pt-2 text-[11.5px] leading-snug text-faint" style={{ borderColor: "var(--line)" }}>
          {info.use}
        </span>
        {info.link && (
          <a
            href={info.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            <IconDoc className="h-3.5 w-3.5" /> {info.link.label} →
          </a>
        )}
      </span>
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-faint">{label}</span>
      <span className="font-mono text-dim">{value}</span>
    </div>
  );
}
