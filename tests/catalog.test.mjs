/* Integridad del catálogo multinorma y de los casos de ejemplo (src/data). */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../src/engine/rosetta-engine.js');
const CAT = require('../src/data/catalog.json');
const CASOS = require('../src/data/casos.json');
const ICONS = require('../src/data/icons.json');

const dupes = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);

describe('catálogo', () => {
  test('cuatro normas con el número de requisitos esperado', () => {
    assert.deepEqual(Object.keys(CAT.frameworks), E.FW);
    const n = Object.fromEntries(E.FW.map((f) => [f, CAT.frameworks[f].reqs.length]));
    // ENS: 73 medidas del Anexo II · ISO 27001: cl. 4–10 + 93 controles · NIS2: RE 2024/2690 · ISO 42001: cl. 4–10 + 38 controles
    assert.equal(n.ens, 73);
    assert.equal(CAT.frameworks.iso27001.reqs.filter((r) => /^A\d/.test(r.id)).length, 93);
    assert.equal(CAT.frameworks.iso42001.reqs.filter((r) => /^A\d/.test(r.id)).length, 38);
    assert.ok(n.nis2 > 0);
  });
  test('identificadores únicos (requisitos, controles, dominios)', () => {
    for (const f of E.FW) assert.deepEqual(dupes(CAT.frameworks[f].reqs.map((r) => r.id)), [], f);
    assert.deepEqual(dupes(CAT.controls.map((c) => c.id)), []);
    assert.deepEqual(dupes(CAT.domains.map((d) => d.id)), []);
  });
  test('cada control pertenece a un dominio existente y tiene textos ES/EN', () => {
    const doms = new Set(CAT.domains.map((d) => d.id));
    for (const c of CAT.controls) {
      assert.ok(doms.has(c.dom), `${c.id}: dominio ${c.dom}`);
      assert.ok(c.t && c.t_en, `${c.id}: título`);
    }
  });
  test('todo enlace apunta a un requisito existente con peso 0, 0,5 o 1', () => {
    for (const c of CAT.controls) for (const f of E.FW) for (const m of c.maps[f] || []) {
      assert.ok(CAT.frameworks[f].reqs.some((r) => r.id === m.id), `${c.id} → ${f} ${m.id} no existe`);
      assert.ok([0, 0.5, 1].includes(m.w), `${c.id} → ${f} ${m.id}: peso ${m.w}`);
    }
  });
  test('ningún control enlaza dos veces el mismo requisito', () => {
    for (const c of CAT.controls) for (const f of E.FW) assert.deepEqual(dupes((c.maps[f] || []).map((m) => m.id)), [], `${c.id}/${f}`);
  });
  test('todo requisito está sostenido por al menos un control (cobertura del mapa)', () => {
    const ix = E.indexar(CAT); const huerfanos = [];
    for (const f of E.FW) for (const r of CAT.frameworks[f].reqs) if (!ix.reqUcs[f][r.id].length) huerfanos.push(`${f}:${r.id}`);
    assert.deepEqual(huerfanos, []);
  });
  test('ENS: cada medida declara dimensiones y exigencia por nivel', () => {
    for (const r of CAT.frameworks.ens.reqs) {
      assert.ok(r.dims, r.id);
      for (const k of ['bajo', 'medio', 'alto']) assert.equal(typeof r[k], 'string', `${r.id}.${k}`);
    }
  });
  test('los iconos de dominio existen en la biblioteca de iconos', () => {
    for (const d of CAT.domains) if (d.ic) assert.ok(ICONS[d.ic], `${d.id}: icono ${d.ic}`);
  });
  test('ninguna cadena del catálogo podría cerrar el <script> que la contiene', () => {
    assert.ok(!/<\/script/i.test(JSON.stringify({ CAT, CASOS, ICONS })));
  });
});

describe('casos de ejemplo', () => {
  test('cinco casos con identificador único y datos bilingües', () => {
    assert.equal(CASOS.length, 5);
    assert.deepEqual(dupes(CASOS.map((c) => c.id)), []);
    for (const c of CASOS) for (const k of ['titulo', 'sector', 'sector_en', 'resumen', 'resumen_en']) assert.ok(c[k], `${c.id}.${k}`);
  });
  test('el estado de cada caso solo referencia controles y requisitos del catálogo', () => {
    const ucs = new Set(CAT.controls.map((c) => c.id));
    for (const c of CASOS) {
      for (const id of Object.keys(c.state.controles || {})) assert.ok(ucs.has(id), `${c.id}: control ${id}`);
      for (const f of Object.keys(c.state.exclusiones || {})) {
        const reqs = new Set(CAT.frameworks[f].reqs.map((r) => r.id));
        for (const id of Object.keys(c.state.exclusiones[f])) assert.ok(reqs.has(id), `${c.id}: exclusión ${f} ${id}`);
      }
      for (const [id, a] of Object.entries(c.state.controles || {})) assert.ok(E.ESTADOS.includes(a.estado), `${c.id}: ${id} estado ${a.estado}`);
    }
  });
  test('los datos de los casos son ficticios y así se declaran', () => {
    for (const c of CASOS) assert.match(JSON.stringify(c.state.proyecto), /fictici|fictitious/i, c.id);
  });
});
