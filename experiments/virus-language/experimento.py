"""Synthetic, non-biological study of representation and group leakage."""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import sklearn
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split


SEED = 20261104
ALPHABET = "0123"
CLASS_CYCLES = ((0, 1, 2, 3), (0, 2, 1, 3), (0, 3, 1, 2))
CLASS_NAMES = ("Clase A", "Clase B", "Clase C")
PALETTE = ("#A9D6F5", "#F2A7C6", "#F8FAFF")
BACKGROUND = "#080F26"


def generate_data(seed: int = SEED):
    """Create repeated family-like groups with class patterns and shared barcodes.

    The alphabet is digits, deliberately not nucleotide or amino-acid data.
    Sequences are generated for this demonstration and are never saved.
    """
    rng = np.random.default_rng(seed)
    sequences: list[str] = []
    labels: list[int] = []
    groups: list[str] = []
    for label, cycle in enumerate(CLASS_CYCLES):
        successor = {cycle[i]: cycle[(i + 1) % len(cycle)] for i in range(4)}
        for group_index in range(20):
            group = f"c{label}-g{group_index:02d}"
            barcode = rng.integers(0, 4, size=20)
            for _ in range(8):
                symbols = np.empty(240, dtype=np.int8)
                symbols[0] = rng.integers(0, 4)
                for position in range(1, len(symbols)):
                    previous = int(symbols[position - 1])
                    if rng.random() < 0.05:
                        symbols[position] = successor[previous]
                    else:
                        alternatives = [value for value in range(4) if value != previous]
                        symbols[position] = rng.choice(alternatives)
                for start in (18, 92, 166):
                    symbols[start : start + len(barcode)] = barcode
                sequences.append("".join(ALPHABET[value] for value in symbols))
                labels.append(label)
                groups.append(group)
    order = rng.permutation(len(sequences))
    return (
        np.asarray(sequences, dtype=object)[order],
        np.asarray(labels, dtype=np.int8)[order],
        np.asarray(groups, dtype=object)[order],
    )


def feature_matrix(sequences: np.ndarray, k: int) -> np.ndarray:
    """Return normalized k-mer counts over the synthetic digit alphabet."""
    kmers = tuple("".join(tokens) for tokens in itertools.product(ALPHABET, repeat=k))
    lookup = {token: index for index, token in enumerate(kmers)}
    matrix = np.zeros((len(sequences), len(kmers)), dtype=np.float64)
    for row, sequence in enumerate(sequences):
        count = len(sequence) - k + 1
        for start in range(count):
            matrix[row, lookup[sequence[start : start + k]]] += 1
        matrix[row] /= count
    return matrix


def make_splits(labels: np.ndarray, groups: np.ndarray, seed: int = SEED):
    indices = np.arange(len(labels))
    random_train, random_test = train_test_split(
        indices, test_size=0.25, random_state=seed, stratify=labels
    )
    rng = np.random.default_rng(seed + 1)
    held_out = set()
    for label in range(len(CLASS_NAMES)):
        candidates = np.unique(groups[labels == label])
        held_out.update(rng.choice(candidates, size=5, replace=False).tolist())
    group_test = np.flatnonzero(np.isin(groups, tuple(held_out)))
    group_train = np.flatnonzero(~np.isin(groups, tuple(held_out)))
    assert set(groups[group_train]).isdisjoint(groups[group_test])
    return {
        "random_sample": (random_train, random_test),
        "held_out_groups": (group_train, group_test),
    }


def evaluate(features: np.ndarray, labels: np.ndarray, train: np.ndarray, test: np.ndarray):
    model = LogisticRegression(
        max_iter=1000, class_weight="balanced", random_state=SEED, tol=1e-8
    )
    model.fit(features[train], labels[train])
    predictions = model.predict(features[test])
    return {
        "macro_f1": float(f1_score(labels[test], predictions, average="macro")),
        "balanced_accuracy": float(balanced_accuracy_score(labels[test], predictions)),
        "confusion_matrix": confusion_matrix(labels[test], predictions, labels=[0, 1, 2]).tolist(),
    }


def style_axis(axis):
    axis.set_facecolor(BACKGROUND)
    axis.tick_params(colors=PALETTE[2], labelsize=10)
    axis.xaxis.label.set_color(PALETTE[2])
    axis.yaxis.label.set_color(PALETTE[2])
    for spine in axis.spines.values():
        spine.set_color("#43516F")
    axis.grid(axis="y", color="#43516F", alpha=0.45, linewidth=0.7)
    axis.set_axisbelow(True)


def save_figures(output: Path, sequences, labels, groups, splits, results):
    output.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update(
        {
            "font.family": "serif",
            "text.color": PALETTE[2],
            "axes.labelcolor": PALETTE[2],
            "svg.fonttype": "none",
            "figure.facecolor": BACKGROUND,
            "savefig.facecolor": BACKGROUND,
        }
    )
    kmer_features = feature_matrix(sequences, 3)
    group_train, group_test = splits["held_out_groups"]

    # PCA sees only the training partition when fitting the projection.
    projection = PCA(n_components=2, random_state=SEED).fit(kmer_features[group_train])
    coordinates = projection.transform(kmer_features)
    fig, axis = plt.subplots(figsize=(8.6, 5.4), constrained_layout=True)
    for label, name, color in zip(range(3), CLASS_NAMES, PALETTE):
        train_mask = (labels == label) & np.isin(np.arange(len(labels)), group_train)
        test_mask = (labels == label) & np.isin(np.arange(len(labels)), group_test)
        axis.scatter(coordinates[train_mask, 0], coordinates[train_mask, 1], s=19, alpha=0.52, color=color, label=f"{name}, ajuste")
        axis.scatter(coordinates[test_mask, 0], coordinates[test_mask, 1], s=30, alpha=0.9, marker="x", linewidth=0.9, color=color, label=f"{name}, grupo reservado")
    axis.set_xlabel("Componente principal 1")
    axis.set_ylabel("Componente principal 2")
    axis.legend(frameon=False, fontsize=8, ncol=2, loc="best")
    style_axis(axis)
    fig.savefig(output / "01-pca-sintetico.svg", format="svg")
    plt.close(fig)

    methods = ("composicion", "kmer3")
    method_names = ("Composición", "Frecuencias k-mer")
    metrics = ("macro_f1", "balanced_accuracy")
    metric_names = ("Macro F1", "Balanced accuracy")
    fig, axes = plt.subplots(1, 2, figsize=(9.4, 4.8), constrained_layout=True)
    x = np.arange(len(methods))
    width = 0.34
    for axis, metric, metric_name in zip(axes, metrics, metric_names):
        for offset, split, label, color in (
            (-width / 2, "random_sample", "Muestra aleatoria", PALETTE[0]),
            (width / 2, "held_out_groups", "Grupos reservados", PALETTE[1]),
        ):
            values = [results[split][method][metric] for method in methods]
            bars = axis.bar(x + offset, values, width, label=label, color=color)
            axis.bar_label(bars, fmt="%.2f", padding=3, color=PALETTE[2], fontsize=9)
        axis.set_xticks(x, method_names)
        axis.set_ylim(0, 1.12)
        axis.set_ylabel(metric_name)
        style_axis(axis)
    axes[0].legend(frameon=False, fontsize=9)
    fig.savefig(output / "02-comparacion-modelos.svg", format="svg")
    plt.close(fig)

    fig, axis = plt.subplots(figsize=(7.8, 4.8), constrained_layout=True)
    group_values = [results[split]["kmer3"] for split in ("random_sample", "held_out_groups")]
    for metric, metric_name, color in zip(metrics, metric_names, (PALETTE[0], PALETTE[1])):
        values = [item[metric] for item in group_values]
        axis.plot((0, 1), values, marker="o", markersize=7, linewidth=2.2, color=color, label=metric_name)
        for x_value, value in enumerate(values):
            axis.annotate(f"{value:.3f}", (x_value, value), xytext=(0, 10), textcoords="offset points", ha="center", color=PALETTE[2], fontsize=9)
    axis.set_xticks((0, 1), ("Muestra aleatoria", "Grupos no vistos"))
    axis.set_ylim(0, 1.08)
    axis.set_ylabel("Rendimiento")
    axis.legend(frameon=False, fontsize=9)
    style_axis(axis)
    fig.savefig(output / "03-generalizacion-grupos.svg", format="svg")
    plt.close(fig)

    # Matplotlib uses trailing spaces to split SVG path data across lines.
    # They are insignificant to SVG rendering but make source diffs noisy.
    for figure in output.glob("*.svg"):
        lines = figure.read_text(encoding="utf-8").splitlines()
        figure.write_text(
            "\n".join(line.rstrip() for line in lines) + "\n", encoding="utf-8"
        )


def run(output: Path | None = None):
    sequences, labels, groups = generate_data()
    splits = make_splits(labels, groups)
    features = {
        "composicion": feature_matrix(sequences, 1),
        "kmer3": feature_matrix(sequences, 3),
    }
    results = {}
    for split_name, (train, test) in splits.items():
        results[split_name] = {
            name: evaluate(matrix, labels, train, test)
            for name, matrix in features.items()
        }
        results[split_name]["n_train"] = len(train)
        results[split_name]["n_test"] = len(test)
        results[split_name]["shared_groups"] = len(set(groups[train]) & set(groups[test]))

    payload = {
        "experiment": "Synthetic non-biological sequence representation demo",
        "seed": SEED,
        "synthetic_only": True,
        "alphabet": list(ALPHABET),
        "observations": len(sequences),
        "unique_sequences": len(set(sequences.tolist())),
        "exact_duplicates": len(sequences) - len(set(sequences.tolist())),
        "symbols_per_sequence": len(sequences[0]),
        "shared_symbols_within_group": 60,
        "shared_fraction_within_group": 0.25,
        "classes": {name: int(np.sum(labels == index)) for index, name in enumerate(CLASS_NAMES)},
        "groups": len(np.unique(groups)),
        "sequences_persisted": False,
        "versions": {"numpy": np.__version__, "scikit_learn": sklearn.__version__},
        "metrics": results,
    }
    if output is not None:
        output.mkdir(parents=True, exist_ok=True)
        (output / "resultados.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        save_figures(output / "figures", sequences, labels, groups, splits, results)
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).parent)
    args = parser.parse_args()
    print(json.dumps(run(args.output), indent=2, ensure_ascii=False))
