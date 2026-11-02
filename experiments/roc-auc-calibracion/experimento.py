"""Experimento reproducible: ranking, calibración y temperatura.

Requisitos: numpy, scipy, scikit-learn, matplotlib.
Python >=3.11. Ejecutar: python experiments/roc-auc-calibracion/experimento.py desde la raíz.
No utiliza datos externos ni reentrena el generador con el conjunto de test.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from matplotlib import pyplot as plt
from scipy.optimize import minimize_scalar
from scipy.special import expit
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    log_loss,
    roc_curve,
)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FIG = ROOT / "public" / "figures" / "roc-auc-calibracion"
FIG.mkdir(parents=True, exist_ok=True)
SEED = 20261102
N = 100_000
N_CALIB = 20_000
STRENGTH = 14.0
ORIGINAL_DISTORTION_T = 0.5
PALETTE = {"bg": "#080F26", "blue": "#A9D6F5", "pink": "#F2A7C6", "white": "#F8FAFF", "muted": "#9BA9C4"}

rng = np.random.default_rng(SEED)
x = rng.uniform(-1, 1, size=N)
logit_true = STRENGTH * x
p_true = expit(logit_true)
y = rng.binomial(1, p_true)
perm = rng.permutation(N)
cal, test = perm[:N_CALIB], perm[N_CALIB:]
y_cal, y_test = y[cal], y[test]
s_cal, s_test = logit_true[cal], logit_true[test]
p_test = expit(s_test)
p_bad = expit(s_test / ORIGINAL_DISTORTION_T)
p_bad_cal = expit(s_cal / ORIGINAL_DISTORTION_T)

# AUC: tested on probabilities, not on latent scores, so exact rank equivalence is tested.
def ece_quantile(p: np.ndarray, bins: int = 15) -> float:
    # Descriptive finite-sample ECE; sensitive to binning and sample size.
    order = np.argsort(p, kind="stable")
    idx_groups = np.array_split(order, bins)
    return float(sum(len(ids)/len(p)*abs(np.mean(p[ids])-np.mean(y_test[ids])) for ids in idx_groups))

def scores(p: np.ndarray) -> dict[str, float]:
    return {
        "roc_auc": float(roc_auc_score(y_test, p)),
        "average_precision": float(average_precision_score(y_test, p)),
        "brier": float(brier_score_loss(y_test, p)),
        "log_loss": float(log_loss(y_test, p, labels=[0, 1])),
        "ece_15_quantile": ece_quantile(p),
    }

base = scores(p_test)
bad = scores(p_bad)

# Temperature: estimate T on calibration portion exclusively.
raw_cal = s_cal / ORIGINAL_DISTORTION_T
raw_test = s_test / ORIGINAL_DISTORTION_T
opt = minimize_scalar(
    lambda t: log_loss(y_cal, expit(raw_cal / t), labels=[0,1]),
    bounds=(0.3, 6.0), method="bounded", options={"xatol": 1e-8}
)
assert opt.success
p_temp_calibrated = expit(raw_test / float(opt.x))

# Platt: logistic calibration on raw logits, trained only on calibration partition.
platt = LogisticRegression(C=1e6, max_iter=1000)
platt.fit(raw_cal.reshape(-1,1), y_cal)
p_platt = platt.predict_proba(raw_test.reshape(-1,1))[:, 1]

# Isotonic: nonstrict monotonic, can create ties and alter ROC-AUC.
iso = IsotonicRegression(out_of_bounds="clip")
iso.fit(p_bad_cal, y_cal)
p_iso = iso.predict(p_bad)

all_scores = {
    "reference_true_probabilities": base,
    "distorted_T_0.5": bad,
    "temperature_refit": scores(p_temp_calibrated),
    "platt_refit": scores(p_platt),
    "isotonic_refit": scores(p_iso),
}

temps = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0]
temp_scores = {str(t): scores(expit(s_test/t)) for t in temps}
# Higher-resolution precomputed values for slider, no browser-side heavy computations.
slider_temps = np.round(np.arange(0.5, 3.00001, 0.05), 2)
interactive_data = [
    {"temperature": float(t), **{k: round(v, 8) for k,v in scores(expit(s_test/t)).items()}}
    for t in slider_temps
]

assert np.isclose(base["roc_auc"], bad["roc_auc"], rtol=0, atol=1e-12)
assert np.isclose(base["average_precision"], bad["average_precision"], rtol=0, atol=1e-12)
assert abs(base["roc_auc"]-0.99) < 0.01
assert bad["brier"] > base["brier"]
assert bad["log_loss"] > base["log_loss"]

# Paired bootstrap on the same test cases: illustrative sampling uncertainty.
brng = np.random.default_rng(SEED + 1)
diff_brier = (p_bad - y_test)**2 - (p_test - y_test)**2
# Per-observation log loss, with clipping for machine precision.
eps = np.finfo(float).eps
lp = lambda p: -(y_test*np.log(np.clip(p,eps,1-eps))+(1-y_test)*np.log1p(-np.clip(p,eps,1-eps)))
diff_logloss = lp(p_bad)-lp(p_test)
boot_bs = []
boot_ll = []
for _ in range(300):
    ids = brng.integers(0, len(y_test), len(y_test))
    boot_bs.append(float(np.mean(diff_brier[ids])))
    boot_ll.append(float(np.mean(diff_logloss[ids])))
ci = {"delta_brier_bad_minus_reference": {"estimate":float(np.mean(diff_brier)),"percentile_95_interval":[float(a) for a in np.percentile(boot_bs,[2.5,97.5])]},
      "delta_logloss_bad_minus_reference": {"estimate":float(np.mean(diff_logloss)),"percentile_95_interval":[float(a) for a in np.percentile(boot_ll,[2.5,97.5])]}}

results = {"seed": SEED, "n_total": N, "n_calibration": N_CALIB, "n_test": len(test),
           "generating_process": "X ~ Uniform(-1, 1); P(Y=1|X)=sigmoid(14*X); Y~Bernoulli(P)",
           "base_prevalence_test": float(np.mean(y_test)),
           "scores": all_scores,"temperature_sweep": temp_scores,
           "fitted_temperature": float(opt.x),"platt_slope":float(platt.coef_[0,0]),
           "paired_bootstrap": ci,"versions":{"numpy":np.__version__}}
(HERE/"resultados.json").write_text(json.dumps(results, indent=2, ensure_ascii=False)+"\n", encoding="utf8")
(ROOT / "src" / "data" / "roc_auc_temperature.json").write_text(json.dumps(interactive_data, separators=(",", ":"))+"\n",encoding="utf8")

plt.rcParams.update({"figure.facecolor": PALETTE["bg"],"axes.facecolor": PALETTE["bg"],
                     "savefig.facecolor": PALETTE["bg"],"text.color": PALETTE["white"],
                     "axes.labelcolor": PALETTE["white"],"xtick.color": PALETTE["white"],
                     "ytick.color": PALETTE["white"],"axes.edgecolor": PALETTE["muted"],
                     "grid.color": PALETTE["muted"],"font.family":"DejaVu Serif","font.size":11})
def setup(ax, title, xlabel, ylabel):
    ax.set_title(title, loc="left", fontsize=15, fontweight="semibold",pad=16)
    ax.set_xlabel(xlabel,labelpad=10); ax.set_ylabel(ylabel,labelpad=10)
    ax.grid(True,alpha=0.18); ax.spines[['top','right']].set_visible(False)

def save(fig, slug):
    fig.tight_layout(pad=2.3)
    fig.savefig(FIG/f"{slug}.svg",format="svg",bbox_inches="tight")
    plt.close(fig)

# Fig 1. Identical ROC curves; different line styles distinguish their overlap.
fig,ax=plt.subplots(figsize=(8,5.5))
fpr,tpr,_=roc_curve(y_test,p_test)
ax.plot(fpr,tpr,color=PALETTE['blue'],linewidth=4,label=f"Referencia (AUC={base['roc_auc']:.5f})")
fpr2,tpr2,_=roc_curve(y_test,p_bad)
ax.plot(fpr2,tpr2,color=PALETTE['pink'],linewidth=1.5,linestyle="--",label=f"Distorsionado (AUC={bad['roc_auc']:.5f})")
ax.plot([0,1],[0,1],color=PALETTE['muted'],linestyle=':',alpha=.7,label="Azar")
setup(ax,"Dos distribuciones de probabilidad; una misma curva ROC", "Tasa de falsos positivos", "Tasa de verdaderos positivos")
ax.legend(facecolor=PALETTE['bg'],edgecolor=PALETTE['muted'],labelcolor=PALETTE['white'],loc='lower right')
save(fig,'01-curvas-roc')

# Fig 2. Reliability across quantile bins, show occupied x-range rather than uniformly populated.
fig,ax=plt.subplots(figsize=(8,5.5))
for p,label,color in [(p_test,'Referencia',PALETTE['blue']),(p_bad,'Distorsionado (T=0.5)',PALETTE['pink'])]:
    obs,pred=calibration_curve(y_test,p,n_bins=18,strategy='quantile')
    ax.plot(pred,obs,marker='o',markersize=4,linewidth=2,color=color,label=label)
ax.plot([0,1],[0,1],color=PALETTE['muted'],linestyle=':',label='Ideal')
setup(ax,'Calibración: probabilidades estimadas y frecuencias observadas','Probabilidad media predicha por bin','Frecuencia positiva observada')
ax.legend(facecolor=PALETTE['bg'],edgecolor=PALETTE['muted'],labelcolor=PALETTE['white'],loc='upper left');ax.set_xlim(0,1);ax.set_ylim(0,1)
save(fig,'02-calibracion')

# Fig 3. Analytic transform.
fig,ax=plt.subplots(figsize=(8,5.5))
pgrid=np.linspace(0.005,0.995,401)
from scipy.special import logit
for t,label,color,linestyle in [(0.5,'T=0.5: más extremas',PALETTE['pink'],'-'),(1.0,'T=1: identidad',PALETTE['white'],'--'),(2.0,'T=2: más moderadas',PALETTE['blue'],'-')]:
    ax.plot(pgrid,expit(logit(pgrid)/t),color=color,linestyle=linestyle,linewidth=2.5,label=label)
setup(ax,'Transformaciones estrictamente crecientes','Probabilidad original','Probabilidad transformada')
ax.legend(facecolor=PALETTE['bg'],edgecolor=PALETTE['muted'],labelcolor=PALETTE['white'])
save(fig,'03-transformaciones')

# Fig 4. Temperature sweep with two y axes; scales must be interpreted separately.
fig,ax=plt.subplots(figsize=(8,5.5))
tlist=np.linspace(.5,3,101)
bs=[scores(expit(s_test/t))['brier'] for t in tlist]
ll=[scores(expit(s_test/t))['log_loss'] for t in tlist]
a2=ax.twinx()
ax.plot(tlist,bs,color=PALETTE['blue'],linewidth=2.4,label='Brier Score')
a2.plot(tlist,ll,color=PALETTE['pink'],linewidth=2.4,label='Log-loss')
ax.axvline(1,color=PALETTE['white'],alpha=.7,linestyle=':')
setup(ax,'Efecto de la temperatura sobre la calidad probabilística','Temperatura T','Brier Score ↓')
a2.set_ylabel('Log-loss ↓',color=PALETTE['pink']); a2.tick_params(axis='y',colors=PALETTE['pink']);a2.spines['right'].set_color(PALETTE['pink'])
from matplotlib.lines import Line2D
ax.legend(handles=[Line2D([0],[0],color=PALETTE['blue'],lw=2.4,label='Brier Score'),Line2D([0],[0],color=PALETTE['pink'],lw=2.4,label='Log-loss'),Line2D([0],[0],color=PALETTE['white'],ls=':',lw=1.5,label='Referencia T=1')],facecolor=PALETTE['bg'],edgecolor=PALETTE['muted'],labelcolor=PALETTE['white'])
save(fig,'04-temperatura-metricas')

# Fig 5. Calibration before and after refit, on untouched test only.
fig,ax=plt.subplots(figsize=(8,5.5))
for p,label,color,style in [(p_bad,'Distorsionado',PALETTE['pink'],'-'),(p_temp_calibrated,'Recalibrado T',PALETTE['blue'],'-'),(p_test,'Referencia',PALETTE['white'],'--')]:
    obs,pred=calibration_curve(y_test,p,n_bins=18,strategy='quantile')
    ax.plot(pred,obs,marker='o',markersize=3,linewidth=2,linestyle=style,color=color,label=label)
ax.plot([0,1],[0,1],color=PALETTE['muted'],linestyle=':',label='Ideal')
setup(ax,'Recalibrar sin volver a entrenar el clasificador','Probabilidad media predicha por bin','Frecuencia positiva observada')
ax.legend(facecolor=PALETTE['bg'],edgecolor=PALETTE['muted'],labelcolor=PALETTE['white'],loc='upper left');ax.set_xlim(0,1);ax.set_ylim(0,1)
save(fig,'05-antes-despues')

print('N',N,'calib',N_CALIB,'test',len(test),'prevalencia',results['base_prevalence_test'])
for name,met in all_scores.items(): print(name, {k:round(v,6) for k,v in met.items()})
print('T ajustada',opt.x,'intervalos',ci)
