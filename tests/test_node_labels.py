import csv
import io
import json
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from graph_dpo.api import create_app
from graph_dpo.exports import export_bytes
from graph_dpo.matching import find_matches
from graph_dpo.rewrite import apply_dpo
from graph_dpo.validation import parse_rule_input

PROJECT = Path(__file__).resolve().parents[1]


def _document() -> dict:
    document = json.loads((PROJECT / "examples/subdivide_edge.json").read_text())
    labels = {"A": "Węzeł", "B": "Węzeł", "C": "Cel"}
    for node in document["graph"]["nodes"]:
        node["label"] = labels[node["id"]]
    document["rule"]["L"]["nodes"][0]["label"] = "Inna etykieta"
    for node in document["rule"]["R"]["nodes"]:
        node["label"] = "Węzeł" if node["id"] == "m" else "Zmieniona"
    return document


def _labels(graph: dict) -> dict[str, str]:
    return {node["id"]: node["label"] for node in graph["nodes"]}


def test_duplicate_labels_do_not_change_identity_or_matches() -> None:
    document = _document()
    host, rule = parse_rule_input(document)
    assert len(find_matches(host, rule.left)) == 2
    normalized, result = apply_dpo(document)
    assert normalized == document["graph"]
    assert result["intermediate_graph"]["nodes"] == document["graph"]["nodes"]
    assert _labels(result["result_graph"]) == {
        "A": "Węzeł",
        "B": "Węzeł",
        "C": "Cel",
        "m": "Węzeł",
    }


def test_labels_follow_fresh_ids_without_overwriting_context() -> None:
    document = _document()
    document["graph"]["nodes"].append({"id": "m", "label": "Istniejący"})
    _, result = apply_dpo(document)
    assert _labels(result["result_graph"])["m"] == "Istniejący"
    assert _labels(result["result_graph"])["m_1"] == "Węzeł"


def test_deleting_node_removes_its_label() -> None:
    document = json.loads((PROJECT / "examples/remove_leaf.json").read_text())
    _, result = apply_dpo(document)
    assert _labels(result["result_graph"]) == {"A": "A", "B": "B"}


@pytest.mark.parametrize(
    "nodes",
    [
        ["A", "B"],
        [{"id": "A"}],
        [{"label": "A"}],
        [{"id": "A", "label": 12}],
        [{"id": "A", "label": "a\nb"}],
        [{"id": "A", "label": "A"}, {"id": "A", "label": "B"}],
    ],
)
def test_old_or_invalid_nodes_are_rejected(nodes: object) -> None:
    document = _document()
    document["graph"]["nodes"] = nodes
    with pytest.raises(ValueError):
        apply_dpo(document)


def test_old_label_map_is_rejected() -> None:
    document = _document()
    document["graph"]["node_labels"] = {"A": "A"}
    with pytest.raises(ValueError, match="node_labels"):
        apply_dpo(document)


def test_labels_survive_api_save_and_apply(tmp_path: Path) -> None:
    document = _document()
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1") as client:
        assert client.put("/api/examples/labels", json=document).status_code == 201
        assert client.get("/api/examples/labels").json() == document
        body = client.post("/api/apply", json=document).json()
        assert _labels(body["result"]["result_graph"])["m"] == "Węzeł"
        assert body["added"]["nodes"] == ["m"]


def test_exports_distinguish_ids_from_repeated_labels() -> None:
    host, result = apply_dpo(_document())
    exported = json.loads(export_bytes(host, result, "json"))
    assert _labels(exported["result_graph"])["m"] == "Węzeł"
    with zipfile.ZipFile(io.BytesIO(export_bytes(host, result, "csv"))) as archive:
        rows = list(
            csv.DictReader(
                io.StringIO(archive.read("wierzcholki.csv").decode("utf-8-sig")),
                delimiter=";",
            )
        )
    assert [
        (row["id"], row["etykieta"]) for row in rows if row["etap"] == "wynikowy"
    ] == [("A", "Węzeł"), ("B", "Węzeł"), ("C", "Cel"), ("m", "Węzeł")]
    workbook = load_workbook(io.BytesIO(export_bytes(host, result, "excel")))
    try:
        assert next(iter(workbook["Wierzchołki"].values)) == ("etap", "id", "etykieta")
    finally:
        workbook.close()


def test_all_examples_use_explicit_node_ids_labels_and_morphisms() -> None:
    for path in (PROJECT / "examples").glob("*.json"):
        document = json.loads(path.read_text())
        for graph in [
            document["graph"],
            *[document["rule"][side] for side in ("L", "K", "R")],
        ]:
            assert "node_labels" not in graph, path.name
            assert all(
                isinstance(node, dict) and set(node) == {"id", "label"}
                for node in graph["nodes"]
            ), path.name
        assert "l" in document["rule"] and "r" in document["rule"], path.name
        parse_rule_input(document)
