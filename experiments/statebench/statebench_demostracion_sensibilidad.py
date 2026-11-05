"""Illustrative algebraic sensitivity experiment inspired by StateBench.

NOT a reproduction of StateBench, a benchmark of LLMs, or a comparison of
neural architectures. It evaluates exact finite-state transition systems.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

SEED = 20261105
VARIABLES = 5
LENGTHS = (8, 32, 128, 512)
REPETITIONS = 40
FAMILIES = ("r_trivial", "aperiodic", "soluble", "general_finite")
HERE = Path(__file__).parent


def build_sample(rng: np.random.Generator, length: int):
    initial = [int(x) for x in rng.permutation(VARIABLES)]
    state = initial.copy()
    traces: dict[str, list] = {name: [] for name in FAMILIES}
    for _ in range(length):
        a, b = (int(x) for x in rng.choice(VARIABLES, size=2, replace=False))
        value_a, value_b = state[a], state[b]
        traces["general_finite"].append((a, b))  # Swap variables.
        traces["soluble"].append(
            (a, b, (value_b - value_a) % VARIABLES, (value_a - value_b) % VARIABLES)
        )  # Modular additive changes on same two variables.
        traces["aperiodic"].append((a, b, value_b, value_a))  # Overwrites by value.
        traces["r_trivial"].append((a, b, initial[a], initial[b]))  # Repeated same initial value.
        state[a], state[b] = value_b, value_a
    return initial, traces


def evaluate(initial: list[int], trace: list, family: str, omit_step: int = -1):
    state = initial.copy()
    for index, op in enumerate(trace):
        if index == omit_step:
            continue
        a, b = op[:2]
        if family == "general_finite":
            state[a], state[b] = state[b], state[a]
        elif family == "soluble":
            state[a] = (state[a] + op[2]) % VARIABLES
            state[b] = (state[b] + op[3]) % VARIABLES
        else:
            state[a], state[b] = op[2], op[3]
    return tuple(state)


def run():
    rng = np.random.default_rng(SEED)
    results = {}
    for length in LENGTHS:
        fractions: dict[str, list[float]] = {key: [] for key in FAMILIES}
        for _ in range(REPETITIONS):
            initial, traces = build_sample(rng, length)
            assert all(
                evaluate(initial, traces[family], family) == evaluate(initial, traces["general_finite"], "general_finite")
                for family in ("aperiodic", "soluble")
            )
            for family in FAMILIES:
                original = evaluate(initial, traces[family], family)
                critical = sum(
                    evaluate(initial, traces[family], family, omit_step=i) != original
                    for i in range(length)
                )
                fractions[family].append(critical / length)
        results[length] = {
            family: {"mean": float(np.mean(fractions[family])),
                     "sd_across_traces": float(np.std(fractions[family], ddof=1))}
            for family in FAMILIES
        }
    return results


def payload(results):
    return {
        "seed": SEED,
        "variables": VARIABLES,
        "lengths": LENGTHS,
        "repetitions": REPETITIONS,
        "experiment": "Deletion sensitivity on finite toy state systems; no language models evaluated",
        "results": results,
    }


def render_figure(results, destination: Path):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    from matplotlib.patches import Rectangle

    labels = {"r_trivial": "R-trivial", "aperiodic": "Aperiódico",
              "soluble": "Soluble", "general_finite": "Finito general"}
    results_by_length = {int(length): values for length, values in results.items()}
    matrix = np.array([[results_by_length[length][family]["mean"] for length in LENGTHS]
                       for family in FAMILIES])
    cmap = LinearSegmentedColormap.from_list(
        "statebench-web", ["#172440", "#A9D6F5", "#F2A7C6"]
    )
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 12,
                         "figure.facecolor": "#080F26", "axes.facecolor": "#080F26",
                         "savefig.facecolor": "#080F26", "text.color": "#F8FAFF",
                         "axes.labelcolor": "#F8FAFF", "xtick.color": "#F8FAFF",
                         "ytick.color": "#F8FAFF", "svg.fonttype": "none",
                         "svg.hashsalt": "statebench-sensitivity-v1"})
    fig, ax = plt.subplots(figsize=(9.5, 5.2), layout="constrained")
    for row in range(len(FAMILIES)):
        for column in range(len(LENGTHS)):
            value = matrix[row, column]
            ax.add_patch(
                Rectangle(
                    (column - 0.5, row - 0.5),
                    1,
                    1,
                    facecolor=cmap(value),
                    edgecolor="#43516c",
                    linewidth=0.7,
                )
            )
    ax.set_xticks(range(len(LENGTHS)), [str(n) for n in LENGTHS])
    ax.set_yticks(range(len(FAMILIES)), [labels[f] for f in FAMILIES])
    ax.set_xlim(-0.5, len(LENGTHS) - 0.5)
    ax.set_ylim(len(FAMILIES) - 0.5, -0.5)
    ax.set_xlabel("Operaciones en la traza", labelpad=10)
    ax.set_ylabel("Familia de operaciones", labelpad=12)
    ax.set_title("Sensibilidad al borrado por familia y longitud", pad=18, fontsize=15)
    ax.tick_params(axis="both", length=0, labelsize=11, pad=9)
    for i in range(len(FAMILIES)):
        for j in range(len(LENGTHS)):
            value = matrix[i, j]
            color = "#0B1024" if value > 0.35 else "#F8FAFF"
            ax.text(j, i, f"{value:.1%}", ha="center", va="center",
                    fontsize=14, color=color, weight="bold")
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.savefig(
        destination,
        format="svg",
        metadata={
            "Title": "Sensibilidad al borrado en sistemas de estado sintéticos",
            "Description": (
                "Fracción media de operaciones cuyo borrado cambia el estado final "
                "en cuatro familias de sistemas finitos sintéticos. No se evaluaron LLM."
            ),
            "Creator": "Experimento StateBench independiente",
            "Date": None,
        },
    )
    plt.close(fig)
    # Matplotlib wraps SVG path data onto indented lines and leaves trailing
    # spaces before each newline. Strip only that whitespace to keep the
    # generated asset diff-clean without changing its vector geometry.
    svg = destination.read_text(encoding="utf-8")
    destination.write_text(
        "\n".join(line.rstrip(" \t") for line in svg.splitlines()) + "\n",
        encoding="utf-8",
    )


def main():
    results = run()
    (HERE / "statebench_sensibilidad_resultados.json").write_text(
        json.dumps(payload(results), indent=2) + "\n", encoding="utf-8"
    )
    render_figure(results, HERE / "statebench_sensibilidad.svg")
    for length in LENGTHS:
        print(length, {key: round(value["mean"], 4)
                       for key, value in results[length].items()})


if __name__ == "__main__":
    main()
