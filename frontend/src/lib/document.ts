import { deriveInterface } from "./rule";
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
  | { type: "copyLeftToRight" }
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
  return name === "L" ? doc.rule.L : doc.rule.R;
}

function withRule(doc: DpoDocument, left: GraphData, right: GraphData): DpoDocument {
  return { ...doc, rule: { L: left, K: deriveInterface(left, right).K, R: right } };
}

/** The form in which the reducer stores a loaded document, with K derived from L and R. */
export function normalizeDocument(document: DpoDocument): DpoDocument {
  const doc = { ...document, layout: document.layout ?? {} };
  return withRule(doc, doc.rule.L, doc.rule.R);
}

export function documentReducer(state: DpoDocument, action: DocumentAction): DpoDocument {
  switch (action.type) {
    case "load":
      return normalizeDocument(action.document);
    case "editGraph": {
      const layout = action.positions
        ? { ...state.layout, [action.name]: action.positions }
        : state.layout;
      // Any structural change can invalidate the chosen match.
      const base: DpoDocument = { ...state, layout, match: undefined };
      if (action.name === "G") return { ...base, graph: action.graph };
      return action.name === "L"
        ? withRule(base, action.graph, state.rule.R)
        : withRule(base, state.rule.L, action.graph);
    }
    case "setPositions":
      return { ...state, layout: { ...state.layout, [action.name]: action.positions } };
    case "copyLeftToRight": {
      const layout = { ...state.layout, R: { ...state.layout?.L } };
      return withRule({ ...state, layout, match: undefined }, state.rule.L, structuredClone(state.rule.L));
    }
    case "setMatch":
      return { ...state, match: action.match };
  }
}
