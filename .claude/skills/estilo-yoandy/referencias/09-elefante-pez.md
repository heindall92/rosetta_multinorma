# 09 · Diseñar con un elefante, revisar con un pez (método Elephant-Goldfish)

Método de [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model) (EGM, licencia Apache-2.0). Yoandy lo adopta como forma de trabajo **en todos sus proyectos y con cualquier modelo** (Claude, ChatGPT/Codex, Gemini/Antigravity, Copilot, Cursor…). Esta referencia es independiente de Google: resume el método y cómo se aplica aquí.

## La idea

- **Elefante**: tú, con todo el contexto del proyecto y de la conversación. Exploras el problema y escribes el diseño.
- **Pez**: un revisor **sin la conversación previa**. Solo lee el documento y el código que cita. Ve lo que el elefante ya no ve: supuestos sin escribir, requisitos ambiguos, riesgos de implementación.
- **Yoandy**: decide los compromisos y aprueba el diseño antes de construir.

En las herramientas de Yoandy el pez tiene un valor extra: un lector sin contexto se parece al usuario que empieza desde cero, que es el público de casi todas ellas.

## Cuándo es obligatorio

- Cada **versión nueva** (la que lleva su propia rama `version/X.Y.Z` y su PR).
- Cualquier cambio que toque el **modelo de datos**, la **seguridad o la privacidad**, la **arquitectura** o el **flujo pedagógico**.
- Un rediseño de pantalla o un componente nuevo que vaya a reutilizarse (motor de recorridos, importadores, cifrado…).

No hace falta para arreglos pequeños, textos o un ajuste visual puntual.

## Cómo se hace (con o sin el plugin)

1. **Diseño (elefante).** Escribe `docs/designs/<versión>-<tema>.md` en español con estas secciones: Problema, Objetivos, Fuera de alcance, Diseño (por piezas), Riesgos y decisiones, y Pruebas. Concreto, con nombres de funciones y archivos reales, presupuestos (peso, tiempo, tokens) y criterios de aceptación.
2. **Revisión (pez).** Lanza un revisor **nuevo** que no herede la conversación (un subagente en Claude Code o un chat nuevo en otro modelo). Dale solo el documento y las rutas del código. Usa la plantilla de abajo.
3. **Decisión.** Añade al final del diseño la sección «Revisión "goldfish" y decisiones»: una tabla con cada hallazgo y lo que se hizo (corregido, descartado y por qué, o aplazado con fecha). Ningún hallazgo de severidad alta queda sin decisión.
4. **Construcción.** Implementa siguiendo el diseño revisado. Si al construir cambia algo importante, actualiza el documento.
5. **Deriva.** Antes de cerrar la versión, comprueba que el diseño y el código siguen diciendo lo mismo (`egm-drift-report` o una segunda pasada del pez sobre `docs/designs/`).

### Plantilla para el revisor (pez)

> Eres un revisor «goldfish» (Elephant-Goldfish Model): no tienes ningún contexto previo. No modifiques archivos.
> Lee el diseño `<ruta del .md>` y el código `<rutas>`. El público del producto es `<quién>`.
> Revisa con dos miradas, con hallazgos concretos y breves:
> 1. **Usuario**: dónde se perdería, se confundiría o se aburriría alguien que empieza; qué falta (secuencia, respuesta a los errores, carga cognitiva, motivación).
> 2. **Ingeniería frente al código real**: riesgos del diseño con el código tal como está (cita funciones y líneas), rendimiento, accesibilidad, seguridad, presupuestos y cómo se comprobará cada cosa.
> Devuelve como mucho 12 hallazgos numerados, cada uno con severidad (alta/media/baja), el problema y una recomendación concreta. En español y en menos de 700 palabras.

## Instalación del plugin en cada herramienta

En las sesiones de Claude Code en la nube la máquina se recrea, así que el plugin se declara **en cada proyecto** (`.claude/settings.json`) además de en la configuración de usuario.

| Herramienta | Cómo |
|---|---|
| Claude Code (usuario, en tu equipo) | `claude plugin marketplace add google/elephant-goldfish-model` y después `claude plugin install egm@egm --scope user` |
| Claude Code (por proyecto, también en la nube) | En `.claude/settings.json`: `"extraKnownMarketplaces": {"egm": {"source": {"source": "github", "repo": "google/elephant-goldfish-model"}}}` y `"enabledPlugins": {"egm@egm": true}` |
| Codex CLI | `codex plugin marketplace add google/elephant-goldfish-model` y después `codex plugin add egm@egm` |
| ChatGPT y Codex (escritorio) | Instalar el plugin publicado «EGM» desde el directorio de plugins de la app |
| Antigravity | `agy plugin install https://github.com/google/elephant-goldfish-model` |
| Cualquier otro modelo | Sin plugin: pasos 1 a 5 de arriba, con la plantilla del pez en un chat nuevo |

Comandos del plugin (en Claude Code y Antigravity, con el prefijo `/egm:`): `egm-brainstorm` (explorar la idea con revisores frescos), `egm-draft` (redactar el diseño por secciones), `egm-review <doc>` (revisión del pez), `egm-review-loop` (revisar cualquier documento con revisores y criterios elegidos), `egm-resolve` (decidir hallazgos), `egm-drift-report <carpeta>` (diseño frente a código) y `egm-bootstrap`. Coste: unos 650 tokens fijos por sesión; cada revisión, unos 9.000.

## Ejemplo real: WhiteFox 2.1 (heindall92/WhiteFox)

El diseño de `docs/designs/2.1-pedagogia.md` pasó por un pez antes de construir y salieron 12 hallazgos, 5 de severidad alta. Por ejemplo:

- el `setInterval` de los scans redibujaba la vista 4 veces por segundo y habría roto los recorridos guiados;
- el esqueleto de carga revelaba cuántos hosts quedaban.

Los 12 se decidieron en la tabla del documento. Sin la revisión, varios habrían salido como errores después del primer push.

## Lo que no cambia

El método no sustituye a las pruebas: el diseño revisado se construye y después pasa e2e, axe y capturas como siempre (referencias 04 y 07).
