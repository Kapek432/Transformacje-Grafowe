import { describe, expect, it } from "vitest";
import {
  addEdge,
  addNode,
  nextNodeId,
  removeElements,
  renameEdge,
  renameNode,
} from "./graphEdit";

const graph = {
  nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}],
  edges: [{ id: "a-b", source: "a", target: "b" }],
};

describe("graph editing", () => {
  it("picks a node id free in the graph and in reserved ids", () => {
    expect(nextNodeId({ nodes: [{"id": "v1", "label": "v1"}], edges: [] }, ["v2"])).toBe("v3");
  });

  it("adds a node and rejects duplicates", () => {
    expect(addNode(graph, "c").nodes.map((node) => node.id)).toEqual(["a", "b", "c"]);
    expect(() => addNode(graph, "a")).toThrow('Wierzchołek "a" już istnieje.');
  });

  it("adds an edge with a fresh id", () => {
    expect(addEdge(graph, "a", "b", ["a-b_1"]).edges.at(-1)).toEqual({
      id: "a-b_2",
      source: "a",
      target: "b",
    });
  });

  it("removes a node together with its edges", () => {
    expect(removeElements(graph, ["a"], [])).toEqual({ nodes: [{"id": "b", "label": "b"}], edges: [] });
  });

  it("renames a node in edges", () => {
    expect(renameNode(graph, "a", "z")).toEqual({
      nodes: [{"id": "z", "label": "a"}, {"id": "b", "label": "b"}],
      edges: [{ id: "a-b", source: "z", target: "b" }],
    });
    expect(() => renameNode(graph, "a", "b")).toThrow('Wierzchołek "b" już istnieje.');
  });

  it("renames an edge", () => {
    expect(renameEdge(graph, "a-b", "e").edges[0].id).toBe("e");
    expect(() => renameEdge(graph, "a-b", " ")).toThrow("Identyfikator nie może być pusty.");
  });
});
