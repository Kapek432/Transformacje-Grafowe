import { deriveInterface } from "./rule";
import type { DpoDocument, GraphData, GraphName } from "./types";

export interface ValidationIssue {
  graph: GraphName;
  message: string;
}

function graphIssues(graph: GraphData, name: GraphName): ValidationIssue[] {
  const messages: string[] = [];
  const nodes = new Set<string>();
  for (const node of graph.nodes) {
    if (typeof node !== "string" || !node.trim()) {
      messages.push("Identyfikator wierzchołka nie może być pusty.");
    } else if (nodes.has(node)) {
      messages.push(`Powtórzony wierzchołek "${node}".`);
    }
    nodes.add(node);
  }
  const edges = new Set<string>();
  for (const edge of graph.edges) {
    if (typeof edge.id !== "string" || !edge.id.trim()) {
      messages.push("Identyfikator krawędzi nie może być pusty.");
    } else if (edges.has(edge.id)) {
      messages.push(`Powtórzona krawędź "${edge.id}".`);
    }
    edges.add(edge.id);
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      messages.push(`Krawędź "${edge.id}" ma nieistniejący koniec.`);
    }
  }
  return messages.map((message) => ({ graph: name, message }));
}

export function validateDocument(doc: DpoDocument): ValidationIssue[] {
  const conflicts = deriveInterface(doc.rule.L, doc.rule.R).conflicts.map(
    (id): ValidationIssue => ({
      graph: "R",
      message: `Krawędź "${id}" występuje w L i R z różnymi końcami. Zmień jej id albo końce.`,
    }),
  );
  return [
    ...graphIssues(doc.graph, "G"),
    ...graphIssues(doc.rule.L, "L"),
    ...graphIssues(doc.rule.R, "R"),
    ...conflicts,
  ];
}
