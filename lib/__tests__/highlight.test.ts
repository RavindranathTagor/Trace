import { describe, it, expect } from "vitest";
import { nodeIdsInText, combineHighlights } from "@/lib/highlight";
import type { GraphNode } from "@/lib/types";

const nodes: GraphNode[] = [
  { id: "p1", label: "Priya (Sales)", type: "Person" },
  { id: "p2", label: "Teddy (Infra)", type: "Person" },
  { id: "d1", label: "Postgres", type: "Decision" },
  { id: "x", label: "Ab", type: "Entity" }, // too short (<3) → never matches
];

describe("nodeIdsInText", () => {
  it("matches labels, stripping a trailing (role) suffix", () => {
    const ids = nodeIdsInText(nodes, "Priya owns the Postgres decision");
    expect(ids).toContain("p1");
    expect(ids).toContain("d1");
    expect(ids).not.toContain("p2");
  });

  it("orders hits by first mention", () => {
    const ids = nodeIdsInText(nodes, "Postgres was chosen, then Priya argued against it");
    expect(ids).toEqual(["d1", "p1"]);
  });

  it("ignores labels shorter than 3 chars and empty text", () => {
    expect(nodeIdsInText(nodes, "Ab Ab Ab")).not.toContain("x");
    expect(nodeIdsInText(nodes, "")).toEqual([]);
  });

  it("caps the number of returned ids", () => {
    const many: GraphNode[] = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, label: `term${i}`, type: "Entity" }));
    const text = many.map((n) => n.label).join(" ");
    expect(nodeIdsInText(many, text, 14)).toHaveLength(14);
  });
});

describe("combineHighlights", () => {
  it("unions backend ids with text ids and dedupes", () => {
    expect(combineHighlights(["a", "b"], ["b", "c"]).sort()).toEqual(["a", "b", "c"]);
  });
  it("tolerates undefined backend ids", () => {
    expect(combineHighlights(undefined, ["a"])).toEqual(["a"]);
  });
});
