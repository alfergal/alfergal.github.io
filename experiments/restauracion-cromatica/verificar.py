"""Rerun training, selection, test and figures; never overwrite checked-in evidence."""

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def compare(a, b, path="root"):
    if isinstance(a, dict):
        assert a.keys() == b.keys(), path
        for k in a:
            compare(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        assert len(a) == len(b), path
        for i, (x, y) in enumerate(zip(a, b)):
            compare(x, y, f"{path}[{i}]")
    elif isinstance(a, (float, int)):
        assert abs(a - b) <= 1e-7, (path, a, b)
    else:
        assert a == b, (path, a, b)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    args = parser.parse_args()
    subprocess.run(
        [sys.executable, "-m", "unittest", "test_experimento.py"], cwd=HERE, check=True
    )
    with tempfile.TemporaryDirectory(prefix="painting-verify-") as folder:
        output = Path(folder)
        subprocess.run(
            [
                sys.executable,
                str(HERE / "experimento.py"),
                "--data",
                str(args.data.resolve()),
                "--output",
                folder,
            ],
            check=True,
        )
        expected = json.loads((HERE / "resultados.json").read_text())
        actual = json.loads((output / "resultados.json").read_text())
        # Software versions are recorded, but platform patch differences are not scientific results.
        expected.pop("environment")
        actual.pop("environment")
        compare(expected, actual)
        for name, checksum in json.loads((HERE / "recursos.json").read_text()).items():
            assert (
                hashlib.sha256((output / "figuras" / name).read_bytes()).hexdigest()
                == checksum
            ), name
            assert (
                hashlib.sha256(
                    (ROOT / "public/figures/restauracion-cromatica" / name).read_bytes()
                ).hexdigest()
                == checksum
            ), name
    print(
        "Verified: 20 sources, 40 epochs, validation selection, 64 test records, clustered intervals and all 6 figures/assets."
    )


if __name__ == "__main__":
    main()
