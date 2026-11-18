import type { GraphData, MatchData } from "./types";

export function danglingExplanation(
  rule: { L: GraphData; K: GraphData },
  match: MatchData,
  host: GraphData,
  edgeId: string,
): string {
  const kept = new Set(rule.K.nodes);
  const deleted = new Set(rule.L.nodes.filter((node) => !kept.has(node)).map((node) => match.nodes[node]));
  const edge = host.edges.find((candidate) => candidate.id === edgeId);
  const node = edge && (deleted.has(edge.source) ? edge.source : edge.target);
  return (
    `Reguły nie można zastosować. Usunięcie wierzchołka "${node}" zostawiłoby krawędź "${edgeId}" bez końca, ` +
    "bo ta krawędź nie należy do dopasowania. To narusza warunek wiszącej krawędzi w DPO."
  );
}
