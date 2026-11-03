"""Small synthetic colour restoration study. No historical ground truth is assumed.

Python 3.11. Downloads stay in --data; models and raw results stay in --output.
A frozen, painting-level split and validation-only choices precede test evaluation.
"""

import argparse
import copy
import hashlib
import io
import json
import platform
import urllib.request
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import PIL
from PIL import Image, ImageCms, ImageOps
import skimage
from skimage.color import deltaE_ciede2000, rgb2lab
from skimage.metrics import structural_similarity
import torch
from torch import nn

HERE = Path(__file__).resolve().parent
SEED = 20261103
LEVELS = [0.25, 0.5, 0.75, 1.0]
SIZE = 192
METHODS = ["deteriorada", "tradicional", "lineal", "cnn"]
LABELS = ["Deteriorada", "Gray-world + contraste", "Regresión afín", "CNN"]


def read_manifest():
    rows = json.loads((HERE / "datos.json").read_text())
    ids = [r["object_id"] for r in rows]
    assert len(ids) == len(set(ids)) == 20
    assert {
        s: sum(r["split"] == s for r in rows) for s in ["train", "validation", "test"]
    } == {"train": 12, "validation": 4, "test": 4}
    assert all(r["license"] == "CC0-1.0" and r["is_public_domain"] for r in rows)
    assert len({r["sha256"] for r in rows}) == len(rows)
    return rows


def load_image(row, directory):
    path = directory / f"{row['object_id']}.jpg"
    if not path.exists():
        # Only URLs individually verified in the checked-in rights manifest.
        request = urllib.request.Request(
            row["image"], headers={"User-Agent": "Alfergal-Research/1.0"}
        )
        data = urllib.request.urlopen(request, timeout=60).read()
        if hashlib.sha256(data).hexdigest() != row["sha256"]:
            raise ValueError(f"Source image changed: {row['object_id']}")
        path.write_bytes(data)
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == row["sha256"], path
    image = Image.open(io.BytesIO(data))
    profile = image.info.get("icc_profile")
    if profile:
        image = ImageCms.profileToProfile(
            image,
            ImageCms.ImageCmsProfile(io.BytesIO(profile)),
            ImageCms.createProfile("sRGB"),
            outputMode="RGB",
        )
    else:
        image = image.convert(
            "RGB"
        )  # explicit sRGB assumption for unprofiled web JPEGs
    image = ImageOps.fit(
        image, (SIZE, SIZE), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5)
    )
    return np.asarray(image, dtype=np.float32) / 255


def degrade(image, intensity):
    """Global affine perturbation in encoded sRGB, NOT a varnish optics model."""
    contrast = 1 - 0.25 * intensity
    attenuation = 1 - intensity * np.array([0.04, 0.12, 0.28], dtype=np.float32)
    veil = intensity * np.array([0.07, 0.05, 0.015], dtype=np.float32)
    return np.clip((contrast * (image - 0.5) + 0.5) * attenuation + veil, 0, 1).astype(
        np.float32
    )


def traditional(image, strength):
    means = image.mean(axis=(0, 1), keepdims=True)
    balanced = image * (means.mean() / np.maximum(means, 1e-6))
    low, high = np.percentile(balanced, [1, 99], axis=(0, 1), keepdims=True)
    corrected = np.clip((balanced - low) / np.maximum(high - low, 1e-6), 0, 1)
    return np.clip(image + strength * (corrected - image), 0, 1).astype(np.float32)


def tensor(image):
    return torch.from_numpy(image.transpose(2, 0, 1).copy()).unsqueeze(0)


class SmallCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Conv2d(3, 12, 3, padding=1, padding_mode="reflect"),
            nn.ReLU(),
            nn.Conv2d(12, 12, 3, padding=1, padding_mode="reflect"),
            nn.ReLU(),
            nn.Conv2d(12, 3, 1),
        )

    def forward(self, x):
        return torch.clamp(x + 0.35 * torch.tanh(self.layers(x)), 0, 1)


def predict(model, image):
    with torch.no_grad():
        return model(tensor(image))[0].permute(1, 2, 0).numpy()


def metrics(reference, prediction):
    lab_ref = rgb2lab(reference, illuminant="D65", observer="2")
    lab_pred = rgb2lab(prediction, illuminant="D65", observer="2")
    return dict(
        mae=float(np.mean(np.abs(reference - prediction))),
        ssim=float(
            structural_similarity(
                reference, prediction, channel_axis=2, data_range=1, win_size=7
            )
        ),
        delta_e=float(deltaE_ciede2000(lab_ref, lab_pred).mean()),
    )


def fit(train, validation):
    # All selection uses validation MAE, never test images.
    candidates = [0, 0.25, 0.5, 0.75, 1.0]
    scores = {
        str(w): float(
            np.mean(
                [
                    np.abs(ref - traditional(degrade(ref, s), w)).mean()
                    for ref in validation
                    for s in LEVELS
                ]
            )
        )
        for w in candidates
    }
    strength = min(candidates, key=lambda w: scores[str(w)])
    # A strong non-neural comparator: pooled supervised affine colour correction.
    x = np.concatenate(
        [
            np.c_[degrade(ref, s)[::4, ::4].reshape(-1, 3), np.ones((48 * 48, 1))]
            for ref in train
            for s in LEVELS
        ]
    )
    y = np.concatenate([ref[::4, ::4].reshape(-1, 3) for ref in train for _ in LEVELS])
    affine = np.linalg.lstsq(x, y, rcond=None)[0].astype(np.float32)
    rng = np.random.default_rng(SEED)
    patches, targets = [], []
    for _ in range(768):
        ref = train[int(rng.integers(len(train)))]
        a, b = rng.integers(0, SIZE - 48 + 1, size=2)
        target = ref[a : a + 48, b : b + 48].copy()
        if rng.random() < 0.5:
            target = target[:, ::-1].copy()
        targets.append(tensor(target)[0])
        patches.append(tensor(degrade(target, float(rng.uniform(0.25, 1))))[0])
    inputs, targets = torch.stack(patches), torch.stack(targets)
    model = SmallCNN()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.002)
    history, best, weights, best_epoch = [], float("inf"), None, None
    for epoch in range(1, 41):
        model.train()
        order = torch.randperm(len(inputs))
        for batch in order.split(32):
            optimizer.zero_grad()
            loss = torch.abs(model(inputs[batch]) - targets[batch]).mean()
            loss.backward()
            optimizer.step()
        model.eval()
        score = float(
            np.mean(
                [
                    np.abs(ref - predict(model, degrade(ref, s))).mean()
                    for ref in validation
                    for s in LEVELS
                ]
            )
        )
        history.append(dict(epoch=epoch, validation_mae=score))
        if score < best:
            best, weights, best_epoch = score, copy.deepcopy(model.state_dict()), epoch
        if epoch % 10 == 0:
            print(f"epoch {epoch}: validation MAE {score:.8f}", flush=True)
    model.load_state_dict(weights)
    return (
        model,
        affine,
        strength,
        dict(
            traditional_candidates=scores,
            traditional_strength=strength,
            affine=affine.tolist(),
            selected_epoch=best_epoch,
            history=history,
        ),
    )


def summarize(records):
    summary = {}
    for method in METHODS:
        selected = [r for r in records if r["method"] == method]
        summary[method] = {}
        for key in ["mae", "ssim", "delta_e"]:
            # Resample paintings, retaining all four severities of each painting.
            per_painting = [
                float(np.mean([r[key] for r in selected if r["object_id"] == oid]))
                for oid in sorted({r["object_id"] for r in selected})
            ]
            rng = np.random.default_rng(SEED + 1)
            draws = np.asarray(per_painting)[
                rng.integers(0, len(per_painting), (2000, len(per_painting)))
            ].mean(axis=1)
            summary[method][key] = dict(
                mean=float(np.mean(per_painting)),
                sd_between_paintings=float(np.std(per_painting, ddof=1)),
                ci95=[float(v) for v in np.percentile(draws, [2.5, 97.5])],
            )
    return summary


def make_figures(images, result, destination):
    destination.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update(
        {
            "font.family": "DejaVu Serif",
            "font.size": 10,
            "svg.fonttype": "none",
            "svg.hashsalt": "painting-20261103",
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )
    # Fixed a priori: first test painting in manifest, severity 1. Not best-case selection.
    ref, views = images
    panels = [ref, views["deteriorada"], views["tradicional"], views["cnn"]]
    fig, axes = plt.subplots(1, 4, figsize=(12, 3.5))
    for ax, image, label in zip(
        axes,
        panels,
        [
            "Referencia digital",
            "Deteriorada sintética",
            "Gray-world + contraste",
            "CNN",
        ],
    ):
        ax.imshow(image)
        ax.set_title(label)
        ax.axis("off")
    fig.suptitle("Misma pintura de test · intensidad 1 · recorte central")
    fig.tight_layout()
    fig.savefig(destination / "01-comparacion.webp", dpi=120)
    plt.close(fig)
    for name, image in [(m, views[m]) for m in ["deteriorada", "cnn"]]:
        Image.fromarray(np.round(image * 255).astype(np.uint8)).save(
            destination / f"{name}.webp", lossless=True
        )
    fig, axes = plt.subplots(1, 3, figsize=(10, 3.5))
    errors = [
        deltaE_ciede2000(rgb2lab(ref), rgb2lab(views[m]))
        for m in ["deteriorada", "tradicional", "cnn"]
    ]
    maximum = max(float(error.max()) for error in errors)
    for ax, error, label in zip(axes, errors, ["Deteriorada", "Tradicional", "CNN"]):
        im = ax.imshow(error, vmin=0, vmax=maximum, cmap="magma")
        ax.set_title(label)
        ax.axis("off")
    fig.colorbar(im, ax=axes, shrink=0.65, label="ΔE₀₀ por píxel (escala común)")
    fig.savefig(destination / "03-errores.webp", dpi=120, bbox_inches="tight")
    plt.close(fig)
    keys, names = ["mae", "ssim", "delta_e"], ["MAE ↓ (sRGB 0–1)", "SSIM ↑", "ΔE₀₀ ↓"]
    colors = ["#526681", "#95708b", "#506e61", "#276688"]
    fig, axes = plt.subplots(1, 3, figsize=(12, 4.8))
    for ax, key, label in zip(axes, keys, names):
        means = [result["summary"][m][key]["mean"] for m in METHODS]
        intervals = np.array([result["summary"][m][key]["ci95"] for m in METHODS]).T
        ax.bar(range(4), means, color=colors)
        ax.errorbar(
            range(4),
            means,
            yerr=[np.asarray(means) - intervals[0], intervals[1] - means],
            fmt="none",
            color="black",
            capsize=3,
        )
        ax.set_xticks(range(4), LABELS, rotation=45, ha="right")
        ax.set_title(label)
        if key == "ssim":
            ax.set_ylim(0, 1.05)
    fig.suptitle(
        "Test: 4 pinturas × 4 intensidades · IC bootstrap por pintura (exploratorio)"
    )
    fig.tight_layout()
    fig.savefig(destination / "04-metricas.svg", metadata={"Date": None})
    plt.close(fig)
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.7))
    for ax, key, label in zip(axes, keys, names):
        for m, title, color in zip(METHODS, LABELS, colors):
            means = [
                np.mean(
                    [
                        r[key]
                        for r in result["records"]
                        if r["method"] == m and r["intensity"] == s
                    ]
                )
                for s in LEVELS
            ]
            ax.plot(LEVELS, means, marker="o", label=title, color=color)
        ax.set_title(label)
        ax.set_xlabel("Intensidad sintética")
        ax.set_xticks(LEVELS)
    axes[-1].legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(destination / "05-intensidad.svg", metadata={"Date": None})
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.data.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(2)
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    torch.use_deterministic_algorithms(True)
    rows = read_manifest()
    # Do not load test pixels until all parameters and the checkpoint are selected.
    train = [load_image(r, args.data) for r in rows if r["split"] == "train"]
    validation = [load_image(r, args.data) for r in rows if r["split"] == "validation"]
    model, affine, strength, selection = fit(train, validation)
    torch.save(model.state_dict(), args.output / "cnn.pt")
    (args.output / "seleccion.json").write_text(json.dumps(selection, indent=2) + "\n")
    records, example = [], None
    for row in [r for r in rows if r["split"] == "test"]:
        ref = load_image(row, args.data)
        for severity in LEVELS:
            damaged = degrade(ref, severity)
            linear = np.clip(
                np.concatenate(
                    [damaged, np.ones((*damaged.shape[:2], 1), dtype=np.float32)],
                    axis=2,
                )
                @ affine,
                0,
                1,
            )
            views = dict(
                deteriorada=damaged,
                tradicional=traditional(damaged, strength),
                lineal=linear,
                cnn=predict(model, damaged),
            )
            for method, prediction in views.items():
                records.append(
                    dict(
                        object_id=row["object_id"],
                        intensity=severity,
                        method=method,
                        **metrics(ref, prediction),
                    )
                )
            if example is None and severity == 1:
                example = (ref, views)
    result = dict(
        seed=SEED,
        size=SIZE,
        split={
            s: [r["object_id"] for r in rows if r["split"] == s]
            for s in ["train", "validation", "test"]
        },
        intensities=LEVELS,
        parameters=sum(p.numel() for p in model.parameters()),
        selection=selection,
        example=dict(
            object_id=next(r["object_id"] for r in rows if r["split"] == "test"),
            intensity=1,
        ),
        summary=summarize(records),
        records=records,
        environment=dict(
            python=platform.python_version(),
            torch=torch.__version__,
            numpy=np.__version__,
            pillow=PIL.__version__,
            skimage=skimage.__version__,
            matplotlib=matplotlib.__version__,
        ),
    )
    (args.output / "resultados.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    )
    make_figures(example, result, args.output / "figuras")
    print(json.dumps(result["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
