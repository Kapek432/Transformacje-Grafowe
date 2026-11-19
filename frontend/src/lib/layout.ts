import { nodeIds, type GraphData, type Position } from "./types";

const NEIGHBOUR_DISTANCE = 70;
// The golden angle spreads several new nodes around the same neighbours.
const GOLDEN_ANGLE = 2.39996;

export function circleLayout(ids: string[]): Record<string, Position> {
  const radius = Math.max(120, (ids.length * 70) / (2 * Math.PI));
  return Object.fromEntries(
    ids.map((id, index) => {
      const angle = (2 * Math.PI * index) / ids.length - Math.PI / 2;
      return [id, { x: Math.round(radius * Math.cos(angle)), y: Math.round(radius * Math.sin(angle)) }];
    }),
  );
}

/** Keeps known positions so G, D and H share one drawing; new nodes go next to their neighbours. */
export function completeLayout(
  graph: GraphData,
  known: Record<string, Position> = {},
): Record<string, Position> {
  const ids = nodeIds(graph);
  const result: Record<string, Position> = {};
  for (const node of ids) if (known[node]) result[node] = known[node];
  const missing = ids.filter((node) => !result[node]);
  if (missing.length === graph.nodes.length) return circleLayout(ids);

  const neighbours = new Map<string, string[]>(ids.map((node) => [node, []]));
  for (const edge of graph.edges) {
    neighbours.get(edge.source)?.push(edge.target);
    neighbours.get(edge.target)?.push(edge.source);
  }
  const isolated: string[] = [];
  missing.forEach((node, index) => {
    const placed = (neighbours.get(node) ?? []).filter((other) => result[other]);
    if (placed.length === 0) {
      isolated.push(node);
      return;
    }
    const x = placed.reduce((sum, other) => sum + result[other].x, 0) / placed.length;
    const y = placed.reduce((sum, other) => sum + result[other].y, 0) / placed.length;
    const angle = index * GOLDEN_ANGLE;
    result[node] = {
      x: Math.round(x + NEIGHBOUR_DISTANCE * Math.cos(angle)),
      y: Math.round(y + NEIGHBOUR_DISTANCE * Math.sin(angle)),
    };
  });
  if (isolated.length > 0) {
    const positions = Object.values(result);
    const right = Math.max(...positions.map((p) => p.x)) + 100;
    const top = Math.min(...positions.map((p) => p.y));
    isolated.forEach((node, index) => {
      result[node] = { x: right, y: top + index * 80 };
    });
  }
  return result;
}
