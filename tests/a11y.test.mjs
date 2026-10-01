/* Regresión de accesibilidad: axe-core (WCAG 2.2 A/AA) en las 12 vistas, claro y oscuro, escritorio y móvil.
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
const VIEWS = ['inicio', 'ajustes', 'ayuda', 'panel', 'traductor', 'controles', 'normas', 'brechas', 'plan', 'mapa', 'alcance', 'exportar'];

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
      await p.evaluate((x) => { if (x !== 'inicio' && !window.__ROSETTA__.state) window.__ROSETTA__.openCase('techserv'); window.__ROSETTA__.go(x); document.getElementById('toast').hidden = true; }, v);
      await p.waitForTimeout(200);
      const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'], resultTypes: ['violations'] }))
        .violations.flatMap((x) => x.nodes.map((n) => `${x.id} · ${n.target.join(' ')}`)));
      for (const f of r) fallos.push(`${v}: ${f}`);
    }
    await ctx.close();
    assert.deepEqual(fallos, []);
  });
}
