import itertools
import unittest

import networkx as nx
import numpy as np

from experimento import (
    TOLERANCE,
    add_candidate,
    candidate_edges,
    graph_summary,
    interactive_experiment,
    laplacian_state,
    make_topologies,
    resistance_update_formula,
)


class EffectiveResistanceTests(unittest.TestCase):
    def test_path_and_cycle_four_nodes_have_exact_kirchhoff_values(self):
        path = nx.path_graph(4)
        path_state = laplacian_state(path)
        self.assertAlmostEqual(path_state["kirchhoff"], 10.0, delta=TOLERANCE)
        self.assertAlmostEqual(path_state["resistances"][0, 3], 3.0, delta=TOLERANCE)

        cycle = add_candidate(path, (0, 3))
        cycle_state = laplacian_state(cycle)
        self.assertAlmostEqual(cycle_state["kirchhoff"], 5.0, delta=TOLERANCE)
        self.assertAlmostEqual(cycle_state["resistances"][0, 3], 0.75, delta=TOLERANCE)

    def test_any_positive_added_conductance_does_not_increase_resistances(self):
        graph = nx.path_graph(7)
        base = laplacian_state(graph)
        graph.add_edge(0, 6, conductance=0.7)
        changed = laplacian_state(graph)
        self.assertTrue(np.all(changed["resistances"] <= base["resistances"] + TOLERANCE))
        self.assertGreaterEqual(changed["lambda2"] + TOLERANCE, base["lambda2"])

    def test_rank_one_update_matches_direct_pseudoinverse_for_every_pair(self):
        graph = nx.cycle_graph(6)
        for _, _, data in graph.edges(data=True):
            data["conductance"] = 0.8
        base = laplacian_state(graph)
        expected = resistance_update_formula(base, 0, 3, conductance=1.7)
        graph.add_edge(0, 3, conductance=1.7)
        actual = laplacian_state(graph)["resistances"]
        np.testing.assert_allclose(expected, actual, rtol=1e-10, atol=1e-10)

    def test_kirchhoff_index_matches_spectral_identity(self):
        graphs, _ = make_topologies()
        for graph in [nx.path_graph(5), nx.cycle_graph(7), *graphs.values()]:
            state = laplacian_state(graph)
            spectral = graph.number_of_nodes() * np.sum(1.0 / state["nonzero_eigenvalues"])
            self.assertAlmostEqual(state["kirchhoff"], float(spectral), delta=1e-8)

    def test_algebraic_connectivity_never_decreases_for_candidate_edges(self):
        graph = nx.path_graph(6)
        baseline = graph_summary(graph)
        for edge in candidate_edges(graph):
            changed = laplacian_state(add_candidate(graph, edge))
            self.assertGreaterEqual(changed["lambda2"] + TOLERANCE, baseline["lambda2"])

    def test_random_candidate_selection_is_reproducible(self):
        graph = nx.path_graph(8)
        choices = candidate_edges(graph)
        first = [choices[int(np.random.default_rng(seed).integers(len(choices)))] for seed in range(30)]
        second = [choices[int(np.random.default_rng(seed).integers(len(choices)))] for seed in range(30)]
        self.assertEqual(first, second)

    def test_topologies_are_connected_and_have_fixed_documented_sizes(self):
        graphs, seed = make_topologies()
        self.assertGreaterEqual(seed, 20261104)
        expected_edges = {"Camino": 15, "Ciclo": 16, "Comunidades": 19, "Aleatorio conectado": 24}
        for name, graph in graphs.items():
            self.assertEqual(graph.number_of_nodes(), 16)
            self.assertEqual(graph.number_of_edges(), expected_edges[name])
            self.assertTrue(nx.is_connected(graph))
            self.assertTrue(all(data["conductance"] > 0 for _, _, data in graph.edges(data=True)))

    def test_interactive_candidate_table_covers_every_absent_edge(self):
        data = interactive_experiment()
        existing = {frozenset(edge) for edge in data["edges"]}
        expected = {
            frozenset(pair)
            for pair in itertools.combinations([node["id"] for node in data["nodes"]], 2)
            if frozenset(pair) not in existing
        }
        actual = {frozenset((item["u"], item["v"])) for item in data["candidates"]}
        self.assertEqual(actual, expected)
        self.assertEqual(len(data["resistances"]), 8)
        for candidate in data["candidates"]:
            self.assertEqual(len(candidate["resistances"]), 8)


if __name__ == "__main__":
    unittest.main()
