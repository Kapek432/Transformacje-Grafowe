import json
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .exports import EXPORT_FILENAMES, ExportFormat, export_bytes
from .matching import dangling_edge, find_matches
from .models import Applied, Graph, GraphData, Match, Rejected, Rule
from .rewrite import apply_dpo
from .validation import parse_rule_input

MATCH_LIMIT = 200
EXAMPLE_NAME = re.compile(r"[A-Za-z0-9_-]{1,64}")
MEDIA_TYPES: dict[ExportFormat, str] = {
    "json": "application/json",
    "csv": "application/zip",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _describe(host: Graph, rule: Rule, match: Match) -> dict[str, Any]:
    blocking = dangling_edge(host, rule, match)
    return {
        "nodes": match.nodes,
        "edges": match.edges,
        "applicable": blocking is None,
        "dangling_edge": blocking,
    }


def _difference(first: GraphData, second: GraphData) -> dict[str, list[str]]:
    nodes = {node["id"] for node in second["nodes"]}
    edges = {edge["id"] for edge in second["edges"]}
    return {
        "nodes": [node["id"] for node in first["nodes"] if node["id"] not in nodes],
        "edges": [edge["id"] for edge in first["edges"] if edge["id"] not in edges],
    }


def _changes(
    host: GraphData, result: Applied | Rejected
) -> dict[str, dict[str, list[str]]]:
    if "result_graph" not in result:
        empty: dict[str, list[str]] = {"nodes": [], "edges": []}
        return {"removed": empty, "added": empty}
    intermediate = result["intermediate_graph"]
    return {
        "removed": _difference(host, intermediate),
        "added": _difference(result["result_graph"], intermediate),
    }


def create_app(examples_dir: Path, static_dir: Path | None = None) -> FastAPI:
    """Build the web application with the DPO API and the optional frontend.

    Args:
        examples_dir: Directory with example documents read and written by the API.
        static_dir: Built frontend served at the root when the directory exists.

    Returns:
        The configured FastAPI application.
    """
    app = FastAPI(title="Transformacje grafowe DPO")
    # The API writes files, so a rebinding page must not reach it under another host name.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])

    @app.exception_handler(ValueError)
    async def invalid_input(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    def example_path(name: str) -> Path:
        if not EXAMPLE_NAME.fullmatch(name):
            raise HTTPException(
                400, "Nazwa przykładu może zawierać tylko litery, cyfry, _ i -."
            )
        return examples_dir / f"{name}.json"

    @app.get("/api/examples")
    def list_examples() -> list[str]:
        return sorted(
            path.stem
            for path in examples_dir.glob("*.json")
            if EXAMPLE_NAME.fullmatch(path.stem)
        )

    @app.get("/api/examples/{name}")
    def read_example(name: str) -> Any:
        path = example_path(name)
        if not path.is_file():
            raise HTTPException(404, "Nie ma takiego przykładu.")
        return json.loads(path.read_text(encoding="utf-8-sig"))

    @app.put("/api/examples/{name}", status_code=201)
    def save_example(
        name: str, document: dict[str, Any], overwrite: bool = False
    ) -> dict[str, str]:
        path = example_path(name)
        parse_rule_input(document)
        if path.exists() and not overwrite:
            raise HTTPException(409, "Przykład o tej nazwie już istnieje.")
        examples_dir.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return {"name": name}

    @app.post("/api/matches")
    def matches(document: dict[str, Any]) -> dict[str, Any]:
        host, rule = parse_rule_input(document)
        found = find_matches(host, rule.left, MATCH_LIMIT + 1)
        return {
            "matches": [_describe(host, rule, match) for match in found[:MATCH_LIMIT]],
            "truncated": len(found) > MATCH_LIMIT,
        }

    @app.post("/api/apply")
    def apply(document: dict[str, Any]) -> dict[str, Any]:
        host, result = apply_dpo(document)
        return {"host": host, "result": result, **_changes(host, result)}

    @app.post("/api/export/{fmt}")
    def export(fmt: ExportFormat, document: dict[str, Any]) -> Response:
        host, result = apply_dpo(document)
        filename = EXPORT_FILENAMES[fmt]
        return Response(
            export_bytes(host, result, fmt),
            media_type=MEDIA_TYPES[fmt],
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if static_dir is not None and static_dir.is_dir():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
    return app
