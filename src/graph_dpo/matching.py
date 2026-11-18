from collections import defaultdict
from collections.abc import Iterator
from itertools import islice

from .models import Graph, Match, Rule


def deleted_elements(rule: Rule, match: Match) -> tuple[set[str], set[str]]:
    """Return host nodes and edges matched by the part of L outside K."""
    nodes = {
        match.nodes[node] for node in set(rule.left.nodes) - set(rule.interface.nodes)
    }
    edges = {
        match.edges[edge]
        for edge in rule.left.edges.keys() - rule.interface.edges.keys()
    }
    return nodes, edges


def dangling_edge(host: Graph, rule: Rule, match: Match) -> str | None:
    """Find a host edge that the deletion would leave without an endpoint.

    Args:
        host: The graph G.
        rule: The rule whose part L minus K is deleted.
        match: An injective match of L in G.

    Returns:
        The identifier of the first dangling edge, or None when the rule applies.
    """
    removed_nodes, removed_edges = deleted_elements(rule, match)
    for edge_id, (source, target) in host.edges.items():
        if edge_id not in removed_edges and (
            source in removed_nodes or target in removed_nodes
        ):
            return edge_id
    return None


class _Search:
    def __init__(self, host: Graph, left: Graph) -> None:
        self.left = left
        degree = dict.fromkeys(left.nodes, 0)
        for source, target in left.edges.values():
            degree[source] += 1
            degree[target] += 1
        # Placing well-connected nodes first lets edge checks prune the search early.
        self.order = sorted(left.nodes, key=lambda node: -degree[node])
        position = {node: index for index, node in enumerate(self.order)}
        self.edge_groups: list[list[tuple[str, str, str]]] = [[] for _ in self.order]
        for edge_id, (source, target) in left.edges.items():
            group = max(position[source], position[target])
            self.edge_groups[group].append((edge_id, source, target))
        self.host_nodes = host.nodes
        self.host_node_ids = set(host.nodes)
        self.parallel: dict[tuple[str, str], list[str]] = defaultdict(list)
        for edge_id, ends in host.edges.items():
            self.parallel[ends].append(edge_id)
        self.nodes: dict[str, str] = {}
        self.edges: dict[str, str] = {}

    def matches(self) -> Iterator[Match]:
        yield from self._assign_node(0)

    def _assign_node(self, index: int) -> Iterator[Match]:
        if index == len(self.order):
            yield Match(
                {node: self.nodes[node] for node in self.left.nodes},
                {edge: self.edges[edge] for edge in self.left.edges},
            )
            return
        node = self.order[index]
        used = set(self.nodes.values())
        for candidate in self.host_nodes:
            if candidate not in used:
                if node in self.host_node_ids and candidate != node:
                    continue
                self.nodes[node] = candidate
                yield from self._assign_edges(index, 0)
                del self.nodes[node]

    def _assign_edges(self, index: int, position: int) -> Iterator[Match]:
        group = self.edge_groups[index]
        if position == len(group):
            yield from self._assign_node(index + 1)
            return
        edge_id, source, target = group[position]
        used = set(self.edges.values())
        ends = (self.nodes[source], self.nodes[target])
        for candidate in self.parallel.get(ends, []):
            if candidate not in used:
                self.edges[edge_id] = candidate
                yield from self._assign_edges(index, position + 1)
                del self.edges[edge_id]


def find_matches(host: Graph, left: Graph, limit: int = 200) -> list[Match]:
    """Find injective matches of L in G that preserve edge directions.

    Args:
        host: The graph G searched for copies of L.
        left: The left-hand side L of a rule.
        limit: The maximum number of returned matches.

    Returns:
        Matches in a deterministic order that follows the order of G.
    """
    return list(islice(_Search(host, left).matches(), limit))