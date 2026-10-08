#!/usr/bin/env node
/* Rosetta · build
 * Ensambla src/ en un único HTML autocontenido (dist/index.html) que funciona abriéndolo
 * directamente desde el disco, desde GitHub Pages o publicado como artefacto.
 *
 * Directivas de la plantilla (src/index.html), cada una en su propia línea:
 *   <!-- @inline ruta -->          inserta el fichero tal cual
 *   <!-- @data clave1 clave2 … -->  inserta {"clave1": src/data/clave1.json, …} en JSON compacto
 *   <!-- @modules carpeta -->       concatena los .js de la carpeta en orden alfabético,
 *                                   precedidos de la marca  / * ===== nombre.js ===== * /
 *   <!-- @fonts -->                 @font-face de src/fonts/*.woff2 incrustadas (data:), sin pedir nada a terceros
 *   <!-- @csp -->                   <meta> Content-Security-Policy con los hashes de los bloques en línea
 * Además copia src/vendor/ (SheetJS, cargado solo al importar o exportar Excel) a dist/vendor/.
 *
 * Uso:  node scripts/build.mjs [--out ruta] [--check]
 *   --check  no escribe nada: falla si dist/index.html no coincide con lo que se generaría. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const stripEnd = (s) => s.replace(/\n+$/, '');

export function buildData(keys) {
  const o = {};
  for (const k of keys) {
    if (!/^[a-z0-9_-]+$/i.test(k)) throw new Error(`Clave de datos no válida: ${k}`);
    o[k] = JSON.parse(rd(`src/data/${k}.json`));
  }
  // Evita que una cadena con «</script>» cierre el bloque antes de tiempo.
  return JSON.stringify(o).replace(/<\/(script)/gi, '<\\/$1');
}

export function buildModules(dir) {
  const files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.js')).sort();
  if (!files.length) throw new Error(`No hay módulos en ${dir}`);
  return files.map((f) => `/* ===== ${f} ===== */\n${stripEnd(rd(join(dir, f)))}`).join('\n');
}

/* Fuentes incrustadas: el nombre del fichero fija la familia; los ejes variables, los de la fuente. */
export const FONTS = [
  { file: 'bricolage-grotesque-latin.woff2', family: 'Bricolage Grotesque', weight: '200 800', stretch: '75% 100%' },
  { file: 'geist-latin.woff2', family: 'Geist', weight: '100 900' },
  { file: 'geist-mono-latin.woff2', family: 'Geist Mono', weight: '100 900' }
];
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
export function buildFonts() {
  return FONTS.map((f) => `@font-face { font-family: "${f.family}"; font-style: normal; font-display: swap; font-weight: ${f.weight};${f.stretch ? ` font-stretch: ${f.stretch};` : ''}\n  src: url(data:font/woff2;base64,${readFileSync(join(ROOT, 'src/fonts', f.file)).toString('base64')}) format("woff2"); unicode-range: ${LATIN}; }`).join('\n');
}

/* Librerías de Excel: se sirven desde dist/vendor/ y, si no están (p. ej. el HTML descargado suelto), desde jsDelivr.
 * En ambos casos con SRI: el navegador rechaza el fichero si cambia un solo byte. */
export const VENDOR = [
  { file: 'sheetjs-0.20.3.full.min.js', cdn: 'https://cdn.jsdelivr.net/npm/@e965/xlsx@0.20.3/dist/xlsx.full.min.js' },
  { file: 'xlsx-js-style-1.2.0.bundle.js', cdn: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js' }
];
export const sri = (path) => 'sha384-' + createHash('sha384').update(readFileSync(path)).digest('base64');

/* CSP por <meta>: hashes SHA-256 de cada <script>/<style> en línea del documento final.
 * Va en <meta> porque GitHub Pages y el uso desde disco no permiten cabeceras HTTP. */
export function cspFor(html) {
  const h = (kind) => [...html.matchAll(new RegExp(`<${kind}>([\\s\\S]*?)</${kind}>`, 'g'))]
    .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`).join(' ');
  return ["default-src 'none'", `script-src ${h('script')} 'self' ${VENDOR.map((v) => v.cdn).join(' ')}`, `style-src ${h('style')}`, "style-src-attr 'unsafe-inline'",
    'img-src data:', 'font-src data:', "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "manifest-src 'none'", "worker-src 'none'"].join('; ');
}

export function build({ csp = true } = {}) {
  const tpl = rd('src/index.html');
  const out = tpl.replace(/^[ \t]*<!-- @fonts -->$/m, () => buildFonts()).replace(/^[ \t]*(.*?)<!-- @(inline|data|modules) ([^>]+?) -->(.*)$/gm, (_, pre, kind, arg, post) => {
    const a = arg.trim();
    let body;
    if (kind === 'inline') {
      body = stripEnd(rd(a));
      if (/<\/(script|style)/i.test(body)) throw new Error(`${a} contiene una etiqueta de cierre que rompería el HTML`);
    } else if (kind === 'data') body = buildData(a.split(/\s+/));
    else body = buildModules(a);
    return pre + body + post;
  });
  const meta = csp ? `<meta http-equiv="Content-Security-Policy" content="${cspFor(out)}">` : '';
  const fin = out.replace(/^<!-- @csp -->\n/m, meta ? meta + '\n' : '');
  if (/<!-- @/.test(fin)) throw new Error('Quedan directivas sin resolver en la plantilla');
  return fin;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const outPath = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'dist/index.html');
  const html = build({ csp: !args.includes('--no-csp') }); // --no-csp: p. ej. para publicarlo como artefacto con su propia CSP
  const sha = createHash('sha256').update(html).digest('hex').slice(0, 16);
  if (args.includes('--check')) {
    const cur = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    if (cur !== html) { console.error(`✗ ${outPath} está desactualizado: ejecuta «npm run build».`); process.exit(1); }
    console.log(`✓ ${outPath} al día (${(html.length / 1024).toFixed(0)} KB, sha256 ${sha}…)`);
  } else {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    mkdirSync(join(dirname(outPath), 'vendor'), { recursive: true });
    for (const f of readdirSync(join(ROOT, 'src/vendor'))) copyFileSync(join(ROOT, 'src/vendor', f), join(dirname(outPath), 'vendor', f));
    console.log(`✓ ${outPath} · ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB · sha256 ${sha}…`);
  }
}
