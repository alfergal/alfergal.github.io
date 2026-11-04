#!/usr/bin/env python3
"""Verify the published numerical data and generated SVG figures."""
from __future__ import annotations

import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path

import networkx as nx
import numpy as np

from experimento import (
    HERE,
    RANDOM_SEED_START,
    TOLERANCE,
    add_candidate,
    candidate_edges,
    laplacian_state,
    resistance_update_formula,
)


def verify() -> None:
    results = json.loads((HERE / "resultados.json").read_text(encoding="utf-8"))
    assert results["experiment"] == "effective-resistance-single-edge"
    assert results["configuration"]["node_count"] == 16

    path = nx.path_graph(4)
    path_state = laplacian_state(path)
    cycle_state = laplacian_state(add_candidate(path, (0, 3)))
    assert math.isclose(path_state["kirchhoff"], 10.0, abs_tol=TOLERANCE)
    assert math.isclose(path_state["resistances"][0, 3], 3.0, abs_tol=TOLERANCE)
    assert math.isclose(cycle_state["kirchhoff"], 5.0, abs_tol=TOLERANCE)
    assert math.isclose(cycle_state["resistances"][0, 3], 0.75, abs_tol=TOLERANCE)

    for name, item in results["topologies"].items():
        graph = nx.Graph()
        graph.add_nodes_from(range(item["baseline"]["nodes"]))
        graph.add_edges_from((u, v, {"conductance": 1.0}) for u, v in item["edge_list"])
        base = laplacian_state(graph)
        assert math.isclose(base["kirchhoff"], item["baseline"]["kirchhoff"], rel_tol=1e-9)
        assert math.isclose(base["lambda2"], item["baseline"]["lambda2"], rel_tol=1e-9)
        assert np.allclose(base["resistances"], item["baseline_resistances"], atol=1e-9)
        spectral = graph.number_of_nodes() * np.sum(1.0 / base["nonzero_eigenvalues"])
        assert math.isclose(float(spectral), base["kirchhoff"], rel_tol=1e-9)

        for strategy in ("maximum_geodesic", "maximum_kirchhoff_reduction"):
            record = item[strategy]
            edge = tuple(record["edge"])
            assert edge in candidate_edges(graph)
            changed = laplacian_state(add_candidate(graph, edge))
            assert math.isclose(changed["kirchhoff"], record["kirchhoff"], rel_tol=1e-9)
            assert math.isclose(changed["lambda2"], record["lambda2"], rel_tol=1e-9)
            assert record["kirchhoff"] <= base["kirchhoff"] + TOLERANCE
            assert record["lambda2"] + TOLERANCE >= base["lambda2"]
            expected_kf_change = 100.0 * (base["kirchhoff"] - changed["kirchhoff"]) / base["kirchhoff"]
            expected_lambda_change = 100.0 * (changed["lambda2"] - base["lambda2"]) / base["lambda2"]
            assert math.isclose(expected_kf_change, record["kirchhoff_reduction_pct"], abs_tol=1e-8)
            assert math.isclose(expected_lambda_change, record["lambda2_change_pct"], abs_tol=1e-8)
            assert record["selection_ms"] >= 0 and record["recalculation_ms"] >= 0

        lengths = dict(nx.all_pairs_shortest_path_length(graph))
        candidates = candidate_edges(graph)
        maximum_distance = max(lengths[u][v] for u, v in candidates)
        expected_geodesic = next(edge for edge in candidates if lengths[edge[0]][edge[1]] == maximum_distance)
        assert item["maximum_geodesic"]["edge"] == list(expected_geodesic)
        assert item["maximum_geodesic"]["geodesic_distance"] == maximum_distance

        exhaustive = []
        for edge in candidates:
            changed = laplacian_state(add_candidate(graph, edge))
            exhaustive.append((base["kirchhoff"] - changed["kirchhoff"], edge))
        best_change = max(value for value, _ in exhaustive)
        expected_optimum = min(edge for value, edge in exhaustive if abs(value - best_change) <= TOLERANCE)
        assert item["maximum_kirchhoff_reduction"]["edge"] == list(expected_optimum)
        assert item["maximum_kirchhoff_reduction"]["candidates_evaluated"] == len(candidates)

        random = item["random"]
        assert random["n_draws"] == len(random["draws"]) == 50
        random_values = []
        for offset, record in enumerate(random["draws"]):
            assert record["seed"] == RANDOM_SEED_START + offset
            edge = tuple(record["edge"])
            assert edge in candidates
            changed = laplacian_state(add_candidate(graph, edge))
            assert math.isclose(changed["kirchhoff"], record["kirchhoff"], rel_tol=1e-9)
            assert math.isclose(changed["lambda2"], record["lambda2"], rel_tol=1e-9)
            expected_kf_change = 100.0 * (base["kirchhoff"] - changed["kirchhoff"]) / base["kirchhoff"]
            expected_lambda_change = 100.0 * (changed["lambda2"] - base["lambda2"]) / base["lambda2"]
            assert math.isclose(expected_kf_change, record["kirchhoff_reduction_pct"], abs_tol=1e-8)
            assert math.isclose(expected_lambda_change, record["lambda2_change_pct"], abs_tol=1e-8)
            assert record["selection_ms"] >= 0 and record["recalculation_ms"] >= 0
            random_values.append(expected_kf_change)
        assert math.isclose(float(np.mean(random_values)), random["mean_reduction_pct"], abs_tol=1e-8)
        assert math.isclose(float(np.std(random_values, ddof=1)), random["sd_reduction_pct"], abs_tol=1e-8)
        assert math.isclose(float(np.quantile(random_values, 0.025)), random["q025_reduction_pct"], abs_tol=1e-8)
        assert math.isclose(float(np.quantile(random_values, 0.975)), random["q975_reduction_pct"], abs_tol=1e-8)

    interactive = results["interactive"]
    nodes = list("ABCDEFGH")
    graph = nx.Graph()
    graph.add_nodes_from(range(8))
    graph.add_edges_from((nodes.index(a), nodes.index(b), {"conductance": 1.0}) for a, b in interactive["edges"])
    base = laplacian_state(graph)
    assert math.isclose(base["kirchhoff"], interactive["kirchhoff"], rel_tol=1e-9)
    assert np.allclose(base["resistances"], interactive["resistances"], atol=1e-9)
    for candidate in interactive["candidates"]:
        changed_graph = graph.copy()
        changed_graph.add_edge(nodes.index(candidate["u"]), nodes.index(candidate["v"]), conductance=1.0)
        changed = laplacian_state(changed_graph)
        assert math.isclose(changed["kirchhoff"], candidate["kirchhoff"], rel_tol=1e-9)
        assert math.isclose(changed["lambda2"], candidate["lambda2"], rel_tol=1e-9)
        assert np.allclose(changed["resistances"], candidate["resistances"], atol=1e-9)
        formula = resistance_update_formula(base, nodes.index(candidate["u"]), nodes.index(candidate["v"]))
        assert np.allclose(formula, changed["resistances"], atol=1e-9)

    for filename in ("01-estrategias-kirchhoff.svg", "02-matriz-resistencias.svg"):
        svg = (HERE / "figures" / filename).read_text(encoding="utf-8")
        root = ET.fromstring(svg)
        assert root.tag.endswith("svg")
        labels = [node.text or "" for node in root.iter() if node.tag.endswith("text")]
        assert labels, f"No accessible, selectable SVG labels in {filename}"
        assert all(not label.endswith((" ", "\t")) for label in labels)
        assert not any(node.tag.endswith("script") for node in root.iter())

    print("Verified P4/C4 identities, spectra, strategy results, interactive lookup and SVGs.")


if __name__ == "__main__":
    verify()
