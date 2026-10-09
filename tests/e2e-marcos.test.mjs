/* Prueba de extremo a extremo de la 2.4.0 en Chromium: Part-IS, perfil regulatorio y marcos propios.
 * Importa ficheros hostiles (JSON y CSV), revisa el mapeo con sugerencias, exporta e informa, y comprueba que el
 * mapa circular solo dibuja las normas del alcance. Sin red: las peticiones externas se bloquean. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist/index.html');
const tmp = mkdtempSync(join(tmpdir(), 'rosetta-marcos-'));
let browser, ctx, page;
const errors = [];
const R = (fn, arg) => page.evaluate(fn, arg);
const noErrors = (where) => assert.deepEqual(errors.splice(0), [], `errores en ${where}`);
const act = (a, data = {}) => R(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); b.hidden = true; document.body.append(b); b.click(); b.remove(); }, [a, data]);
async function importar(nombre, contenido) {
  const f = join(tmp, nombre); writeFileSync(f, contenido);
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-act="mp-import"]');
  await (await chooser).setFiles(f); await page.waitForTimeout(350);
}
async function descarga(fn) { const dl = page.waitForEvent('download'); await fn(); const d = await dl; return { name: d.suggestedFilename(), text: readFileSync(await d.path(), 'utf8') }; }

before(async () => {
  assert.ok(existsSync(DIST), 'falta dist/index.html: ejecuta «npm run build»');
  browser = await chromium.launch({ headless: true });
  ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(pathToFileURL(DIST).href);
  await page.waitForFunction(() => window.__ROSETTA__ && document.querySelector('#view').children.length > 0);
});
after(async () => { await browser?.close(); });

test('caso de aviación: Part-IS en el mapa, con su prefijo, su matiz y sin exclusiones', async () => {
  await R(() => window.__ROSETTA__.openCase('alas'));
  assert.deepEqual(await R(() => window.__ROSETTA__.calc.alcance), ['iso27001', 'nis2', 'partis']);
  const rings = await page.locator('.wheel:not(.hero) .ring-lbl').allTextContents();
  assert.deepEqual(rings, ['27001', 'NIS2', 'Part-IS'], 'el mapa circular solo dibuja las normas del alcance');
  const leyenda = await page.locator('.wheel-legend').innerText();
  assert.match(leyenda, /Part-IS\s*obligatoria/); assert.match(leyenda, /27001\s*voluntaria/); const fuera = (await R(() => window.__ROSETTA__.FWV.length)) - 3; assert.match(leyenda, new RegExp(`\\+${fuera} fuera del alcance`));
  await act('goto-norma', { fw: 'partis' });
  assert.match(await page.locator('#view').innerText(), /IS\.I\.OR\.230/);
  await act('insp-req', { fw: 'partis', id: 'OR.230' });
  const insp = await page.locator('#insp').innerText();
  assert.match(insp, /Matiz de Part-IS/); assert.match(insp, /376\/2014/); assert.match(insp, /derogación completa/);
  assert.equal(await page.locator('#insp [data-exsw]').count(), 0, 'Part-IS no se puede excluir requisito a requisito');
  await act('insp-close');
  await R(() => window.__ROSETTA__.go('alcance'));
  await page.selectOption('#set-partis-reg', 'D'); await page.waitForTimeout(150);
  await act('goto-norma', { fw: 'partis' });
  assert.match(await page.locator('#view').innerText(), /IS\.D\.OR\.230/, 'el prefijo sigue al reglamento elegido');
  const hall = await R(() => window.__ROSETTA__.hall.map((h) => h.id));
  assert.ok(hall.includes('CO-12') && hall.includes('CO-13'));
  noErrors('caso de aviación');
});

test('perfil regulatorio: propone, el auditor aplica y explica, y el informe lo recoge', async () => {
  await R(() => window.__ROSETTA__.openCase('aguas'));
  await R(() => window.__ROSETTA__.go('alcance'));
  assert.deepEqual(await R(() => window.__ROSETTA__.calc.alcance), ['iso27001', 'nis2']);
  await page.check('#set-pf-publico'); await page.waitForTimeout(150);
  assert.match(await page.locator('#sec-propuesta').innerText(), /Fuera aunque es obligatoria/, 'avisa si el alcance contradice la propuesta');
  await page.click('[data-act="perfil-aplicar"]'); await page.waitForTimeout(200);
  assert.deepEqual(await R(() => window.__ROSETTA__.calc.alcance), ['ens', 'iso27001', 'nis2']);
  assert.equal(await R(() => window.__ROSETTA__.state.perfil.confirmado.length), 10);
  await page.fill('#set-mot-iso27001', 'Certificado del SGSI corporativo exigido por el consorcio');
  await page.locator('#set-mot-iso27001').blur(); await page.waitForTimeout(600);
  assert.equal(await R(() => window.__ROSETTA__.state.alcance.iso27001.motivo), 'Certificado del SGSI corporativo exigido por el consorcio');
  await page.check('#set-pf-financiera'); await page.waitForTimeout(150);
  assert.match(await page.locator('#sec-propuesta').innerText(), /DORA/);
  const md = await descarga(() => act('export-md'));
  assert.match(md.text, /## Marcos aplicables y por qué/);
  assert.match(md.text, /\| ENS \| Obligatoria \| RD 311\/2022, art\. 2\.1 \| En el alcance \|/);
  assert.match(md.text, /Certificado del SGSI corporativo exigido por el consorcio/);
  noErrors('perfil regulatorio');
});

test('asistente: la propuesta del perfil activa Part-IS en un proyecto nuevo', async () => {
  await R(() => window.__ROSETTA__.go('nuevo'));
  await page.fill('#wz-org', 'Taller Aeronáutico Demo (ficticio)'); await page.fill('#wz-desc', 'Mantenimiento Part-145');
  await act('wz-next');
  await page.selectOption('#wz-pf-avi', 'I'); await page.waitForTimeout(100);
  await page.click('[data-act="wz-perfil-aplicar"]'); await page.waitForTimeout(100);
  assert.equal(await page.locator('#wz-on-partis').isChecked(), true);
  assert.equal(await page.locator('#wz-on-ens').isChecked(), false, 'empresa privada sin contratos públicos: el ENS sale');
  await act('wz-next'); await act('wz-create'); await page.waitForTimeout(200);
  const st = await R(() => ({ al: window.__ROSETTA__.calc.alcance, reg: window.__ROSETTA__.state.alcance.partis.regimen, avi: window.__ROSETTA__.state.perfil.aviacion }));
  assert.deepEqual(st, { al: ['iso27001', 'partis'], reg: 'I', avi: 'I' });
  noErrors('asistente');
});

test('marco propio hostil: se sanea, se mapea con sugerencias y cuenta en el cálculo', async () => {
  await R(() => window.__ROSETTA__.go('alcance'));
  const hostil = `{"__proto__":{"polluted":"yes"},"format":"rosetta-marco","version":1,"id":"../ACME 2026!!","nombre":"<img src=x onerror=window.__xss=1>Política ACME",
    "requisitos":[{"id":"ACME-01","titulo":"Copias de seguridad cifradas y probadas cada trimestre","controles":[{"control":"ACT-08","fuerza":"equivalente"},{"control":"NO-EXISTE"},{"control":"ACT-08","fuerza":"parcial"}]},
      {"id":"ACME-02","titulo":"Autenticación multifactor en los accesos remotos","controles":[]},
      {"id":"<script>","titulo":"malo"},{"id":"ACME-01","titulo":"duplicado"},{"id":"ACME-03","titulo":""},
      {"id":"ACME-04","titulo":"Formación anual","constructor":{"prototype":{"polluted":"yes"}},"controles":["PER-03"]}]}`;
  await importar('acme.json', hostil);
  const r = await R(() => { const s = window.__ROSETTA__.state; const m = s.marcos[0]; return { polluted: ({}).polluted, xss: window.__xss, id: m.id, nombre: m.nombre, reqs: m.requisitos.map((x) => x.id), ctl1: m.requisitos[0].controles, fw: window.__ROSETTA__.FW, on: s.alcance[m.id].on, imgs: document.querySelectorAll('img[src="x"]').length }; });
  assert.equal(r.polluted, undefined); assert.equal(r.xss, undefined); assert.equal(r.imgs, 0);
  assert.equal(r.id, 'mp-acme-2026'); assert.equal(r.nombre, 'img src=x onerror=window.__xss=1Política ACME');
  assert.deepEqual(r.reqs, ['ACME-01', 'ACME-02', 'ACME-04']);
  assert.deepEqual(r.ctl1, [{ control: 'ACT-08', w: 1 }], 'controles fuera del catálogo y duplicados descartados');
  assert.ok(r.fw.includes('mp-acme-2026') && r.on);
  assert.match(await page.locator('#toast').innerText(), /3 requisitos \(3 filas omitidas/);
  // El editor se abre solo porque hay requisitos sin controles; la sugerencia de ACME-02 es la MFA
  const sug = page.locator('[data-act="mp-add"][data-req="ACME-02"][data-ctl="ACC-07"]');
  assert.equal(await sug.count(), 1, 'sugiere ACC-07 para la MFA');
  await sug.click(); await page.waitForTimeout(150);
  await page.selectOption('#mpfz-ACME-02-ACC-07', '1'); await page.waitForTimeout(150);
  await page.selectOption('#mpadd-ACME-04', 'PER-04'); await page.waitForTimeout(150);
  await page.click('[data-act="mp-rm"][data-req="ACME-04"][data-ctl="PER-03"]'); await page.waitForTimeout(150);
  const m = await R(() => window.__ROSETTA__.state.marcos[0].requisitos.map((x) => [x.id, x.controles.map((c) => c.control + ':' + c.w).join(',')]));
  assert.deepEqual(m, [['ACME-01', 'ACT-08:1'], ['ACME-02', 'ACC-07:1'], ['ACME-04', 'PER-04:0.5']]);
  // Cálculo: implantar ACT-08 cubre ACME-01
  await R(() => { window.__ROSETTA__.state.controles['ACT-08'].estado = 'implantado'; });
  await act('set-state', { id: 'ACC-07', v: 'implantado' }); await page.waitForTimeout(150);
  const cov = await R(() => Object.fromEntries(window.__ROSETTA__.calc.req['mp-acme-2026'].map((x) => [x.id, x.estado])));
  assert.deepEqual(cov, { 'ACME-01': 'cubierto', 'ACME-02': 'cubierto', 'ACME-04': 'brecha' }, 'PER-04 sigue pendiente en el proyecto nuevo');
  // Se ve en el mapa y en las demás vistas
  await R(() => window.__ROSETTA__.go('panel')); await page.waitForTimeout(100);
  assert.ok((await page.locator('.wheel:not(.hero) .ring-lbl').allTextContents()).some((x) => /Política ACME|img src/.test(x)));
  for (const v of ['traductor', 'controles', 'normas', 'brechas', 'plan', 'mapa', 'exportar']) await R((x) => window.__ROSETTA__.go(x), v);
  await act('goto-norma', { fw: 'mp-acme-2026' });
  assert.match(await page.locator('#view').innerText(), /ACME-04/);
  noErrors('marco propio');
});

test('el marco propio se guarda con el proyecto, se exporta y se vuelve a importar igual', async () => {
  await page.waitForTimeout(400);
  await page.reload(); await page.waitForFunction(() => window.__ROSETTA__ && window.__ROSETTA__.state);
  assert.deepEqual(await R(() => window.__ROSETTA__.state.marcos.map((m) => m.id)), ['mp-acme-2026'], 'persiste tras recargar');
  await R(() => window.__ROSETTA__.go('alcance'));
  const ex = await descarga(() => page.click('[data-act="mp-export"]'));
  const json = JSON.parse(ex.text);
  assert.equal(json.format, 'rosetta-marco'); assert.equal(json.version, 1); assert.equal(json.id, 'acme-2026');
  assert.deepEqual(json.requisitos[1].controles, [{ control: 'ACC-07', fuerza: 'equivalente' }]);
  await importar('acme-copia.json', ex.text);
  const ids = await R(() => window.__ROSETTA__.state.marcos.map((m) => m.id));
  assert.deepEqual(ids, ['mp-acme-2026', 'mp-acme-2026-2'], 'un identificador repetido recibe sufijo');
  const [a, b] = await R(() => window.__ROSETTA__.state.marcos.map((m) => JSON.stringify(m.requisitos)));
  assert.equal(a, b, 'ida y vuelta sin pérdidas');
  noErrors('exportar marco');
});

test('CSV con punto y coma, comillas y fórmulas; plantillas; errores claros', async () => {
  const csv = '﻿id;titulo;texto;grupo;controles\r\nPL-1;"Cifrado ""en reposo"" de portátiles";=HYPERLINK("x");Equipos;OPE-14:equivalente|OPE-12\r\nPL-2;Registro de accesos;;;OPE-08:relacion\r\n;sin id;;;\r\n';
  await importar('Pliego_Ayuntamiento-2026.csv', csv);
  const m = await R(() => window.__ROSETTA__.state.marcos.at(-1));
  assert.equal(m.nombre, 'Pliego Ayuntamiento 2026');
  assert.deepEqual(m.requisitos.map((r) => [r.id, r.titulo, r.texto, r.controles.map((c) => c.control + ':' + c.w).join(',')]),
    [['PL-1', 'Cifrado "en reposo" de portátiles', '=HYPERLINK("x")', 'OPE-14:1,OPE-12:0.5'], ['PL-2', 'Registro de accesos', '', 'OPE-08:0']]);
  const tj = await descarga(() => page.click('[data-act="mp-tpl-json"]'));
  assert.equal(JSON.parse(tj.text).format, 'rosetta-marco');
  const tc = await descarga(() => page.click('[data-act="mp-tpl-csv"]'));
  assert.match(tc.text, /^﻿id;titulo;texto;grupo;controles\r\nPOL-01;/);
  await importar('roto.json', '{"format":"otra-cosa","version":1,"nombre":"x","requisitos":[]}');
  assert.match(await page.locator('#toast').innerText(), /no es un marco de Rosetta/);
  await importar('vacio.json', '{"format":"rosetta-marco","version":1,"nombre":"Vacío","requisitos":[{"id":"","titulo":""}]}');
  assert.match(await page.locator('#toast').innerText(), /ningún requisito válido/);
  noErrors('csv');
});

test('Excel e informe con columnas y hojas para Part-IS y los marcos propios', async () => {
  const md = await descarga(() => act('export-md'));
  assert.match(md.text, /\| img src=x onerror=window\.\\_\\_xss=1Política ACME \| Contractual o voluntaria \|/);
  assert.match(md.text, /\| Pliego Ayuntamiento 2026 \| Contractual o voluntaria \|/);
  assert.ok(!/<img/.test(md.text), 'el informe no lleva HTML');
  const ctl = await descarga(() => act('export-ctl'));
  const head = ctl.text.split('\r\n')[0];
  assert.match(head, /;ENS;ISO\/IEC 27001;NIS2;ISO\/IEC 42001;Part-IS;RIA;/); assert.match(head, /;img src=x onerror=window\.__xss=1Política ACME;/); assert.match(head, /;Pliego Ayuntamiento 2026;/);
  noErrors('exportaciones');
});

test('borrar un marco propio lo quita del alcance, del cálculo y de las vistas', async () => {
  await R(() => window.__ROSETTA__.go('alcance'));
  const n0 = await R(() => window.__ROSETTA__.state.marcos.length);
  await page.click('[data-act="ask"][data-what="mpdel:mp-acme-2026-2"]');
  await page.click('[data-act="mp-del"][data-fw="mp-acme-2026-2"]'); await page.waitForTimeout(200);
  const r = await R(() => ({ n: window.__ROSETTA__.state.marcos.length, fw: window.__ROSETTA__.FW.includes('mp-acme-2026-2'), al: 'mp-acme-2026-2' in window.__ROSETTA__.state.alcance, calc: 'mp-acme-2026-2' in window.__ROSETTA__.calc.fw }));
  assert.deepEqual(r, { n: n0 - 1, fw: false, al: false, calc: false });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
  assert.equal(await R(() => window.__ROSETTA__.state.marcos.length), n0, 'deshacer devuelve el marco');
  noErrors('borrar marco');
});

test('Alcance sin desbordamiento horizontal en móvil (390 px) con el editor de mapeo abierto', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await R(() => window.__ROSETTA__.go('alcance'));
  await page.click('[data-act="mp-open"][data-fw="mp-acme-2026"]'); await page.waitForTimeout(150);
  const over = await R(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const culpa = await R(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('#view *')].filter((e) => e.getBoundingClientRect().right > W + 1).slice(0, 6).map((e) => `${e.tagName}.${e.className}`).join(' | '); });
  assert.ok(over <= 1, `desborda ${over}px: ${culpa}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  noErrors('móvil');
});

test('los ficheros de ejemplo del repositorio se importan sin avisos', async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await R(() => window.__ROSETTA__.openCase('lumen')); await R(() => window.__ROSETTA__.go('alcance'));
  for (const [f, n] of [['marco-ejemplo.json', 3], ['marco-ejemplo.csv', 3]]) {
    await importar(f, readFileSync(join(ROOT, 'tests/fixtures', f), 'utf8'));
    const toast = await page.locator('#toast').innerText();
    assert.match(toast, new RegExp(`importado con ${n} requisitos`)); assert.ok(!/omitid/.test(toast), toast);
  }
  noErrors('ficheros de ejemplo');
});

test('RIA: rol y riesgo deciden qué se exige, con fecha de aplicación y etiqueta en inglés', async () => {
  await R(() => window.__ROSETTA__.openCase('lumen')); await R(() => window.__ROSETTA__.go('alcance'));
  assert.ok((await R(() => window.__ROSETTA__.calc.alcance)).includes('ria'));
  const n0 = await R(() => window.__ROSETTA__.calc.fw.ria.aplicables);
  await page.selectOption('#set-ria-rol', 'responsable'); await page.waitForTimeout(150);
  const n1 = await R(() => window.__ROSETTA__.calc.fw.ria.aplicables);
  assert.ok(n1 < n0, `${n1} < ${n0}`);
  await act('goto-norma', { fw: 'ria' });
  assert.equal(await page.locator('[data-act="norma-estado"][data-v="no-exigido"]').count(), 1);
  await act('insp-req', { fw: 'ria', id: '9' });
  const insp = await page.locator('#insp').innerText();
  assert.match(insp, /No exigido para el rol/); assert.match(insp, /Aplicable desde/); assert.match(insp, /2026\/1744/);
  await act('insp-close');
  await act('lang', { v: 'en' }); await page.waitForTimeout(150);
  assert.match(await page.locator('#view').innerText(), /AI Act/);
  await act('lang', { v: 'es' }); await page.waitForTimeout(150);
  noErrors('RIA');
});

test('CRA: caso del fabricante, exclusión justificada solo donde el anexo I lo permite y ruta de conformidad por clase', async () => {
  await R(() => window.__ROSETTA__.openCase('sensorica'));
  assert.deepEqual(await R(() => window.__ROSETTA__.calc.alcance), ['iso27001', 'nis2', 'cra']);
  const hall = await R(() => window.__ROSETTA__.hall.map((h) => h.id));
  assert.ok(hall.includes('CO-17') && hall.includes('CO-18'));
  await act('insp-req', { fw: 'cra', id: 'I.2.b' });
  assert.equal(await page.locator('#insp [data-exsw]').count(), 1, 'I.2.b admite exclusión');
  await act('insp-req', { fw: 'cra', id: '14' });
  assert.equal(await page.locator('#insp [data-exsw]').count(), 0);
  assert.match(await page.locator('#insp').innerText(), /11 sept 2026|11 Sept 2026|11 sep 2026/i);
  await act('insp-close');
  await R(() => window.__ROSETTA__.go('alcance'));
  await page.selectOption('#set-cra-clase', 'importante2'); await page.waitForTimeout(150);
  assert.match(await page.locator('#view').innerText(), /Siempre con organismo notificado/);
  noErrors('CRA');
});

test('cada norma se puede activar y desactivar desde Alcance, con su motivo', async () => {
  await R(() => window.__ROSETTA__.openCase('aguas')); await R(() => window.__ROSETTA__.go('alcance'));
  const fws = await R(() => window.__ROSETTA__.FWV);
  for (const f of fws) {
    const antes = await R((f) => window.__ROSETTA__.state.alcance[f].on, f);
    await page.locator(`#set-on-${f}`).evaluate((el) => el.click()); await page.waitForTimeout(120);
    assert.equal(await R((f) => window.__ROSETTA__.state.alcance[f].on, f), !antes, `${f} cambia`);
    assert.equal(await R((f) => window.__ROSETTA__.calc.alcance.includes(f), f), !antes, `${f} en el cálculo`);
    await page.fill(`#set-mot-${f}`, `Motivo ${f}`); await page.locator(`#set-mot-${f}`).blur(); await page.waitForTimeout(500);
    assert.equal(await R((f) => window.__ROSETTA__.state.alcance[f].motivo, f), `Motivo ${f}`);
  }
  noErrors('activar normas');
});

test('DORA: banco ficticio, régimen simplificado y TLPT desde Alcance', async () => {
  await R(() => window.__ROSETTA__.openCase('ribera'));
  assert.deepEqual(await R(() => window.__ROSETTA__.calc.alcance), ['iso27001', 'ria', 'dora']);
  await R(() => window.__ROSETTA__.go('alcance'));
  const n0 = await R(() => window.__ROSETTA__.calc.fw.dora.aplicables);
  await page.check('#set-dora-tlpt'); await page.waitForTimeout(150);
  assert.equal(await R(() => window.__ROSETTA__.calc.fw.dora.aplicables), n0 + 1);
  await page.selectOption('#set-dora-regimen', 'simplificado'); await page.waitForTimeout(150);
  assert.ok(await R(() => window.__ROSETTA__.calc.req.dora.find((r) => r.id === '16').estado !== 'no-exigido'));
  await act('insp-req', { fw: 'dora', id: '9' });
  assert.match(await page.locator('#insp').innerText(), /régimen simplificado/);
  await act('insp-close');
  noErrors('DORA');
});

test('LATAM: las leyes de Chile solo se ven si la organización opera allí, y el perfil las propone', async () => {
  await R(() => window.__ROSETTA__.openCase('aguas')); await R(() => window.__ROSETTA__.go('alcance'));
  assert.equal(await page.locator('#set-on-cl21663').count(), 0, 'una empresa española no ve las leyes chilenas');
  await page.check('#set-pf-op-cl'); await page.waitForTimeout(200);
  assert.equal(await page.locator('#set-on-cl21719').count(), 1);
  assert.match(await page.locator('#sec-propuesta').innerText(), /Ley 21\.719 \(Chile\)[\s\S]*A confirmar/);
  await R(() => window.__ROSETTA__.openCase('austral'));
  assert.deepEqual(await R(() => window.__ROSETTA__.calc.alcance), ['iso27001', 'nist', 'cl21663', 'cl21719', 'pe29733']);
  const hall = await R(() => window.__ROSETTA__.hall.map((h) => h.id));
  assert.ok(hall.includes('CO-21') && hall.includes('CO-22'));
  await R(() => window.__ROSETTA__.go('alcance'));
  await page.uncheck('#set-cl-oiv'); await page.waitForTimeout(150);
  assert.equal(await R(() => window.__ROSETTA__.calc.fw.cl21663.aplicables), 2);
  noErrors('LATAM');
});

test('LATAM: una empresa mexicana ve su ley y la de los países donde opera, nada más', async () => {
  await R(() => window.__ROSETTA__.openCase('aguas')); await R(() => window.__ROSETTA__.go('alcance'));
  if (await page.locator('#set-pf-op-cl').isChecked()) { await page.uncheck('#set-pf-op-cl'); await page.waitForTimeout(150); } // viene de la prueba anterior
  await page.selectOption('#set-pf-jur', 'mx'); await page.waitForTimeout(150);
  await page.check('#set-pf-op-co'); await page.waitForTimeout(150);
  const vis = await R(() => window.__ROSETTA__.FWV);
  assert.ok(vis.includes('mx2025') && vis.includes('co1581') && !vis.includes('pe29733') && !vis.includes('cl21663'));
  await page.click('[data-act="perfil-aplicar"]'); await page.waitForTimeout(200);
  assert.ok((await R(() => window.__ROSETTA__.calc.alcance)).includes('mx2025'));
  assert.ok(!(await R(() => window.__ROSETTA__.calc.alcance)).includes('nis2'), 'NIS2 no aplica en México');
  noErrors('LATAM México');
});

test('Ecosistema: importa la evidencia de CTEM-Nexus, salta CO-23 y devuelve el sobre de controles', async () => {
  await R(() => window.__ROSETTA__.openCase('techserv'));
  await R(() => window.__ROSETTA__.go('exportar'));
  assert.match(await page.locator('[data-testid="ctem-pane"]').innerText(), /Sin evidencia de CTEM-Nexus/);
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-act="import-ctem"]');
  await (await chooser).setFiles(join(ROOT, 'tests/fixtures/ctem-a-rosetta.json')); await page.waitForTimeout(350);
  const ida = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/ctem-a-rosetta.json'), 'utf8'));
  assert.equal(await R(() => Object.keys(window.__ROSETTA__.state.ctem.controles).length), ida.datos.length);
  assert.match(await page.locator('[data-testid="ctem-pane"]').innerText(), new RegExp(`${ida.datos.length} controles con hallazgos`));
  assert.ok((await R(() => window.__ROSETTA__.hall.map((h) => h.id))).includes('CO-23'), 'TechServ declara implantados controles con exposición abierta');
  await act('insp-uc', { id: 'OPE-04' });
  assert.match(await page.locator('[data-testid="ctem-blk"]').innerText(), /Exposición técnica · CTEM-Nexus[\s\S]*abiertos?/i);
  await act('insp-close');
  const { name, text } = await descarga(() => page.click('[data-act="export-ctem"]'));
  assert.match(name, /para_ctem_nexus_\d{4}-\d{2}-\d{2}\.json$/);
  const vuelta = JSON.parse(text);
  assert.equal(vuelta.tipo, 'controles');
  assert.equal(vuelta.datos.filter((d) => d.ctem).length, ida.datos.length);
  // Sobrevive a guardar y reabrir el proyecto (saneado al cargar).
  await R(() => window.__ROSETTA__.go('exportar'));
  const proj = JSON.parse((await descarga(() => page.click('[data-act="export-json"]'))).text);
  assert.equal(Object.keys(proj.ctem.controles).length, ida.datos.length);
  await page.click('[data-act="ctem-clear"]'); await page.waitForTimeout(150);
  assert.equal(await R(() => window.__ROSETTA__.state.ctem), undefined);
  noErrors('CTEM-Nexus');
});
