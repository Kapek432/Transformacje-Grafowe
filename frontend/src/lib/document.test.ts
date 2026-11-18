import { describe, expect, it } from "vitest";
import { documentReducer, emptyDocument, normalizeDocument } from "./document";

const L = { nodes: ["a", "b"], edges: [{ id: "x", source: "a", target: "b" }] };

describe("documentReducer", () => {
  it("derives K after editing L or R and clears the match", () => {
    const start = { ...emptyDocument(), match: { nodes: {}, edges: {} } };

    const withL = documentReducer(start, { type: "editGraph", name: "L", graph: L });
    const withR = documentReducer(withL, {
      type: "editGraph",
      name: "R",
      graph: { nodes: ["a"], edges: [] },
    });

    expect(withL.match).toBeUndefined();
    expect(withL.rule.K).toEqual({ nodes: [], edges: [] });
    expect(withR.rule.K).toEqual({ nodes: ["a"], edges: [] });
  });

  it("copies L to R with positions", () => {
    const start = documentReducer(emptyDocument(), {
      type: "editGraph",
      name: "L",
      graph: L,
      positions: { a: { x: 1, y: 2 } },
    });

    const copied = documentReducer(start, { type: "copyLeftToRight" });

    expect(copied.rule.R).toEqual(L);
    expect(copied.rule.K).toEqual(L);
    expect(copied.layout?.R).toEqual({ a: { x: 1, y: 2 } });
  });

  it("stores positions without clearing the match", () => {
    const match = { nodes: {}, edges: {} };
    const moved = documentReducer(
      { ...emptyDocument(), match },
      { type: "setPositions", name: "G", positions: { a: { x: 0, y: 0 } } },
    );

    expect(moved.match).toBe(match);
    expect(moved.layout?.G).toEqual({ a: { x: 0, y: 0 } });
  });

  it("recomputes K when loading", () => {
    const doc = emptyDocument();
    doc.rule = { L, K: { nodes: [], edges: [] }, R: L };

    expect(documentReducer(emptyDocument(), { type: "load", document: doc }).rule.K).toEqual(L);
  });
});

describe("normalizeDocument", () => {
  it("matches what the reducer stores on load", () => {
    const doc = emptyDocument();
    doc.rule = { L, K: { nodes: [], edges: [] }, R: L };

    expect(normalizeDocument(doc)).toEqual(documentReducer(emptyDocument(), { type: "load", document: doc }));
  });
});
