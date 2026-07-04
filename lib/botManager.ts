// Runs the Discord agent (adapters/discord-bot.mjs) as a child process, started
// and stopped from the Integrations UI — no terminal or env editing required.
// State is globalThis-backed so every API route sees the same process.
//
// Supervised: an unexpected crash is auto-restarted with exponential backoff (up
// to MAX_RESTARTS), so a transient Discord/network blip doesn't silently take the
// agent offline until someone notices in the UI. A manual Stop disables restarts.

import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { getIntegrations } from "@/lib/integrations";

export type BotStatus = "stopped" | "starting" | "running" | "error";

const MAX_RESTARTS = 5;
const restartDelayMs = (n: number) => Math.min(30_000, 1000 * 2 ** n); // 2s,4s,8s,16s,30s

interface BotState {
  child: ChildProcess | null;
  status: BotStatus;
  logs: string[];
  startedAt?: number;
  lastError?: string;
  restarts: number;
  intentionalStop: boolean;
  restartTimer: ReturnType<typeof setTimeout> | null;
  lastAutoStart?: number;
}

const g = globalThis as unknown as { __traceBot?: BotState };
const state = (g.__traceBot ??= {
  child: null,
  status: "stopped",
  logs: [],
  restarts: 0,
  intentionalStop: false,
  restartTimer: null,
});

function log(line: string) {
  const clean = line.trim();
  if (!clean) return;
  state.logs.push(clean.slice(0, 300));
  if (state.logs.length > 40) state.logs.splice(0, state.logs.length - 40);
}

export function botStatus(): { status: BotStatus; logs: string[]; startedAt?: number; lastError?: string; restarts: number } {
  return { status: state.status, logs: state.logs.slice(-6), startedAt: state.startedAt, lastError: state.lastError, restarts: state.restarts };
}

/** Spawn the child process using the currently-saved Discord config. */
function spawnChild(): { ok: boolean; error?: string } {
  const { discord } = getIntegrations();
  if (!discord.token) return { ok: false, error: "No Discord bot token saved." };

  state.status = "starting";
  state.startedAt = Date.now();

  const script = join(process.cwd(), "adapters", "discord-bot.mjs");
  const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
  const child = spawn(process.execPath, [script], {
    cwd: join(process.cwd(), "adapters"),
    env: {
      ...process.env,
      DISCORD_BOT_TOKEN: discord.token,
      DISCORD_CHANNEL_ID: discord.channelId ?? "",
      // TRACE_BASE_URL is the current name; HINDSIGHT_BASE_URL kept for backward compat.
      TRACE_BASE_URL: baseUrl,
      HINDSIGHT_BASE_URL: baseUrl,
      BACKFILL_ON_START: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  state.child = child;

  child.stdout?.on("data", (d: Buffer) => {
    const text = d.toString();
    text.split("\n").forEach(log);
    if (/ready as/i.test(text)) {
      state.status = "running";
      state.restarts = 0; // a clean connection resets the backoff budget
    }
  });
  child.stderr?.on("data", (d: Buffer) => d.toString().split("\n").forEach(log));
  child.on("exit", (code) => {
    state.child = null;
    if (state.intentionalStop) {
      state.status = "stopped";
      return;
    }
    if (code === 0) {
      state.status = "stopped";
      return;
    }
    // Unexpected crash → supervise with backoff.
    state.lastError = state.logs.slice(-2).join(" · ") || `exited with code ${code}`;
    if (state.restarts >= MAX_RESTARTS) {
      state.status = "error";
      log(`[supervisor] giving up after ${MAX_RESTARTS} restarts`);
      return;
    }
    const delay = restartDelayMs(state.restarts);
    state.restarts += 1;
    state.status = "starting";
    log(`[supervisor] restarting in ${Math.round(delay / 1000)}s (attempt ${state.restarts}/${MAX_RESTARTS})`);
    state.restartTimer = setTimeout(() => {
      if (!state.intentionalStop) spawnChild();
    }, delay);
  });
  child.on("error", (err) => {
    state.status = "error";
    state.lastError = err.message;
    state.child = null;
  });
  return { ok: true };
}

export function startBot(): { ok: boolean; error?: string } {
  const { discord } = getIntegrations();
  if (!discord.token) return { ok: false, error: "No Discord bot token saved." };
  if (state.child && state.status !== "stopped" && state.status !== "error") {
    return { ok: true }; // already running
  }
  state.logs = [];
  state.lastError = undefined;
  state.restarts = 0;
  state.intentionalStop = false;
  return spawnChild();
}

/** Re-spawn the bot on server boot if the user had it running (integrations
 *  autoStart flag) but the child is gone — a dev-server restart kills the child,
 *  so this makes the agent self-heal. Called from the polled /api/integrations GET.
 *  Only acts from a clean "stopped" state, with a cooldown so it never storms. */
export function maybeAutoStart(): void {
  const { discord } = getIntegrations();
  if (!discord.token || !discord.autoStart) return;
  if (state.status !== "stopped" || state.child) return;
  if (state.lastAutoStart && Date.now() - state.lastAutoStart < 15_000) return;
  state.lastAutoStart = Date.now();
  startBot();
}

export function stopBot(): void {
  state.intentionalStop = true; // disable the supervisor before killing
  if (state.restartTimer) {
    clearTimeout(state.restartTimer);
    state.restartTimer = null;
  }
  if (state.child) {
    try {
      state.child.kill();
    } catch {
      /* already gone */
    }
  }
  state.child = null;
  state.status = "stopped";
}
