import type { DpoDocument, Edge, GraphData } from "./types";

export interface InterfaceResult {
  K: GraphData;
  conflicts: string[];
}

/** K consists of elements with the same id in L and R; an edge also needs equal ends. */
export function deriveInterface(left: GraphData, right: GraphData): InterfaceResult {
  const rightNodes = new Set(right.nodes);
  const rightEdges = new Map(right.edges.map((edge) => [edge.id, edge]));
  const edges: Edge[] = [];
  const conflicts: string[] = [];
  for (const edge of left.edges) {
    const other = rightEdges.get(edge.id);
    if (!other) continue;
    if (other.source === edge.source && other.target === edge.target) {
      edges.push({ ...edge });
    } else {
      conflicts.push(edge.id);
    }
  }
  const nodes = left.nodes.filter((node) => rightNodes.has(node));
  const kept = new Set(nodes);
  // An edge whose end is missing from L or R cannot belong to K.
  return {
    K: { nodes, edges: edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)) },
    conflicts,
  };
}

const edgeKeys = (graph: GraphData) =>
  graph.edges.map((edge) => JSON.stringify([edge.id, edge.source, edge.target])).sort();

/** True when the stored K is not the interface derived from L and R, ignoring element order. */
export function interfaceDiffers(rule: DpoDocument["rule"]): boolean {
  const derived = deriveInterface(rule.L, rule.R).K;
  const nodes = [...rule.K.nodes].sort();
  const derivedNodes = [...derived.nodes].sort();
  if (nodes.length !== derivedNodes.length || nodes.some((node, i) => node !== derivedNodes[i])) return true;
  const edges = edgeKeys(rule.K);
  const derivedEdges = edgeKeys(derived);
  return edges.length !== derivedEdges.length || edges.some((edge, i) => edge !== derivedEdges[i]);
}
