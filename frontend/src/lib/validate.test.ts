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
      nodes: [{"id": "a", "label": "a"}, {"id": "a", "label": "a"}],
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

  it("allows coincident ids with different ends outside the image of K", () => {
    const doc = emptyDocument();
    doc.rule.L = { nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}], edges: [{ id: "x", source: "a", target: "b" }] };
    doc.rule.R = { nodes: [{"id": "a", "label": "a"}, {"id": "b", "label": "b"}], edges: [{ id: "x", source: "b", target: "a" }] };
    expect(validateDocument(doc)).toEqual([]);
  });
});
