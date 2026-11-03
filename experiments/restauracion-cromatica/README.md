# Restauración cromática sintética

Experimento original y pequeño para el segundo artículo del blog, que permanece en borrador. Los pares proceden de reproducciones digitales **actuales** del Met, no de colores históricos conocidos. La degradación sRGB es artificial; los resultados no validan eliminación de barnices ni reconstrucción química de pigmentos.

## Reproducir

Python 3.11, CPU (sin GPU). El tiempo de entrenamiento depende del equipo. El experimento utiliza dos hilos y algoritmos deterministas. No requiere el servidor Astro.

```sh
python3.11 -m venv /tmp/pintura-venv
/tmp/pintura-venv/bin/pip install -r experiments/restauracion-cromatica/requirements.txt
MPLCONFIGDIR=/tmp/pintura-mpl /tmp/pintura-venv/bin/python experiments/restauracion-cromatica/verificar.py --data /tmp/pintura-datos
```

El verificador ejecuta cuatro tests científicos, repite entrenamiento y evaluación en un directorio temporal, compara todos los números (tolerancia absoluta 1e-7) y verifica por SHA-256 los seis recursos web. No sobrescribe resultados versionados. Las versiones directas están fijadas; `entorno.txt` registra también las transitivas de la ejecución comprobada. Los hashes gráficos son estrictos y pueden variar entre versiones o plataformas: investigar la causa antes de reemplazar evidencia.

Para explorar sin sustituir los archivos del artículo:

```sh
MPLCONFIGDIR=/tmp/pintura-mpl /tmp/pintura-venv/bin/python experiments/restauracion-cromatica/experimento.py --data /tmp/pintura-datos --output /tmp/pintura-salida
```

Los originales descargados, cachés y pesos quedan fuera del repositorio. `cnn.pt` se regenera en la salida; no se carga ningún pickle externo. La descarga valida el SHA-256 antes de guardar cada imagen y falla si el proveedor cambia los bytes. No regenera el manifiesto automáticamente.

## Datos y derechos

`datos.json` enumera 20 pinturas: título y autor de la API, ficha, URL de imagen, consulta del 3 de noviembre de 2026, dominio público verificado, CC0 y hash. Se comprobó cada `isPublicDomain` y la disponibilidad de su imagen. Política: https://www.metmuseum.org/hubs/open-access; licencia: https://creativecommons.org/publicdomain/zero/1.0/; API: https://metmuseum.github.io/.

Selección manual de conveniencia; no representa todo el patrimonio pictórico. La partición se hizo mediante `numpy.random.default_rng(20261103).permutation(20)`: primeras 12 posiciones para entrenamiento, siguientes 4 validación y últimas 4 test. El manifiesto mantiene el orden de adquisición y fija esa asignación. Ningún recorte de una pintura aparece en otra partición; los artistas sí pueden repetirse.

Los perfiles ICC disponibles se convierten a sRGB. Si faltan, se asume sRGB. Se aplica `ImageOps.fit` con Lanczos: recorte central cuadrado 192×192, sin estirar la obra. No se analiza el exterior descartado. La descarga web no sustituye una captura colorimétrica calibrada.

Las figuras 1–3 muestran el primer registro de test del manifiesto, elegido por orden antes de evaluar: **Roses**, Vincent van Gogh, 1890, Met 436534. Fuente: https://www.metmuseum.org/art/collection/search/436534, reproducción Open Access CC0. Recortes, degradación, predicciones y mapas son modificaciones experimentales. Las imágenes del Thyssen y de los papers no se redistribuyen ni se usan para entrenar. Los seis recursos derivados en `public/figures/` son accesibles por URL incluso con el artículo en borrador; no contienen el texto del artículo.

## Protocolo fijado

- Semilla 20261103 en NumPy y PyTorch, CPU, dos hilos, algoritmos deterministas.
- Transformación global afín en sRGB codificado: contraste `1-.25s`, atenuación `1-s*[.04,.12,.28]`, velo `s*[.07,.05,.015]`, clipping [0,1]. No es un modelo físico de barniz.
- 768 pares de parches 48×48 de las 12 pinturas de entrenamiento; intensidad uniforme [.25,1] y volteos horizontales. Parches fijos durante las 40 épocas.
- Gray-world + expansión de percentiles 1/99 por canal; mezcla con entrada seleccionada entre 0,.25,.5,.75,1 por MAE de validación: .25.
- Regresión afín supervisada, 12 coeficientes, mínimos cuadrados, píxeles cada 4 posiciones del entrenamiento y las cuatro intensidades. Sin ajuste en test.
- CNN residual 3→12→12→3; kernels 3,3,1, ReLU, padding reflectante, amplitud residual .35 y tanh, clipping; 1.683 parámetros, Adam .002, batch32, 40 épocas. Checkpoint por menor MAE de validación: época39. No se ha hecho búsqueda de arquitecturas.
- Validación y test a intensidades .25,.5,.75,1. Los píxeles de test solo se cargan tras congelar los métodos.
- MAE sobre sRGB[0,1], SSIM por canales con ventana7/rango1, CIEDE2000 sobre CIELAB D65/2°. Cada métrica usa el mismo recorte; predicciones float, antes de cuantizar WebP.
- 64 registros de test: 4 pinturas × 4 intensidades × 4 métodos. Medias con el mismo peso por pintura/intensidad; desviación entre pinturas; IC percentil95 de 2.000 remuestreos por pintura con semilla20261104, reteniendo sus intensidades. Cuatro clústeres son insuficientes para inferencia general sólida; intervalos exploratorios.

## Evidencia y límites

`resultados.json` conserva todas las métricas, validación por época y selección, matriz afín, versiones y particiones. `recursos.json` fija los hashes de las figuras. El experimento se ejecutó inicialmente y se volvió a verificar sin cambiar parámetros tras inspeccionar test. Los gráficos se generan desde esos registros; escalas independientes para métricas y escala compartida para mapas de ΔE₀₀. No son capturas de pantalla.

La CNN mejora MAE/SSIM medios; la regresión afín obtiene menor ΔE₀₀. Los tres métodos empeoran ΔE₀₀ a intensidad .25. No hay superioridad universal, significación estadística declarada, validación física, múltiples semillas, ablación espacial ni prueba fuera de esta familia de degradación. Las imágenes y hashes comprueban reproducibilidad, no autenticidad histórica.

La bibliografía y sus enlaces están en el MDX. Se contrastaron los nueve trabajos prioritarios (incluidas las tres partes de Kirchner), la revisión de Van Vijle et al., el registro del museo y los fundamentos de CycleGAN/CIEDE2000. Para Monteiro se consultó el artículo completo depositado por la Universidade de Lisboa: https://repositorio.ulisboa.pt/server/api/core/bitstreams/943c1068-97f8-4088-a806-8cdf596bed2f/content. Para Narag se siguió el PDF enlazado por las actas. Las partes2–3 de Kirchner se describen dentro del alcance de sus resúmenes editoriales verificables; no se atribuyen detalles inaccesibles ni se comparan cifras incompatibles entre estudios.
