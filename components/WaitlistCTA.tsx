"use client";

import { useEffect, useState } from "react";

// Landing-page validation widget: beta waitlist (email) + a like/dislike reaction with
// an optional comment. Every submission is captured server-side and forwarded to a
// Discord/Slack webhook (see /api/waitlist), so you learn who's interested, who liked or
// disliked the idea, and why.
export default function WaitlistCTA({ source = "landing", compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [voteSent, setVoteSent] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => typeof d.count === "number" && setCount(d.count))
      .catch(() => {});
  }, []);

  async function submit(payload: Record<string, unknown>) {
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, source }),
      });
    } catch {
      /* optimistic */
    }
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setBusy(true);
    await submit({ email });
    setBusy(false);
    setJoined(true);
    setCount((c) => (c ?? 0) + 1);
  }

  async function react(v: "up" | "down") {
    setVote(v);
    await submit({ vote: v });
  }

  async function sendComment() {
    if (comment.trim()) await submit({ vote, comment });
    setVoteSent(true);
  }

  return (
    <div
      className="mx-auto w-full max-w-xl rounded-2xl p-6 text-left"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 1px 2px oklch(0 0 0 / 0.04)" }}
    >
      {/* Waitlist */}
      {joined ? (
        <div className="text-center">
          <div className="text-[15px] font-semibold text-ink">You&apos;re on the list ✓</div>
          <p className="mt-1 text-sm text-dim">We&apos;ll reach out before the private beta opens. Thanks for helping validate Trace.</p>
        </div>
      ) : (
        <form onSubmit={join}>
          <div className="text-[15px] font-semibold text-ink">Join the private beta</div>
          {!compact && (
            <p className="mt-1 text-sm text-dim">
              Be first to give your company a shared memory, and a guardian that catches decisions before they go wrong.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none"
              style={{ background: "var(--canvas)", border: "1px solid var(--line)" }}
            />
            <button type="submit" disabled={busy} className="btn-primary whitespace-nowrap px-5 py-2.5">
              {busy ? "Joining…" : "Join the waitlist"}
            </button>
          </div>
          {typeof count === "number" && count > 0 && (
            <p className="mt-2 text-[11px] text-faint">{count} {count === 1 ? "person is" : "people are"} already on the list.</p>
          )}
        </form>
      )}

      {/* Reaction + feedback */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        {voteSent ? (
          <p className="text-sm text-dim">Thank you, your feedback shapes what we build next. 🙏</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm text-dim">Would this help your team?</span>
              <button
                type="button"
                onClick={() => react("up")}
                className="rounded-full px-3 py-1 text-sm"
                style={{ border: "1px solid var(--line)", background: vote === "up" ? "oklch(0.5 0.13 155 / 0.12)" : "transparent", color: vote === "up" ? "oklch(0.45 0.13 155)" : "var(--ink)" }}
              >
                👍 Yes
              </button>
              <button
                type="button"
                onClick={() => react("down")}
                className="rounded-full px-3 py-1 text-sm"
                style={{ border: "1px solid var(--line)", background: vote === "down" ? "var(--drift-wash, oklch(0.55 0.19 27 / 0.1))" : "transparent", color: vote === "down" ? "var(--drift)" : "var(--ink)" }}
              >
                👎 Not really
              </button>
            </div>
            {vote && (
              <div className="mt-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder={vote === "up" ? "What's the one thing that would make this a must-have? (optional)" : "What's missing, or what would you use instead? (optional)"}
                  className="w-full rounded-lg px-3 py-2 text-sm text-ink outline-none"
                  style={{ background: "var(--canvas)", border: "1px solid var(--line)" }}
                />
                <button type="button" onClick={sendComment} className="btn mt-2 px-4 py-2 text-sm">
                  Send feedback
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
