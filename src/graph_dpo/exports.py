import csv
import json
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

from openpyxl import Workbook

from .models import Applied, GraphData, Rejected


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
            ("etap", "id"),
            [(name, node) for name, graph in stages for node in graph["nodes"]],
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


def _write_csv(directory: Path, tables: list[Table]) -> None:
    for table in tables:
        with (directory / table.filename).open(
            "w", encoding="utf-8-sig", newline=""
        ) as file:
            writer = csv.writer(file, delimiter=";")
            writer.writerow(table.headers)
            writer.writerows([_csv_text(value) for value in row] for row in table.rows)


def _write_excel(path: Path, tables: list[Table]) -> None:
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
    workbook.save(path)


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
        (temporary / "output.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        if csv_export:
            _write_csv(temporary, tables)
        if excel_export:
            _write_excel(temporary / "wynik.xlsx", tables)
        for name in filenames:
            (temporary / name).replace(directory / name)
    return directory / "output.json"
