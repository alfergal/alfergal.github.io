# Alberto Fernández Gálvez

Web personal con presentación y blog técnico integrados en `/`. Los artículos individuales conservan `/blog/[slug]/`. No hay menú global, página «Sobre mí» ni índice separado del blog. La navegación de lectura aparece únicamente dentro de los artículos.

Astro, TypeScript, Tailwind CSS y Markdown/MDX. Tema exclusivamente oscuro, tipografía de sistema Cambria/Caladea/Georgia y paleta provisional azul oscuro, azul claro, rosa y blanco. Se conservan el logotipo «af.», los favicons y el grafo SVG original. Los enlaces profesionales aparecen solo en la presentación; el pie contiene únicamente copyright, autor y enlace RSS.

## Identidad visual

La paleta provisional se define una sola vez en `src/data/theme.ts`: fondo azul oscuro, azul claro, rosa y blanco. `BaseHead.astro` expone sus valores mediante variables CSS `--palette-*`; `global.css` define los usos semánticos (`--bg`, `--ink`, `--accent`, `--highlight`, `--muted`, `--line`, `--soft`) y sus mezclas. Cambiar los cuatro valores centrales cuando se reciban los Pantone actualizará también Shiki, la imagen social y los favicons.

La pila de interfaz y lectura es `Cambria, Caladea, Georgia, serif`. La fuente concreta depende del sistema de la persona que visita la web. No se descargan ni distribuyen fuentes propietarias; se han retirado los archivos y la precarga de Atkinson. El código conserva una pila monoespaciada y las fórmulas conservan la tipografía matemática de KaTeX.

Los recursos `/favicon.svg` y `/favicon.png` conservan sus URLs, pero se generan desde `src/lib/favicon.ts` con la paleta central, igual que la imagen social. Se producen como archivos estáticos compatibles con GitHub Pages; no requieren un servidor en producción. El alias ya no se muestra en la presentación.

## Desarrollo y validación

Node.js 22.22 o posterior y npm.

```sh
npm ci
npm run dev
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
CHROME_PATH=/usr/bin/google-chrome npm test
npm run check
npx tsc --noEmit
npm run build
npm audit
npm run check:repo
```

`npm run dev` ejecuta `astro dev --background`, tanto desde la terminal como desde VS Code. Usa la URL y el puerto que indique Astro. Los comandos de estado, logs y parada gestionan ese servidor; no detengas servidores que esté utilizando otra persona.

Las pruebas **no requieren un servidor editorial activo ni un build previo**. Construyen copias temporales del proyecto, arrancan sus propios servidores de desarrollo y preview en segundo plano con puertos asignados automáticamente y los detienen al terminar. No utilizan `TEST_BASE_URL`. `CHROME_PATH` es opcional: si no tienes Chrome, instala Chromium de Playwright (`npx playwright install chromium`) y omite esa variable.

`npm run format` aplica Prettier a código, helpers de pruebas, scripts y README. La salida estática normal se genera en `dist/`, preparada para GitHub Pages (`https://alfergal.github.io`), con `.nojekyll`, 404, metadatos Open Graph, RSS y sitemap.

## Despliegue automático

`.github/workflows/deploy.yml` se ejecuta con cada push a `main` y también permite ejecución manual desde Actions. Primero instala desde el lockfile con `npm ci`, ejecuta Astro Check, TypeScript y la suite Playwright, incluida la exclusión de borradores y la verificación de enlaces de producción. Después `withastro/action` compila Astro en modo producción y sube únicamente `dist/`; `actions/deploy-pages` publica el artefacto en el entorno `github-pages`. Las acciones se fijan por SHA y se utiliza Node.js 22.23.1.

En Settings → Pages, Source debe ser **GitHub Actions**, sin compilación Jekyll desde una rama. No se necesitan secretos propios: el despliegue usa el token temporal de GitHub y OIDC, con permisos de escritura de Pages limitados al job de publicación. Las ejecuciones se serializan para evitar despliegues simultáneos. El repositorio es un sitio de usuario, por lo que `site` es `https://alfergal.github.io` y no necesita un `base` adicional. Un fallo de validación o compilación impide publicar.

## Estructura

```text
src/
  data/profile.ts          Nombre, presentación y enlaces profesionales
  lib/content.ts           Selección, orden de artículos y lectura estimada
  lib/social-image.ts      Imagen social generada desde el perfil
  components/              Marca, grafo, listado, figuras y gráficos accesibles
  layouts/SiteLayout.astro Documento, SEO, encabezado y pie
  layouts/BlogPost.astro   Plantilla técnica con índice contextual
  pages/index.astro        Presentación y listado integrado del blog
  pages/blog/[...slug].astro Artículos individuales
  pages/rss.xml.ts         Feed de publicaciones reales
  content/blog/            Markdown y MDX
  styles/global.css        Estilos compartidos y de lectura
public/                    .nojekyll; los favicons se generan como recursos estáticos
tests/                     Integración, producción, accesibilidad y responsive
```

El perfil conserva la descripción ya existente basada en la información facilitada. No se añaden trayectorias, formación, certificaciones ni datos privados. Se han eliminado rutas, componentes, datos y estilos de navegación obsoletos. No se incorporan buscadores, modo claro, analítica, cookies propias ni almacenamiento del navegador. Los filtros temáticos solo aparecen a partir de tres publicaciones reales y cuando ofrecen más de una opción. La interfaz funciona sin JavaScript.

## Artículo de demostración

Con el servidor de desarrollo activo, abre Inicio o visita:

`http://localhost:4321/blog/demostracion-articulo-tecnico/`

El archivo `src/content/blog/demostracion-articulo-tecnico.mdx` está marcado con `draft: true`. Se identifica explícitamente como prueba y solo contiene datos ficticios. Incluye encabezados, metadatos, enlaces, listas, código Python con Shiki, fórmulas, tabla, figura accesible, cita, conclusiones y referencias. La plantilla proporciona enlaces de vuelta al inicio.

Los borradores se incluyen en Inicio y en las rutas individuales **solo cuando `import.meta.env.DEV` es verdadero**. La vista previa del borrador y el Inicio de desarrollo llevan `noindex`. `getPosts()` excluye borradores por defecto; RSS mantiene siempre ese comportamiento, incluso en desarrollo. El build de producción no genera la página del borrador ni lo incluye en Inicio, sitemap o RSS. Actualmente no hay publicaciones reales, por lo que producción muestra un estado vacío sencillo.

Los borradores siguen siendo archivos del repositorio: no guardes material confidencial en ellos ni expongas el servidor de desarrollo como sitio público. `noindex` no es un control de acceso.

## Publicar contenido real en el futuro

Añade un `.md` o `.mdx` a `src/content/blog/`:

```yaml
---
title: 'Título revisado'
description: 'Descripción breve del contenido.'
pubDate: '2026-11-02'
category: 'Machine Learning'
tags: ['Python', 'Statistics']
lang: 'es'
draft: true
---
```

La fecha es ilustrativa: usa la fecha real de publicación. `draft` es `true` por defecto; cambia a `false` únicamente cuando el contenido esté revisado y autorizado. El nombre del archivo define la ruta. La colección ordena por fecha descendente y, en caso de empate, por identificador. Cada artículo requiere una categoría principal de la taxonomía centralizada en `src/data/blog.ts`; las etiquetas son libres y se definen en el frontmatter. También se admiten `updatedDate` y `heroImage`.

La plantilla ofrece SEO individual, datos estructurados para artículos publicados, fechas y lectura estimada, ancho de lectura de 640 px, código resaltado y copiable, tablas desplazables, figuras adaptables y referencias. El índice automático muestra H2/H3 cuando hay al menos tres encabezados: lateral en escritorio amplio y desplegable en pantallas menores. La barra superior mide el progreso dentro del contenido. Ambas mejoras usan JavaScript nativo exclusivo de artículos y respetan movimiento reducido. Las fórmulas usan el procesador oficial `@astrojs/markdown-remark` (fijado a 7.3.3 para mantener compatibilidad con Node 22.22), `remark-math` y `rehype-katex`, con CSS y fuentes locales de KaTeX; se renderizan al compilar y conservan MathML accesible. Sintaxis: `$x_i$` en línea o `$$` en líneas independientes para bloques.

En MDX se pueden importar `Figure.astro` (pie e identificador de figura) y `BarChart.astro` (barras SVG, descripción accesible y valores no negativos). El artículo de demostración muestra su uso. No hay dependencias de gráficos interactivas ni scripts de fórmulas en el navegador.

## Organización temática del blog

Cada artículo tiene título, descripción, fecha, categoría principal, etiquetas y estado de borrador. El tiempo estimado de lectura se calcula a partir del contenido. Las categorías permitidas son:

- Data Science.
- Machine Learning.
- Artificial Intelligence.
- Data Engineering & MLOps.
- Software Engineering.

Se mantienen en `src/data/blog.ts` y se validan con el esquema de la colección; no se generan páginas por categoría, buscadores ni nubes de etiquetas. Con tres publicaciones reales, los filtros útiles de categoría y etiqueta permiten navegación temática mediante parámetros en Inicio; sin JavaScript se muestran todas las publicaciones. Las etiquetas son términos técnicos libres, como Python, Statistics, Deep Learning, Graph ML, LLMs, RAG, MLOps y SQL. El dummy se clasifica como Data Science y sigue identificado como contenido de prueba, con `draft: true`.

## Grafo interactivo

`GraphNetwork.astro` conserva los 92 nodos y las 322 conexiones originales, con una distribución extendida un 10 % desde el centro, dentro del mismo SVG. Se mantiene la paleta y la red estática sin JavaScript. La portada reduce aproximadamente un 20 % titulares y espaciados, conservando cuerpo legible de 16 px, metadatos de 14 px y Cambria. La columna del grafo dispone de más espacio relativo sin invadir el texto. La mejora progresiva se carga solo en Inicio; las páginas de artículos no importan el módulo del grafo.

La interacción reside en `src/scripts/graph-network.ts` y la física en `src/lib/graph-physics.ts`. Se utiliza únicamente `d3-force`, con eventos de puntero nativos y captura del puntero para ratón y tacto. Los enlaces conservan su longitud de reposo y cada nodo tiene un anclaje elástico a su posición original. Se limitan velocidades, desplazamiento y límites del SVG.

La física D3 solo se activa al desplazar un nodo y se detiene al recuperar el equilibrio, con pasos de 60 Hz independientes de la pantalla. `src/lib/graph-ambient.ts` añade desplazamientos analíticos acotados de unos dos puntos SVG por eje, variación luminosa de una cuarta parte de los nodos y hasta dos señales que recorren aristas. No ejecuta D3 en reposo y actualiza la presentación como máximo a 30 Hz. La influencia ambiental se atenúa gradualmente durante el arrastre y la recuperación. IntersectionObserver, visibilidad de pestaña y foco pausan la actividad; al desmontar se limpian eventos, frames, animaciones y observadores.

El SVG tiene un único punto de entrada por teclado: flechas para recorrer nodos, Intro o espacio para activar un destello, Mayúsculas y flechas para desplazar, y Escape para restablecer. Las instrucciones se exponen a tecnologías de asistencia sin añadir controles visibles. En pantallas táctiles se arrastra desde un nodo; el espacio vacío permite desplazar la página. Se admite un arrastre a la vez.

Con `prefers-reduced-motion` no hay movimiento ambiental, iluminación automática, simulación ni ondas expansivas: el arrastre es directo y la restauración inmediata. Sin JavaScript se conserva el grafo decorativo original. Las pruebas de `tests/graph.spec.ts` verifican una huella de la nueva geometría estática independiente del color, topología conservada, interacción, enlaces unidos, vecinos, recuperación, actividad ambiental acotada, pausas, teclado, tacto y ausencia de mutaciones con movimiento reducido.

## Pruebas

La suite verifica identidad, rutas retiradas, metadatos, colecciones, orden por fecha, RSS y borradores en desarrollo y producción. Los resultados esperados se calculan desde el frontmatter del snapshot editorial: añadir publicaciones autorizadas no exige mantener RSS vacío, un número fijo de páginas ni un único artículo. Se emplean el parser de Astro y el mismo generador de slugs que su cargador, incluidos slugs explícitos y rutas anidadas.

`tests/support/site.ts` crea los proyectos temporales dentro del directorio temporal del sistema. El proyecto `site` copia el contenido editorial para leerlo y compilarlo, sin modificarlo. El proyecto `content` excluye por completo esa colección y utiliza únicamente `tests/fixtures/blog/`, fuera de `src`. Sus fixtures incluyen Markdown y MDX publicados, un borrador explícito y otro sin campo `draft`. Sus páginas sintéticas y builds solo existen en el proyecto temporal; nunca se escriben en `src/content/blog` ni en el `dist` editorial, incluso si se interrumpe una prueba.

Los servidores y las copias se limpian en el teardown. Si el proceso se termina de forma abrupta y no puede ejecutar su limpieza, cualquier resto queda en el directorio temporal del sistema, separado del sitio publicable. No se comparten los archivos de estado del servidor editorial. La caché de Vite se separa por comando en `.astro/vite/dev`, `.astro/vite/sync` y `.astro/vite/build` dentro de cada copia. Así Astro Check y el build no invalidan las dependencias optimizadas de un servidor de desarrollo abierto. También se evita compartir cachés mutables a través del enlace de dependencias. Si falla la parada de un servidor de pruebas, se conserva su estado temporal para poder gestionarlo.

`tests/support/build.ts` verifica todas las páginas generadas, enlaces internos y anclas, recursos, RSS, sitemap, robots y `.nojekyll`. Compara las rutas con las publicaciones y comprueba que cada borrador devuelve 404 y no aparece en enlaces públicos. Las pruebas matemáticas revisan fórmulas en línea, fracciones, sumas y matrices, resaltado Python, tablas y figuras tanto en desarrollo como en producción.

Playwright comprueba 320, 375, 768, 1024, 1440 y 1920 px, uso sin JavaScript, teclado, tema oscuro y las interacciones del grafo. Axe revisa WCAG A/AA con preferencias de sistema claras y oscuras. No se generan capturas de pantalla; las trazas de fallo en `test-results/` también las desactivan. Las comprobaciones automáticas no equivalen a una auditoría manual exhaustiva.

## Seguridad y dependencias

`package.json` declara `private: true`. Git ignora todos los nombres `.env*`, admitiendo únicamente archivos llamados `.env.example`. El ejemplo del proyecto no contiene valores: la web estática no requiere variables de entorno. Revisa manualmente cualquier ejemplo antes de versionarlo; nunca incluyas credenciales o datos personales.

`npm run check:repo` comprueba candidatos de Git, cambios preparados y archivos públicos mediante patrones de secretos, e impide aceptar artefactos generados o fixtures antiguos en la colección editorial. Se ejecuta también antes de `npm test`. El escáner solo imprime ubicaciones y nombres de reglas, no valores sensibles; es una comprobación heurística que complementa la revisión manual. Los archivos temporales de editor y los antiguos nombres `src/content/blog/qa-verification-*` están excluidos de Git.

La actualización de `fast-uri` a la rama corregida 3.1.9 se mantiene en el lockfile, sin añadirlo como dependencia directa. KaTeX utiliza la rama corregida 0.18 (`~0.18.2`, actualmente resuelta a 0.18.10). El override `"katex": "$katex"` hace que `rehype-katex` y `micromark-extension-math` compartan la misma versión corregida que sus estilos y fuentes. No basta con actualizar el CSS o una sola copia de KaTeX. Las pruebas de fórmulas cubren esta compatibilidad; revisa el override al actualizar los plugins. No se utiliza `npm audit fix --force`.

`github-slugger` se declara como dependencia de desarrollo porque las pruebas lo usan directamente para interpretar las rutas; ya forma parte de la cadena de Astro. El resto de versiones mayores y la arquitectura visual se conservan.

Documentación: [rutas de Astro](https://docs.astro.build/en/guides/routing/), [componentes](https://docs.astro.build/en/basics/astro-components/), [colecciones](https://docs.astro.build/en/guides/content-collections/), [estilos](https://docs.astro.build/en/guides/styling/), [remark-math y rehype-katex](https://github.com/remarkjs/remark-math), [KaTeX](https://katex.org/docs/browser).

## Herramientas de publicación y lectura

Metadatos opcionales adicionales:

```yaml
featured: false
series:
  name: 'Nombre de una serie real'
  order: 1
```

La serie del ejemplo es solo documentación de formato; no se crea contenido editorial. `featured: true` destaca publicaciones únicamente cuando existen al menos tres artículos publicados, sin duplicarlas en el listado reciente. Los borradores nunca son destacados. Las series usan posiciones enteras positivas: se rechazan posiciones publicadas duplicadas en una misma serie. Su navegación ordenada omite borradores y solo aparece con varias entregas publicadas. Las recomendaciones muestran hasta tres artículos reales, priorizando número de etiquetas compartidas, después categoría y después serie; no se muestran sin coincidencias.

`updatedDate` debe ser posterior o igual a `pubDate`; la fecha de actualización visible solo aparece si es posterior. El sitemap toma `lastmod` del JSON-LD del HTML publicado, con las mismas fechas que la cabecera y Open Graph, sin utilizar la fecha del build. Search Console se puede conectar más adelante con el sitemap público `/sitemap-index.xml`; no se ha accedido ni modificado ninguna cuenta externa ni añadido identificadores ficticios.

En MDX se admite `Callout.astro` con tipos `note`, `important`, `warning`, `tip`, `result` y `limitation`, y un título opcional. Puede contener texto, enlaces y matemáticas. En Markdown, una cita que empieza con `[!NOTE]`, `[!IMPORTANT]`, `[!WARNING]`, `[!TIP]`, `[!RESULT]` o `[!LIMITATION]` genera el mismo bloque informativo accesible. El dummy exclusivo de desarrollo muestra los seis tipos, cinco lenguajes, índice, fórmulas y referencias.

Los bloques vallados aceptan, por ejemplo, `python title="ejemplo.py"`. Shiki mantiene el resaltado y expone lenguaje y archivo como metadatos; la mejora de artículos añade una barra con copia exacta del texto, confirmación accesible y un mensaje si el navegador deniega el portapapeles. Se comprueban Python, SQL, Bash, TypeScript y JSON. Sin JavaScript se conserva el código y el scroll horizontal. No se ejecuta código editorial en el navegador.

Las pruebas sintéticas de destacados, filtros, series, relacionados, metadatos y lectura viven en `tests/fixtures/blog/` y se copian exclusivamente al directorio temporal de pruebas. Nunca se incorporan a la colección editorial ni al artefacto desplegado. No se han añadido dependencias.

## Primer artículo: ROC-AUC y calibración

`src/content/blog/roc-auc-calibracion-probabilidades.mdx` integra el artículo recibido, sus cinco figuras y el explorador de temperatura, manteniendo `draft: true`. Puede revisarse en desarrollo en `/blog/roc-auc-calibracion-probabilidades/`; no se genera esa página en producción ni se incluye en RSS o sitemap. Las referencias científicas y los valores numéricos del paquete se conservan.

`TemperatureExplorer.astro` usa los 51 resultados precalculados de `src/data/roc_auc_temperature.json`: solo dibuja la transformación analítica en el navegador. Tiene control de rango nativo, anuncio accesible de resultados, identificadores por instancia y limpieza de eventos. Sin JavaScript muestra la referencia real T=1 y desactiva el control. Su código se carga exclusivamente en los artículos que lo incorporen.

El experimento y sus instrucciones de verificación sin sobrescritura se encuentran en [experiments/roc-auc-calibracion/README.md](experiments/roc-auc-calibracion/README.md). Las dependencias Python se instalan en un entorno separado de npm. Los SVG de `public/` y las fuentes del repositorio son accesibles por URL: el estado de borrador no los convierte en archivos privados. El ZIP original se conserva localmente, excluido de Git.
