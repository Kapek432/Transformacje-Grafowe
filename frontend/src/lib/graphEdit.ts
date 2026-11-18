import type { GraphData } from "./types";

function freshId(base: string, taken: Set<string>): string {
  let candidate = base;
  let number = 1;
  while (taken.has(candidate)) {
    candidate = `${base}_${number}`;
    number += 1;
  }
  return candidate;
}

function requireId(id: string): void {
  if (!id.trim()) throw new Error("Identyfikator nie może być pusty.");
}

/** Reserved ids come from the other side of the rule, so a new element never joins K by accident. */
export function nextNodeId(graph: GraphData, reserved: string[] = []): string {
  const taken = new Set([...graph.nodes, ...reserved]);
  let number = 1;
  while (taken.has(`v${number}`)) number += 1;
  return `v${number}`;
}

export function addNode(graph: GraphData, id: string): GraphData {
  requireId(id);
  if (graph.nodes.includes(id)) throw new Error(`Wierzchołek "${id}" już istnieje.`);
  return { nodes: [...graph.nodes, id], edges: graph.edges };
}

export function addEdge(
  graph: GraphData,
  source: string,
  target: string,
  reserved: string[] = [],
): GraphData {
  const taken = new Set([...graph.edges.map((edge) => edge.id), ...reserved]);
  const id = freshId(`${source}-${target}`, taken);
  return { nodes: graph.nodes, edges: [...graph.edges, { id, source, target }] };
}

export function removeElements(graph: GraphData, nodeIds: string[], edgeIds: string[]): GraphData {
  const nodes = new Set(nodeIds);
  const edges = new Set(edgeIds);
  return {
    nodes: graph.nodes.filter((node) => !nodes.has(node)),
    edges: graph.edges.filter(
      (edge) => !edges.has(edge.id) && !nodes.has(edge.source) && !nodes.has(edge.target),
    ),
  };
}

export function renameNode(graph: GraphData, from: string, to: string): GraphData {
  if (from === to) return graph;
  requireId(to);
  if (graph.nodes.includes(to)) throw new Error(`Wierzchołek "${to}" już istnieje.`);
  const swap = (id: string) => (id === from ? to : id);
  return {
    nodes: graph.nodes.map(swap),
    edges: graph.edges.map((edge) => ({ ...edge, source: swap(edge.source), target: swap(edge.target) })),
  };
}

export function renameEdge(graph: GraphData, from: string, to: string): GraphData {
  if (from === to) return graph;
  requireId(to);
  if (graph.edges.some((edge) => edge.id === to)) {
    throw new Error(`Krawędź "${to}" już istnieje.`);
  }
  return {
    nodes: graph.nodes,
    edges: graph.edges.map((edge) => (edge.id === from ? { ...edge, id: to } : edge)),
  };
}
