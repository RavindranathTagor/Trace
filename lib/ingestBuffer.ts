// Debounced ingestion: buffer incoming chat messages and run add+cognify in a
// batch (never cognify per message — it's the expensive LLM step).
//
// Hardened against two failure modes:
//   - Starvation: a steady stream faster than DEBOUNCE_MS would keep re-arming
//     the timer forever, so we force-flush on a size cap or an age cap.
//   - Overlap: flush() is serialized via the `cognifying` flag; work that
//     arrives mid-flush is drained by a follow-up flush, not a concurrent one.

import { add, cognify } from "@/lib/cognee";

const DEBOUNCE_MS = 4000;
const MAX_BUFFER = 20; // force a flush once this many messages are queued
const MAX_AGE_MS = 15000; // force a flush if the oldest item is older than this
const RETRY_MS = 5000; // re-arm a flush after a failed `add` so the batch isn't stranded

// globalThis-backed: /api/ingest AND /api/ingest-file both write here from
// separate route bundles — module-level state would give each its own buffer,
// breaking the debounce and the cognify serialization guard.
interface BufferState {
  buffer: string[];
  timer: ReturnType<typeof setTimeout> | null;
  firstEnqueuedAt: number;
  cognifying: boolean;
  pending: boolean; // work arrived while a flush was in flight
  addFailures: number; // consecutive add failures → exponential backoff (Cloud outage)
}
const g = globalThis as unknown as { __traceIngestBuffer?: BufferState };
const s = (g.__traceIngestBuffer ??= { buffer: [], timer: null, firstEnqueuedAt: 0, cognifying: false, pending: false, addFailures: 0 });

export interface IngestStatus {
  buffered: number;
  cognifying: boolean;
}

export function enqueueIngest(texts: string[]): void {
  const clean = texts.filter((t) => t.trim().length > 0);
  if (clean.length === 0) return;
  if (s.buffer.length === 0) s.firstEnqueuedAt = Date.now();
  s.buffer.push(...clean);

  const tooOld = Date.now() - s.firstEnqueuedAt >= MAX_AGE_MS;
  if (s.buffer.length >= MAX_BUFFER || tooOld) {
    void flush();
    return;
  }
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => void flush(), DEBOUNCE_MS);
}

export async function flush(): Promise<void> {
  if (s.timer) {
    clearTimeout(s.timer);
    s.timer = null;
  }
  // Serialize: if a flush is already running, mark pending and let it re-drain.
  if (s.cognifying) {
    s.pending = true;
    return;
  }
  const batch = s.buffer;
  s.buffer = [];
  if (batch.length === 0) return;

  s.cognifying = true;
  try {
    // If `add` fails (network blip), put the batch back AND re-arm a timer so it
    // is retried automatically — otherwise, on a quiet channel with no further
    // enqueues, the re-queued batch would be stranded until the next message.
    try {
      await add(batch);
      s.addFailures = 0; // reachable again
    } catch (err) {
      s.buffer.unshift(...batch);
      s.addFailures += 1;
      // Exponential backoff during an outage (5s, 10s, 20s, 40s, cap 60s) so we don't
      // hammer a down Cloud or spam logs; log only the first failure + then every 5th.
      const delay = Math.min(60_000, RETRY_MS * 2 ** (s.addFailures - 1));
      if (s.addFailures === 1 || s.addFailures % 5 === 0) {
        console.warn(`[ingestBuffer] add failed (x${s.addFailures}), retrying in ${delay / 1000}s:`, err instanceof Error ? err.message : err);
      }
      // `finally` clears `cognifying`; re-arm a timer so the retry actually fires.
      if (s.timer) clearTimeout(s.timer);
      s.timer = setTimeout(() => void flush(), delay);
      return;
    }
    // `add` succeeded (chunks are stored). Build the graph; retry once on a
    // transient failure (e.g. a rare rate-limit) so the data becomes queryable.
    try {
      await cognify();
    } catch (err) {
      console.warn("[ingestBuffer] cognify failed, retrying once:", err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 3000));
      try {
        await cognify();
      } catch (err2) {
        // Chunks are still stored, so the NEXT successful cognify will pick them
        // up — the data is not lost, just not yet in the graph.
        console.error("[ingestBuffer] cognify retry failed:", err2 instanceof Error ? err2.message : err2);
      }
    }
  } finally {
    s.cognifying = false;
  }

  // Drain anything that arrived during this flush.
  if (s.pending || s.buffer.length > 0) {
    s.pending = false;
    await flush();
  }
}

export function ingestStatus(): IngestStatus {
  return { buffered: s.buffer.length, cognifying: s.cognifying };
}
