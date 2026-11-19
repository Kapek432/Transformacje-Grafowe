import { renameNode, renameEdge } from "./graphEdit";
import { ruleMorphism } from "./rule";
import {
  emptyGraph,
  type DpoDocument,
  type GraphData,
  type GraphName,
  type MatchData,
  type Position,
} from "./types";

export type DocumentAction =
  | { type: "load"; document: DpoDocument }
  | { type: "editGraph"; name: GraphName; graph: GraphData; positions?: Record<string, Position> }
  | { type: "setPositions"; name: GraphName; positions: Record<string, Position> }
  | { type: "renameElement"; name: GraphName; kind: "node" | "edge"; from: string; to: string }
  | { type: "setMorphism"; side: "l" | "r"; mapping: MatchData }
  | { type: "setMatch"; match: MatchData | undefined };

export function emptyDocument(): DpoDocument {
  return {
    graph: emptyGraph(),
    rule: { L: emptyGraph(), K: emptyGraph(), R: emptyGraph() },
    layout: {},
  };
}

export function graphByName(doc: DpoDocument, name: GraphName): GraphData {
  if (name === "G") return doc.graph;
  return doc.rule[name];
}

/** Legacy inclusions become explicit maps without changing the independently defined K. */
export function normalizeDocument(document: DpoDocument): DpoDocument {
  return {
    ...document,
    layout: document.layout ?? {},
    rule: {...document.rule, l: ruleMorphism(document.rule, "l"), r: ruleMorphism(document.rule, "r")},
  };
}

export function documentReducer(state: DpoDocument, action: DocumentAction): DpoDocument {
  switch (action.type) {
    case "load":
      return normalizeDocument(action.document);
    case "editGraph": {
      const layout = action.positions
        ? { ...state.layout, [action.name]: action.positions }
        : state.layout;
      const previous = graphByName(state, action.name);
      const structureChanged = JSON.stringify([previous.nodes.map((node) => node.id), previous.edges]) !== JSON.stringify([action.graph.nodes.map((node) => node.id), action.graph.edges]);
      // Display-only label edits do not invalidate a structural match.
      const base: DpoDocument = { ...state, layout, match: structureChanged ? undefined : state.match };
      if (action.name === "G") return { ...base, graph: action.graph };
      const rule = {...state.rule, [action.name]: action.graph};
      if (action.name === "K") {
        for (const side of ["l", "r"] as const) {
          const map = ruleMorphism(state.rule, side);
          rule[side] = {
            nodes: Object.fromEntries(Object.entries(map.nodes).filter(([id]) => action.graph.nodes.some((node) => node.id === id))),
            edges: Object.fromEntries(Object.entries(map.edges).filter(([id]) => action.graph.edges.some((edge) => edge.id === id))),
          };
        }
      }
      return {...base, rule};
    }
    case "setPositions":
      return { ...state, layout: { ...state.layout, [action.name]: action.positions } };
    case "renameElement": {
      const graph = graphByName(state, action.name);
      const renamed = action.kind === "node" ? renameNode(graph, action.from, action.to) : renameEdge(graph, action.from, action.to);
      const known = state.layout?.[action.name];
      const positions = action.kind === "node" && known
        ? Object.fromEntries(Object.entries(known).map(([id, position]) => [id === action.from ? action.to : id, position]))
        : undefined;
      const next = documentReducer(state, {type:"editGraph",name:action.name,graph:renamed,positions});
      if (action.name === "G") return next;
      const kind = action.kind === "node" ? "nodes" : "edges";
      for (const side of ["l", "r"] as const) {
        const map = ruleMorphism(state.rule, side);
        const entries = Object.entries(map[kind]).map(([key, value]) => [
          action.name === "K" && key === action.from ? action.to : key,
          action.name === (side === "l" ? "L" : "R") && value === action.from ? action.to : value,
        ]);
        next.rule[side] = {...map, [kind]:Object.fromEntries(entries)};
      }
      return next;
    }
    case "setMorphism":
      return {...state, match: undefined, rule: {...state.rule, [action.side]: action.mapping}};
    case "setMatch":
      return { ...state, match: action.match };
  }
}
