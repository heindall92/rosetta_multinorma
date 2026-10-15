/* E2E de las exportaciones: cada fichero que descarga Rosetta se abre, se lee y vuelve a entrar sin pérdidas.
 * Para los nueve casos, en español y en inglés: Excel (SheetJS, sin fórmulas, nombres de hoja válidos, SoA del ENS
 * con sus refuerzos), informe Markdown (tablas regulares), plan y controles en CSV (BOM UTF-8, columnas constantes,
 * sin inyección de fórmulas), proyecto JSON (ida y vuelta idéntica), sobre para CTEM-Nexus y copia de seguridad.
 * Fuera de la CI se comprobó además con openpyxl, LibreOffice Calc y el esquema de yrd-ecosistema (2.13.0). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist/index.html');
const require = createRequire(import.meta.url);
const XLSX = require('../src/vendor/sheetjs-0.20.3.full.min.js');
const CASOS = require('../src/data/casos.json').map((c) => c.id);
let browser, ctx, page; const errors = [];

before(async () => {
  assert.ok(existsSync(DIST), 'falta dist/index.html: ejecuta «npm run build»');
  browser = await chromium.launch({ headless: true });
  ctx = await browser.newContext({ acceptDownloads: true, locale: 'es-ES' });
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(DIST).href);
  await page.waitForFunction(() => window.__ROSETTA__);
});
after(async () => { await browser?.close(); });

const act = (a, data = {}) => page.evaluate(([a, d]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, d); b.hidden = true; document.body.append(b); b.click(); b.remove(); }, [a, data]);
/* Las descargas se lanzan por código, sin gesto del usuario: Chromium puede retener alguna seguida. Un reintento basta. */
async function descarga(a) {
  for (let i = 0; i < 2; i++) {
    const dl = page.waitForEvent('download', { timeout: 15000 });
    await act(a);
    try { const d = await dl; return { name: d.suggestedFilename(), buf: readFileSync(await d.path()) }; } catch (e) { if (i) throw e; await page.waitForTimeout(500); }
  }
}
function csvFilas(buf) {
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'CSV con BOM UTF-8: Excel muestra bien las tildes');
  const txt = buf.toString('utf8').slice(1); const sep = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const filas = []; let fila = [], campo = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') q = false; else campo += c; }
    else if (c === '"') q = true; else if (c === sep) { fila.push(campo); campo = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.length > 1 || f[0]);
}
function comprobarExcel(nombre, buf, lang) {
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });
  assert.ok(wb.SheetNames.length >= 5, nombre);
  assert.equal(new Set(wb.SheetNames).size, wb.SheetNames.length, `${nombre}: hojas repetidas`);
  for (const n of wb.SheetNames) {
    assert.ok(n.length <= 31 && !/[:\\/?*[\]]/.test(n), `${nombre}: hoja «${n}»`);
    for (const [k, c] of Object.entries(wb.Sheets[n])) if (!k.startsWith('!')) assert.ok(!c.f, `${nombre}: fórmula en ${n}!${k}`);
  }
  const soa = wb.SheetNames.find((n) => n.startsWith('SoA ENS')); assert.ok(soa, `${nombre}: sin SoA ENS`);
  const cab = XLSX.utils.sheet_to_json(wb.Sheets[soa], { header: 1 })[0];
  assert.ok(cab.includes(lang === 'en' ? 'Reinforcements implemented' : 'Refuerzos implantados'), `${nombre}: sin columna de refuerzos`);
}
function comprobarMd(nombre, txt) {
  assert.match(txt, /^# /, `${nombre}: sin título`);
  let bloque = [];
  for (const l of [...txt.split('\n'), '']) {
    if (l.startsWith('|')) { bloque.push(l); continue; }
    if (bloque.length) {
      const cols = bloque.map((x) => (x.match(/(?<!\\)\|/g) || []).length);
      assert.equal(new Set(cols).size, 1, `${nombre}: tabla con filas desiguales («${bloque[0].slice(0, 50)}»)`);
      if (bloque.length > 1) assert.match(bloque[1], /^\|[\s:\-|]+\|$/, `${nombre}: tabla sin separador`);
      bloque = [];
    }
  }
}

for (const lang of ['es', 'en']) {
  test(`exportaciones de los nueve casos en ${lang === 'es' ? 'español' : 'inglés'}: se abren y vuelven a entrar`, async () => {
    if (lang === 'en') await act('lang', { v: 'en' });
    for (const caso of CASOS) {
      await page.evaluate((c) => { window.__ROSETTA__.openCase(c); window.__ROSETTA__.go('exportar'); }, caso);
      const x = await descarga('export-xlsx'); assert.match(x.name, /\.xlsx$/); comprobarExcel(`${caso} ${x.name}`, x.buf, lang);
      const md = await descarga('export-md'); assert.match(md.name, /\.md$/); comprobarMd(`${caso} ${md.name}`, md.buf.toString('utf8'));
      for (const a of ['export-plan', 'export-ctl']) {
        const c = await descarga(a); assert.match(c.name, /\.csv$/);
        const filas = csvFilas(c.buf); assert.ok(filas.length >= 2, `${caso} ${c.name}: sin filas`);
        assert.equal(new Set(filas.map((f) => f.length)).size, 1, `${caso} ${c.name}: columnas desiguales`);
        for (const f of filas) for (const v of f) assert.ok(!/^[=+@]/.test(v) && !/^-[^\d]/.test(v), `${caso} ${c.name}: celda que Excel tomaría por fórmula: ${v.slice(0, 30)}`);
      }
      const ctem = JSON.parse((await descarga('export-ctem')).buf.toString('utf8'));
      assert.equal(ctem.format, 'yrd-ecosistema'); assert.equal(ctem.version, 1); assert.equal(ctem.tipo, 'controles'); assert.equal(ctem.datos.length, 152);
      const pj = await descarga('export-json'); const original = JSON.parse(pj.buf.toString('utf8'));
      // Ida y vuelta: el proyecto exportado se importa y queda idéntico
      const ch = page.waitForEvent('filechooser'); await act('import-json');
      await (await ch).setFiles({ name: pj.name, mimeType: 'application/json', buffer: pj.buf }); await page.waitForTimeout(300);
      const vuelta = await page.evaluate(() => JSON.parse(JSON.stringify(window.__ROSETTA__.state)));
      for (const k of ['proyecto', 'alcance', 'controles', 'exclusiones', 'refuerzos', 'perfil', 'nis2q', 'acciones']) assert.deepEqual(vuelta[k], original[k], `${caso}: ${k} cambia al reimportar`);
    }
    assert.deepEqual(errors.splice(0), []);
  });
}

test('la copia de seguridad se descarga, es válida y restaura todos los proyectos', async () => {
  const n0 = await page.evaluate(() => window.__ROSETTA__.ws.projects.length);
  const b = await descarga('backup'); const o = JSON.parse(b.buf.toString('utf8'));
  assert.equal(o.kind, 'rosetta-backup'); assert.equal(o.projects.length, n0); assert.ok(n0 >= 10, `proyectos: ${n0}`);
  const ctx2 = await browser.newContext(); await ctx2.route(/^https?:\/\//, (r) => r.abort()); const p2 = await ctx2.newPage();
  await p2.goto(pathToFileURL(DIST).href); await p2.waitForFunction(() => window.__ROSETTA__);
  const ch = p2.waitForEvent('filechooser');
  await p2.evaluate(() => { const x = document.createElement('button'); x.dataset.act = 'import-json'; x.hidden = true; document.body.append(x); x.click(); x.remove(); });
  await (await ch).setFiles({ name: b.name, mimeType: 'application/json', buffer: b.buf }); await p2.waitForTimeout(400);
  assert.equal(await p2.evaluate(() => window.__ROSETTA__.ws.projects.length), n0);
  await ctx2.close();
});
