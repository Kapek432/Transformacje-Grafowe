import { describe, expect, it } from "vitest";
import { circleLayout, completeLayout } from "./layout";

describe("layout", () => {
  it("places nodes on a circle at distinct points", () => {
    const positions = circleLayout(["a", "b", "c"]);

    expect(Object.keys(positions)).toEqual(["a", "b", "c"]);
    expect(new Set(Object.values(positions).map((p) => `${p.x},${p.y}`)).size).toBe(3);
  });

  it("uses a circle when nothing is known", () => {
    const graph = { nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}], edges: [] };

    expect(completeLayout(graph)).toEqual(circleLayout(["a", "b"]));
  });

  it("keeps known positions and places new nodes near their neighbours", () => {
    const graph = {
      nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}, {"id": "n", "label": "n"}],
      edges: [
        { id: "an", source: "a", target: "n" },
        { id: "bn", source: "b", target: "n" },
      ],
    };

    const positions = completeLayout(graph, { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } });

    expect(positions.a).toEqual({ x: 0, y: 0 });
    expect(Math.hypot(positions.n.x - 50, positions.n.y)).toBeLessThanOrEqual(71);
  });

  it("puts isolated new nodes to the right of the drawing", () => {
    const graph = { nodes: [{"id": "a", "label": "a"}, {"id": "z", "label": "z"}], edges: [] };

    expect(completeLayout(graph, { a: { x: 10, y: 20 } }).z).toEqual({ x: 110, y: 20 });
  });
});
