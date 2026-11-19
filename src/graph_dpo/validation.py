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
    if "node_labels" in data:
        raise ValueError(
            f"{name}: usuń stare node_labels; każdy węzeł musi mieć pola id i label."
        )
    labels: dict[str, str] = {}
    parsed_nodes: list[str] = []
    for index, item in enumerate(raw_nodes):
        node = _object(item, f"{name}.nodes[{index}]")
        node_id = _id(node.get("id"), f"{name}.nodes[{index}].id")
        label = node.get("label")
        if (
            not isinstance(label, str)
            or len(label) > MAX_ID_LENGTH
            or not all(char.isprintable() for char in label)
        ):
            raise ValueError(
                f"Etykieta w {name} musi być drukowalnym tekstem o długości do {MAX_ID_LENGTH} znaków."
            )
        parsed_nodes.append(node_id)
        labels[node_id] = label
    nodes = tuple(parsed_nodes)
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
    return Graph(nodes, edges, labels)


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


def _morphism(value: object, interface: Graph, side: Graph, name: str) -> Match:
    data = _object(value, name)
    maps: list[dict[str, str]] = []
    for kind, source_ids, target_ids in (
        ("nodes", set(interface.nodes), set(side.nodes)),
        ("edges", set(interface.edges), set(side.edges)),
    ):
        raw = _object(data.get(kind), f"{name}.{kind}")
        if set(raw) != source_ids:
            raise ValueError(
                f"{name}.{kind} musi mapować dokładnie wszystkie identyfikatory z K."
            )
        mapping = {
            key: _id(target, f"{name}.{kind}.{key}") for key, target in raw.items()
        }
        if not set(mapping.values()) <= target_ids or len(set(mapping.values())) != len(
            mapping
        ):
            raise ValueError(
                f"{name}.{kind} musi wskazywać różne istniejące identyfikatory grafu docelowego."
            )
        maps.append(mapping)
    nodes, edges = maps
    for edge, (source, target) in interface.edges.items():
        if side.edges[edges[edge]] != (nodes[source], nodes[target]):
            raise ValueError(
                f"Morfizm {name} nie zachowuje końców krawędzi {edge!r} z K."
            )
    return Match(nodes, edges)


def _rule_map(
    data: dict[str, object], key: str, interface: Graph, side: Graph, side_name: str
) -> Match:
    if key in data:
        return _morphism(data[key], interface, side, f"rule.{key}")
    # Legacy files describe inclusions by equal ids, but their K remains authoritative.
    _validate_interface(interface, side, side_name)
    return Match(
        {node: node for node in interface.nodes},
        {edge: edge for edge in interface.edges},
    )


def parse_rule_input(document: object) -> tuple[Graph, Rule]:
    """Validate the host graph and rule from a JSON document, ignoring the match.

    Args:
        document: A decoded JSON document containing graph and rule.

    Returns:
        The host graph and the rule.

    Raises:
        ValueError: The input graph or rule is malformed.
    """
    data = _object(document, "wejście")
    host = _graph(data.get("graph"), "G")
    rule = _object(data.get("rule"), "rule")
    left, interface, right = (_graph(rule.get(name), name) for name in ("L", "K", "R"))
    left_map = _rule_map(rule, "l", interface, left, "L")
    right_map = _rule_map(rule, "r", interface, right, "R")
    return host, Rule(left, interface, right, left_map, right_map)


def parse_input(document: object) -> tuple[Graph, Rule, Match]:
    """Validate the host graph, rule, and injective match from a JSON document.

    Args:
        document: A decoded JSON document containing graph, rule, and match.

    Returns:
        The host graph, rule, and match used by the rewriting algorithm.

    Raises:
        ValueError: The input graph, rule, or match is malformed.
    """
    host, rule = parse_rule_input(document)
    match = _object(_object(document, "wejście").get("match"), "match")
    node_match = _mapping(
        match.get("nodes"), "match.nodes", set(rule.left.nodes), set(host.nodes)
    )
    edge_match = _mapping(
        match.get("edges"), "match.edges", set(rule.left.edges), set(host.edges)
    )
    for edge_id, (source, target) in rule.left.edges.items():
        if host.edges[edge_match[edge_id]] != (node_match[source], node_match[target]):
            raise ValueError(
                f"Dopasowanie nie zachowuje końców krawędzi {edge_id!r} z L."
            )

    return host, rule, Match(node_match, edge_match)
