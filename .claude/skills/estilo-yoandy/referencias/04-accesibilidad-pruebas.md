# 04 · Accesibilidad y pruebas

## Accesibilidad (WCAG 2.2 AA, no negociable)

- Contraste de texto ≥ 4,5:1 (≥ 3:1 en texto grande) **también sobre fondos tintados**; texto mínimo 11 px.
- Un solo `h1` por vista (en la cabecera de página); `document.title` por vista.
- Diálogos: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape por ventana, foco inicial y devuelto. Pestañas: `tablist/tab/tabpanel`, flechas, `aria-selected`. Menús: `role="menu"`, `menuitem`, flechas, Escape, foco en la primera opción cuando el menú ya está posicionado.
- Interruptores `role="switch"` + `aria-checked`; grupos de opciones `aria-pressed`; elemento actual `aria-current` (no `aria-selected` en botones: axe lo rechaza).
- Objetivos táctiles ≥ 24 × 24 px (2.5.8): si la marca visible es pequeña, el botón es de 24 px y la marca va en `::before`.
- Nada interactivo dentro de un `role="img"`: un SVG con nodos pulsables es `role="group"`.
- Zonas desplazables con `tabIndex={0}`; `<input type="file">` con `sr-only`, nunca `display: none`.
- Iconos decorativos `aria-hidden`; los que transmiten información llevan `aria-label` o `title`.
- Inglés completo: comprobación de que no queda texto de interfaz en español al cambiar de idioma.

## Suite de pruebas que se espera en cada herramienta

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Unidad | Vitest / node:test | Motor sin DOM, importadores (con muestras en `shared/samples/`), saneado, exportaciones, i18n (paridad de claves), coherencia del repositorio |
| Paridad | Fichero dorado | Si hay motor duplicado (p. ej. TS ↔ Python), mismo resultado al decimal |
| API | pytest | Endpoints, multipart, rechazos de seguridad |
| e2e | Playwright (Python) sobre el HTML compilado | Flujos completos, CSP, red bloqueada (toda petición no `file:/data:/blob:` es un fallo), errores de consola, diálogos, teclado, impresión a PDF, móvil |
| Accesibilidad | axe-core (vendorizado) + barrido de contraste propio | Todas las vistas, diálogos, menús, formularios y estados; claro y oscuro; 1440 y 390 px. **0 infracciones** o falla la CI |
| Rendimiento | Lighthouse servido **con gzip** (como GitHub Pages) | ≥ 95 en accesibilidad, buenas prácticas y SEO |

### Patrones que funcionaron (y por qué)

- **Gancho de pruebas** solo con `?test`: `window.__APP__ = useStore` para recorrer estados sin depender de la interfaz.
- **axe deja cosas en «incompleto»** (texto corto, sombras, solapes): tratar como fallo el texto corto cuyo contraste sí mide, y añadir un **barrido propio** que compone los fondos sólidos de los ancestros. Así se detectó un bloque de comandos con contraste 1,17:1 que axe no marcaba.
- **Esperar a las animaciones** antes de medir: `document.getAnimations().every(a => a.playState !== 'running')`.
- **`wait_for_function` de Playwright usa `eval`** y una CSP estricta lo bloquea a veces: sondear con `page.evaluate` en un bucle.
- **Condiciones de carrera de foco**: esperar a que el diálogo tenga el foco (`expect(dlg).to_be_focused()`) antes de usar flechas.
- **Prueba de mutación** de cada comprobación nueva: introduce el fallo a propósito y verifica que la prueba lo caza.
- Ejecuta el e2e varias veces seguidas antes de dar por buena una corrección de inestabilidad.
- Cuidado con `pkill -f` en la misma orden que contiene el patrón: se mata a sí misma.

### Capturas

`npm run capturas` (Playwright) genera el juego completo: oscuro, claro, móvil oscuro y móvil claro, más el PDF de ejemplo. Revisa siempre las imágenes tú mismo antes de darlas por buenas.

## CI (GitHub Actions)

- Trabajos: frontend (test + build + «el HTML de la raíz coincide con la compilación y el árbol queda limpio»), backend (pytest), navegador (e2e + axe; sube `tests/artifacts/` si falla).
- Acciones fijadas por SHA con comentario de versión, `permissions: contents: read` y escritura solo en el despliegue de Pages. Dependabot semanal.
- Tras cada push, comprueba la CI; si falla, arréglalo antes de seguir.
