import { ruleMorphism } from "./rule";
import type { DpoDocument, GraphData, GraphName } from "./types";

export interface ValidationIssue {
  graph: GraphName;
  message: string;
}

function graphIssues(graph: GraphData, name: GraphName): ValidationIssue[] {
  const messages: string[] = [];
  const nodes = new Set<string>();
  for (const item of graph.nodes) {
    const node = item.id;
    if (typeof node !== "string" || !node.trim()) {
      messages.push("Identyfikator wierzchołka nie może być pusty.");
    } else if (nodes.has(node)) {
      messages.push(`Powtórzony wierzchołek "${node}".`);
    }
    nodes.add(node);
  }
  for (const node of graph.nodes) {
    if (typeof node.label !== "string" || node.label.length > 32767 || /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/u.test(node.label)) {
      messages.push(`Niepoprawna etykieta wierzchołka "${node.id}".`);
    }
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
  const conflicts: ValidationIssue[] = [];
  for (const [side, targetName] of [["l", "L"], ["r", "R"]] as const) {
    const map = ruleMorphism(doc.rule, side);
    const target = doc.rule[targetName];
    for (const kind of ["nodes", "edges"] as const) {
      const sourceIds = kind === "nodes" ? doc.rule.K.nodes.map((node) => node.id) : doc.rule.K.edges.map((edge) => edge.id);
      const targetIds = kind === "nodes" ? target.nodes.map((node) => node.id) : target.edges.map((edge) => edge.id);
      const keys = Object.keys(map[kind]);
      const values = Object.values(map[kind]);
      if (keys.length !== sourceIds.length || keys.some((id) => !sourceIds.includes(id))) {
        conflicts.push({graph: "K", message: `Morfizm ${side}.${kind} musi mapować dokładnie wszystkie elementy K.`});
      }
      if (new Set(values).size !== values.length || values.some((id) => !targetIds.includes(id))) {
        conflicts.push({graph: "K", message: `Morfizm ${side}.${kind} musi wskazywać różne istniejące id w ${targetName}.`});
      }
    }
    for (const edge of doc.rule.K.edges) {
      const image = target.edges.find((item) => item.id === map.edges[edge.id]);
      if (!image || image.source !== map.nodes[edge.source] || image.target !== map.nodes[edge.target]) {
        conflicts.push({graph: "K", message: `Morfizm ${side} nie zachowuje końców krawędzi "${edge.id}".`});
      }
    }
  }
  return [
    ...graphIssues(doc.graph, "G"),
    ...graphIssues(doc.rule.L, "L"),
    ...graphIssues(doc.rule.K, "K"),
    ...graphIssues(doc.rule.R, "R"),
    ...conflicts,
  ];
}
