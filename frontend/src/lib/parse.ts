import { type DpoDocument, type GraphData, type Layout, type MatchData } from "./types";

function isGraph(value: unknown): value is GraphData {
  if (typeof value !== "object" || value === null) return false;
  const graph = value as Record<string, unknown>;
  return (
    Array.isArray(graph.nodes) &&
    graph.nodes.every((node) => isPlainObject(node) && typeof node.id === "string" && typeof node.label === "string") &&
    !Object.hasOwn(graph, "node_labels") &&
    Array.isArray(graph.edges) &&
    graph.edges.every((edge) => {
      if (typeof edge !== "object" || edge === null) return false;
      const { id, source, target } = edge as Record<string, unknown>;
      return typeof id === "string" && typeof source === "string" && typeof target === "string";
    })
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMatch(value: unknown): MatchData | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value) || !isPlainObject(value.nodes) || !isPlainObject(value.edges)) {
    throw new Error("Pole match musi zawierać obiekty nodes i edges.");
  }
  return value as unknown as MatchData;
}

function parseMorphism(value: unknown): MatchData {
  if (!isPlainObject(value) || !isPlainObject(value.nodes) || !isPlainObject(value.edges) ||
      ![...Object.values(value.nodes), ...Object.values(value.edges)].every((id) => typeof id === "string")) {
    throw new Error("Morfizm musi zawierać obiekty nodes i edges z identyfikatorami tekstowymi.");
  }
  return value as unknown as MatchData;
}

function parseLayout(value: unknown): Layout {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) throw new Error("Pole layout musi być obiektem.");
  return value as Layout;
}

/** Checks the document shape, element types and optional fields; semantic errors (duplicates, missing ends) are reported by validateDocument. */
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
  if (!isGraph(rule.K)) throw new Error("Pole rule.K musi zawierać osobny graf z listami nodes i edges.");
  return {
    graph: doc.graph,
    rule: { L: rule.L, K: rule.K as GraphData, R: rule.R, ...(rule.l === undefined ? {} : {l: parseMorphism(rule.l)}), ...(rule.r === undefined ? {} : {r: parseMorphism(rule.r)}) },
    match: parseMatch(doc.match),
    layout: parseLayout(doc.layout),
  };
}
