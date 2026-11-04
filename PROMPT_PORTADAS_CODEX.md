# Codex: integrar portadas editoriales específicas por artículo

Repositorio: `alfergal/alfergal.github.io`.

Te adjunto el ZIP `portadas_blog_codex.zip` con cuatro portadas WebP de 1280 × 800 px y un SVG editable para la portada de series temporales. Descomprímelo y trabaja con los archivos de `assets/`.

## Diagnóstico antes de cambiar nada

Verifica `git status` antes de editar: puede haber cambios locales del logotipo αf. **No sobrescribas, restaures ni incluyas en el commit modificaciones de otros trabajos.**

Investiga por qué algunas tarjetas parecen mostrar la misma imagen. La implementación actual de `src/components/PostCard.astro` utiliza `post.data.cover ?? fallbackCover`. En el repositorio, los artículos reales de restauración pictórica y ROC-AUC ya declaran `cover` individual en el frontmatter. Comprueba si el problema es el fallback, un artículo de demostración, rutas, caché del navegador/Astro, assets obsoletos o contenido en desarrollo. No atribuyas el problema a una causa sin verificarla.

## Mapear los recursos adjuntos

| Archivo del ZIP | Artículo | Estado actual |
| --- | --- | --- |
| `assets/restauracion-pinturas.webp` | `src/content/blog/ia-colores-originales-pintura.mdx` | Ya existe MDX; sustituir portada si es apropiado |
| `assets/roc-auc-calibracion.webp` | `src/content/blog/roc-auc-calibracion-probabilidades.mdx` | Ya existe MDX; sustituir portada si es apropiado |
| `assets/series-temporales-transformers.webp` | «¿Puede un Transformer predecir mejor que 50 años de estadística?» | Solo asignar cuando el MDX exista |
| `assets/grafos-arista.webp` | «¿Puede una sola arista cambiar toda una red?» | Solo asignar cuando el MDX exista |

Copia las cuatro imágenes a `src/assets/blog-covers/` o su ubicación Astro optimizada vigente, sin sobrescribir otras sin comprobar su uso. Cuando existan artículos de series temporales y grafos, relaciona sus frontmatters con sus portadas. **No crees artículos vacíos ni publiques borradores para asociar imágenes.**

## Fallback y artículo de prueba

No reutilizar una misma portada genérica para todas las publicaciones sin `cover`. Si una entrada no tiene portada, mostrar una tarjeta tipográfica bien resuelta o un fallback discreto sin imagen que no suplante el tema del artículo. Evitar que el artículo técnico de demostración aparezca entre «Últimos artículos» y en los listados editoriales, incluso en modo desarrollo, sin borrar el archivo ni romper su previsualización directa y las pruebas. No exponer borradores en producción, RSS ni sitemap.

## Semántica, licencias y precisión

Las imágenes suministradas son **ilustraciones editoriales conceptuales**. La de pintura no es la reproducción documental de una obra histórica ni una restauración real, y las curvas ROC o temporales no son resultados del experimento. En `coverAlt.es`, `coverAlt.en` y `coverCredit`, usa descripciones claras, precisas y bilingües. El artículo de restauración tiene actualmente un crédito al Met y *Roses* asociado a otra portada: corrígelo si sustituyes esa imagen; **no mantengas una atribución falsa**. No modifiques ni elimines las figuras científicas y las atribuciones legítimas que aparecen dentro de los artículos.

## Diseño

Mantener todas las portadas con proporción 16:10; no incrustar título ni textos traducibles; no usar barras horizontales decorativas ni el carácter de punto medio en la interfaz. Conservar Cambria, paleta actual, responsive, carga diferida, `alt` accesible y rendimiento. Un mismo componente PostCard debe funcionar en Inicio y Blog. No añadir dependencias innecesarias ni animaciones.

## Validación optimizada

Ejecuta las pruebas concretas de PostCard, imágenes y filtros/editorial, además de Astro Check y build. Evita repetir suites completas si no hay nuevos cambios. La suite total corre en GitHub Actions tras el push. Verifica por separado las cuatro rutas de imagen y que los borradores siguen ocultos públicamente.

Cuando termines, revisa el diff, crea un commit descriptivo SOLO con los cambios de las portadas, haz push seguro a `origin/main` (nunca force push), verifica GitHub Actions/Pages e informa del commit, rutas actualizadas y resultado. Si la rama o el árbol tienen cambios concurrentes, utiliza un flujo aislado para integrarlos sin sobrescribirlos.
