import io
import json
import zipfile
from pathlib import Path

import pytest
from openpyxl import load_workbook

from graph_dpo.exports import export_bytes
from graph_dpo.models import Applied, GraphData, Rejected
from graph_dpo.rewrite import apply_dpo

PROJECT = Path(__file__).resolve().parents[1]


def _result() -> tuple[GraphData, Applied | Rejected]:
    document = json.loads(
        (PROJECT / "examples/slide8.json").read_text(encoding="utf-8")
    )
    return apply_dpo(document)


def test_json_export() -> None:
    host, result = _result()

    assert json.loads(export_bytes(host, result, "json")) == result


def test_csv_export_is_zip_of_three_tables() -> None:
    host, result = _result()

    with zipfile.ZipFile(io.BytesIO(export_bytes(host, result, "csv"))) as archive:
        assert sorted(archive.namelist()) == [
            "krawedzie.csv",
            "status.csv",
            "wierzcholki.csv",
        ]
        status = archive.read("status.csv").decode("utf-8-sig").splitlines()
        assert status == ["status;powod;id_krawedzi", "applied;;"]


def test_excel_export() -> None:
    host, result = _result()

    workbook = load_workbook(io.BytesIO(export_bytes(host, result, "excel")))
    try:
        assert workbook.sheetnames == ["Wierzchołki", "Krawędzie", "Status"]
    finally:
        workbook.close()


def test_unknown_format_is_rejected() -> None:
    host, result = _result()

    with pytest.raises(ValueError, match="Nieznany format eksportu"):
        export_bytes(host, result, "pdf")  # type: ignore[arg-type]
