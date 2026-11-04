# Representaciones de secuencias: demostración sintética

Este experimento **no usa virus, proteínas, genomas, datos de pacientes ni un modelo fundacional**. Genera secuencias artificiales de dígitos `0` a `3` con tres patrones de transición y grupos con fragmentos compartidos. Sirve para ilustrar dos ideas de evaluación: las frecuencias locales pueden retener información que no aparece en la composición global, y separar registros al azar puede dejar grupos relacionados a ambos lados de la partición.

No es un benchmark biológico, no mide descubrimiento viral y no permite extrapolar rendimiento a secuencias naturales. Por esa razón no se descargan datos ni pesos de modelos y no se presentan embeddings de un modelo fundacional como si se hubieran calculado.

## Reproducir

Requiere Python 3.10 o posterior. En un entorno virtual:

```bash
python -m pip install -r requirements.txt
python experimento.py --output .
python -m unittest -v
python verificar.py
```

El generador usa la semilla `20261104`, crea 480 ejemplos equilibrados en 60 grupos y no guarda las cadenas generadas. Se comparan una regresión logística sobre frecuencias globales de símbolos y otra sobre frecuencias de k-mers de longitud 3. Cada representación se evalúa con una partición aleatoria estratificada y una partición que reserva cinco grupos por clase. Macro F1, balanced accuracy y matriz de confusión se calculan únicamente en los conjuntos de prueba.

La partición por grupos conserva las tres clases conocidas en entrenamiento y prueba. No representa una tarea de clasificación de clases evolutivas desconocidas ni una evaluación fuera de distribución de virus. El análisis es una única realización determinista, sin intervalos de confianza.

## Calidad y similitud sintética

Las etiquetas y la calidad de cada ejemplo las determina el generador; no hay valores ausentes y las clases están equilibradas. Las 480 cadenas son únicas. Cada grupo comparte tres bloques de 20 símbolos, al menos el 25 % de las posiciones. Es una dependencia artificial deliberada, no homología biológica. El código no guarda las cadenas ni calcula similitud biológica porque los dígitos no representan secuencias naturales.

## Datos y licencia

No se incorpora ni redistribuye un conjunto de datos externo, así que no hay una licencia de datos de terceros. Los ejemplos se generan durante la ejecución. Las dependencias están fijadas en `requirements.txt`.

## Salidas

`resultados.json` contiene las métricas verificables. Las figuras SVG están en `figures/`; la cuarta es un esquema conceptual, no una salida experimental. El script y las pruebas permiten regenerar las métricas y los gráficos. No se guardan secuencias sintéticas.
