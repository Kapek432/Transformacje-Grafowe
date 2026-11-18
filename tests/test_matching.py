import json
from pathlib import Path
from typing import Any

from graph_dpo.matching import dangling_edge, find_matches
from graph_dpo.models import Graph, Match
from graph_dpo.validation import parse_rule_input

PROJECT = Path(__file__).resolve().parents[1]


def _load(name: str) -> dict[str, Any]:
    return json.loads((PROJECT / "examples" / name).read_text(encoding="utf-8"))


def test_slide8_has_single_match() -> None:
    host, rule = parse_rule_input(_load("slide8.json"))

    assert find_matches(host, rule.left) == [
        Match(
            {"D": "D", "E": "E", "F": "F"},
            {"left-D-E": "D-E", "left-D-F": "D-F", "left-F-E": "F-E"},
        )
    ]


def test_dangling_edge_is_none_when_rule_applies() -> None:
    host, rule = parse_rule_input(_load("slide8.json"))
    [match] = find_matches(host, rule.left)

    assert dangling_edge(host, rule, match) is None


def test_dangling_edge_reports_blocking_edge() -> None:
    host, rule = parse_rule_input(_load("slide8_rejected.json"))
    [match] = find_matches(host, rule.left)

    assert dangling_edge(host, rule, match) == "E-C"


def test_loop_matches_only_loop() -> None:
    host = Graph(("a", "b"), {"l": ("a", "a"), "ab": ("a", "b")})
    left = Graph(("x",), {"e": ("x", "x")})

    assert find_matches(host, left) == [Match({"x": "a"}, {"e": "l"})]


def test_parallel_edges_give_separate_matches() -> None:
    host = Graph(("a", "b"), {"p1": ("a", "b"), "p2": ("a", "b")})
    single = Graph(("x", "y"), {"e": ("x", "y")})
    double = Graph(("x", "y"), {"e": ("x", "y"), "f": ("x", "y")})

    assert [m.edges for m in find_matches(host, single)] == [{"e": "p1"}, {"e": "p2"}]
    assert [m.edges for m in find_matches(host, double)] == [
        {"e": "p1", "f": "p2"},
        {"e": "p2", "f": "p1"},
    ]


def test_edge_direction_is_respected() -> None:
    host = Graph(("a", "b"), {"ab": ("a", "b")})
    left = Graph(("x", "y"), {"e": ("y", "x")})

    assert find_matches(host, left) == [Match({"x": "b", "y": "a"}, {"e": "ab"})]


def test_no_match_without_enough_nodes() -> None:
    assert find_matches(Graph(("a",), {}), Graph(("x", "y"), {})) == []


def test_empty_left_matches_once() -> None:
    assert find_matches(Graph(("a",), {}), Graph((), {})) == [Match({}, {})]


def test_limit() -> None:
    host = Graph(tuple("abcde"), {})
    left = Graph(("x", "y"), {})

    assert len(find_matches(host, left)) == 20
    assert len(find_matches(host, left, limit=3)) == 3