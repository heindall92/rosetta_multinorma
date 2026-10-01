/* Rosetta · motor de cálculo (sin DOM). Funciona en el navegador (window.RosettaEngine) y en Node (require).
 * Modelo: una lista de controles unificados, cada uno enlazado con requisitos de hasta cuatro normas.
 * Un requisito está cubierto cuando lo están todos los controles que lo soportan (media ponderada:
 * correspondencia total = 1, parcial = 0,5). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RosettaEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FW = ['ens', 'iso27001', 'nis2', 'iso42001'];
  const FW_LABEL = { ens: 'ENS', iso27001: 'ISO/IEC 27001', nis2: 'NIS2', iso42001: 'ISO/IEC 42001' };
  const FW_LONG = { ens: 'Esquema Nacional de Seguridad (RD 311/2022)', iso27001: 'ISO/IEC 27001:2022', nis2: 'Directiva NIS2 y RE 2024/2690', iso42001: 'ISO/IEC 42001:2023' };
  const FW_LONG_EN = { ens: 'Spanish National Security Framework (RD 311/2022)', iso27001: 'ISO/IEC 27001:2022', nis2: 'NIS2 Directive and IR 2024/2690', iso42001: 'ISO/IEC 42001:2023' };
  const ESTADOS = ['implantado', 'parcial', 'pendiente', 'no-aplica'];
  const ESTADO_LABEL = { implantado: 'Implantado', parcial: 'Parcial', pendiente: 'Pendiente', 'no-aplica': 'No aplica' };
  const ESTADO_LABEL_EN = { implantado: 'Implemented', parcial: 'Partial', pendiente: 'Pending', 'no-aplica': 'Not applicable' };
  const SCORE = { implantado: 1, parcial: 0.5, pendiente: 0, 'no-aplica': 0 };
  const W = { total: 1, parcial: 0.5, relacion: 0 };
  const NIVELES_ENS = ['BAJO', 'MEDIO', 'ALTO'];
  const CAT_NIVEL = { 'BÁSICA': 'BAJO', MEDIA: 'MEDIO', ALTA: 'ALTO' };
  const DIMS = ['D', 'I', 'C', 'A', 'T'];
  const EPS = 1e-9;

  /* ---------- Índices ---------- */
  function indexar(cat) {
    const reqUcs = {}; const reqRel = {}; const ucMap = {}; const req = {};
    for (const f of FW) {
      reqUcs[f] = {}; reqRel[f] = {}; req[f] = {};
      for (const r of cat.frameworks[f].reqs) { req[f][r.id] = r; reqUcs[f][r.id] = []; reqRel[f][r.id] = []; }
    }
    for (const c of cat.controls) {
      ucMap[c.id] = c;
      for (const f of FW) for (const m of c.maps[f] || []) if (reqUcs[f][m.id]) (m.w > 0 ? reqUcs : reqRel)[f][m.id].push({ uc: c.id, w: m.w });
    }
    return { cat, reqUcs, reqRel, ucMap, req };
  }

  /* ---------- Alcance ---------- */
  function nivelExigidoEns(dims, niveles, categoria) {
    if (dims === 'Categoría') return CAT_NIVEL[categoria] || 'ALTO';
    let best = null;
    for (const d of String(dims).split('')) {
      if (!DIMS.includes(d)) continue;
      const n = niveles && NIVELES_ENS.includes(niveles[d]) ? niveles[d] : (CAT_NIVEL[categoria] || 'ALTO');
      if (!best || NIVELES_ENS.indexOf(n) > NIVELES_ENS.indexOf(best)) best = n;
    }
    return best || CAT_NIVEL[categoria] || 'ALTO';
  }
  const exigidaEns = (txt) => { const s = String(txt || '').trim(); return !!s && !/^n\.?a\.?$/i.test(s); };
  function categoriaDeNiveles(niveles) {
    const vals = DIMS.map((d) => niveles && niveles[d]).filter((x) => NIVELES_ENS.includes(x));
    if (!vals.length) return null;
    const max = vals.reduce((a, b) => (NIVELES_ENS.indexOf(b) > NIVELES_ENS.indexOf(a) ? b : a));
    return { BAJO: 'BÁSICA', MEDIO: 'MEDIA', ALTO: 'ALTA' }[max];
  }

  /** Categoría ENS efectiva: nunca inferior a la que exigen los niveles de las dimensiones (Anexo I del RD 311/2022). */
  function categoriaEfectiva(a) {
    const orden = ['BÁSICA', 'MEDIA', 'ALTA'];
    const porNiveles = categoriaDeNiveles(a && a.niveles);
    const declarada = a && orden.includes(a.categoria) ? a.categoria : null;
    if (!porNiveles) return declarada || 'ALTA';
    if (!declarada) return porNiveles;
    return orden.indexOf(porNiveles) > orden.indexOf(declarada) ? porNiveles : declarada;
  }

  /* Requisitos que no se pueden excluir: las cláusulas 4–10 de los sistemas de gestión (ISO/IEC 27001 4.3 solo
   * permite excluir controles del Anexo A, vía 6.1.3 d) y las obligaciones de los arts. 20, 21 y 23 de NIS2. */
  function excluible(f, id) {
    const s = String(id);
    if (f === 'iso27001' || f === 'iso42001') return !/^C\d/.test(s);
    if (f === 'nis2') return !/^(20|21|23)\./.test(s);
    return true;
  }

  /** ¿Está la norma en el alcance del proyecto? */
  const enAlcance = (st, f) => !!(st.alcance && st.alcance[f] && st.alcance[f].on);

  /** Aplicabilidad de un requisito según la norma (solo el ENS depende del nivel). */
  function aplicaReq(ix, st, f, id) {
    if (f !== 'ens') return { aplica: true };
    const r = ix.req.ens[id]; const a = st.alcance.ens || {};
    const nivel = nivelExigidoEns(r.dims, a.niveles, categoriaEfectiva(a));
    const exig = r[nivel.toLowerCase()];
    return { aplica: exigidaEns(exig), nivel, exigencia: exig };
  }

  /* ---------- Cobertura ---------- */
  function estadoUc(st, id) { const c = (st.controles || {})[id]; return c && ESTADOS.includes(c.estado) ? c.estado : 'pendiente'; }

  function coberturaReq(ix, st, f, id) {
    const ex = excluible(f, id) && st.exclusiones && st.exclusiones[f] && Object.prototype.hasOwnProperty.call(st.exclusiones[f], id) ? st.exclusiones[f][id] : undefined;
    const ap = aplicaReq(ix, st, f, id);
    const links = ix.reqUcs[f][id] || [];
    let num = 0, den = 0; const detalle = [];
    for (const l of links) { const e = estadoUc(st, l.uc); num += l.w * SCORE[e]; den += l.w; detalle.push({ uc: l.uc, w: l.w, estado: e }); }
    // Techo: si ningún control equivale por completo (todos w = 0,5), el requisito nunca pasa de «parcial».
    const techo = links.reduce((a, l) => Math.max(a, l.w), 0);
    const score = den ? (num / den) * techo : 0;
    let estado;
    if (!ap.aplica) estado = 'no-exigido';
    else if (ex !== undefined) estado = 'excluido';
    else if (score >= 1 - EPS) estado = 'cubierto';
    else if (score > EPS) estado = 'parcial';
    else estado = 'brecha';
    return { f, id, estado, score, detalle, justificacion: ex, ...ap };
  }

  function calcular(ix, st) {
    const out = { fw: {}, req: {}, controles: {}, alcance: FW.filter((f) => enAlcance(st, f)) };
    for (const f of FW) {
      const rows = ix.cat.frameworks[f].reqs.map((r) => coberturaReq(ix, st, f, r.id));
      out.req[f] = rows;
      const vivos = rows.filter((r) => r.estado !== 'no-exigido' && r.estado !== 'excluido');
      const n = vivos.length;
      const sum = vivos.reduce((a, r) => a + r.score, 0);
      out.fw[f] = { f, on: enAlcance(st, f), total: rows.length, aplicables: n, cubiertos: vivos.filter((r) => r.estado === 'cubierto').length,
        parciales: vivos.filter((r) => r.estado === 'parcial').length, brechas: vivos.filter((r) => r.estado === 'brecha').length,
        excluidos: rows.filter((r) => r.estado === 'excluido').length, noExigidos: rows.filter((r) => r.estado === 'no-exigido').length, grado: n ? sum / n : 0 };
    }
    // Controles relevantes: los que sostienen algún requisito vivo de una norma en alcance
    const vivoSet = {};
    for (const f of out.alcance) { vivoSet[f] = new Set(out.req[f].filter((r) => r.estado !== 'no-exigido' && r.estado !== 'excluido').map((r) => r.id)); }
    let links = 0;
    for (const c of ix.cat.controls) {
      const reqs = {}; let nreq = 0;
      for (const f of out.alcance) { reqs[f] = (c.maps[f] || []).filter((m) => m.w > 0 && vivoSet[f].has(m.id)); nreq += reqs[f].length; }
      const normas = Object.keys(reqs).filter((f) => reqs[f].length);
      out.controles[c.id] = { id: c.id, estado: estadoUc(st, c.id), relevante: nreq > 0, reqs, nreq, normas };
      if (nreq > 0) links += nreq;
    }
    const rel = Object.values(out.controles).filter((c) => c.relevante);
    const reqsVivos = out.alcance.reduce((a, f) => a + out.fw[f].aplicables, 0);
    const puntos = out.alcance.reduce((a, f) => a + out.fw[f].grado * out.fw[f].aplicables, 0);
    out.kpi = {
      normas: out.alcance.length, requisitos: reqsVivos, controles: rel.length,
      implantados: rel.filter((c) => c.estado === 'implantado').length, parciales: rel.filter((c) => c.estado === 'parcial').length,
      pendientes: rel.filter((c) => c.estado === 'pendiente').length, noAplica: rel.filter((c) => c.estado === 'no-aplica').length,
      reutilizacion: rel.length ? links / rel.length : 0, multinorma: rel.filter((c) => c.normas.length >= 2).length,
      ahorro: reqsVivos ? 1 - rel.length / reqsVivos : 0, grado: reqsVivos ? puntos / reqsVivos : 0,
      brechas: out.alcance.reduce((a, f) => a + out.fw[f].brechas, 0)
    };
    return out;
  }

  /* ---------- Solapamiento entre normas ----------
   * solape[A][B]: parte de los requisitos de B que quedaría cubierta si se implantasen todos los controles que
   * sostienen requisitos de A. Es estático (no depende del estado), y responde a «si ya cumplo A, ¿cuánto tengo de B?». */
  function solapamiento(ix) {
    const m = {};
    for (const a of FW) {
      const ucsA = new Set();
      for (const c of ix.cat.controls) if ((c.maps[a] || []).some((x) => x.w >= 1)) ucsA.add(c.id); // controles que A exige por completo
      m[a] = {};
      for (const b of FW) {
        const reqs = ix.cat.frameworks[b].reqs;
        let s = 0, total = 0, directos = 0;
        for (const r of reqs) {
          const ls = ix.reqUcs[b][r.id]; let num = 0, den = 0;
          for (const l of ls) { den += l.w; if (ucsA.has(l.uc)) num += l.w; }
          const v = den ? num / den : 0; s += v; total++; if (v >= 1 - EPS) directos++;
        }
        m[a][b] = { pct: total ? s / total : 0, completos: directos, total };
      }
    }
    return m;
  }

  /** Cobertura que se heredaría en B si A estuviese implantada al 100 % (con el estado actual del resto). */
  function inferencia(ix, st, a, b) {
    const st2 = { ...st, controles: { ...(st.controles || {}) } };
    for (const c of ix.cat.controls) if ((c.maps[a] || []).some((x) => x.w >= 1)) st2.controles[c.id] = { ...(st2.controles[c.id] || {}), estado: 'implantado' };
    const r = calcular(ix, st2); return r.fw[b];
  }

  /* ---------- Traductor ---------- */
  function equivalencias(ix, f, id) {
    const links = [...(ix.reqUcs[f][id] || []), ...(ix.reqRel[f][id] || [])]; const out = {};
    const rank = { total: 0, parcial: 1, relacionado: 2 };
    for (const g of FW) out[g] = {};
    for (const l of links) {
      const c = ix.ucMap[l.uc];
      for (const g of FW) {
        if (g === f) continue;
        for (const m of c.maps[g] || []) {
          const fuerza = l.w === 0 || m.w === 0 ? 'relacionado' : l.w === 1 && m.w === 1 ? 'total' : 'parcial';
          const prev = out[g][m.id];
          if (!prev) out[g][m.id] = { id: m.id, fuerza, via: [c.id] };
          else { if (rank[fuerza] < rank[prev.fuerza]) prev.fuerza = fuerza; if (!prev.via.includes(c.id)) prev.via.push(c.id); }
        }
      }
    }
    const res = {};
    for (const g of FW) res[g] = Object.values(out[g]).sort((x, y) => rank[x.fuerza] - rank[y.fuerza] || orden(x.id, y.id));
    return { controles: links.map((l) => ({ ...l, control: ix.ucMap[l.uc] })), otras: res };
  }

  /* ---------- Prioridades: qué control desbloquea más ---------- */
  function prioridades(ix, st, calc) {
    const out = [];
    for (const c of ix.cat.controls) {
      const cc = calc.controles[c.id];
      if (!cc.relevante || cc.estado === 'implantado') continue;
      const falta = 1 - SCORE[cc.estado];
      let ganancia = 0; const porNorma = {};
      for (const f of calc.alcance) {
        let g = 0;
        for (const m of cc.reqs[f] || []) { const den = ix.reqUcs[f][m.id].reduce((a, l) => a + l.w, 0) || 1; g += (m.w / den) * falta; }
        if (g > 0) porNorma[f] = g; ganancia += g;
      }
      out.push({ id: c.id, control: c, estado: cc.estado, ganancia, porNorma, normas: Object.keys(porNorma), nreq: cc.nreq });
    }
    return out.sort((a, b) => b.ganancia - a.ganancia || b.normas.length - a.normas.length || orden(a.id, b.id));
  }

  /* ---------- Reglas de coherencia multinorma ---------- */
  const REGLAS = [
    ['CO-01', 'Alta', 'NIS2 en alcance sin procedimiento de notificación en 24 h / 72 h / 1 mes.'],
    ['CO-02', 'Alta', 'Control marcado «No aplica» que exige una norma en alcance.'],
    ['CO-03', 'Alta', 'Exclusión en una norma que contradice una obligación en otra.'],
    ['CO-04', 'Alta', 'NIS2 en alcance sin supervisión y formación de la dirección (art. 20).'],
    ['CO-05', 'Alta', 'ISO/IEC 42001 en alcance sin evaluación de impacto de los sistemas de IA.'],
    ['CO-06', 'Media', 'La SoA del ENS declara implantada una medida cuyos controles no están implantados del todo.'],
    ['CO-07', 'Media', 'Requisito excluido sin justificación.'],
    ['CO-08', 'Media', 'Control implantado sin evidencias.'],
    ['CO-09', 'Media', 'Control sin revisar en los últimos 12 meses o sin fecha de revisión.'],
    ['CO-10', 'Baja', 'Control implantado sin responsable.'],
    ['CO-11', 'Baja', 'Control parcial sin acción planificada con fecha.']
  ];
  /* Mensajes de las reglas en español e inglés */
  const tt = (obj, key, lang) => (lang === 'en' && obj && obj[key + '_en'] ? obj[key + '_en'] : obj ? obj[key] : '');
  const MSG = {
    es: {
      est: (e) => ESTADO_LABEL[e].toLowerCase(), y: ' y ',
      co01: ['Sin notificación de incidentes en plazo', (e) => `NIS2 exige alerta temprana en 24 h, notificación en 72 h e informe final en un mes. El control INC-07 está ${e}.`, 'Aprueba el procedimiento de notificación, con plantillas y contactos del CSIRT de referencia, y ensáyalo.', 'Directiva (UE) 2022/2555, art. 23'],
      co04: ['Con NIS2 los órganos de dirección aprueban las medidas, supervisan su aplicación, reciben formación y pueden responder personalmente de los incumplimientos.', 'Lleva las medidas a aprobación formal de la dirección y fija un informe periódico de seguimiento.', 'Programa formación específica para la dirección y conserva los registros.', 'Directiva (UE) 2022/2555, art. 20'],
      co05: ['Sin evaluación de impacto de los sistemas de IA', 'Es uno de los requisitos que ninguna norma de seguridad cubre: no se hereda del ENS ni de ISO/IEC 27001.', 'Define el proceso de evaluación de impacto (personas, grupos y sociedad) y aplícalo a cada sistema antes de desplegarlo.', 'ISO/IEC 42001:2023, 6.1.4, 8.4 y A.5'],
      co02: [(id, n) => `${id} «No aplica», pero lo exigen ${n}`, (k, l) => `Sostiene ${k} requisito(s) en alcance: ${l}.`, 'Implanta el control o excluye formalmente cada requisito con su justificación.'],
      grp: { 'CO-08': ['implantado(s) sin evidencias', 'Sin evidencias, un auditor no puede dar el control por implantado en ninguna de las normas que lo usan.', 'Adjunta las evidencias habituales de cada control (se sugieren en su ficha).'],
        'CO-09': ['sin revisar en 12 meses o sin fecha de revisión', 'Las cuatro normas exigen revisar periódicamente la eficacia de los controles.', 'Revisa cada control y actualiza su fecha de revisión.'],
        'CO-10': ['implantado(s) sin responsable', 'Todo control necesita un responsable identificable.', 'Asigna un responsable a cada control.'],
        'CO-11': ['parcial(es) sin acción planificada con fecha', 'Un control parcial sin plan no avanza y deja requisitos a medias en todas las normas que lo usan.', 'Planifica cada uno en el plan de acción con responsable y fecha.'] },
      grpT: (n, t) => `${n} control${n === 1 ? '' : 'es'} ${t}`, nCtl: (n) => `${n} controles`, afecta: (l) => ` Afecta a: ${l}.`,
      co07: [(r) => `Exclusión sin justificar: ${r}`, 'Documenta por qué el requisito no aplica.'],
      co03: [(r) => `${r} excluido, pero es obligatorio en otra norma`, (l) => `El mismo control lo exigen: ${l}. La exclusión no ahorra trabajo y un auditor la verá incoherente.`, 'Revisa la exclusión: si el control se implanta por la otra norma, decláralo aplicable.'],
      co06: [(id) => `La SoA del ENS dice «Implantada» en ${id}, pero sus controles no están implantados del todo`, 'Alinea el estado de los controles con la SoA o corrige la SoA.'],
      co06p: (n) => `${n === 1 ? 'Una medida declarada' : n + ' medidas declaradas'} «Implantada${n === 1 ? '' : 's'}» en la SoA del ENS con controles solo parciales`, nMed: (n) => `${n} medidas del ENS`
    },
    en: {
      est: (e) => ESTADO_LABEL_EN[e].toLowerCase(), y: ' and ',
      co01: ['No timely incident reporting', (e) => `NIS2 requires an early warning within 24 h, a notification within 72 h and a final report within one month. Control INC-07 is ${e}.`, 'Approve the reporting procedure with templates and contacts for the reference CSIRT, and rehearse it.', 'Directive (EU) 2022/2555, art. 23'],
      co04: ['Under NIS2, management bodies approve the measures, oversee their implementation, receive training and can be held personally liable.', 'Take the measures to formal management approval and set a periodic follow-up report.', 'Schedule specific training for management and keep the records.', 'Directive (EU) 2022/2555, art. 20'],
      co05: ['No impact assessment for AI systems', 'No security standard covers this: it is not inherited from the ENS or ISO/IEC 27001.', 'Define the impact assessment process (individuals, groups and society) and apply it to every system before deployment.', 'ISO/IEC 42001:2023, 6.1.4, 8.4 and A.5'],
      co02: [(id, n) => `${id} marked "Not applicable", but ${n} require it`, (k, l) => `It supports ${k} in-scope requirement(s): ${l}.`, 'Implement the control or formally exclude each requirement with its justification.'],
      grp: { 'CO-08': ['implemented without evidence', 'Without evidence, an auditor cannot accept the control as implemented in any of the frameworks that use it.', 'Attach the usual evidence for each control (suggested in its sheet).'],
        'CO-09': ['not reviewed in 12 months or with no review date', 'All four frameworks require periodic review of control effectiveness.', 'Review each control and update its review date.'],
        'CO-10': ['implemented without an owner', 'Every control needs an identifiable owner.', 'Assign an owner to each control.'],
        'CO-11': ['partial without a dated action', 'A partial control without a plan does not move and leaves requirements half-done in every framework that uses it.', 'Plan each one in the action plan with an owner and a date.'] },
      grpT: (n, t) => `${n} control${n === 1 ? '' : 's'} ${t}`, nCtl: (n) => `${n} controls`, afecta: (l) => ` Affects: ${l}.`,
      co07: [(r) => `Unjustified exclusion: ${r}`, 'Document why the requirement does not apply.'],
      co03: [(r) => `${r} excluded, but mandatory in another framework`, (l) => `The same control is required by: ${l}. The exclusion saves no work and an auditor will see it as inconsistent.`, 'Review the exclusion: if the control is implemented for the other framework, declare it applicable.'],
      co06: [(id) => `The ENS SoA says "Implemented" for ${id}, but its controls are not fully implemented`, 'Align the control states with the SoA or correct the SoA.'],
      co06p: (n) => `${n === 1 ? 'One measure' : n + ' measures'} declared "Implemented" in the ENS SoA with only partial controls`, nMed: (n) => `${n} ENS measures`
    }
  };
  const REGLAS_EN = {
    'CO-01': 'NIS2 in scope without a 24 h / 72 h / 1 month incident reporting procedure.', 'CO-02': 'Control marked "Not applicable" that an in-scope framework requires.',
    'CO-03': 'Exclusion in one framework that contradicts an obligation in another.', 'CO-04': 'NIS2 in scope without management oversight and training (art. 20).',
    'CO-05': 'ISO/IEC 42001 in scope without an AI system impact assessment.', 'CO-06': 'The ENS SoA declares a measure implemented while its controls are not fully implemented.',
    'CO-07': 'Requirement excluded without justification.', 'CO-08': 'Control implemented without evidence.', 'CO-09': 'Control not reviewed in the last 12 months or with no review date.',
    'CO-10': 'Control implemented without an owner.', 'CO-11': 'Partial control without a dated planned action.'
  };
  function coherencia(ix, st, calc, opts = {}) {
    const lang = opts.lang === 'en' ? 'en' : 'es'; const M = MSG[lang];
    const off = new Set(opts.reglasOff || []); const hoy = opts.hoy || new Date().toISOString().slice(0, 10);
    const F = []; const add = (id, ambito, titulo, detalle, accion, ref, extra) => { if (!off.has(id)) F.push({ id, sev: REGLAS.find((r) => r[0] === id)[1], ambito, titulo, detalle, accion, ref: ref || '', ...(extra || {}) }); };
    const on = (f) => calc.alcance.includes(f);
    const est = (id) => estadoUc(st, id);
    const ct = (id) => tt(ix.ucMap[id], 't', lang);
    const rq = (f, id) => `${FW_LABEL[f]} ${codigo(ix, f, id)}`;
    if (on('nis2') && est('INC-07') !== 'implantado') add('CO-01', 'INC-07', M.co01[0], M.co01[1](M.est(est('INC-07'))), M.co01[2], M.co01[3]);
    if (on('nis2')) for (const id of ['GOB-03', 'GOB-04']) if (est(id) !== 'implantado') add('CO-04', id, `${ct(id)}: ${M.est(est(id))}`, M.co04[0], id === 'GOB-03' ? M.co04[1] : M.co04[2], M.co04[3]);
    if (on('iso42001') && est('IA-05') !== 'implantado') add('CO-05', 'IA-05', M.co05[0], M.co05[1], M.co05[2], M.co05[3]);
    const grupo = { 'CO-08': [], 'CO-09': [], 'CO-10': [], 'CO-11': [] };
    for (const c of ix.cat.controls) {
      const cc = calc.controles[c.id]; const d = (st.controles || {})[c.id] || {};
      if (cc.estado === 'no-aplica' && cc.relevante) add('CO-02', c.id, M.co02[0](c.id, cc.normas.map((f) => FW_LABEL[f]).join(', ')), M.co02[1](cc.nreq, cc.normas.map((f) => `${FW_LABEL[f]} ${cc.reqs[f].map((m) => codigo(ix, f, m.id)).join(', ')}`).join(' · ')), M.co02[2]);
      if (!cc.relevante) continue;
      if (cc.estado === 'implantado' && !String(d.evidencias || '').trim()) grupo['CO-08'].push(c.id);
      if (cc.estado === 'implantado' && !String(d.responsable || '').trim()) grupo['CO-10'].push(c.id);
      if (cc.estado !== 'pendiente' && cc.estado !== 'no-aplica' && (!/^\d{4}-\d{2}-\d{2}$/.test(d.revision || '') || dias(d.revision, hoy) > 365)) grupo['CO-09'].push(c.id);
      if (cc.estado === 'parcial') { const a = (st.acciones || {})[c.id]; if (!a || !a.fecha) grupo['CO-11'].push(c.id); }
    }
    for (const [id, ucs] of Object.entries(grupo)) {
      if (!ucs.length) continue;
      const [t, det, acc] = M.grp[id];
      add(id, ucs.length === 1 ? ucs[0] : M.nCtl(ucs.length), M.grpT(ucs.length, t), det + M.afecta(ucs.join(', ')), acc, '', { ucs, resumen: det });
    }
    for (const f of FW) {
      if (!on(f)) continue;
      for (const r of calc.req[f]) {
        if (r.estado !== 'excluido') continue;
        if (!String(r.justificacion || '').trim()) add('CO-07', rq(f, r.id), M.co07[0](rq(f, r.id)), titulo(ix, f, r.id, lang), M.co07[1], '', { fw: f, req: r.id });
        const choques = [];
        for (const l of ix.reqUcs[f][r.id].filter((x) => x.w === 1)) {
          for (const g of FW) {
            if (g === f || !on(g)) continue;
            for (const m of ix.ucMap[l.uc].maps[g] || []) {
              if (m.w !== 1) continue;
              const rr = calc.req[g].find((x) => x.id === m.id);
              if (rr && rr.estado !== 'excluido' && rr.estado !== 'no-exigido') choques.push(rq(g, m.id));
            }
          }
        }
        if (choques.length) add('CO-03', rq(f, r.id), M.co03[0](rq(f, r.id)), M.co03[1]([...new Set(choques)].slice(0, 6).join(', ')), M.co03[2], '', { fw: f, req: r.id });
      }
    }
    if (on('ens') && st.ensSoa) {
      const parciales = [];
      for (const r of calc.req.ens) {
        const d = st.ensSoa[r.id];
        if (!d || !/^implantada$/i.test(String(d.estado || ''))) continue;
        if (r.estado === 'brecha') add('CO-06', `ENS ${r.id}`, M.co06[0](r.id), titulo(ix, 'ens', r.id, lang), M.co06[1], '', { fw: 'ens', req: r.id });
        else if (r.estado === 'parcial') parciales.push(r.id);
      }
      // Las medidas solo parcialmente sostenidas se agrupan en un único hallazgo para no ahogar a las demás
      if (parciales.length) add('CO-06', parciales.length === 1 ? `ENS ${parciales[0]}` : M.nMed(parciales.length), M.co06p(parciales.length), M.afecta(parciales.join(', ')).trim(), M.co06[1], '', { fw: 'ens', reqs: parciales });
    }
    const peso = { Alta: 0, Media: 1, Baja: 2 };
    return F.sort((a, b) => peso[a.sev] - peso[b.sev] || a.id.localeCompare(b.id));
  }

  /* ---------- Plan de acción ---------- */
  function planAccion(ix, st, calc) {
    const prio = prioridades(ix, st, calc);
    const items = prio.map((p, i) => {
      const a = (st.acciones || {})[p.id] || {}; const d = (st.controles || {})[p.id] || {};
      return { key: p.id, id: p.id, titulo: p.control.t, dom: p.control.dom, estadoControl: p.estado, ganancia: p.ganancia, normas: p.normas, rank: i + 1,
        prioridad: p.normas.length >= 3 || p.ganancia >= 3 ? 'Alta' : p.normas.length === 2 || p.ganancia >= 1.2 ? 'Media' : 'Baja',
        estado: a.estado || 'Pendiente', responsable: a.responsable || d.responsable || '', fecha: a.fecha || '', nota: a.nota || '' };
    });
    // Acciones cerradas: controles que se implantaron después de planificarse
    for (const [k, a] of Object.entries(st.acciones || {})) {
      if (items.some((x) => x.key === k) || !ix.ucMap[k]) continue;
      if (calc.controles[k] && calc.controles[k].estado === 'implantado') items.push({ key: k, id: k, titulo: ix.ucMap[k].t, dom: ix.ucMap[k].dom, estadoControl: 'implantado', ganancia: 0, normas: calc.controles[k].normas, rank: null, prioridad: 'Baja', estado: 'Hecha', responsable: a.responsable || '', fecha: a.fecha || '', nota: a.nota || '', verificada: true });
    }
    return items;
  }

  /* ---------- Del ENS a los controles unificados ---------- */
  function puntuacionEns(d) {
    if (!d) return null;
    const e = String(d.estado || '').toLowerCase(); const ap = String(d.aplica || '').toUpperCase();
    if (/^no/.test(ap) || /no aplica/.test(e)) return null;
    const pct = d.pct === null || d.pct === undefined || d.pct === '' ? null : Number(d.pct);
    if (/^implantada$/.test(e)) return pct === null || isNaN(pct) ? 1 : Math.max(0, Math.min(1, pct));
    if (/compensada/.test(e)) return pct === null || isNaN(pct) ? 0.75 : Math.max(0, Math.min(1, pct));
    if (/parcial|en curso|curso/.test(e)) return pct === null || isNaN(pct) ? 0.5 : Math.max(0, Math.min(1, pct));
    return 0;
  }
  /** Deduce el estado de los controles unificados a partir de una SoA del ENS ya trabajada. */
  function desdeSoaEns(ix, soa) {
    const controles = {}; const exclusiones = {}; let heredados = 0;
    for (const [code, d] of Object.entries(soa || {})) {
      if (!ix.req.ens[code]) continue;
      if (/^no/i.test(String(d.aplica || '')) || /no aplica/i.test(String(d.estado || ''))) exclusiones[code] = String(d.justificacion || 'Declarada no aplicable en la SoA del ENS.').slice(0, 1000);
    }
    for (const c of ix.cat.controls) {
      const ms = (c.maps.ens || []).filter((m) => m.w > 0); if (!ms.length) continue;
      let num = 0, den = 0; const evid = []; const resp = {};
      for (const m of ms) {
        if (!m.w) continue; const d = soa[m.id]; const sc = puntuacionEns(d); if (sc === null) continue;
        num += m.w * sc; den += m.w;
        if (m.w === 1 && d.evidencias && !/^[—-]$/.test(String(d.evidencias).trim())) evid.push(`[${m.id}] ${String(d.evidencias).trim()}`);
        if (d.responsable) resp[d.responsable] = (resp[d.responsable] || 0) + m.w;
      }
      if (!den) continue;
      const s = num / den;
      const estado = s >= 0.95 ? 'implantado' : s >= 0.2 ? 'parcial' : 'pendiente';
      const responsable = Object.entries(resp).sort((a, b) => b[1] - a[1])[0];
      controles[c.id] = { estado, responsable: responsable ? responsable[0] : '', evidencias: evid.join(' · ').slice(0, 1500), revision: '', notas: '', origen: 'ens' };
      heredados++;
    }
    return { controles, exclusiones, heredados };
  }

  /* ---------- Aplicabilidad de NIS2 (Directiva 2022/2555, arts. 2 y 3) ---------- */
  const TAMANOS = ['micro', 'pequena', 'mediana', 'grande'];
  const NIS2_ESPECIALES = ['ninguno', 'dns', 'tld', 'qtsp', 'telecom', 'admin-central', 'admin-regional', 'tsp', 'cer', 'dora', 'excluida'];
  const N2 = {
    es: { esp: 'Proveedor de DNS, registro de TLD o prestador cualificado de confianza: esencial con independencia del tamaño (art. 3.1 b).', central: 'Entidad de la Administración central (art. 2.2 f i y art. 3.1 d).',
      telG: 'Proveedor de comunicaciones electrónicas públicas mediano o grande (art. 3.1 c).', telP: 'Proveedor de comunicaciones electrónicas públicas: incluido con independencia del tamaño (art. 2.2 a).',
      reg: 'Administración regional o local: su inclusión depende de la ley nacional de transposición (art. 2.2 f ii y 2.5).', a1G: 'Sector de alta criticidad (anexo I) y gran empresa (art. 3.1 a).',
      a1M: 'Sector de alta criticidad (anexo I) y mediana empresa (art. 3.2).', a1P: 'Sector del anexo I, pero por debajo del umbral de mediana empresa, salvo designación expresa (art. 2.2 b–e).',
      a2: 'Otro sector crítico (anexo II) y empresa mediana o grande (art. 3.2).', a2P: 'Sector del anexo II, pero por debajo del umbral de mediana empresa, salvo designación expresa.', no: 'Sector no incluido en los anexos I y II.',
      tspG: 'Prestador de servicios de confianza no cualificado y gran empresa (art. 3.1 a).', tspP: 'Prestador de servicios de confianza no cualificado: incluido con independencia del tamaño (art. 2.2 a iii).',
      cer: 'Entidad crítica designada con arreglo a la Directiva (UE) 2022/2557 (CER): esencial con independencia del tamaño (arts. 2.3 y 3.1 f).',
      dora: 'Entidad financiera sujeta al Reglamento (UE) 2022/2554 (DORA): sus requisitos de gestión de riesgos y notificación prevalecen como lex specialis (art. 4). Confirma con tu supervisor.',
      excl: 'Entidad excluida: actividades de seguridad nacional, defensa o aplicación de la ley (art. 2.7 y 2.8).' },
    en: { esp: 'DNS provider, TLD registry or qualified trust service provider: essential regardless of size (art. 3.1 b).', central: 'Central government entity (art. 2.2 f i and art. 3.1 d).',
      telG: 'Medium or large provider of public electronic communications (art. 3.1 c).', telP: 'Provider of public electronic communications: in scope regardless of size (art. 2.2 a).',
      reg: 'Regional or local administration: inclusion depends on the national transposition law (art. 2.2 f ii and 2.5).', a1G: 'High-criticality sector (Annex I) and large enterprise (art. 3.1 a).',
      a1M: 'High-criticality sector (Annex I) and medium-sized enterprise (art. 3.2).', a1P: 'Annex I sector, but below the medium-sized threshold, unless expressly designated (art. 2.2 b–e).',
      a2: 'Other critical sector (Annex II) and medium or large enterprise (art. 3.2).', a2P: 'Annex II sector, but below the medium-sized threshold, unless expressly designated.', no: 'Sector not listed in Annexes I and II.',
      tspG: 'Non-qualified trust service provider and large enterprise (art. 3.1 a).', tspP: 'Non-qualified trust service provider: in scope regardless of size (art. 2.2 a iii).',
      cer: 'Critical entity designated under Directive (EU) 2022/2557 (CER): essential regardless of size (arts. 2.3 and 3.1 f).',
      dora: 'Financial entity subject to Regulation (EU) 2022/2554 (DORA): its risk-management and reporting requirements prevail as lex specialis (art. 4). Confirm with your supervisor.',
      excl: 'Excluded entity: national security, defence or law enforcement activities (art. 2.7 and 2.8).' }
  };
  function nis2Aplicabilidad(q, lang) {
    const T = N2[lang === 'en' ? 'en' : 'es'];
    const t = TAMANOS.includes(q && q.tamano) ? q.tamano : 'pequena';
    const esp = (q && q.especial) || 'ninguno'; const sector = (q && q.sector) || 'ninguno';
    const cir = !!(q && q.infraDigital);
    const R = (tipo, k) => ({ tipo, motivo: T[k], clave: k, cir: cir && (tipo === 'esencial' || tipo === 'importante') });
    if (esp === 'excluida') return R('fuera', 'excl');
    if (esp === 'dora') return R('fuera', 'dora');
    if (esp === 'cer') return R('esencial', 'cer');
    if (esp === 'tsp') return t === 'grande' ? R('esencial', 'tspG') : R('importante', 'tspP');
    if (['dns', 'tld', 'qtsp'].includes(esp)) return R('esencial', 'esp');
    if (esp === 'admin-central') return R('esencial', 'central');
    if (esp === 'telecom') return t === 'mediana' || t === 'grande' ? R('esencial', 'telG') : R('importante', 'telP');
    if (esp === 'admin-regional') return R('a-confirmar', 'reg');
    if (sector === 'anexo1') return t === 'grande' ? R('esencial', 'a1G') : t === 'mediana' ? R('importante', 'a1M') : R('fuera', 'a1P');
    if (sector === 'anexo2') return t === 'grande' || t === 'mediana' ? R('importante', 'a2') : R('fuera', 'a2P');
    return R('fuera', 'no');
  }

  /* ---------- Contraste con las equivalencias ENS ↔ ISO 27001 del material de clase ---------- */
  function parseIsoRef(txt) {
    const out = new Set();
    for (const part of String(txt || '').split(';')) {
      const p = part.trim(); const cl = /^Cl\.\s*/.test(p);
      const m = p.replace(/^Cl\.\s*/, '').match(/^([\d.\/]+)/); if (!m) continue;
      const codes = m[1].split('/'); const base = codes[0];
      codes.forEach((c, i) => { if (i > 0 && !c.includes('.')) c = base.split('.')[0] + '.' + c; out.add((cl ? 'C' : 'A') + c.replace(/\.$/, '')); });
    }
    return [...out];
  }
  function parejasClase(ix) {
    let total = 0, coinciden = 0, relacion = 0; const faltan = [];
    for (const r of ix.cat.frameworks.ens.reqs) {
      for (const iso of parseIsoRef(r.ref)) {
        if (!ix.req.iso27001[iso]) continue; total++;
        let best = null;
        for (const c of ix.cat.controls) {
          const e = (c.maps.ens || []).find((m) => m.id === r.id); const i = (c.maps.iso27001 || []).find((m) => m.id === iso);
          if (!e || !i) continue;
          const t = e.w > 0 && i.w > 0 ? 'cobertura' : 'relacion'; if (t === 'cobertura') { best = t; break; } best = t;
        }
        if (best === 'cobertura') coinciden++; else if (best === 'relacion') relacion++; else faltan.push(`${r.id}→${iso}`);
      }
    }
    return { total, coinciden, relacion, faltan };
  }

  /* ---------- Utilidades ---------- */
  function orden(a, b) {
    const pa = String(a).split(/[.\-~]/), pb = String(b).split(/[.\-~]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] ?? '', y = pb[i] ?? ''; const nx = parseFloat(x.replace(/^[A-Za-z]+/, '')), ny = parseFloat(y.replace(/^[A-Za-z]+/, ''));
      const ax = x.replace(/[\d.]+$/, ''), ay = y.replace(/[\d.]+$/, '');
      if (ax !== ay) return ax < ay ? -1 : 1;
      if (!isNaN(nx) && !isNaN(ny) && nx !== ny) return nx - ny;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  function codigo(ix, f, id) { const r = ix.req[f][id]; return r ? r.code || id : id; }
  function titulo(ix, f, id, lang) { const r = ix.req[f][id]; return r ? tt(r, 't', lang) : id; }
  function dias(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
  function instantanea(calc) { const o = {}; for (const f of FW) o[f] = calc.fw[f].on ? Math.round(calc.fw[f].grado * 1000) / 1000 : null; return { cov: o, grado: Math.round(calc.kpi.grado * 1000) / 1000, brechas: calc.kpi.brechas }; }

  return { FW, FW_LABEL, FW_LONG, FW_LONG_EN, ESTADOS, ESTADO_LABEL, ESTADO_LABEL_EN, REGLAS_EN, tt, SCORE, W, DIMS, NIVELES_ENS, CAT_NIVEL, REGLAS, TAMANOS, NIS2_ESPECIALES,
    indexar, nivelExigidoEns, categoriaEfectiva, excluible, exigidaEns, categoriaDeNiveles, aplicaReq, coberturaReq, calcular, solapamiento, inferencia,
    equivalencias, prioridades, parseIsoRef, parejasClase, coherencia, planAccion, puntuacionEns, desdeSoaEns, nis2Aplicabilidad, orden, codigo, titulo, instantanea, estadoUc };
});

