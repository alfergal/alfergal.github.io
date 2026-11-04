#!/usr/bin/env python3
"""Re-run the synthetic study in a temporary directory and verify its outputs."""
from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXPECTED = json.loads((HERE / "resultados.json").read_text(encoding="utf-8"))


def assert_close(actual: object, expected: object, path: str = "resultados") -> None:
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or actual.keys() != expected.keys():
            raise AssertionError(f"Claves distintas en {path}")
        for key in expected:
            if key in {
                "environment",
                "fit_ms_median",
                "fit_ms_iqr",
                "inference_ms_per_1000",
            }:
                continue
            assert_close(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            raise AssertionError(f"Longitud distinta en {path}")
        for index, (left, right) in enumerate(zip(actual, expected, strict=True)):
            assert_close(left, right, f"{path}[{index}]")
    elif isinstance(expected, (int, float)) and not isinstance(expected, bool):
        if not isinstance(actual, (int, float)) or not math.isclose(
            float(actual), float(expected), rel_tol=1e-8, abs_tol=1e-9
        ):
            raise AssertionError(f"Diferencia numérica en {path}: {actual} != {expected}")
    elif actual != expected:
        raise AssertionError(f"Valor distinto en {path}: {actual!r} != {expected!r}")


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="alfergal-arima-verify-") as temporary:
        subprocess.run(
            [sys.executable, str(HERE / "experimento.py"), "--output-dir", temporary],
            check=True,
            capture_output=True,
            text=True,
        )
        regenerated = json.loads(
            (Path(temporary) / "resultados.json").read_text(encoding="utf-8")
        )
        assert_close(regenerated, EXPECTED)
        expected_figures = {
            "01-serie-autocorrelacion.svg",
            "02-limite-predictor-optimo.svg",
            "03-error-lineal-no-lineal.svg",
            "04-precision-coste.svg",
        }
        for directory in (Path(temporary) / "figures", HERE / "figures"):
            actual_figures = {file.name for file in directory.glob("*.svg")}
            if actual_figures != expected_figures:
                raise AssertionError(f"Conjunto inesperado de figuras en {directory}")
            for filename in sorted(directory.glob("*.svg")):
                svg = ET.parse(filename).getroot()
                if not svg.tag.endswith("svg"):
                    raise AssertionError(f"No es SVG: {filename.name}")
                if not list(svg.iter()) or not any(
                    element.tag.endswith("text") and (element.text or "").strip()
                    for element in svg.iter()
                ):
                    raise AssertionError(f"SVG vacío o sin etiquetas: {filename.name}")
                if any(element.tag.lower().endswith("script") for element in svg.iter()):
                    raise AssertionError(f"SVG contiene script: {filename.name}")
        expected_rmse = EXPECTED["linear"]["summary"]["1"]["irreducible_rmse"]
        measured_rmse = EXPECTED["linear"]["summary"]["1"]["optimal"]["rmse"]["mean"]
        if abs(expected_rmse - measured_rmse) > 0.03:
            raise AssertionError("El RMSE del oráculo AR(1) se aleja del error irreducible")
        nonlinear = EXPECTED["nonlinear"]
        if nonlinear["summary"]["mlp"]["rmse"]["mean"] >= nonlinear["summary"]["arima"]["rmse"]["mean"]:
            raise AssertionError("La MLP no mejora al ARIMA en el generador no lineal controlado")
        dm = nonlinear["diebold_mariano_hac"]
        if dm["replications"] != len(nonlinear["parameters"]["seeds"]):
            raise AssertionError("Falta una prueba DM-HAC por réplica")
        if dm["replications_p_below_005"] < dm["replications"]:
            raise AssertionError("El DM-HAC no detecta la diferencia prevista en todas las réplicas")
    print("OK: resultados reproducibles, invariantes científicos y cuatro SVG válidos.")


if __name__ == "__main__":
    main()
