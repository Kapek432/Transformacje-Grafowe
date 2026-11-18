import { describe, expect, it } from "vitest";
import { emptyDocument } from "./document";
import { validateDocument } from "./validate";

describe("validateDocument", () => {
  it("accepts an empty document", () => {
    expect(validateDocument(emptyDocument())).toEqual([]);
  });

  it("reports duplicates and missing ends", () => {
    const doc = emptyDocument();
    doc.graph = {
      nodes: ["a", "a"],
      edges: [
        { id: "e", source: "a", target: "b" },
        { id: "e", source: "a", target: "a" },
      ],
    };

    expect(validateDocument(doc).map((issue) => issue.message)).toEqual([
      'Powtórzony wierzchołek "a".',
      'Krawędź "e" ma nieistniejący koniec.',
      'Powtórzona krawędź "e".',
    ]);
  });

  it("reports an edge id with different ends in L and R", () => {
    const doc = emptyDocument();
    doc.rule.L = { nodes: ["a", "b"], edges: [{ id: "x", source: "a", target: "b" }] };
    doc.rule.R = { nodes: ["a", "b"], edges: [{ id: "x", source: "b", target: "a" }] };

    expect(validateDocument(doc)).toEqual([
      {
        graph: "R",
        message: 'Krawędź "x" występuje w L i R z różnymi końcami. Zmień jej id albo końce.',
      },
    ]);
  });
});
