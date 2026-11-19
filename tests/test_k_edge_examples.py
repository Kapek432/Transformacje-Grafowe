import json
from pathlib import Path

import pytest

from graph_dpo.rewrite import apply_dpo

PROJECT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    ("name", "kept", "removed", "added"),
    [
        (
            "k_path_branch",
            {"ab", "bc"},
            {"b-old"},
            {"r_bn": ("B", "r_new"), "r_nc": ("r_new", "C")},
        ),
        (
            "k_cycle_attachment",
            {"ab", "bc", "ca"},
            {"b-old"},
            {"r_an": ("A", "r_new"), "r_nc": ("r_new", "C")},
        ),
        (
            "k_loop_preserved",
            {"loop-a", "ab"},
            set(),
            {"r_bn": ("B", "r_new"), "r_nn": ("r_new", "r_new")},
        ),
        (
            "k_parallel_preserved",
            {"p1", "p2"},
            {"p3"},
            {"r_an": ("A", "r_new"), "r_nb": ("r_new", "B")},
        ),
        (
            "k_disconnected_bridge",
            {"ab", "de"},
            set(),
            {"r_bn": ("B", "r_new"), "r_nd": ("r_new", "D")},
        ),
    ],
)
def test_keeps_exact_host_edges_while_rewriting_surroundings(
    name: str,
    kept: set[str],
    removed: set[str],
    added: dict[str, tuple[str, str]],
) -> None:
    document = json.loads((PROJECT / "examples" / f"{name}.json").read_text())
    k = document["rule"]["K"]
    assert len(k["edges"]) >= 2
    host_edges = {
        e["id"]: (e["source"], e["target"]) for e in document["graph"]["edges"]
    }
    expected = {key: ends for key, ends in host_edges.items() if key not in removed}
    _, result = apply_dpo(document)
    assert result["status"] == "applied"
    intermediate = {
        e["id"]: (e["source"], e["target"])
        for e in result["intermediate_graph"]["edges"]
    }
    final = {
        e["id"]: (e["source"], e["target"]) for e in result["result_graph"]["edges"]
    }
    assert intermediate == expected
    assert final == expected | added
    for key in kept:
        assert final[key] == host_edges[key]
    assert all(edge["id"] not in final for edge in k["edges"])


def test_preserving_k_edges_does_not_bypass_dangling_condition() -> None:
    document = json.loads(
        (PROJECT / "examples/k_path_branch_rejected.json").read_text()
    )
    _, result = apply_dpo(document)
    assert result == {
        "status": "rejected",
        "reason": "dangling_edge",
        "edge_id": "old-sink",
    }
