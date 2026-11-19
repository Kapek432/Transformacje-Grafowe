import copy
import json
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from graph_dpo.api import create_app
from graph_dpo.rewrite import apply_dpo

PROJECT = Path(__file__).resolve().parents[1]
EMPTY = {"nodes": [], "edges": []}
A_ONLY = {"nodes": [{"id": "A", "label": "A"}], "edges": []}
A_LOOP = {
    "nodes": [{"id": "A", "label": "A"}],
    "edges": [{"id": "aa", "source": "A", "target": "A"}],
}
CASES = [
    (
        "edge_parallel_delete_rejected",
        {"status": "rejected", "reason": "dangling_edge", "edge_id": "p2"},
    ),
    (
        "edge_parallel_delete",
        {"status": "applied", "intermediate_graph": A_ONLY, "result_graph": A_ONLY},
    ),
    (
        "edge_loop_delete_rejected",
        {"status": "rejected", "reason": "dangling_edge", "edge_id": "loop-b"},
    ),
    (
        "edge_loop_delete",
        {"status": "applied", "intermediate_graph": A_ONLY, "result_graph": A_ONLY},
    ),
    (
        "edge_empty_create",
        {"status": "applied", "intermediate_graph": EMPTY, "result_graph": A_LOOP},
    ),
    (
        "edge_delete_all",
        {"status": "applied", "intermediate_graph": EMPTY, "result_graph": EMPTY},
    ),
]


@pytest.mark.parametrize(("name", "expected"), CASES)
def test_edge_case_has_exact_result_in_core_and_api(
    name: str, expected: dict, tmp_path: Path
) -> None:
    document = json.loads((PROJECT / "examples" / f"{name}.json").read_text())
    original = copy.deepcopy(document)

    host, result = apply_dpo(document)
    assert host == document["graph"]
    assert result == expected
    assert document == original
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1") as client:
        response = client.post("/api/apply", json=document)
        assert response.status_code == 200
        assert response.json()["result"] == expected


@pytest.mark.parametrize(("name", "expected"), CASES)
def test_edge_case_cli_writes_exact_result(
    name: str, expected: dict, tmp_path: Path
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

    assert completed.returncode == (3 if expected["status"] == "rejected" else 0), (
        completed.stderr
    )
    assert json.loads((tmp_path / "output.json").read_text()) == expected


def test_empty_interface_replaces_node_instead_of_preserving_same_id() -> None:
    document = json.loads(
        (PROJECT / "examples/empty_interface_replace.json").read_text()
    )
    _, result = apply_dpo(document)
    assert result == {
        "status": "applied",
        "intermediate_graph": EMPTY,
        "result_graph": {"nodes": [{"id": "x_1", "label": "A"}], "edges": []},
    }


def test_distinct_rule_edge_ids_preserve_host_edge_identity() -> None:
    document = json.loads((PROJECT / "examples/explicit_morphisms.json").read_text())
    _, result = apply_dpo(document)
    assert result == {
        "status": "applied",
        "intermediate_graph": document["graph"],
        "result_graph": {
            "nodes": [*document["graph"]["nodes"], {"id": "new", "label": "new"}],
            "edges": [
                *document["graph"]["edges"],
                {"id": "added", "source": "B", "target": "new"},
            ],
        },
    }


def test_name_collisions_preserve_context_and_use_new_id_in_edge_endpoints() -> None:
    document = json.loads((PROJECT / "examples/name_collisions.json").read_text())
    _, result = apply_dpo(document)
    context = [edge for edge in document["graph"]["edges"] if edge["id"] != "ab"]
    assert result == {
        "status": "applied",
        "intermediate_graph": {"nodes": document["graph"]["nodes"], "edges": context},
        "result_graph": {
            "nodes": [*document["graph"]["nodes"], {"id": "relay_3", "label": "relay"}],
            "edges": [
                *context,
                {"id": "to-relay_2", "source": "A", "target": "relay_3"},
                {"id": "from-relay_1", "source": "relay_3", "target": "B"},
            ],
        },
    }


def test_invalid_morphism_fails_before_rewriting_or_writing_output(
    tmp_path: Path,
) -> None:
    path = PROJECT / "tests/fixtures/invalid_morphism_endpoints.json"
    document = json.loads(path.read_text())
    original = copy.deepcopy(document)
    with pytest.raises(ValueError, match="nie zachowuje końców"):
        apply_dpo(document)
    assert document == original
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1") as client:
        for endpoint in ("/api/matches", "/api/apply", "/api/export/json"):
            response = client.post(endpoint, json=document)
            assert response.status_code == 422
            assert "nie zachowuje końców" in response.json()["detail"]
    completed = subprocess.run(
        [
            sys.executable,
            str(PROJECT / "dpo.py"),
            str(path),
            "--output-dir",
            str(tmp_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 1
    assert not (tmp_path / "output.json").exists()
