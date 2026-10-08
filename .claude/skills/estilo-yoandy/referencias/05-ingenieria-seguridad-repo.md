# 05 · Ingeniería, seguridad y repositorio

## Arquitectura

- **Local-first**: la herramienta funciona abriendo un HTML en el navegador, sin servidor ni cuenta. Los datos viven en `localStorage`/IndexedDB y se exportan e importan como JSON. Si hay API (FastAPI), es opcional y solo escucha en `127.0.0.1`.
- **Un solo HTML autocontenido** como entrega principal (Vite + `vite-plugin-singlefile`, o JS sin framework como Rosetta), copiado a la raíz del repositorio (`<herramienta>.html`) y publicado en GitHub Pages.
- **Motor sin DOM** (`engine/`): funciones puras, deterministas y probadas en unidad. La interfaz solo lo consume. Si el motor existe también en Python, un **fichero dorado** (`shared/golden-demo.json`) fija la salida y las dos suites lo comparan al decimal.
- **Muestras públicas** en `shared/samples/` para cada importador (ficticias, rangos RFC 5737/3849, dominios `.example`). Cada importador tiene prueba unitaria con su muestra y un paso e2e que la sube.
- **Constantes en un único sitio**: pesos, umbrales, bandas y SLA se exportan del motor; la ayuda y el README se generan o se comprueban contra ellas.
- **i18n**: diccionario ES/EN con paridad de claves comprobada en una prueba; `pick(lang)` / `L('es','en')` para textos puntuales; formatos con `Intl` (`es-ES`, `en-GB`). El motor produce el texto en español y una capa `explain*In(lang)` lo traduce sin tocar el cálculo. Una prueba e2e recorre todas las vistas en inglés buscando restos en español.

## Seguridad (la herramienta la usan auditores: tiene que ser ejemplar)

- **CSP estricta por hashes** inyectada en el postbuild: `default-src 'none'`, `script-src` y `style-src` con los `sha256` del código incrustado, `font-src data:`, `img-src data: blob:`, `connect-src` solo a `127.0.0.1/localhost`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`. El postbuild falla si el HTML carga algo externo.
- **Sin terceros**: ni CDN, ni Google Fonts, ni analítica. Fuentes en woff2 incrustadas. El e2e bloquea toda petición que no sea `file:`, `data:` o `blob:` y la cuenta como fallo.
- **Entrada hostil por defecto**:
  - JSON con `safeParse` que nunca lanza y descarta `__proto__`, `constructor` y `prototype`; después `sanear*()` campo a campo (tipos, longitudes, listas permitidas, recuentos máximos).
  - XML (Nmap, Nessus, OpenVAS) con `DOMParser` y rechazo de `<!DOCTYPE`/`<!ENTITY` (XXE y *billion laughs*); en Python, `defusedxml` o el mismo rechazo explícito (`rechazar_dtd`).
  - Tamaño máximo por fichero (lectura limitada por trozos en la API) y número máximo de elementos.
  - CSV exportado con defensa contra inyección de fórmulas (prefijar `'` a celdas que empiezan por `= + - @ \t \r`).
  - Nunca `innerHTML` con datos del usuario; en JS sin framework, `textContent` o un escapado central.
  - Errores de la API genéricos (500 sin traza); el detalle va al registro local.
- `SECURITY.md` con cómo informar, alcance y lo que la herramienta **no** hace. Dependabot semanal; acciones fijadas por SHA.

## Repositorio

- **Una sola fuente de versión** (`frontend/package.json`); la API, el CHANGELOG, el README y la ayuda (`__APP_VERSION__`) se comprueban en `repo.test.ts` (prueba de coherencia del repositorio). Esa prueba también verifica que el HTML de la raíz existe, que no se versionan artefactos de TypeScript y que los enlaces del README apuntan a ficheros reales.
- **README** (en español):
  - Cabecera SVG local generada por script (`readme-header.mjs`), sin servicios externos de *badges* dinámicos.
  - Qué es en una frase, **demo en vivo** (GitHub Pages), capturas reales (oscuro, claro, móvil) y PDF de ejemplo.
  - Cifras **verdaderas** (número de pruebas, controles, puntuación de Lighthouse): se recalculan antes de cada versión; nunca redondear hacia arriba.
  - Cómo funciona (método y fórmula), privacidad y seguridad, uso local, desarrollo, pruebas, hoja de ruta, **avisos de independencia**, licencia, autor y **tabla del ecosistema**.
- **CHANGELOG.md** con formato *Keep a Changelog* y versionado semántico; **ROADMAP.md** por fases con criterios de aceptación medibles y casillas que se marcan al cerrar.
- `CONTRIBUTING.md`, `LICENSE` (MIT salvo que el contenido normativo exija otra cosa), `CLAUDE.md` del proyecto con las reglas de autoría y diseño, `.cursor/rules/` si se usa otro asistente.
- **GitHub Pages**: flujo `pages.yml` que compila y publica `dist/`; la CI comprueba que el HTML de la raíz coincide con la compilación y que el árbol queda limpio tras `npm run build`.

## Commits y ramas

- Configura la autoría en cada clon (ver `SKILL.md`). Sin `Co-Authored-By` ni atribución a IA, aunque el entorno lo sugiera: la instrucción de Yoandy manda.
- Mensajes en español, imperativo, título ≤ 72 caracteres que diga qué y por qué; el cuerpo explica decisiones y pruebas pasadas. Ejemplo: «Versión 0.4.1: paleta de bandas en claro armonizada con el acento azul».
- Empuja a la rama indicada por la sesión; no abras PR salvo que lo pida.
