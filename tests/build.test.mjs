/* Tests del ensamblado: src/ → dist/index.html. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build, buildData, ROOT, VENDOR, sri } from '../scripts/build.mjs';

const html = build();
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');

test('el build es determinista', () => assert.equal(build(), html));

test('no quedan directivas y el documento está bien formado', () => {
  assert.ok(!html.includes('<!-- @'));
  assert.match(html, /^<!doctype html>\n<html lang="es" data-theme="light" data-accent="azul">/);
  assert.match(html, /<\/body>\n<\/html>\n?$/);
  assert.equal((html.match(/<script>/g) || []).length, (html.match(/<\/script>/g) || []).length);
  assert.equal((html.match(/<script>/g) || []).length, 3);
  assert.equal((html.match(/<style>/g) || []).length, 1);
});

test('incluye CSS, motor y todos los módulos en orden', () => {
  assert.ok(html.includes(rd('src/styles/rosetta.css').trimEnd()));
  assert.ok(html.includes(rd('src/engine/rosetta-engine.js').trimEnd()));
  const mods = readdirSync(join(ROOT, 'src/app')).filter((f) => f.endsWith('.js')).sort();
  let last = -1;
  for (const m of mods) {
    const i = html.indexOf(`/* ===== ${m} ===== */`);
    assert.ok(i > last, `${m} ausente o fuera de orden`); last = i;
  }
});

test('los datos embebidos equivalen a src/data', () => {
  const m = html.match(/window\.ROSETTA_DATA = (.*);\n/);
  assert.ok(m);
  const d = JSON.parse(m[1]);
  for (const k of ['catalog', 'casos', 'parejas', 'icons']) assert.deepEqual(d[k], JSON.parse(rd(`src/data/${k}.json`)), k);
});

test('una cadena con </script> en los datos se escapa', () => {
  assert.ok(!/<\/script/i.test(buildData(['parejas'])));
  const s = JSON.stringify({ x: '</script><img src=x onerror=alert(1)>' }).replace(/<\/(script)/gi, '<\\/$1');
  assert.equal(JSON.parse(s).x, '</script><img src=x onerror=alert(1)>');
});

test('dist/index.html versionado coincide con el build', () => {
  assert.equal(rd('dist/index.html'), html, 'ejecuta «npm run build» y versiona dist/index.html');
});

test('sin recursos externos al cargar: solo el CDN de respaldo de las librerías de Excel', () => {
  const urls = [...html.matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => new URL(m[0]).host);
  const allowed = new Set(['cdn.jsdelivr.net', 'www.w3.org']);
  const extra = [...new Set(urls)].filter((h) => !allowed.has(h));
  // Enlaces informativos (BOE, EUR-Lex, ISO, CCN…) se permiten solo como texto o href, nunca como <script src>/<link>.
  assert.ok(!/<script[^>]+src=/i.test(html), 'no debe haber <script src> externos');
  for (const h of extra) assert.ok(!new RegExp(`<link[^>]+${h.replace(/\./g, '\\.')}`).test(html), `<link> a ${h}`);
});

test('los hashes SRI del código coinciden con las librerías autoalojadas y sus CDN', () => {
  const core = rd('src/app/01-core.js');
  for (const v of VENDOR) {
    const h = sri(join(ROOT, 'src/vendor', v.file));
    assert.ok(core.includes(`file: 'vendor/${v.file}'`), `${v.file} no está en XLSX_LIBS`);
    assert.ok(core.includes(`cdn: '${v.cdn}', sri: '${h}'`), `SRI desactualizado para ${v.file}: ${h}`);
    assert.ok(html.includes(v.cdn), `la CSP no permite ${v.cdn}`);
  }
});

test('CSP en <meta> con default-src none, sin Google Fonts y con las fuentes incrustadas', () => {
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(csp, 'falta la CSP');
  assert.match(csp[1], /default-src 'none'/);
  assert.match(csp[1], /font-src data:/);
  assert.ok(!/unsafe-eval/.test(csp[1]));
  assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(html));
  assert.equal((html.match(/@font-face/g) || []).length, 3);
});

test('todos los iconos usados existen en la biblioteca (nombres actuales de Lucide)', () => {
  const ICONS = JSON.parse(rd('src/data/icons.json'));
  const src = readdirSync(join(ROOT, 'src/app')).map((f) => rd(join('src/app', f))).join('\n');
  const used = new Set([...src.matchAll(/icon\('([a-z0-9-]+)'/g)].map((m) => m[1]));
  for (const m of src.matchAll(/\['([a-z0-9-]+)', '[^']+', '[^']+', '(?:export-[a-z]+|backup)'/g)) used.add(m[1]); // tarjetas de Exportar
  for (const c of JSON.parse(rd('src/data/casos.json'))) used.add(c.icono);
  for (const d of JSON.parse(rd('src/data/catalog.json')).domains) used.add(d.ic);
  const missing = [...used].filter((n) => !ICONS[n]);
  assert.deepEqual(missing, []);
  for (const old of ['trash-2', 'circle-help', 'building-2', 'file-json', 'filter', 'fingerprint']) assert.ok(!ICONS[old], `alias obsoleto: ${old}`);
});
