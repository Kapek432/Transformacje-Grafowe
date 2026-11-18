import { describe, expect, it } from "vitest";
import { STEPS, stepHighlight, unionGraph } from "./steps";

describe("steps", () => {
  it("merges host and result without duplicates", () => {
    const host = { nodes: ["a", "b"], edges: [{ id: "ab", source: "a", target: "b" }] };
    const result = { nodes: ["a", "n"], edges: [{ id: "an", source: "a", target: "n" }] };

    expect(unionGraph(host, result)).toEqual({
      nodes: ["a", "b", "n"],
      edges: [
        { id: "ab", source: "a", target: "b" },
        { id: "an", source: "a", target: "n" },
      ],
    });
  });

  it("shows the right elements in each step", () => {
    const matched = { nodes: ["a", "b"], edges: ["ab"] };
    const removed = { nodes: ["b"], edges: ["ab"] };
    const added = { nodes: ["n"], edges: ["an"] };

    expect(STEPS).toHaveLength(4);
    expect(stepHighlight(0, matched, removed, added)).toEqual({ matched, hidden: added });
    expect(stepHighlight(1, matched, removed, added)).toEqual({ matched, removed, hidden: added });
    expect(stepHighlight(2, matched, removed, added)).toEqual({
      hidden: { nodes: ["b", "n"], edges: ["ab", "an"] },
    });
    expect(stepHighlight(3, matched, removed, added)).toEqual({ added, hidden: removed });
  });
});
