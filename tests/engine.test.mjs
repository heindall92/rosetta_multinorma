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
    for (const k of ['indexar', 'calcular', 'coberturaReq', 'solapamiento', 'inferencia', 'equivalencias', 'prioridades', 'coherencia', 'planAccion', 'desdeSoaEns', 'nis2Aplicabilidad', 'orden', 'instantanea', 'parejasClase',
      'perfilRegulatorio', 'perfilNormalizado', 'sugerirControles', 'fundirPropios', 'listaNormas', 'etiqueta'])
      assert.equal(typeof E[k], 'function', k);
    assert.deepEqual(E.FW, ['ens', 'iso27001', 'nis2', 'iso42001', 'partis', 'ria', 'cra', 'nist', 'dora', 'cl21663', 'cl21719', 'co1581', 'mx2025', 'pe29733', 'ar25326']);
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

describe('reglas de auditoría', () => {
  const cat = miniCat();
  cat.frameworks.iso27001.reqs.push({ id: 'C6.1', t: 'Cláusula' }, { id: 'A3', t: 'Solo parcial' });
  cat.frameworks.nis2.reqs.push({ id: '21.2', t: 'Art. 21.2' });
  cat.controls.push({ id: 'U3', dom: 'X', t: 'U3', maps: { ens: [], iso27001: [{ id: 'C6.1', w: 1 }, { id: 'A3', w: 0.5 }], nis2: [{ id: '21.2', w: 1 }], iso42001: [] } });
  const ix = E.indexar(cat);
  test('un requisito sostenido solo por enlaces parciales nunca llega a «cubierto»', () => {
    const r = E.coberturaReq(ix, st({ U3: { estado: 'implantado' } }), 'iso27001', 'A3');
    assert.equal(r.estado, 'parcial'); close(r.score, 0.5);
  });
  test('las cláusulas 4–10 y los arts. 20/21/23 de NIS2 no se pueden excluir', () => {
    assert.equal(E.excluible('iso27001', 'C6.1'), false); assert.equal(E.excluible('iso42001', 'C9.2'), false);
    assert.equal(E.excluible('iso27001', 'A5.1'), true);
    assert.equal(E.excluible('nis2', '21.2'), false); assert.equal(E.excluible('nis2', '2.1'), true);
    const s = st({}, { exclusiones: { iso27001: { 'C6.1': 'no' }, nis2: { '21.2': 'no' } } });
    assert.equal(E.coberturaReq(ix, s, 'iso27001', 'C6.1').estado, 'brecha');
    assert.equal(E.coberturaReq(ix, s, 'nis2', '21.2').estado, 'brecha');
  });
  test('la categoría ENS nunca queda por debajo de la que fijan los niveles', () => {
    assert.equal(E.categoriaEfectiva({ categoria: 'BÁSICA', niveles: { C: 'ALTO' } }), 'ALTA');
    assert.equal(E.categoriaEfectiva({ categoria: 'ALTA', niveles: { C: 'BAJO' } }), 'ALTA');
    assert.equal(E.categoriaEfectiva({ categoria: 'MEDIA', niveles: {} }), 'MEDIA');
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
    assert.deepEqual(ix.fw, ['ens', 'iso27001', 'nis2', 'iso42001'], 'el índice solo trae las normas del catálogo');
    for (const f of ix.fw) close(m[f][f].pct, 1, f);
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
    [{ especial: 'cer', tamano: 'micro' }, 'esencial'],
    [{ especial: 'tsp', tamano: 'micro' }, 'importante'],
    [{ especial: 'tsp', tamano: 'grande' }, 'esencial'],
    [{ especial: 'dora', sector: 'anexo1', tamano: 'grande' }, 'fuera'],
    [{ especial: 'excluida', sector: 'anexo1', tamano: 'grande' }, 'fuera'],
    [{}, 'fuera'],
    [null, 'fuera']
  ];
  for (const [q, tipo] of cases) test(`${JSON.stringify(q)} → ${tipo}`, () => assert.equal(E.nis2Aplicabilidad(q).tipo, tipo));
  test('el RE 2024/2690 solo se señala para entidades en el ámbito', () => {
    assert.equal(E.nis2Aplicabilidad({ sector: 'anexo1', tamano: 'grande', infraDigital: true }).cir, true);
    assert.equal(E.nis2Aplicabilidad({ sector: 'ninguno', infraDigital: true }).cir, false);
  });
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
    assert.deepEqual(E.instantanea(r), { cov: { ens: 0.929, iso27001: 0.887, nis2: 0.862, iso42001: null, partis: null, ria: null, cra: null, nist: null, dora: null, cl21663: null, cl21719: null, co1581: null, mx2025: null, pe29733: null, ar25326: null }, grado: 0.893, brechas: 4 });
  });
  test('contraste ENS ↔ ISO 27001 con las parejas del material de clase', () => {
    const p = E.parejasClase(IX); const ref = require('../src/data/parejas.json');
    assert.equal(p.total, ref.total); assert.equal(p.coinciden, ref.coinciden); assert.equal(p.relacion, ref.relacion);
  });
});

/* Correspondencias oficiales ENS ↔ ISO/IEC 27001:2022 de la guía CCN-STIC 825 (abril 2026) */
describe('CCN-STIC 825', () => {
  const CCN = require('../src/data/ccn825.json');
  const IXC = E.indexar(CAT, CCN);
  const ENS = CAT.frameworks.ens.reqs; const ISO = new Set(CAT.frameworks.iso27001.reqs.map((r) => r.id));
  const MEDIDAS = ENS.filter((r) => !r.id.startsWith('art.')).map((r) => r.id);
  const eqIso = (ens) => Object.fromEntries(E.equivalencias(IXC, 'ens', ens).otras.iso27001.map((x) => [x.id, x]));

  test('la guía cubre las 73 medidas del anexo II con códigos ISO válidos', () => {
    assert.deepEqual(Object.keys(CCN.medidas), MEDIDAS);
    for (const [id, m] of Object.entries(CCN.medidas)) {
      assert.ok(['analogo', 'parcial', 'nula'].includes(m.nivel), id);
      for (const c of [...m.principal, ...m.complementarios, ...(m.consideracion || [])]) assert.ok(ISO.has(c), `${id} → ${c}`);
      if (m.nivel !== 'nula') assert.ok(m.principal.length, `${id} sin control principal`);
    }
    for (const [c, x] of Object.entries(CCN.clausulas)) { assert.ok(ISO.has(c), c); for (const e of x.ens) assert.ok(ENS.some((r) => r.id === e), `${c} → ${e}`); }
  });
  test('reparto de niveles de compatibilidad de la guía: 42 análogas, 26 parciales, 5 nulas', () => {
    assert.deepEqual(E.contrasteCcn825(IXC).niveles, { analogo: 42, parcial: 26, nula: 5 });
  });
  test('cada control principal de la guía comparte un control unificado con su medida', () => {
    const r = E.contrasteCcn825(IXC);
    assert.deepEqual(r.faltan, []);
    assert.equal(r.porTipo.principal.conectadas, r.porTipo.principal.total);
  });
  test('la fuerza de las equivalencias ENS → ISO sale de la guía', () => {
    assert.equal(eqIso('org.1')['A5.1'].fuerza, 'total');                 // principal análogo
    assert.equal(eqIso('op.exp.7')['A5.24'].fuerza, 'parcial');           // principal parcialmente análogo
    assert.equal(eqIso('op.exp.7')['A5.25'].ccn.tipo, 'complementario');
    assert.equal(eqIso('mp.info.3')['A8.24'].fuerza, 'relacionado');      // medida sin equivalente en la ISO
    const g = eqIso('org.2')['A5.11']; assert.equal(g.fuerza, 'parcial'); assert.deepEqual(g.via, []); // solo en la guía
    assert.equal(eqIso('org.2')['A6.6'].fuerza, 'relacionado');          // apartado 7
  });
  test('ninguna equivalencia ENS ↔ ISO es total sin respaldo de la guía', () => {
    for (const id of ENS.map((r) => r.id)) for (const x of Object.values(eqIso(id))) {
      if (x.fuerza !== 'total') continue;
      assert.ok(x.ccn && ((x.ccn.tipo === 'principal' && x.ccn.nivel === 'analogo') || x.ccn.tipo === 'clausula'), `${id} → ${x.id}`);
    }
  });
  test('las equivalencias de criterio propio quedan marcadas y nunca pasan de parciales', () => {
    let n = 0;
    for (const id of ENS.map((r) => r.id)) for (const x of Object.values(eqIso(id))) if (!x.ccn) { n++; assert.notEqual(x.fuerza, 'total', `${id} → ${x.id}`); }
    assert.equal(n, E.contrasteCcn825(IXC).propias);
  });
  test('la equivalencia es simétrica: ISO → ENS da la misma fuerza que ENS → ISO', () => {
    for (const id of MEDIDAS) for (const x of Object.values(eqIso(id))) {
      const back = E.equivalencias(IXC, 'iso27001', x.id).otras.ens.find((y) => y.id === id);
      assert.ok(back, `${x.id} → ${id}`); assert.equal(back.fuerza, x.fuerza, `${id} ↔ ${x.id}`);
    }
  });
  test('sin la guía, el motor mantiene las equivalencias del catálogo', () => {
    const plain = E.equivalencias(IX, 'ens', 'org.2').otras.iso27001;
    assert.ok(plain.every((x) => x.ccn === undefined) && !plain.some((x) => x.id === 'A5.11'));
  });
});

/* ---------- 2.4.0 ---------- */
describe('Part-IS (Reglamentos (UE) 2023/203 y 2022/1645)', () => {
  const on = (controles = {}) => ({ alcance: { ens: { on: false }, iso27001: { on: true }, nis2: { on: true }, iso42001: { on: false }, partis: { on: true, regimen: 'I' } }, controles, exclusiones: {} });
  test('13 requisitos de organización, de .200 a .260, cada uno sostenido por algún control', () => {
    const ids = CAT.frameworks.partis.reqs.map((r) => r.id);
    assert.deepEqual(ids, ['200', '205', '210', '215', '220', '225', '230', '235', '240', '245', '250', '255', '260'].map((n) => 'OR.' + n));
    for (const id of ids) assert.ok(IX.reqUcs.partis[id].some((l) => l.w === 1), `${id} necesita un control que lo cubra por completo`);
  });
  test('no admite exclusiones requisito a requisito', () => {
    for (const r of CAT.frameworks.partis.reqs) assert.equal(E.excluible('partis', r.id), false);
    const c = E.coberturaReq(IX, { ...on(), exclusiones: { partis: { 'OR.230': 'no' } } }, 'partis', 'OR.230');
    assert.notEqual(c.estado, 'excluido');
  });
  test('ninguna equivalencia con Part-IS es total, en ningún sentido', () => {
    for (const r of CAT.frameworks.partis.reqs) {
      const eq = E.equivalencias(IX, 'partis', r.id);
      for (const g of IX.fw) for (const x of eq.otras[g] || []) assert.notEqual(x.fuerza, 'total', `partis ${r.id} → ${g} ${x.id}`);
    }
    for (const g of ['ens', 'iso27001', 'nis2']) for (const r of CAT.frameworks[g].reqs) for (const x of E.equivalencias(IX, g, r.id).otras.partis) assert.notEqual(x.fuerza, 'total', `${g} ${r.id} → partis`);
  });
  test('la notificación de NIS2 solo es parcial frente al punto .230', () => {
    const x = E.equivalencias(IX, 'nis2', '23.a').otras.partis.find((y) => y.id === 'OR.230');
    assert.equal(x.fuerza, 'parcial');
  });
  test('alertas CO-12 y CO-13 mientras falten la notificación a la autoridad y los riesgos de seguridad operacional', () => {
    const s1 = on(); const c1 = E.calcular(IX, s1); const h1 = E.coherencia(IX, s1, c1, { hoy: '2026-10-08' }).map((h) => h.id);
    assert.ok(h1.includes('CO-12') && h1.includes('CO-13'));
    const s2 = on({ 'INC-09': { estado: 'implantado' }, 'RIE-12': { estado: 'implantado' } }); const c2 = E.calcular(IX, s2);
    const h2 = E.coherencia(IX, s2, c2, { hoy: '2026-10-08' }).map((h) => h.id);
    assert.ok(!h2.includes('CO-12') && !h2.includes('CO-13'));
    const s3 = { ...s1, alcance: { ...s1.alcance, partis: { on: false } } };
    assert.ok(!E.coherencia(IX, s3, E.calcular(IX, s3)).some((h) => h.id === 'CO-12'), 'sin Part-IS en el alcance no hay alerta');
  });
  test('todo implantado → Part-IS al 100 %', () => {
    const all = Object.fromEntries(CAT.controls.map((c) => [c.id, { estado: 'implantado' }]));
    close(E.calcular(IX, on(all)).fw.partis.grado, 1);
  });
  test('el caso de aviación tiene Part-IS en el alcance con el régimen IS.I.OR', () => {
    const c = CASOS.find((x) => x.id === 'alas');
    assert.equal(c.state.alcance.partis.on, true); assert.equal(c.state.perfil.aviacion, 'I');
    assert.equal(E.perfilRegulatorio(c.state.perfil, c.state.nis2q).marcos.partis.estado, 'obligatoria');
  });
});

describe('perfil regulatorio', () => {
  const pr = (p, q, lang, propios) => E.perfilRegulatorio(p, q, lang, propios).marcos;
  test('ENS: obligatorio para el sector público (art. 2.1) y sus proveedores (art. 2.3); no aplica a la empresa privada ni fuera de España', () => {
    assert.deepEqual([pr({ publico: true }).ens.estado, pr({ publico: true }).ens.base], ['obligatoria', 'RD 311/2022, art. 2.1']);
    assert.deepEqual([pr({ proveedorPublico: true }).ens.estado, pr({ proveedorPublico: true }).ens.base], ['obligatoria', 'RD 311/2022, art. 2.3']);
    assert.equal(pr({}).ens.estado, 'no-aplica');
    assert.equal(pr({ jurisdiccion: 'ue', publico: true }).ens.estado, 'no-aplica');
  });
  test('NIS2 sigue el razonamiento de los arts. 2 y 3, con DORA como lex specialis y la UE como frontera', () => {
    assert.equal(pr({}, { sector: 'anexo1', tamano: 'grande' }).nis2.estado, 'obligatoria');
    assert.equal(pr({}, { sector: 'anexo1', tamano: 'pequena' }).nis2.estado, 'no-aplica');
    assert.equal(pr({}, { especial: 'admin-regional' }).nis2.estado, 'confirmar');
    assert.equal(pr({ financiera: true }, { sector: 'anexo1', tamano: 'grande' }).nis2.estado, 'confirmar');
    assert.match(pr({ financiera: true }, {}).nis2.base, /art\. 4/);
    assert.equal(pr({ jurisdiccion: 'fuera' }, { sector: 'anexo1', tamano: 'grande' }).nis2.estado, 'no-aplica');
    assert.equal(pr({ jurisdiccion: 'fuera' }, { infraDigital: true }).nis2.estado, 'confirmar');
  });
  test('Part-IS según el grupo de la aprobación, con su base y la posible derogación', () => {
    assert.match(pr({ aviacion: 'I' }).partis.base, /2023\/203/);
    assert.match(pr({ aviacion: 'D' }).partis.base, /2022\/1645/);
    const both = pr({ aviacion: 'ID' }).partis; assert.match(both.base, /2023\/203.*2022\/1645/);
    for (const a of ['I', 'D', 'ID']) { assert.equal(pr({ aviacion: a }).partis.estado, 'obligatoria'); assert.match(pr({ aviacion: a }).partis.motivo, /\.200 e/); }
    assert.equal(pr({ aviacion: 'I', jurisdiccion: 'fuera' }).partis.estado, 'obligatoria', 'la aprobación EASA manda, no el país');
    assert.equal(pr({}).partis.estado, 'no-aplica');
  });
  test('ISO/IEC 27001 siempre voluntaria; ISO/IEC 42001 solo si hay IA; los marcos propios, contractuales o voluntarios', () => {
    assert.equal(pr({}).iso27001.estado, 'voluntaria');
    assert.equal(pr({ ia: true }).iso42001.estado, 'voluntaria'); assert.equal(pr({}).iso42001.estado, 'no-aplica');
    assert.equal(pr({}, {}, 'es', ['mp-acme'])['mp-acme'].estado, 'voluntaria');
  });
  test('ya no quedan normas europeas pendientes: DORA, RIA y CRA están en Rosetta', () => {
    const f = E.perfilRegulatorio({ financiera: true, ia: true, fabricante: true }).futuras.map((x) => x.id);
    assert.deepEqual(f, []);
    assert.deepEqual(E.perfilRegulatorio({ jurisdiccion: 'fuera', financiera: true, ia: true }).futuras, []);
  });
  test('entradas hostiles o vacías se normalizan al perfil por defecto', () => {
    assert.deepEqual(E.perfilNormalizado({ jurisdiccion: '<x>', aviacion: 'Z', publico: 'true', __proto__: { ia: true } }), E.PERFIL_DEF);
    assert.deepEqual(E.perfilNormalizado(null), E.PERFIL_DEF);
  });
  test('cada estado propuesto es uno de los cuatro y lleva motivo, también en inglés', () => {
    for (const lang of ['es', 'en']) for (const x of Object.values(pr({ publico: true, aviacion: 'ID', ia: true }, { sector: 'anexo2', tamano: 'mediana' }, lang))) {
      assert.ok(E.ESTADOS_PERFIL.includes(x.estado)); assert.ok(x.motivo.length > 10);
    }
    assert.match(pr({}, {}, 'en').ens.motivo, /Private entity/);
  });
});

describe('marcos propios', () => {
  const ACME = { id: 'mp-acme', nombre: 'Política ACME', requisitos: [
    { id: 'A-01', titulo: 'Copias', controles: [{ control: 'ACT-08', w: 1 }] },
    { id: 'A-02', titulo: 'MFA', controles: [{ control: 'ACC-07', w: 0.5 }, { control: 'ACC-06', w: 0.5 }] },
    { id: 'A-03', titulo: 'Sin mapear', controles: [] }] };
  const ix = E.indexar(CAT, null, [ACME]);
  const s0 = (controles = {}) => ({ alcance: { iso27001: { on: true }, 'mp-acme': { on: true } }, controles, exclusiones: {} });
  test('se funde en un catálogo derivado sin tocar el publicado', () => {
    assert.deepEqual(ix.fw, [...E.FW, 'mp-acme']);
    assert.equal(ix.propio['mp-acme'], true); assert.equal(ix.propio.ens, false);
    assert.ok(!CAT.frameworks['mp-acme'] && !CAT.controls[0].maps['mp-acme'], 'el catálogo original no cambia');
    assert.equal(E.etiqueta(ix, 'mp-acme'), 'Política ACME'); assert.equal(E.etiqueta(ix, 'ens'), 'ENS');
  });
  test('su cumplimiento se calcula como el de cualquier norma', () => {
    const c = E.calcular(ix, s0({ 'ACT-08': { estado: 'implantado' }, 'ACC-07': { estado: 'implantado' } }));
    const r = Object.fromEntries(c.req['mp-acme'].map((x) => [x.id, x]));
    assert.equal(r['A-01'].estado, 'cubierto'); assert.equal(r['A-02'].estado, 'parcial'); assert.equal(r['A-03'].estado, 'brecha');
    assert.ok(c.alcance.includes('mp-acme'));
    assert.ok(c.controles['ACT-08'].normas.includes('mp-acme'));
  });
  test('alerta CO-14 con los requisitos sin controles', () => {
    const st1 = s0(); const h = E.coherencia(ix, st1, E.calcular(ix, st1)).find((x) => x.id === 'CO-14');
    assert.ok(h); assert.deepEqual(h.reqs, ['A-03']); assert.match(h.titulo, /Política ACME/);
  });
  test('equivalencias y solapamiento con las demás normas a través de los controles', () => {
    assert.ok(E.equivalencias(ix, 'mp-acme', 'A-01').otras.iso27001.length > 0);
    const m = E.solapamiento(ix);
    for (const f of ix.fw) { assert.ok(m['mp-acme'][f].pct >= 0 && m['mp-acme'][f].pct <= 1); assert.ok(m[f]['mp-acme'].pct >= 0 && m[f]['mp-acme'].pct <= 1); }
    close(m['mp-acme']['mp-acme'].pct, 1 / 3, 'solo A-01 tiene un control que lo cubre por completo');
  });
});

describe('sugerencias de mapeo', () => {
  test('propone el control obvio por palabras y en los dos idiomas', () => {
    assert.equal(E.sugerirControles(IX, 'Copias de seguridad cifradas y probadas cada trimestre')[0].id, 'ACT-08');
    assert.ok(E.sugerirControles(IX, 'Autenticación multifactor en los accesos remotos').some((x) => x.id === 'ACC-07'));
    assert.ok(E.sugerirControles(IX, 'Multi-factor authentication for remote access').some((x) => x.id === 'ACC-07'));
  });
  test('sin palabras útiles no propone nada y nunca más de lo pedido', () => {
    assert.deepEqual(E.sugerirControles(IX, ''), []); assert.deepEqual(E.sugerirControles(IX, 'de la y el'), []);
    assert.ok(E.sugerirControles(IX, 'gestión de incidentes de seguridad y notificación', 2).length <= 2);
  });
});

describe('RIA (Reglamento (UE) 2024/1689, modificado por el 2026/1744)', () => {
  const st = (ria, controles = {}) => ({ alcance: { iso42001: { on: true }, ria: { on: true, ...ria } }, controles, exclusiones: {} });
  const vivos = (ria) => E.calcular(IX, st(ria)).req.ria.filter((r) => r.estado !== 'no-exigido').map((r) => r.id);
  test('28 obligaciones con rol, riesgo, fecha de aplicación y fuente', () => {
    const R = CAT.frameworks.ria.reqs; assert.equal(R.length, 28); assert.equal(CAT.frameworks.ria.tope, 'parcial');
    for (const r of R) { assert.ok(['todos', 'proveedor', 'responsable'].includes(r.rol), r.id); assert.ok(['todos', 'alto', 'transparencia', 'gpai', 'sistemico'].includes(r.riesgo), r.id); assert.match(r.desde, /^20\d\d-\d\d-\d\d$/); assert.match(r.ref, /2024\/1689/); }
    for (const r of R) assert.ok(IX.reqUcs.ria[r.id].some((l) => l.w === 1), `${r.id} necesita un control que lo cubra por completo`);
  });
  test('fechas del Ómnibus: alto riesgo del anexo III desde el 02-12-2027; transparencia desde el 02-08-2026; arts. 4 y 5 desde el 02-02-2025', () => {
    const d = Object.fromEntries(CAT.frameworks.ria.reqs.map((r) => [r.id, r.desde]));
    assert.equal(d['4'], '2025-02-02'); assert.equal(d['5'], '2025-02-02'); assert.equal(d['9'], '2027-12-02'); assert.equal(d['50.1'], '2026-08-02'); assert.equal(d['53'], '2025-08-02');
  });
  test('lo que se exige depende del rol y del riesgo', () => {
    assert.deepEqual(vivos({ rol: 'responsable', alto: false, transparencia: false }), ['4', '5']);
    assert.deepEqual(vivos({ rol: 'responsable', alto: true, transparencia: false }), ['4', '5', '26.1', '26.2', '26.4', '26.6', '26.7', '27']);
    assert.ok(vivos({ rol: 'proveedor', alto: true, transparencia: false }).includes('43'));
    assert.ok(!vivos({ rol: 'proveedor', alto: true, transparencia: false }).includes('26.1'));
    assert.deepEqual(vivos({ rol: 'proveedor', alto: false, transparencia: true }), ['4', '5', '50.1', '50.2']);
    assert.ok(vivos({ rol: 'proveedor', alto: false, transparencia: false, gpai: 'si' }).includes('53'));
    assert.ok(!vivos({ rol: 'proveedor', alto: false, transparencia: false, gpai: 'si' }).includes('55'));
    assert.ok(vivos({ rol: 'proveedor', alto: false, transparencia: false, gpai: 'sistemico' }).includes('55'));
    assert.equal(E.calcular(IX, st({ rol: 'responsable', alto: false })).req.ria.find((r) => r.id === '9').motivo, 'rol');
  });
  test('sin exclusiones; valores de alcance hostiles se normalizan', () => {
    for (const r of CAT.frameworks.ria.reqs) assert.equal(E.excluible('ria', r.id), false);
    assert.deepEqual(E.riaAlcance({ rol: 'admin', gpai: '__proto__', alto: 'no' }), { rol: 'ambos', alto: true, transparencia: true, gpai: 'no' });
  });
  test('ninguna equivalencia con el RIA es total', () => {
    for (const r of CAT.frameworks.ria.reqs) for (const g of IX.fw) for (const x of E.equivalencias(IX, 'ria', r.id).otras[g] || []) assert.notEqual(x.fuerza, 'total', `ria ${r.id} → ${g}`);
  });
  test('alertas CO-15 y CO-16 hasta implantar la alfabetización y la revisión de prácticas prohibidas', () => {
    const a = st({ rol: 'ambos' }); const h = E.coherencia(IX, a, E.calcular(IX, a)).map((x) => x.id);
    assert.ok(h.includes('CO-15') && h.includes('CO-16'));
    const b = st({ rol: 'ambos' }, { 'IA-15': { estado: 'implantado' }, 'IA-16': { estado: 'implantado' } }); const h2 = E.coherencia(IX, b, E.calcular(IX, b)).map((x) => x.id);
    assert.ok(!h2.includes('CO-15') && !h2.includes('CO-16'));
  });
  test('perfil: obligatoria con IA en la UE, a confirmar fuera, no aplica sin IA; etiqueta en inglés', () => {
    assert.equal(E.perfilRegulatorio({ ia: true }).marcos.ria.estado, 'obligatoria');
    assert.equal(E.perfilRegulatorio({ ia: true, jurisdiccion: 'fuera' }).marcos.ria.estado, 'confirmar');
    assert.equal(E.perfilRegulatorio({}).marcos.ria.estado, 'no-aplica');
    assert.equal(E.etiqueta(IX, 'ria', 'en'), 'AI Act'); assert.equal(E.etiqueta(IX, 'ria'), 'RIA');
  });
  test('el control de conformidad GOB-15 sirve al RIA (y servirá al CRA)', () => {
    assert.deepEqual(CAT.controls.find((c) => c.id === 'GOB-15').maps.ria.map((m) => m.id), ['43', '49']);
  });
});
test('el motivo del RIA en el perfil es el vigente, no el de norma futura', () => {
  for (const l of ['es', 'en']) assert.doesNotMatch(E.perfilRegulatorio({ ia: true }, {}, l).marcos.ria.motivo, /2\.5\.0/);
  assert.match(E.perfilRegulatorio({ ia: true }).marcos.ria.motivo, /02-12-2027/);
});

describe('CRA (Reglamento (UE) 2024/2847)', () => {
  const st = (controles = {}, exclusiones = {}) => ({ alcance: { iso27001: { on: true }, cra: { on: true, clase: 'importante1' } }, controles, exclusiones });
  test('29 requisitos: 14 propiedades del producto, 8 de gestión de vulnerabilidades y 7 obligaciones del fabricante', () => {
    const R = CAT.frameworks.cra.reqs; assert.equal(R.length, 29); assert.equal(CAT.frameworks.cra.tope, 'parcial');
    assert.equal(R.filter((r) => r.id.startsWith('I.')).length, 14); assert.equal(R.filter((r) => r.id.startsWith('II.')).length, 8);
    for (const r of R) assert.ok(IX.reqUcs.cra[r.id].some((l) => l.w === 1), `${r.id} necesita un control que lo cubra por completo`);
  });
  test('fechas: notificación (art. 14) desde el 11-09-2026; el resto desde el 11-12-2027', () => {
    for (const r of CAT.frameworks.cra.reqs) assert.equal(r.desde, r.id === '14' ? '2026-09-11' : '2027-12-11', r.id);
  });
  test('solo los puntos 2 b–m de la parte I admiten exclusión justificada', () => {
    assert.equal(E.excluible('cra', 'I.2.b'), true); assert.equal(E.excluible('cra', 'I.2.m'), true);
    for (const id of ['I.1', 'I.2.a', 'II.1', '14', '32']) assert.equal(E.excluible('cra', id), false, id);
    const c = E.calcular(IX, st({}, { cra: { 'I.2.g': 'No trata datos personales', '14': 'no' } }));
    const e = Object.fromEntries(c.req.cra.map((r) => [r.id, r.estado]));
    assert.equal(e['I.2.g'], 'excluido'); assert.notEqual(e['14'], 'excluido');
  });
  test('ninguna equivalencia con el CRA es total; GOB-15 sirve al RIA y al CRA', () => {
    for (const r of CAT.frameworks.cra.reqs) for (const g of IX.fw) for (const x of E.equivalencias(IX, 'cra', r.id).otras[g] || []) assert.notEqual(x.fuerza, 'total', `cra ${r.id} → ${g}`);
    const g15 = CAT.controls.find((c) => c.id === 'GOB-15').maps;
    assert.ok(g15.ria.length && g15.cra.some((m) => m.id === '32'));
  });
  test('alertas CO-17 (sin notificación a ENISA) y CO-18 (sin SBOM)', () => {
    const a = st(); const h = E.coherencia(IX, a, E.calcular(IX, a)).map((x) => x.id);
    assert.ok(h.includes('CO-17') && h.includes('CO-18'));
    const b = st({ 'INC-11': { estado: 'implantado' }, 'DES-09': { estado: 'implantado' } }); const h2 = E.coherencia(IX, b, E.calcular(IX, b)).map((x) => x.id);
    assert.ok(!h2.includes('CO-17') && !h2.includes('CO-18'));
  });
  test('perfil: obligatorio para el fabricante en la UE, a confirmar fuera, no aplica si no fabrica', () => {
    assert.equal(E.perfilRegulatorio({ fabricante: true }).marcos.cra.estado, 'obligatoria');
    assert.match(E.perfilRegulatorio({ fabricante: true }).marcos.cra.motivo, /11-09-2026/);
    assert.equal(E.perfilRegulatorio({ fabricante: true, jurisdiccion: 'fuera' }).marcos.cra.estado, 'confirmar');
    assert.equal(E.perfilRegulatorio({}).marcos.cra.estado, 'no-aplica');
    assert.deepEqual(E.craAlcance({ clase: '<x>' }), { clase: 'predeterminada' });
  });
  test('el caso del fabricante trae el CRA de clase I', () => {
    const c = CASOS.find((x) => x.id === 'sensorica');
    assert.equal(c.state.alcance.cra.on, true); assert.equal(c.state.alcance.cra.clase, 'importante1'); assert.equal(c.state.perfil.fabricante, true);
  });
});

describe('NIST CSF 2.0', () => {
  const R = CAT.frameworks.nist.reqs;
  test('6 funciones, 22 categorías y 106 subcategorías con su código oficial', () => {
    assert.equal(R.length, 106);
    assert.deepEqual([...new Set(R.map((r) => r.id.slice(0, 2)))], ['GV', 'ID', 'PR', 'DE', 'RS', 'RC']);
    assert.equal(new Set(R.map((r) => r.id.split('-')[0])).size, 22);
    for (const r of R) assert.match(r.id, /^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d\d$/);
    const n = (p) => R.filter((r) => r.id.startsWith(p)).length;
    assert.deepEqual([n('GV'), n('ID'), n('PR'), n('DE'), n('RS'), n('RC')], [31, 21, 22, 11, 13, 8]);
  });
  test('cada subcategoría tiene un control que la cubre por completo', () => {
    for (const r of R) assert.ok(IX.reqUcs.nist[r.id].some((l) => l.w === 1), r.id);
  });
  test('voluntario: admite exclusiones (perfil organizativo) y el perfil lo propone como voluntario', () => {
    assert.equal(E.excluible('nist', 'GV.OC-01'), true);
    assert.equal(E.perfilRegulatorio({}).marcos.nist.estado, 'voluntaria');
  });
  test('con todos los controles implantados, el CSF queda al 100 %; ISO/IEC 27001 cubre gran parte', () => {
    const all = Object.fromEntries(CAT.controls.map((c) => [c.id, { estado: 'implantado' }]));
    close(E.calcular(IX, { alcance: { nist: { on: true } }, controles: all, exclusiones: {} }).fw.nist.grado, 1);
    assert.ok(E.solapamiento(IX).iso27001.nist.pct > 0.8);
  });
});

describe('DORA (Reglamento (UE) 2022/2554)', () => {
  const st = (dora, controles = {}) => ({ alcance: { iso27001: { on: true }, dora: { on: true, ...dora } }, controles, exclusiones: {} });
  const vivos = (d) => E.calcular(IX, st(d)).req.dora.filter((r) => r.estado !== 'no-exigido').map((r) => r.id);
  test('24 requisitos de los capítulos II a VI, aplicables desde el 17-01-2025', () => {
    const R = CAT.frameworks.dora.reqs; assert.equal(R.length, 24); assert.equal(CAT.frameworks.dora.tope, 'parcial');
    for (const r of R) { assert.equal(r.desde, '2025-01-17'); assert.ok(IX.reqUcs.dora[r.id].some((l) => l.w === 1), r.id); }
  });
  test('régimen general frente a simplificado (art. 16) y TLPT solo para entidades designadas', () => {
    const g = vivos({ regimen: 'general' }); assert.ok(g.includes('6') && !g.includes('16') && !g.includes('26'));
    const s2 = vivos({ regimen: 'simplificado' }); assert.ok(s2.includes('16') && !s2.includes('6') && s2.includes('19'));
    assert.ok(vivos({ regimen: 'general', tlpt: true }).includes('26'));
    assert.equal(E.calcular(IX, st({ regimen: 'simplificado' })).req.dora.find((r) => r.id === '9').motivo, 'simplificado');
  });
  test('solo el art. 45 (intercambio de información) es excluible', () => {
    assert.equal(E.excluible('dora', '45'), true);
    for (const id of ['5', '19', '28.3']) assert.equal(E.excluible('dora', id), false);
    assert.deepEqual(E.doraAlcance({ regimen: 'x', tlpt: 'si' }), { regimen: 'general', tlpt: false });
  });
  test('plazos de notificación del Reglamento Delegado (UE) 2025/301 en la ficha del art. 19', () => {
    assert.match(CAT.frameworks.dora.reqs.find((r) => r.id === '19').nota, /4 h.*24 h.*72 h.*un mes/);
  });
  test('alertas CO-19 y CO-20; perfil: obligatoria para entidades financieras de la UE', () => {
    const a = st({}); const h = E.coherencia(IX, a, E.calcular(IX, a)).map((x) => x.id);
    assert.ok(h.includes('CO-19') && h.includes('CO-20'));
    assert.equal(E.perfilRegulatorio({ financiera: true }).marcos.dora.estado, 'obligatoria');
    assert.equal(E.perfilRegulatorio({ financiera: true }).marcos.nis2.estado, 'confirmar');
    assert.equal(E.perfilRegulatorio({}).marcos.dora.estado, 'no-aplica');
  });
  test('ninguna equivalencia con DORA es total', () => {
    for (const r of CAT.frameworks.dora.reqs) for (const g of IX.fw) for (const x of E.equivalencias(IX, 'dora', r.id).otras[g] || []) assert.notEqual(x.fuerza, 'total', `dora ${r.id} → ${g}`);
  });
});

describe('Chile: Ley 21.663 y Ley 21.719', () => {
  test('requisitos con fecha, región y cobertura completa', () => {
    const A = CAT.frameworks.cl21663, B = CAT.frameworks.cl21719;
    assert.equal(A.region, 'cl'); assert.equal(B.region, 'cl'); assert.equal(B.datos, true);
    assert.equal(A.reqs.length, 10); assert.equal(B.reqs.length, 10);
    for (const r of A.reqs) assert.equal(r.desde, '2025-03-01'); for (const r of B.reqs) assert.equal(r.desde, '2026-12-01');
    for (const f of ['cl21663', 'cl21719']) for (const r of CAT.frameworks[f].reqs) assert.ok(IX.reqUcs[f][r.id].some((l) => l.w === 1), `${f} ${r.id}`);
    assert.match(A.reqs.find((r) => r.id === '9').nota, /3 horas.*72 horas.*15 días/);
    assert.match(B.reqs.find((r) => r.id === 'pri').nota, /18\.623-07/);
  });
  test('los deberes del art. 8 solo para operadores de importancia vital', () => {
    const vivos = (oiv) => E.calcular(IX, { alcance: { cl21663: { on: true, oiv } }, controles: {}, exclusiones: {} }).req.cl21663.filter((r) => r.estado !== 'no-exigido').map((r) => r.id);
    assert.deepEqual(vivos(false), ['7', '9']); assert.equal(vivos(true).length, 10);
  });
  test('perfil por país: obligatoria donde está establecida, a confirmar donde opera, no aplica fuera', () => {
    const p = (perfil, q) => E.perfilRegulatorio(perfil, q || {}).marcos;
    assert.equal(p({ jurisdiccion: 'cl' }, { sector: 'anexo1', tamano: 'grande' }).cl21663.estado, 'obligatoria');
    assert.equal(p({ jurisdiccion: 'cl' }).cl21663.estado, 'confirmar');
    assert.equal(p({ jurisdiccion: 'cl' }).cl21719.estado, 'obligatoria');
    assert.equal(p({ jurisdiccion: 'es', opera: ['cl'] }).cl21719.estado, 'confirmar');
    assert.equal(p({ jurisdiccion: 'es' }).cl21719.estado, 'no-aplica');
    assert.equal(p({ jurisdiccion: 'cl' }).nis2.estado, 'no-aplica', 'NIS2 no aplica en Chile');
    assert.equal(p({ jurisdiccion: 'cl', publico: true }).ens.estado, 'no-aplica', 'el ENS es solo para España');
    assert.deepEqual(E.perfilNormalizado({ opera: ['cl', 'pe', 'cl', '__proto__', 'us'] }).opera, ['cl', 'pe']);
  });
  test('alertas CO-21 (sin reporte al CSIRT Nacional) y CO-22 (sin procedimiento de vulneraciones)', () => {
    const st = { alcance: { cl21663: { on: true }, cl21719: { on: true } }, controles: {}, exclusiones: {} };
    const h = E.coherencia(IX, st, E.calcular(IX, st)).map((x) => x.id);
    assert.ok(h.includes('CO-21') && h.includes('CO-22'));
  });
});

describe('Protección de datos en Colombia, México, Perú y Argentina', () => {
  const L = { co1581: ['co', 11], mx2025: ['mx', 10], pe29733: ['pe', 9], ar25326: ['ar', 10] };
  test('cada ley con su región, sus requisitos y cobertura completa con el dominio de privacidad', () => {
    for (const [f, [r, n]] of Object.entries(L)) {
      const F = CAT.frameworks[f]; assert.equal(F.region, r); assert.equal(F.datos, true); assert.equal(F.reqs.length, n, f);
      for (const q of F.reqs) assert.ok(IX.reqUcs[f][q.id].some((l) => l.w === 1), `${f} ${q.id}`);
    }
  });
  test('plazos clave en la ficha: SIC en 15 días hábiles, ANPD en 48 horas, ARCO en México', () => {
    assert.match(CAT.frameworks.co1581.reqs.find((r) => r.id === 'inc').t, /15 días hábiles/);
    assert.match(CAT.frameworks.pe29733.reqs.find((r) => r.id === 'inc').t, /48 horas/);
    assert.match(CAT.frameworks.mx2025.reqs.find((r) => r.id === 'arco').nota, /Veinte días/);
  });
  test('Argentina no obliga a notificar brechas: sin alerta CO-22; las demás sí', () => {
    const al = (f) => ({ alcance: { [f]: { on: true } }, controles: {}, exclusiones: {} });
    const co22 = (f) => E.coherencia(IX, al(f), E.calcular(IX, al(f))).some((h) => h.id === 'CO-22');
    assert.equal(co22('ar25326'), false); for (const f of ['co1581', 'mx2025', 'pe29733']) assert.equal(co22(f), true, f);
  });
  test('perfil: obligatoria en su país, a confirmar si opera allí, no aplica en otro caso', () => {
    const m = E.perfilRegulatorio({ jurisdiccion: 'mx', opera: ['co'] }).marcos;
    assert.equal(m.mx2025.estado, 'obligatoria'); assert.equal(m.co1581.estado, 'confirmar'); assert.equal(m.pe29733.estado, 'no-aplica');
    assert.equal(E.perfilRegulatorio({ jurisdiccion: 'ar' }).marcos.ar25326.estado, 'obligatoria');
  });
  test('solo lo que depende del tamaño o la actividad es excluible (registro, oficial)', () => {
    assert.equal(E.excluible('co1581', 'rnbd'), true); assert.equal(E.excluible('co1581', 'inc'), false);
    assert.equal(E.excluible('pe29733', 'oficial'), true); assert.equal(E.excluible('ar25326', 'reg'), true); assert.equal(E.excluible('mx2025', 'vul'), false);
  });
});

describe('Ecosistema: CTEM-Nexus (2.11)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dirFx = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures');
  const ida = JSON.parse(fs.readFileSync(path.join(dirFx, 'ctem-a-rosetta.json'), 'utf8'));
  const caso = CASOS.find((c) => c.id === 'techserv');
  const base = () => { const s = JSON.parse(JSON.stringify(caso.state)); for (const d of ida.datos) s.controles[d.control] = { ...s.controles[d.control], estado: 'parcial' }; s.controles['OPE-04'] = { ...s.controles['OPE-04'], estado: 'implantado' }; s.controles['ACC-06'] = { ...s.controles['ACC-06'], estado: 'parcial' }; return s; };

  test('lee el sobre de CTEM-Nexus sin perder nada', () => {
    const c = E.desdeCtem(ida);
    assert.equal(c.proyecto, ida.proyecto);
    assert.equal(c.generado, ida.origen.generado);
    assert.deepEqual(Object.values(c.controles), ida.datos);
  });
  test('rechaza otros sobres y sanea la evidencia', () => {
    assert.equal(E.desdeCtem({ ...ida, origen: { ...ida.origen, herramienta: 'kairos' } }), null);
    assert.equal(E.desdeCtem({ ...ida, tipo: 'indicadores' }), null);
    assert.equal(E.desdeCtem({ ...ida, version: 2 }), null);
    const mal = E.desdeCtem({ ...ida, datos: [{ control: 'XX', abiertos: 1 }, { control: 'OPE-04', porBanda: { critica: -3, alta: 'x' }, hallazgos: [{ id: 'H1', banda: 'enorme', estado: 'raro', cve: 'nada', vence: 'mañana' }, { titulo: 'sin id' }], iso27001: ['A8.8', 'texto largo de una norma'] }] });
    assert.deepEqual(Object.keys(mal.controles), ['OPE-04']);
    const e = mal.controles['OPE-04'];
    assert.deepEqual(e.porBanda, { critica: 0, alta: 0, media: 0, baja: 0 });
    assert.deepEqual(e.hallazgos, [{ id: 'H1', titulo: '', cve: null, banda: 'baja', puntuacion: 0, activo: '', estado: 'abierto', vence: '' }]);
    assert.deepEqual(e.iso27001, ['A8.8']);
  });
  test('CO-23: control implantado con hallazgos críticos o altos abiertos', () => {
    const s = base(); s.ctem = E.desdeCtem(ida);
    const r = E.calcular(IX, s);
    const co = E.coherencia(IX, s, r, { hoy: '2026-10-09' }).filter((h) => h.id === 'CO-23');
    const ev = s.ctem.controles['OPE-04'];
    assert.ok(ev.porBanda.critica + ev.porBanda.alta > 0, 'la demo tiene exposición crítica o alta en OPE-04');
    assert.deepEqual(co.map((h) => h.ambito), ['OPE-04']); // ACC-06 está parcial: no salta
    assert.equal(co[0].sev, 'Alta');
    assert.match(co[0].detalle, /H-\d+/);
    const en = E.coherencia(IX, s, r, { hoy: '2026-10-09', lang: 'en' }).find((h) => h.id === 'CO-23');
    assert.match(en.titulo, /CTEM-Nexus sees/);
    delete s.ctem;
    assert.equal(E.coherencia(IX, s, E.calcular(IX, s), { hoy: '2026-10-09' }).filter((h) => h.id === 'CO-23').length, 0);
  });
  test('devuelve el estado de los 152 controles y la evidencia recibida sin cambios (ida y vuelta)', () => {
    const s = base(); s.ctem = E.desdeCtem(ida);
    const vuelta = E.aCtem(IX, s, '2.11.0', new Date('2026-09-16T10:00:00Z'));
    assert.equal(vuelta.format, 'yrd-ecosistema');
    assert.equal(vuelta.tipo, 'controles');
    assert.equal(vuelta.origen.herramienta, 'rosetta');
    assert.equal(vuelta.datos.length, CAT.controls.length);
    assert.equal(vuelta.datos.find((d) => d.control === 'OPE-04').estado, 'implantado');
    assert.deepEqual(vuelta.datos.filter((d) => d.ctem).map((d) => d.ctem), ida.datos.slice().sort((a, b) => CAT.controls.findIndex((c) => c.id === a.control) - CAT.controls.findIndex((c) => c.id === b.control)));
    const out = path.join(dirFx, 'rosetta-a-ctem.json');
    if (process.env.GOLDEN === '1' || !fs.existsSync(out)) fs.writeFileSync(out, JSON.stringify(vuelta, null, 1) + '\n');
    assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), JSON.parse(JSON.stringify(vuelta)));
  });
});
