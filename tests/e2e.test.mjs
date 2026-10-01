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
  assert.match(await viewText(), /Cumplimiento multinorma/);
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

test('deshacer y rehacer (botón del aviso y Ctrl+Z / Ctrl+Mayús+Z)', async () => {
  await page.evaluate(() => window.__ROSETTA__.openCase('citafacil'));
  await page.evaluate(() => window.__ROSETTA__.go('controles'));
  const id = await page.evaluate(() => Object.entries(window.__ROSETTA__.state.controles).find(([, c]) => c.estado === 'pendiente')[0]);
  const est = () => page.evaluate((x) => window.__ROSETTA__.state.controles[x].estado, id);
  await page.evaluate((x) => { const b = document.createElement('button'); b.dataset.act = 'set-state'; b.dataset.id = x; b.dataset.v = 'implantado'; b.hidden = true; document.body.append(b); b.click(); b.remove(); }, id);
  assert.equal(await est(), 'implantado');
  await page.locator('#toast [data-act="undo"]').click();
  assert.equal(await est(), 'pendiente', 'el botón Deshacer revierte');
  await page.locator('body').press('Control+Shift+z');
  assert.equal(await est(), 'implantado', 'Ctrl+Mayús+Z rehace');
  await page.locator('body').press('Control+z');
  assert.equal(await est(), 'pendiente', 'Ctrl+Z deshace');
  await page.evaluate(() => window.__ROSETTA__.openCase('techserv'));
  await page.locator('body').press('Control+z');
  assert.match(await page.locator('#toast').innerText(), /No hay cambios|Nothing to undo/, 'la pila se vacía al cambiar de proyecto');
  noErrors('deshacer');
});

test('idioma: inglés y vuelta a español (interruptor de Ajustes)', async () => {
  await page.evaluate(() => window.__ROSETTA__.go('ajustes'));
  await page.locator('#view [data-act="lang"][data-v="en"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  await page.evaluate(() => window.__ROSETTA__.go('inicio'));
  assert.match(await viewText(), /Multi-framework compliance/i);
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

test('barra lateral: fija, compacta con despliegue al pasar el ratón y por teclado', async () => {
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx2.route(/^https?:\/\//, (r) => r.abort());
  const p = await ctx2.newPage();
  await p.goto(URL_APP); await p.waitForFunction(() => window.__ROSETTA__);
  await p.evaluate(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go('brechas'); });
  const w = () => p.evaluate(() => Math.round(document.getElementById('dock').getBoundingClientRect().width));
  const settle = () => p.waitForTimeout(1000);
  await settle(); assert.equal(await w(), 264, 'desplegada a 1440 px');
  const pad1 = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft));
  // el resaltado se desliza hasta la opción bajo el puntero
  const g0 = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-glow')).transform);
  // (si la barra se vuelve a pintar bajo un puntero quieto, :hover no se recalcula hasta que se mueve)
  const nudge = async (sel) => { const b = await p.locator(sel).boundingBox(); await p.mouse.move(b.x + 20, b.y + 10); await p.mouse.move(b.x + 22, b.y + 12); };
  await nudge('.nav-i[data-view="plan"]'); await settle();
  const g1 = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-glow')).transform);
  assert.notEqual(g0, g1, JSON.stringify(await p.evaluate(() => ({ hov: document.querySelector('.nav-i:hover')?.dataset.view, el: document.elementFromPoint(100, 400)?.className, mini: document.documentElement.hasAttribute('data-mini'), w: document.getElementById('dock').offsetWidth }))));
  // plegar con «[»: compacta y el contenido gana espacio
  await p.mouse.move(1000, 400); await p.keyboard.press('['); await settle();
  assert.equal(await w(), 76, 'compacta ' + JSON.stringify(await p.evaluate(() => ({ mini: document.documentElement.hasAttribute('data-mini'), act: document.activeElement?.outerHTML.slice(0, 80), fv: !!document.querySelector('.dock :focus-visible'), hov: !!document.querySelector('.dock:hover') }))));
  const pad2 = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft));
  assert.ok(pad2 < pad1 - 150, `padding ${pad1} → ${pad2}`);
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.nav-i .lbl')).opacity), '0');
  // al pasar el ratón se despliega por encima sin mover el contenido
  await nudge('.nav-i[data-view="controles"]'); await settle();
  assert.equal(await w(), 264, 'desplegada al pasar el ratón');
  assert.equal(await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft)), pad2);
  await p.mouse.move(1000, 400); await p.mouse.move(1010, 410); await settle();
  assert.equal(await w(), 76, 'plegada al salir ' + JSON.stringify(await p.evaluate(() => ({ act: document.activeElement?.className, fv: !!document.querySelector('.dock :focus-visible'), hov: !!document.querySelector('.dock:hover') }))));
  // por teclado también se despliega
  for (let i = 0; i < 40 && !(await p.evaluate(() => !!document.activeElement?.closest('#dock'))); i++) await p.keyboard.press('Shift+Tab');
  await p.waitForFunction(() => document.getElementById('dock').getBoundingClientRect().width > 260, null, { timeout: 3000 }).catch(() => {});
  assert.equal(await w(), 264, 'desplegada con foco de teclado ' + JSON.stringify(await p.evaluate(() => ({ act: document.activeElement?.outerHTML.slice(0, 90), fv: !!document.querySelector('.dock :focus-visible'), x: getComputedStyle(document.getElementById('dock')).getPropertyValue('--x') }))));
  await ctx2.close();
});

test('barra lateral compacta en tableta (1100 px)', async () => {
  const ctx2 = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx2.route(/^https?:\/\//, (r) => r.abort());
  const p = await ctx2.newPage();
  await p.goto(URL_APP); await p.waitForFunction(() => window.__ROSETTA__);
  await p.mouse.move(900, 400); await p.waitForTimeout(600);
  assert.equal(await p.evaluate(() => Math.round(document.getElementById('dock').getBoundingClientRect().width)), 76);
  await p.click('.rail-tg'); await p.mouse.move(900, 400); await p.waitForTimeout(600);
  assert.equal(await p.evaluate(() => Math.round(document.getElementById('dock').getBoundingClientRect().width)), 264, 'el botón la despliega en táctil');
  await ctx2.close();
});

test('aviso si el navegador no deja guardar', async () => {
  const p2 = await ctx.newPage();
  await p2.goto(URL_APP); await p2.waitForFunction(() => window.__ROSETTA__);
  await p2.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('lleno', 'QuotaExceededError'); }; window.__ROSETTA__.openCase('aguas'); });
  await p2.waitForTimeout(300);
  const r = await p2.evaluate(() => ({ cls: document.getElementById('toast').className, txt: document.getElementById('toast').textContent, role: document.getElementById('toast').getAttribute('role') }));
  assert.match(r.txt, /no se están guardando|not being saved/);
  assert.equal(r.role, 'alert');
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
