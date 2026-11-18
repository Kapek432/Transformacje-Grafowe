import type { ElementDefinition } from "cytoscape";
import type { GraphData, IdSets, Position } from "./types";

export interface Highlight {
  interface?: IdSets;
  matched?: IdSets;
  removed?: IdSets;
  added?: IdSets;
  hidden?: IdSets;
  dangling?: string | null;
}

const KINDS = ["interface", "matched", "removed", "added", "hidden"] as const;

// Cytoscape shares one id space for nodes and edges, while DPO graphs may reuse a name for both.
export const nodeKey = (id: string): string => `n:${id}`;
export const edgeKey = (id: string): string => `e:${id}`;

export function elementClasses(kind: "nodes" | "edges", id: string, highlight: Highlight): string[] {
  const classes: string[] = KINDS.filter((name) => highlight[name]?.[kind].includes(id));
  if (kind === "edges" && highlight.dangling === id) classes.push("dangling");
  return classes;
}

export function toElements(
  graph: GraphData,
  positions: Record<string, Position>,
  highlight: Highlight = {},
): ElementDefinition[] {
  return [
    ...graph.nodes.map((id) => ({
      group: "nodes" as const,
      data: { id: nodeKey(id), label: id },
      position: positions[id] ? { ...positions[id] } : undefined,
      classes: elementClasses("nodes", id, highlight).join(" "),
    })),
    ...graph.edges.map((edge) => ({
      group: "edges" as const,
      data: { id: edgeKey(edge.id), label: edge.id, source: nodeKey(edge.source), target: nodeKey(edge.target) },
      classes: elementClasses("edges", edge.id, highlight).join(" "),
    })),
  ];
}
