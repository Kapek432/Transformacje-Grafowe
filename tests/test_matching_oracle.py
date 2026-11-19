import itertools
import random

import pytest

from graph_dpo.matching import find_matches
from graph_dpo.models import Graph, Match

PATTERNS = [
    Graph((), {}),
    Graph(("x", "y"), {}),
    Graph(("x", "y"), {"xy": ("x", "y")}),
    Graph(("x", "y"), {"xx": ("x", "x"), "xy": ("x", "y")}),
    Graph(("x", "y"), {"first": ("x", "y"), "second": ("x", "y")}),
    Graph(("x", "y", "z"), {"xy": ("x", "y"), "yz": ("y", "z"), "zx": ("z", "x")}),
]


def _signature(match: Match) -> tuple[tuple[str, ...], tuple[str, ...]]:
    return tuple(match.nodes.values()), tuple(match.edges.values())


def _brute_force(
    host: Graph, left: Graph
) -> set[tuple[tuple[str, ...], tuple[str, ...]]]:
    matches = set()
    for node_images in itertools.permutations(host.nodes, len(left.nodes)):
        nodes = dict(zip(left.nodes, node_images, strict=True))
        for edge_images in itertools.permutations(host.edges, len(left.edges)):
            edges = dict(zip(left.edges, edge_images, strict=True))
            if all(
                host.edges[edges[key]] == (nodes[source], nodes[target])
                for key, (source, target) in left.edges.items()
            ):
                matches.add((node_images, edge_images))
    return matches


@pytest.mark.parametrize("seed", range(20))
@pytest.mark.parametrize(
    "left",
    PATTERNS,
    ids=["empty", "disconnected", "edge", "loop-edge", "parallel", "cycle"],
)
def test_search_agrees_with_independent_exhaustive_oracle(
    seed: int, left: Graph
) -> None:
    rng = random.Random(seed)
    nodes = ("a", "b", "c")
    host = Graph(
        nodes, {f"e{i}": (rng.choice(nodes), rng.choice(nodes)) for i in range(6)}
    )
    matches = find_matches(host, left, limit=1000)

    signatures = [_signature(match) for match in matches]
    assert len(signatures) == len(set(signatures))
    assert set(signatures) == _brute_force(host, left)
    assert find_matches(host, left, limit=2) == matches[:2]
    assert find_matches(host, left, limit=0) == []
    assert find_matches(host, left, limit=1000) == matches
