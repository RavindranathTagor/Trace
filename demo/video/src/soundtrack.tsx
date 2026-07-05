import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import timeline from "./timeline.json";

// Multi-voice team dialogue — placed a hair after each chat bubble appears.
// Volumes keep the narrator VO primary; team plays like layered radio-drama chatter.
const DIALOGUE: { id: string; frame: number; vol: number }[] = [
  { id: "k0", frame: 14, vol: 0.85 },
  { id: "priya_q1", frame: 160, vol: 0.6 }, // the cited Q1 decision, as a flashback voice
  { id: "k1", frame: 728, vol: 0.55 },
  { id: "r1", frame: 753, vol: 0.55 },
  { id: "k2", frame: 780, vol: 0.55 },
  { id: "kask", frame: 962, vol: 0.8 },
  { id: "trace1", frame: 1014, vol: 0.72 },
  { id: "m1", frame: 1214, vol: 0.7 },
  { id: "s1", frame: 1272, vol: 0.7 },
];

// SFX — { file, frame, vol }
const SFX: { file: string; frame: number; vol: number }[] = [
  { file: "heartbeat", frame: 62, vol: 0.4 },
  { file: "heartbeat", frame: 95, vol: 0.4 },
  { file: "bass", frame: 150, vol: 0.6 },
  { file: "chime", frame: 152, vol: 0.55 }, { file: "stamp", frame: 154, vol: 0.5 },
  // scene-transition whooshes
  ...[339, 708, 1569, 2053, 2315, 3195, 3483].map((frame) => ({ file: "whoosh", frame, vol: 0.4 })),
  // S2 catch cards
  { file: "chime", frame: 820, vol: 0.5 }, { file: "stamp", frame: 822, vol: 0.45 },
  { file: "chime", frame: 860, vol: 0.5 }, { file: "stamp", frame: 862, vol: 0.45 },
  { file: "chime", frame: 900, vol: 0.5 }, { file: "stamp", frame: 902, vol: 0.45 },
  { file: "chime", frame: 1012, vol: 0.5 }, // trace answers
  // S4 moneyshot — comment lands
  { file: "thunk", frame: 2183, vol: 0.65 }, { file: "chime", frame: 2186, vol: 0.5 }, { file: "stamp", frame: 2188, vol: 0.5 },
  // S5 conflict
  { file: "chime", frame: 2545, vol: 0.5 }, { file: "stamp", frame: 2547, vol: 0.45 },
];

export const Soundtrack: React.FC = () => (
  <>
    {/* 124-BPM synthwave music bed, low under everything */}
    <Audio src={staticFile("audio/music/bed.mp3")} volume={0.14} />
    {DIALOGUE.map((d, i) => (
      <Sequence key={`d${i}`} from={d.frame} durationInFrames={timeline.totalFrames - d.frame} name={`voice:${d.id}`}>
        <Audio src={staticFile(`audio/dialogue/${d.id}.mp3`)} volume={d.vol} />
      </Sequence>
    ))}
    {SFX.map((s, i) => (
      <Sequence key={`s${i}`} from={s.frame} durationInFrames={90} name={`sfx:${s.file}`}>
        <Audio src={staticFile(`audio/sfx/${s.file}.mp3`)} volume={s.vol} />
      </Sequence>
    ))}
  </>
);
