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

test('por defecto: tema claro, español y acento azul eléctrico (también al migrar ajustes antiguos)', async () => {
  const r = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, accent: document.documentElement.dataset.accent, lang: document.documentElement.lang }));
  assert.deepEqual(r, { theme: 'light', accent: 'azul', lang: 'es' });
  const p2 = await ctx.newPage();
  await p2.goto(URL_APP);
  await p2.evaluate(() => localStorage.setItem('rosetta/v1/ws', JSON.stringify({ settings: { tema: 'sistema', acento: 'rosa', lang: 'es' } })));
  await p2.reload(); await p2.waitForFunction(() => window.__ROSETTA__);
  assert.deepEqual(await p2.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.accent]), ['light', 'azul']);
  await p2.evaluate(() => { localStorage.setItem('rosetta/v1/ws', JSON.stringify({ settings: { tema: 'oscuro', acento: 'verde', def: 2 } })); });
  await p2.reload(); await p2.waitForFunction(() => window.__ROSETTA__);
  assert.deepEqual(await p2.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.accent]), ['dark', 'verde'], 'se respeta la elección del usuario');
  await p2.evaluate(() => localStorage.clear()); await p2.close();
});

test('el prototipo de Object queda congelado', async () => {
  assert.equal(await page.evaluate(() => Object.isFrozen(Object.prototype)), true);
});

test('sin proyecto: el menú está activo y cada vista de proyecto explica cómo empezar', async () => {
  const p2 = await ctx.newPage();
  await p2.goto(URL_APP); await p2.waitForFunction(() => window.__ROSETTA__);
  await p2.evaluate(() => localStorage.clear()); await p2.reload(); await p2.waitForFunction(() => window.__ROSETTA__);
  assert.equal(await p2.locator('#dock .nav-i[disabled]').count(), 0, 'ninguna opción desactivada');
  assert.equal(await p2.locator('#dock .nav-i.locked').count(), 9);
  assert.match(await p2.locator('#nav-note').innerText(), /Sin proyecto abierto/);
  await p2.click('#dock .nav-i[data-view="brechas"]');
  assert.equal(await p2.evaluate(() => window.__ROSETTA__.ui.view), 'brechas');
  assert.match(await p2.locator('#view').innerText(), /Esta vista muestra los requisitos sin cubrir/);
  assert.equal(await p2.locator('#view .start').count(), 3);
  await p2.click('#view [data-act="open-case"]');
  await p2.waitForFunction(() => window.__ROSETTA__.state);
  assert.deepEqual(await p2.evaluate(() => [window.__ROSETTA__.state.caseId, window.__ROSETTA__.ui.view]), ['techserv', 'brechas'], 'abre el caso en la vista pedida');
  assert.equal(await p2.locator('#dock .nav-i.locked').count(), 0);
  await p2.evaluate(() => localStorage.clear()); await p2.close();
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

test('centro de ayuda: buscador, temas y «Acerca de» con los enlaces del autor', async () => {
  await page.evaluate(() => { window.__ROSETTA__.ui.helpTab = 'inicio'; window.__ROSETTA__.go('ayuda'); });
  assert.equal(await page.locator('.help-topic').count(), 7);
  await page.fill('#help-q', 'exclu'); await page.waitForTimeout(300);
  assert.match(await page.locator('#help-res').innerText(), /\d+ resultados?/);
  assert.ok(await page.locator('.help-faq mark').count() > 0, 'resalta la búsqueda');
  await page.fill('#help-q', 'zzzz'); await page.waitForTimeout(300);
  assert.equal(await page.locator('.help-faq').count(), 0);
  await page.fill('#help-q', ''); await page.waitForTimeout(300);
  await page.click('.help-topic[data-id="io"]');
  assert.equal(await page.locator('#help-io details').first().getAttribute('open'), '');
  await page.click('[data-act="help-tab"][data-tab="acerca"]');
  const links = await page.locator('.about-links a').evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.href, a.target, a.rel]));
  for (const host of ['linkedin.com/in/yoandyrd92', 'github.com/heindall92', 'yoandyramirez.com', 'hackthebox.com', 'mailto:yoandyramirezdelgado@gmail.com'])
    assert.ok(links.some(([, h]) => h.includes(host)), `falta ${host}`);
  for (const [, h, tg, rel] of links) if (h.startsWith('http')) { assert.equal(tg, '_blank'); assert.match(rel, /noopener/); }
  // Herramientas GRC del autor: siete tarjetas, Rosetta marcada y sin enlace a sí misma
  assert.equal(await page.locator('.suite-card').count(), 7);
  assert.match(await page.locator('.suite-card.here').innerText(), /Rosetta[\s\S]*Estás aquí/);
  assert.equal(await page.locator('.suite-card.here a').count(), 1, 'la tarjeta actual solo enlaza al código');
  const suite = await page.locator('.suite a').evaluateAll((as) => as.map((a) => [a.href, a.target, a.rel]));
  for (const host of ['heindall92.github.io/argos-grc', 'github.com/heindall92/argos-grc', 'heindall92.github.io/kairos', 'github.com/heindall92/kairos', 'heindall92.github.io/grc_ens_compliance_studio', 'github.com/heindall92/grc_ens_compliance_studio', 'github.com/heindall92/rosetta_multinorma', 'heindall92.github.io/ctem-nexus', 'heindall92.github.io/ens_ad-auditor', 'github.com/heindall92/Norvik_Gobernanza'])
    assert.ok(suite.some(([h]) => h.includes(host)), `falta ${host}`);
  for (const [, tg, rel] of suite) { assert.equal(tg, '_blank'); assert.match(rel, /noopener/); }
  noErrors('ayuda');
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
  // Espera a que el ancho llegue al valor (la transición dura 0,38 s; en CI puede ir más lenta)
  const waitW = async (x, msg) => { await p.waitForFunction((v) => Math.round(document.getElementById('dock').getBoundingClientRect().width) === v, x, { timeout: 5000 }).catch(() => {}); assert.equal(await w(), x, msg); };
  await waitW(264, 'desplegada a 1440 px');
  const pad1 = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft));
  // el resaltado se desliza hasta la opción bajo el puntero
  const g0 = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-glow')).transform);
  // (si la barra se vuelve a pintar bajo un puntero quieto, :hover no se recalcula hasta que se mueve)
  const nudge = async (sel) => { const b = await p.locator(sel).boundingBox(); await p.mouse.move(b.x + 20, b.y + 10); await p.mouse.move(b.x + 22, b.y + 12); };
  await nudge('.nav-i[data-view="plan"]');
  await p.waitForFunction((g) => getComputedStyle(document.querySelector('.nav-glow')).transform !== g, g0, { timeout: 5000 }).catch(() => {});
  const g1 = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-glow')).transform);
  assert.notEqual(g0, g1, JSON.stringify(await p.evaluate(() => ({ hov: document.querySelector('.nav-i:hover')?.dataset.view, el: document.elementFromPoint(100, 400)?.className, mini: document.documentElement.hasAttribute('data-mini'), w: document.getElementById('dock').offsetWidth }))));
  // plegar con «[»: compacta y el contenido gana espacio
  await p.mouse.move(1000, 400); await p.keyboard.press('['); await waitW(76, 'compacta');
  await p.waitForFunction(() => Math.round(parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft)) === 116, null, { timeout: 5000 }).catch(() => {});
  const pad2 = await p.evaluate(() => Math.round(parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft)));
  assert.ok(pad2 < pad1 - 150, `padding ${pad1} → ${pad2}`);
  assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('.nav-i .lbl')).opacity), '0');
  // al pasar el ratón se despliega por encima sin mover el contenido
  await nudge('.nav-i[data-view="controles"]'); await waitW(264, 'desplegada al pasar el ratón');
  assert.equal(await p.evaluate(() => Math.round(parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft))), pad2, 'el contenido no se desplaza');
  await p.mouse.move(1000, 400); await p.mouse.move(1010, 410); await waitW(76, 'plegada al salir');
  // por teclado también se despliega
  for (let i = 0; i < 40 && !(await p.evaluate(() => !!document.activeElement?.closest('#dock'))); i++) await p.keyboard.press('Shift+Tab');
  await waitW(264, 'desplegada con foco de teclado');
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

test('refuerzos del ENS: ficha con casillas y texto del BOE, cobertura, CO-25, deshacer, Alcance y saneado', async () => {
  const E2 = (fn, arg) => page.evaluate(fn, arg);
  const act = (a, data = {}) => E2(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); b.hidden = true; document.body.append(b); b.click(); b.remove(); }, [a, data]);
  await E2(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.ui.normaFw = 'ens'; window.__ROSETTA__.go('normas'); }); await page.waitForTimeout(200);
  assert.match(await page.locator('#view').innerText(), /2 sin sus refuerzos/);
  const fila = () => E2(() => { const r = window.__ROSETTA__.calc.req.ens.find((x) => x.id === 'op.acc.6'); return { estado: r.estado, falta: r.refuerzos.faltan }; });
  assert.deepEqual(await fila(), { estado: 'parcial', falta: ['R8'] });
  await act('insp-req', { fw: 'ens', id: 'op.acc.6' }); await page.waitForTimeout(150);
  const insp = await page.locator('#insp').innerText();
  assert.match(insp, /Refuerzos · Nivel Alto/i); assert.match(insp, /5 de 6 exigencias de refuerzo cumplidas/); assert.match(insp, /Doble factor para acceso desde o a través de zonas no controladas/);
  assert.equal(await page.locator('#insp summary', { hasText: 'Texto del RD 311/2022' }).count(), 9);
  const r8 = page.locator('#insp input[data-ref="op.acc.6"][data-r="R8"]');
  assert.equal(await r8.isChecked(), false);
  await r8.check(); await page.waitForTimeout(250);
  assert.deepEqual(await fila(), { estado: 'cubierto', falta: [] });
  const co25 = () => E2(() => window.__ROSETTA__.hall.filter((h) => h.id === 'CO-25').map((h) => h.reqs || [h.req]).flat());
  assert.deepEqual(await co25(), ['mp.s.2']);
  await page.locator('body').press('Control+z'); await page.waitForTimeout(250);
  assert.deepEqual(await fila(), { estado: 'parcial', falta: ['R8'] }, 'deshacer quita el refuerzo');
  await act('insp-close');
  await E2(() => window.__ROSETTA__.go('alcance')); await page.waitForTimeout(150);
  assert.equal(await page.locator('#set-ens-ref').isChecked(), true);
  await page.uncheck('#set-ens-ref'); await page.waitForTimeout(250);
  assert.deepEqual(await co25(), [], 'sin evaluación no hay CO-25');
  assert.equal((await fila()).estado, 'cubierto');
  await page.check('#set-ens-ref'); await page.waitForTimeout(200);
  // Proyecto anterior a la 2.13.0 (sin la marca) y refuerzos hostiles
  await importJson(null, `{"proyecto":{"nombre":"Antiguo"},"alcance":{"ens":{"on":true,"categoria":"ALTA"}},"controles":{},
    "refuerzos":{"op.acc.6":["R8","R99","R8","<b>x</b>"],"zz.9":["R1"],"mp.s.2":"R3","__proto__":{"polluted":"yes"}}}`);
  const r = await E2(() => { const s = window.__ROSETTA__.state; return { ev: s.alcance.ens.refuerzos, ref: s.refuerzos, polluted: ({}).polluted }; });
  assert.deepEqual(r, { ev: false, ref: { 'op.acc.6': ['R8'] }, polluted: undefined });
  noErrors('refuerzos');
});

test('2.15.0: perfiles de cumplimiento del CCN en Alcance, ficha, CO-26, condición, idioma y saneado', async () => {
  const E2 = (fn, arg) => page.evaluate(fn, arg);
  const act = (a, data = {}) => E2(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); b.hidden = true; document.body.append(b); b.click(); b.remove(); }, [a, data]);
  const ens = () => E2(() => { const R = window.__ROSETTA__; return { ap: R.calc.fw.ens.aplicables, ne: R.calc.fw.ens.noExigidos, co26: R.hall.filter((h) => h.id === 'CO-26').length, perfil: R.state.alcance.ens.perfil }; });
  await E2(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go('alcance'); }); await page.waitForTimeout(200);
  const sinPerfil = await ens(); assert.equal(sinPerfil.perfil, ''); assert.equal(sinPerfil.co26, 0);
  assert.match(await viewText(), /CCN-STIC 892 se retiró el 28 mar 2025/);
  await page.selectOption('#set-pce', '890a'); await page.waitForTimeout(250);
  let x = await ens(); assert.equal(x.perfil, '890a'); assert.equal(x.co26, 1, 'techserv es de categoría ALTA');
  assert.equal(x.ne, sinPerfil.ne, 'fuera de su ámbito el perfil no se aplica: se calcula con el anexo II');
  assert.match(await viewText(), /es para sistemas de categoría Básica y este sistema es de categoría Alta/);
  assert.match(await viewText(), /Ayuntamientos de menos de 5\.000 habitantes.*Exige 38 medidas/s);
  // Sistema en el ámbito del perfil: categoría BÁSICA y niveles en BAJO
  await page.selectOption('#set-cat', 'BÁSICA'); for (const d of ['D', 'I', 'C', 'A', 'T']) await page.selectOption(`#set-dim-${d}`, 'BAJO'); await page.waitForTimeout(250);
  x = await ens(); assert.equal(x.co26, 0); assert.equal(x.ne, 35);
  assert.equal(await page.locator('.perfil-ccn .callout').count(), 0);
  await page.check('#set-pce-nis2'); await page.waitForTimeout(250);
  assert.equal((await ens()).ne, 34, 'con servicios NIS2 se exige op.cont.2');
  await page.locator('body').press('Control+z'); await page.waitForTimeout(250);
  assert.equal((await ens()).ne, 35, 'deshacer quita la condición');
  await act('insp-req', { fw: 'ens', id: 'op.ext.1' }); await page.waitForTimeout(150);
  assert.match(await page.locator('#insp').innerText(), /No exigida por el perfil de cumplimiento CCN-STIC 890A/);
  await act('insp-req', { fw: 'ens', id: 'op.cont.2' }); await page.waitForTimeout(150);
  assert.match(await page.locator('#insp').innerText(), /solo la exige si la entidad presta servicios de los anexos I y II de NIS2/);
  await act('insp-req', { fw: 'ens', id: 'op.pl.1' }); await page.waitForTimeout(150);
  let insp = await page.locator('#insp').innerText();
  assert.match(insp, /Criterio de la CCN-STIC 890A/); assert.match(insp, /Plataforma de Gobernanza del CCN/); assert.match(insp, /Nivel Bajo · .*CCN-STIC 890A/);
  await act('lang', { v: 'en' }); await page.waitForTimeout(200);
  await act('insp-req', { fw: 'ens', id: 'op.pl.1' }); await page.waitForTimeout(150);
  insp = await page.locator('#insp').innerText(); assert.match(insp, /CCN-STIC 890A criterion/); assert.match(insp, /CCN Governance Platform/);
  await act('insp-close'); await act('lang', { v: 'es' }); await page.waitForTimeout(200);
  // 881A: refuerzo añadido por el perfil
  await page.selectOption('#set-pce', '881a'); await page.selectOption('#set-cat', 'MEDIA'); await page.waitForTimeout(250);
  assert.equal(await E2(() => window.__ROSETTA__.calc.req.ens.find((r) => r.id === 'op.exp.6').exigencia), 'aplica + R4');
  assert.equal(await page.locator('#set-pce-evidencia').count(), 1); assert.equal(await page.locator('#set-pce-nis2').count(), 0);
  // Saneado al importar: perfil desconocido y condiciones que no son booleanas o no existen
  await importJson(null, '{"proyecto":{"nombre":"Hostil"},"alcance":{"ens":{"on":true,"categoria":"BÁSICA","perfil":"<img src=x>","perfilCond":{"nis2":"yes","foo":true,"evidencia":true}}},"controles":{}}');
  assert.deepEqual(await E2(() => ({ p: window.__ROSETTA__.state.alcance.ens.perfil, c: window.__ROSETTA__.state.alcance.ens.perfilCond })), { p: '', c: { evidencia: true } });
  await importJson({ proyecto: { nombre: 'Municipio' }, alcance: { ens: { on: true, categoria: 'BÁSICA', perfil: '890a', perfilCond: { nis2: true } } }, controles: {} });
  assert.deepEqual(await E2(() => ({ p: window.__ROSETTA__.state.alcance.ens.perfil, c: window.__ROSETTA__.state.alcance.ens.perfilCond })), { p: '890a', c: { nis2: true } });
  noErrors('perfiles CCN');
});

test('2.14.0: la rueda se recorre con el teclado (una parada de tabulador, flechas, Av/Re Pág, Inicio, Fin, Intro y Esc)', async () => {
  await page.evaluate(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go('panel'); }); await page.waitForTimeout(700);
  const sp = '.wheel:not(.hero) .spoke';
  assert.equal(await page.locator(`${sp}[tabindex="0"]`).count(), 1, 'una sola parada de tabulador');
  assert.equal(await page.locator(sp).count(), 152);
  assert.equal(await page.locator('.wheel:not(.hero)').getAttribute('role'), 'group');
  await page.locator(`${sp}[tabindex="0"]`).focus();
  const st = () => page.evaluate(() => ({ id: document.activeElement.dataset.id, core: document.querySelector('.wheel:not(.hero) .core-v').textContent, label: document.activeElement.getAttribute('aria-label') }));
  let s = await st(); assert.equal(s.id, 'GOB-01'); assert.equal(s.core, 'GOB-01'); assert.match(s.label, /^GOB-01 · .+ · /);
  await page.keyboard.press('ArrowRight'); assert.equal((await st()).id, 'GOB-02');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); assert.equal((await st()).id, 'PRI-10', 'da la vuelta');
  await page.keyboard.press('Home'); await page.keyboard.press('PageDown'); assert.equal((await st()).id, 'RIE-01', 'Av Pág salta de dominio');
  await page.keyboard.press('PageUp'); assert.equal((await st()).id, 'GOB-01');
  await page.keyboard.press('End'); assert.equal((await st()).id, 'PRI-10');
  assert.equal(await page.locator(`${sp}[tabindex="0"]`).count(), 1);
  await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(() => window.__ROSETTA__.ui.insp && window.__ROSETTA__.ui.insp.id), 'PRI-10');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), 'PRI-10', 'el foco vuelve al control de la rueda');
  noErrors('rueda con teclado');
});

test('2.14.0: acciones en bloque sobre los controles filtrados, con un solo deshacer', async () => {
  await page.evaluate(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go('controles'); }); await page.waitForTimeout(300);
  const parciales = () => page.evaluate(() => Object.values(window.__ROSETTA__.state.controles).filter((c) => c.estado === 'parcial').length);
  const total = await parciales();
  await page.click('[data-act="uc-estado"][data-v="parcial"]'); await page.waitForTimeout(200);
  const visibles = await page.locator('#view .li[data-act="insp-uc"]').count();
  await page.click('.bulk > summary');
  assert.match(await page.locator('.bulk').innerText(), new RegExp(`${visibles} controles visibles`));
  await page.click('[data-act="bulk-apply"]'); await page.waitForTimeout(150);
  assert.equal(await parciales(), total, 'sin nada elegido no cambia nada');
  await page.selectOption('#bulk-estado', 'implantado'); await page.fill('#bulk-resp', 'Responsable de Seguridad (bloque)'); await page.fill('#bulk-rev', '2026-10-01');
  await page.click('[data-act="bulk-apply"]'); await page.waitForTimeout(250);
  assert.equal(await parciales(), total - visibles);
  const ej = await page.evaluate(() => Object.values(window.__ROSETTA__.state.controles).filter((c) => c.responsable === 'Responsable de Seguridad (bloque)'));
  assert.equal(ej.length, visibles); assert.ok(ej.every((c) => c.estado === 'implantado' && c.revision === '2026-10-01'));
  await page.locator('body').press('Control+z'); await page.waitForTimeout(250);
  assert.equal(await parciales(), total, 'un solo Ctrl + Z deshace el bloque entero');
  noErrors('acciones en bloque');
});

test('2.14.0: el redibujado parcial conserva los nodos que no cambian, el foco y el scroll', async () => {
  await page.evaluate(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.ui.ucEstado = 'todos'; window.__ROSETTA__.go('controles'); }); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__marca = document.querySelector('#uc-PRI-10'); });
  const btn = page.locator('[data-act="set-state"][data-id="OPE-09"][data-v="parcial"]'); await btn.focus(); // enfocar desplaza hasta el botón
  const y0 = await page.evaluate(() => window.scrollY); assert.ok(y0 > 300, `scroll de partida ${y0}`);
  await btn.press('Enter'); await page.waitForTimeout(250);
  const r = await page.evaluate(() => ({ mismo: window.__marca === document.querySelector('#uc-PRI-10'), y: window.scrollY, foco: document.activeElement.dataset.id + ' ' + document.activeElement.dataset.v, pressed: document.querySelector('[data-act="set-state"][data-id="OPE-09"][data-v="parcial"]').getAttribute('aria-pressed') }));
  assert.equal(r.mismo, true, 'la fila de PRI-10 es el mismo nodo: no se redibujó');
  assert.equal(r.y, y0, 'el scroll no salta'); assert.equal(r.foco, 'OPE-09 parcial'); assert.equal(r.pressed, 'true');
  await page.evaluate(() => window.__ROSETTA__.go('normas')); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => !!window.__marca && window.__marca.isConnected), false, 'al cambiar de vista sí se redibuja entera');
  noErrors('redibujado parcial');
});
