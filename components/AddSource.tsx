"use client";

import { useRef, useState } from "react";

// Auto-ingest sources: drop a PDF / Word / Excel / text file and it's parsed and
// ingested automatically. Files posted in Discord/Teams are ingested the same way.
export default function AddSource({ onIngested }: { onIngested: () => void }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setBusy(true);
    setStatus(`Reading ${files.length} file(s)…`);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/ingest-file", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        const total = (data.files ?? []).reduce((a: number, b: { chars?: number }) => a + (b.chars ?? 0), 0);
        setStatus(`Ingested ${files.length} file(s) · ${total.toLocaleString()} chars — building memory…`);
        setTimeout(onIngested, 2500);
      } else {
        setStatus(data.error || "No text could be extracted.");
      }
    } catch {
      setStatus("Upload failed — is the app running?");
    } finally {
      setBusy(false);
    }
  }

  async function ingestText() {
    const t = paste.trim();
    if (!t) return;
    setBusy(true);
    setStatus("Adding…");
    try {
      await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ source: "transcript", channel: "manual", author: "Pasted notes", text: t, ts: new Date().toISOString() }]),
      });
      setPaste("");
      setStatus("Added — building memory…");
      setTimeout(onIngested, 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Add to memory</h3>
        <p className="mt-1 text-xs leading-relaxed text-dim">
          Drop a PDF, Word, Excel, or text file — it&apos;s parsed and remembered automatically. Files posted in
          Discord/Teams are ingested the same way.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition"
        style={{
          borderColor: drag ? "var(--accent)" : "var(--line-strong)",
          background: drag ? "var(--accent-soft)" : "transparent",
        }}
      >
        <div className="text-2xl">{busy ? "⏳" : "📄"}</div>
        <div className="mt-1.5 text-sm text-ink">{busy ? "Processing…" : "Drop files or click to upload"}</div>
        <div className="text-[11px] text-faint">PDF · Word · Excel · CSV · TXT</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label="Upload files"
          accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.vtt,.srt,.json,.log"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>
      {status && (
        <div className="text-xs" style={{ color: "oklch(0.5 0.13 155)" }}>
          {status}
        </div>
      )}

      <details className="text-xs text-dim">
        <summary className="cursor-pointer select-none hover:text-ink">…or paste text</summary>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste a transcript or notes…"
          className="input mt-2 h-28 resize-none font-mono text-[12px]"
        />
        <button type="button" onClick={ingestText} disabled={busy || !paste.trim()} className="btn-primary mt-2">
          Add text
        </button>
      </details>

      <div className="card mt-auto p-3.5">
        <div className="mb-2 text-xs font-semibold text-ink">Connected sources</div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} /> Discord
          </span>
          <span className="text-faint">messages + files · auto</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--ink-faint)" }} /> Teams / Slack / GitHub
          </span>
          <span className="text-faint">same pipeline</span>
        </div>
      </div>
    </div>
  );
}
