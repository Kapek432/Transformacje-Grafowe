import copy
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from graph_dpo.api import create_app
from graph_dpo.matching import dangling_edge, find_matches
from graph_dpo.rewrite import apply_dpo
from graph_dpo.validation import parse_input, parse_rule_input

PROJECT = Path(__file__).resolve().parents[1]
EXAMPLES = sorted(path.stem for path in (PROJECT / "examples").glob("*.json"))
EXPECTED_SEARCH = [
    ("connect_components", 90, 90),
    ("cycle_no_match", 0, 0),
    ("diamond_expand", 4, 4),
    ("edge_delete_all", 1, 1),
    ("edge_empty_create", 1, 1),
    ("edge_loop_delete", 1, 1),
    ("edge_loop_delete_rejected", 1, 0),
    ("edge_parallel_delete", 2, 2),
    ("edge_parallel_delete_rejected", 2, 0),
    ("k_cycle_attachment", 2, 1),
    ("k_disconnected_bridge", 8, 8),
    ("k_loop_preserved", 1, 1),
    ("k_parallel_preserved", 6, 6),
    ("k_path_branch", 4, 2),
    ("k_path_branch_rejected", 4, 0),
    ("loop_cleanup_network", 4, 4),
    ("name_collisions", 6, 6),
    ("parallel_bundle", 8, 8),
    ("pipeline_bypass", 8, 6),
    ("pipeline_bypass_rejected", 9, 5),
]


def _load(name: str) -> dict[str, Any]:
    return json.loads((PROJECT / "examples" / f"{name}.json").read_text())


def _edges(graph: dict[str, Any]) -> dict[str, tuple[str, str]]:
    return {edge["id"]: (edge["source"], edge["target"]) for edge in graph["edges"]}


@pytest.mark.parametrize(("name", "total", "applicable"), EXPECTED_SEARCH)
def test_complex_example_match_counts(name: str, total: int, applicable: int) -> None:
    host, rule = parse_rule_input(_load(name))
    matches = find_matches(host, rule.left)

    assert len(matches) == total
    assert (
        sum(dangling_edge(host, rule, match) is None for match in matches) == applicable
    )


@pytest.mark.parametrize("name", EXAMPLES)
def test_every_discovered_match_preserves_context(name: str) -> None:
    document = _load(name)
    original = copy.deepcopy(document)
    host, rule = parse_rule_input(document)
    matches = find_matches(host, rule.left)
    if name == "cycle_no_match":
        assert matches == []
        assert "match" not in document
        return
    assert matches
    if "match" in document:
        assert any(
            match.nodes == document["match"]["nodes"]
            and match.edges == document["match"]["edges"]
            for match in matches
        )
    for match in matches:
        candidate = {**document, "match": {"nodes": match.nodes, "edges": match.edges}}
        parse_input(candidate)
        _, result = apply_dpo(candidate)
        blocked = dangling_edge(host, rule, match)
        if blocked is not None:
            assert result == {
                "status": "rejected",
                "reason": "dangling_edge",
                "edge_id": blocked,
            }
            continue
        assert result["status"] == "applied"
        removed_nodes = {
            match.nodes[node]
            for node in rule.left.nodes
            if node not in rule.left_map.nodes.values()
        }
        removed_edges = {
            match.edges[edge]
            for edge in rule.left.edges
            if edge not in rule.left_map.edges.values()
        }
        intermediate = result["intermediate_graph"]
        final = result["result_graph"]
        context_edges = {
            key: value for key, value in host.edges.items() if key not in removed_edges
        }
        assert {node["id"] for node in intermediate["nodes"]} == set(
            host.nodes
        ) - removed_nodes
        assert _edges(intermediate) == context_edges
        assert context_edges.items() <= _edges(final).items()
        assert {node["id"] for node in intermediate["nodes"]} <= {
            node["id"] for node in final["nodes"]
        }
        assert len(final["nodes"]) == len(intermediate["nodes"]) + len(
            rule.right.nodes
        ) - len(rule.interface.nodes)
        assert len(final["edges"]) == len(intermediate["edges"]) + len(
            rule.right.edges
        ) - len(rule.interface.edges)
        assert len(final["nodes"]) == len({node["id"] for node in final["nodes"]})
        assert len(final["edges"]) == len(_edges(final))
        assert all(
            source in {node["id"] for node in final["nodes"]}
            and target in {node["id"] for node in final["nodes"]}
            for source, target in _edges(final).values()
        )
    assert document == original


@pytest.mark.parametrize(
    ("name", "removed_nodes", "removed_edges", "added_nodes", "added_edges"),
    [
        ("pipeline_bypass", {"B"}, {"ab", "bc"}, set(), {"bypass": ("A", "C")}),
        (
            "diamond_expand",
            {"B", "C"},
            {"ab", "ac", "bd", "cd"},
            {"split", "upper", "lower", "merge"},
            {
                "entry": ("A", "split"),
                "upper-in": ("split", "upper"),
                "lower-in": ("split", "lower"),
                "upper-out": ("upper", "merge"),
                "lower-out": ("lower", "merge"),
                "exit": ("merge", "D"),
            },
        ),
        (
            "parallel_bundle",
            set(),
            {"ab-2"},
            {"relay"},
            {"to-relay": ("A", "relay"), "from-relay": ("relay", "B")},
        ),
        (
            "loop_cleanup_network",
            set(),
            {"loop-d"},
            {"marker"},
            {"mark": ("D", "marker")},
        ),
        (
            "name_collisions",
            set(),
            {"ab"},
            {"relay_3"},
            {"to-relay_2": ("A", "relay_3"), "from-relay_1": ("relay_3", "B")},
        ),
        (
            "connect_components",
            set(),
            set(),
            {"bridge"},
            {"bridge-in": ("C", "bridge"), "bridge-out": ("bridge", "D")},
        ),
    ],
)
def test_complex_example_exact_rewrite(
    name: str,
    removed_nodes: set[str],
    removed_edges: set[str],
    added_nodes: set[str],
    added_edges: dict[str, tuple[str, str]],
) -> None:
    document = _load(name)
    host, result = apply_dpo(document)
    assert result["status"] == "applied"
    context = {
        key: value for key, value in _edges(host).items() if key not in removed_edges
    }
    assert {node["id"] for node in result["intermediate_graph"]["nodes"]} == {
        node["id"] for node in host["nodes"]
    } - removed_nodes
    assert _edges(result["intermediate_graph"]) == context
    assert {node["id"] for node in result["result_graph"]["nodes"]} == (
        {node["id"] for node in host["nodes"]} - removed_nodes
    ) | added_nodes
    assert _edges(result["result_graph"]) == context | added_edges


@pytest.mark.parametrize("name", EXAMPLES)
def test_examples_through_api(name: str, tmp_path: Path) -> None:
    document = _load(name)
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1") as client:
        search = client.post("/api/matches", json=document)
        assert search.status_code == 200
        assert search.json()["truncated"] is False
        if name == "cycle_no_match":
            assert search.json()["matches"] == []
            assert client.post("/api/apply", json=document).status_code == 422
            return
        response = client.post("/api/apply", json=document)
        assert response.status_code == 200
        body = response.json()
        _, expected = apply_dpo(document)
        assert body["result"] == expected
        if name.endswith("rejected"):
            assert body["removed"] == body["added"] == {"nodes": [], "edges": []}
        else:
            intermediate = expected["intermediate_graph"]
            final = expected["result_graph"]
            assert set(body["removed"]["nodes"]) == {
                node["id"] for node in document["graph"]["nodes"]
            } - {node["id"] for node in intermediate["nodes"]}
            assert set(body["removed"]["edges"]) == set(
                _edges(document["graph"])
            ) - set(_edges(intermediate))
            assert set(body["added"]["nodes"]) == {
                node["id"] for node in final["nodes"]
            } - {node["id"] for node in intermediate["nodes"]}
            assert set(body["added"]["edges"]) == set(_edges(final)) - set(
                _edges(intermediate)
            )


@pytest.mark.parametrize(("name", "total", "applicable"), EXPECTED_SEARCH)
def test_complex_examples_through_cli(
    name: str, total: int, applicable: int, tmp_path: Path
) -> None:
    completed = subprocess.run(
        [
            sys.executable,
            str(PROJECT / "dpo.py"),
            str(PROJECT / "examples" / f"{name}.json"),
            "--output-dir",
            str(tmp_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    output = tmp_path / "output.json"
    if name == "cycle_no_match":
        assert completed.returncode == 1
        assert "match" in completed.stderr
        assert not output.exists()
    else:
        rejected = name.endswith("rejected")
        assert completed.returncode == (3 if rejected else 0), completed.stderr
        assert json.loads(output.read_text())["status"] == (
            "rejected" if rejected else "applied"
        )
