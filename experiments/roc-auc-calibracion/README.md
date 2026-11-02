# ROC-AUC y calibración: reproducción del borrador

Datos totalmente sintéticos. El artículo `src/content/blog/roc-auc-calibracion-probabilidades.mdx` permanece con `draft: true` y solo se puede leer en desarrollo. No cambiar las salidas numéricas sin ejecutar y revisar el experimento.

Requiere Python 3.11 o posterior. No se descargan datos. Las dependencias científicas están fijadas en `requirements.txt` y no forman parte del entorno npm ni del navegador.

```sh
python3.11 -m venv .venv-calibracion
.venv-calibracion/bin/python -m pip install -r experiments/roc-auc-calibracion/requirements.txt
.venv-calibracion/bin/python experiments/roc-auc-calibracion/verificar.py
```

`verificar.py` ejecuta el experimento completo en una carpeta temporal, compara todas las métricas, el bootstrap y los 51 valores precalculados con las salidas entregadas, y compara el contenido de los cinco SVG (exceptuando fecha e identificadores internos de Matplotlib). No modifica los archivos revisados. La comprobación numérica admite diferencias absolutas de hasta `1e-10` por plataforma; una discrepancia mayor hace fallar la verificación. La verificación inicial con Python 3.11.17 y las versiones fijadas obtuvo coincidencia numérica exacta, incluida la temperatura ajustada y los intervalos bootstrap.

Para **regenerar intencionadamente** las salidas del proyecto:

```sh
.venv-calibracion/bin/python experiments/roc-auc-calibracion/experimento.py
```

Ese comando sobrescribe `resultados.json`, `src/data/roc_auc_temperature.json` y las cinco figuras. Revisar su diff y las tablas del artículo antes de aceptar cambios. Las particiones son 20.000 observaciones de calibración y 80.000 de test, semilla `20261102`; los calibradores solo se ajustan con la primera partición. La temperatura del explorador aplica a las probabilidades generadoras (`sigmoid(s/T)`); la temperatura reajustada de `resultados.json` se aplica a los logits ya distorsionados (`sigmoid((s/0.5)/T)`). Son parametrizaciones diferentes.

Las pruebas Playwright revisan todos los valores del explorador frente al JSON, su interacción y accesibilidad, las ecuaciones, las tablas, las cinco figuras y sus recursos, y la exclusión del borrador en producción, RSS y sitemap. Las figuras situadas en `public/` son recursos estáticos accesibles por URL; `draft` excluye la página del artículo, pero no constituye una protección de acceso para esos archivos ni para el repositorio público.
