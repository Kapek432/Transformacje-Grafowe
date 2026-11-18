import { describe, expect, it } from "vitest";
import { deriveInterface } from "./rule";

describe("deriveInterface", () => {
  it("keeps nodes and edges shared by L and R", () => {
    const L = {
      nodes: ["a", "b", "c"],
      edges: [
        { id: "x", source: "a", target: "b" },
        { id: "y", source: "b", target: "c" },
      ],
    };
    const R = {
      nodes: ["a", "b", "d"],
      edges: [
        { id: "x", source: "a", target: "b" },
        { id: "z", source: "a", target: "d" },
      ],
    };

    expect(deriveInterface(L, R)).toEqual({
      K: { nodes: ["a", "b"], edges: [{ id: "x", source: "a", target: "b" }] },
      conflicts: [],
    });
  });

  it("reports an edge id used with different ends", () => {
    const L = { nodes: ["a", "b"], edges: [{ id: "x", source: "a", target: "b" }] };
    const R = { nodes: ["a", "b"], edges: [{ id: "x", source: "b", target: "a" }] };

    expect(deriveInterface(L, R)).toEqual({
      K: { nodes: ["a", "b"], edges: [] },
      conflicts: ["x"],
    });
  });
});
