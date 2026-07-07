"use client";

import { useState } from "react";
import AskPanel from "@/components/AskPanel";
import VoiceAgent from "@/components/VoiceAgent";
import type { GraphNode } from "@/lib/types";

const IconType = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
    <path d="M4 7h16M4 12h10M4 17h7" />
  </svg>
);
const IconVoice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

interface AskTalkProps {
  onHighlight: (ids: string[]) => void;
  graphNodes: GraphNode[];
}

type Mode = "text" | "voice";

/** One page for querying the memory, type a question or ask by voice. Voice is the
 *  secondary, optional path (needs an ElevenLabs agent), so text is the default. */
export default function AskTalk({ onHighlight, graphNodes }: AskTalkProps) {
  const [mode, setMode] = useState<Mode>("text");

  return (
    <div className="flex h-full flex-col">
      {/* Segmented text / voice switch */}
      <div className="mb-4 flex items-center justify-center">
        <div className="inline-flex rounded-full p-0.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          {([
            { id: "text", label: "Type", icon: <IconType /> },
            { id: "voice", label: "Voice", icon: <IconVoice /> },
          ] as const).map((t) => {
            const on = mode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: on ? "var(--accent)" : "transparent",
                  color: on ? "#fff" : "var(--ink-dim)",
                }}
                title={t.id === "voice" ? "Ask by voice" : "Ask by typing"}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {mode === "text" ? (
          <AskPanel onHighlight={onHighlight} graphNodes={graphNodes} />
        ) : (
          <VoiceAgent onHighlight={onHighlight} graphNodes={graphNodes} />
        )}
      </div>
    </div>
  );
}
