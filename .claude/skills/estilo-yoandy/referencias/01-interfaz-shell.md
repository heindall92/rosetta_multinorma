# 01 · Estructura de la interfaz (shell)

Referencias vivas: **Rosetta** (`heindall92/rosetta_multinorma`, JS sin framework) y **CTEM-Nexus** (`heindall92/ctem-nexus`, React 19 + TypeScript + Tailwind 4 + motion + zustand). Las dos comparten esta estructura; repítela en toda herramienta nueva.

## Disposición general

```
┌──────────────┬───────────────────────────────────────────────────────────┐
│  BARRA       │  BARRA SUPERIOR (píldora flotante, sticky)                │
│  LATERAL     │  [⇤]                [🔍 Buscar  Ctrl K] [ES|EN] [☀|☾] [?] │
│  (panel      ├───────────────────────────────────────────────────────────┤
│  flotante    │  Aviso de datos de ejemplo (se desplaza, NO fijo)         │
│  redondeado) │  ANTETÍTULO · EN MONOESPACIADA Y ACENTO                   │
│              │  Título grande (h1, uno por vista)          [acciones]    │
│  logo+nombre │  Entradilla de una o dos líneas                           │
│  proyecto ▾  │                                                           │
│  navegación  │  Paneles (cards) con aparición escalonada                 │
│  …           │                                                           │
│  ─────────   │                                                           │
│  Acento 🎨   │                                                           │
│  Cuenta ⋯    │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
Móvil (< 768 px): sin lateral; barra superior compacta con avatar; barra inferior con 4 destinos + «Más».
```

## Barra lateral

- Panel flotante (`my-3 ml-3`, radio ~26 px, borde hairline, fondo surface con desenfoque).
- Cabecera: logo (cuadrado con icono Lucide en el acento) + nombre + submarca en monoespaciada mayúscula (p. ej. «MAPA DE EXPOSICIÓN»). Botón para contraer.
- Selector del proyecto (píldora con icono `Layers` y chevron) que lleva a Ajustes.
- Navegación `<nav aria-label="Secciones">` con iconos Lucide; el activo lleva fondo tintado del acento, texto en acento y una barra vertical (pill con `layoutId` para que se deslice con muelle). Insignias rojas con recuento (p. ej. críticos).
- Separador y «Ajustes y datos» abajo.
- Pie: **solo** selector de color de acento (paleta Lucide `Palette`) y la **cuenta** (avatar + nombre + rol + `⋯`). Sin nombre → icono `User`, nunca «·».
- Contraída: solo iconos con `title`. En Rosetta: desplegada desde 1241 px, compacta entre 901 y 1240 px o con `[`; en compacta se despliega por encima al pasar el ratón o con el teclado.

## Barra superior

- Píldora flotante `sticky top-0`, alto 56 px, fondo surface/90 con `backdrop-blur`.
- Izquierda: alternar lateral (`PanelLeft`); en móvil, logo + nombre.
- Derecha, **una sola vez cada control** (nunca duplicados en el lateral):
  - **Búsqueda** `Ctrl K` / `⌘K`: botón con `Search`, texto «Buscar» y `<kbd>`. Abre un diálogo tipo Spotlight: campo con `aria-label`, accesos rápidos a secciones, resultados agrupados (hallazgos, activos…), Escape para cerrar.
  - **Idioma** `ES | EN`: grupo `role="group" aria-label="Idioma"`, botones con `aria-pressed`. Activo = superficie elevada + texto tinta + anillo (el acento sobre su propio tinte no llega a 4,5:1).
  - **Tema** claro/oscuro: interruptor `role="switch"` con sol y luna y una perilla que se desliza. Persistido; `data-theme` en `<html>`; opción «sistema».
  - **Ayuda** `HelpCircle` (abre el centro de ayuda).
  - **Cuenta** (avatar) solo en móvil; en escritorio vive en el lateral.
- La barra pone `document.title = "<vista> · <App>"` en cada vista. El `h1` visible lo pone la cabecera de página, no la barra.

## Cabecera de página (cada vista)

- Antetítulo: monoespaciada, mayúsculas, `letter-spacing: .14em`, color acento, con icono Lucide. Indica dónde estás (p. ej. «FASE 4 · VALIDACIÓN», «PANEL · NOMBRE DEL PROYECTO»).
- Título `h1`: `clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem)`, peso 700, tracking −0,035 em. Insignia «Datos de ejemplo» al lado si aplica.
- Entradilla en `ink-2`, 15 px, máximo ~68 caracteres por línea.
- Acciones a la derecha (botón principal en acento a la derecha del todo).

## Centro de ayuda (diálogo grande)

Diálogo modal de vidrio (`role="dialog"`, `aria-modal`, `aria-labelledby`, Escape, foco devuelto) con **pestañas** (`role="tablist"`, flechas ← →, `aria-selected`, `tabpanel`):

1. **Guía / Ciclo** — qué hace la herramienta y su método por pasos.
2. **Cálculo / Método** — la fórmula real, **generada desde las constantes del código** (nunca escrita a mano: una vez la ayuda mostraba una fórmula inventada). Bandas y umbrales.
3. **Ingesta / Datos** — formatos aceptados, comandos de ejemplo, límites y saneado.
4. **Atajos de teclado** — `Ctrl K`, `Escape`, `← →`, `Ctrl P`…
5. **Glosario** — términos con definición breve (`<dl>`).
6. **Acerca de** — autor (tarjeta con iniciales, nombre, rol «Junior Pentester · eJPTv2 · AI Governance (ISO 42001) · SysAdmin», enlaces GitHub y correo), «Sobre la herramienta» con versión `__APP_VERSION__`, aviso de independencia, licencia, y **bloque del ecosistema** con las 7 herramientas (botón «Abrir» a la web publicada + «Código»), más «¿Sigues con dudas?» con *Abrir una incidencia* y *Escribir al autor* (soporte).
- Pie del diálogo: «App · Yoandy Ramírez Delgado» y botón «Entendido».
- Rosetta añade buscador dentro de la ayuda, primeros pasos, preguntas frecuentes y fuentes oficiales; es un buen modelo para herramientas con mucho contenido normativo.

## Colores de acento (siete pastillas de Rosetta)

rosa · solar · glaciar · orquídea · verde bosque · **azul eléctrico (por defecto)** · rojo. Persistidos en `data-accent` sobre `<html>`. Valores exactos claro/oscuro en `plantillas/tokens.css`. El selector vive en el lateral (y en el perfil): círculos de 24 px con `aria-pressed` y `title`, anillo en el activo; Escape cierra el popover.

## Estado vacío y demo

- Estado vacío con **tres entradas** en tarjetas: cargar demo (principal), importar datos reales, empezar a mano; y una ilustración del método (no circular si la herramienta no es Rosetta).
- Demo con datos **ficticios**, rangos de documentación (RFC 5737) y organizaciones inventadas declaradas como tales. Las fechas de la demo se desplazan a hoy al cargarla para que no «envejezca».
- Aviso de demo: píldora con «Restablecer», «Empezar con mis datos» y cerrar. Se desplaza con el contenido (fijo ocupaba un 20 % de la pantalla en móvil).

## Perfil y cuenta

Menú de cuenta (`role="menu"`, foco en la primera opción, flechas, Escape): Perfil, Ajustes, Ayuda, Alcance, Exportar. Perfil a pantalla completa con nombre, rol (lista), organización y correo validado; se usa como autor de informes. Todo en el navegador.

## Diálogos, paneles y avisos

- Modal centrado y panel lateral (*sheet/drawer*) con muelle sin rebote; velo con desenfoque; Escape **por ventana** (aunque el foco aún no haya entrado); foco inicial y devolución al cerrar; el efecto no se re-ejecuta en cada render del padre (guardar `onClose` en una ref).
- Avisos (*toasts*) abajo a la derecha, `role="status" aria-live="polite"`, máximo 3, 4 s.
- Zonas desplazables con `tabIndex={0}`; selectores de fichero con `sr-only` (nunca `display:none`).

## Móvil (390 px)

- Barra inferior fija con 4 destinos principales + «Más» (popover con el resto y Ayuda); `aria-label="Secciones"`.
- Tablas → **tarjetas** por debajo de 640 px. Sin desplazamiento horizontal. Objetivos táctiles ≥ 24 × 24 px.

## Informe imprimible

Portada propia (`.print-cover`, solo en impresión) con logo, título, proyecto, fecha, autor, cifra principal e indicadores; impresión siempre en tokens claros aunque se use el oscuro; tablas que caben en A4; `break-inside: avoid`; generar un PDF de ejemplo con Playwright (`page.pdf`) para el README.
