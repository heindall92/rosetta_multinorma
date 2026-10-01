/* Prueba de extremo a extremo de dist/index.html en Chromium (Playwright).
 * Recorre todas las vistas con los cinco casos, cambia idioma y tema, modifica un control,
 * exporta CSV y comprueba las defensas ante ficheros hostiles (prototype pollution, CSV injection).
 * Las peticiones externas (Google Fonts, CDN) se bloquean: la app debe funcionar sin red. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist/index.html');
const URL_APP = pathToFileURL(DIST).href;
const PROJECT_VIEWS = ['panel', 'traductor', 'controles', 'normas', 'brechas', 'plan', 'mapa', 'alcance', 'exportar'];
const GLOBAL_VIEWS = ['inicio', 'nuevo', 'perfil', 'ajustes', 'ayuda'];
const CASES = JSON.parse(readFileSync(join(ROOT, 'src/data/casos.json'), 'utf8')).map((c) => c.id);

let browser, ctx, page;
const errors = [];

before(async () => {
  assert.ok(existsSync(DIST), 'falta dist/index.html: ejecuta «npm run build»');
  browser = await chromium.launch({ headless: true });
  ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL_APP);
  await page.waitForFunction(() => window.__ROSETTA__ && document.querySelector('#view').children.length > 0);
});
after(async () => { await browser?.close(); });

const noErrors = (where) => assert.deepEqual(errors.splice(0), [], `errores en ${where}`);
const viewText = () => page.locator('#view').innerText();

test('arranca en Inicio con el dock y sin errores', async () => {
  assert.equal(await page.title(), 'Rosetta multinorma');
  assert.equal(await page.evaluate(() => window.__ROSETTA__.ui.view), 'inicio');
  assert.ok((await page.locator('#dock').innerHTML()).length > 100);
  assert.match(await viewText(), /Implanta una vez/);
  noErrors('inicio');
});

test('el prototipo de Object queda congelado', async () => {
  assert.equal(await page.evaluate(() => Object.isFrozen(Object.prototype)), true);
});

test('vistas globales', async () => {
  for (const v of GLOBAL_VIEWS) {
    await page.evaluate((x) => window.__ROSETTA__.go(x), v);
    assert.equal(await page.evaluate(() => window.__ROSETTA__.ui.view), v);
    assert.ok((await viewText()).trim().length > 20, `vista ${v} vacía`);
    noErrors(v);
  }
});

for (const id of CASES) {
  test(`caso «${id}»: todas las vistas de proyecto`, async () => {
    await page.evaluate((x) => window.__ROSETTA__.openCase(x), id);
    await page.waitForFunction(() => window.__ROSETTA__.state);
    const st = await page.evaluate(() => ({ caso: window.__ROSETTA__.state.caseId, grado: window.__ROSETTA__.calc.kpi.grado }));
    assert.equal(st.caso, id);
    assert.ok(st.grado >= 0 && st.grado <= 1);
    for (const v of PROJECT_VIEWS) {
      await page.evaluate((x) => window.__ROSETTA__.go(x), v);
      assert.equal(await page.evaluate(() => window.__ROSETTA__.ui.view), v);
      assert.ok((await viewText()).trim().length > 20, `${id}/${v} vacía`);
      assert.equal(new URL(page.url()).hash, '#' + v);
      noErrors(`${id}/${v}`);
    }
  });
}

test('navegación real por el dock (clics)', async () => {
  await page.evaluate(() => window.__ROSETTA__.openCase('techserv'));
  for (const v of ['traductor', 'brechas', 'panel']) {
    await page.locator(`#dock [data-act="nav"][data-view="${v}"]`).first().click();
    assert.equal(await page.evaluate(() => window.__ROSETTA__.ui.view), v);
  }
  noErrors('dock');
});

test('cambiar el estado de un control recalcula la cobertura', async () => {
  await page.evaluate(() => window.__ROSETTA__.go('controles'));
  const before = await page.evaluate(() => ({ id: window.__ROSETTA__.prio[0].id, g: window.__ROSETTA__.calc.kpi.grado }));
  const btn = page.locator(`[data-act="set-state"][data-id="${before.id}"][data-v="implantado"]`).first();
  if (await btn.count()) await btn.click();
  else { // el interruptor también vive en el inspector
    await page.locator(`[data-act="insp-uc"][data-id="${before.id}"]`).first().click();
    await page.locator(`#insp [data-act="set-state"][data-id="${before.id}"][data-v="implantado"]`).first().click();
  }
  const after = await page.evaluate((id) => ({ e: window.__ROSETTA__.state.controles[id].estado, g: window.__ROSETTA__.calc.kpi.grado }), before.id);
  assert.equal(after.e, 'implantado');
  assert.ok(after.g > before.g, `el grado debería subir: ${before.g} → ${after.g}`);
  noErrors('set-state');
});

test('idioma: inglés y vuelta a español (interruptor de Ajustes)', async () => {
  await page.evaluate(() => window.__ROSETTA__.go('ajustes'));
  await page.locator('#view [data-act="lang"][data-v="en"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  await page.evaluate(() => window.__ROSETTA__.go('inicio'));
  assert.match(await viewText(), /Implement once/i);
  await page.evaluate(() => window.__ROSETTA__.go('ajustes'));
  await page.locator('#view [data-act="lang"][data-v="es"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'es');
  noErrors('idioma');
});

test('tema claro/oscuro', async () => {
  const t0 = await page.evaluate(() => document.documentElement.dataset.theme || 'sistema');
  await page.locator('[data-act="toggle-theme"]').first().click();
  const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
  assert.ok(['light', 'dark'].includes(t1));
  await page.locator('[data-act="toggle-theme"]').first().click();
  const t2 = await page.evaluate(() => document.documentElement.dataset.theme);
  assert.notEqual(t1, t2, `tema inicial ${t0}`);
  noErrors('tema');
});

/* ---------- Seguridad ---------- */
const tmp = mkdtempSync(join(tmpdir(), 'rosetta-e2e-'));
async function importJson(obj, raw) {
  const f = join(tmp, `p-${Date.now()}.json`);
  writeFileSync(f, raw ?? JSON.stringify(obj));
  const chooser = page.waitForEvent('filechooser');
  await page.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'import-json'; b.hidden = true; document.body.append(b); b.click(); b.remove(); });
  await (await chooser).setFiles(f);
  await page.waitForTimeout(400);
}

test('importar un proyecto hostil no contamina prototipos y se sanea', async () => {
  const hostile = `{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}},
    "proyecto":{"nombre":"<img src=x onerror=window.__xss=1>","organizacion":"Evil Corp"},
    "alcance":{"ens":{"on":true,"categoria":"ALTA"},"iso27001":{"on":true},"nis2":{"on":"yes"},"iso42001":{"on":false}},
    "controles":{"GOB-01":{"estado":"implantado","responsable":"=HYPERLINK(\\"http://evil.example\\",\\"x\\")","evidencias":"@SUM(1+1)"},
                 "NO-EXISTE":{"estado":"implantado"},"GOB-02":{"estado":"root"}}}`;
  await importJson(null, hostile);
  const r = await page.evaluate(() => {
    const s = window.__ROSETTA__.state;
    return { polluted: ({}).polluted, xss: window.__xss, nombre: s.proyecto.nombre, ghost: 'NO-EXISTE' in s.controles,
      gob02: s.controles['GOB-02'].estado, nis2on: s.alcance.nis2.on, imgs: document.querySelectorAll('#view img[src="x"], #dock img[src="x"]').length };
  });
  assert.equal(r.polluted, undefined);
  assert.equal(r.xss, undefined);
  assert.equal(r.ghost, false, 'un control fuera del catálogo no debe entrar');
  assert.equal(r.gob02, 'pendiente', 'un estado no válido se normaliza');
  assert.equal(r.nis2on, false, 'solo true estricto activa una norma');
  assert.equal(r.imgs, 0, 'el HTML de los datos nunca se inyecta');
  noErrors('import hostil');
});

test('la exportación CSV neutraliza fórmulas (CSV injection)', async () => {
  const dl = page.waitForEvent('download');
  await page.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'export-ctl'; b.hidden = true; document.body.append(b); b.click(); b.remove(); });
  const d = await dl;
  const csv = readFileSync(await d.path(), 'utf8');
  assert.match(d.suggestedFilename(), /\.csv$/);
  const row = csv.split(/\r\n/).find((l) => l.startsWith('GOB-01;'));
  assert.ok(row, 'fila GOB-01');
  assert.ok(row.includes(`"'=HYPERLINK(""http://evil.example"",""x"")"`) || row.includes(`'=HYPERLINK`), row);
  assert.ok(row.includes(`'@SUM(1+1)`), row);
  assert.ok(!/;=|;@|;\+|;-[^;]/.test(row.replace(/"[^"]*"/g, '""')), 'ninguna celda empieza por un carácter de fórmula');
  noErrors('export csv');
});

test('un localStorage manipulado no rompe el arranque', async () => {
  const p2 = await ctx.newPage();
  const errs = []; p2.on('pageerror', (e) => errs.push(e.message));
  await p2.goto(URL_APP);
  await p2.evaluate(() => { localStorage.setItem('rosetta/v1/ws', '{"__proto__":{"x":1},"activeId":"../../etc","projects":"nope","settings":{"lang":"<script>"}}'); });
  await p2.reload();
  await p2.waitForFunction(() => window.__ROSETTA__);
  assert.equal(await p2.evaluate(() => ({}).x), undefined);
  assert.equal(await p2.evaluate(() => window.__ROSETTA__.ui.view), 'inicio');
  assert.deepEqual(errs, []);
  await p2.evaluate(() => localStorage.clear());
  await p2.close();
});

test('vista móvil (390 px) sin desbordamiento horizontal', async () => {
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.route(/^https?:\/\//, (r) => r.abort());
  await m.goto(URL_APP);
  await m.waitForFunction(() => window.__ROSETTA__);
  for (const v of ['inicio', 'panel', 'traductor', 'controles']) {
    await m.evaluate((x) => { if (x !== 'inicio' && !window.__ROSETTA__.state) window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go(x); }, v);
    const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 1, `${v}: desborda ${over}px`);
  }
  await m.close();
});
