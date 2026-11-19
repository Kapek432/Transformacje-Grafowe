import copy
import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from graph_dpo.api import create_app
from graph_dpo.rewrite import apply_dpo

PROJECT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    ("path", "value", "message"),
    [
        (
            ("graph", "nodes"),
            [{"id": id, "label": "A"} for id in ("A", "A", "B")],
            "powtórzony",
        ),
        (("graph", "nodes", 0, "id"), " ", "niepustym"),
        (("graph", "nodes", 0, "id"), 1, "niepustym"),
        (("graph", "nodes", 0, "id"), "B\n", "niedrukowalne"),
        (("graph", "edges", 0, "target"), "missing", "nieistniejący koniec"),
        (
            ("graph", "edges"),
            [
                {"id": "same", "source": "A", "target": "B"},
                {"id": "same", "source": "B", "target": "C"},
            ],
            "powtórzoną krawędź",
        ),
        (("graph", "edges"), {}, "listy nodes i edges"),
        (
            ("rule", "K", "nodes"),
            [{"id": "unknown", "label": "A"}],
            "dokładnie wszystkie",
        ),
        (
            ("rule", "K", "edges"),
            [{"id": "xy", "source": "y", "target": "x"}],
            "dokładnie wszystkie",
        ),
        (
            ("rule", "R"),
            {"nodes": [{"id": "x", "label": "x"}], "edges": []},
            "różne istniejące",
        ),
        (("match", "nodes"), {"x": "A"}, "dokładnie wszystkie"),
        (("match", "nodes"), {"x": "A", "y": "B", "extra": "C"}, "dokładnie wszystkie"),
        (("match", "nodes"), {"x": "A", "y": "A"}, "różne istniejące"),
        (("match", "nodes"), {"x": "A", "y": "missing"}, "różne istniejące"),
        (("match", "edges"), {}, "dokładnie wszystkie"),
        (("match", "edges"), {"xy": "missing"}, "różne istniejące"),
        (("match", "edges"), {"xy": "bc"}, "nie zachowuje końców"),
        (("match",), None, "obiektem JSON"),
    ],
)
def test_invalid_documents_rejected_by_core_and_api(
    path: tuple[str | int, ...],
    value: Any,
    message: str,
    tmp_path: Path,
) -> None:
    document = json.loads((PROJECT / "examples/reverse_edge.json").read_text())
    current = document
    for part in path[:-1]:
        current = current[part]
    current[path[-1]] = value
    with pytest.raises(ValueError, match=message):
        apply_dpo(document)
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1") as client:
        response = client.post("/api/apply", json=document)
        assert response.status_code == 422
        assert message in response.json()["detail"]


def test_parallel_edges_cannot_share_the_same_image() -> None:
    document = json.loads((PROJECT / "examples/parallel_bundle.json").read_text())
    document["match"]["edges"]["replace"] = document["match"]["edges"]["keep"]

    with pytest.raises(ValueError, match="różne istniejące"):
        apply_dpo(document)


@pytest.mark.parametrize("side", ["L", "R"])
def test_interface_edge_requires_identical_endpoints_on_both_sides(side: str) -> None:
    document = json.loads((PROJECT / "examples/parallel_bundle.json").read_text())
    document["rule"][side]["edges"][0]["source"] = "y"

    with pytest.raises(ValueError, match="nie zachowuje końców"):
        apply_dpo(document)


def test_empty_left_can_create_a_component_in_empty_graph() -> None:
    empty = {"nodes": [], "edges": []}
    right = {
        "nodes": [{"id": "A", "label": "A"}],
        "edges": [{"id": "loop", "source": "A", "target": "A"}],
    }
    document = {
        "graph": empty,
        "rule": {"L": empty, "K": empty, "R": right},
        "match": {"nodes": {}, "edges": {}},
    }

    _, result = apply_dpo(document)

    assert result == {
        "status": "applied",
        "intermediate_graph": empty,
        "result_graph": right,
    }


def test_entire_graph_can_be_deleted() -> None:
    graph = {
        "nodes": [{"id": "A", "label": "A"}],
        "edges": [{"id": "loop", "source": "A", "target": "A"}],
    }
    empty = {"nodes": [], "edges": []}
    document = {
        "graph": graph,
        "rule": {"L": graph, "K": empty, "R": empty},
        "match": {"nodes": {"A": "A"}, "edges": {"loop": "loop"}},
    }

    _, result = apply_dpo(document)

    assert result == {
        "status": "applied",
        "intermediate_graph": empty,
        "result_graph": empty,
    }


@pytest.mark.parametrize(
    "ends", [("A", "B"), ("B", "C"), ("B", "B")], ids=["incoming", "outgoing", "loop"]
)
def test_unmatched_incident_edge_blocks_vertex_deletion(ends: tuple[str, str]) -> None:
    document = json.loads((PROJECT / "examples/pipeline_bypass.json").read_text())
    source, target = ends
    document["graph"]["edges"].append(
        {"id": "blocking", "source": source, "target": target}
    )

    _, result = apply_dpo(document)

    assert result == {
        "status": "rejected",
        "reason": "dangling_edge",
        "edge_id": "blocking",
    }


def test_layout_metadata_does_not_change_rewrite() -> None:
    document = json.loads((PROJECT / "examples/diamond_expand.json").read_text())
    original = copy.deepcopy(document)
    document["layout"] = {"G": {"A": {"x": 10, "y": -20}}, "L": {}, "R": {}}

    assert apply_dpo(document) == apply_dpo(original)
