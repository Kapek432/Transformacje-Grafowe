from dataclasses import dataclass, field
from typing import TypedDict

MAX_ID_LENGTH = 32767


class Edge(TypedDict):
    id: str
    source: str
    target: str


class Node(TypedDict):
    id: str
    label: str


class GraphData(TypedDict):
    nodes: list[Node]
    edges: list[Edge]


@dataclass(frozen=True)
class Graph:
    nodes: tuple[str, ...]
    edges: dict[str, tuple[str, str]]
    labels: dict[str, str] = field(default_factory=dict)

    def as_json(self) -> GraphData:
        """Return the graph in the shared input and output format."""
        data: GraphData = {
            "nodes": [
                {"id": node, "label": self.labels.get(node, node)}
                for node in self.nodes
            ],
            "edges": [
                {"id": edge_id, "source": source, "target": target}
                for edge_id, (source, target) in self.edges.items()
            ],
        }
        return data


@dataclass(frozen=True)
class Match:
    nodes: dict[str, str]
    edges: dict[str, str]


@dataclass(frozen=True)
class Rule:
    left: Graph
    interface: Graph
    right: Graph
    left_map: Match
    right_map: Match


class Applied(TypedDict):
    status: str
    intermediate_graph: GraphData
    result_graph: GraphData


class Rejected(TypedDict):
    status: str
    reason: str
    edge_id: str
