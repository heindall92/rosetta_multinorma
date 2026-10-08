---
name: estilo-yoandy
description: Forma de trabajar, gustos y sistema de diseño de Yoandy Ramírez Delgado (heindall92). Úsala SIEMPRE que trabajes con él, en cualquier conversación o proyecto. Cubre interfaces web (barra lateral, barra superior, búsqueda Ctrl+K, idioma ES/EN, claro/oscuro, 7 acentos, ayuda, glosario, soporte, acerca de), movimiento al estilo Apple de Emil Kowalski, accesibilidad WCAG 2.2 AA verificada con axe, pruebas e2e, seguridad local-first, README y commits a su nombre, contenido GRC/ENS/ISO sin texto protegido y publicaciones de LinkedIn.
---

# Estilo Yoandy

Yoandy Ramírez Delgado (`yoandyramirezdelgado@gmail.com`, GitHub `heindall92`) construye herramientas GRC y de ciberseguridad de código abierto, en español, que funcionan en el navegador sin servidor. Es pentester junior (eJPTv2), sysadmin y se forma en gobierno de la IA (ISO 42001). Su listón: **«¡hostia, esto está terminado!»**, no «suficientemente bueno».

Esta skill resume todo lo aprendido trabajando con él para que no tenga que repetirlo. Lee la referencia que toque **antes** de empezar.

## Reglas que nunca se rompen

1. **Autoría.** Todo el trabajo es de Yoandy. Antes del primer commit en cualquier clon: `git config user.name "Yoandy Ramírez Delgado"` y `git config user.email "yoandyramirezdelgado@gmail.com"`; comprueba con `git log -1 --format='%an <%ae>'`. **Nunca** `Co-Authored-By: Claude` ni ninguna atribución a IA en commits, PR, código o documentación. Ningún identificador de modelo en el repositorio.
2. **Idioma.** Respuestas y texto visible en español de España, claro y directo. Inglés completo como segundo idioma en las interfaces.
3. **Producto terminado, no plan.** Investiga, construye, prueba, documenta y publica. No ofrezcas «dejarlo para después» si la solución está al alcance. No presentes un parche si existe la solución real. Si algo falla, dilo con la salida.
4. **Pruébalo antes de enviarlo.** Pruebas unitarias, e2e en navegador real y axe (0 infracciones) antes de cada push. Mira las capturas tú mismo.
5. **Propiedad intelectual.** Nunca reproducir texto de normas ISO/IEC (solo número de cláusula o control). El BOE se puede citar literalmente. No usar copias filtradas de normas ni exámenes o documentos de profesores. Avisos de independencia de ISO, IEC, PECB, CCN, Gartner, MITRE, CISA, FIRST y entidades de certificación.
6. **Local-first y sin terceros.** Nada de telemetría, CDNs ni peticiones externas en la app publicada; CSP estricta por hashes.

## Qué leer según la tarea

| Tarea | Referencia |
|---|---|
| Cualquier interfaz web (estructura, barra lateral, barra superior, ayuda, acerca de, búsqueda, idioma, tema, acentos, móvil) | `referencias/01-interfaz-shell.md` |
| Colores, tipografía, tokens, contraste, gráficos | `referencias/02-tokens-color-graficos.md` y `plantillas/tokens.css` |
| Animación, gestos, transiciones, sensación «Apple» | `referencias/03-movimiento-apple.md` y, para el detalle, `emil-kowalski/apple-design.md` y `emil-kowalski/design-engineering.md` |
| Accesibilidad, pruebas, CI, capturas | `referencias/04-accesibilidad-pruebas.md` |
| Arquitectura, seguridad, build, README, versiones, GitHub Pages | `referencias/05-ingenieria-seguridad-repo.md` |
| Contenido GRC (ENS, ISO, NIS2, DORA…), tono, LinkedIn, ecosistema | `referencias/06-contenido-tono-ecosistema.md` |
| Antes de dar algo por cerrado | `referencias/07-lecciones-y-checklist.md` |

## La firma visual en una frase

Oscuro casi negro frío o claro gris perla, **un único acento** (azul eléctrico por defecto, siete a elegir), tipografía Geist/Geist Mono (o la propia de cada herramienta), iconos **solo Lucide**, paneles redondeados con bordes de 1 px translúcidos, cabecera de página con antetítulo en monoespaciada, y movimiento con muelles sin rebote que responde al pulsar (escala 0,97). Cada herramienta tiene **su propia visualización** (Rosetta: anillos; CTEM-Nexus: franjas por activo y grafo; no repetir la de otra).

## Flujo de trabajo esperado

1. Lee el código y los documentos existentes; audita con capturas reales (Playwright) en claro/oscuro y 1440/390 px.
2. Si el trabajo es grande, escribe o actualiza `ROADMAP.md` por fases con criterios de aceptación y márcalo al avanzar.
3. Implementa en commits con mensaje en español, en imperativo y explicando el porqué.
4. Pasa todas las pruebas y axe; regenera capturas; actualiza README, CHANGELOG y versión.
5. Push y comprobación de la CI. Avisa al usuario con un resumen: qué cambió, qué encontraste (incluidos fallos tuyos) y el siguiente paso.
