import { describe, expect, it } from "vitest";
import { elementClasses, toElements } from "./toCytoscape";

const graph = { nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}], edges: [{ id: "e", source: "a", target: "b" }] };

describe("toElements", () => {
  it("prefixes ids, keeps labels and positions", () => {
    expect(toElements(graph, { a: { x: 1, y: 2 } })).toEqual([
      { group: "nodes", data: { id: "n:a", originalId: "a", label: "a" }, position: { x: 1, y: 2 }, classes: "" },
      { group: "nodes", data: { id: "n:b", originalId: "b", label: "b" }, position: undefined, classes: "" },
      {
        group: "edges",
        data: { id: "e:e", originalId: "e", label: "e", source: "n:a", target: "n:b" },
        classes: "",
      },
    ]);
  });

  it("assigns highlight classes", () => {
    const highlight = {
      matched: { nodes: ["a"], edges: ["e"] },
      removed: { nodes: [], edges: ["e"] },
      dangling: "e",
    };

    expect(elementClasses("nodes", "a", highlight)).toEqual(["matched"]);
    expect(elementClasses("edges", "e", highlight)).toEqual(["matched", "removed", "dangling"]);
    expect(elementClasses("nodes", "b", highlight)).toEqual([]);
  });
});
