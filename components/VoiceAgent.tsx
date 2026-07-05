"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversation,
  useConversationClientTool,
} from "@elevenlabs/react";
import Avatar from "@/components/Avatar";
import type { GraphNode, RecallResult } from "@/lib/types";
import { combineHighlights, nodeIdsInText } from "@/lib/highlight";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

interface VoiceAgentProps {
  onHighlight: (ids: string[]) => void;
  graphNodes: GraphNode[];
}

interface Activity {
  id: number;
  q: string;
  a: string | null;
}

// Public wrapper: the provider must wrap any component using the conversation hooks.
export default function VoiceAgent(props: VoiceAgentProps) {
  return (
    <ConversationProvider>
      <VoiceInner {...props} />
    </ConversationProvider>
  );
}

function VoiceInner({ onHighlight, graphNodes }: VoiceAgentProps) {
  const conversation = useConversation({
    onError: (message) => console.error("[voice] error:", message),
  });
  const { status, isSpeaking, message } = conversation;
  const connected = status === "connected";

  const [activity, setActivity] = useState<Activity[]>([]);
  const counter = useRef(0);

  // Speech-synced "chain" reveal — light matched nodes one-by-one WHILE the agent
  // speaks, then reveal the rest when it stops. A steady ticker drives it so it
  // works regardless of exactly when isSpeaking toggles.
  const pendingRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const startedRef = useRef(false);
  const speakingRef = useRef(false);
  const onHighlightRef = useRef(onHighlight);
  useEffect(() => {
    onHighlightRef.current = onHighlight;
  }, [onHighlight]);
  useEffect(() => {
    speakingRef.current = isSpeaking;
    if (isSpeaking) startedRef.current = true;
  }, [isSpeaking]);
  useEffect(() => {
    const tick = setInterval(() => {
      const pend = pendingRef.current;
      if (!pend.length) return;
      if (speakingRef.current) {
        if (idxRef.current < pend.length) {
          idxRef.current += 1;
          onHighlightRef.current(pend.slice(0, idxRef.current));
        }
      } else if (startedRef.current && idxRef.current > 0 && idxRef.current < pend.length) {
        idxRef.current = pend.length; // speech ended early -> reveal the rest
        onHighlightRef.current(pend.slice());
      }
    }, 450);
    return () => clearInterval(tick);
  }, []);

  // Tool 1: the agent's memory lookup. Runs in-browser -> hits local Cognee,
  // highlights the entities it mentions, logs to the activity panel + console,
  // and returns the context for the agent LLM to speak (only_context => no extra hop).
  useConversationClientTool("searchTeamMemory", async (params) => {
    const query = String((params as { query?: string }).query ?? "");
    const id = ++counter.current;
    // eslint-disable-next-line no-console
    console.log("[Trace] 🔍 searchTeamMemory →", query);
    setActivity((a) => [{ id, q: query, a: null }, ...a].slice(0, 6));
    try {
      const res = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, onlyContext: true }),
      });
      const data = (await res.json()) as RecallResult;
      // eslint-disable-next-line no-console
      console.log("[Trace] ✅ Cognee returned", data);
      const text = `${data.context ?? ""} ${data.answer ?? ""}`;
      const ids = combineHighlights(data.nodeIds, nodeIdsInText(graphNodes, text));
      // queue the chain; the ticker above reveals it as the agent speaks
      pendingRef.current = ids;
      idxRef.current = 0;
      startedRef.current = false;
      onHighlight([]);
      // safety net: if the agent never actually speaks, reveal anyway shortly after
      setTimeout(() => {
        if (!startedRef.current && pendingRef.current === ids) onHighlightRef.current(ids);
      }, 2500);
      const snippet = (data.context || data.answer || "(no match)").slice(0, 140);
      setActivity((a) => a.map((e) => (e.id === id ? { ...e, a: snippet } : e)));
      return data.context || data.answer || "No relevant team memory found.";
    } catch {
      setActivity((a) => a.map((e) => (e.id === id ? { ...e, a: "memory unavailable" } : e)));
      return "The team memory service is unavailable right now.";
    }
  });

  // Tool 2: optional explicit highlight (the agent may call it directly).
  useConversationClientTool("highlightSubgraph", (params) => {
    const nodeIds = (params as { nodeIds?: string | string[] }).nodeIds;
    const ids = Array.isArray(nodeIds)
      ? nodeIds
      : String(nodeIds ?? "")
          .split(/[,\s]+/)
          .filter(Boolean);
    onHighlight(ids);
  });

  function start() {
    if (!AGENT_ID) return;
    conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Talk to your memory</span>
        <StatusPill status={status} />
      </div>

      <div className="flex items-center gap-4">
        <Avatar getFreq={conversation.getOutputByteFrequencyData} active={connected} speaking={isSpeaking} />
        <div className="flex-1">
          {!AGENT_ID ? (
            <p className="text-xs" style={{ color: "oklch(0.55 0.13 66)" }}>
              Set <code className="font-mono">NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code> to enable the voice agent.
            </p>
          ) : connected ? (
            <button type="button" onClick={() => conversation.endSession()} className="btn w-full">
              End conversation
            </button>
          ) : (
            <button type="button" onClick={start} className="btn-primary w-full">
              {status === "connecting" ? "Connecting…" : "Start talking"}
            </button>
          )}
          <p className="mt-2 text-[11px] leading-snug text-faint">
            {status === "error" ? (
              <span style={{ color: "var(--drift)" }}>{message || "Voice connection failed."}</span>
            ) : isSpeaking ? (
              "Trace is answering — watch the graph light up."
            ) : (
              "Ask: “What changed about pricing since Q1?”"
            )}
          </p>
        </div>
      </div>

      {/* Real-time proof that Cognee is being queried as the agent talks. */}
      {activity.length > 0 && (
        <div className="mt-3 space-y-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="text-[10px] uppercase tracking-wide text-faint">Cognee memory · live</div>
          {activity.map((e) => (
            <div key={e.id} className="rounded-lg p-2 text-xs" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <div className="flex items-center gap-1.5 text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" />
                </svg>
                <span className="truncate">{e.q}</span>
              </div>
              <div className="mt-1 text-dim">
                {e.a === null ? <span className="text-faint">searching the graph…</span> : `→ ${e.a}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; h: number }> = {
    connected: { c: "155", h: 0.5 },
    connecting: { c: "66", h: 0.55 },
    error: { c: "27", h: 0.55 },
    disconnected: { c: "265", h: 0.55 },
  };
  const m = map[status] ?? map.disconnected;
  const color = `oklch(${m.h} ${status === "disconnected" ? 0.02 : 0.13} ${m.c})`;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase"
      style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)` }}
    >
      {status}
    </span>
  );
}
