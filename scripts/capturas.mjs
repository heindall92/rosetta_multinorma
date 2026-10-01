#!/usr/bin/env node
/* Regenera las capturas del README (docs/img/readme/) a partir de dist/index.html.
 * Uso: npm run build && node scripts/capturas.mjs   (requiere Playwright: npm ci) */
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const URL_APP = pathToFileURL(join(ROOT, 'dist/index.html')).href;
const OUT = join(ROOT, 'docs/img/readme');
const VISTAS = [
  ['inicio-light', 'inicio', 'claro', null, 1440], ['panel-dark', 'panel', 'oscuro', 'techserv', 1440], ['traductor-light', 'traductor', 'claro', 'techserv', 1440],
  ['controles-light', 'controles', 'claro', 'techserv', 1440], ['normas-dark', 'normas', 'oscuro', 'aguas', 1440], ['brechas-dark', 'brechas', 'oscuro', 'hospital', 1440],
  ['plan-dark', 'plan', 'oscuro', 'lumen', 1440], ['mapa-light', 'mapa', 'claro', 'techserv', 1440], ['alcance-light', 'alcance', 'claro', 'citafacil', 1440],
  ['ayuda-light', 'ayuda', 'claro', null, 1440],
  ['mobile-panel-dark', 'panel', 'oscuro', 'hospital', 390], ['mobile-traductor-light', 'traductor', 'claro', 'techserv', 390]
];
const b = await chromium.launch();
async function abrir(w, tema) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: w < 500 ? 2 : 1, locale: 'es-ES' });
  await ctx.addInitScript((tm) => { try { if (!localStorage.getItem('rosetta/v1/ws')) localStorage.setItem('rosetta/v1/ws', JSON.stringify({ settings: { tema: tm, acento: 'azul', lang: 'es', def: 2 }, onboarded: true })); } catch (e) { /* n/a */ } }, tema);
  const p = await ctx.newPage();
  await p.goto(URL_APP); await p.waitForFunction(() => window.__ROSETTA__);
  return { ctx, p };
}
const limpiar = (p) => p.evaluate(() => { document.getElementById('toast').style.display = 'none'; });
for (const [name, v, tema, caso, w] of VISTAS) {
  const { ctx, p } = await abrir(w, tema);
  await p.evaluate(([v, c]) => { if (c) window.__ROSETTA__.openCase(c); window.__ROSETTA__.go(v); }, [v, caso]);
  await p.mouse.move(w - 5, 300); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1600);
  await limpiar(p); await p.screenshot({ path: join(OUT, `${name}.png`) }); await ctx.close();
}
const { ctx, p } = await abrir(1440, 'oscuro');
await p.evaluate(() => { window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go('brechas'); });
await p.mouse.move(1000, 400); await p.keyboard.press('['); await p.waitForTimeout(1300); await limpiar(p);
await p.screenshot({ path: join(OUT, 'rail-compacta.png'), clip: { x: 0, y: 0, width: 640, height: 900 } });
const bx = await p.locator('.nav-i[data-view="plan"]').boundingBox(); await p.mouse.move(bx.x + 20, bx.y + 10); await p.mouse.move(bx.x + 22, bx.y + 12); await p.waitForTimeout(1300);
await p.screenshot({ path: join(OUT, 'rail-desplegada.png'), clip: { x: 0, y: 0, width: 640, height: 900 } });
await ctx.close(); await b.close();
console.log('✓ capturas en docs/img/readme/');
