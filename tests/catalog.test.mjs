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
  test('once normas con el número de requisitos esperado', () => {
    assert.deepEqual(Object.keys(CAT.frameworks), E.FW);
    const n = Object.fromEntries(E.FW.map((f) => [f, CAT.frameworks[f].reqs.length]));
    // ENS: 73 medidas del Anexo II · ISO 27001: cl. 4–10 + 93 controles · NIS2: RE 2024/2690 · ISO 42001: cl. 4–10 + 38 controles
    assert.equal(CAT.frameworks.ens.reqs.filter((r) => r.g !== 'Articulado').length, 73);
    assert.deepEqual(CAT.frameworks.ens.reqs.filter((r) => r.g === 'Articulado').map((r) => r.id), ['art.28', 'art.31', 'art.32', 'art.33']);
    assert.equal(CAT.frameworks.iso27001.reqs.filter((r) => /^A\d/.test(r.id)).length, 93);
    assert.equal(CAT.frameworks.iso42001.reqs.filter((r) => /^A\d/.test(r.id)).length, 38);
    assert.ok(n.nis2 > 0);
    assert.equal(n.partis, 13, 'Part-IS: puntos .200 a .260');
    assert.equal(CAT.frameworks.partis.tope, 'parcial');
    assert.ok(CAT.frameworks.partis.fuentes.some((f) => /2023\/203/.test(f)) && CAT.frameworks.partis.fuentes.some((f) => /2022\/1645/.test(f)));
    for (const r of CAT.frameworks.partis.reqs) { assert.match(r.code, /^IS\.I\.OR\.\d{3}$/); for (const k of ['t', 't_en', 'nota', 'nota_en', 'ref', 'ref_en']) assert.ok(r[k], `${r.id}.${k}`); }
  });
  test('cada control declara su correspondencia con todas las normas (aunque sea vacía)', () => {
    for (const c of CAT.controls) assert.deepEqual(Object.keys(c.maps), E.FW, c.id);
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
  test('cláusulas 6.1.1 de ISO y art. 23.4 a–e de NIS2 presentes', () => {
    for (const f of ['iso27001', 'iso42001']) assert.ok(CAT.frameworks[f].reqs.some((r) => r.id === 'C6.1.1'), f);
    const codes = CAT.frameworks.nis2.reqs.map((r) => r.code);
    for (const l of ['a', 'b', 'c', 'd', 'e']) assert.ok(codes.includes(`Art. 23.4 ${l}`), `23.4 ${l}`);
  });
  test('ENS op.pl.5 (CPSTIC) no se hereda de ISO 27001', () => {
    const ix = E.indexar(CAT);
    assert.ok(ix.reqUcs.ens['op.pl.5'].some((l) => l.uc === 'DES-08' && l.w === 1));
    assert.ok(!CAT.controls.find((c) => c.id === 'DES-08').maps.iso27001.some((m) => m.w > 0));
    assert.ok(!E.equivalencias(ix, 'ens', 'op.pl.5').otras.iso27001.some((x) => x.fuerza === 'total'), 'op.pl.5 no tiene equivalente total en ISO 27001');
  });
  test('ISO 27001 no exige los plazos de notificación de NIS2 (INC-07 solo relación)', () => {
    assert.ok(CAT.controls.find((c) => c.id === 'INC-07').maps.iso27001.every((m) => m.w === 0));
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
  test('nueve casos con identificador único, datos bilingües y perfil regulatorio', () => {
    assert.equal(CASOS.length, 9);
    for (const c of CASOS) assert.deepEqual(E.perfilNormalizado(c.state.perfil), c.state.perfil, `${c.id}: perfil válido`);
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
