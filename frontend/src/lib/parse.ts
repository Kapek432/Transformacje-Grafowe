import { emptyGraph, type DpoDocument, type GraphData, type Layout, type MatchData } from "./types";

function isGraph(value: unknown): value is GraphData {
  if (typeof value !== "object" || value === null) return false;
  const graph = value as Record<string, unknown>;
  return Array.isArray(graph.nodes) && Array.isArray(graph.edges);
}

/** Checks only the document shape; element-level errors are reported by validateDocument. */
export function parseDocument(text: string): DpoDocument {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`Niepoprawny JSON: ${(error as Error).message}`);
  }
  if (typeof value !== "object" || value === null) {
    throw new Error("Dokument musi być obiektem JSON.");
  }
  const doc = value as Record<string, unknown>;
  if (!isGraph(doc.graph)) {
    throw new Error("Pole graph musi zawierać listy nodes i edges.");
  }
  const rule = doc.rule as Record<string, unknown> | undefined;
  if (typeof rule !== "object" || rule === null || !isGraph(rule.L) || !isGraph(rule.R)) {
    throw new Error("Pole rule musi zawierać grafy L i R z listami nodes i edges.");
  }
  return {
    graph: doc.graph,
    rule: { L: rule.L, K: isGraph(rule.K) ? rule.K : emptyGraph(), R: rule.R },
    match: doc.match as MatchData | undefined,
    layout: (doc.layout as Layout | undefined) ?? {},
  };
}
