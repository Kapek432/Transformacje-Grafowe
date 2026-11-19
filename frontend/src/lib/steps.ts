import type { Highlight } from "./toCytoscape";
import { ruleMorphism } from "./rule";
import type { DpoDocument, GraphData, IdSets, MatchData } from "./types";

export const STEPS = [
  {
    title: "Dopasowanie L w G",
    description: "Pomarańczowe elementy to obraz lewej strony reguły w grafie G.",
  },
  {
    title: "Interfejs K",
    description: "Fioletowe elementy to obraz K w G przez złożenie m ∘ l. Osobny graf K i jego odwzorowania są pokazane obok.",
  },
  {
    title: "Usunięcie L \\ l(K)",
    description: "Czerwone elementy należą do L, ale nie do obrazu l(K), więc zostaną usunięte.",
  },
  {
    title: "Graf pośredni D",
    description: "Po usunięciu zostaje kontekst oraz zachowana część K.",
  },
  {
    title: "Dodanie R \\ r(K)",
    description: "Zielone elementy pochodzą z R poza obrazem r(K) i są doklejane przez morfizmy K. Tak powstaje H.",
  },
] as const;

/** Fresh ids in H never collide with G, so the union holds every element of both graphs once. */
export function unionGraph(host: GraphData, result: GraphData): GraphData {
  const hostNodes = new Set(host.nodes.map((node) => node.id));
  const hostEdges = new Set(host.edges.map((edge) => edge.id));
  return {
    nodes: [...host.nodes, ...result.nodes.filter((node) => !hostNodes.has(node.id))],
    edges: [...host.edges, ...result.edges.filter((edge) => !hostEdges.has(edge.id))],
  };
}

export function interfaceInHost(rule: DpoDocument["rule"], match: MatchData): IdSets {
  const left = ruleMorphism(rule, "l");
  return {
    nodes: rule.K.nodes.map((node) => match.nodes[left.nodes[node.id]]),
    edges: rule.K.edges.map((edge) => match.edges[left.edges[edge.id]]),
  };
}

export function stepHighlight(step: number, matched: IdSets, removed: IdSets, added: IdSets, preserved: IdSets): Highlight {
  switch (step) {
    case 0:
      return { matched, hidden: added };
    case 1:
      return { interface: preserved, hidden: added };
    case 2:
      return { interface: preserved, matched, removed, hidden: added };
    case 3:
      return {
        interface: preserved,
        hidden: { nodes: [...removed.nodes, ...added.nodes], edges: [...removed.edges, ...added.edges] },
      };
    default:
      return { interface: preserved, added, hidden: removed };
  }
}
