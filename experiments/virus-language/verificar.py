"""Validate saved metrics against the fixed-seed synthetic experiment."""

import json
from pathlib import Path

from experimento import run


ROOT = Path(__file__).parent
saved = json.loads((ROOT / "resultados.json").read_text(encoding="utf-8"))
fresh = run()
assert saved["synthetic_only"] is True
assert saved["sequences_persisted"] is False
assert saved["metrics"] == fresh["metrics"]
for figure in (
    "01-pca-sintetico.svg",
    "02-comparacion-modelos.svg",
    "03-generalizacion-grupos.svg",
    "04-secuencia-a-representacion.svg",
):
    path = ROOT / "figures" / figure if figure.startswith("0") else ROOT / figure
    if not path.exists():
        path = ROOT / "figures" / figure
    assert path.is_file() and path.stat().st_size > 100
    assert all(
        line == line.rstrip()
        for line in path.read_text(encoding="utf-8").splitlines()
    )
print("Resultados y figuras reproducidos correctamente.")
