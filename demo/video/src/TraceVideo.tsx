import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, FONT, MONO } from "./theme";
import { Captions, LoopRail, TraceMark, VoiceTrack } from "./components";
import { Soundtrack } from "./soundtrack";
import { S0ColdOpen, S1Thesis, S2TeamChat, S3UnderHood, S4Moneyshot, S5CompanyBrain, S6BusFactor, S7Close } from "./scenes";
import timeline from "./timeline.json";

const FPS = timeline.fps;
const fr = (sec: number) => Math.round(sec * FPS);

// contiguous scene ranges (seconds), aligned to the audio beats
const SCENES: { sec: [number, number]; C: React.FC<{ dur: number }> }[] = [
  { sec: [0, 11.3], C: S0ColdOpen },
  { sec: [11.3, 23.6], C: S1Thesis },
  { sec: [23.6, 52.3], C: S2TeamChat },
  { sec: [52.3, 68.43], C: S3UnderHood },
  { sec: [68.43, 77.16], C: S4Moneyshot },
  { sec: [77.16, 106.5], C: S5CompanyBrain },
  { sec: [106.5, 116.11], C: S6BusFactor },
  { sec: [116.11, timeline.totalSec], C: S7Close },
];

// which loop-rail station glows at time t
const SCHEDULE: [number, number][] = [
  [0, 4], [11.3, 0], [13, 1], [15, 2], [17, 3], [19.2, 4], [21, 5],
  [23.6, 4], [40, 2], [45, 4], [52.3, 1], [57, 2], [63, 2],
  [68.43, 4], [77.16, 0], [83, 2], [90, 4], [96, 2], [101, 4],
  [106.5, 3], [116.11, 0], [118, 1], [119.5, 2], [121, 3], [122.5, 4], [124, 5],
];
const activeStation = (frame: number) => {
  const t = frame / FPS;
  let s = 0;
  for (const [sec, st] of SCHEDULE) if (t >= sec) s = st;
  return s;
};

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {/* watermark — the real Trace logo */}
      <div style={{ position: "absolute", top: 30, left: 46, display: "flex", alignItems: "center", gap: 10, zIndex: 40 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "oklch(0.52 0.17 266 / 0.1)", boxShadow: "inset 0 0 0 1px oklch(0.52 0.17 266 / 0.22)" }}><TraceMark size={21} /></div>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.ink, letterSpacing: -0.3 }}>Trace</span>
      </div>
      <LoopRail active={activeStation(f)} />
      <Captions />
    </>
  );
};

export const TraceVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {SCENES.map((s, i) => {
        const from = fr(s.sec[0]);
        const dur = fr(s.sec[1]) - from;
        const Comp = s.C;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={`Beat ${i}`}>
            <Comp dur={dur} />
          </Sequence>
        );
      })}
      <Soundtrack />
      <VoiceTrack />
      <Overlay />
    </AbsoluteFill>
  );
};
