/* E2E de lo que depende de recursos: CSP, fuentes incrustadas y Excel (importar la SoA del ENS y exportar).
 * Se ejecuta dos veces: abriendo dist/index.html desde el disco (file://) y servido por HTTP.
 * Toda petición a Internet se bloquea y se cuenta: la app debe funcionar entera con lo que trae dist/. */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, normalize, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const SOA = join(ROOT, 'tests/fixtures/soa-ens-ejemplo.xlsx');
const XLSX = createRequire(import.meta.url)('../src/vendor/sheetjs-0.20.3.full.min.js');

let browser, server, httpUrl;
before(async () => {
  assert.ok(existsSync(join(DIST, 'vendor')), 'falta dist/vendor: ejecuta «npm run build»');
  browser = await chromium.launch({ headless: true });
  server = createServer((req, res) => {
    const f = join(DIST, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html');
    if (!f.startsWith(DIST + sep) || !existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.js') ? 'text/javascript' : 'text/plain' }).end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  httpUrl = `http://127.0.0.1:${server.address().port}/index.html`;
});
after(async () => { await browser?.close(); server?.close(); });

async function open(url) {
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'es-ES' });
  const ext = [];
  await ctx.route(/^https?:\/\//, (r) => { const u = r.request().url(); if (u.startsWith('http://127.0.0.1')) return r.continue(); ext.push(u); return r.abort(); });
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ROSETTA__);
  return { ctx, page, ext, errors };
}
const act = (page, name, data = {}) => page.evaluate(([n, d]) => { const b = document.createElement('button'); b.dataset.act = n; Object.assign(b.dataset, d); b.hidden = true; document.body.append(b); b.click(); b.remove(); }, [name, data]);

for (const modo of ['file', 'http']) {
  describe(`servido por ${modo === 'file' ? 'file://' : 'HTTP'}`, () => {
    let s;
    before(async () => { s = await open(modo === 'file' ? pathToFileURL(join(DIST, 'index.html')).href : httpUrl); });
    after(async () => { await s.ctx.close(); });

    test('la CSP está activa y no bloquea nada de la app', async () => {
      const csp = await s.page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || '');
      assert.match(csp, /default-src 'none'/);
      assert.match(csp, /connect-src 'none'/);
      for (const v of ['inicio', 'ajustes', 'ayuda']) await s.page.evaluate((x) => window.__ROSETTA__.go(x), v);
      await s.page.evaluate(() => window.__ROSETTA__.openCase('techserv'));
      for (const v of ['panel', 'traductor', 'controles', 'normas', 'brechas', 'plan', 'mapa', 'alcance', 'exportar']) await s.page.evaluate((x) => window.__ROSETTA__.go(x), v);
      assert.deepEqual(await s.page.evaluate(() => window.__csp), []);
    });

    test('la CSP bloquea código inyectado', async () => {
      const r = await s.page.evaluate(async () => {
        const d = document.createElement('div'); d.innerHTML = '<img src="x" onerror="window.__pwn=1">'; document.body.append(d);
        let fetched = 'no'; try { await fetch('https://evil.example/x'); fetched = 'sí'; } catch (e) { /* bloqueado */ }
        await new Promise((ok) => setTimeout(ok, 150)); d.remove();
        const out = { pwn: window.__pwn, fetched, csp: window.__csp.length }; window.__csp = [];
        return out;
      });
      assert.equal(r.pwn, undefined);
      assert.equal(r.fetched, 'no');
      assert.ok(r.csp >= 2, 'la CSP registra las violaciones');
    });

    test('fuentes incrustadas, sin Google Fonts', async () => {
      await s.page.evaluate(() => document.fonts.ready);
      const ok = await s.page.evaluate(() => ['16px "Onest"', '16px "Bricolage Grotesque"', '12px "Martian Mono"'].map((f) => document.fonts.check(f)));
      assert.deepEqual(ok, [true, true, true]);
      const loaded = await s.page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
      assert.ok(loaded.includes('Onest') && loaded.includes('Bricolage Grotesque'), loaded.join(','));
    });

    test('importar la SoA del ENS (SheetJS 0.20.3 autoalojado, con SRI)', async () => {
      const chooser = s.page.waitForEvent('filechooser');
      await act(s.page, 'import-ens');
      await (await chooser).setFiles(SOA);
      await s.page.waitForFunction(() => window.__ROSETTA__.state && !window.__ROSETTA__.state.caseId && window.__ROSETTA__.state.ensSoa, null, { timeout: 15000 });
      const r = await s.page.evaluate(() => {
        const st = window.__ROSETTA__.state; const ctl = Object.values(st.controles);
        return { org: st.proyecto.organizacion, impl: ctl.filter((c) => c.estado === 'implantado').length, medidas: Object.keys(st.ensSoa).length,
          cat: st.alcance.ens.categoria, lib: typeof window.XLSX };
      });
      assert.match(r.org, /Ayuntamiento de Ejemplo/);
      assert.equal(r.medidas, 73);
      assert.ok(r.impl > 10, `controles implantados heredados: ${r.impl}`);
      assert.equal(r.cat, 'MEDIA');
      assert.equal(r.lib, 'undefined', 'la librería no queda en el global');
      const soa = await s.page.evaluate(() => Object.values(window.__ROSETTA__.state.ensSoa).find((x) => x.evidencias));
      assert.ok(soa && soa.responsable, 'se conservan evidencias y responsable de la SoA');
      assert.deepEqual(await s.page.evaluate(() => window.__csp), []);
    });

    test('exportar a Excel con formato y sin fórmulas', async () => {
      const dl = s.page.waitForEvent('download', { timeout: 20000 });
      await act(s.page, 'export-xlsx');
      const d = await dl;
      assert.match(d.suggestedFilename(), /\.xlsx$/);
      const wb = XLSX.read(readFileSync(await d.path()), { type: 'buffer', cellFormula: true });
      assert.ok(wb.SheetNames.length >= 3, wb.SheetNames.join(','));
      let formulas = 0;
      for (const n of wb.SheetNames) for (const [k, c] of Object.entries(wb.Sheets[n])) if (!k.startsWith('!') && c.f) formulas++;
      assert.equal(formulas, 0);
      assert.deepEqual(await s.page.evaluate(() => window.__csp), []);
    });

    if (modo === 'http') test('una librería manipulada se rechaza (SRI)', async () => {
      const t2 = await open(httpUrl);
      await t2.page.route('**/vendor/sheetjs-*.js', async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()) + '\nwindow.__pwn=1;' }); });
      const chooser = t2.page.waitForEvent('filechooser');
      await act(t2.page, 'import-ens');
      await (await chooser).setFiles(SOA);
      await t2.page.waitForTimeout(2500);
      const r = await t2.page.evaluate(() => ({ pwn: window.__pwn, st: !!window.__ROSETTA__.state, toast: document.querySelector('#toast')?.textContent || '' }));
      assert.equal(r.pwn, undefined, 'el código manipulado no se ejecuta');
      assert.equal(r.st, false, 'no se importa nada');
      assert.ok(r.toast.length > 0, 'se avisa al usuario');
      await t2.ctx.close();
    });

    test('ninguna petición a Internet y ningún error', () => {
      assert.deepEqual(s.ext, []);
      assert.deepEqual(s.errors, []);
    });
  });
}
