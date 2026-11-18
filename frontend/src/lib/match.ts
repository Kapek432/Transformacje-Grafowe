import type { IdSets, MatchData } from "./types";

export function matchIds(match: MatchData): IdSets {
  return { nodes: Object.values(match.nodes), edges: Object.values(match.edges) };
}

function sameMapping(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

export function sameMatch(a: MatchData, b: MatchData): boolean {
  return sameMapping(a.nodes, b.nodes) && sameMapping(a.edges, b.edges);
}
