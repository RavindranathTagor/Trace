"use client";

import { useEffect, useRef, useState } from "react";
import { TraceBot } from "@/components/TraceBot";

// Trace's face on the Talk tab — the SAME character as the guide agent (glowing
// amber antenna, blinking eyes, side-bolts, body), lip-syncing to the live agent
// audio (getOutputByteFrequencyData). Amplitude drives the mouth; while the agent
// speaks a soft accent halo pulses behind it.
export default function Avatar({
  getFreq,
  active,
  speaking,
}: {
  getFreq: () => Uint8Array;
  active: boolean;
  speaking: boolean;
}) {
  const [mouth, setMouth] = useState(0);
  const [blink, setBlink] = useState(false);
  const mouthRef = useRef(0);

  // Lip-sync loop. We smooth toward the target amplitude and only re-render when
  // the quantized mouth value actually changes (keeps it to a few renders/sec).
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      let amp = 0;
      if (active) {
        try {
          const data = getFreq();
          if (data && data.length) {
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            amp = sum / data.length / 255;
          }
        } catch {
          amp = 0;
        }
      }
      const target = speaking || amp > 0.04 ? Math.min(1, amp * 2.6) : 0;
      mouthRef.current += (target - mouthRef.current) * 0.35;
      const q = Math.round(mouthRef.current * 20) / 20;
      setMouth((prev) => (prev === q ? prev : q));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [getFreq, active, speaking]);

  // Idle blink.
  useEffect(() => {
    const b = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4200);
    return () => clearInterval(b);
  }, []);

  return (
    <div className="grid shrink-0 place-items-center">
      <div className={active ? "" : "trace-bob"}>
        <TraceBot size={104} blink={blink} talk={active} mouth={mouth} />
      </div>
    </div>
  );
}
