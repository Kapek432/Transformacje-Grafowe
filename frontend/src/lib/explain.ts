import type { GraphData, MatchData } from "./types";

export function danglingExplanation(
  rule: { L: GraphData; K: GraphData; l?: MatchData },
  match: MatchData,
  host: GraphData,
  edgeId: string,
): string {
  const kept = new Set(rule.l ? Object.values(rule.l.nodes) : rule.K.nodes.map((node) => node.id));
  const deleted = new Set(rule.L.nodes.filter((node) => !kept.has(node.id)).map((node) => match.nodes[node.id]));
  const edge = host.edges.find((candidate) => candidate.id === edgeId);
  const node = edge && (deleted.has(edge.source) ? edge.source : edge.target);
  return (
    `Reguły nie można zastosować. Usunięcie wierzchołka "${node}" zostawiłoby krawędź "${edgeId}" bez końca, ` +
    "bo ta krawędź nie należy do dopasowania. To narusza warunek wiszącej krawędzi w DPO."
  );
}
