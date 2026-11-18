from dataclasses import dataclass
from typing import TypedDict

MAX_ID_LENGTH = 32767


class Edge(TypedDict):
    id: str
    source: str
    target: str


class GraphData(TypedDict):
    nodes: list[str]
    edges: list[Edge]


@dataclass(frozen=True)
class Graph:
    nodes: tuple[str, ...]
    edges: dict[str, tuple[str, str]]

    def as_json(self) -> GraphData:
        """Return the graph in the shared input and output format."""
        return {
            "nodes": list(self.nodes),
            "edges": [
                {"id": edge_id, "source": source, "target": target}
                for edge_id, (source, target) in self.edges.items()
            ],
        }


@dataclass(frozen=True)
class Rule:
    left: Graph
    interface: Graph
    right: Graph


@dataclass(frozen=True)
class Match:
    nodes: dict[str, str]
    edges: dict[str, str]


class Applied(TypedDict):
    status: str
    intermediate_graph: GraphData
    result_graph: GraphData


class Rejected(TypedDict):
    status: str
    reason: str
    edge_id: str
