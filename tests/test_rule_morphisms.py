import copy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from graph_dpo.api import create_app
from graph_dpo.matching import dangling_edge, find_matches
from graph_dpo.rewrite import apply_dpo
from graph_dpo.validation import parse_rule_input


def _document() -> dict:
    return {
        "graph": {
            "nodes": [
                {"id": "A", "label": "A"},
                {"id": "B", "label": "B"},
                {"id": "C", "label": "C"},
            ],
            "edges": [
                {"id": "ab", "source": "A", "target": "B"},
                {"id": "bc", "source": "B", "target": "C"},
            ],
        },
        "rule": {
            "L": {
                "nodes": [
                    {"id": "left-a", "label": "left-a"},
                    {"id": "left-b", "label": "left-b"},
                ],
                "edges": [{"id": "left-edge", "source": "left-a", "target": "left-b"}],
            },
            "K": {
                "nodes": [{"id": "k1", "label": "k1"}, {"id": "k2", "label": "k2"}],
                "edges": [{"id": "ke", "source": "k1", "target": "k2"}],
            },
            "R": {
                "nodes": [
                    {"id": "right-a", "label": "right-a"},
                    {"id": "right-b", "label": "right-b"},
                    {"id": "new", "label": "new"},
                ],
                "edges": [
                    {"id": "right-edge", "source": "right-a", "target": "right-b"},
                    {"id": "added", "source": "right-b", "target": "new"},
                ],
            },
            "l": {
                "nodes": {"k1": "left-a", "k2": "left-b"},
                "edges": {"ke": "left-edge"},
            },
            "r": {
                "nodes": {"k1": "right-a", "k2": "right-b"},
                "edges": {"ke": "right-edge"},
            },
        },
        "match": {
            "nodes": {"left-a": "A", "left-b": "B"},
            "edges": {"left-edge": "ab"},
        },
    }


def test_independent_k_preserves_mapped_elements_with_different_ids() -> None:
    doc = _document()
    original = copy.deepcopy(doc)
    host, rule = parse_rule_input(doc)
    assert len(find_matches(host, rule.left)) == 2
    assert dangling_edge(host, rule, find_matches(host, rule.left)[0]) is None
    _, result = apply_dpo(doc)
    assert result["status"] == "applied"
    assert result["intermediate_graph"] == doc["graph"]
    assert result["result_graph"] == {
        "nodes": [{"id": id, "label": id} for id in ("A", "B", "C", "new")],
        "edges": [
            *doc["graph"]["edges"],
            {"id": "added", "source": "B", "target": "new"},
        ],
    }
    assert doc == original


def test_empty_k_does_not_preserve_coincident_ids_in_l_and_r() -> None:
    graph = {"nodes": [{"id": "x", "label": "x"}], "edges": []}
    doc = {
        "graph": graph,
        "rule": {
            "L": graph,
            "K": {"nodes": [], "edges": []},
            "R": graph,
            "l": {"nodes": {}, "edges": {}},
            "r": {"nodes": {}, "edges": {}},
        },
        "match": {"nodes": {"x": "x"}, "edges": {}},
    }
    _, result = apply_dpo(doc)
    assert result["intermediate_graph"] == {"nodes": [], "edges": []}
    assert result["result_graph"]["nodes"] == [{"id": "x_1", "label": "x"}]


@pytest.mark.parametrize(
    ("side", "part", "mapping"),
    [
        ("l", "nodes", {"k1": "left-a"}),
        ("r", "nodes", {"k1": "right-a", "k2": "right-a"}),
        ("l", "nodes", {"k1": "left-a", "k2": "missing"}),
        ("l", "edges", {"ke": "missing"}),
        ("r", "edges", {}),
        ("l", "nodes", {"k1": "left-b", "k2": "left-a"}),
    ],
)
def test_morphism_requires_total_injective_incidence_preserving_map(
    side: str, part: str, mapping: dict
) -> None:
    doc = _document()
    doc["rule"][side][part] = mapping
    with pytest.raises(ValueError):
        apply_dpo(doc)


def test_removing_non_interface_vertex_uses_l_image_for_dangling_check() -> None:
    doc = _document()
    doc["rule"]["K"] = {"nodes": [{"id": "k1", "label": "k1"}], "edges": []}
    doc["rule"]["l"] = {"nodes": {"k1": "left-a"}, "edges": {}}
    doc["rule"]["r"] = {"nodes": {"k1": "right-a"}, "edges": {}}
    _, result = apply_dpo(doc)
    assert result == {"status": "rejected", "reason": "dangling_edge", "edge_id": "bc"}


def test_api_roundtrips_explicit_morphisms(tmp_path: Path) -> None:
    doc = _document()
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1") as client:
        assert client.put("/api/examples/morphisms", json=doc).status_code == 201
        assert client.get("/api/examples/morphisms").json() == doc
        body = client.post("/api/apply", json=doc).json()
        assert body["removed"] == {"nodes": [], "edges": []}
        assert body["added"] == {"nodes": ["new"], "edges": ["added"]}
