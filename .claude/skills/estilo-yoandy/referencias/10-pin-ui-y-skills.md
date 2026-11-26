# 10 · Componentes de Pin UI y skills de diseño (obligatorio en todos los proyectos)

Yoandy eligió esta lista y pidió seguirla **a rajatabla, siempre y en todos los proyectos**. No es un catálogo de ideas: cada herramienta con interfaz lleva los componentes que le correspondan según su función.

## Componentes de Pin UI

[Pin UI](https://www.pinui.xyz) (código en `github.com/shadcn-labs/Pin-UI`) publica sus componentes con **licencia MIT, © Rachit Thakur**. El nombre, el logo y los vídeos de demostración no están incluidos en esa licencia: no se copian. Son componentes de React con Motion; en nuestras herramientas (un único HTML, sin dependencias y con CSP por hashes) se **reescriben en JavaScript y CSS** y se cita la procedencia en el comentario del fichero, en «Acerca de» y en el README.

| Componente | Cuándo va | Cómo se adapta | Referencia ya hecha |
|---|---|---|---|
| [Theme Switch](https://www.pinui.xyz/components/theme-switch) | **Siempre** (todas las herramientas tienen claro/oscuro) | Botón cuadrado con luna en claro y sol en oscuro que giran. Al pulsar: **gota** que cae con física real, se aplasta, el botón cede con un muelle, dos ondas y el tema nuevo se abre en círculo **sobre la página real** con View Transitions. En Ajustes, **Gota · Lluvia · Fundido**. Con movimiento reducido, cambio directo. Interrumpible: otra pulsación aplica al momento el último tema pedido. | Megalodon `src/app/80-fx.js`; WSTG Auditor `src/pin.js` |
| [Search Card](https://www.pinui.xyz/components/search-card) | **Siempre** que haya buscador `Ctrl K` | La píldora crece hasta ser la tarjeta (recorte con `clip-path`; con el teclado no se anima, por frecuencia de uso). Recientes guardados con baldosa de color, lámina que se desliza bajo la fila activa, papelera, «Borrar todo» y «Restaurar», fichas de categoría con contador que rueda. `Esc` primero borra y luego cierra; el foco vuelve a la píldora. | Megalodon `src/app/85-search.js`; WSTG Auditor `openPalette` |
| [Dynamic Drop Zone](https://www.pinui.xyz/components/dynamic-drop-zone) | **Sí o sí** donde se suba algo para analizarlo (capturas, evidencias, importar JSON/Excel/pcap…) | La zona se tiñe de tinta al arrastrar, «se traga» el archivo y rechaza con temblor lo que no vale (tipo o tamaño), con mensaje en texto y alternativa con teclado (botón que abre el selector). | WSTG Auditor `dzHtml` / `dzAccept` |
| [Task Card](https://www.pinui.xyz/components/task-card) | Cuando haya fases, tareas o subtareas (ciclo de vida, plan de trabajo, remediación) | Árbol de conectores con subtareas marcables, progreso, prioridad y estado; el número rueda al cambiar. | WSTG Auditor `taskCardHtml` |
| [Calendar Card](https://www.pinui.xyz/components/calendar-card) | Cuando haya que planificar o seguir fechas (auditorías, entregas, hitos, plazos) | El día seleccionado se desliza de fecha en fecha; puntos por evento y agenda del día. | WSTG Auditor `calendarHtml` |
| [Liquid Tabs](https://www.pinui.xyz/components/liquid-tabs) | Pestañas y filtros segmentados | La pestaña activa y la tarjeta son una sola forma líquida (filtro goo); el borde que va delante sale primero. Con teclado: flechas, Inicio y Fin. | WSTG Auditor `ltabsHtml` |
| [Progress Image](https://www.pinui.xyz/components/progress-image) | Opcional: cuando se procesen imágenes con progreso real | La miniatura pasa de píxel grueso a nítida con el progreso real, no simulado. | WSTG Auditor `pimgCard` |

**Reglas comunes:** CSP sin `unsafe-inline` (nada de atributos `style`: estilos por CSSOM o `data-sty`); `prefers-reduced-motion` respetado en cada pieza; axe con 0 infracciones en cada estado; nombres accesibles en todo control; pruebas e2e de cada componente.

## Skills de diseño

Instaladas en cada repositorio en `.claude/skills/` (con `skills-lock.json`) y de forma global con `npx skills@latest add … -g`:

- **De Emil Kowalski** (`emilkowalski/skills`): `emil-design-eng`, `apple-design`, `animate`, `choreograph`, `gestures`, `mobile-native`, `animation-performance`, `animation-vocabulary`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `break-ui`, `pick-ui-library`, `prototype`, `ask-emil`, `ask-sonner`, `animate-expo`, `learn-taste`.
- **Otras:** `impeccable` (pbakaus/impeccable) y `ui-ux-pro-max` (nextlevelbuilder/ui-ux-pro-max-skill). La vista previa de `ui-ux-pro-max` carga Google Fonts: nunca se copia eso a una app.

Uso en cada trabajo de interfaz: `impeccable` y `ui-ux-pro-max` para auditar y pulir; `animate`, `choreograph`, `apple-design` y `emil-design-eng` para el movimiento; `gestures` y `mobile-native` para el móvil; `animation-performance` si algo da tirones; `break-ui` para el peor caso (nombres largos, cero elementos, miles de filas); `find-animation-opportunities` y `review-animations` antes de cerrar. `animate-expo` solo en React Native.

Para instalarlas en una máquina nueva:

```bash
npx skills@latest add emilkowalski/skills -g -y \
  --skill emil-design-eng --skill apple-design --skill animate --skill choreograph --skill gestures \
  --skill mobile-native --skill animation-performance --skill animation-vocabulary --skill review-animations \
  --skill improve-animations --skill find-animation-opportunities --skill break-ui --skill pick-ui-library \
  --skill prototype --skill ask-emil --skill ask-sonner --skill animate-expo --skill learn-taste
npx skills@latest add pbakaus/impeccable -g -y
npx skills@latest add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -g -y
```

El instalador deja enlaces simbólicos a `.agents/skills/`; en los repositorios se sustituyen por carpetas reales para que viajen con el código.
