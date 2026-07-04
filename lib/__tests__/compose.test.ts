import { describe, it, expect } from "vitest";
import { cleanContext } from "@/lib/compose";

describe("cleanContext", () => {
  it("returns empty for empty input", () => {
    expect(cleanContext("")).toBe("");
  });

  it("strips Cognee node-content markup", () => {
    const raw = "Nodes: __node_content_start__we chose Postgres__node_content_end__";
    const out = cleanContext(raw);
    expect(out).not.toContain("__node_content_start__");
    expect(out).not.toContain("__node_content_end__");
    expect(out).toContain("Postgres");
  });

  it("caps the output length", () => {
    expect(cleanContext("x".repeat(5000)).length).toBeLessThanOrEqual(700);
  });
});
