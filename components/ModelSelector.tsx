"use client";

import { useEffect, useState } from "react";

// Runtime answer-model picker. Lists all chat models from Groq and switches the
// model used to compose recall answers + the Stateless baseline (no restart).
export default function ModelSelector() {
  const [models, setModels] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/models", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { models?: string[]; selected?: string }) => {
        setModels(d.models ?? []);
        setSelected(d.selected ?? "");
      })
      .catch(() => {});
  }, []);

  async function change(model: string) {
    setSelected(model);
    setSaving(true);
    try {
      await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (models.length === 0) return null;

  return (
    <label className="flex items-center gap-1.5 text-xs text-faint" title="Answer model (Groq), switches instantly">
      <span className="hidden lg:inline">Model</span>
      <select
        value={selected}
        onChange={(e) => change(e.target.value)}
        disabled={saving}
        className="max-w-[180px] rounded-lg px-2 py-1 text-xs outline-none"
        style={{ color: "var(--ink)", background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  );
}
