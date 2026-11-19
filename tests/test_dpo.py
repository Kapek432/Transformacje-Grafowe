import csv
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from openpyxl import load_workbook

from dpo import apply_dpo

PROJECT = Path(__file__).resolve().parents[1]


@pytest.fixture
def document() -> dict[str, Any]:
    return json.loads((PROJECT / "examples/slide8.json").read_text(encoding="utf-8"))


def test_slide8(document: dict[str, Any]) -> None:
    host, result = apply_dpo(document)

    assert host == document["graph"]
    assert result["status"] == "applied"
    intermediate = result["intermediate_graph"]
    assert {node["id"] for node in intermediate["nodes"]} == {
        "C",
        "D",
        "F",
        "G",
        "H",
        "I",
    }
    context = {("D", "C"), ("F", "I"), ("G", "F"), ("H", "D"), ("H", "G")}
    assert {
        (edge["source"], edge["target"]) for edge in intermediate["edges"]
    } == context
    final = result["result_graph"]
    assert {node["id"] for node in final["nodes"]} == {
        "C",
        "D",
        "F",
        "G",
        "H",
        "I",
        "M",
        "N",
    }
    assert {(edge["source"], edge["target"]) for edge in final["edges"]} == context | {
        ("D", "N"),
        ("F", "N"),
        ("N", "M"),
        ("M", "D"),
        ("M", "F"),
    }


def test_extra_parallel_edge_blocks_deletion(document: dict[str, Any]) -> None:
    document["graph"]["edges"].append({"id": "extra", "source": "D", "target": "E"})

    _, result = apply_dpo(document)

    assert result == {
        "status": "rejected",
        "reason": "dangling_edge",
        "edge_id": "extra",
    }


def test_keeps_interface_edge_when_adding_parallel_edge(
    document: dict[str, Any],
) -> None:
    kept = {"id": "left-D-F", "source": "D", "target": "F"}
    document["rule"]["K"]["edges"].append(kept)
    document["rule"]["l"]["edges"]["left-D-F"] = "left-D-F"
    document["rule"]["r"]["edges"]["left-D-F"] = "left-D-F"
    document["rule"]["R"]["edges"].extend(
        [kept, {"id": "D-F", "source": "D", "target": "F"}]
    )
    document["graph"]["nodes"].append({"id": "M", "label": "M"})

    _, result = apply_dpo(document)

    final = result["result_graph"]
    assert {"M", "M_1"} <= {node["id"] for node in final["nodes"]}
    assert [
        edge["id"]
        for edge in final["edges"]
        if (edge["source"], edge["target"]) == ("D", "F")
    ] == ["D-F", "D-F_1"]


def test_rejects_incorrect_edge_mapping(document: dict[str, Any]) -> None:
    document["match"]["edges"]["left-D-E"] = "D-C"

    with pytest.raises(ValueError, match="nie zachowuje końców"):
        apply_dpo(document)


@pytest.mark.parametrize(
    ("example", "exit_code", "status", "stages"),
    [
        ("slide8.json", 0, "applied", {"wejściowy", "pośredni", "wynikowy"}),
        ("slide8_rejected.json", 3, "rejected", {"wejściowy"}),
    ],
)
def test_cli_exports(
    tmp_path: Path, example: str, exit_code: int, status: str, stages: set[str]
) -> None:
    completed = subprocess.run(
        [
            sys.executable,
            str(PROJECT / "dpo.py"),
            str(PROJECT / "examples" / example),
            "--output-dir",
            str(tmp_path),
            "--csv",
            "--excel",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == exit_code, completed.stderr
    result = json.loads((tmp_path / "output.json").read_text(encoding="utf-8"))
    assert result["status"] == status

    with (tmp_path / "wierzcholki.csv").open(encoding="utf-8-sig", newline="") as file:
        assert {row["etap"] for row in csv.DictReader(file, delimiter=";")} == stages
    workbook = load_workbook(tmp_path / "wynik.xlsx", read_only=True)
    try:
        assert workbook.sheetnames == ["Wierzchołki", "Krawędzie", "Status"]
        for sheet, filename in zip(
            workbook, ("wierzcholki.csv", "krawedzie.csv", "status.csv"), strict=True
        ):
            with (tmp_path / filename).open(encoding="utf-8-sig", newline="") as file:
                assert list(csv.reader(file, delimiter=";")) == [
                    [value if value is not None else "" for value in row]
                    for row in sheet.values
                ]
    finally:
        workbook.close()
