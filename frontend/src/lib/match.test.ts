import { describe, expect, it } from "vitest";
import { matchIds, sameMatch } from "./match";

const match = { nodes: { x: "a", y: "b" }, edges: { e: "ab" } };

describe("match helpers", () => {
  it("lists matched host ids", () => {
    expect(matchIds(match)).toEqual({ nodes: ["a", "b"], edges: ["ab"] });
  });

  it("compares matches by content", () => {
    expect(sameMatch(match, { nodes: { y: "b", x: "a" }, edges: { e: "ab" } })).toBe(true);
    expect(sameMatch(match, { nodes: { x: "b", y: "a" }, edges: { e: "ab" } })).toBe(false);
    expect(sameMatch(match, { nodes: { x: "a" }, edges: { e: "ab" } })).toBe(false);
  });
});
