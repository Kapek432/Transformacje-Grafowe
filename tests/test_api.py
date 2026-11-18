import io
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from graph_dpo.api import create_app

PROJECT = Path(__file__).resolve().parents[1]
EXPECTED_EXAMPLES = [
    "parallel_edges",
    "remove_leaf",
    "remove_loop",
    "remove_vertex_rejected",
    "reverse_edge",
    "slide8",
    "slide8_rejected",
    "subdivide_edge",
]


def _example(name: str) -> dict[str, Any]:
    path = PROJECT / "examples" / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture
def examples(tmp_path: Path) -> Path:
    directory = tmp_path / "examples"
    shutil.copytree(PROJECT / "examples", directory)
    return directory


@pytest.fixture
def client(examples: Path) -> TestClient:
    return TestClient(create_app(examples), base_url="http://127.0.0.1")


def test_lists_and_reads_examples(client: TestClient) -> None:
    assert client.get("/api/examples").json() == EXPECTED_EXAMPLES
    assert client.get("/api/examples/slide8").json() == _example("slide8")
    assert client.get("/api/examples/brak").status_code == 404
    assert client.get("/api/examples/zla.nazwa").status_code == 400


def test_saves_example_without_silent_overwrite(
    client: TestClient, examples: Path
) -> None:
    document = _example("slide8")

    assert client.put("/api/examples/nowy", json=document).status_code == 201
    saved = json.loads((examples / "nowy.json").read_text(encoding="utf-8"))
    assert saved == document
    assert client.put("/api/examples/nowy", json=document).status_code == 409
    response = client.put("/api/examples/nowy?overwrite=true", json=document)
    assert response.status_code == 201


def test_rejects_invalid_example(client: TestClient) -> None:
    response = client.put("/api/examples/zly", json={"graph": {}})

    assert response.status_code == 422
    assert "nodes" in response.json()["detail"]


def test_matches_report_applicability(client: TestClient) -> None:
    applied = client.post("/api/matches", json=_example("slide8")).json()
    rejected = client.post("/api/matches", json=_example("slide8_rejected")).json()

    assert applied["truncated"] is False
    assert [(m["applicable"], m["dangling_edge"]) for m in applied["matches"]] == [
        (True, None)
    ]
    # E-C creates a second copy of L (D->C, D->E, E->C) that can be applied.
    assert [(m["applicable"], m["dangling_edge"]) for m in rejected["matches"]] == [
        (True, None),
        (False, "E-C"),
    ]


def test_matches_are_truncated(client: TestClient) -> None:
    small = {"nodes": ["x", "y"], "edges": []}
    document = {
        "graph": {"nodes": [f"v{index}" for index in range(30)], "edges": []},
        "rule": {"L": small, "K": small, "R": small},
    }

    body = client.post("/api/matches", json=document).json()

    assert len(body["matches"]) == 200
    assert body["truncated"] is True


def test_apply_returns_changes(client: TestClient) -> None:
    body = client.post("/api/apply", json=_example("slide8")).json()

    assert body["result"]["status"] == "applied"
    assert body["removed"] == {"nodes": ["E"], "edges": ["D-E", "D-F", "F-E"]}
    assert body["added"] == {
        "nodes": ["M", "N"],
        "edges": ["D-N", "F-N", "N-M", "M-D", "M-F"],
    }


def test_apply_rejected_has_no_changes(client: TestClient) -> None:
    body = client.post("/api/apply", json=_example("slide8_rejected")).json()

    assert body["result"] == {
        "status": "rejected",
        "reason": "dangling_edge",
        "edge_id": "E-C",
    }
    assert body["removed"] == body["added"] == {"nodes": [], "edges": []}


def test_apply_reports_invalid_match(client: TestClient) -> None:
    document = _example("slide8")
    document["match"]["edges"]["left-D-E"] = "D-C"

    response = client.post("/api/apply", json=document)

    assert response.status_code == 422
    assert "nie zachowuje końców" in response.json()["detail"]


@pytest.mark.parametrize(
    ("fmt", "filename"),
    [("json", "output.json"), ("csv", "wynik.zip"), ("excel", "wynik.xlsx")],
)
def test_exports(client: TestClient, fmt: str, filename: str) -> None:
    response = client.post(f"/api/export/{fmt}", json=_example("slide8"))

    assert response.status_code == 200
    assert filename in response.headers["content-disposition"]
    if fmt == "csv":
        assert len(zipfile.ZipFile(io.BytesIO(response.content)).namelist()) == 3


def test_unknown_export_format(client: TestClient) -> None:
    response = client.post("/api/export/pdf", json=_example("slide8"))

    assert response.status_code == 422


def test_serves_frontend(examples: Path, tmp_path: Path) -> None:
    static = tmp_path / "dist"
    static.mkdir()
    (static / "index.html").write_text("<h1>DPO</h1>", encoding="utf-8")
    client = TestClient(create_app(examples, static), base_url="http://127.0.0.1")

    assert "DPO" in client.get("/").text
    assert client.get("/api/examples").status_code == 200


def test_rejects_foreign_host(client: TestClient) -> None:
    response = client.get("/api/examples", headers={"Host": "evil.example"})

    assert response.status_code == 400


def test_invalid_document_is_checked_before_overwrite_conflict(
    client: TestClient,
) -> None:
    response = client.put("/api/examples/slide8", json={"graph": {}})

    assert response.status_code == 422


def test_lists_only_valid_example_names(client: TestClient, examples: Path) -> None:
    (examples / "bad name.json").write_text("{}", encoding="utf-8")

    assert client.get("/api/examples").json() == EXPECTED_EXAMPLES
