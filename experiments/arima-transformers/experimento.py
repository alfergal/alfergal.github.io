#!/usr/bin/env python3
"""Experiments for the draft on ARIMA and Transformer forecasting.

Only synthetic data are generated. No network access or external dataset is used.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import platform
import time
import warnings
from pathlib import Path
from typing import Callable

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib-arima-transformers")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.neural_network import MLPRegressor
from sklearn.exceptions import ConvergenceWarning

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
PHI = 0.8
SIGMA = 1.0
TRAIN_SERIES = 48
TEST_SERIES = 24
TRAIN_END = 320
N_STEPS = 512
BURN_IN = 256
HORIZONS = (1, 4, 8)
A_SEEDS = tuple(range(20261101, 20261121))
B_SEEDS = tuple(range(20261201, 20261211))
NONLINEAR = {"linear": 0.55, "amplitude": 0.7, "slope": 1.4, "sigma": 0.55}

plt.rcParams.update({
    "font.family": "serif",
    "font.size": 9,
    "axes.titlesize": 10,
    "axes.labelsize": 9,
    "legend.fontsize": 8,
    "figure.facecolor": "none",
    "axes.facecolor": "none",
    "savefig.facecolor": "none",
    "text.color": "#e9edf4",
    "axes.labelcolor": "#e9edf4",
    "axes.edgecolor": "#78849a",
    "xtick.color": "#c5cedd",
    "ytick.color": "#c5cedd",
    "svg.hashsalt": "alfergal-arima-transformers-v1",
    "svg.fonttype": "none",
})


def simulate_ar1(seed: int, n_series: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    raw = np.zeros((n_series, N_STEPS + BURN_IN), dtype=np.float64)
    innovations = rng.normal(0.0, SIGMA, size=raw.shape)
    for time_index in range(1, raw.shape[1]):
        raw[:, time_index] = PHI * raw[:, time_index - 1] + innovations[:, time_index]
    return raw[:, BURN_IN:]


def simulate_nonlinear(seed: int, n_series: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    raw = np.zeros((n_series, N_STEPS + BURN_IN), dtype=np.float64)
    innovations = rng.normal(0.0, NONLINEAR["sigma"], size=raw.shape)
    for time_index in range(1, raw.shape[1]):
        previous = raw[:, time_index - 1]
        raw[:, time_index] = (
            NONLINEAR["linear"] * previous
            + NONLINEAR["amplitude"] * np.tanh(NONLINEAR["slope"] * previous)
            + innovations[:, time_index]
        )
    return raw[:, BURN_IN:]


def fit_ar1(series: np.ndarray, intercept: bool) -> tuple[float, float, float]:
    previous = series[:, :-1].reshape(-1)
    current = series[:, 1:].reshape(-1)
    started = time.perf_counter()
    if intercept:
        design = np.column_stack((previous, np.ones_like(previous)))
        coefficient, bias = np.linalg.lstsq(design, current, rcond=None)[0]
    else:
        coefficient = float(previous @ current / (previous @ previous))
        bias = 0.0
    return float(coefficient), float(bias), time.perf_counter() - started


def metrics(actual: np.ndarray, predicted: np.ndarray, scales: np.ndarray) -> dict[str, float]:
    errors = actual - predicted
    per_series_mae = np.mean(np.abs(errors), axis=1)
    return {
        "mae": float(np.mean(np.abs(errors))),
        "rmse": float(np.sqrt(np.mean(np.square(errors)))),
        "mase": float(np.mean(per_series_mae / scales)),
    }


def aggregate(rows: list[dict[str, float]]) -> dict[str, dict[str, float]]:
    summary: dict[str, dict[str, float]] = {}
    for metric_name in rows[0]:
        values = np.asarray([row[metric_name] for row in rows], dtype=np.float64)
        summary[metric_name] = {
            "mean": float(np.mean(values)),
            "seed_q025": float(np.quantile(values, 0.025)),
            "seed_q975": float(np.quantile(values, 0.975)),
            "seed_sd": float(np.std(values, ddof=1)) if len(values) > 1 else 0.0,
        }
    return summary


def run_linear() -> dict:
    per_horizon: dict[str, list[dict[str, object]]] = {
        str(horizon): [] for horizon in HORIZONS
    }
    fit_ms: list[float] = []
    for seed in A_SEEDS:
        data = simulate_ar1(seed, TRAIN_SERIES + TEST_SERIES)
        train = data[:TRAIN_SERIES, :TRAIN_END]
        estimate, _, elapsed = fit_ar1(train, intercept=False)
        fit_ms.append(elapsed * 1000)
        test = data[TRAIN_SERIES:]
        scale = np.mean(np.abs(np.diff(test[:, :TRAIN_END], axis=1)), axis=1)
        for horizon in HORIZONS:
            origins = np.arange(TRAIN_END - 1, N_STEPS - horizon, horizon)
            current = test[:, origins]
            actual = test[:, origins + horizon]
            methods = {
                "optimal": np.power(PHI, horizon) * current,
                "arima": np.power(estimate, horizon) * current,
                "naive": current,
            }
            irreducible_rmse = SIGMA * math.sqrt(
                sum(PHI ** (2 * step) for step in range(horizon))
            )
            per_horizon[str(horizon)].append({
                "seed": seed,
                "phi_hat": estimate,
                "irreducible_rmse": irreducible_rmse,
                "metrics": {
                    name: metrics(actual, prediction, scale)
                    for name, prediction in methods.items()
                },
            })
    summary = {}
    for horizon, seed_rows in per_horizon.items():
        summary[horizon] = {}
        for method in ("optimal", "arima", "naive"):
            summary[horizon][method] = {
                metric: aggregate([
                    row["metrics"][method] for row in seed_rows  # type: ignore[index]
                ])[metric]
                for metric in ("mae", "rmse", "mase")
            }
        summary[horizon]["irreducible_rmse"] = float(
            np.mean([row["irreducible_rmse"] for row in seed_rows])
        )
        summary[horizon]["phi_hat"] = aggregate([
            {"phi_hat": float(row["phi_hat"])} for row in seed_rows
        ])["phi_hat"]
    return {
        "parameters": {
            "phi": PHI,
            "innovation_sd": SIGMA,
            "training_series_per_seed": TRAIN_SERIES,
            "test_series_per_seed": TEST_SERIES,
            "training_observations_per_series": TRAIN_END,
            "observations_per_series": N_STEPS,
            "burn_in": BURN_IN,
            "seeds": list(A_SEEDS),
        },
        "summary": summary,
        "seed_results": per_horizon,
        "fit_ms_median": float(np.median(fit_ms)),
        "fit_ms_iqr": [float(np.quantile(fit_ms, 0.25)), float(np.quantile(fit_ms, 0.75))],
    }


def make_windows(series: np.ndarray, train_end: int) -> tuple[np.ndarray, np.ndarray]:
    previous = series[:, :train_end - 1].reshape(-1, 1)
    target = series[:, 1:train_end].reshape(-1)
    return previous, target


def fit_mlp(features: np.ndarray, target: np.ndarray, seed: int) -> tuple[MLPRegressor, float]:
    model = MLPRegressor(
        hidden_layer_sizes=(16,),
        activation="tanh",
        solver="lbfgs",
        alpha=0.01,
        max_iter=1000,
        random_state=seed,
        tol=1e-6,
    )
    started = time.perf_counter()
    with warnings.catch_warnings():
        warnings.simplefilter("error", ConvergenceWarning)
        model.fit(features, target)
    return model, time.perf_counter() - started


def benchmark_ms_per_1000(predict: Callable[[np.ndarray], np.ndarray], samples: np.ndarray) -> float:
    batch = np.resize(samples, (1000, samples.shape[1]))
    for _ in range(3):
        predict(batch)
    measurements = []
    for _ in range(15):
        started = time.perf_counter()
        predict(batch)
        measurements.append((time.perf_counter() - started) * 1000)
    return float(np.median(measurements))


def dm_hac_panel(differences: list[np.ndarray], max_lag: int = 12) -> dict[str, float | int]:
    """Panel HAC Diebold-Mariano statistic; preserve within-series dependence."""
    total = sum(values.size for values in differences)
    mean = float(sum(np.sum(values) for values in differences) / total)
    gamma0 = 0.0
    for values in differences:
        centered = values - mean
        gamma0 += float(centered @ centered)
    long_run = gamma0 / total
    used_lag = min(max_lag, min(values.size for values in differences) - 1)
    for lag in range(1, used_lag + 1):
        covariance_sum = 0.0
        for values in differences:
            centered = values - mean
            covariance_sum += float(centered[lag:] @ centered[:-lag])
        gamma = covariance_sum / total
        long_run += 2.0 * (1.0 - lag / (used_lag + 1.0)) * gamma
    standard_error = math.sqrt(max(long_run, 0.0) / total)
    statistic = mean / standard_error if standard_error else 0.0
    p_value = math.erfc(abs(statistic) / math.sqrt(2.0))
    return {
        "loss_difference_arima_minus_mlp": mean,
        "hac_lags": used_lag,
        "statistic": statistic,
        "two_sided_p": max(p_value, 1e-300),
        "observations": total,
    }


def run_nonlinear() -> dict:
    per_seed: list[dict[str, object]] = []
    fit_ar_ms: list[float] = []
    fit_mlp_ms: list[float] = []
    dm_by_seed: list[dict[str, float | int]] = []
    example: dict[str, object] | None = None
    for seed in B_SEEDS:
        data = simulate_nonlinear(seed, TRAIN_SERIES + TEST_SERIES)
        train = data[:TRAIN_SERIES]
        test = data[TRAIN_SERIES:]
        features, target = make_windows(train, TRAIN_END)
        ar_coefficient, ar_bias, ar_seconds = fit_ar1(train[:, :TRAIN_END], intercept=True)
        mlp, mlp_seconds = fit_mlp(features, target, seed)
        fit_ar_ms.append(ar_seconds * 1000)
        fit_mlp_ms.append(mlp_seconds * 1000)
        history = test[:, :TRAIN_END]
        scale = np.mean(np.abs(np.diff(history, axis=1)), axis=1)
        actual = test[:, TRAIN_END:]
        current = test[:, TRAIN_END - 1:-1]
        oracle = (
            NONLINEAR["linear"] * current
            + NONLINEAR["amplitude"] * np.tanh(NONLINEAR["slope"] * current)
        )
        arima = ar_coefficient * current + ar_bias
        mlp_prediction = mlp.predict(current.reshape(-1, 1)).reshape(current.shape)
        predictions = {
            "oracle": oracle,
            "arima": arima,
            "mlp": mlp_prediction,
            "naive": current,
        }
        per_seed.append({
            "seed": seed,
            "ar_coefficient": ar_coefficient,
            "ar_intercept": ar_bias,
            "metrics": {
                name: metrics(actual, prediction, scale)
                for name, prediction in predictions.items()
            },
        })
        seed_differences = np.square(actual - arima) - np.square(actual - mlp_prediction)
        dm_by_seed.append(dm_hac_panel([row for row in seed_differences]))
        if example is None:
            example = {
                "train": train[0, :TRAIN_END].tolist(),
                "test": test[0].tolist(),
                "oracle": oracle[0].tolist(),
                "arima": arima[0].tolist(),
                "mlp": mlp_prediction[0].tolist(),
            }
    summary = {}
    for method in ("oracle", "arima", "mlp", "naive"):
        summary[method] = {
            metric: aggregate([
                row["metrics"][method] for row in per_seed  # type: ignore[index]
            ])[metric]
            for metric in ("mae", "rmse", "mase")
        }
    training_windows, training_targets = make_windows(
        simulate_nonlinear(B_SEEDS[0], TRAIN_SERIES)[:, :TRAIN_END], TRAIN_END
    )
    linear_coefficient, linear_bias, _ = fit_ar1(
        simulate_nonlinear(B_SEEDS[0], TRAIN_SERIES)[:, :TRAIN_END], intercept=True
    )
    timing_mlp, _ = fit_mlp(training_windows, training_targets, B_SEEDS[0])
    timing_sample = np.asarray(training_windows[:1000])
    mlp_infer = benchmark_ms_per_1000(
        lambda values: timing_mlp.predict(values), timing_sample
    )
    ar_infer = benchmark_ms_per_1000(
        lambda values: linear_coefficient * values[:, 0] + linear_bias,
        timing_sample,
    )
    oracle_infer = benchmark_ms_per_1000(
        lambda values: NONLINEAR["linear"] * values[:, 0]
        + NONLINEAR["amplitude"] * np.tanh(NONLINEAR["slope"] * values[:, 0]),
        timing_sample,
    )
    naive_infer = benchmark_ms_per_1000(lambda values: values[:, 0], timing_sample)
    return {
        "parameters": {
            **NONLINEAR,
            "training_series_per_seed": TRAIN_SERIES,
            "test_series_per_seed": TEST_SERIES,
            "training_observations_per_series": TRAIN_END,
            "observations_per_series": N_STEPS,
            "burn_in": BURN_IN,
            "seeds": list(B_SEEDS),
            "mlp": {
                "hidden_layer_sizes": [16],
                "activation": "tanh",
                "solver": "lbfgs",
                "alpha": 0.01,
                "max_iter": 1000,
                "tol": 1e-6,
            },
        },
        "summary": summary,
        "seed_results": per_seed,
        "diebold_mariano_hac": {
            "replications": len(dm_by_seed),
            "replications_p_below_005": sum(item["two_sided_p"] < 0.05 for item in dm_by_seed),
            "median_statistic": float(np.median([item["statistic"] for item in dm_by_seed])),
            "p_value_range": [
                float(min(item["two_sided_p"] for item in dm_by_seed)),
                float(max(item["two_sided_p"] for item in dm_by_seed)),
            ],
            "hac_lags": 12,
            "observations_per_replication": TEST_SERIES * (N_STEPS - TRAIN_END),
            "loss_difference": "ARIMA squared error minus MLP squared error",
        },
        "fit_ms_median": {
            "arima": float(np.median(fit_ar_ms)),
            "mlp": float(np.median(fit_mlp_ms)),
        },
        "fit_ms_iqr": {
            "arima": [float(np.quantile(fit_ar_ms, 0.25)), float(np.quantile(fit_ar_ms, 0.75))],
            "mlp": [float(np.quantile(fit_mlp_ms, 0.25)), float(np.quantile(fit_mlp_ms, 0.75))],
        },
        "inference_ms_per_1000": {
            "oracle": oracle_infer,
            "arima": ar_infer,
            "mlp": mlp_infer,
            "naive": naive_infer,
        },
        "example": example,
    }


def acf(values: np.ndarray, max_lag: int) -> np.ndarray:
    centered = values - np.mean(values)
    return np.asarray([
        float(centered[lag:] @ centered[:len(centered) - lag] / (centered @ centered))
        for lag in range(max_lag + 1)
    ])


def save_svg(figure, filename: Path) -> None:
    figure.savefig(
        filename,
        format="svg",
        transparent=True,
        metadata={"Date": None, "Creator": "Experimento reproducible alfergal"},
    )
    contents = filename.read_text(encoding="utf-8")
    filename.write_text(
        "\n".join(line.rstrip() for line in contents.splitlines()) + "\n",
        encoding="utf-8",
    )


def save_figures(linear: dict, nonlinear: dict, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    example = simulate_ar1(A_SEEDS[0], TRAIN_SERIES + TEST_SERIES)[-1]
    figure, axes = plt.subplots(2, 1, figsize=(8.4, 5.2), constrained_layout=True)
    axes[0].plot(np.arange(1, 161), example[1:161], color="#1d503b", linewidth=1.05)
    axes[0].set(title="Proceso AR(1) sintético", xlabel="Tiempo", ylabel="$X_t$")
    axes[0].grid(alpha=0.18, color="#748198")
    lags = np.arange(31)
    measured = acf(example[:320], 30)
    axes[1].stem(lags, measured, linefmt="#1d503b", markerfmt="o", basefmt=" ")
    axes[1].plot(lags, np.power(PHI, lags), color="#d97843", linewidth=1.4, label="$\\phi^k$")
    axes[1].axhline(1.96 / math.sqrt(320), color="#888888", linestyle="--", linewidth=0.8)
    axes[1].axhline(-1.96 / math.sqrt(320), color="#888888", linestyle="--", linewidth=0.8)
    axes[1].set(title="Autocorrelación muestral y teórica", xlabel="Retardo $k$", ylabel="$\\rho(k)$")
    axes[1].grid(alpha=0.18, color="#748198")
    axes[1].legend(frameon=False)
    save_svg(figure, output / "01-serie-autocorrelacion.svg")
    plt.close(figure)

    horizons = [int(key) for key in linear["summary"]]
    figure, axis = plt.subplots(figsize=(8.4, 4.4), constrained_layout=True)
    colors = {"optimal": "#1d503b", "arima": "#d97843", "naive": "#6b7694"}
    for method, label in (("optimal", "Óptimo teórico"), ("arima", "ARIMA(1,0,0) estimado"), ("naive", "Persistencia")):
        means = [linear["summary"][str(h)][method]["rmse"]["mean"] for h in horizons]
        lows = [linear["summary"][str(h)][method]["rmse"]["seed_q025"] for h in horizons]
        highs = [linear["summary"][str(h)][method]["rmse"]["seed_q975"] for h in horizons]
        axis.plot(horizons, means, marker="o", color=colors[method], label=label)
        axis.fill_between(horizons, lows, highs, color=colors[method], alpha=0.12, linewidth=0)
    irreducible = [linear["summary"][str(h)]["irreducible_rmse"] for h in horizons]
    axis.plot(horizons, irreducible, color="#202a38", linestyle="--", linewidth=1, label="Error irreducible")
    axis.set(title="AR(1): RMSE por horizonte", xlabel="Horizonte $h$", ylabel="RMSE de prueba")
    axis.grid(alpha=0.2, color="#748198")
    axis.legend(frameon=False, ncol=2)
    save_svg(figure, output / "02-limite-predictor-optimo.svg")
    plt.close(figure)

    figure, axes = plt.subplots(1, 2, figsize=(9.0, 4.4), constrained_layout=True, sharey=True)
    panels = [
        (axes[0], "AR(1), h=1", linear["summary"]["1"], ("optimal", "arima", "naive")),
        (axes[1], "Proceso no lineal, un paso", nonlinear["summary"], ("oracle", "arima", "mlp", "naive")),
    ]
    labels = {"optimal": "Óptimo", "oracle": "Oráculo", "arima": "ARIMA", "mlp": "MLP", "naive": "Persistencia"}
    bars = {"optimal": "#1d503b", "oracle": "#1d503b", "arima": "#d97843", "mlp": "#5f8fbe", "naive": "#6b7694"}
    for axis, title, methods, names in panels:
        values = [methods[name]["mae"]["mean"] for name in names]
        lows = [values[i] - methods[name]["mae"]["seed_q025"] for i, name in enumerate(names)]
        highs = [methods[name]["mae"]["seed_q975"] - values[i] for i, name in enumerate(names)]
        axis.bar(np.arange(len(names)), values, color=[bars[name] for name in names], width=0.66,
                 yerr=np.asarray([lows, highs]), capsize=3, error_kw={"linewidth": 0.8})
        axis.set_xticks(np.arange(len(names)), [labels[name] for name in names], rotation=18, ha="right")
        axis.set_title(title)
        axis.grid(axis="y", alpha=0.2, color="#748198")
    axes[0].set_ylabel("MAE (menor es mejor)")
    save_svg(figure, output / "03-error-lineal-no-lineal.svg")
    plt.close(figure)

    figure, axis = plt.subplots(figsize=(8.4, 4.4), constrained_layout=True)
    labels = {"oracle": "Oráculo", "arima": "ARIMA", "mlp": "MLP", "naive": "Persistencia"}
    colors = {"oracle": "#1d503b", "arima": "#d97843", "mlp": "#5f8fbe", "naive": "#6b7694"}
    timings = nonlinear["fit_ms_median"]
    for method in ("oracle", "arima", "mlp", "naive"):
        fit = timings.get(method, 0.0)
        if method == "oracle":
            fit = 0.0
        metric = nonlinear["summary"][method]["rmse"]["mean"]
        axis.scatter(fit, metric, s=58, color=colors[method], zorder=3)
        infer = nonlinear["inference_ms_per_1000"][method]
        axis.annotate(f"{labels[method]}\n{infer:.3g} ms/1.000", (fit, metric), xytext=(8, 7),
                      textcoords="offset points", fontsize=8)
    axis.set_xlim(left=-max(timings.values()) * 0.05, right=max(timings.values()) * 1.25)
    axis.set(title="Precisión y coste en CPU local", xlabel="Ajuste por réplica (ms)", ylabel="RMSE (menor es mejor)")
    axis.grid(alpha=0.2, color="#748198")
    save_svg(figure, output / "04-precision-coste.svg")
    plt.close(figure)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=HERE)
    parser.add_argument(
        "--figures-only",
        action="store_true",
        help="Regenerate SVGs from an existing resultados.json without rerunning models.",
    )
    args = parser.parse_args()
    if args.figures_only:
        existing = json.loads(
            (args.output_dir / "resultados.json").read_text(encoding="utf-8")
        )
        save_figures(
            existing["linear"], existing["nonlinear"], args.output_dir / "figures"
        )
        print(f"SVGs regenerated from {args.output_dir / 'resultados.json'}")
        return
    linear = run_linear()
    nonlinear = run_nonlinear()
    results = {
        "experiment": "ARIMA frente a predictores en procesos sintéticos",
        "data": "synthetic only; no external data or pretrained weights",
        "environment": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "scikit_learn": __import__("sklearn").__version__,
            "matplotlib": matplotlib.__version__,
            "platform": platform.platform(),
            "processor": platform.processor() or "not reported by OS",
        },
        "linear": linear,
        "nonlinear": nonlinear,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "resultados.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    save_figures(linear, nonlinear, args.output_dir / "figures")
    print(json.dumps({
        "output": str(args.output_dir),
        "linear_h1": linear["summary"]["1"],
        "nonlinear": nonlinear["summary"],
        "diebold_mariano_hac": nonlinear["diebold_mariano_hac"],
        "fit_ms_median": nonlinear["fit_ms_median"],
        "inference_ms_per_1000": nonlinear["inference_ms_per_1000"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
