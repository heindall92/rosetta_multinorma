# 02 · Tokens, color, tipografía y gráficos

Los valores exactos están en `plantillas/tokens.css` (cópialo como punto de partida). Aquí, las reglas.

## Superficies y tinta

- **Oscuro** (por defecto en herramientas de seguridad): fondo `#08090b`, superficies `#111317 / #171a1f / #1e2228`, bordes `rgb(255 255 255 / .07 y .12)`. Tinta `#eef1f3`, `ink-2 #a3aab2`, `ink-3 #8f97a0` (no más oscuro: `#737b84` no llega a 4,5:1 sobre `surface-3`), `ink-4 #646c75` solo para iconos y bordes, nunca para texto.
- **Claro**: fondo `#f3f5f7`, superficie `#ffffff`, `#eef1f4`, `#e2e6eb`; tinta `#101418`, `ink-2 #2c3440`, `ink-3 #5c6773`.
- Profundidad con sombras suaves (`--sh-panel`, `--sh-overlay`) y vidrio (`--glass`, `--glass-thick` + `backdrop-filter`), respetando `prefers-reduced-transparency`.
- Radios: chip 6, control 10, tarjeta 14, panel 16–24, píldoras 999.

## Acento

- Un único acento por pantalla; los siete de Rosetta en `data-accent`. **Azul eléctrico por defecto**: claro `#1a4fe0` (fuerte `#123db8`), oscuro `#6b9bff` (fuerte `#9dbdff`). Están ajustados para llegar a 4,5:1 también sobre su propio tinte al 15 %.
- Texto sobre el acento con `--color-accent-ink` (blanco en claro; casi negro del mismo tono en oscuro).
- La píldora activa (idioma, filtros) **no** es «acento sobre tinte de acento»: superficie elevada + tinta + anillo.

## Colores con significado (bandas, estados)

- Severidad/estado ≠ acento de marca. Bandas Crítica · Alta · Media · Baja.
- **Texto** de banda (AA ≥ 4,5:1): oscuro `#ff5d5d #ff9f43 #e3c45a #8f9aa6`; claro `#a8234a #9c3d08 #7a5600 #5c6773`.
- **Rellenos** de gráficos (`--color-*-fill`), validados con el script de la skill dataviz (`validate_palette.js`), separación de visión normal ≥ 15 y CVD:
  - oscuro: `#f03e5a #ff9f43 #ffe36e #8f9aa6`
  - claro: rampa ordinal por luminosidad **ocre `#eab84f` → coral `#dd6b3d` → carmesí `#a8234a`**, baja `#8c96a3`. El rojo/naranja/amarillo saturados chocaban con el azul eléctrico: a Yoandy no le gustó.
- Nunca color solo: icono + texto, posición en un eje, patrón o etiqueta.
- Texto sobre fondo crítico: `--color-on-critica` (blanco en claro, `#2a0606` en oscuro).

## Tipografía

- Geist (variable) para texto y Geist Mono para IDs, cifras, `kbd` y antetítulos; incrustadas (woff2), sin Google Fonts en la app. Rosetta usa Bricolage Grotesque + Onest + Martian Mono: cada herramienta puede tener su par, siempre local.
- Cifras con `font-variant-numeric: tabular-nums` y `white-space: nowrap`; porcentaje con espacio duro (`94,4 %`).
- Números en formato del idioma (`es-ES`: coma decimal; `en-GB`: punto). Fechas largas localizadas.
- Tamaño mínimo de texto 11 px. Títulos con tracking negativo (−0,012 a −0,045 em).

## Gráficos (cargar la skill `dataviz` antes de dibujar)

- Elige la forma por el trabajo del dato; a veces la respuesta es una cifra grande y no un gráfico.
- **No repetir la firma de otra herramienta.** Rosetta = anillos/círculos. CTEM-Nexus = **franjas por activo** (una fila por activo, una marca por hallazgo en 0–100, bandas como zonas rotuladas, anillo de tinta para KEV, ficha al pasar o enfocar, carriles para no solapar, objetivos de 24 × 24 px) y **grafo de rutas** (columnas por distancia, zoom, «solo esta ruta», flujo animado). Para una herramienta nueva, busca una visualización fresca que encaje con su dato (Yoandy lo pidió: «necesitamos algo fresco»).
- Marcas finas, cuadrícula discreta, leyenda siempre que haya ≥ 2 series, tabla o lista equivalente, tooltip accesible por teclado, valida la paleta en claro y en oscuro con el script.
- Barra apilada de bandas con 3 px de separación y radios redondeados.

## Iconos

Solo **Lucide** (`lucide-react` o SVG en línea de lucide.dev). Sin emoji como icono, sin otras librerías, sin SVG de marca propio cuando Lucide tiene el glifo. Tamaños 14–20 px, `stroke-width` 1,75–2,25.
