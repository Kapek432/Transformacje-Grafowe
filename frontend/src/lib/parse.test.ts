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

  it("requires L and R", () => {
    const text = JSON.stringify({ graph, rule: { L: graph } });

    expect(() => parseDocument(text)).toThrow("Pole rule musi zawierać grafy L i R");
  });
});
