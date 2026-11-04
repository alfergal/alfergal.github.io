#!/usr/bin/env python3
"""Reproducible effective-resistance experiments for the article draft."""
from __future__ import annotations

import argparse
import itertools
import json
import os
import platform
import time
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib-resistencia-efectiva")

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import scipy
from matplotlib.colors import LinearSegmentedColormap

HERE = Path(__file__).resolve().parent
FIGURES = HERE / "figures"
N = 16
RANDOM_DRAWS = 50
RANDOM_SEED_START = 20261105
RANDOM_GRAPH_SEED = 20261104
TOLERANCE = 1e-10

COLORS = {
    "navy": "#080F26",
    "white": "#F8FAFF",
    "blue": "#A9D6F5",
    "pink": "#F2A7C6",
    "muted": "#BAC5D5",
}

plt.rcParams.update({
    "font.family": "serif",
    "font.size": 9,
    "axes.titlesize": 10,
    "axes.labelsize": 9,
    "legend.fontsize": 8,
    "figure.facecolor": "none",
    "axes.facecolor": "none",
    "savefig.facecolor": "none",
    "text.color": COLORS["white"],
    "axes.labelcolor": COLORS["white"],
    "axes.edgecolor": "#78849A",
    "xtick.color": COLORS["muted"],
    "ytick.color": COLORS["muted"],
    "svg.hashsalt": "alfergal-effective-resistance-v1",
    "svg.fonttype": "none",
})


def laplacian_state(graph: nx.Graph) -> dict[str, object]:
    """Return L, L+, pair resistances and non-zero Laplacian eigenvalues."""
    if graph.is_directed() or graph.is_multigraph() or nx.number_of_selfloops(graph):
        raise ValueError("Expected a simple, undirected graph without self-loops")
    if not nx.is_connected(graph):
        raise ValueError("Effective resistance requires a connected graph")
    nodes = sorted(graph.nodes)
    if any(float(data.get("conductance", 1.0)) <= 0 for _, _, data in graph.edges(data=True)):
        raise ValueError("Every edge conductance must be positive")

    laplacian = nx.laplacian_matrix(
        graph, nodelist=nodes, weight="conductance"
    ).toarray().astype(np.float64, copy=False)
    eigenvalues, eigenvectors = np.linalg.eigh(laplacian)
    threshold = TOLERANCE * max(1.0, float(np.max(np.abs(eigenvalues))))
    positive = eigenvalues > threshold
    if int(np.count_nonzero(positive)) != len(nodes) - 1:
        raise ValueError("Graph Laplacian does not have exactly one zero eigenvalue")
    inverse = (eigenvectors[:, positive] / eigenvalues[positive]) @ eigenvectors[:, positive].T
    diagonal = np.diag(inverse)
    resistances = np.maximum(diagonal[:, None] + diagonal[None, :] - 2 * inverse, 0.0)
    np.fill_diagonal(resistances, 0.0)
    nonzero = eigenvalues[positive]
    return {
        "nodes": nodes,
        "laplacian": laplacian,
        "pseudoinverse": inverse,
        "resistances": resistances,
        "eigenvalues": eigenvalues,
        "nonzero_eigenvalues": nonzero,
        "lambda2": float(nonzero[0]),
        "kirchhoff": float(np.sum(np.triu(resistances, 1))),
    }


def resistance_update_formula(
    state: dict[str, object], u: int, v: int, conductance: float = 1.0
) -> np.ndarray:
    """Apply the exact rank-one resistance update for one added edge."""
    if conductance <= 0:
        raise ValueError("Added edge conductance must be positive")
    nodes = state["nodes"]
    index = {node: position for position, node in enumerate(nodes)}
    b = np.zeros(len(nodes), dtype=np.float64)
    b[index[u]], b[index[v]] = 1.0, -1.0
    inverse = state["pseudoinverse"]
    cross = inverse @ b
    denominator = 1.0 + conductance * float(b @ cross)
    updated = state["resistances"] - conductance * np.square(cross[:, None] - cross[None, :]) / denominator
    updated = np.maximum(updated, 0.0)
    np.fill_diagonal(updated, 0.0)
    return updated


def graph_summary(graph: nx.Graph) -> dict[str, object]:
    state = laplacian_state(graph)
    return {
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "kirchhoff": state["kirchhoff"],
        "lambda2": state["lambda2"],
        "resistances": state["resistances"],
    }


def candidate_edges(graph: nx.Graph) -> list[tuple[int, int]]:
    nodes = sorted(graph.nodes)
    return [
        (u, v)
        for u, v in itertools.combinations(nodes, 2)
        if not graph.has_edge(u, v)
    ]


def add_candidate(graph: nx.Graph, edge: tuple[int, int]) -> nx.Graph:
    result = graph.copy()
    result.add_edge(*edge, conductance=1.0)
    return result


def evaluate_candidate(
    graph: nx.Graph,
    edge: tuple[int, int],
    baseline: dict[str, object],
    selection_seconds: float,
) -> dict[str, object]:
    started = time.perf_counter()
    updated_graph = add_candidate(graph, edge)
    updated = laplacian_state(updated_graph)
    calculation_seconds = time.perf_counter() - started
    base_kf = float(baseline["kirchhoff"])
    new_kf = float(updated["kirchhoff"])
    base_lambda = float(baseline["lambda2"])
    new_lambda = float(updated["lambda2"])
    return {
        "edge": list(edge),
        "kirchhoff": new_kf,
        "kirchhoff_reduction": base_kf - new_kf,
        "kirchhoff_reduction_pct": 100.0 * (base_kf - new_kf) / base_kf,
        "lambda2": new_lambda,
        "lambda2_change_pct": 100.0 * (new_lambda - base_lambda) / base_lambda,
        "selection_ms": selection_seconds * 1000.0,
        "recalculation_ms": calculation_seconds * 1000.0,
    }


def strategies(graph: nx.Graph) -> dict[str, object]:
    baseline = graph_summary(graph)
    candidates = candidate_edges(graph)
    if not candidates:
        raise ValueError("Each experiment graph needs at least one absent edge")

    random_rows: list[dict[str, object]] = []
    for seed in range(RANDOM_SEED_START, RANDOM_SEED_START + RANDOM_DRAWS):
        started = time.perf_counter()
        rng = np.random.default_rng(seed)
        edge = candidates[int(rng.integers(0, len(candidates)))]
        selection_seconds = time.perf_counter() - started
        row = evaluate_candidate(graph, edge, baseline, selection_seconds)
        row["seed"] = seed
        random_rows.append(row)

    started = time.perf_counter()
    distances = dict(nx.all_pairs_shortest_path_length(graph))
    maximum_distance = max(distances[u][v] for u, v in candidates)
    geodesic_edge = next(
        edge for edge in candidates if distances[edge[0]][edge[1]] == maximum_distance
    )
    geodesic_seconds = time.perf_counter() - started
    geodesic = evaluate_candidate(graph, geodesic_edge, baseline, geodesic_seconds)
    geodesic["geodesic_distance"] = int(maximum_distance)

    started = time.perf_counter()
    scored = []
    for edge in candidates:
        state = laplacian_state(add_candidate(graph, edge))
        scored.append((float(baseline["kirchhoff"]) - float(state["kirchhoff"]), edge))
    best_reduction = max(reduction for reduction, _ in scored)
    optimal_edge = min(edge for reduction, edge in scored if abs(reduction - best_reduction) <= TOLERANCE)
    exhaustive_seconds = time.perf_counter() - started
    optimal = evaluate_candidate(graph, optimal_edge, baseline, exhaustive_seconds)
    optimal["candidates_evaluated"] = len(candidates)

    values = np.asarray([float(row["kirchhoff_reduction_pct"]) for row in random_rows])
    baseline_resistances = np.asarray(baseline.pop("resistances"))
    return {
        "baseline": baseline,
        "baseline_resistances": baseline_resistances.tolist(),
        "random": {
            "n_draws": RANDOM_DRAWS,
            "mean_reduction_pct": float(np.mean(values)),
            "sd_reduction_pct": float(np.std(values, ddof=1)),
            "q025_reduction_pct": float(np.quantile(values, 0.025)),
            "q975_reduction_pct": float(np.quantile(values, 0.975)),
            "draws": random_rows,
        },
        "maximum_geodesic": geodesic,
        "maximum_kirchhoff_reduction": optimal,
        "candidate_count": len(candidates),
    }


def make_topologies() -> tuple[dict[str, nx.Graph], int]:
    path = nx.path_graph(N)
    cycle = nx.cycle_graph(N)

    communities = nx.Graph()
    communities.add_nodes_from(range(N))
    for start in range(0, N, 4):
        members = range(start, start + 4)
        communities.add_edges_from(
            (node, start + ((node - start + 1) % 4), {"conductance": 1.0})
            for node in members
        )
    communities.add_edges_from(
        [(3, 4, {"conductance": 1.0}), (7, 8, {"conductance": 1.0}), (11, 12, {"conductance": 1.0})]
    )

    selected_seed = RANDOM_GRAPH_SEED
    while True:
        random_graph = nx.gnm_random_graph(N, 24, seed=selected_seed)
        if nx.is_connected(random_graph):
            break
        selected_seed += 1
    for _, _, data in random_graph.edges(data=True):
        data["conductance"] = 1.0

    for graph in (path, cycle):
        for _, _, data in graph.edges(data=True):
            data["conductance"] = 1.0

    return {
        "Camino": path,
        "Ciclo": cycle,
        "Comunidades": communities,
        "Aleatorio conectado": random_graph,
    }, selected_seed


def interactive_experiment() -> dict[str, object]:
    labels = list("ABCDEFGH")
    graph = nx.Graph()
    graph.add_nodes_from(range(8))
    for members in (range(0, 4), range(4, 8)):
        cycle = list(members)
        graph.add_edges_from(
            (cycle[i], cycle[(i + 1) % 4], {"conductance": 1.0})
            for i in range(4)
        )
    graph.add_edge(3, 4, conductance=1.0)
    layout = {
        0: {"x": 80, "y": 70}, 1: {"x": 180, "y": 70},
        2: {"x": 180, "y": 180}, 3: {"x": 80, "y": 180},
        4: {"x": 300, "y": 180}, 5: {"x": 400, "y": 180},
        6: {"x": 400, "y": 70}, 7: {"x": 300, "y": 70},
    }
    base = laplacian_state(graph)
    candidates = []
    for edge in candidate_edges(graph):
        updated_graph = add_candidate(graph, edge)
        updated = laplacian_state(updated_graph)
        candidates.append({
            "u": labels[edge[0]],
            "v": labels[edge[1]],
            "kirchhoff": float(updated["kirchhoff"]),
            "lambda2": float(updated["lambda2"]),
            "resistances": np.asarray(updated["resistances"]).tolist(),
        })
    return {
        "nodes": [
            {"id": labels[index], "x": layout[index]["x"], "y": layout[index]["y"]}
            for index in range(8)
        ],
        "edges": [[labels[u], labels[v]] for u, v in sorted(graph.edges)],
        "kirchhoff": float(base["kirchhoff"]),
        "lambda2": float(base["lambda2"]),
        "resistances": np.asarray(base["resistances"]).tolist(),
        "candidates": candidates,
    }


def clean_for_json(value: object) -> object:
    if isinstance(value, dict):
        return {str(key): clean_for_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean_for_json(item) for item in value]
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, (np.floating, np.integer)):
        return value.item()
    return value


def save_svg(figure: plt.Figure, path: Path) -> None:
    figure.savefig(path, format="svg", bbox_inches="tight", metadata={"Date": None})
    text = path.read_text(encoding="utf-8")
    path.write_text("\n".join(line.rstrip() for line in text.splitlines()).rstrip() + "\n", encoding="utf-8")
    plt.close(figure)


def make_figures(results: dict[str, object]) -> None:
    FIGURES.mkdir(parents=True, exist_ok=True)
    labels = list(results["topologies"])
    x = np.arange(len(labels), dtype=float)
    width = 0.23
    fig, ax = plt.subplots(figsize=(9.1, 4.4))
    series = [
        ("random", "Aleatoria", COLORS["blue"]),
        ("maximum_geodesic", "Mayor distancia", COLORS["pink"]),
        ("maximum_kirchhoff_reduction", "Máxima reducción de Kf", COLORS["white"]),
    ]
    for offset, (key, title, color) in enumerate(series):
        means, lower, upper = [], [], []
        for name in labels:
            item = results["topologies"][name]
            if key == "random":
                values = item["random"]
                mean = values["mean_reduction_pct"]
                q025, q975 = values["q025_reduction_pct"], values["q975_reduction_pct"]
            else:
                value = item[key]["kirchhoff_reduction_pct"]
                mean = q025 = q975 = value
            means.append(mean)
            lower.append(mean - q025)
            upper.append(q975 - mean)
        positions = x + (offset - 1) * width
        ax.bar(positions, means, width, color=color, label=title, alpha=0.88)
        if key == "random":
            ax.errorbar(positions, means, yerr=[lower, upper], fmt="none", ecolor=COLORS["white"], capsize=3, linewidth=1)
    ax.set_ylabel("Reducción de Kf (%)")
    ax.set_xticks(x, labels)
    ax.set_ylim(bottom=0)
    ax.grid(axis="y", color="#78849A", alpha=0.28, linewidth=0.7)
    ax.set_axisbelow(True)
    ax.legend(frameon=False, ncol=1, loc="upper right")
    fig.tight_layout()
    save_svg(fig, FIGURES / "01-estrategias-kirchhoff.svg")

    interactive = results["interactive"]
    labels = [node["id"] for node in interactive["nodes"]]
    candidate = next(item for item in interactive["candidates"] if (item["u"], item["v"]) == ("A", "H"))
    before = np.asarray(interactive["resistances"])
    after = np.asarray(candidate["resistances"])
    upper = float(max(before.max(), after.max()))
    resistance_colors = LinearSegmentedColormap.from_list(
        "alfergal-resistance",
        [COLORS["navy"], COLORS["blue"], COLORS["pink"]],
    )
    fig, axes = plt.subplots(1, 2, figsize=(8.3, 4.1), constrained_layout=True)
    image = None
    for axis, values, title in zip(axes, (before, after), ("Red inicial", "Tras añadir A–H")):
        image = axis.imshow(values, cmap=resistance_colors, vmin=0, vmax=upper)
        axis.set_title(title)
        axis.set_xticks(range(len(labels)), labels)
        axis.set_yticks(range(len(labels)), labels)
        axis.tick_params(length=0)
    assert image is not None
    fig.colorbar(image, ax=axes, shrink=0.82, label="Resistencia efectiva")
    save_svg(fig, FIGURES / "02-matriz-resistencias.svg")


def run() -> dict[str, object]:
    graphs, selected_random_seed = make_topologies()
    topologies = {name: strategies(graph) for name, graph in graphs.items()}
    result: dict[str, object] = {
        "experiment": "effective-resistance-single-edge",
        "configuration": {
            "node_count": N,
            "conductance_existing_edges": 1.0,
            "conductance_added_edge": 1.0,
            "random_candidate_draws": RANDOM_DRAWS,
            "random_candidate_seed_start": RANDOM_SEED_START,
            "random_connected_graph_seed": selected_random_seed,
            "random_connected_graph_requested_edges": 24,
            "communities": "four 4-node cycles linked as a chain by three unit-conductance bridges",
            "tolerance": TOLERANCE,
        },
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "networkx": nx.__version__,
            "matplotlib": matplotlib.__version__,
        },
        "topologies": {},
        "interactive": interactive_experiment(),
    }
    for name, graph in graphs.items():
        result["topologies"][name] = topologies[name]
        result["topologies"][name]["edge_list"] = [list(edge) for edge in sorted(graph.edges)]
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--figures-only", action="store_true", help="Regenerate SVG plots from saved resultados.json")
    args = parser.parse_args()
    if args.figures_only:
        results = json.loads((HERE / "resultados.json").read_text(encoding="utf-8"))
    else:
        results = clean_for_json(run())
        (HERE / "resultados.json").write_text(
            json.dumps(results, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    make_figures(results)


if __name__ == "__main__":
    main()
