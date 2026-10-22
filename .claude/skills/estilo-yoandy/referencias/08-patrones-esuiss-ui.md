# 08 · Patrones tomados de suiss/ui (`@esuiss/ui`)

`@esuiss/ui` (MIT, github.com/e-suiss/ui) es una CLI al estilo shadcn que copia componentes React con Tailwind v4, Base UI e iconos Phosphor. Se revisó la versión 0.21.0 (octubre de 2026) instalando sus 67 componentes en un proyecto Vite desechable.

**Decisión:** no se instala en las herramientas. Se adoptan sus patrones, reescritos con nuestros tokens, iconos Lucide y textos en español. Motivos:

- es un paquete con tres semanas de vida y un solo mantenedor;
- `init` y `add` descargan código en el momento desde `suiss.app` y `raw.githubusercontent.com`;
- usa Phosphor, y nosotros solo usamos Lucide;
- sirve solo para React, y TRAMA, Rosetta y ARGOS son JS sin framework;
- la plantilla Vite que genera arrastró 7 avisos de severidad alta en `npm audit`.

En las herramientas React (CTEM-Nexus, Compliance Studio) se pueden copiar componentes concretos a mano, revisando el código, cambiando Phosphor por Lucide y quitando lo que no se use. Nunca se ejecuta su CLI dentro de un repositorio de Yoandy.

## 1. Muelles en CSS puro con `linear()`

Es lo más valioso. `linear()` admite una lista de puntos y reproduce cualquier curva de muelle sin JavaScript. Funciona en herramientas sin framework. Chromium 113+, Safari 17.2+ y Firefox 112+; fuera de eso, cae a la curva de respaldo.

```css
:root {
  /* Muelle críticamente amortiguado (sin rebote), por defecto. ~500 ms. */
  --spring: linear(0, 0.057, 0.18, 0.321, 0.455, 0.573, 0.671, 0.75, 0.812, 0.86, 0.896, 0.924, 0.944,
    0.96, 0.971, 0.979, 0.985, 0.989, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1);
  /* Muelle con un 4 % de rebote: solo tras un gesto con impulso (abrir arrastrando, soltar). ~650 ms. */
  --spring-bounce: linear(0, 0.032, 0.112, 0.219, 0.338, 0.459, 0.573, 0.676, 0.766, 0.84, 0.9, 0.947, 0.982,
    1.007, 1.023, 1.033, 1.037, 1.038, 1.037, 1.033, 1.029, 1.024, 1.02, 1.015, 1.012, 1.008, 1.006, 1.003,
    1.002, 1, 1, 0.999, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* la del drawer de iOS (Vaul, Emil Kowalski) */
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
}
.sheet { transition: transform 500ms var(--ease-drawer); }
@supports (transition-timing-function: linear(0, 1)) { .sheet { transition-timing-function: var(--spring); } }
```

- **Abrir y cerrar no duran lo mismo.** Al abrir, muelle de 500–650 ms; al cerrar, `--ease-drawer` en 400 ms, más corto, porque la persona ya decidió irse.
- **Generar otro muelle.** Amortiguación crítica: `x(u) = 1 − (1 + a·u)·e^(−a·u)` con `a ≈ 9,2`, muestreado en 25 puntos.
- **Movimiento reducido:** `transition: none` en la transformación y solo opacidad, como siempre.

## 2. Entrada con `@starting-style`: escala, fundido y desenfoque

```css
.panel-items > * { transition: opacity 450ms var(--ease-drawer), scale 450ms var(--ease-drawer), filter 450ms var(--ease-drawer); transition-delay: 100ms; }
@starting-style { .panel-items > * { opacity: 0; scale: .95; filter: blur(4px); } }
.panel-items[data-closing] > * { opacity: 0; scale: .95; filter: blur(4px); transition-duration: 150ms; transition-delay: 0ms; }
```

- **Al entrar:** desenfoque de 4 px que se aclara, con un retraso de 100 ms tras el contenedor.
- **Al salir:** 150 ms y sin retraso, porque salir siempre es más rápido que entrar.

## 3. Barra de pestañas flotante que se convierte en «Más» (móvil)

En lugar de una barra pegada al borde y una hoja aparte, la barra es una píldora flotante:

- `border-radius: 24px`, borde de 1 px con `color-mix(in oklab, var(--text) 5%, transparent)`, `box-shadow` grande;
- separada del borde inferior por `max(16px, env(safe-area-inset-bottom))` y con `width: fit-content`, centrada.

El botón «Más» la **hace crecer en el sitio**:

- `interpolate-size: allow-keywords` y transición de `width` y `height` con `--spring-bounce` en 650 ms;
- los destinos aparecen en una rejilla `repeat(auto-fit, minmax(8rem, 1fr))` con el patrón de entrada del punto 2;
- se cierra al tocar fuera, con Escape o al elegir un destino, y el icono de lista rota hasta convertirse en una X.

Es el patrón a seguir en la próxima revisión del móvil de cualquier herramienta. Hasta entonces, la hoja «Más» con secciones de TRAMA 0.2.2 cumple.

## 4. Pasos con estado (`Trace`)

Lista vertical de líneas `icono + título + detalle` con estado: pendiente (icono al 60 %), en curso (brillo que recorre el título), error (color destructivo) y hecho. Cada línea puede desplegarse para ver el detalle.

**Uso:** procesos de varios pasos visibles para la persona. Por ejemplo, la importación de TRAMA («Detectando formato → Normalizando → Sellando → Correlacionando»), la verificación de una cadena o la generación de un informe. El brillo se desactiva con movimiento reducido.

## 5. Estado vacío

Contenedor con `border: 1px dashed`, `border-radius: 16px` y `padding: 48px`, centrado y con `text-wrap: balance`. Dentro, por orden:

- icono en una casilla de 40 × 40 px con radio de 8 px y fondo atenuado;
- título de 18 px semibold;
- descripción en color atenuado, como máximo 24 rem;
- acciones debajo.

Sustituye a los textos sueltos del tipo «Sin datos».

## 6. Adjuntos (ficheros añadidos)

Fila con fondo atenuado y `border-radius: 16px`. Lleva una miniatura del tipo de fichero (36 × 44 px, borde, radio de 4 px), nombre y detalle, y acciones a la derecha.

Estados: `idle` (borde discontinuo y fondo transparente), `uploading`/`processing` (spinner en la miniatura), `error` y `done`.

En grupo, las filas pierden el radio y se separan con una línea que empieza tras la miniatura, como las listas de iOS. Sirve para los diálogos de importación de TRAMA, CTEM-Nexus y Rosetta.

## 7. Detalles de color y foco

- **Paleta en OKLCH:** grises con un toque frío (`oklch(… 0.003 286)`), primario `oklch(0.563 0.193 256)` en claro y `oklch(0.669 0.181 252)` en oscuro, prácticamente nuestro azul eléctrico.
- **Fondos de botón traslúcidos.** El secundario usa `oklch(0 0 0 / 4%)` en claro y `oklch(1 0 0 / 10%)` en oscuro, así funciona sobre cualquier superficie.
- **Variante «tinted»:** fondo `primary` al 10 % (20 % en oscuro) y texto `color-mix(in oklab, var(--primary) 80%, var(--foreground))`. Sirve para acciones secundarias con color sin competir con la principal.
- **Hover por mezcla, no por opacidad:** `color-mix(in oklab, var(--muted), var(--foreground) 5%)`.
- **Foco:** anillo de 3 px con el color de foco al 50 % (`box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 50%, transparent)`) y borde en el color de foco.
- **Tipografía:** pila `-apple-system, BlinkMacSystemFont, "Inter Variable", sans-serif` para herramientas que no tengan fuente propia. Geist sigue siendo la del ecosistema.
- **Botones en píldora** (`border-radius: 999px`) y los de bloque a ancho completo con radio normal. Son coherentes con nuestras píldoras.

## Qué no se adopta

- Phosphor (solo Lucide).
- La CLI y su registro remoto en ningún repositorio.
- Los componentes de chat, mensajes y cuestionarios: no encajan en herramientas GRC.
- El fondo negro puro (`oklch(0 0 0)`) del tema oscuro: el nuestro es casi negro frío.
