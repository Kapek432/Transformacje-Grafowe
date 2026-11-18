import type { Highlight } from "./toCytoscape";
import type { GraphData, IdSets } from "./types";

export const STEPS = [
  {
    title: "Dopasowanie L w G",
    description: "Pomarańczowe elementy to obraz lewej strony reguły w grafie G.",
  },
  {
    title: "Usunięcie L \\ K",
    description: "Czerwone elementy należą do L, ale nie do K, więc zostaną usunięte.",
  },
  {
    title: "Graf pośredni D",
    description: "Po usunięciu zostaje kontekst oraz zachowana część K.",
  },
  {
    title: "Dodanie R \\ K",
    description: "Zielone elementy pochodzą z R i są doklejane przez K. Tak powstaje H.",
  },
] as const;

/** Fresh ids in H never collide with G, so the union holds every element of both graphs once. */
export function unionGraph(host: GraphData, result: GraphData): GraphData {
  const hostNodes = new Set(host.nodes);
  const hostEdges = new Set(host.edges.map((edge) => edge.id));
  return {
    nodes: [...host.nodes, ...result.nodes.filter((node) => !hostNodes.has(node))],
    edges: [...host.edges, ...result.edges.filter((edge) => !hostEdges.has(edge.id))],
  };
}

export function stepHighlight(step: number, matched: IdSets, removed: IdSets, added: IdSets): Highlight {
  switch (step) {
    case 0:
      return { matched, hidden: added };
    case 1:
      return { matched, removed, hidden: added };
    case 2:
      return {
        hidden: { nodes: [...removed.nodes, ...added.nodes], edges: [...removed.edges, ...added.edges] },
      };
    default:
      return { added, hidden: removed };
  }
}
