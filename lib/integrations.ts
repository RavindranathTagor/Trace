// Frontend-configurable integrations (Discord / GitHub / Slack), persisted to a
// gitignored JSON file so a restart keeps connections. Tokens stay server-side -
// the GET API only ever returns redacted hints (last 4 chars).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface IntegrationsConfig {
  // autoStart: the user pressed "Start agent", so re-spawn the bot on server boot
  // (a dev-server restart kills the child process; this makes it self-heal).
  discord: { token?: string; channelId?: string; autoStart?: boolean };
  github: { token?: string; repo?: string; publicUrl?: string; secret?: string; webhookId?: number };
  // Slack: bot token + channel for two-way (events + post), OR just an incoming
  // webhook URL for post-only. Teams: an incoming webhook URL (post-only).
  slack: { botToken?: string; channel?: string; webhookUrl?: string };
  teams: { webhookUrl?: string };
}

const FILE = join(process.cwd(), "data", "integrations.json");

const EMPTY: IntegrationsConfig = { discord: {}, github: {}, slack: {}, teams: {} };

// globalThis-backed cache (shared across route bundles), backed by the JSON file.
const g = globalThis as unknown as { __traceIntegrations?: IntegrationsConfig };

function load(): IntegrationsConfig {
  if (g.__traceIntegrations) return g.__traceIntegrations;
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf-8")) as Partial<IntegrationsConfig>;
    g.__traceIntegrations = {
      ...EMPTY,
      ...raw,
      discord: { ...raw.discord },
      github: { ...raw.github },
      slack: { ...raw.slack },
      teams: { ...raw.teams },
    };
  } catch {
    g.__traceIntegrations = structuredClone(EMPTY);
  }
  return g.__traceIntegrations;
}

export function getIntegrations(): IntegrationsConfig {
  return load();
}

export function saveIntegrations(patch: Partial<IntegrationsConfig>): IntegrationsConfig {
  const cur = load();
  const next: IntegrationsConfig = {
    discord: { ...cur.discord, ...patch.discord },
    github: { ...cur.github, ...patch.github },
    slack: { ...cur.slack, ...patch.slack },
    teams: { ...cur.teams, ...patch.teams },
  };
  g.__traceIntegrations = next;
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    console.error("[integrations] persist failed:", err instanceof Error ? err.message : err);
  }
  return next;
}

export const hint = (secret?: string): string | undefined =>
  secret ? `••••${secret.slice(-4)}` : undefined;
