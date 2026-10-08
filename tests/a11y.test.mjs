/* Regresión de accesibilidad: axe-core (WCAG 2.2 A/AA) en las 12 vistas (y la pestaña «Acerca de»), claro y oscuro, escritorio y móvil.
 * Umbral: cero violaciones. La CSP se omite solo en este test para poder inyectar axe. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const URL_APP = pathToFileURL(join(ROOT, 'dist/index.html')).href;
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const VIEWS = ['inicio', 'ajustes', 'ayuda', 'panel', 'traductor', 'controles', 'normas', 'brechas', 'plan', 'mapa', 'alcance', 'exportar', 'ayuda:acerca'];

let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`axe sin violaciones · tema ${theme} · ${width} px`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, bypassCSP: true, reducedMotion: 'reduce' });
    await ctx.route(/^https?:\/\//, (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto(URL_APP); await p.waitForFunction(() => window.__ROSETTA__);
    if (theme === 'dark') await p.evaluate(() => document.querySelector('[data-act="toggle-theme"]').click()); // por defecto es claro
    await p.addScriptTag({ content: AXE });
    const fallos = [];
    for (const v of VIEWS) {
      await p.evaluate((x) => { if (x !== 'inicio' && !window.__ROSETTA__.state) window.__ROSETTA__.openCase('techserv'); const [vw, tab] = x.split(':'); if (tab) window.__ROSETTA__.ui.helpTab = tab; window.__ROSETTA__.go(vw); document.getElementById('toast').hidden = true; }, v);
      await p.waitForTimeout(200);
      const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'], resultTypes: ['violations'] }))
        .violations.flatMap((x) => x.nodes.map((n) => `${x.id} · ${n.target.join(' ')}`)));
      for (const f of r) fallos.push(`${v}: ${f}`);
    }
    await ctx.close();
    assert.deepEqual(fallos, []);
  });
}

/* 2.4.0: Alcance con perfil regulatorio, Part-IS y el editor de mapeo de un marco propio abierto; Resumen con cinco anillos */
for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`axe sin violaciones en perfil, Part-IS y marcos propios · tema ${theme} · ${width} px`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, bypassCSP: true, reducedMotion: 'reduce' });
    await ctx.route(/^https?:\/\//, (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto(URL_APP); await p.waitForFunction(() => window.__ROSETTA__);
    if (theme === 'dark') await p.evaluate(() => document.querySelector('[data-act="toggle-theme"]').click());
    await p.evaluate(() => {
      const R = window.__ROSETTA__; R.openCase('alas'); const s = R.state;
      s.marcos.push({ id: 'mp-acme', nombre: 'Política ACME', descripcion: 'Ejemplo ficticio', tipo: 'propio', importado: '2026-10-08', requisitos: [
        { id: 'A-01', titulo: 'Autenticación multifactor en los accesos remotos', texto: 'Texto de prueba', grupo: '', controles: [{ control: 'ACC-07', w: 1 }] },
        { id: 'A-02', titulo: 'Copias de seguridad cifradas', texto: '', grupo: '', controles: [] }] });
      s.alcance['mp-acme'] = { on: true }; s.alcance.ens.on = true; s.alcance.iso42001.on = true; s.alcance.ria.on = true; s.exclusiones['mp-acme'] = {};
      R.ui.mpOpen = 'mp-acme'; R.go('alcance');
    });
    await p.addScriptTag({ content: AXE });
    const fallos = [];
    for (const v of ['alcance', 'panel', 'normas']) {
      await p.evaluate((x) => { if (x === 'normas') window.__ROSETTA__.ui.normaFw = 'partis'; window.__ROSETTA__.go(x); }, v);
      await p.waitForTimeout(250);
      const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'], resultTypes: ['violations'] }))
        .violations.flatMap((x) => x.nodes.map((n) => `${x.id} · ${n.target.join(' ')}`)));
      for (const f of r) fallos.push(`${v}: ${f}`);
    }
    await ctx.close();
    assert.deepEqual(fallos, []);
  });
}
