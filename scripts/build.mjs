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
 *
 * Uso:  node scripts/build.mjs [--out ruta] [--check]
 *   --check  no escribe nada: falla si dist/index.html no coincide con lo que se generaría. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
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

export function build() {
  const tpl = rd('src/index.html');
  const out = tpl.replace(/^[ \t]*(.*?)<!-- @(inline|data|modules) ([^>]+?) -->(.*)$/gm, (_, pre, kind, arg, post) => {
    const a = arg.trim();
    let body;
    if (kind === 'inline') {
      body = stripEnd(rd(a));
      if (/<\/(script|style)/i.test(body)) throw new Error(`${a} contiene una etiqueta de cierre que rompería el HTML`);
    } else if (kind === 'data') body = buildData(a.split(/\s+/));
    else body = buildModules(a);
    return pre + body + post;
  });
  if (/<!-- @/.test(out)) throw new Error('Quedan directivas sin resolver en la plantilla');
  return out;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const outPath = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'dist/index.html');
  const html = build();
  const sha = createHash('sha256').update(html).digest('hex').slice(0, 16);
  if (args.includes('--check')) {
    const cur = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    if (cur !== html) { console.error(`✗ ${outPath} está desactualizado: ejecuta «npm run build».`); process.exit(1); }
    console.log(`✓ ${outPath} al día (${(html.length / 1024).toFixed(0)} KB, sha256 ${sha}…)`);
  } else {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.log(`✓ ${outPath} · ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB · sha256 ${sha}…`);
  }
}
