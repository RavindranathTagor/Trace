// Real, official brand marks via simple-icons (open-source brand-icon set, used for
// referencing integrations). Tree-shaken named imports keep the bundle small. Brands
// simple-icons doesn't carry (Slack, Teams, Groq, Aider, Cognee) fall back to the
// hand-built marks in Logos.tsx / Icons.tsx, see BrandLogo below.

import {
  siGithub, siNotion, siLinear, siDiscord, siNextdotjs, siClaude, siAnthropic,
  siGithubcopilot, siElevenlabs, siGoogledrive, siGooglegemini, siCursor, siWindsurf,
} from "simple-icons";
import { SlackLogo, TeamsLogo, CogneeLogo } from "@/components/Logos";
import { GroqMark, AiderMark } from "@/components/Icons";

type SimpleIcon = { title: string; hex: string; path: string };

const REAL: Record<string, SimpleIcon> = {
  github: siGithub,
  notion: siNotion,
  linear: siLinear,
  discord: siDiscord,
  nextjs: siNextdotjs,
  claude: siClaude,
  anthropic: siAnthropic,
  copilot: siGithubcopilot,
  elevenlabs: siElevenlabs,
  drive: siGoogledrive,
  gemini: siGooglegemini,
  cursor: siCursor,
  windsurf: siWindsurf,
};

/** A single official brand mark. `color` uses the brand hex; otherwise currentColor. */
export function BrandIcon({ slug, className = "h-5 w-5", color = true }: { slug: keyof typeof REAL; className?: string; color?: boolean }) {
  const ic = REAL[slug];
  if (!ic) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={ic.title} fill={color ? `#${ic.hex}` : "currentColor"}>
      <path d={ic.path} />
    </svg>
  );
}

// Brands simple-icons doesn't ship, reuse our clean marks so the whole set stays
// consistent. (These render the closest official-style mark we can ship without the
// vendor's asset.)
const FALLBACK: Record<string, (p: { className?: string }) => JSX.Element> = {
  slack: SlackLogo,
  teams: TeamsLogo,
  cognee: CogneeLogo,
  groq: GroqMark,
  aider: AiderMark,
};

/** Renders a real simple-icons mark when available, else the fallback mark. */
export function BrandLogo({ slug, className = "h-5 w-5", color = true }: { slug: string; className?: string; color?: boolean }) {
  if (slug in REAL) return <BrandIcon slug={slug as keyof typeof REAL} className={className} color={color} />;
  const Fb = FALLBACK[slug];
  return Fb ? <Fb className={className} /> : null;
}
