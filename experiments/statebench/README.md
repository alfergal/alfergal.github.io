# Demostración sintética de StateBench

Este experimento mide sensibilidad al borrado en sistemas finitos pequeños. **No reproduce el benchmark StateBench y no entrena ni evalúa modelos neuronales o LLM.** No usa secuencias biológicas, modelos externos ni datos descargados.

## Diseño

- Semilla: `20261105`.
- Cinco variables con valores en `0..4`.
- Longitudes: 8, 32, 128 y 512 operaciones.
- 40 trazas sintéticas por longitud.
- Cada traza general parte de intercambios aleatorios entre pares de variables.
- Las trazas aperiódicas usan escrituras constantes derivadas del valor que el intercambio habría copiado.
- Las trazas solubles aplican en cada paso dos incrementos modulares simultáneos, calculados para producir el mismo estado que el intercambio. Son traslaciones abelianas, pero no tienen el formato de una única asignación por paso del benchmark.
- La variante R-trivial vuelve a escribir el valor inicial de las dos variables elegidas. Como esos valores ya están en el estado inicial, esta construcción concreta produce sensibilidad cero; no es una afirmación sobre todas las trazas R-triviales.

Para una traza y un estado inicial fijos, se elimina cada operación por separado. La métrica es la fracción de borrados que cambian el estado final. Los resultados JSON contienen la media y la desviación estándar muestral (`ddof=1`) entre las 40 trazas. Los valores dependen de esta construcción y semilla.

## Reproducir

Con Python 3.10:

```bash
python -m pip install -r requirements.txt
python statebench_demostracion_sensibilidad.py
python -m unittest discover -s . -p 'test_*.py' -v
```

El script regenera `statebench_sensibilidad_resultados.json` y el SVG vectorial local `statebench_sensibilidad.svg`. Para actualizar la figura usada por el borrador, copia ese SVG a `../../public/figures/statebench-sensibilidad.svg` y vuelve a ejecutar las pruebas. La prueba compara la salida regenerada con el recurso de la web.

El artículo en MDX distingue esta demostración exacta de los resultados publicados por Petty, Merrill y Sabharwal. No se ha ejecutado la evaluación del paper ni una evaluación propia de modelos.
