# Experimento: ARIMA frente a predictores flexibles

Reproducción del experimento sintético enlazado desde el borrador sobre predicción temporal. No descarga datos, pesos ni modelos. El artículo permanece como borrador.

## Entorno

Python 3.10 o posterior. Dependencias científicas separadas de las dependencias npm:

```sh
python3 -m venv .venv-arima
.venv-arima/bin/python -m pip install -r experiments/arima-transformers/requirements.txt
.venv-arima/bin/python experiments/arima-transformers/experimento.py
.venv-arima/bin/python experiments/arima-transformers/verificar.py
```

`experimento.py` genera `resultados.json` y cuatro SVG. No cambia fuentes editoriales. `verificar.py` repite los cálculos en un directorio temporal, compara las métricas con tolerancia numérica, comprueba las propiedades estadísticas y valida el XML de las cuatro figuras regeneradas y versionadas sin sobrescribirlas. Los metadatos de plataforma y los tiempos de ejecución se excluyen de la comparación porque dependen de cada máquina.

Para regenerar únicamente las figuras SVG desde los resultados ya calculados, sin volver a ajustar modelos:

```sh
.venv-arima/bin/python experiments/arima-transformers/experimento.py --figures-only
```

## Diseño

### A. AR(1) estacionario

Proceso con `phi=0.8`, innovaciones gaussianas de desviación típica 1, 256 pasos de calentamiento, 512 observaciones y 20 semillas. En cada semilla se ajusta por mínimos cuadrados un ARIMA(1,0,0) sin constante sobre 48 series y 320 observaciones por serie. Se evalúa en otras 24 series no usadas para ajustar, con pronósticos de origen rodante y horizontes 1, 4 y 8. Se comparan el predictor teórico `phi**h * x_t`, el ARIMA estimado y persistencia. El predictor teórico tiene RMSE irreducible `sigma * sqrt(sum(phi**(2*j), j=0..h-1))`.

### B. Proceso no lineal estacionario

`x[t+1] = 0.55*x[t] + 0.7*tanh(1.4*x[t]) + epsilon[t]`, con innovaciones gaussianas de desviación típica 0.55. Se usan 10 semillas, las mismas longitudes de serie y partición por trayectorias. Se comparan persistencia, ARIMA(1,0,0) con constante, una MLP de una capa oculta (16 neuronas tanh) y el predictor oráculo que conoce la función generadora. La MLP se entrena únicamente con las series de entrenamiento; la arquitectura, regularización y optimizador están fijados antes de evaluar test. La MLP sirve como modelo no lineal pequeño, no como sustituto de un Transformer.

Los intervalos de las figuras son los cuantiles 2.5 y 97.5 de las medias de cada semilla. Describen variación entre las réplicas sintéticas, no intervalos universales sobre series reales. El contraste Diebold-Mariano compara diferencias de pérdida cuadrática ARIMA menos MLP para el escenario B. Su varianza usa HAC de Bartlett con 12 retardos dentro de cada trayectoria; trayectorias y semillas se mantienen separadas para conservar la dependencia temporal. Es una prueba condicionada a este generador, no una conclusión general sobre predicción.

## Coste

Los tiempos de ajuste e inferencia se miden en CPU con `perf_counter` en la máquina que genera los resultados. La inferencia se presenta en milisegundos por 1.000 predicciones en lote. Son referencias locales, no promesas de latencia portable; el tiempo de CPU y las versiones quedan registrados en `resultados.json`.

## Alcance y límites

No se ejecuta TimesFM, Chronos ni un Transformer entrenado desde cero. En este entorno no hay pesos/versiones de esos modelos fijados ni una configuración de cómputo y protocolo que permita una comparación justa; instalar una arquitectura genérica y entrenarla con una serie pequeña no respondería la pregunta sobre modelos fundacionales. Su evidencia se discute a partir de los papers enlazados en el artículo. Un resultado zero-shot sigue dependiendo del preentrenamiento y de la posible superposición entre los datos de preentrenamiento y los de evaluación.

Los experimentos sintéticos permiten verificar una propiedad matemática y mostrar el coste de una mala especificación. No estiman el comportamiento de una aplicación real, no representan un benchmark público y no prueban que una MLP o un Transformer gane en otros regímenes.
