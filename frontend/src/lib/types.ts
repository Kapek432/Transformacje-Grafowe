export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: string[];
  edges: Edge[];
}

export interface Position {
  x: number;
  y: number;
}

export type GraphName = "G" | "L" | "R";

export type Layout = Partial<Record<GraphName, Record<string, Position>>>;

export interface MatchData {
  nodes: Record<string, string>;
  edges: Record<string, string>;
}

export interface DpoDocument {
  graph: GraphData;
  rule: { L: GraphData; K: GraphData; R: GraphData };
  match?: MatchData;
  layout?: Layout;
}

export interface MatchInfo extends MatchData {
  applicable: boolean;
  dangling_edge: string | null;
}

export interface MatchesResponse {
  matches: MatchInfo[];
  truncated: boolean;
}

export interface IdSets {
  nodes: string[];
  edges: string[];
}

export type DpoResult =
  | { status: "applied"; intermediate_graph: GraphData; result_graph: GraphData }
  | { status: "rejected"; reason: "dangling_edge"; edge_id: string };

export interface ApplyResponse {
  host: GraphData;
  result: DpoResult;
  removed: IdSets;
  added: IdSets;
}

export const emptyGraph = (): GraphData => ({ nodes: [], edges: [] });
