# Una arista y la resistencia efectiva

Código, datos y figuras reproducibles del borrador. El artículo y todos sus recursos son borradores y no se publican mientras `draft: true` siga activo.

## Reproducir

Se usaron Python 3.10.12 y las versiones fijadas en `requirements.txt`. En un entorno virtual:

```sh
python3 -m venv .venv-resistencia
.venv-resistencia/bin/python -m pip install -r experiments/resistencia-efectiva/requirements.txt
.venv-resistencia/bin/python experiments/resistencia-efectiva/experimento.py
.venv-resistencia/bin/python -m unittest discover -s experiments/resistencia-efectiva -p 'test_*.py' -v
.venv-resistencia/bin/python experiments/resistencia-efectiva/verificar.py
```

`experimento.py` vuelve a calcular los índices y guarda `resultados.json` y dos figuras SVG. Las semillas, grafos, versiones, tolerancia, métricas y matrices de resistencias quedan registrados. Los tiempos dependen de la máquina. `verificar.py` comprueba los datos guardados y las figuras sin volver a ejecutar la búsqueda de estrategias.

## Convenciones y grafos

Se usan grafos no dirigidos, simples, conectados y sin bucles. El peso de cada arista es su conductancia, siempre positiva. Los experimentos comparativos asignan conductancia 1 a toda conexión existente y a la arista añadida. El laplaciano es el combinatorio ponderado `L = D - A`.

Las cuatro redes comparativas tienen `n = 16`: un camino con 15 aristas, un ciclo con 16, cuatro ciclos de cuatro nodos conectados en cadena por tres puentes con 19, y una red `G(n,m)` aleatoria conectada con 24. El generador aleatorio empieza en la semilla `20261104` y avanza hasta obtener una muestra conectada de 24 aristas. Se registran la semilla y las aristas elegidas. Los tamaños de aristas difieren entre familias porque corresponden a sus topologías. Las tres estrategias se comparan sobre exactamente la misma red base dentro de cada familia.

La elección aleatoria selecciona uniformemente una no arista en 50 semillas, de `20261105` a `20261154`. Sus percentiles describen la distribución de esas candidatas sobre la red fija; no son intervalos de confianza de una población. La heurística geodésica elige la no arista con máxima distancia de camino mínimo, con desempate lexicográfico. La estrategia de mayor reducción calcula directamente `Kf(G+e)` para cada no arista y escoge el mínimo, también con desempate lexicográfico. Esta búsqueda exhaustiva sirve para redes de 16 nodos y no se propone como algoritmo escalable.

Para cada caso se guardan el índice de Kirchhoff, la reducción porcentual, `lambda_2`, su variación y el tiempo de selección y de recálculo. El tiempo de búsqueda exhaustiva incluye la evaluación de todas las candidatas; los demás tiempos corresponden a su propia selección. Ambos dependen de CPU, bibliotecas y carga local. No se interpreta una menor cantidad de aristas como robustez.

## Identidad de cuatro nodos

En el camino unitario `A-B-C-D`, hay un único recorrido entre A y D, así que `R_AD = 3`. Añadir `A-D` forma un ciclo: las rutas de resistencia 3 y 1 quedan en paralelo y `R'_AD = (1/3 + 1)^-1 = 3/4`. Para un árbol, la resistencia entre cada par es su distancia de camino; al sumar distancias en el camino de cuatro nodos se obtiene `Kf = 10`. En el ciclo de cuatro nodos, cada par adyacente aporta `3/4` y cada par opuesto aporta 1, lo que da `Kf = 4(3/4) + 2 = 5`.

## Derivación de actualización de rango uno

Sea `b = e_u - e_v`, conductancia añadida `w > 0`, y sea `1^perp` el subespacio ortogonal al vector constante. Para un grafo conectado, la restricción de `L` a ese subespacio es definida positiva e invertible; además, `b` pertenece al subespacio. Sherman–Morrison da allí:

```text
(L + w b b^T)^-1 = L^-1 - w L^-1 b b^T L^-1 / (1 + w b^T L^-1 b)
```

Extendida por cero en la dirección constante, la inversa restringida es `L+`. Proyectando con `c = e_i - e_j`:

```text
R'ij = c^T L+' c
     = R_ij - w (c^T L+ b)^2 / (1 + w b^T L+ b)
```

El denominador es positivo y el término sustraído es no negativo, así que cada resistencia efectiva no aumenta. Puede quedar igual si `c^T L+ b = 0`. Sumando sobre pares se deduce que `Kf` tampoco aumenta. También `L' - L = wbb^T` es semidefinida positiva; por el principio de min-max, los autovalores ordenados no disminuyen y por tanto `lambda_2` no baja. Esta monotonía no hace equivalentes la minimización de `Kf` y la maximización de `lambda_2`.

Para el grafo interactivo de ocho nodos, dos ciclos de cuatro están conectados por una arista. Se precalculan todas las 19 no aristas candidatas: después de elegir una, las resistencias entre todos los pares, `Kf` y `lambda_2` provienen de pseudoinversas directas del laplaciano actualizado. La matriz de resistencias publicada contrasta la red inicial con la conexión A–H, ambas bajo una escala común.

## Figuras y aplicación

`01-estrategias-kirchhoff.svg` visualiza la reducción de `Kf` y los percentiles de las 50 elecciones aleatorias. `02-matriz-resistencias.svg` muestra las resistencias par a par antes y después de A–H con el mismo mínimo y máximo. El grafo de ocho nodos del artículo es un SVG estático: controles HTML permiten seleccionar una pareja y añadir una conexión precalculada; Restablecer devuelve exactamente las métricas iniciales. No hay simulación, temporizador, `requestAnimationFrame`, dependencia de visualización ni trabajo mientras está inactivo.

La prueba matemática automatizada comprueba el camino y ciclo de cuatro nodos, la monotonicidad de las resistencias y de `lambda_2`, la fórmula de rango uno frente a pseudoinversa directa, la identidad espectral de `Kf`, las topologías, las candidatas de la interfaz y la reproducibilidad. El verificador vuelve a calcular los resultados publicados y valida que las figuras SVG incluyan texto y no scripts.
