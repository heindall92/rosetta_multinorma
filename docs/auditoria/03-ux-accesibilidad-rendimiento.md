# Auditoría UX · accesibilidad · rendimiento · iconografía — Rosetta multinorma

> **Informe original de la auditoría (1 de octubre de 2026).** Se conserva tal como se redactó, sobre el código de ese momento. Qué se ha corregido desde entonces y qué queda pendiente está en [AUDITORIA_PRODUCCION.md](../AUDITORIA_PRODUCCION.md). Las rutas a pruebas de concepto y scripts de medición se refieren al material de trabajo de la auditoría, que no se versiona.

**Fecha:** 2026-10-01 · **Base auditada:** `d3ecdfe` (HEAD de `main`; las primeras mediciones se tomaron sobre `dd328d6` y se repitieron sobre `6017d20`/`d3ecdfe` tras los commits de CSP/fuentes incrustadas que aparecieron durante la auditoría) · **Entorno:** Chromium headless (Playwright 1.56.1), `file://dist/index.html`, peticiones externas bloqueadas, axe-core 4.x, lucide-static 1.49.0.

**Directorio de trabajo:** `audit-ux/`
(`shots/` = 110 capturas · `quickwins.patch` = parche validado · `axe-head.json` / `axe-work2.json` · `perf-head.json` / `perf-work.json` · scripts `axe2.mjs`, `kbd2.mjs`, `perf2.mjs`, `blur.mjs`, `touch.mjs`, `i18n.mjs`, `icons.mjs`, `glass.mjs`).

No se ha modificado nada en el repositorio ni se ha hecho commit/push. El parche se validó aplicándolo sobre una copia de `src/` de `d3ecdfe` (`git apply --check` → OK; build OK; `npm test` 71/71; `tests/e2e.test.mjs` 16/16).

---

## 0. Resumen ejecutivo

| Área | Estado | Dato clave |
|---|---|---|
| Accesibilidad automática (axe, 14 vistas × 2 temas × 2 anchos = 56 pasadas) | **Mal → bien con el parche** | **1 597 nodos en violación** (1 015 contraste, 432 interactivos anidados, 108 ARIA de tabla, 12 sin etiqueta…) → **35** con `quickwins.patch` (28 son `heading-order`, 7 contraste en carriles «fuera de alcance») |
| Teclado y foco | **Crítico** | Tras casi cualquier acción (cambiar estado, filtrar, mover tarjeta, abrir menú, cambiar tema/idioma, cerrar paleta/inspector) **el foco cae a `<body>`**: el usuario de teclado vuelve a empezar desde «Saltar al contenido». La rueda (113 rayos) no es alcanzable por teclado. Corregido en el parche (salvo la rueda). |
| Movimiento | Bien | `prefers-reduced-motion` ya anula las 121 animaciones (aurora, rueda, haces). Solo faltaban los `scrollIntoView({behavior:'smooth'})` de JS (parcheado). |
| Rendimiento | **Fluidez mejorable** | Arranque 0,23 s DCL (1×) / ~1,0 s (CPU 4×). El motor es despreciable (calcular ≈ 0,5 ms); **el coste es el `innerHTML` de la vista completa**: cambiar el estado de 1 control en *Controles* = **~55 ms (1×) / ~270 ms (4×)** → INP «mejorable/malo» en portátiles modestos y móviles. Abrir el inspector repinta toda la lista (~290 ms a 4×). |
| `backdrop-filter` + aurora | Coste continuo | Con la aurora animada el compositor nunca queda en reposo (frames inactivos p50 133–183 ms en GPU por software vs 16,7 ms con la aurora quieta). Quitar blur + animación sube los fps de scroll +40–60 % (relativo; ver salvedades). |
| Iconos | Bien, con deuda | **98/98 coinciden byte a byte con Lucide 1.49**, pero **6 nombres son alias obsoletos** (`trash-2`, `circle-help`, `building-2`, `filter`, `file-json`, `fingerprint`) y 24 iconos embebidos no se usan. Trazo fijo 1,8 a 9 tamaños distintos → grosor real entre 0,98 px y 2,25 px. |
| i18n | Casi completo | Fugas reales: `aria-label="Secciones"` (tab bar) y `aria-label="Detalle"` (inspector) fijos en `src/index.html`; textos de catálogo ENS (`ref` «Clasificación ISO», `dims`) solo en español; informes en `06-io.js` usan `tx(es,en)` en línea fuera del diccionario. |
| UX del flujo real | Bueno en concepto, fricción en detalle | Sin deshacer en ninguna acción destructiva o masiva (importar SoA sobre el proyecto, «Restablecer», mover tarjetas que cambian el estado del control). Los errores se muestran con el **mismo toast verde con ✓** que los éxitos. Estado vacío de un proyecto nuevo dice «0 alertas / Sin incoherencias» en verde mientras hay 185 brechas. |

---
## 1. Accesibilidad (WCAG 2.2 AA)

### 1.1 axe-core: nodos en violación por vista (HEAD `d3ecdfe` → con `quickwins.patch`)

Reglas: `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`. Caso TechServ abierto. Capturas de cada pasada: `shots/<vista>-<desk|mob>-<light|dark>.png`.

| Vista | claro 1440 | claro 390 | oscuro 1440 | oscuro 390 |
|---|---|---|---|---|
| inicio | 12 → 0 | 11 → 0 | 0 → 0 | 0 → 0 |
| nuevo | 4 → 0 | 3 → 0 | 0 → 0 | 0 → 0 |
| perfil | 2 → 0 | 1 → 0 | 0 → 0 | 0 → 0 |
| ajustes | 8 → 1 | 7 → 1 | 4 → 1 | 4 → 1 |
| ayuda | 8 → 0 | 7 → 0 | 0 → 0 | 0 → 0 |
| panel (Órbita) | 52 → 1 | 51 → 1 | 40 → 1 | 40 → 1 |
| traductor (Prisma) | 12 → 1 | 42 → 5 | 8 → 1 | 38 → 4 |
| controles | **194 → 0** | **193 → 0** | 101 → 0 | 101 → 0 |
| normas | 95 → 1 | 94 → 1 | 10 → 1 | 10 → 1 |
| brechas | 8 → 0 | 6 → 0 | 3 → 0 | 2 → 0 |
| plan | 63 → 0 | 62 → 0 | 0 → 0 | 0 → 0 |
| mapa | **133 → 1** | **131 → 1** | 5 → 1 | 4 → 1 |
| alcance | 7 → 1 | 6 → 1 | 1 → 1 | 1 → 1 |
| exportar | 6 → 1 | 5 → 1 | 1 → 1 | 1 → 1 |
| **Total** | | | | **1 597 → 35** |

Por regla (56 pasadas, HEAD): `color-contrast` 1 015 · `nested-interactive` 432 · `aria-required-parent` 100 · `heading-order` 28 · `label` 12 · `aria-required-children` 8 · `scrollable-region-focusable` 2.
Con parche: `heading-order` 28 · `color-contrast` 7 (chips de carriles NIS2/42001 *fuera de alcance*, que se atenúan con opacidad).

Además, axe deja **1 711 nodos de contraste como «incompletos»** (no puede resolver el fondo bajo `backdrop-filter`/degradados); ver 1.4.

#### Causas raíz (y dónde)

| Problema | Evidencia | Código | Corrección |
|---|---|---|---|
| **Rosa de acento como texto** sobre blanco/rosa claro: 3,4–4,3:1 | `.uc` (113 nodos en Mapa, 3,47:1), `.btn.ghost` 4,2:1, `.btn.primary` blanco sobre `#dd2a80` 4,33:1, `.eyebrow` 3,89:1, `.lang [aria-pressed]` 3,41:1, tab bar activa 3,46:1 | `rosetta.css` l.112, 175, 237–239, 298, 579, 623, 794 | Token `--accent-text` = `color-mix(in oklch, var(--accent) 78%, black)` en claro (sirve para los 7 acentos) y `--accent-fill` para fondos de botón primario. En oscuro, `--accent-text` = acento + 28 % blanco (había 3,9–4,2:1 sobre fondos teñidos de rosa). |
| **Semáforo demasiado claro** como texto | `.pill.cubierto` 3,5:1 (53), `.pill.parcial`/`.rank.Media` 3,3–3,4:1, `.rank.Alta` 4,24:1 | `--ok/--warn/--crit` claros (l.25–27) | `--ok` 0,56→0,49 L; `--warn` 0,60→0,50; `--crit` 0,56→0,50 (siguen distinguibles; el parche los redefine al final). |
| «Heredado del ENS» en naranja ENS 3,54:1 (89 filas) | `.origin` | l.463 | Mezclar con `--ink` 28 %. |
| Atenuación por **opacidad** (`.li.dim` .5, `.fwt.off` .45, `.lens.off` .6, `.c.fuera` .4, `.rq.st-excluido` .5) → 2,1–2,7:1 | Normas: «no exigido» 2,1:1; Órbita: normas fuera de alcance 2,57:1 | l.281, 297, 364, 399, 454, 472 | Atenuar con `color: var(--muted)` en vez de opacidad (el texto sigue legible y el estado se entiende). |
| Matriz de solapamiento: blanco sobre rosa medio 2,6–3,2:1 | `.overlap .c.hi` | l.397 | Texto `--ink` y relleno ≤ 48 %. |
| Mapa por dominio: blanco sobre color de norma 3:1 | `.dgrid .c.hi` | l.520 | Texto oscuro fijo. |
| `role="table"` sin `row` (100 + 8 nodos *critical*) | `.overlap`, `.dgrid` | `05-views.js` `overlapGrid()`, `vMapa()` | Envolver cada fila en `<div role="row">` con `display: contents` (no cambia el grid). |
| **Interactivo anidado** (432, *serious*): fila `div[role=button][tabindex=0]` que contiene el interruptor de 4 estados | `.li` en Controles (101/vista), `.node` en Prisma (7) | `05-views.js` `vControles()`, `vPrisma()` | La fila deja de ser botón; el **título pasa a ser `<button class="li-open">`** (conserva `id="uc-…"` para la vuelta del foco). El clic en cualquier punto de la fila sigue abriendo el inspector. |
| 3 interruptores de Ajustes sin nombre accesible (*critical*) | `#st-rail`, `#st-rel`, `#st-mc` | `04-global.js` `sw()` | `aria-label` con el título de la fila. |
| Región con scroll horizontal no enfocable | contenedor del grid de Mapa | `vMapa()` | `tabindex="0" role="region" aria-label`. |
| `heading-order` (28) | `h1` → `h3` en todos los `.pane-h` | `05-views.js` (todas las vistas) | Pendiente (no incluido): usar `h2` con la clase visual de `h3`. Bajo riesgo pero toca muchas plantillas. |

### 1.2 Teclado y gestión del foco (Playwright, `kbd2.mjs`)

| Recorrido | HEAD | Con parche |
|---|---|---|
| Orden de tabulación en Inicio | Correcto: *Saltar al contenido* → marca → plegar → proyecto → buscar → ES/EN → tema → acento → perfil → contenido | igual |
| `go(vista)` | El foco va a `#view` (bien); 1 Tab hasta el contenido | igual |
| **Cambiar estado de un control con Intro** (interruptor 4 posiciones) | Estado cambia, **foco → `BODY`**; el siguiente Tab cae en «Restablecer» del banner | Foco se queda en el botón pulsado |
| Filtro de chips (`aria-pressed`) | **foco → `BODY`** | se mantiene |
| Mover tarjeta del Plan (◀ ▶) | **foco → `BODY`** | sigue en el botón de la tarjeta (ya en el carril nuevo) |
| Cambiar tema / idioma | **foco → `BODY`** (re-render diferido 320 ms) | se mantiene |
| Menú de proyecto/acento/cuenta (`role="menu"`) | El disparador se destruye al repintar el dock: **foco → `BODY`**; sin flechas; Esc no devuelve el foco | Foco al primer elemento, ↑/↓ recorren, Esc vuelve al disparador |
| Paleta Ctrl+K | Abre con foco en el input (bien), pero: sin `aria-modal`, input sin nombre ni `role=combobox`, lista sin `listbox`/`option`, sin `aria-activedescendant`; **Tab sale de la paleta**; al cerrar **foco → `BODY`** | Patrón combobox/listbox completo, Tab atrapado, al cerrar vuelve al elemento previo |
| Prisma (buscador) | `role=combobox` pero **sin `aria-activedescendant`** (el lector no anuncia la opción resaltada) | añadido |
| Inspector (abrir con Intro) | Foco al `h2` (bien). **Tab sale del panel** tras 17 paradas aunque hay *scrim* (modal en móvil). Esc devuelve el foco solo si se abrió desde Controles; desde Normas/Mapa/Brechas **→ `BODY`** | Esc/✕ devuelven el foco al elemento que lo abrió en cualquier vista. *Pendiente:* `inert` en `#main` mientras está abierto en móvil, y `role="dialog"` + `aria-labelledby`. |
| Rueda de la Órbita | **0 de 113 rayos enfocables** (hay CSS `:focus-visible` para `.spoke`, pero ningún `tabindex`); el SVG es `role="img"` con hijos clicables | sin cambio (propuesta M3) |
| Arrastrar y soltar del Plan | Alternativa de teclado con ◀ ▶ — **bien** | — |
| Atajos `g o`, `g p`, `/`, `?`, `[` | Funcionan; no colisionan al escribir | — |

### 1.3 ARIA en widgets propios

- **Interruptor de 4 estados (`.stsw`)**: `role="group"` + `aria-label="Estado de X"` + botones `aria-pressed` con `aria-label`: semántica correcta y comprensible. Mejoras: patrón *radiogroup* (`role="radio"` + `aria-checked` + flechas con *roving tabindex*) reduciría de 4 a 1 las paradas de Tab por fila (Controles tiene **404 paradas de Tab solo en interruptores**).
- **Chipsets**: `role="group"` + `aria-pressed` — bien. Los chips de estado de Normas y los segmentados de Ajustes no tienen `aria-label` en el grupo (Controles usa `aria-label=t('severity')` para el grupo de *estados*, que es un texto equivocado).
- **Rueda SVG**: `role="img"` + `aria-label="Rueda Rosetta: 91 % cobertura"` — da el total, pero no la información por control; los textos de anillo (`.ring-lbl`, 9,5 px) quedan en 2,5:1. Ofrecer «Ver como tabla» (la tabla ya existe: Controles) enlazada desde la propia tarjeta.
- **Toast**: `role="status"` siempre; los errores deberían ser `role="alert"` (parche) y durar más de 2,8 s (WCAG 2.2.1: el parche da 7 s a los errores y escala los avisos con la longitud).
- **Popovers** con `role="menu"` cuyos hijos no son `menuitem`: o se completa el patrón (parche: foco + flechas) o se cambia a *disclosure* sin `role`.
- `#insp` y `#tabbar` tenían `aria-label` fijo en español (ver §4.5): el parche los actualiza en `applyTheme()`.

### 1.4 Contraste real sobre cristal (muestreo de píxeles)

axe no puede evaluar 1 711 nodos sobre `backdrop-filter`. `glass.mjs` oculta el texto, captura y mide el percentil 10 del fondo real bajo cada nodo de texto (6 vistas, con aurora estática):

| Tema | Nodos de texto | < AA en HEAD | < AA con parche | Restantes |
|---|---|---|---|---|
| Claro | 302 | 71 | 16 | 6 son texto con degradado (`background-clip:text`, falso positivo), contadores `.fwn` de normas fuera de alcance (1,9:1), etiquetas de anillo de la rueda (2,5:1), `.ref` de hallazgos |
| Oscuro | 302 | 24 | 16 | ídem + `switch-l` (falso positivo por el mando) |

Conclusión: el cristal claro (blanco 56 % sobre aurora pastel) **no** es el problema principal; lo es el uso del acento y de la opacidad. En oscuro, el fondo del cristal varía con la aurora (zonas rosas detrás de `.lens`), por eso conviene que los textos pequeños de color se apoyen en `--accent-text` y no en `--accent`.

### 1.5 Objetivos táctiles (390 × 844, `touch.mjs`)

WCAG 2.2 **2.5.8 (24 px) se cumple en todas las vistas** (0 objetivos < 24 px). Pero contra la recomendación de 44 px (2.5.5 AAA / HIG):

| Vista | Interactivos | < 44 px | Dominantes |
|---|---|---|---|
| controles | 519 | 414 | interruptor de estado **32 × 28 px con 2 px de separación** (×4 por fila) |
| mapa | 645 | 639 | chips `.rq` 26 px, `.uc` 24 px |
| plan | 108 | 102 | `ibtn` 32 × 32, inputs 34 px, `.uc` 24 px |
| ajustes | 42 | 36 | interruptores 44 × 26, muestras de color 30 × 30 |
| traductor | 69 | 40 | interruptores 32 × 28 |

El interruptor de estado es la acción más frecuente del consultor y es la más pequeña: el parche lo lleva a 40 × 36 px por debajo de 900 px, y en el inspector móvil lo deja **envolver** (en 390 px «No aplica» quedaba fuera de la hoja: `shots/ux-10-inspector-uc-mob.png` vs `shots/after-inspector-mob-light.png`).

### 1.6 Movimiento (`rm.mjs`)

Sin preferencia: 121 animaciones en Inicio (aurora ×4, `spin` de la rueda héroe de 160 s, `grow` ×113, `enter`), 7 `flow` en Prisma. Con `prefers-reduced-motion: reduce`: **0** — la regla global de `rosetta.css` (última línea) funciona. Huecos: `scrollIntoView({behavior:'smooth'})` en `07-events.js` (`scroll-casos`, `tr-center`) — parcheado con `reduceMotion()`. Añadido `prefers-reduced-transparency` (Chromium/Safari la exponen): cristal opaco y sin aurora.

---
## 2. Rendimiento

Salvedad: Chromium headless en contenedor compartido, **sin GPU** (rasterizado por software). Las cifras absolutas de *frames* son pesimistas; lo útil son las **relaciones** y los costes de JS/DOM. «4×» = `Emulation.setCPUThrottlingRate(4)` (≈ portátil modesto / móvil medio). Medianas de 5–9 repeticiones; ruido observado ±30 % a 1×.

### 2.1 Carga (`file://`, 5 arranques en frío, HEAD)

| | 1× | 4× |
|---|---|---|
| `DOMContentLoaded` | **244 ms** | **1 044 ms** |
| First Contentful Paint | — (no emitido en headless 1×) | 592 ms |
| Script / Layout / Recalc style | 64 / 51 / 30 ms | 233 / 202 / 138 ms |
| Long tasks (> 50 ms) | 3, máx. 161 ms, Σ 333 ms | 5, **máx. 340 ms**, Σ 830 ms |
| JS heap tras arrancar | 4,4 MB | 4,4 MB |
| Nodos DOM (Inicio) | 1 690 | |

**Tamaño del único fichero:** era 610 KB (138 KB gzip) en `dd328d6`; tras incrustar fuentes en `6017d20` es **893 KB (349 KB gzip)**: 272 KB son las tres WOFF2 en base64 (no comprimibles; Bricolage Grotesque, solo para titulares, pesa 131 KB), 286 KB el `<script>` de datos (`casos.json` 210 KB + `catalog.json` 206 KB + iconos 18 KB) y 214 KB la app + motor. El *parse* de JSON de casos de ejemplo se paga en cada arranque aunque el usuario solo trabaje con su proyecto.

Antes de `6017d20` la hoja de Google Fonts era **bloqueante**: con la red lenta (+3 s) el FCP pasaba de 328 ms a **3 376 ms**, y con la red colgada a **12 288 ms** (`fonts.mjs`). Las fuentes incrustadas lo resuelven (y además eliminan la transferencia de IP a Google, relevante en una herramienta de cumplimiento). Queda optimizable el *subset* de Bricolage (sólo latín básico + los pesos usados).

### 2.2 Coste por interacción (todo pasa por `render()` → `innerHTML` de dock + tab bar + vista)

Columna «sync» = manejador + `innerHTML` + layout forzado; «frame» = hasta el siguiente frame pintado.

| Interacción | sync 1× | sync 4× | frame 4× | Nodos |
|---|---|---|---|---|
| `go('controles')` | 57 ms | **259 ms** | 411 ms | 3 482 |
| `go('mapa')` | 45 ms | 191 ms | 265 ms | 2 476 |
| `go('panel')` (rueda) | 26 ms | 118 ms | 172 ms | 1 166 |
| **Cambiar estado de 1 control (Controles)** | 56 ms | **272 ms** | 392 ms | 3 482 |
| **Abrir inspector desde Controles** | 52 ms | **294 ms** | 393 ms | 3 560 |
| Abrir inspector desde Mapa (chip) | 66 ms | 270 ms | 412 ms | 2 678 |
| Filtro de estado (chips) | 22 ms | 125 ms | 217 ms | 916 |
| Prisma: cambiar estado + redibujar haces | 133 ms | 153 ms | 317 ms | 599 |
| Plan: mover tarjeta | 19 ms | 109 ms | 161 ms | 816 |
| Paleta: escribir 1 carácter | 9 ms | 43 ms | 162 ms | 1 248 |

Desglose del coste de «cambiar estado» (`split.mjs`, 1× / 4×): `E.calcular` 0,5 / 2,4 ms · `coherencia` 0,2 · `prioridades` 0,1 · `planAccion` < 0,1 · `JSON clone` 0,2 / 1 ms · **`innerHTML` de la vista Controles (274 KB de HTML, 3 400 nodos) 38 / 256 ms**. Es decir, **> 95 % del tiempo es reconstruir DOM que no ha cambiado**: para cambiar 1 `aria-pressed` y 3 contadores se regeneran 101 filas, 404 botones e iconos SVG en línea (cada icono = un `<svg>` con 1–5 trazados; Controles pinta ~700 iconos).

Con INP objetivo < 200 ms, a 4× Controles, Mapa e inspector están en «mejorable» y el arrastre de estados en ráfaga se siente pegajoso. A 1× (equipo de desarrollo) todo parece instantáneo, por eso no se ha notado.

### 2.3 Memoria

150 cambios de estado + 50 navegaciones: heap 4,09 → 4,11 MB tras GC; nodos vivos 5 662 → 5 118; 27 *listeners* constantes (delegación en `document`). **Sin fugas.** `localStorage`: 30 KB por proyecto (`rosetta/v1/p/demo-techserv`), 0,6 KB de *workspace*; el `historial` se recorta a 24 instantáneas — bien.

### 2.4 `backdrop-filter` y aurora (`blur.mjs`, scroll programático 2,5 s + 1,5 s en reposo)

| Vista / ancho | Variante | fps scroll | p95 frame | p50 frame **en reposo** |
|---|---|---|---|---|
| Controles 1440 | actual | 6,0 | 250 ms | **183 ms** |
| | sin `backdrop-filter` | 6,6 | 200 ms | 133 ms |
| | aurora quieta | 5,7 | 233 ms | **16,7 ms** |
| | ambas cosas | 8,5 (+42 %) | 150 ms | 16,7 ms |
| Controles 390 | actual | 11,8 | 133 ms | 83 ms |
| | ambas cosas | 18,6 (+58 %) | 83 ms | 16,7 ms |
| Órbita 1440 | actual | 5,6 | 367 ms | 183 ms |
| | ambas cosas | 7,0 | 267 ms | 16,7 ms |

Lectura: con GPU real los valores absolutos serán mucho mejores, pero el patrón se mantiene: **la aurora (4 discos de 58 vmax con `filter: blur(70px)` animados indefinidamente) impide que la página quede en reposo**, y cada superficie con `backdrop-filter` (13 `.glass` en Controles, más dock/tab bar/inspector con `blur(36px) saturate(1.8)`) debe re-muestrear el fondo en cada frame. En portátiles con batería eso es consumo constante aunque el usuario solo esté leyendo. Ya existe una excepción para la rueda y el Prisma (`rosetta.css` l.318–319), señal de que el coste se notó.

---
## 3. Iconografía (Lucide)

### 3.1 `src/data/icons.json` frente a `lucide-static@1.49.0`

Comparación canónica (elementos y atributos normalizados, `icons.mjs`):

- **98/98 iconos son idénticos** a la geometría oficial de Lucide 1.49 — no hay iconos inventados ni versiones antiguas de trazado.
- **6 nombres son alias obsoletos** (existen en `lucide-static/icons/` por compatibilidad pero no en `icon-nodes.json`, la lista canónica): 

| Nombre usado | Nombre canónico Lucide 1.x | ¿Se usa? |
|---|---|---|
| `trash-2` | `trash` | sí (Inicio, Ajustes) |
| `circle-help` | `circle-question-mark` | sí (dock, hoja móvil, menú cuenta) |
| `building-2` | `building-complex` | sí (proyectos propios, dominio FIS) |
| `file-json` | `file-braces` | sí (Exportar · Proyecto, en `00-i18n.js`) |
| `filter` | `funnel` | no |
| `fingerprint` | `fingerprint-pattern` | no |

- **24 iconos embebidos no se usan** (≈ 4 KB): `arrow-up-right refresh-cw clock command external-link copy eye scale target radar git-compare-arrows filter calendar globe pencil circle-arrow-right grip-vertical move-right crosshair scan-search flame shield fingerprint workflow`.
- `02-icons.js` devuelve `''` para un nombre desconocido: un error tipográfico produce un hueco silencioso. Hoy los 75 nombres usados existen (comprobado), pero conviene un `console.warn` en desarrollo o un test en `tests/build.test.mjs` que extraiga `icon('…')` y los `ic` del catálogo.

### 3.2 Consistencia de trazo y tamaño

`icon()` fija `stroke-width="1.8"` en un `viewBox` de 24 y se usa a **9 tamaños**: 13 (3 usos) · 14 (18) · 15 (22) · 16 (45) · 17 (8) · 18 (5) · 20 (5) · 22 (5) · 30 (1). Grosor resultante en pantalla: **0,98 px a 13 px … 1,2 px a 16 … 1,65 px a 22 … 2,25 px a 30**. En el dock conviven 17 px (nav), 18 (acento), 15–16 (proyecto, buscar) y 14 (tema) en la misma franja, con trazos visiblemente distintos; `.pill .ic` fuerza 13 px por CSS. El chevron del `<select>` (CSS) usa 2,2 → 1,28 px y la roseta de marca 1,6 en viewBox 40.

Propuesta: escala de 4 tamaños (14 · 16 · 20 · 24) y **trazo absoluto** al estilo `absoluteStrokeWidth` de Lucide:

```js
// 02-icons.js
const icon = (name, size = 16, cls = '') => `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${(1.5 * 24 / size).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
```
(1,5 px reales en todos los tamaños; no incluido en el parche porque cambia el peso visual de toda la UI y conviene revisarlo en diseño.)

### 3.3 Nombres Lucide propuestos por concepto de UI

✔ = mantener; ✎ = cambiar (motivo).

| Concepto | Actual | Propuesto | Nota |
|---|---|---|---|
| Inicio | `house` | ✔ `house` | |
| Órbita (panel) | `orbit` | ✔ `orbit` | |
| Prisma (traductor) | `waypoints` | ✔ `waypoints` | alternativa `arrow-right-left` si se quiere «traducir» |
| Controles unificados | `layers` | ✔ `layers` | |
| Normas / requisito | `file-check` | ✔ `file-check` | |
| Brechas | `shield-alert` | ✔ `shield-alert` | |
| Plan (tablero) | `square-kanban` | ✔ `square-kanban` | |
| Mapa | `grid-3x3` | ✔ `grid-3x3` | |
| Alcance | `compass` | ✎ `target` | `compass` se repite en el recuadro NIS2; alcance = «a qué apunto» |
| Aplicabilidad NIS2 | `compass` | ✎ `scale` | es una determinación legal (ya está embebido) |
| Exportar | `download` | ✔ `download` | |
| Importar SoA del ENS | `upload` | ✎ `file-up` | distinguir de «Restaurar copia» |
| Restaurar copia | `upload` | ✎ `archive-restore` | |
| Copia de seguridad | `archive` | ✔ `archive` | |
| Ayuda | `circle-help` | ✎ `circle-question-mark` | renombrado |
| Ajustes | `sliders-horizontal` | ✔ | |
| Perfil | `user` | ✔ `user` (o `user-round`) | |
| Nuevo proyecto | `plus` | ✔ | |
| Proyecto propio | `building-2` | ✎ `building-complex` | renombrado |
| Sin proyecto | `folder` | ✔ | |
| Buscar / paleta | `search` | ✔ | |
| Idioma | `languages` | ✔ | |
| Tema claro / oscuro / sistema | `sun` / `moon` / `monitor` | ✔ | |
| Color de acento | `palette` | ✔ | |
| Plegar / desplegar menú | `chevron-left` / `chevron-right` | ✎ `panel-left-close` / `panel-left-open` | comunica «panel», no «atrás» |
| Ver detalle (inspector) | `panel-right` | ✎ `panel-right-open` | |
| Cerrar | `x` | ✔ | |
| Eliminar | `trash-2` | ✎ `trash` | renombrado |
| Restablecer caso | `rotate-ccw` | ✔ | |
| Más (menú) | `ellipsis` | ✔ | |
| Estado: implantado | `circle-check` | ✔ | |
| Estado: parcial | `contrast` | ✔ `contrast` | Lucide no tiene `circle-half`; `contrast` es la convención |
| Estado: pendiente | `circle-dashed` | ✔ | |
| Estado: no aplica | `circle-slash` | ✎ `circle-minus` | hoy idéntico a «excluido» |
| Cobertura: cubierto | `circle-check` | ✎ `circle-check-big` | distinguir «requisito cubierto» de «control implantado» |
| Cobertura: parcial | `contrast` | ✔ | |
| Cobertura: brecha | `circle-dashed` | ✎ `circle-alert` | hoy idéntico a «pendiente», y una brecha no es «pendiente» |
| Cobertura: excluido | `circle-slash` | ✔ `circle-slash` (o `ban`) | |
| Cobertura: no exigido | `info` | ✎ `circle-dot-dashed` | `info` ya se usa para avisos |
| Severidad alta / media / baja | (texto) | `octagon-alert` / `triangle-alert` / `info` | redundancia no cromática (WCAG 1.4.1) |
| Carril Pendiente / En curso / Hecha | `circle-dashed` / `hourglass` / `badge-check` | `circle-dashed` / ✎ `loader-circle` / `badge-check` | |
| Empezar acción | `zap` | ✎ `play` | |
| Mover tarjeta | `chevron-left/right` | ✔ | |
| Excel / Markdown / plan CSV / controles CSV / JSON | `file-spreadsheet` / `file-text` / `list-checks` / `layers` / `file-json` | ✔ / ✔ / ✔ / ✎ `sheet` / ✎ `file-braces` | |
| Sugerencia (callout) | `lightbulb` | ✔ | |
| Retos del caso | `flag` | ✔ | |
| Atajos / Guía | `keyboard` / `book-open` | ✔ | |
| KPI reutilización | `link` | ✎ `recycle` | |
| KPI trabajo ahorrado | `split` | ✎ `trending-down` | |
| KPI multinorma | `network` | ✔ | |
| Dominio GOB / RIE / PER / ACT | `landmark` / `activity` / `users` / `box` | ✔ / ✎ `gauge` / ✔ / ✎ `package` (`hard-drive` si son soportes) | `activity` sugiere monitorización |
| Dominio ACC / OPE / RED / DES | `key-round` / `cpu` / `network` / `code-xml` | ✔ / ✎ `server-cog` / ✔ / ✔ | `network` se repite con el KPI multinorma |
| Dominio PRO / INC / CON / FIS / IA | `truck` / `siren` / `life-buoy` / `building-2` / `sparkles` | ✎ `handshake` / ✔ / ✔ / ✎ `door-closed-locked` / ✎ `brain-circuit` | `sparkles` se usa también en el eyebrow de Inicio y en el caso Lumen |
| Casos TechServ / Hospital / Lumen / Aguas / CitaFácil | `server` / `hospital` / `sparkles` / `droplet` / `cloud` | ✔ / ✔ / ✎ `bot` / ✔ / ✔ | |

---
## 4. Revisión UX

### 4.1 Flujo del consultor: crear proyecto → alcance → importar SoA ENS → marcar controles → brechas → plan → exportar

| Paso | Lo que funciona | Fricción observada | Evidencia |
|---|---|---|---|
| **1. Crear** (`nuevo`, asistente 3 pasos) | Stepper claro, validación por paso, resumen final antes de crear | El error («Indica la organización y el alcance») es un banner genérico encima: los campos no se marcan (`aria-invalid`, borde, mensaje bajo el campo) ni reciben el foco | `ux-02-wizard-error-desk.png` |
| **2. Alcance** (paso 2) | Tarjetas de norma con descripción y nº de requisitos; NIS2 se activa sola si aplica | Página muy larga en un paso; los 5 selectores D/I/C/A/T solo con letra (sin «Disponibilidad…» visible); la categoría y los niveles pueden contradecirse sin aviso | `ux-03-wizard-step2-desk.png` |
| **3. Importar SoA** (paso 3 «Desde mi SoA del ENS») | Lectura local, resumen «N medidas leídas» | Si no se elige fichero, el error aparece arriba del todo, fuera de vista en móvil. **Importar sobre un proyecto existente (Alcance → «Actualizar desde mi SoA») sobrescribe estados, responsables y exclusiones sin confirmación ni deshacer.** Un JSON inválido muestra un toast **con ✓ verde** | `ux-04-…-ens-nofile-*.png`, `ux-08-import-bad-file-toast-desk.png` |
| **4. Marcar controles** | Interruptor de 4 estados por fila, recálculo inmediato, «Heredado del ENS» visible | En móvil el título se trunca a 1 línea («Política…») y el interruptor ocupa 1/3 de la fila; en el inspector móvil «No aplica» quedaba fuera (parcheado). Cada clic cuesta ~270 ms a 4× (§2.2) | `controles-mob-light.png`, `ux-10-inspector-uc-mob.png` |
| **5. Brechas** | Severidad, acción recomendada, chips por norma que abren el inspector | **Proyecto nuevo:** «0 · 0 · 0» y recuadro verde «Sin incoherencias con este filtro» encima de **185 brechas** — la jerarquía dice «todo bien». El bloque de chips (68 + 117) es un muro sin agrupar | `ux-06-new-project-brechas-desk.png` |
| **6. Plan** | Kanban con prioridad y ganancia, alternativa ◀ ▶ al arrastre | Mover a «Hecha» **marca el control como implantado** (y al sacarlo lo deja en «parcial»): efecto lateral silencioso salvo un toast; sin deshacer | `plan-desk-light.png` |
| **7. Exportar** | 6 entregables explicados, todo local | Sin vista previa del informe; sin indicar qué norma/filtro incluye | `ux-09-export-xlsx-offline-desk.png` |

### 4.2 Vista por vista

- **Inicio** — Héroe con rueda decorativa (aria-hidden, correcto) + 3 accesos + casos. Para un usuario recurrente los proyectos quedan por debajo del pliegue; con proyectos propios, «Tus proyectos» debería ir primero y el héroe colapsarse. `inicio-desk-light.png`.
- **Órbita** — Buena jerarquía (rueda + 91 % + normas + «mejor jugada» + alertas). Problemas: la rueda ocupa ~55 % del primer pantallazo y su lectura exige leyenda; en proyecto nuevo, la tarjeta «Evolución» es un panel enorme con un «—» (estado vacío sin texto ni acción) y las alertas dicen 0 con 185 brechas. `ux-05-new-project-panel-desk.png`.
- **Prisma** — Concepto potente; en móvil los haces se ocultan y queda una lista larga; el encabezado + banner demo empujan el selector a ~530 px. `traductor-mob-light.png`.
- **Controles** — La vista de trabajo principal. Faltan: acciones masivas (seleccionar varios → estado), filtro «sin responsable / sin evidencias / revisión caducada», contador sticky. `controles-desk-dark.png`.
- **Normas** — Pestañas con anillo por norma, filtros con recuentos: buena. «No exigido» se atenuaba hasta 2,1:1 (parche).
- **Brechas** — Ver 4.1-5. Las tarjetas de severidad son a la vez KPI y filtro (`aria-pressed`): bien, pero no hay «Brechas sin acción en el plan».
- **Plan** — 3 carriles × 24 tarjetas + «+N». Fecha vencida marcada solo en rojo del input (`.late`), sin texto/icono.
- **Mapa** — Tabla de 113 × 4 con chips: en móvil las cabeceras de norma se solapan (`mapa-mob-light.png`) y la tabla exige scroll horizontal dentro de un contenedor sin indicación.
- **Alcance** — Formularios correctos; el toggle «Infraestructura digital» tiene la etiqueta más larga de la app (4 líneas en móvil).
- **Exportar / Ajustes / Perfil / Ayuda** — Correctas. Ajustes «Borrar todo» tiene confirmación en línea (bien) pero sin exportar copia antes.

### 4.3 Estados vacíos y de error

| Situación | Actual | Propuesta |
|---|---|---|
| Proyecto sin controles marcados | «0 alertas», «Sin incoherencias» en verde, Evolución «—» | Estado vacío explícito: «Aún no has marcado controles · 185 requisitos sin soporte · Empieza por los 3 de mayor ganancia» con CTA a Controles filtrado |
| Búsqueda sin resultados | `empty('search', 'Sin resultados', …)` | Añadir «Limpiar filtros» (hoy hay que deshacer chips + texto + «Solo mi alcance» a mano) |
| Error de importación / Excel / lectura | Toast negro **con ✓** 2,8 s, `role=status` | Parche: icono de alerta, fondo `--crit`, `role=alert`, 7 s. Mejor aún: panel de error en el propio paso del asistente con «qué esperábamos / qué encontramos» |
| Validación del asistente | Banner genérico arriba | `aria-invalid`, mensaje bajo el campo, foco al primer campo inválido |

### 4.4 Deshacer

No existe en ninguna parte. Acciones con pérdida de datos sin deshacer: importar SoA sobre proyecto (sobrescribe hasta 101 controles), «Restablecer» caso, mover a «Hecha» (cambia estado del control), excluir requisito (pierde la justificación al volver a incluir), «Cerrar casos», «Borrar todo». El estado es un objeto JSON pequeño (30 KB): una pila de 20 instantáneas en memoria + toast «Deshecho · Ctrl+Z» es barata (ver M1).

### 4.5 i18n — textos que no pasan por `t()`

Prueba en ejecución (`i18n.mjs`: interfaz en inglés, 14 vistas + 6 pestañas de ayuda + inspector UC/REQ + paleta + 3 popovers + asistente + hoja móvil; se buscan palabras/acentos españoles en texto visible, `aria-label`, `placeholder`, `title`, `data-tip`):

| Fuga | Dónde | Estado |
|---|---|---|
| `aria-label="Secciones"` del `<nav id="tabbar">` | `src/index.html` | **parcheado** (`applyTheme`) |
| `aria-label="Detalle"` del `<aside id="insp">` | `src/index.html` | **parcheado** |
| «Clasificación ISO» (`r.ref`, p. ej. «5.24 Planificación gestión incidentes…») y dimensiones (`r.dims`, «Categoría») de requisitos ENS | `catalog.json` → `inspReq()` / `vPrisma()` | datos sin `_en`: añadir `ref_en`/`dims_en` y leer con `tt()` |
| Nombre por defecto `'Proyecto'` | `01-core.js` `createProject()` | inalcanzable desde el asistente (exige organización), pero sí al importar un JSON sin nombre |
| Informe MD, CSV y Excel con `tx('es','en')` en línea (≈ 60 cadenas) | `06-io.js` | funciona, pero queda fuera del diccionario `I18N` (no se puede revisar/traducir en un sitio) |
| Valores internos en español usados como claves (`'Alta'`, `'En curso'`, `'Pendiente'`, `'Hecha'`) | `05-views.js`, `07-events.js` | correcto mientras se traduzcan con `t('lanes.'+…)`/`t('sev.'+…)` (lo hacen) |

Los demás «positivos» del barrido son datos del usuario o nombres propios (organización, responsables, «TechServ Administración»).

### 4.6 Responsive

- 390 px sin scroll horizontal en ninguna vista (`scrollWidth` = 390 en las 11 comprobadas).
- El **banner del caso demo ocupa ~200 px** del primer pantallazo móvil en *todas* las vistas de proyecto, más ~180 px de encabezado (eyebrow + h1 + lead): el contenido empieza hacia 520–700 px de 844 (`traductor-mob-light.png`, `controles-mob-light.png`). Propuesta: banner colapsable a una línea tras la primera vista y `lead` oculto en móvil.
- El toast se superpone a campos del inspector en móvil (`ux-10-inspector-uc-mob.png`) y a la tab bar; subirlo por encima de la tab bar (`bottom: calc(var(--tabbar-h) + 12px)`).
- Mapa: cabeceras de norma solapadas en 390 px (`mapa-mob-light.png`).

---
## 5. Propuestas priorizadas

### 5.1 Victorias rápidas (bajo riesgo; **todas incluidas en `quickwins.patch`** salvo las marcadas)

| # | Propuesta | Por qué (dato) | Dónde |
|---|---|---|---|
| Q1 | **Recuperar el foco tras `render()`** mediante una clave estable `data-act/id/v/fw/key/dir/…` cuando el elemento no tiene `id` | Hoy 8 de 12 recorridos de teclado acaban en `<body>` (§1.2) | `03-shell.js` `focusKey()`, `restoreFocus()`, `render()` |
| Q2 | Tokens `--accent-text` / `--accent-fill`, semáforo más oscuro en claro, atenuar con color y no con opacidad | 1 015 → 7 nodos de contraste | `rosetta.css` (capa final) |
| Q3 | Tablas ARIA con `role="row"` + `display: contents` | 108 nodos *critical* → 0 | `05-views.js` `overlapGrid()`, `vMapa()`; CSS |
| Q4 | Filas de Controles/Prisma sin `role=button`; título como `<button class="li-open">` | 432 *nested-interactive* → 0 | `05-views.js` `vControles()`, `vPrisma()`; CSS `.li-open` |
| Q5 | Paleta: `aria-modal`, combobox + listbox + `aria-activedescendant`, Tab atrapado, foco devuelto | Paleta inutilizable con lector | `03-shell.js` `renderPalette()`, `07-events.js` |
| Q6 | Popovers: foco al primer elemento, ↑/↓, Esc vuelve al disparador | Foco perdido al abrir | `07-events.js` caso `pop`, `closeLayers()` |
| Q7 | Inspector: Esc/✕ devuelven el foco al elemento que lo abrió (cualquier vista) | Desde Normas/Mapa el foco se perdía | `03-shell.js` `openInsp()`, `07-events.js` `closeLayersInsp()` |
| Q8 | Prisma: `aria-activedescendant` en el combobox | Opción resaltada no anunciada | `05-views.js` `vPrisma()` |
| Q9 | `aria-label` en los 3 interruptores de Ajustes; región de scroll del Mapa enfocable | 12 *label* + 2 *scrollable-region* → 0 | `04-global.js`, `05-views.js` |
| Q10 | Toast de error distinto (icono de alerta, `--crit`, `role=alert`, 7 s) | Errores con ✓ verde 2,8 s | `03-shell.js` `toast()`, `06-io.js`, `07-events.js` |
| Q11 | i18n de `aria-label` de `#tabbar` y `#insp` | Fuga en EN | `01-core.js` `applyTheme()` |
| Q12 | `scrollIntoView` suave solo sin *reduced motion*; `prefers-reduced-transparency` | Hueco de 2.3.3 / comodidad | `07-events.js`, CSS |
| Q13 | Interruptor de estado ≥ 40 × 36 px y que envuelva en el inspector móvil | 404 objetivos de 32 × 28 con 2 px de separación; «No aplica» cortado | CSS `@media (max-width:900px)` |
| Q14 *(no incluido)* | Renombrar los 6 alias Lucide y eliminar los 24 iconos sin uso | Deuda al actualizar Lucide; −4 KB | `icons.json`, `03-shell.js`, `04-global.js`, `00-i18n.js`, `catalog.json` |
| Q15 *(no incluido)* | `heading-order`: `h2` en los `.pane-h` | 28 avisos | plantillas de `05-views.js` |
| Q16 *(no incluido)* | Grupo de estados de Controles con `aria-label` correcto (hoy usa `t('severity')`) y `aria-label` en los chipsets de Normas/Ajustes | Nombre de grupo erróneo | `05-views.js` l.~198, `04-global.js` `seg()` |
| Q17 *(no incluido)* | Validación del asistente por campo (`aria-invalid`, `aria-describedby`, foco al primer error) | Error genérico fuera de contexto | `04-global.js` `vNuevo()`, `07-events.js` `wz-next` |

### 5.2 Cambios mayores (por impacto)

| # | Propuesta | Impacto esperado | Dónde / cómo |
|---|---|---|---|
| **M1** | **Deshacer/rehacer** con pila de instantáneas (`clone(state)`, máx. 20) en `commit()`; toast «Deshacer» con botón y Ctrl+Z; confirmación previa para «Importar SoA sobre el proyecto», «Restablecer» y «Hecha → implantado» | Elimina el mayor riesgo de pérdida de trabajo del consultor | `01-core.js` `commit()`, `07-events.js`, `03-shell.js` `toast()` con acción |
| **M2** | **Actualizaciones parciales en lugar de `innerHTML` de toda la vista** para las interacciones de alta frecuencia: `setState()` actualiza `aria-pressed` de los 4 botones de la fila, la clase del rayo de la rueda, los contadores de chips/KPI y el badge del dock; abrir/cerrar el inspector solo alterna `.on` en la fila. Mantener `render()` para cambios de vista | Cambiar estado: **~270 ms → < 10 ms a 4×**; inspector: ~290 ms → ~30 ms (solo `#insp`). Arreglaría también la pérdida de foco de raíz | `07-events.js` `setState()`, `05b-inspector.js`, nuevo `patchView()` por vista |
| M3 | **Rueda accesible**: `role="group"` con rayos `role="button"`, *roving tabindex*, ←/→ recorren controles, ↑/↓ cambian de dominio, Intro abre inspector; el núcleo ya «cuenta» el control al pasar (`wheelHover`) → reutilizar con `:focus` | La visualización central deja de ser solo de ratón | `05-views.js` `wheelSVG()`, `07-events.js` |
| M4 | **Interruptor como `radiogroup`** con *roving tabindex* | Controles pasa de ~430 a ~130 paradas de Tab | `03-shell.js` `stateSwitch()`, keydown |
| M5 | **Modo «Rendimiento / Reducir efectos»** en Ajustes (y automático con `prefers-reduced-transparency`, batería baja o `navigator.hardwareConcurrency <= 4`): aurora estática pre-renderizada (gradiente fijo, sin `filter: blur`), `backdrop-filter` solo en dock e inspector; pausar la aurora con `document.hidden` | +40–60 % fps de scroll y reposo real (16,7 ms) en las pruebas | `rosetta.css` `.aurora`, `.glass`; `01-core.js` `applyTheme()` |
| M6 | **Lista virtualizada / por dominio plegable** en Controles y Mapa (render bajo demanda de los dominios visibles con `content-visibility: auto` como primer paso) | `go('controles')` 259 ms → ~80 ms a 4× (estimado por nº de nodos) | CSS `section.list { content-visibility: auto; contain-intrinsic-size: … }` (casi gratis) + paginación |
| M7 | **Estados vacíos honestos** en Órbita/Brechas/Plan para proyectos sin datos, y «Limpiar filtros» en búsquedas vacías | Primer uso comprensible | `05-views.js` `vOrbita()`, `vBrechas()`, `empty()` |
| M8 | **Acciones masivas** en Controles (casilla por fila + barra «Marcar como… / Asignar responsable») y filtros «sin responsable», «sin evidencias», «revisión > 12 meses» | El caso real son 100+ controles | `05-views.js` `vControles()`, `ui` |
| M9 | **Datos de casos de ejemplo bajo demanda**: mover `casos.json` (210 KB, 24 % del HTML) a un `<script type="application/json">` que solo se parsea al abrir un caso, y *subset* de Bricolage Grotesque | −40–50 ms de *long task* a 4× al arrancar; −~100 KB | `scripts/build.mjs`, `01-core.js` |
| M10 | **Móvil**: banner demo colapsable, `lead` oculto, toast sobre la tab bar, Mapa con cabeceras de norma abreviadas y tarjetas por control en vez de tabla | +300 px de contenido útil en el primer pantallazo | CSS `@media (max-width: 900px)`, `demoBanner()` |
| M11 | Mover las ≈ 60 cadenas `tx(es,en)` de `06-io.js` al diccionario `I18N` y añadir `ref_en`/`dims_en` al catálogo ENS; test que falle si quedan claves sin traducir | i18n mantenible | `06-io.js`, `00-i18n.js`, `catalog.json`, `tests/` |
| M12 | Test de regresión de accesibilidad: integrar `axe-core` en `tests/e2e.test.mjs` (umbral 0 *critical/serious*) y el recorrido de teclado de `kbd2.mjs` | Evita volver a 1 597 nodos | `tests/` |

---

## 6. Parche de victorias rápidas (`quickwins.patch`)

Generado con `diff -ruN` y comprobado contra `d3ecdfe` + cambios locales del árbol de trabajo a las 16:5x UTC (`git apply --check` OK). Aplicar con `git apply quickwins.patch` desde la raíz del repo y `npm run build`.

Verificación sobre una copia (`work2/`, `chk/`): build OK · `npm test` **71/71** · `tests/e2e.test.mjs` **16/16** · axe **1 597 → 35** nodos · recorridos de teclado de §1.2 OK · sin cambio medible de rendimiento (dentro del ruido, `perf-work.json`). Capturas tras el parche: `shots/after-*.png`.

Nota de compatibilidad: el `id="uc-<ID>"` pasa del `<div class="li">` al `<button class="li-open">` del título (los tests e2e que hacen `click('#uc-…')` siguen funcionando); quien seleccione `#uc-X .stsw` debe usar `.li[data-id="X"] .stsw`.

```diff
diff --git a/src/app/01-core.js b/src/app/01-core.js
--- a/src/app/01-core.js
+++ b/src/app/01-core.js
@@ -157,6 +157,6 @@
   r.setAttribute('data-accent', ws.settings.acento);
   r.setAttribute('data-density', ws.settings.densidad);
   r.setAttribute('lang', LANG());
-  try { document.querySelector('.skip').textContent = t('skip'); } catch (e) { /* n/a */ }
+  try { document.querySelector('.skip').textContent = t('skip'); $('#tabbar').setAttribute('aria-label', t('sections')); $('#insp').setAttribute('aria-label', t('inspect')); } catch (e) { /* n/a */ }
 }
 
diff --git a/src/app/03-shell.js b/src/app/03-shell.js
--- a/src/app/03-shell.js
+++ b/src/app/03-shell.js
@@ -47,8 +47,23 @@
   render(); window.scrollTo({ top: 0 });
   const v = $('#view'); if (v) v.focus({ preventScroll: true });
 }
+/* Clave estable del elemento con foco (para recuperarlo tras redibujar con innerHTML aunque no tenga id) */
+const FOCUS_ATTRS = ['act', 'id', 'v', 'fw', 'key', 'dir', 'view', 'pop', 'tab', 'case', 'k'];
+function focusKey(el) {
+  if (!el || !el.dataset || !el.dataset.act) return null;
+  return FOCUS_ATTRS.filter((a) => el.dataset[a] !== undefined).map((a) => `[data-${a}="${CSS.escape(el.dataset[a])}"]`).join('');
+}
+function restoreFocus(key, scope) {
+  if (!key) return;
+  const host = (scope && scope.isConnected ? scope : null) || document;
+  const ok = (x) => x.tabIndex >= 0 && !x.disabled && x.getClientRects().length > 0;
+  const el = [...host.querySelectorAll(key)].find(ok) || [...document.querySelectorAll(key)].find(ok);
+  if (el) el.focus({ preventScroll: true });
+}
 function render() {
   const ae = document.activeElement; const active = ae && ae.id;
+  const fKey = !active && ae !== document.body ? focusKey(ae) : null;
+  const fScope = ae && ae.closest ? (ae.closest('#insp') ? 'insp' : ae.closest('#dock') ? 'dock' : ae.closest('#tabbar') ? 'tabbar' : null) : null;
   let sel = null; try { if (ae && typeof ae.selectionStart === 'number') sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { sel = null; }
   applyRail(); $('#dock').innerHTML = renderDock();
   $('#tabbar').innerHTML = renderTabbar();
@@ -57,6 +72,7 @@
   renderInsp(); renderPop(); renderSheet(); renderPalette();
   if (ui.view === 'traductor') requestAnimationFrame(drawBeams);
   if (active) { const el = document.getElementById(active); if (el) { el.focus({ preventScroll: true }); if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* n/a */ } } } }
+  else if (fKey && !(fScope === 'insp' && $('#insp').hidden) && (!document.activeElement || document.activeElement === document.body)) restoreFocus(fKey, fScope ? $('#' + fScope) : null);
 }
 function navBadge(v) {
   if (!state) return '';
@@ -168,24 +184,26 @@
 }
 function renderPalette() {
   const host = $('#palette');
-  if (!ui.palette) { host.hidden = true; host.innerHTML = ''; return; }
+  if (!ui.palette) { const had = !host.hidden; host.hidden = true; host.innerHTML = ''; if (had && (!document.activeElement || document.activeElement === document.body)) { const r = ui._palReturn; if (typeof r === 'string') restoreFocus(r); else if (r && r.isConnected) r.focus({ preventScroll: true }); } return; }
   const items = paletteItems(); ui._pItems = items;
   if (ui.paletteIdx >= items.length) ui.paletteIdx = Math.max(0, items.length - 1);
   let last = ''; let html = '';
   items.forEach((it, i) => {
     if (it.grupo !== last) { html += `<div class="pal-g">${esc(it.grupo)}</div>`; last = it.grupo; }
-    html += `<button type="button" class="pal-i${i === ui.paletteIdx ? ' on' : ''}" data-act="pal-run" data-i="${i}" id="pal-${i}">${icon(it.ic, 16)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`;
+    html += `<button type="button" class="pal-i${i === ui.paletteIdx ? ' on' : ''}" data-act="pal-run" data-i="${i}" id="pal-${i}" role="option" aria-selected="${i === ui.paletteIdx}" tabindex="-1">${icon(it.ic, 16)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`;
   });
   const wasOpen = !host.hidden; host.hidden = false;
-  if (!wasOpen || !$('#pal-q')) host.innerHTML = `<div class="overlay" data-act="pal-close"></div><div class="palette" role="dialog" aria-label="${esc(t('search'))}"><div class="pal-in">${icon('search', 18)}<input id="pal-q" type="text" placeholder="${esc(t('searchPh'))}" value="${esc(ui.paletteQ)}" autocomplete="off"><kbd>Esc</kbd></div><div class="pal-list" id="pal-list"></div></div>`;
+  if (!wasOpen || !$('#pal-q')) host.innerHTML = `<div class="overlay" data-act="pal-close"></div><div class="palette" role="dialog" aria-modal="true" aria-label="${esc(t('search'))}"><div class="pal-in">${icon('search', 18)}<input id="pal-q" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="${esc(t('search'))}" placeholder="${esc(t('searchPh'))}" value="${esc(ui.paletteQ)}" autocomplete="off"><kbd>Esc</kbd></div><div class="pal-list" id="pal-list" role="listbox" aria-label="${esc(t('search'))}"></div></div>`;
   $('#pal-list').innerHTML = html || `<div class="pal-e">${esc(t('noResults'))}</div>`;
   const on = $('#pal-' + ui.paletteIdx); if (on) on.scrollIntoView({ block: 'nearest' });
-  if (!wasOpen) $('#pal-q').focus();
+  if (on) $('#pal-q').setAttribute('aria-activedescendant', on.id); else $('#pal-q').removeAttribute('aria-activedescendant');
+  if (!wasOpen) { ui._palReturn = document.activeElement !== document.body ? focusKey(document.activeElement) || document.activeElement : null; $('#pal-q').focus(); }
 }
 function openInsp(type, id, fw) {
   if (type === 'uc' && !IX.ucMap[id]) return;
   if (type === 'req' && !(FW.includes(fw) && IX.req[fw][id])) return;
   if (!state) return;
+  if (!ui.insp) { const ae = document.activeElement; ui._inspReturn = ae && !ae.closest('#insp') ? focusKey(ae) : null; }
   ui.insp = { type, id, fw }; render();
   const x = $('#insp'); if (x) { x.scrollTop = 0; const h = x.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
 }
@@ -193,5 +211,10 @@
 
 /* ---------- Avisos ---------- */
 let toastT = null;
-function toast(msg) { const x = $('#toast'); x.innerHTML = `${icon('circle-check', 16)}<span>${esc(msg)}</span>`; x.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { x.hidden = true; }, 2800); }
+function toast(msg, kind = 'ok') {
+  const x = $('#toast'); const err = kind === 'error';
+  x.setAttribute('role', err ? 'alert' : 'status'); x.classList.toggle('err', err);
+  x.innerHTML = `${icon(err ? 'triangle-alert' : 'circle-check', 16)}<span>${esc(msg)}</span>`; x.hidden = false;
+  clearTimeout(toastT); toastT = setTimeout(() => { x.hidden = true; }, err ? 7000 : Math.max(2800, 1500 + msg.length * 45));
+}
 
diff --git a/src/app/04-global.js b/src/app/04-global.js
--- a/src/app/04-global.js
+++ b/src/app/04-global.js
@@ -128,7 +128,7 @@
 function vAjustes() {
   const st = ws.settings;
   const seg = (key, opts) => `<div class="chipset" role="group">${opts.map(([v, l, ic]) => `<button type="button" data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${st[key] === v}">${ic ? icon(ic, 15) : ''}${esc(l)}</button>`).join('')}</div>`;
-  const sw = (key, id) => `<label class="switch"><input type="checkbox" id="${id}" data-ws="settings.${key}" data-type="bool"${st[key] ? ' checked' : ''}><span></span></label>`;
+  const sw = (key, id, label) => `<label class="switch"><input type="checkbox" id="${id}" data-ws="settings.${key}" data-type="bool" aria-label="${esc(label)}"${st[key] ? ' checked' : ''}><span></span></label>`;
   const conf = ui.confirm === 'wipe';
   return `${head(esc(t('prefs')), esc(t('settingsTitle')), esc(t('settingsLead')))}
   <div class="stack" style="max-width:940px;gap:var(--gap)">
@@ -137,13 +137,13 @@
       ${setRow(esc(t('theme')), esc(t('themeHint')), seg('tema', [['sistema', t('system'), 'monitor'], ['claro', t('light'), 'sun'], ['oscuro', t('dark'), 'moon']]))}
       ${setRow(esc(t('accent')), '', `<div class="swatches" style="padding:0">${ACCENTS.map((a) => `<button type="button" class="swatch sw-${a}${st.acento === a ? ' on' : ''}" data-act="accent" data-v="${a}" aria-label="${esc(t('accents.' + a))}" data-tip="${esc(t('accents.' + a))}"></button>`).join('')}</div>`)}
       ${setRow(esc(t('density')), esc(t('densityHint')), seg('densidad', [['comoda', t('cozy')], ['compacta', t('compact')]]))}
-      ${setRow(esc(t('railPref')), esc(t('railPrefHint')), sw('railMin', 'st-rail'))}</section>
-    <section class="glass pane"><h3>${esc(t('mapPrefs'))}</h3>${setRow(esc(t('showRel')), esc(t('showRelHint')), sw('mostrarRelaciones', 'st-rel'))}</section>
+      ${setRow(esc(t('railPref')), esc(t('railPrefHint')), sw('railMin', 'st-rail', t('railPref')))}</section>
+    <section class="glass pane"><h3>${esc(t('mapPrefs'))}</h3>${setRow(esc(t('showRel')), esc(t('showRelHint')), sw('mostrarRelaciones', 'st-rel', t('showRel')))}</section>
     <section class="glass pane"><h3>${esc(t('rulesTitle'))}</h3>
       <details data-keep="rulesOpen"${ui.rulesOpen ? ' open' : ''} style="margin-top:10px"><summary class="small">${esc(t('activeRules'))} · ${E.REGLAS.length - st.reglasOff.length}/${E.REGLAS.length}</summary>
         ${E.REGLAS.map(([id, sv, d]) => `<label class="rule"><span class="switch"><input type="checkbox" data-rule="${id}"${st.reglasOff.includes(id) ? '' : ' checked'}><span></span></span><code>${id}</code>${sevPill(sv)}<span>${esc(LANG() === 'en' ? E.REGLAS_EN[id] : d)}</span></label>`).join('')}</details></section>
     <section class="glass pane"><h3>${esc(t('casesPref'))}</h3>
-      ${setRow(esc(t('showCases')), esc(t('showCasesHint')), sw('mostrarCasos', 'st-mc'))}
+      ${setRow(esc(t('showCases')), esc(t('showCasesHint')), sw('mostrarCasos', 'st-mc', t('showCases')))}
       ${setRow(esc(t('closeCases')), esc(t('closeCasesHint')), `<button type="button" class="btn sm" data-act="close-demos">${icon('x', 15)}${esc(t('closeN', ws.projects.filter((p) => p.kind === 'demo').length))}</button>`)}</section>
     <section class="glass pane"><h3>${esc(t('dataPriv'))}</h3><p class="small muted" style="margin:6px 0">${esc(t('dataPrivTxt'))}</p>${location.protocol === 'file:' ? `<div class="alert">${icon('triangle-alert', 16)}${esc(t('fileWarn'))}</div>` : ''}
       ${setRow(esc(t('backup')), esc(t('backupHint')), `<div class="row"><button type="button" class="btn sm" data-act="backup">${icon('download', 15)}${esc(t('download'))}</button><button type="button" class="btn sm" data-act="restore">${icon('upload', 15)}${esc(t('restore'))}</button></div>`)}
diff --git a/src/app/05-views.js b/src/app/05-views.js
--- a/src/app/05-views.js
+++ b/src/app/05-views.js
@@ -107,14 +107,15 @@
 /* Solapamiento: si cumples la fila al 100 %, qué parte de la columna heredas */
 function overlapGrid(st) {
   const inS = (f) => !st || st.alcance[f].on;
-  let h = `<div class="overlap" role="table" aria-label="${esc(t('overlapTitle'))}"><div class="h" role="columnheader"><span class="tiny muted">${esc(t('overlapRow'))} ↓</span></div>${FW.map((f) => `<div class="h" role="columnheader">${fwTag(f, !inS(f), true)}</div>`).join('')}`;
+  let h = `<div class="overlap" role="table" aria-label="${esc(t('overlapTitle'))}"><div role="row"><div class="h" role="columnheader"><span class="tiny muted">${esc(t('overlapRow'))} ↓</span></div>${FW.map((f) => `<div class="h" role="columnheader">${fwTag(f, !inS(f), true)}</div>`).join('')}</div>`;
   for (const a of FW) {
-    h += `<div class="rh" role="rowheader">${fwTag(a, !inS(a), true)}</div>`;
+    h += `<div role="row"><div class="rh" role="rowheader">${fwTag(a, !inS(a), true)}</div>`;
     for (const b of FW) {
       const x = SOLAPE[a][b]; const v = x.pct;
       if (a === b) { h += '<div class="c self" role="cell">—</div>'; continue; }
       h += `<div class="c${v > 0.62 ? ' hi' : ''}${!inS(a) || !inS(b) ? ' fuera' : ''}" role="cell" style="--v:${v.toFixed(3)}" data-tip="${esc(t('overlapTip', E.FW_LABEL[a], E.FW_LABEL[b], pct(v), x.completos, x.total))}">${Math.round(v * 100)}%</div>`;
     }
+    h += '</div>';
   }
   return h + '</div>';
 }
@@ -207,15 +208,15 @@
   }
   const picker = `<section class="glass prism-pick">
     <div class="chipset" role="group" aria-label="${esc(t('source'))}">${FW.map((g) => `<button type="button" data-act="tr-fw" data-fw="${g}" aria-pressed="${g === f}"><span class="dotfw fw-${g}"></span>${FW_SHORT[g]}</button>`).join('')}</div>
-    <div class="search">${icon('search', 16)}<input type="search" id="tr-q" value="${esc(ui.trQ)}" placeholder="${esc(t('pickPh'))}" aria-label="${esc(t('pickPh'))}" autocomplete="off" role="combobox" aria-expanded="${ui.trOpen}" aria-controls="tr-res"></div>${res}</section>`;
+    <div class="search">${icon('search', 16)}<input type="search" id="tr-q" value="${esc(ui.trQ)}" placeholder="${esc(t('pickPh'))}" aria-label="${esc(t('pickPh'))}" autocomplete="off" role="combobox" aria-expanded="${ui.trOpen}" aria-controls="tr-res"${ui.trOpen ? ` aria-activedescendant="tri-${ui.trIdx}"` : ''}></div>${res}</section>`;
   const ensInfo = f === 'ens' ? `<dl class="kv small"><dt>${esc(t('dims'))}</dt><dd>${esc(r.dims)}</dd><dt>${esc(t('exig'))}</dt><dd class="mono">B ${esc(r.bajo)} · M ${esc(r.medio)} · A ${esc(r.alto)}</dd>${state.alcance.ens.on ? `<dt>${esc(t('inYourSys'))}</dt><dd>${esc(t('level'))} ${esc(t('lv.' + cov.nivel))} · <code>${esc(exigL(cov.exigencia))}</code></dd>` : ''}<dt>${esc(t('classIso'))}</dt><dd>${esc(r.ref || '—')}</dd></dl>` : '';
   const src = `<div class="src-col"><div class="col-lbl">${esc(t('source'))}</div><div class="src fw-${f}">
     <div class="row">${fwTag(f, !onFw(f))}<code>${esc(reqCode(f, id))}</code></div><h2>${esc(rT(f, id))}</h2><p class="small muted">${esc(rG(f, id))}</p>
     <div class="row" style="margin-top:12px">${onFw(f) ? covPill(cov.estado) + (cov.estado !== 'no-exigido' && cov.estado !== 'excluido' ? `<span class="small muted num">${esc(t('support', pct(cov.score)))}</span>` : '') : `<span class="pill neutral">${esc(t('outOfScope'))}</span>`}</div>
     ${ensInfo ? `<div style="margin-top:14px">${ensInfo}</div>` : ''}
     <div class="row" style="margin-top:14px"><button type="button" class="btn sm" data-act="insp-req" data-fw="${f}" data-id="${esc(id)}">${icon('panel-right', 15)}${esc(t('inspect'))}</button></div></div></div>`;
-  const nodes = `<div class="nodes-col"><div class="col-lbl">${esc(t('controlsCol'))} · ${ctl.length}</div>${ctl.map((l) => { const fz = fuerzaDe(l.w); const e = E.estadoUc(state, l.uc); return `<div class="node" role="button" tabindex="0" data-act="insp-uc" data-id="${esc(l.uc)}" data-uc="${esc(l.uc)}" data-w="${l.w}">
-      <span class="uc">${esc(l.uc)}</span><b>${esc(cT(l.uc))}</b><div class="row"><span class="weight ${fz}">${esc(t('fuerzaCorta.' + fz))}</span>${l.w > 0 ? stateSwitch(l.uc, e) : ''}</div></div>`; }).join('')}</div>`;
+  const nodes = `<div class="nodes-col"><div class="col-lbl">${esc(t('controlsCol'))} · ${ctl.length}</div>${ctl.map((l) => { const fz = fuerzaDe(l.w); const e = E.estadoUc(state, l.uc); return `<div class="node" data-act="insp-uc" data-id="${esc(l.uc)}" data-uc="${esc(l.uc)}" data-w="${l.w}">
+      <span class="uc">${esc(l.uc)}</span><button type="button" class="li-open" data-act="insp-uc" data-id="${esc(l.uc)}">${esc(cT(l.uc))}</button><div class="row"><span class="weight ${fz}">${esc(t('fuerzaCorta.' + fz))}</span>${l.w > 0 ? stateSwitch(l.uc, e) : ''}</div></div>`; }).join('')}</div>`;
   const lane = (g) => {
     const rows = eq.otras[g].filter((x) => x.fuerza !== 'relacionado' || showRel);
     const noEq = g === 'iso42001' || f === 'iso42001' ? t('noEqAi') : t('noEq');
@@ -264,8 +265,8 @@
     const cs = list.filter((c) => c.dom === d.id); if (!cs.length) continue;
     html += `<section class="glass list"><div class="sec-h">${icon(d.ic, 17)}${esc(dT(d.id))}<small>${esc(t('nControls', cs.length))}</small></div>${cs.map((c) => {
       const cc = calc.controles[c.id]; const dd = state.controles[c.id];
-      return `<div class="li${cc.relevante ? '' : ' dim'}${ui.insp && ui.insp.type === 'uc' && ui.insp.id === c.id ? ' on' : ''}" id="uc-${esc(c.id)}" role="button" tabindex="0" data-act="insp-uc" data-id="${esc(c.id)}">
-        <span class="id">${esc(c.id)}</span><div class="tt"><b>${esc(cT(c.id))}</b><small>${dd.origen === 'ens' ? `<span class="origin">${esc(t('inheritedEns'))}</span> · ` : ''}${esc(dd.responsable || t('noOwner'))}</small></div>
+      return `<div class="li${cc.relevante ? '' : ' dim'}${ui.insp && ui.insp.type === 'uc' && ui.insp.id === c.id ? ' on' : ''}" data-act="insp-uc" data-id="${esc(c.id)}">
+        <span class="id">${esc(c.id)}</span><div class="tt"><button type="button" class="li-open" id="uc-${esc(c.id)}" data-act="insp-uc" data-id="${esc(c.id)}">${esc(cT(c.id))}</button><small>${dd.origen === 'ens' ? `<span class="origin">${esc(t('inheritedEns'))}</span> · ` : ''}${esc(dd.responsable || t('noOwner'))}</small></div>
         <div class="fwdots">${FW.map((f) => { const n = c.maps[f].filter((m) => m.w > 0).length; return n ? `<span class="fwn fw-${f}${onFw(f) ? '' : ' off'}" data-tip="${esc(`${E.FW_LABEL[f]}: ${t('reqs', n)}`)}">${n}</span>` : ''; }).join('')}</div>
         ${stateSwitch(c.id, cc.estado)}</div>`;
     }).join('')}</section>`;
@@ -363,8 +364,8 @@
   const showRel = ws.settings.mostrarRelaciones;
   const counts = CAT.domains.map((d) => ({ d, n: FW.map((f) => reqsOfDom(d.id, f).size), ctl: CAT.controls.filter((c) => c.dom === d.id).length }));
   const max = Math.max(...counts.flatMap((x) => x.n));
-  const grid = `<div style="overflow-x:auto"><div class="dgrid" role="table" aria-label="${esc(t('byDomain'))}"><div class="h"></div>${FW.map((f) => `<div class="h">${fwTag(f, !onFw(f), true)}</div>`).join('')}<div class="h tot tiny muted">${esc(t('controlsN'))}</div>
-    ${counts.map(({ d, n, ctl }) => `<div class="rh">${icon(d.ic, 15)}<span>${esc(dT(d.id))}</span></div>${n.map((v, i) => `<div class="c fw-${FW[i]}${v ? '' : ' zero'}${v / max > 0.6 ? ' hi' : ''}" style="--v:${(v / max).toFixed(3)}" data-tip="${esc(`${dT(d.id)} · ${E.FW_LABEL[FW[i]]}: ${t('reqs', v)}`)}">${v || '·'}</div>`).join('')}<div class="tot">${ctl}</div>`).join('')}</div></div>`;
+  const grid = `<div style="overflow-x:auto" tabindex="0" role="region" aria-label="${esc(t('byDomain'))}"><div class="dgrid" role="table" aria-label="${esc(t('byDomain'))}"><div role="row"><div class="h" role="cell"></div>${FW.map((f) => `<div class="h" role="columnheader">${fwTag(f, !onFw(f), true)}</div>`).join('')}<div class="h tot tiny muted" role="columnheader">${esc(t('controlsN'))}</div></div>
+    ${counts.map(({ d, n, ctl }) => `<div role="row"><div class="rh" role="rowheader">${icon(d.ic, 15)}<span>${esc(dT(d.id))}</span></div>${n.map((v, i) => `<div class="c fw-${FW[i]}${v ? '' : ' zero'}${v / max > 0.6 ? ' hi' : ''}" role="cell" style="--v:${(v / max).toFixed(3)}" data-tip="${esc(`${dT(d.id)} · ${E.FW_LABEL[FW[i]]}: ${t('reqs', v)}`)}">${v || '·'}</div>`).join('')}<div class="tot" role="cell">${ctl}</div></div>`).join('')}</div></div>`;
   const q = normTxt(ui.mapaQ.trim());
   let rows = ''; let lastDom = '';
   for (const c of CAT.controls) {
diff --git a/src/app/06-io.js b/src/app/06-io.js
--- a/src/app/06-io.js
+++ b/src/app/06-io.js
@@ -7,7 +7,7 @@
   } catch (e) {
     if (e && e.code === 'declined') { toast(t('tDeclined')); return; }
     if (e && e.code === 'rate_limited') { toast(t('tPending')); return; }
-    if (e && e.code && !['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e.code)) { toast(t('tCantSave', e.message || e.code)); return; }
+    if (e && e.code && !['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e.code)) { toast(t('tCantSave', e.message || e.code), 'error'); return; }
   }
   const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' });
   const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
@@ -156,7 +156,7 @@
       ...plan.map((a) => [a.rank || '', t('prio.' + a.prioridad), a.id, cT(a.id), estL(a.estadoControl), a.normas.map((f) => E.FW_LABEL[f]).join(', '), Math.round(a.ganancia * 10) / 10, a.responsable, a.fecha, a.verificada ? t('verified') : t('lanes.' + a.estado)])], [8, 10, 9, 44, 14, 30, 14, 24, 12, 12], 0, { fillCol: [1, 4] }), tx('Plan de acción', 'Action plan'));
     const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
     await saveFile(fname('map', 'xlsx'), new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
-  } catch (e) { toast(e.message || t('tXlsxFail')); }
+  } catch (e) { toast(e.message || t('tXlsxFail'), 'error'); }
 }
 
 /* --- Importar la SoA del ENS (Excel de la plantilla o proyecto de ENS Compliance Studio) --- */
@@ -238,7 +238,7 @@
     const h = aplicaImportEns(st, data);
     createProject(st, { msg: t('tImported', n, h) });
     setTimeout(() => toast(t('tIsoFromEns', pct(calc.fw.iso27001.grado))), 3000);
-  } catch (e) { toast(e.message || t('tReadFail')); }
+  } catch (e) { toast(e.message || t('tReadFail'), 'error'); }
 }
 
 /* --- Proyectos y copias --- */
@@ -248,7 +248,7 @@
     if (isObj(o) && o.kind === 'rosetta-backup') { restoreBackup(o); return; }
     if (isObj(o) && isObj(o.controles) && isObj(o.alcance)) { createProject(o, { msg: t('tSaved') }); return; }
     throw new Error('formato');
-  } catch (e) { toast(t('tNotProject')); }
+  } catch (e) { toast(t('tNotProject'), 'error'); }
 }
 function backup() {
   const projects = ws.projects.map((p) => ({ meta: p, state: store.get(PKEY(p.id)) }));
diff --git a/src/app/07-events.js b/src/app/07-events.js
--- a/src/app/07-events.js
+++ b/src/app/07-events.js
@@ -1,4 +1,5 @@
 /* ---------- Eventos ---------- */
+const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
 function setPath(obj, path, value, schema = 'state') {
   const ks = String(path).split('.');
   if (ks.some((k) => BAD_KEYS.has(k))) return false; // defensa ante prototype pollution
@@ -28,7 +29,7 @@
   inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) cb(f); };
   inp.click();
 }
-const readText = (f, cb) => { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.onerror = () => toast(t('tReadFail')); r.readAsText(f); };
+const readText = (f, cb) => { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.onerror = () => toast(t('tReadFail'), 'error'); r.readAsText(f); };
 function syncNis2(obj) { obj.alcance.nis2.tipo = E.nis2Aplicabilidad(obj.nis2q).tipo; }
 function setState(id, v) {
   if (!state || !UC_IDS.has(id) || !E.ESTADOS.includes(v)) return;
@@ -95,10 +96,10 @@
 function closeLayers() {
   if (ui.railOpen) { ui.railOpen = false; applyRail(); $('#dock').innerHTML = renderDock(); return true; }
   if (ui.palette) { ui.palette = false; renderPalette(); return true; }
-  if (ui.pop) { ui.pop = null; renderPop(); return true; }
+  if (ui.pop) { const was = ui.pop; ui.pop = null; renderPop(); const tr = document.querySelector(`#dock [data-pop="${was}"]`); if (tr) tr.focus({ preventScroll: true }); return true; }
   if (ui.sheet) { ui.sheet = false; renderSheet(); render(); return true; }
   if (ui.trOpen) { ui.trOpen = false; render(); return true; }
-  if (ui.insp) { const back = ui.insp; ui.insp = null; renderInsp(); render(); const el = back.type === 'uc' ? document.getElementById('uc-' + back.id) : null; if (el) el.focus({ preventScroll: true }); return true; }
+  if (ui.insp) { closeLayersInsp(); return true; }
   if (ui.confirm) { ui.confirm = null; render(); return true; }
   return false;
 }
@@ -108,6 +109,7 @@
   if (ui.palette) {
     const items = ui._pItems || [];
     if (ev.key === 'Escape') { ui.palette = false; renderPalette(); return; }
+    if (ev.key === 'Tab') { ev.preventDefault(); $('#pal-q').focus(); return; } // diálogo modal: el foco no sale de la paleta
     if (ev.key === 'ArrowDown') { ev.preventDefault(); ui.paletteIdx = Math.min(items.length - 1, ui.paletteIdx + 1); renderPalette(); return; }
     if (ev.key === 'ArrowUp') { ev.preventDefault(); ui.paletteIdx = Math.max(0, ui.paletteIdx - 1); renderPalette(); return; }
     if (ev.key === 'Enter') { ev.preventDefault(); const it = items[ui.paletteIdx]; ui.palette = false; renderPalette(); if (it) it.act(); return; }
@@ -121,6 +123,10 @@
     if (ev.key === 'Escape') { ev.preventDefault(); ui.trOpen = false; tg.blur(); render(); return; }
     return;
   }
+  if (ui.pop && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && tg.closest && tg.closest('.pop')) {
+    ev.preventDefault(); const its = [...document.querySelectorAll('.pop button')]; const i = its.indexOf(tg);
+    const nx = its[(i + (ev.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length]; if (nx) nx.focus(); return;
+  }
   if (ev.key === 'Escape') { if (closeLayers()) ev.preventDefault(); return; }
   if ((ev.key === 'Enter' || ev.key === ' ') && tg.getAttribute && tg.getAttribute('role') === 'button' && tg.dataset.act && tg.tagName !== 'BUTTON') { ev.preventDefault(); tg.click(); return; }
   if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
@@ -166,7 +172,9 @@
   const act = el.dataset.act; const i = el.dataset.i !== undefined ? +el.dataset.i : null;
   switch (act) {
     case 'nav': if (el.dataset.view === 'nuevo' && ui.view !== 'nuevo') ui.wizard = null; go(el.dataset.view); break;
-    case 'pop': ui.pop = ui.pop === el.dataset.pop ? null : el.dataset.pop; $('#dock').innerHTML = renderDock(); renderPop(); break;
+    case 'pop': { const k = el.dataset.pop; ui.pop = ui.pop === k ? null : k; $('#dock').innerHTML = renderDock(); renderPop();
+      const first = ui.pop && document.querySelector('.pop .pop-i, .pop button'); const tr = document.querySelector(`#dock [data-pop="${k}"]`);
+      if (first) first.focus({ preventScroll: true }); else if (tr) tr.focus({ preventScroll: true }); break; }
     case 'sheet': ui.sheet = !ui.sheet; render(); break;
     case 'sheet-close': ui.sheet = false; render(); break;
     case 'lang': setLang(el.dataset.v); ui.pop = null; renderPop(); break;
@@ -183,7 +191,7 @@
     case 'pal-close': ui.palette = false; renderPalette(); break;
     case 'pal-run': { const it = (ui._pItems || [])[i]; ui.palette = false; renderPalette(); if (it) it.act(); break; }
     case 'help-tab': ui.helpTab = el.dataset.tab; render(); break;
-    case 'scroll-casos': ev.preventDefault(); { const c = $('#casos'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); else { ws.settings.mostrarCasos = true; saveWs(); render(); const c2 = $('#casos'); if (c2) c2.scrollIntoView({ block: 'start' }); } } break;
+    case 'scroll-casos': ev.preventDefault(); { const c = $('#casos'); if (c) c.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); else { ws.settings.mostrarCasos = true; saveWs(); render(); const c2 = $('#casos'); if (c2) c2.scrollIntoView({ block: 'start' }); } } break;
     /* proyectos */
     case 'open-project': ui.pop = null; openProject(el.dataset.id); break;
     case 'open-case': ui.pop = null; openCase(el.dataset.case); break;
@@ -223,7 +231,7 @@
     case 'goto-brechas': ui.brechaSev = ['Alta', 'Media', 'Baja'].includes(el.dataset.v) ? el.dataset.v : 'todas'; go('brechas'); break;
     case 'tr-fw': if (FW.includes(el.dataset.fw) && el.dataset.fw !== ui.trFw) { ui.trFw = el.dataset.fw; ui.trId = null; ui.trQ = ''; ui.trIdx = 0; render(); } break;
     case 'tr-pick': ui.trId = el.dataset.id; ui.trOpen = false; ui.trQ = ''; render(); break;
-    case 'tr-center': { const f = el.dataset.fw, id = el.dataset.id; if (!FW.includes(f) || !IX.req[f][id]) break; ui.trFw = f; ui.trId = id; ui.trQ = ''; ui.trOpen = false; ui.insp = null; if (ui.view !== 'traductor') go('traductor'); else { render(); const st = $('.stage'); if (st && st.getBoundingClientRect().top < 60) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); } break; }
+    case 'tr-center': { const f = el.dataset.fw, id = el.dataset.id; if (!FW.includes(f) || !IX.req[f][id]) break; ui.trFw = f; ui.trId = id; ui.trQ = ''; ui.trOpen = false; ui.insp = null; if (ui.view !== 'traductor') go('traductor'); else { render(); const st = $('.stage'); if (st && st.getBoundingClientRect().top < 60) st.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); } break; }
     case 'uc-fw': ui.ucFw = ['todos', ...FW].includes(el.dataset.v) ? el.dataset.v : 'todos'; render(); break;
     case 'uc-estado': ui.ucEstado = ['todos', ...E.ESTADOS].includes(el.dataset.v) ? el.dataset.v : 'todos'; render(); break;
     case 'norma-fw': if (FW.includes(el.dataset.fw)) { ui.normaFw = el.dataset.fw; render(); } break;
@@ -241,7 +249,11 @@
     default: break;
   }
 });
-function closeLayersInsp() { const back = ui.insp; ui.insp = null; render(); if (back && back.type === 'uc') { const el = document.getElementById('uc-' + back.id); if (el) el.focus({ preventScroll: true }); } }
+function closeLayersInsp() {
+  const back = ui.insp; ui.insp = null; render();
+  if (ui._inspReturn) { restoreFocus(ui._inspReturn); ui._inspReturn = null; } // vuelve al elemento que abrió el inspector
+  if ((!document.activeElement || document.activeElement === document.body) && back && back.type === 'uc') { const el = document.getElementById('uc-' + back.id); if (el) el.focus({ preventScroll: true }); }
+}
 
 /* Redibujar los haces del Prisma y recolocar menús al cambiar el tamaño */
 let rzT = null;
diff --git a/src/styles/rosetta.css b/src/styles/rosetta.css
--- a/src/styles/rosetta.css
+++ b/src/styles/rosetta.css
@@ -824,3 +824,38 @@
 }
 @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
 
+
+/* ============ Accesibilidad: contraste AA, movimiento, transparencia y objetivos táctiles ============
+   Capa de ajustes al final para no tocar los tokens base. --accent-text / --accent-fill derivan del acento
+   activo (sirven para los 7 acentos) y oscurecen el rosa solo donde hace de texto o de fondo de texto blanco. */
+:root { --accent-text: color-mix(in oklch, var(--accent) 78%, black); --accent-fill: color-mix(in oklch, var(--accent) 86%, black);
+  --ok: oklch(0.49 0.13 155); --warn: oklch(0.5 0.12 65); --crit: oklch(0.5 0.2 25); --muted: oklch(0.47 0.03 275); }
+@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --accent-text: color-mix(in oklch, var(--accent) 72%, white); --accent-fill: var(--accent); --ok: oklch(0.8 0.15 155); --warn: oklch(0.85 0.14 80); --crit: oklch(0.74 0.17 25); --muted: oklch(0.74 0.03 275); } }
+:root[data-theme="dark"] { --accent-text: color-mix(in oklch, var(--accent) 72%, white); --accent-fill: var(--accent); --ok: oklch(0.8 0.15 155); --warn: oklch(0.85 0.14 80); --crit: oklch(0.74 0.17 25); --muted: oklch(0.74 0.03 275); }
+.eyebrow, .btn.ghost, .uc, .start em, .weight.total, .pill.accent, .lang button[aria-pressed="true"], .tabbar button[aria-current="page"] { color: var(--accent-text); }
+.btn.primary { background: var(--accent-fill); } .btn.primary:hover { background: var(--accent-text); }
+.origin { color: color-mix(in oklch, var(--fw-ens) 72%, var(--ink)); }
+.li.dim { opacity: 1; } .li.dim :is(.id, .tt b, .tt small, .pill) { color: var(--muted); } .fwt.off { opacity: .7; } .overlap .c.fuera { opacity: .78; }
+.lens.off, .lens-tab.off { opacity: 1; } .lens.off :is(b, small, .pc), .lens-tab.off :is(b, small) { color: var(--muted); } .eq small { color: var(--muted); }
+.dgrid .c.hi { color: oklch(0.17 0.03 272); }
+.rq.st-excluido, .rq.st-no-exigido { opacity: .7; } .finding .ref { color: var(--muted); }
+.overlap .c.hi { color: var(--ink); background: color-mix(in oklch, var(--accent) calc(var(--v) * 48%), transparent); }
+.li-open { all: unset; box-sizing: border-box; display: block; max-width: 100%; font-weight: 550; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; border-radius: 6px; }
+.node .li-open { white-space: normal; font-size: .88rem; line-height: 1.3; }
+.li-open:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
+.overlap > [role="row"], .dgrid > [role="row"] { display: contents; }
+.overlap [role="row"] > *, .dgrid [role="row"] > * { min-width: 0; }
+.toast.err { background: var(--crit); color: #fff; } .toast.err .ic { color: #fff; }
+@media (max-width: 900px) {
+  .stsw button { width: 40px; height: 36px; }                 /* 44 px de pitch con el padding: dedo, no puntero */
+  .insp .stsw.lg { flex-wrap: wrap; border-radius: 20px; }     /* «No aplica» quedaba fuera de la hoja en 390 px */
+  .uc, .rq { min-height: 32px; }
+}
+@media (prefers-reduced-motion: reduce) {
+  html { scroll-behavior: auto; }
+  .aurora i { will-change: auto; }
+}
+@media (prefers-reduced-transparency: reduce) {
+  .glass, .pop, .palette, .insp, .sheet, .pick-res, .lens-tab, .finding, .lanek, .start { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--bg); }
+  .aurora { display: none; }
+}
```
