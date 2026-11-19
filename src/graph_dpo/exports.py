import csv
import io
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Literal

from openpyxl import Workbook

from .models import Applied, GraphData, Rejected

ExportFormat = Literal["json", "csv", "excel"]
EXPORT_FILENAMES: dict[ExportFormat, str] = {
    "json": "output.json",
    "csv": "wynik.zip",
    "excel": "wynik.xlsx",
}


@dataclass
class Table:
    filename: str
    title: str
    headers: tuple[str, ...]
    rows: list[tuple[str, ...]]


def _tables(host: GraphData, result: Applied | Rejected) -> list[Table]:
    stages = [("wejściowy", host)]
    if "intermediate_graph" in result:
        stages.extend(
            [
                ("pośredni", result["intermediate_graph"]),
                ("wynikowy", result["result_graph"]),
            ]
        )
    return [
        Table(
            "wierzcholki.csv",
            "Wierzchołki",
            ("etap", "id", "etykieta"),
            [
                (name, node["id"], node["label"])
                for name, graph in stages
                for node in graph["nodes"]
            ],
        ),
        Table(
            "krawedzie.csv",
            "Krawędzie",
            ("etap", "id", "zrodlo", "cel"),
            [
                (name, edge["id"], edge["source"], edge["target"])
                for name, graph in stages
                for edge in graph["edges"]
            ],
        ),
        Table(
            "status.csv",
            "Status",
            ("status", "powod", "id_krawedzi"),
            [(result["status"], result.get("reason", ""), result.get("edge_id", ""))],
        ),
    ]


def _csv_text(value: str) -> str:
    # Keep spreadsheet programs from evaluating identifiers as formulas.
    return "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) else value


def _json_bytes(result: Applied | Rejected) -> bytes:
    return (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def _csv_bytes(table: Table) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(table.headers)
    writer.writerows([_csv_text(value) for value in row] for row in table.rows)
    return buffer.getvalue().encode("utf-8-sig")


def _excel_bytes(tables: list[Table]) -> bytes:
    workbook = Workbook()
    workbook.remove(workbook.active)
    for table in tables:
        sheet = workbook.create_sheet(table.title)
        sheet.append(table.headers)
        for row_number, row in enumerate(table.rows, start=2):
            for column, value in enumerate(row, start=1):
                sheet.cell(row=row_number, column=column, value=value).data_type = "s"
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _zip_bytes(tables: list[Table]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for table in tables:
            archive.writestr(table.filename, _csv_bytes(table))
    return buffer.getvalue()


def export_bytes(
    host: GraphData, result: Applied | Rejected, fmt: ExportFormat
) -> bytes:
    """Render the transformation result as the content of a downloadable file.

    Args:
        host: The normalized input graph.
        result: The transformation result.
        fmt: "json" for output.json, "csv" for a zip with three tables,
            "excel" for wynik.xlsx.

    Returns:
        The file content.

    Raises:
        ValueError: If the format is unknown.
    """
    if fmt == "json":
        return _json_bytes(result)
    if fmt not in ("csv", "excel"):
        raise ValueError(f"Nieznany format eksportu: {fmt}")
    tables = _tables(host, result)
    return _zip_bytes(tables) if fmt == "csv" else _excel_bytes(tables)


def write_outputs(
    source: Path,
    directory: Path,
    host: GraphData,
    result: Applied | Rejected,
    *,
    csv_export: bool,
    excel_export: bool,
) -> Path:
    """Write the JSON result and requested exports, then return the JSON path."""
    tables = _tables(host, result)
    exports = [table.filename for table in tables] if csv_export else []
    if excel_export:
        exports.append("wynik.xlsx")
    filenames = [*exports, "output.json"]
    destinations = [directory / name for name in filenames]
    if source.resolve() in {path.resolve() for path in destinations}:
        raise ValueError("Plik wejściowy nie może być jednocześnie plikiem wyjściowym.")
    if any(path.is_dir() for path in destinations):
        raise ValueError("Ścieżka pliku wyjściowego wskazuje katalog.")

    directory.mkdir(parents=True, exist_ok=True)
    # Generate all requested formats before replacing the results of a previous run.
    with TemporaryDirectory(dir=directory) as staging:
        temporary = Path(staging)
        (temporary / "output.json").write_bytes(_json_bytes(result))
        if csv_export:
            for table in tables:
                (temporary / table.filename).write_bytes(_csv_bytes(table))
        if excel_export:
            (temporary / "wynik.xlsx").write_bytes(_excel_bytes(tables))
        for name in filenames:
            (temporary / name).replace(directory / name)
    return directory / "output.json"
