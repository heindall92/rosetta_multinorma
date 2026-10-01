/* Tests del ensamblado: src/ → dist/index.html. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build, buildData, ROOT } from '../scripts/build.mjs';

const html = build();
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');

test('el build es determinista', () => assert.equal(build(), html));

test('no quedan directivas y el documento está bien formado', () => {
  assert.ok(!html.includes('<!-- @'));
  assert.match(html, /^<!doctype html>\n<html lang="es">/);
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

test('sin recursos externos salvo Google Fonts y la librería XLSX bajo demanda', () => {
  const urls = [...html.matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map((m) => new URL(m[0]).host);
  const allowed = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'www.w3.org']);
  const extra = [...new Set(urls)].filter((h) => !allowed.has(h));
  // Enlaces informativos (BOE, EUR-Lex, ISO, CCN…) se permiten solo como texto o href, nunca como <script src>/<link>.
  assert.ok(!/<script[^>]+src=/i.test(html), 'no debe haber <script src> externos');
  for (const h of extra) assert.ok(!new RegExp(`<link[^>]+${h.replace(/\./g, '\\.')}`).test(html), `<link> a ${h}`);
});
