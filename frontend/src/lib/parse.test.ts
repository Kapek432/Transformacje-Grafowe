import { describe, expect, it } from "vitest";
import { parseDocument } from "./parse";

const graph = { nodes: ["a"], edges: [] };

describe("parseDocument", () => {
  it("reads a document and fills missing K and layout", () => {
    const text = JSON.stringify({ graph, rule: { L: graph, R: graph } });

    expect(parseDocument(text)).toEqual({
      graph,
      rule: { L: graph, K: { nodes: [], edges: [] }, R: graph },
      match: undefined,
      layout: {},
    });
  });

  it("explains invalid JSON", () => {
    expect(() => parseDocument("{")).toThrow(/^Niepoprawny JSON/);
  });

  it("rejects malformed graph elements", () => {
    const badEdges = JSON.stringify({ graph: { nodes: [], edges: [null] }, rule: { L: graph, R: graph } });
    const badNodes = JSON.stringify({ graph: { nodes: [1], edges: [] }, rule: { L: graph, R: graph } });
    const badRule = JSON.stringify({ graph, rule: { L: { nodes: [], edges: [{ id: 1 }] }, R: graph } });

    expect(() => parseDocument(badEdges)).toThrow("Pole graph musi zawierać listy nodes i edges.");
    expect(() => parseDocument(badNodes)).toThrow("Pole graph musi zawierać listy nodes i edges.");
    expect(() => parseDocument(badRule)).toThrow("Pole rule musi zawierać grafy L i R");
  });

  it("validates match", () => {
    const rule = { L: graph, R: graph };
    const message = "Pole match musi zawierać obiekty nodes i edges.";

    expect(() => parseDocument(JSON.stringify({ graph, rule, match: [] }))).toThrow(message);
    expect(() => parseDocument(JSON.stringify({ graph, rule, match: { nodes: {} } }))).toThrow(message);
    expect(() => parseDocument(JSON.stringify({ graph, rule, match: { nodes: [], edges: {} } }))).toThrow(message);
    expect(parseDocument(JSON.stringify({ graph, rule, match: { nodes: {}, edges: {} } })).match).toEqual({
      nodes: {},
      edges: {},
    });
  });

  it("validates layout", () => {
    const rule = { L: graph, R: graph };
    const message = "Pole layout musi być obiektem.";

    expect(() => parseDocument(JSON.stringify({ graph, rule, layout: [] }))).toThrow(message);
    expect(() => parseDocument(JSON.stringify({ graph, rule, layout: 5 }))).toThrow(message);
  });

  it("requires L and R", () => {
    const text = JSON.stringify({ graph, rule: { L: graph } });

    expect(() => parseDocument(text)).toThrow("Pole rule musi zawierać grafy L i R");
  });
});
