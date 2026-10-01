/* Tests del motor de cálculo (src/engine/rosetta-engine.js), sin DOM. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../src/engine/rosetta-engine.js');
const CAT = require('../src/data/catalog.json');
const CASOS = require('../src/data/casos.json');
const IX = E.indexar(CAT);

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ''} esperado ${b}, obtenido ${a}`);

/* Catálogo mínimo y controlable para probar la aritmética sin depender del catálogo real */
function miniCat() {
  const fw = (reqs) => ({ reqs });
  return {
    version: 'test',
    domains: [{ id: 'X', t: 'X' }],
    frameworks: {
      ens: fw([{ id: 'op.a', code: 'op.a', t: 'A', dims: 'C', bajo: 'n.a.', medio: 'aplica', alto: 'aplica' }]),
      iso27001: fw([{ id: 'A1', t: 'A1' }, { id: 'A2', t: 'A2' }]),
      nis2: fw([{ id: '1.1', t: 'N' }]),
      iso42001: fw([{ id: 'B1', t: 'B1' }])
    },
    controls: [
      { id: 'U1', dom: 'X', t: 'U1', maps: { ens: [{ id: 'op.a', w: 1 }], iso27001: [{ id: 'A1', w: 1 }, { id: 'A2', w: 0.5 }], nis2: [{ id: '1.1', w: 1 }], iso42001: [] } },
      { id: 'U2', dom: 'X', t: 'U2', maps: { ens: [], iso27001: [{ id: 'A2', w: 1 }], nis2: [{ id: '1.1', w: 0 }], iso42001: [{ id: 'B1', w: 1 }] } }
    ]
  };
}
const st = (controles = {}, extra = {}) => ({
  alcance: { ens: { on: true, categoria: 'ALTA', niveles: { C: 'ALTO' } }, iso27001: { on: true }, nis2: { on: true }, iso42001: { on: false } },
  controles, exclusiones: {}, ...extra
});

describe('API pública', () => {
  test('expone las funciones documentadas', () => {
    for (const k of ['indexar', 'calcular', 'coberturaReq', 'solapamiento', 'inferencia', 'equivalencias', 'prioridades', 'coherencia', 'planAccion', 'desdeSoaEns', 'nis2Aplicabilidad', 'orden', 'instantanea', 'parejasClase'])
      assert.equal(typeof E[k], 'function', k);
    assert.deepEqual(E.FW, ['ens', 'iso27001', 'nis2', 'iso42001']);
  });
});

describe('indexar', () => {
  const ix = E.indexar(miniCat());
  test('separa enlaces de cobertura (w > 0) y de relación (w = 0)', () => {
    assert.deepEqual(ix.reqUcs.nis2['1.1'], [{ uc: 'U1', w: 1 }]);
    assert.deepEqual(ix.reqRel.nis2['1.1'], [{ uc: 'U2', w: 0 }]);
    assert.deepEqual(ix.reqUcs.iso27001.A2, [{ uc: 'U1', w: 0.5 }, { uc: 'U2', w: 1 }]);
  });
});

describe('cobertura de requisitos', () => {
  const ix = E.indexar(miniCat());
  test('todo pendiente → brecha', () => {
    assert.equal(E.coberturaReq(ix, st(), 'iso27001', 'A1').estado, 'brecha');
    assert.equal(E.estadoUc(st(), 'U1'), 'pendiente');
  });
  test('media ponderada: total = 1, parcial = 0,5', () => {
    // A2 ← U1 (w 0,5) + U2 (w 1). U1 implantado, U2 pendiente → 0,5 / 1,5
    const r = E.coberturaReq(ix, st({ U1: { estado: 'implantado' } }), 'iso27001', 'A2');
    close(r.score, 0.5 / 1.5); assert.equal(r.estado, 'parcial');
    const r2 = E.coberturaReq(ix, st({ U1: { estado: 'parcial' }, U2: { estado: 'implantado' } }), 'iso27001', 'A2');
    close(r2.score, (0.5 * 0.5 + 1) / 1.5);
  });
  test('todos los controles implantados → cubierto', () => {
    assert.equal(E.coberturaReq(ix, st({ U1: { estado: 'implantado' }, U2: { estado: 'implantado' } }), 'iso27001', 'A2').estado, 'cubierto');
  });
  test('«no aplica» puntúa 0 y un estado desconocido cuenta como pendiente', () => {
    assert.equal(E.coberturaReq(ix, st({ U1: { estado: 'no-aplica' } }), 'iso27001', 'A1').estado, 'brecha');
    assert.equal(E.estadoUc(st({ U1: { estado: 'hackeado' } }), 'U1'), 'pendiente');
  });
  test('las exclusiones se respetan y conservan la justificación', () => {
    const r = E.coberturaReq(ix, st({}, { exclusiones: { iso27001: { A1: 'Sin desarrollo propio' } } }), 'iso27001', 'A1');
    assert.equal(r.estado, 'excluido'); assert.equal(r.justificacion, 'Sin desarrollo propio');
  });
  test('ENS: la exigencia depende del nivel de la dimensión', () => {
    const bajo = st(); bajo.alcance.ens.niveles = { C: 'BAJO' };
    assert.equal(E.coberturaReq(ix, bajo, 'ens', 'op.a').estado, 'no-exigido');
    assert.equal(E.coberturaReq(ix, st(), 'ens', 'op.a').estado, 'brecha');
  });
});

describe('calcular', () => {
  const ix = E.indexar(miniCat());
  test('grado por norma y KPI globales coherentes', () => {
    const r = E.calcular(ix, st({ U1: { estado: 'implantado' } }));
    assert.deepEqual(r.alcance, ['ens', 'iso27001', 'nis2']);
    close(r.fw.ens.grado, 1); close(r.fw.nis2.grado, 1);
    close(r.fw.iso27001.grado, (1 + 0.5 / 1.5) / 2);
    assert.equal(r.fw.iso42001.on, false);
    assert.equal(r.kpi.requisitos, 1 + 2 + 1);
    close(r.kpi.grado, (1 + (1 + 1 / 3) + 1) / 4);
    assert.equal(r.kpi.brechas, 0);
    assert.equal(r.kpi.controles, 2); // U2 sostiene A2 (ISO 27001 en alcance)
    assert.equal(r.kpi.multinorma, 1); // U1 cubre ENS, ISO 27001 y NIS2
  });
  test('un control solo de normas fuera de alcance no es relevante', () => {
    const s = st(); s.alcance.iso27001.on = false;
    const r = E.calcular(ix, s);
    assert.equal(r.controles.U2.relevante, false);
  });
});

describe('prioridades y plan', () => {
  const ix = E.indexar(miniCat());
  test('el control que más desbloquea va primero', () => {
    const s = st(); const p = E.prioridades(ix, s, E.calcular(ix, s));
    assert.equal(p[0].id, 'U1');
    assert.ok(p[0].ganancia > p[1].ganancia);
    assert.deepEqual(p[0].normas.sort(), ['ens', 'iso27001', 'nis2']);
  });
  test('los implantados no aparecen', () => {
    const s = st({ U1: { estado: 'implantado' } });
    assert.ok(!E.prioridades(ix, s, E.calcular(ix, s)).some((x) => x.id === 'U1'));
  });
});

describe('solapamiento e inferencia', () => {
  const ix = E.indexar(miniCat());
  test('una norma se cubre a sí misma al 100 %', () => {
    const m = E.solapamiento(ix);
    for (const f of E.FW) close(m[f][f].pct, 1, f);
  });
  test('inferencia: implantar ENS al 100 % cubre NIS2 1.1 vía U1', () => {
    close(E.inferencia(ix, st(), 'ens', 'nis2').grado, 1);
  });
});

describe('equivalencias (Prisma)', () => {
  const ix = E.indexar(miniCat());
  test('traduce ENS op.a a sus equivalentes con la fuerza correcta', () => {
    const r = E.equivalencias(ix, 'ens', 'op.a');
    assert.deepEqual(r.otras.iso27001.map((x) => [x.id, x.fuerza]), [['A1', 'total'], ['A2', 'parcial']]);
    assert.deepEqual(r.otras.nis2.map((x) => [x.id, x.fuerza]), [['1.1', 'total']]);
  });
});

describe('NIS2: aplicabilidad (arts. 2 y 3)', () => {
  const cases = [
    [{ especial: 'dns', tamano: 'micro' }, 'esencial'],
    [{ especial: 'admin-central' }, 'esencial'],
    [{ especial: 'telecom', tamano: 'grande' }, 'esencial'],
    [{ especial: 'telecom', tamano: 'pequena' }, 'importante'],
    [{ especial: 'admin-regional' }, 'a-confirmar'],
    [{ sector: 'anexo1', tamano: 'grande' }, 'esencial'],
    [{ sector: 'anexo1', tamano: 'mediana' }, 'importante'],
    [{ sector: 'anexo1', tamano: 'pequena' }, 'fuera'],
    [{ sector: 'anexo2', tamano: 'grande' }, 'importante'],
    [{ sector: 'anexo2', tamano: 'micro' }, 'fuera'],
    [{}, 'fuera'],
    [null, 'fuera']
  ];
  for (const [q, tipo] of cases) test(`${JSON.stringify(q)} → ${tipo}`, () => assert.equal(E.nis2Aplicabilidad(q).tipo, tipo));
  test('textos en inglés', () => assert.match(E.nis2Aplicabilidad({ sector: 'anexo1', tamano: 'grande' }, 'en').motivo, /Annex I/));
});

describe('utilidades', () => {
  test('orden natural de códigos', () => {
    assert.deepEqual(['A5.10', 'A5.9', 'A5.1', 'A8.2'].sort(E.orden), ['A5.1', 'A5.9', 'A5.10', 'A8.2']);
    assert.deepEqual(['op.acc.10', 'op.acc.2', 'org.1'].sort(E.orden), ['op.acc.2', 'op.acc.10', 'org.1']);
  });
  test('parseIsoRef extrae controles y cláusulas', () => {
    assert.deepEqual(E.parseIsoRef('5.1 Políticas; Cl. 5.2 Política; 8.20/8.21 Redes'), ['A5.1', 'C5.2', 'A8.20', 'A8.21']);
  });
  test('categoría ENS a partir de los niveles', () => {
    assert.equal(E.categoriaDeNiveles({ C: 'MEDIO', I: 'BAJO' }), 'MEDIA');
    assert.equal(E.categoriaDeNiveles({}), null);
    assert.equal(E.nivelExigidoEns('Categoría', {}, 'BÁSICA'), 'BAJO');
    assert.equal(E.nivelExigidoEns('CI', { C: 'MEDIO', I: 'ALTO' }, 'MEDIA'), 'ALTO');
  });
});

describe('casos de ejemplo con el catálogo real', () => {
  for (const caso of CASOS) {
    test(`${caso.id}: cálculo, coherencia y plan sin errores y con valores acotados`, () => {
      const r = E.calcular(IX, caso.state);
      for (const f of E.FW) { assert.ok(r.fw[f].grado >= 0 && r.fw[f].grado <= 1 + 1e-9, f); }
      assert.ok(r.kpi.grado >= 0 && r.kpi.grado <= 1);
      assert.ok(r.alcance.length >= 1);
      const co = E.coherencia(IX, caso.state, r, { hoy: '2026-10-01' });
      assert.ok(Array.isArray(co));
      for (const h of co) assert.ok(['Alta', 'Media', 'Baja'].includes(h.sev));
      const coEn = E.coherencia(IX, caso.state, r, { hoy: '2026-10-01', lang: 'en' });
      assert.equal(coEn.length, co.length);
      const plan = E.planAccion(IX, caso.state, r);
      assert.ok(Array.isArray(plan));
    });
  }
  test('instantánea reproducible del caso de clase (TechServ)', () => {
    const r = E.calcular(IX, CASOS.find((c) => c.id === 'techserv').state);
    assert.deepEqual(E.instantanea(r), { cov: { ens: 0.952, iso27001: 0.892, nis2: 0.875, iso42001: null }, grado: 0.905, brechas: 4 });
  });
  test('contraste ENS ↔ ISO 27001 con las parejas del material de clase', () => {
    const p = E.parejasClase(IX); const ref = require('../src/data/parejas.json');
    assert.equal(p.total, ref.total); assert.equal(p.coinciden, ref.coinciden); assert.equal(p.relacion, ref.relacion);
  });
});
