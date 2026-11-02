"""Reproduce el experimento en un directorio temporal sin sobrescribir las salidas revisadas.

Ejecutar con las versiones de requirements.txt y Python >=3.11:
    python experiments/roc-auc-calibracion/verificar.py
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def compare(expected, actual, location="root"):
    if isinstance(expected, dict):
        assert expected.keys() == actual.keys(), location
        for key in expected:
            compare(expected[key], actual[key], f"{location}/{key}")
    elif isinstance(expected, list):
        assert len(expected) == len(actual), location
        for index, (left, right) in enumerate(zip(expected, actual)):
            compare(left, right, f"{location}/{index}")
    elif isinstance(expected, (int, float)):
        # Accommodate last-bit platform differences, never silently update reference data.
        assert math.isclose(expected, actual, rel_tol=0, abs_tol=1e-10), location
    else:
        assert expected == actual, location


def svg_content(path):
    root = ET.parse(path).getroot()
    for child in list(root):
        if child.tag.endswith("}metadata"):
            root.remove(child)  # Matplotlib creation date is not experimental content.
    ids = {node.attrib["id"]: f"id-{i}" for i, node in enumerate(root.iter()) if "id" in node.attrib}
    for node in root.iter():
        for key, value in list(node.attrib.items()):
            if key == "id":
                node.set(key, ids[value])
            elif value.startswith("#") and value[1:] in ids:
                node.set(key, "#" + ids[value[1:]])
            else:
                node.set(key, re.sub(r"url\(#([^)]*)\)", lambda match: "url(#" + ids.get(match[1], match[1]) + ")", value))
    return ET.tostring(root)


def main():
    with TemporaryDirectory(prefix="alfergal-calibracion-") as directory:
        root = Path(directory)
        experiment = root / "experiments" / HERE.name
        experiment.mkdir(parents=True)
        shutil.copy2(HERE / "experimento.py", experiment / "experimento.py")
        (root / "public" / "figures").mkdir(parents=True)
        (root / "src" / "data").mkdir(parents=True)
        subprocess.run([sys.executable, str(experiment / "experimento.py")], check=True,
                       env={**os.environ, "MPLBACKEND": "Agg", "MPLCONFIGDIR": str(root / "matplotlib")})
        for relative in ["experiments/roc-auc-calibracion/resultados.json", "src/data/roc_auc_temperature.json"]:
            compare(json.loads((ROOT / relative).read_text()), json.loads((root / relative).read_text()), relative)
        figures = sorted((ROOT / "public/figures/roc-auc-calibracion").glob("*.svg"))
        assert len(figures) == 5, "Expected five figures"
        for figure in figures:
            assert svg_content(figure) == svg_content(root / figure.relative_to(ROOT)), figure.name
    print("Verificación correcta: métricas, bootstrap, 51 temperaturas y cinco SVG reproducidos. Sin sobrescribir archivos del proyecto.")


if __name__ == "__main__":
    main()
