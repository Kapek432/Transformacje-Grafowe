import type { DpoDocument, GraphData, MatchData } from "./types";

export function identityMorphism(graph: GraphData): MatchData {
  return {
    nodes: Object.fromEntries(graph.nodes.map(({id}) => [id, id])),
    edges: Object.fromEntries(graph.edges.map((edge) => [edge.id, edge.id])),
  };
}

/** Missing maps in legacy files mean inclusions; K is never inferred from the sides. */
export function ruleMorphism(rule: DpoDocument["rule"], side: "l" | "r"): MatchData {
  return rule[side] ?? identityMorphism(rule.K);
}

export function morphismImage(rule: DpoDocument["rule"], side: "l" | "r") {
  const map = ruleMorphism(rule, side);
  return { nodes: Object.values(map.nodes), edges: Object.values(map.edges) };
}
