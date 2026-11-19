from .matching import dangling_edge, deleted_elements
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
    interface, right = rule.interface, rule.right
    blocking = dangling_edge(host, rule, match)
    if blocking is not None:
        return {"status": "rejected", "reason": "dangling_edge", "edge_id": blocking}
    removed_nodes, removed_edges = deleted_elements(rule, match)

    # The first square leaves the preserved interface and the host context in D.
    intermediate = Graph(
        tuple(node for node in host.nodes if node not in removed_nodes),
        {
            edge_id: ends
            for edge_id, ends in host.edges.items()
            if edge_id not in removed_edges
        },
        {
            node: label
            for node, label in host.labels.items()
            if node not in removed_nodes
        },
    )

    # The second square identifies the copy of K in R with its matched copy in D.
    right_nodes = {
        rule.right_map.nodes[node]: match.nodes[rule.left_map.nodes[node]]
        for node in interface.nodes
    }
    used_nodes = set(host.nodes)
    used_edges = set(host.edges)
    result_labels = intermediate.labels.copy()
    result_nodes = list(intermediate.nodes)
    result_edges = intermediate.edges.copy()
    for node in right.nodes:
        if node not in right_nodes:
            right_nodes[node] = _fresh(node, used_nodes)
            result_nodes.append(right_nodes[node])
            if node in right.labels:
                result_labels[right_nodes[node]] = right.labels[node]
            elif right_nodes[node] != node:
                result_labels[right_nodes[node]] = node
    for edge_id, (source, target) in right.edges.items():
        if edge_id not in rule.right_map.edges.values():
            result_edges[_fresh(edge_id, used_edges)] = (
                right_nodes[source],
                right_nodes[target],
            )

    return {
        "status": "applied",
        "intermediate_graph": intermediate.as_json(),
        "result_graph": Graph(
            tuple(result_nodes), result_edges, result_labels
        ).as_json(),
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
