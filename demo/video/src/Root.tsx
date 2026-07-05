import React from "react";
import { Composition } from "remotion";
import { TraceVideo } from "./TraceVideo";
import timeline from "./timeline.json";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TraceVideo"
      component={TraceVideo}
      durationInFrames={timeline.totalFrames}
      fps={timeline.fps}
      width={1920}
      height={1080}
    />
  );
};
