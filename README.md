# Alberto Fernández Gálvez

Portfolio profesional bilingüe con **Inicio | Blog | Contacto**. Español predeterminado y HTML estático en inglés, con internacionalización nativa de Astro. Los artículos españoles conservan sus URLs y su estado editorial.

Astro, TypeScript, Tailwind CSS y Markdown/MDX. Tema oscuro, Cambria/Caladea/Georgia y paleta azul oscuro, azul claro, rosa y blanco. El logotipo vectorial `af` mantiene únicamente sus letras; el grafo interactivo vive en la presentación. GitHub y LinkedIn aparecen en Contacto y en el footer.

## Identidad visual

La paleta se define una sola vez en `src/data/theme.ts`: fondo azul oscuro, azul claro, rosa y blanco. `BaseHead.astro` expone sus valores mediante variables CSS `--palette-*`; `global.css` define los usos semánticos (`--bg`, `--ink`, `--accent`, `--highlight`, `--muted`, `--line`, `--soft`) y sus mezclas. Los cuatro valores centrales se comparten con Shiki, la imagen social y los favicons.

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

Las pruebas **no requieren un servidor editorial activo ni un build previo**. Construyen copias temporales del proyecto, arrancan sus propios servidores de desarrollo y preview en segundo plano con puertos asignados automáticamente y los detienen al terminar. Solo sus servidores de desarrollo usan `NODE_ENV=test`, que desactiva HMR en Astro para que una recarga automática no interrumpa las comprobaciones de DOM sobre copias inmutables; el servidor editorial y los builds de producción conservan su entorno habitual. No utilizan `TEST_BASE_URL`. `CHROME_PATH` es opcional: si no tienes Chrome, instala Chromium de Playwright (`npx playwright install chromium`) y omite esa variable.

`npm run format` aplica Prettier a código, helpers de pruebas, scripts y README. La salida estática normal se genera en `dist/`, preparada para GitHub Pages (`https://alfergal.github.io`), con `.nojekyll`, 404, metadatos Open Graph, RSS y sitemap.

## Despliegue automático

`.github/workflows/deploy.yml` se ejecuta con cada push a `main` y también permite ejecución manual desde Actions. Primero instala desde el lockfile con `npm ci`, ejecuta Astro Check, TypeScript y la suite Playwright, incluida la exclusión de borradores y la verificación de enlaces de producción. Después `withastro/action` compila Astro en modo producción y sube únicamente `dist/`; `actions/deploy-pages` publica el artefacto en el entorno `github-pages`. Las acciones se fijan por SHA y se utiliza Node.js 22.23.1.

En Settings → Pages, Source debe ser **GitHub Actions**, sin compilación Jekyll desde una rama. No se necesitan secretos propios: el despliegue usa el token temporal de GitHub y OIDC, con permisos de escritura de Pages limitados al job de publicación. Las ejecuciones se serializan para evitar despliegues simultáneos. El repositorio es un sitio de usuario, por lo que `site` es `https://alfergal.github.io` y no necesita un `base` adicional. Un fallo de validación o compilación impide publicar.

## Estructura

```text
src/
  data/profile.ts          Identidad y perfiles profesionales confirmados
  data/career.ts           Formación y certificaciones presentadas
  data/contact-form.ts     Puerta de configuración para Formspree
  data/newsletter.ts       Configuración opcional por idioma
  i18n/                    Interfaz, rutas y etiquetas ES/EN
  lib/content.ts           Selección, orden de artículos y lectura estimada
  lib/social-image.ts      Imagen social generada desde el perfil
  components/              Marca, grafo, listado, figuras y gráficos accesibles
  layouts/SiteLayout.astro Documento, SEO, encabezado y pie
  layouts/BlogPost.astro   Plantilla técnica con índice contextual
  components/pages/        Páginas compartidas parametrizadas por idioma
  pages/index.astro        Presentación y tres últimos artículos
  pages/blog/index.astro   Listado principal
  pages/contacto.astro     Contacto
  pages/en/                Rutas inglesas y RSS independiente
  pages/blog/[...slug].astro Artículos individuales
  pages/rss.xml.ts         Feed de publicaciones reales
  content/blog/            Markdown y MDX
  styles/global.css        Estilos compartidos y de lectura
public/                    .nojekyll; los favicons se generan como recursos estáticos
tests/                     Integración, producción, accesibilidad y responsive
```

La presentación utiliza únicamente los datos facilitados: especialización en Machine Learning y estadística aplicada, más de seis años en ingeniería de software, trabajo con millones de registros y estudios universitarios de Ciencia de Datos Aplicada. La tarjeta explica el alcance de los estudios sin presentarlos como una titulación obtenida. La formación profesional está identificada como Técnico Superior, no como un grado universitario. No se muestran instituciones, fechas ni calificaciones. Las tarjetas de certificaciones solo muestran entidad emisora y nombre. No se incorporan buscadores, modo claro, analítica, cookies propias ni almacenamiento del navegador. Los filtros temáticos solo aparecen a partir de tres publicaciones reales y cuando ofrecen más de una opción. La interfaz funciona sin JavaScript.

## Artículo de demostración

Con el servidor de desarrollo activo, abre el Blog o visita:

`http://localhost:4321/blog/demostracion-articulo-tecnico/`

El archivo `src/content/blog/demostracion-articulo-tecnico.mdx` está marcado con `draft: true`. Se identifica explícitamente como prueba y solo contiene datos ficticios. Incluye encabezados, metadatos, enlaces, listas, código Python con Shiki, fórmulas, tabla, figura accesible, cita, conclusiones y referencias. La plantilla proporciona enlaces de vuelta al inicio.

Los borradores se incluyen en el Blog, en los tres últimos artículos de Inicio y en las rutas individuales **solo cuando `import.meta.env.DEV` es verdadero**. La vista previa del borrador, Inicio y Blog de desarrollo llevan `noindex`. `getPosts()` excluye borradores por defecto; RSS mantiene siempre ese comportamiento, incluso en desarrollo. El build de producción no genera la página del borrador ni lo incluye en Inicio, Blog, sitemap o RSS de ningún idioma. Actualmente no hay publicaciones reales, por lo que producción muestra un estado vacío sencillo.

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

La plantilla ofrece SEO individual, datos estructurados para artículos publicados, fechas y lectura estimada, ancho de lectura de 640 px, código resaltado y copiable, tablas desplazables, figuras adaptables y referencias. El índice automático muestra H2/H3 cuando hay al menos tres encabezados: plegado por defecto mediante `<details>` nativo en todas las pantallas, lateral en escritorio amplio. Se abre y cierra al activar «En este artículo»; ni el scroll ni el cambio de ancho modifican su estado. La barra superior mide el progreso dentro del contenido. El plegado funciona sin JavaScript; el resaltado de sección y el progreso usan JavaScript nativo exclusivo de artículos y respetan movimiento reducido. Las fórmulas usan el procesador oficial `@astrojs/markdown-remark` (fijado a 7.3.3 para mantener compatibilidad con Node 22.22), `remark-math` y `rehype-katex`, con CSS y fuentes locales de KaTeX; se renderizan al compilar y conservan MathML accesible. Sintaxis: `$x_i$` en línea o `$$` en líneas independientes para bloques.

En MDX se pueden importar `Figure.astro` (pie e identificador de figura) y `BarChart.astro` (barras SVG, descripción accesible y valores no negativos). El artículo de demostración muestra su uso. No hay dependencias de gráficos interactivas ni scripts de fórmulas en el navegador.

## Organización temática del blog

Cada artículo tiene título, descripción, fecha, categoría principal, etiquetas y estado de borrador. El tiempo estimado de lectura se calcula a partir del contenido. Las categorías permitidas son:

- Data Science.
- Machine Learning.
- Artificial Intelligence.
- Data Engineering & MLOps.
- Software Engineering.

Se mantienen en `src/data/blog.ts` y se validan con el esquema de la colección; no se generan páginas por categoría, buscadores ni nubes de etiquetas. Con tres publicaciones reales, los filtros útiles de categoría y etiqueta permiten navegación temática mediante parámetros en la página Blog de cada idioma; sin JavaScript se muestran todas las publicaciones. Las etiquetas son términos técnicos libres, como Python, Statistics, Deep Learning, Graph ML, LLMs, RAG, MLOps y SQL. El dummy se clasifica como Data Science y sigue identificado como contenido de prueba, con `draft: true`.

## Grafo interactivo

`GraphNetwork.astro` muestra 48 nodos y 108 conexiones, muestreados desde la distribución original de cinco grupos, dentro del mismo SVG. `src/data/graph.ts` genera una red conectada con un árbol de expansión y enlaces locales adicionales, sin duplicados ni grados mayores que seis. Se han retirado la cuadrícula, el polígono superpuesto y los halos redundantes. Se mantiene la paleta y la red estática sin JavaScript. La portada reduce aproximadamente un 20 % titulares y espaciados, conservando cuerpo legible de 16 px, metadatos de 14 px y Cambria. La columna del grafo dispone de más espacio relativo sin invadir el texto. La mejora progresiva se carga solo en Inicio; las páginas de artículos no importan el módulo del grafo.

La interacción reside en `src/scripts/graph-network.ts` y la física en `src/lib/graph-physics.ts`. Se utiliza únicamente `d3-force`, con eventos de puntero nativos y captura del puntero para ratón y tacto. Los enlaces conservan su longitud de reposo y cada nodo tiene un anclaje elástico a su posición original. Se limitan velocidades, desplazamiento y límites del SVG.

La física D3 solo se activa al desplazar un nodo y se detiene al recuperar el equilibrio, con pasos de 60 Hz independientes de la pantalla y una iteración de enlaces por paso. El render actualiza únicamente los nodos desplazados y los extremos de sus aristas incidentes, con caché de atributos y precisión visual de 0,01 puntos SVG. Al recuperar el equilibrio se restauran las coordenadas originales completas. El hover solo cambia el nodo activo y sus enlaces, sin reescribir el resto de la red.

`src/lib/graph-ambient.ts` no tiene bucle JavaScript de frames ni modifica la geometría: utiliza Web Animations para desplazar suavemente el SVG completo menos de un píxel y pulsar la opacidad de dos nodos. Una única señal ocasional recorre una arista. No hay filtros ni sombras. El ambiente se pausa durante el arrastre y la recuperación; después continúa desde su posición congelada. En pantallas de hasta 760 px o con puntero grueso, el ambiente está desactivado y no se crean animaciones ni temporizadores ambientales; se conserva la física táctil bajo demanda. Los destellos manuales móviles omiten los anillos vecinos y limitan las propagaciones a tres conexiones. Solo se permite un destello manual simultáneo.

IntersectionObserver, visibilidad de pestaña y foco pausan las animaciones, cancelan las señales y detienen la simulación. Al desmontar se cancelan también eventos, animaciones, timers y observadores. Se prueban las reconexiones del componente para evitar duplicar trabajo.

El SVG tiene un único punto de entrada por teclado: flechas para recorrer nodos, Intro o espacio para activar un destello, Mayúsculas y flechas para desplazar, y Escape para restablecer. Las instrucciones se exponen a tecnologías de asistencia sin añadir controles visibles. En pantallas táctiles se arrastra desde un nodo; el espacio vacío permite desplazar la página. Se admite un arrastre a la vez.

Con `prefers-reduced-motion` no hay movimiento ambiental, iluminación automática, simulación ni ondas expansivas: el arrastre es directo y la restauración inmediata. Sin JavaScript se conserva el grafo decorativo estático. Las pruebas de `tests/graph.spec.ts` verifican una huella de la nueva geometría estática independiente del color, topología dispersa conectada, interacción, enlaces unidos, vecinos, recuperación, actividad ambiental acotada, pausas, teclado, tacto y ausencia de mutaciones con movimiento reducido.

## Pruebas

La suite verifica identidad, rutas retiradas, metadatos, colecciones, orden por fecha, RSS y borradores en desarrollo y producción. Los resultados esperados se calculan desde el frontmatter del snapshot editorial: añadir publicaciones autorizadas no exige mantener RSS vacío, un número fijo de páginas ni un único artículo. Se emplean el parser de Astro y el mismo generador de slugs que su cargador, incluidos slugs explícitos y rutas anidadas.

`tests/support/site.ts` crea los proyectos temporales dentro del directorio temporal del sistema. El proyecto `site` copia el contenido editorial para leerlo y compilarlo, sin modificarlo. El proyecto `content` excluye por completo esa colección y utiliza únicamente `tests/fixtures/blog/`, fuera de `src`. Sus fixtures incluyen Markdown y MDX publicados, un borrador explícito y otro sin campo `draft`. Sus páginas sintéticas y builds solo existen en el proyecto temporal; nunca se escriben en `src/content/blog` ni en el `dist` editorial, incluso si se interrumpe una prueba.

Los servidores y las copias se limpian en el teardown. Si el proceso se termina de forma abrupta y no puede ejecutar su limpieza, cualquier resto queda en el directorio temporal del sistema, separado del sitio publicable. No se comparten los archivos de estado del servidor editorial. La caché de Vite se separa por comando en `.astro/vite/dev`, `.astro/vite/sync` y `.astro/vite/build` dentro de cada copia. Así Astro Check y el build no invalidan las dependencias optimizadas de un servidor de desarrollo abierto. También se evita compartir cachés mutables a través del enlace de dependencias. Si falla la parada de un servidor de pruebas, se conserva su estado temporal para poder gestionarlo.

`tests/support/build.ts` verifica todas las páginas generadas, enlaces internos y anclas, recursos, RSS, sitemap, robots y `.nojekyll`. Compara las rutas con las publicaciones y comprueba que cada borrador devuelve 404 y no aparece en enlaces públicos. Las pruebas matemáticas revisan fórmulas en línea, fracciones, sumas y matrices, resaltado Python, tablas y figuras tanto en desarrollo como en producción.

Playwright comprueba 320, 375, 768, 1024, 1440 y 1920 px, uso sin JavaScript, teclado, tema oscuro y las interacciones del grafo. Axe revisa WCAG A/AA con preferencias de sistema claras y oscuras. No se generan capturas de pantalla; las trazas de fallo en `test-results/` también las desactivan. Las comprobaciones automáticas no equivalen a una auditoría manual exhaustiva.

## Seguridad y dependencias

`package.json` declara `private: true`. Git ignora todos los nombres `.env*`, admitiendo únicamente archivos llamados `.env.example`. El ejemplo del proyecto solo documenta nombres de variables con valores vacíos o desactivados; nunca incluyas IDs reales, avisos con datos personales ni credenciales en él.

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

La serie del ejemplo es solo documentación de formato; no se crea contenido editorial. `featured: true` destaca publicaciones únicamente cuando existen al menos tres artículos publicados, sin duplicarlas en el listado reciente. Los borradores nunca son destacados. Las series usan posiciones enteras positivas: se rechazan posiciones publicadas duplicadas en una misma serie e idioma. Su navegación ordenada omite borradores y solo aparece con varias entregas publicadas. Las recomendaciones muestran hasta tres artículos reales, priorizando número de etiquetas compartidas, después categoría y después serie; no se muestran sin coincidencias.

`updatedDate` debe ser posterior o igual a `pubDate`; la fecha de actualización visible solo aparece si es posterior. El sitemap toma `lastmod` del JSON-LD del HTML publicado, con las mismas fechas que la cabecera y Open Graph, sin utilizar la fecha del build. Search Console se puede conectar más adelante con el sitemap público `/sitemap-index.xml`; no se ha accedido ni modificado ninguna cuenta externa ni añadido identificadores ficticios.

En MDX se admite `Callout.astro` con tipos `note`, `important`, `warning`, `tip`, `result` y `limitation`, y un título opcional. Puede contener texto, enlaces y matemáticas. En Markdown, una cita que empieza con `[!NOTE]`, `[!IMPORTANT]`, `[!WARNING]`, `[!TIP]`, `[!RESULT]` o `[!LIMITATION]` genera el mismo bloque informativo accesible. El dummy exclusivo de desarrollo muestra los seis tipos, cinco lenguajes, índice, fórmulas y referencias.

Los bloques vallados aceptan, por ejemplo, `python title="ejemplo.py"`. Shiki mantiene el resaltado y expone lenguaje y archivo como metadatos; la mejora de artículos añade una barra con copia exacta del texto, confirmación accesible y un mensaje si el navegador deniega el portapapeles. Se comprueban Python, SQL, Bash, TypeScript y JSON. Sin JavaScript se conserva el código y el scroll horizontal. No se ejecuta código editorial en el navegador.

Las pruebas sintéticas de destacados, filtros, series, relacionados, metadatos y lectura viven en `tests/fixtures/blog/` y se copian exclusivamente al directorio temporal de pruebas. Nunca se incorporan a la colección editorial ni al artefacto desplegado. No se han añadido dependencias.

## Primer artículo: ROC-AUC y calibración

`src/content/blog/roc-auc-calibracion-probabilidades.mdx` integra el artículo recibido, sus cinco figuras y el explorador de temperatura, manteniendo `draft: true`. Puede revisarse en desarrollo en `/blog/roc-auc-calibracion-probabilidades/`; no se genera esa página en producción ni se incluye en RSS o sitemap. Las referencias científicas y los valores numéricos del paquete se conservan.

`TemperatureExplorer.astro` usa los 51 resultados precalculados de `src/data/roc_auc_temperature.json`: solo dibuja la transformación analítica en el navegador. Tiene control de rango nativo, anuncio accesible de resultados, identificadores por instancia y limpieza de eventos. Sin JavaScript muestra la referencia real T=1 y desactiva el control. Su código se carga exclusivamente en los artículos que lo incorporen.

El experimento y sus instrucciones de verificación sin sobrescritura se encuentran en [experiments/roc-auc-calibracion/README.md](experiments/roc-auc-calibracion/README.md). Las dependencias Python se instalan en un entorno separado de npm. Los SVG de `public/` y las fuentes del repositorio son accesibles por URL: el estado de borrador no los convierte en archivos privados. El ZIP original se conserva localmente, excluido de Git.

## Medición del grafo

`scripts/measure-graph.mjs` compara un directorio de producción antes y después, sin capturas ni dependencias nuevas:

```sh
CHROME_PATH=/usr/bin/google-chrome node scripts/measure-graph.mjs /tmp/build-anterior before .qa/graph-before.json
CHROME_PATH=/usr/bin/google-chrome node scripts/measure-graph.mjs dist after .qa/graph-after.json
```

Ejecutar cada medición sin tests o builds simultáneos. Se utilizan tres repeticiones por perfil (1440×1000 sin limitación y móvil emulado 375×812, tacto y CPU 4×). Las fases son ambiente visible, arrastre, recuperación, scroll programado y veinte reconexiones. Los JSON locales, excluidos de Git, guardan mutaciones, tiempo JavaScript, ocupación del hilo principal, cadencia rAF, tareas largas y heap JS después de GC. La instrumentación añade coste a ambas versiones. La cadencia rAF no equivale a FPS renderizados por la GPU; el heap JS no mide toda la memoria del navegador ni GPU. La emulación no sustituye mediciones en teléfonos físicos.

Comparación local en Chromium headless 146.0.7680.164, Linux, Node 22.23.1 (medianas de tres repeticiones; build anterior `7aa93fa`):

| Perfil y fase                      | Mutaciones de atributos/s, antes → después | JS ms/s, antes → después | Hilo principal %, antes → después | Cadencia rAF Hz, antes → después |
| ---------------------------------- | -----------------------------------------: | -----------------------: | --------------------------------: | -------------------------------: |
| Escritorio, ambiente               |                                 51.607 → 0 |               76,9 → 2,0 |                        34,8 → 3,5 |                      60,0 → 60,0 |
| Escritorio, arrastre               |                           116.440 → 21.033 |             173,2 → 53,2 |                       55,5 → 23,3 |                      60,0 → 60,0 |
| Escritorio, recuperación           |                             61.849 → 5.617 |             101,1 → 17,1 |                        40,2 → 9,6 |                      60,0 → 60,0 |
| Escritorio, scroll                 |                               14.468 → 1,5 |               32,2 → 6,7 |                        14,0 → 5,0 |                      60,0 → 60,0 |
| Móvil emulado CPU 4×, ambiente     |                                 44.766 → 0 |              171,0 → 3,8 |                        91,2 → 3,6 |                      40,9 → 60,0 |
| Móvil emulado CPU 4×, arrastre     |                            71.571 → 25.759 |            273,3 → 135,4 |                      100,4 → 56,9 |                      31,8 → 60,0 |
| Móvil emulado CPU 4×, recuperación |                             46.214 → 6.011 |             190,9 → 39,3 |                       92,6 → 16,2 |                      37,5 → 60,0 |
| Móvil emulado CPU 4×, scroll       |                               14.278 → 0,5 |              81,4 → 18,4 |                        34,9 → 8,2 |                      54,1 → 60,0 |

La ocupación se calcula con `Performance.TaskDuration / tiempo de pared` de CDP, no con un medidor de CPU del sistema; bajo emulación y ventanas cortas puede superar ligeramente el 100 %. El P95 del intervalo rAF móvil durante arrastre pasó de 50 a 16,7 ms. Se observó una tarea larga aislada en una repetición de arrastre de escritorio optimizado (cadencia media de esa repetición: 32,3 Hz); se conserva en los datos y no se infiere su causa sin una traza específica. Las otras dos repeticiones de escritorio estuvieron cerca de 60 Hz.

El heap JS al terminar la fase ambiental pasó de 2,55 a 2,28 MiB en escritorio y de 3,08 a 2,25 MiB en móvil emulado. Durante el arrastre de escritorio, la mediana al cerrar la fase subió de 2,94 a 3,62 MiB: las cachés y el momento del GC afectan esta lectura, por lo que no se afirma que toda fase consuma menos memoria. Tras veinte reconexiones y GC, la variación mediana optimizada fue de −20,7 KiB (escritorio) y −17,4 KiB (móvil), sin crecimiento retenido en esa comprobación limitada. Los resultados dependen del equipo y no acreditan rendimiento en teléfonos físicos.

El footer identifica el enlace como «RSS (XML)» y explica en su título cómo usarlo en un lector RSS. `/rss.xml` conserva su estructura, enlaces, metadatos y exclusión de borradores; `rel="alternate"` mantiene el descubrimiento automático. Se evita XSLT por su retirada anunciada en los navegadores ([documentación de Chromium](https://developer.chrome.com/docs/web-platform/deprecating-xslt)); no se añaden páginas, scripts ni dependencias para presentar el feed.

## Segundo artículo: restauración cromática e IA

El borrador `src/content/blog/ia-colores-originales-pintura.mdx` se revisa en desarrollo en `/blog/ia-colores-originales-pintura/`. Permanece excluido de producción, RSS y sitemap. Incluye revisión científica, un experimento sintético ejecutado, cuatro gráficos, un comparador nativo antes/después y una tabla de enfoques. Las tablas y fórmulas desplazables reciben foco en el HTML generado para poder recorrerlas con teclado, también sin JavaScript. El comparador conserva imágenes estáticas sin JavaScript, teclado y estilos locales; su script no se carga en Inicio ni modifica el grafo.

[Protocolo, datos CC0 y reproducción](experiments/restauracion-cromatica/README.md): veinte pinturas, partición 12/4/4 por obra, CNN CPU, gray-world y regresión afín, métricas por pintura e intensidad, resultados y hashes. Los originales y pesos se regeneran fuera del repositorio. Las imágenes derivadas en `public/` son accesibles aunque el artículo siga en borrador. Ningún resultado representa una reconstrucción histórica validada.

## Internacionalización y páginas

| Página   | Español     | Inglés                 |
| -------- | ----------- | ---------------------- |
| Inicio   | /           | /en/                   |
| Blog     | /blog/      | /en/blog/              |
| Contacto | /contacto/  | /en/contact/           |
| Artículo | /blog/slug/ | /en/blog/english-slug/ |
| RSS      | /rss.xml    | /en/rss.xml            |

Astro declara es y en, con prefixDefaultLocale desactivado. No hay detección de ubicación, redirección automática de idioma ni traducción en el navegador. **src/i18n/ui.ts** centraliza el texto de interfaz; **experiments.ts** contiene etiquetas de componentes científicos. Las páginas reutilizan components/pages/ y layouts. No se añaden frameworks ni dependencias.

Inicio presenta especialización, cuatro áreas, experiencia general, stack, estudios en curso y tres artículos recientes por fecha del idioma activo. Blog conserva destacados, categorías y filtros útiles, separados por idioma. Los artículos relacionados y las series tampoco mezclan idiomas.

### Traducciones de artículos

El campo **lang** determina idioma, feed y ruta. El campo opcional **translationKey** vincula versiones con slugs diferentes:

    lang: en
    translationKey: roc-auc-calibracion-probabilidades
    draft: true

En los artículos heredados, la clave se deriva del identificador existente para no modificar su contenido. Una traducción puede utilizar esa clave sin editar el original. Si se prefiere una clave nueva, añadirla a ambas versiones como cambio editorial deliberado. Los archivos ingleses pueden estar en src/content/blog/en/; ese prefijo no se repite en la URL. Las fechas de publicación de las traducciones deben corresponder al mismo evento editorial. No se han traducido ni reescrito los artículos científicos existentes.

No puede haber dos versiones de una clave en un mismo idioma, rutas duplicadas o posiciones de serie publicadas duplicadas por idioma. Cada versión se publica solo después de su propia revisión; una traducción en borrador nunca aparece como alternativa pública.

El selector enlaza la página equivalente. Si un artículo no tiene traducción, enlaza al Blog de destino y lo indica en el título y texto accesible del enlace. No se crean páginas ficticias. Canonical, HTML lang, Open Graph, RSS y JSON-LD usan el idioma de la página; hreflang solo apunta a versiones reales publicadas. El sitemap reutiliza esos enlaces y conserva las fechas originales de artículos. GitHub Pages sirve un único 404.html; incluye mensajes y retorno al inicio en español e inglés.

### Contacto, formación y newsletter

**src/data/profile.ts** centraliza identidad y enlaces profesionales confirmados. Se puede añadir un correo público confirmado y perfiles reales de Hugging Face, Kaggle u ORCID. Mientras falten, no se renderizan. **src/data/career.ts** contiene las dos formaciones y las cinco certificaciones solicitadas.

El formulario de Contacto usa un componente HTML con mejora progresiva y Formspree. No se muestra mientras falte cualquiera de los tres ajustes de configuración: `PUBLIC_FORMSPREE_FORM_ID`, `PUBLIC_CONTACT_PRIVACY_NOTICE` y `PUBLIC_CONTACT_PRIVACY_APPROVED=true`. El ID es público y el aviso se incorpora al HTML; no guardes secretos o información personal en esas variables. Para habilitarlo, crea y verifica un formulario en Formspree, prepara un aviso de privacidad revisado que indique responsable y contacto, datos recogidos, finalidad, base jurídica, proveedor, posibles transferencias y retención, y cómo solicitar información sobre el tratamiento. Después configura las tres variables en el entorno local o como variables de repositorio de GitHub Actions. No marques la aprobación ni publiques el formulario hasta cubrir esos puntos. No se ha creado una cuenta ni aceptado condiciones en Formspree. El formulario incluye un campo honeypot; revisa y activa también las herramientas antispam disponibles en el panel del proveedor. Los mensajes y correos no se escriben en logs del sitio.

**src/data/newsletter.ts** está vacío y Newsletter.astro no muestra nada. Para una futura integración RSS→email, elegir un proveedor con feeds/listas independientes para ES y EN, configurar y probar su formulario alojado, consentimiento, privacidad y cancelación. Después añadir hostedFormUrl y privacyUrl HTTPS para el idioma operativo. El componente ofrece un enlace al formulario real del proveedor, sin almacenar correos, introducir scripts externos o construir un backend. No se ha contratado ni activado ningún servicio.

Las pruebas nuevas utilizan traducciones sintéticas exclusivamente en copias temporales y comprueban navegación, idiomas, fechas compartidas, slugs distintos, fallback, SEO, feeds, sitemap, interfaz de lectura, responsive, teclado y accesibilidad. Se mantienen las pruebas de geometría/física del grafo y la integridad de recursos y resultados científicos.

## Logotipo af

El logotipo está formado únicamente por las letras minúsculas `af`, con contornos vectoriales en cursiva. La cabecera cambia suavemente a azul claro al pasar el cursor o recibir foco. El favicon y la imagen social reutilizan las mismas letras desde `src/lib/monogram.ts`; no incluyen el grafo.

**Limitación tipográfica:** Cambria no está instalada ni disponible con licencia en el entorno. Los contornos son de Caladea Italic, no de Cambria. Caladea es una serif abierta distribuida bajo SIL Open Font License 1.1 y compatible en métricas con Cambria. El archivo de fuente se usó temporalmente para trazar las letras y no se distribuye con el sitio. Diseñada por The Caladea Project Authors, © 2012. [Repositorio fuente y licencia](https://github.com/googlefonts/caladea).

## Reglas permanentes de separación visual

La interfaz no utiliza puntos medios decorativos (U+00B7) ni líneas horizontales entre secciones, incluidos `hr`, bordes separadores, pseudoelementos, trazados SVG o gradientes con esa función. Las etiquetas se agrupan con `gap`; las secciones se distinguen mediante fondos oscuros sutiles, espaciado, jerarquía tipográfica y composición. Se mantienen Cambria y la paleta actual.

Las reglas se aplican a español e inglés, artículos nuevos y previsualizaciones de borradores. No afectan a fórmulas, código, ejes de gráficos, bordes funcionales de tablas y controles, indicadores de foco o progreso de lectura. `tests/design-policy.spec.ts` revisa textos y estilos renderizados en móvil, tablet y escritorio, con y sin JavaScript, y comprueba contraste y accesibilidad.
