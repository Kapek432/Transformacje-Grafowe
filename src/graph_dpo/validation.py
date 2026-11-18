from .models import MAX_ID_LENGTH, Graph, Match, Rule


class InputError(ValueError):
    """The JSON document does not conform to the DPO input format."""


def _object(value: object, name: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise InputError(f"{name} musi być obiektem JSON.")
    return value


def _id(value: object, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{name} musi być niepustym identyfikatorem tekstowym.")
    if not all(char.isprintable() for char in value) or len(value) > MAX_ID_LENGTH:
        raise ValueError(f"{name} zawiera niedrukowalne znaki lub jest za długi.")
    return value


def _graph(value: object, name: str) -> Graph:
    data = _object(value, name)
    raw_nodes, raw_edges = data.get("nodes"), data.get("edges")
    if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
        raise InputError(f"{name} musi zawierać listy nodes i edges.")
    nodes = tuple(_id(node, f"{name}.nodes") for node in raw_nodes)
    node_ids = set(nodes)
    if len(node_ids) != len(nodes):
        raise ValueError(f"{name} zawiera powtórzony identyfikator wierzchołka.")

    edges: dict[str, tuple[str, str]] = {}
    for index, item in enumerate(raw_edges):
        path = f"{name}.edges[{index}]"
        edge = _object(item, path)
        edge_id = _id(edge.get("id"), f"{path}.id")
        source = _id(edge.get("source"), f"{path}.source")
        target = _id(edge.get("target"), f"{path}.target")
        if edge_id in edges:
            raise ValueError(f"{name} zawiera powtórzoną krawędź {edge_id!r}.")
        if source not in node_ids or target not in node_ids:
            raise ValueError(f"Krawędź {edge_id!r} w {name} ma nieistniejący koniec.")
        edges[edge_id] = (source, target)
    return Graph(nodes, edges)


def _validate_interface(interface: Graph, side: Graph, side_name: str) -> None:
    if not set(interface.nodes).issubset(side.nodes):
        raise ValueError(f"Każdy wierzchołek K musi występować w {side_name}.")
    for edge_id, ends in interface.edges.items():
        if side.edges.get(edge_id) != ends:
            raise ValueError(
                f"Krawędź {edge_id!r} z K musi mieć te same końce w {side_name}."
            )


def _mapping(
    value: object, name: str, expected_keys: set[str], allowed_values: set[str]
) -> dict[str, str]:
    raw = _object(value, name)
    if raw.keys() != expected_keys:
        raise ValueError(f"{name} musi mapować dokładnie wszystkie identyfikatory z L.")
    mapping = {key: _id(target, f"{name}.{key}") for key, target in raw.items()}
    targets = set(mapping.values())
    if not targets <= allowed_values or len(targets) != len(mapping):
        raise ValueError(f"{name} musi wskazywać różne istniejące identyfikatory w G.")
    return mapping


def parse_input(document: object) -> tuple[Graph, Rule, Match]:
    """Validate the host graph, rule, and injective match from a JSON document.

    Args:
        document: A decoded JSON document containing graph, rule, and match.

    Returns:
        The host graph, rule, and match used by the rewriting algorithm.

    Raises:
        ValueError: The input graph, rule, or match is malformed.
    """
    data = _object(document, "wejście")
    host = _graph(data.get("graph"), "G")
    rule = _object(data.get("rule"), "rule")
    left, interface, right = (_graph(rule.get(name), name) for name in ("L", "K", "R"))
    _validate_interface(interface, left, "L")
    _validate_interface(interface, right, "R")

    match = _object(data.get("match"), "match")
    node_match = _mapping(
        match.get("nodes"), "match.nodes", set(left.nodes), set(host.nodes)
    )
    edge_match = _mapping(
        match.get("edges"), "match.edges", set(left.edges), set(host.edges)
    )
    for edge_id, (source, target) in left.edges.items():
        if host.edges[edge_match[edge_id]] != (node_match[source], node_match[target]):
            raise ValueError(
                f"Dopasowanie nie zachowuje końców krawędzi {edge_id!r} z L."
            )

    return host, Rule(left, interface, right), Match(node_match, edge_match)
