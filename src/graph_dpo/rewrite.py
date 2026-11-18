from .models import MAX_ID_LENGTH, Applied, Graph, GraphData, Match, Rejected, Rule
from .validation import parse_input


def _fresh(preferred: str, used: set[str]) -> str:
    candidate = preferred
    number = 1
    while candidate in used:
        suffix = f"_{number}"
        candidate = preferred[: MAX_ID_LENGTH - len(suffix)] + suffix
        number += 1
    used.add(candidate)
    return candidate


def _rewrite(host: Graph, rule: Rule, match: Match) -> Applied | Rejected:
    left, interface, right = rule.left, rule.interface, rule.right
    removed_nodes = {
        match.nodes[node] for node in set(left.nodes) - set(interface.nodes)
    }
    removed_edges = {
        match.edges[edge] for edge in left.edges.keys() - interface.edges.keys()
    }
    for edge_id, (source, target) in host.edges.items():
        if edge_id not in removed_edges and (
            source in removed_nodes or target in removed_nodes
        ):
            return {"status": "rejected", "reason": "dangling_edge", "edge_id": edge_id}

    # The first square leaves the preserved interface and the host context in D.
    intermediate = Graph(
        tuple(node for node in host.nodes if node not in removed_nodes),
        {
            edge_id: ends
            for edge_id, ends in host.edges.items()
            if edge_id not in removed_edges
        },
    )

    # The second square identifies the copy of K in R with its matched copy in D.
    right_nodes = {node: match.nodes[node] for node in interface.nodes}
    used_nodes = set(host.nodes)
    used_edges = set(host.edges)
    result_nodes = list(intermediate.nodes)
    result_edges = intermediate.edges.copy()
    for node in right.nodes:
        if node not in right_nodes:
            right_nodes[node] = _fresh(node, used_nodes)
            result_nodes.append(right_nodes[node])
    for edge_id, (source, target) in right.edges.items():
        if edge_id not in interface.edges:
            result_edges[_fresh(edge_id, used_edges)] = (
                right_nodes[source],
                right_nodes[target],
            )

    return {
        "status": "applied",
        "intermediate_graph": intermediate.as_json(),
        "result_graph": Graph(tuple(result_nodes), result_edges).as_json(),
    }


def apply_dpo(document: object) -> tuple[GraphData, Applied | Rejected]:
    """Validate input and apply one DPO rule with an injective match.

    Args:
        document: A decoded JSON document containing graph, rule, and match.

    Returns:
        The normalized host graph and the transformation result.

    Raises:
        ValueError: The input graph, rule, or match is malformed.
    """
    host, rule, match = parse_input(document)
    return host.as_json(), _rewrite(host, rule, match)
