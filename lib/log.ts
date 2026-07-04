// Minimal dependency-free structured logger. Emits one JSON line per event so
// logs are grep-able and ingestible by any aggregator (Datadog, Loki, CloudWatch)
// without a library. Swap `emit` for pino/winston later without touching callers.
//
// Usage: log.info("ingest.flush", { count: batch.length })
//        log.error("cognee.search", { err: msg })

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, event: string, ctx?: Record<string, unknown>): void {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...(ctx ?? {}) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, ctx?: Record<string, unknown>) => emit("debug", event, ctx),
  info: (event: string, ctx?: Record<string, unknown>) => emit("info", event, ctx),
  warn: (event: string, ctx?: Record<string, unknown>) => emit("warn", event, ctx),
  error: (event: string, ctx?: Record<string, unknown>) => emit("error", event, ctx),
};
