/* Rosetta · motor de cálculo (sin DOM). Funciona en el navegador (window.RosettaEngine) y en Node (require).
 * Modelo: una lista de controles unificados, cada uno enlazado con requisitos de hasta cuatro normas.
 * Un requisito está cubierto cuando lo están todos los controles que lo soportan (media ponderada:
 * correspondencia total = 1, parcial = 0,5). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RosettaEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FW = ['ens', 'iso27001', 'nis2', 'iso42001', 'partis', 'ria', 'cra', 'nist', 'dora'];
  const FW_LABEL = { ens: 'ENS', iso27001: 'ISO/IEC 27001', nis2: 'NIS2', iso42001: 'ISO/IEC 42001', partis: 'Part-IS', ria: 'RIA', cra: 'CRA', nist: 'NIST CSF', dora: 'DORA' };
  const FW_LABEL_EN = { ria: 'AI Act' };
  const FW_LONG = { ens: 'Esquema Nacional de Seguridad (RD 311/2022)', iso27001: 'ISO/IEC 27001:2022', nis2: 'Directiva NIS2 y RE 2024/2690', iso42001: 'ISO/IEC 42001:2023',
    partis: 'Part-IS · Reglamentos (UE) 2023/203 y 2022/1645', ria: 'RIA · Reglamento (UE) 2024/1689 de inteligencia artificial', cra: 'CRA · Reglamento (UE) 2024/2847 de ciberresiliencia', nist: 'NIST Cybersecurity Framework 2.0', dora: 'DORA · Reglamento (UE) 2022/2554 de resiliencia operativa digital' };
  const FW_LONG_EN = { ens: 'Spanish National Security Framework (RD 311/2022)', iso27001: 'ISO/IEC 27001:2022', nis2: 'NIS2 Directive and IR 2024/2690', iso42001: 'ISO/IEC 42001:2023',
    partis: 'Part-IS · Regulations (EU) 2023/203 and 2022/1645', ria: 'AI Act · Regulation (EU) 2024/1689', cra: 'CRA · Cyber Resilience Act, Regulation (EU) 2024/2847', nist: 'NIST Cybersecurity Framework 2.0', dora: 'DORA · Digital Operational Resilience Act, Regulation (EU) 2022/2554' };
  const ESTADOS = ['implantado', 'parcial', 'pendiente', 'no-aplica'];
  const ESTADO_LABEL = { implantado: 'Implantado', parcial: 'Parcial', pendiente: 'Pendiente', 'no-aplica': 'No aplica' };
  const ESTADO_LABEL_EN = { implantado: 'Implemented', parcial: 'Partial', pendiente: 'Pending', 'no-aplica': 'Not applicable' };
  const SCORE = { implantado: 1, parcial: 0.5, pendiente: 0, 'no-aplica': 0 };
  const W = { total: 1, parcial: 0.5, relacion: 0 };
  const NIVELES_ENS = ['BAJO', 'MEDIO', 'ALTO'];
  const CAT_NIVEL = { 'BÁSICA': 'BAJO', MEDIA: 'MEDIO', ALTA: 'ALTO' };
  const DIMS = ['D', 'I', 'C', 'A', 'T'];
  const EPS = 1e-9;

  /* ---------- Índices ----------
   * Las normas del índice son las del catálogo (en el orden de FW, y después cualquier otra que traiga) más los marcos
   * propios del proyecto. Un marco propio declara en cada requisito los controles que lo sostienen; aquí se funde en un
   * catálogo derivado, de modo que el resto del motor lo trata igual que a una norma incluida. */
  function fundirPropios(cat, propios) {
    if (!propios || !propios.length) return cat;
    const frameworks = { ...cat.frameworks }; const extra = {};
    for (const p of propios) {
      frameworks[p.id] = { id: p.id, propio: true, nombre: p.nombre, reqs: p.requisitos.map((r) => ({ id: r.id, code: r.id, t: r.titulo, g: r.grupo || '', texto: r.texto || '' })) };
      for (const r of p.requisitos) for (const m of r.controles || []) (extra[m.control] = extra[m.control] || []).push({ f: p.id, id: r.id, w: m.w });
    }
    const controls = cat.controls.map((c) => {
      const add = extra[c.id]; const maps = { ...c.maps };
      for (const p of propios) maps[p.id] = [];
      for (const m of add || []) maps[m.f].push({ id: m.id, w: m.w });
      return { ...c, maps };
    });
    return { ...cat, frameworks, controls };
  }
  function listaNormas(cat) {
    const ks = Object.keys(cat.frameworks);
    return [...FW.filter((f) => ks.includes(f)), ...ks.filter((f) => !FW.includes(f))];
  }
  function indexar(catBase, ccn, propios) {
    const cat = fundirPropios(catBase, propios);
    const fw = listaNormas(cat);
    const reqUcs = {}; const reqRel = {}; const ucMap = {}; const req = {};
    for (const f of fw) {
      reqUcs[f] = {}; reqRel[f] = {}; req[f] = {};
      for (const r of cat.frameworks[f].reqs) { req[f][r.id] = r; reqUcs[f][r.id] = []; reqRel[f][r.id] = []; }
    }
    for (const c of cat.controls) {
      ucMap[c.id] = c;
      for (const f of fw) for (const m of c.maps[f] || []) if (reqUcs[f][m.id]) (m.w > 0 ? reqUcs : reqRel)[f][m.id].push({ uc: c.id, w: m.w });
    }
    const propio = Object.fromEntries(fw.map((f) => [f, !!cat.frameworks[f].propio]));
    return { cat, fw, propio, reqUcs, reqRel, ucMap, req, ccn: ccn || null, ccnPar: ccn ? indexarCcn(ccn) : null };
  }

  /* ---------- CCN-STIC 825: correspondencias oficiales ENS ↔ ISO/IEC 27001:2022 ----------
   * Cada pareja ENS–ISO de la guía queda con su origen: control principal o complementario de una medida (apartado 6),
   * cláusula frente al articulado (apartado 5.2.2) u otro control de la ISO con consideración en el ENS (apartado 7).
   * Si una pareja aparece en varios apartados, prevalece el más fuerte. */
  const CCN_RANGO = { principal: 0, clausula: 1, complementario: 2, apartado7: 3 };
  function indexarCcn(ccn) {
    const m = new Map();
    const put = (ens, iso, tipo, nivel) => { const k = ens + '|' + iso; const p = m.get(k); if (!p || CCN_RANGO[tipo] < CCN_RANGO[p.tipo]) m.set(k, { tipo, nivel }); };
    for (const [ens, x] of Object.entries(ccn.medidas || {})) {
      for (const iso of x.principal || []) put(ens, iso, 'principal', x.nivel);
      for (const iso of x.complementarios || []) put(ens, iso, 'complementario', x.nivel);
      for (const iso of x.consideracion || []) put(ens, iso, 'apartado7', x.nivel);
    }
    for (const [iso, x] of Object.entries(ccn.clausulas || {})) for (const ens of x.ens || []) put(ens, iso, 'clausula', ccn.medidas && ccn.medidas[ens] ? ccn.medidas[ens].nivel : null);
    return m;
  }
  const ccnPareja = (ix, ens, iso) => (ix.ccnPar ? ix.ccnPar.get(ens + '|' + iso) || null : null);
  /* Fuerza de una equivalencia ENS ↔ ISO 27001 según la guía:
   *  · control principal: análogo → total; parcialmente análogo → parcial; nula → relacionado.
   *  · complementario: parcial (relacionado si la medida es nula: la ISO no la cubre).
   *  · cláusula 4–10: la que resulte de los controles comunes, al menos parcial.
   *  · apartado 7: relacionado (la guía los cita como consideración, de menor impacto).
   *  · fuera de la guía: criterio propio de Rosetta, nunca más que parcial. */
  const FZ_RANGO = { total: 0, parcial: 1, relacionado: 2 };
  const fzMin = (a, b) => (FZ_RANGO[a] >= FZ_RANGO[b] ? a : b);
  function fuerzaCcn(p, propia) {
    if (!p) return propia ? fzMin(propia, 'parcial') : null;
    if (p.tipo === 'principal') return p.nivel === 'analogo' ? 'total' : p.nivel === 'parcial' ? 'parcial' : 'relacionado';
    if (p.tipo === 'complementario') return p.nivel === 'nula' ? 'relacionado' : 'parcial';
    if (p.tipo === 'clausula') return propia && propia !== 'relacionado' ? propia : 'parcial';
    return 'relacionado';
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
    // Part-IS no admite exclusiones requisito a requisito: solo la derogación completa que aprueba la autoridad (punto .200 e)
    if (f === 'partis') return false;
    // RIA: sus obligaciones dependen del rol y del riesgo (no exigido), no de una exclusión
    if (f === 'ria') return false;
    // CRA: los puntos 2 b–m de la parte I del anexo I se aplican «cuando proceda» según la evaluación de riesgos; el resto, siempre
    if (f === 'cra') return /^I\.2\.[b-m]$/.test(s);
    // DORA: solo el intercambio de información (art. 45) es voluntario; el régimen y las TLPT se fijan en Alcance
    if (f === 'dora') return s === '45';
    return true;
  }

  /** ¿Está la norma en el alcance del proyecto? */
  const enAlcance = (st, f) => !!(st.alcance && st.alcance[f] && st.alcance[f].on);

  /** Aplicabilidad de un requisito según la norma: el ENS depende del nivel; el RIA, del rol y del riesgo del sistema. */
  const RIA_ROLES = ['proveedor', 'responsable', 'ambos'];
  const RIA_GPAI = ['no', 'si', 'sistemico'];
  function riaAlcance(a) {
    const x = a && typeof a === 'object' ? a : {};
    return { rol: RIA_ROLES.includes(x.rol) ? x.rol : 'ambos', alto: x.alto !== false, transparencia: x.transparencia !== false, gpai: RIA_GPAI.includes(x.gpai) ? x.gpai : 'no' };
  }
  const CRA_CLASES = ['predeterminada', 'importante1', 'importante2', 'critica'];
  const DORA_REGIMENES = ['general', 'simplificado'];
  const doraAlcance = (a) => ({ regimen: DORA_REGIMENES.includes(a && a.regimen) ? a.regimen : 'general', tlpt: !!(a && a.tlpt === true) });
  function aplicaDora(r, a) {
    const x = doraAlcance(a);
    if (r.regimen === 'general' && x.regimen === 'simplificado') return { aplica: false, motivo: 'simplificado' };
    if (r.regimen === 'simplificado' && x.regimen === 'general') return { aplica: false, motivo: 'general' };
    if (r.regimen === 'tlpt' && !x.tlpt) return { aplica: false, motivo: 'tlpt' };
    return { aplica: true };
  }
  const craAlcance = (a) => ({ clase: CRA_CLASES.includes(a && a.clase) ? a.clase : 'predeterminada' });
  function aplicaRia(r, a) {
    const x = riaAlcance(a);
    if (r.rol !== 'todos' && x.rol !== 'ambos' && x.rol !== r.rol) return { aplica: false, motivo: 'rol' };
    const ok = r.riesgo === 'todos' || (r.riesgo === 'alto' && x.alto) || (r.riesgo === 'transparencia' && x.transparencia) ||
      (r.riesgo === 'gpai' && x.gpai !== 'no') || (r.riesgo === 'sistemico' && x.gpai === 'sistemico');
    return ok ? { aplica: true } : { aplica: false, motivo: r.riesgo };
  }
  function aplicaReq(ix, st, f, id) {
    if (f === 'ria') { const r = ix.req.ria[id]; return r ? aplicaRia(r, st.alcance && st.alcance.ria) : { aplica: true }; }
    if (f === 'dora') { const r = ix.req.dora[id]; return r ? aplicaDora(r, st.alcance && st.alcance.dora) : { aplica: true }; }
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
    const out = { fw: {}, req: {}, controles: {}, alcance: ix.fw.filter((f) => enAlcance(st, f)) };
    for (const f of ix.fw) {
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
    for (const a of ix.fw) {
      const ucsA = new Set();
      for (const c of ix.cat.controls) if ((c.maps[a] || []).some((x) => x.w >= 1)) ucsA.add(c.id); // controles que A exige por completo
      m[a] = {};
      for (const b of ix.fw) {
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

  /* ---------- Traductor ----------
   * Una norma con «tope: parcial» en el catálogo (Part-IS) nunca se declara equivalente del todo a otra: no hay guía
   * oficial de correspondencias y su objeto (la seguridad operacional de la aviación) va más allá de la información. */
  const topeParcial = (ix, f) => !!(ix.cat.frameworks[f] && ix.cat.frameworks[f].tope === 'parcial');
  function equivalencias(ix, f, id) {
    const links = [...(ix.reqUcs[f][id] || []), ...(ix.reqRel[f][id] || [])]; const out = {};
    const rank = { total: 0, parcial: 1, relacionado: 2 };
    for (const g of ix.fw) out[g] = {};
    for (const l of links) {
      const c = ix.ucMap[l.uc];
      for (const g of ix.fw) {
        if (g === f) continue;
        const tope = topeParcial(ix, f) || topeParcial(ix, g);
        for (const m of c.maps[g] || []) {
          const fuerza0 = l.w === 0 || m.w === 0 ? 'relacionado' : l.w === 1 && m.w === 1 ? 'total' : 'parcial';
          const fuerza = tope ? fzMin(fuerza0, 'parcial') : fuerza0;
          const prev = out[g][m.id];
          if (!prev) out[g][m.id] = { id: m.id, fuerza, via: [c.id] };
          else { if (rank[fuerza] < rank[prev.fuerza]) prev.fuerza = fuerza; if (!prev.via.includes(c.id)) prev.via.push(c.id); }
        }
      }
    }
    // ENS ↔ ISO 27001: la fuerza sale de la CCN-STIC 825; las parejas de la guía sin control común también se muestran
    const otro = f === 'ens' ? 'iso27001' : f === 'iso27001' ? 'ens' : null;
    if (otro && ix.ccnPar) {
      const par = (x) => (f === 'ens' ? ccnPareja(ix, id, x) : ccnPareja(ix, x, id));
      for (const x of Object.values(out[otro])) { const p = par(x.id); x.ccn = p; x.fuerza = fuerzaCcn(p, x.fuerza); }
      for (const [k, p] of ix.ccnPar) {
        const [e, i] = k.split('|'); const peer = f === 'ens' ? (e === id ? i : null) : (i === id ? e : null);
        if (peer && !out[otro][peer] && ix.req[otro][peer]) out[otro][peer] = { id: peer, fuerza: fuerzaCcn(p, null), via: [], ccn: p };
      }
    }
    const res = {};
    for (const g of ix.fw) res[g] = Object.values(out[g]).sort((x, y) => rank[x.fuerza] - rank[y.fuerza] || orden(x.id, y.id));
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
    ['CO-11', 'Baja', 'Control parcial sin acción planificada con fecha.'],
    ['CO-12', 'Alta', 'Part-IS en alcance sin notificación externa a la autoridad aeronáutica (punto .230).'],
    ['CO-13', 'Alta', 'Part-IS en alcance sin análisis de riesgos con impacto en la seguridad operacional (punto .205).'],
    ['CO-14', 'Media', 'Requisito de un marco propio sin controles asignados: no se puede medir.'],
    ['CO-15', 'Alta', 'RIA en alcance sin alfabetización en IA (art. 4, obligatoria desde el 02-02-2025).'],
    ['CO-16', 'Alta', 'RIA en alcance sin revisión de prácticas prohibidas (art. 5, obligatoria desde el 02-02-2025).'],
    ['CO-17', 'Alta', 'CRA en alcance sin notificación a ENISA de vulnerabilidades explotadas e incidentes graves (art. 14, desde el 11-09-2026).'],
    ['CO-18', 'Media', 'CRA en alcance sin lista de materiales de software (SBOM) de los productos.'],
    ['CO-19', 'Alta', 'DORA en alcance sin notificación de incidentes graves a la autoridad financiera (art. 19).'],
    ['CO-20', 'Media', 'DORA en alcance sin registro de información de los acuerdos con proveedores de TIC (art. 28.3).']
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
        'CO-09': ['sin revisar en 12 meses o sin fecha de revisión', 'Todas las normas exigen revisar periódicamente la eficacia de los controles.', 'Revisa cada control y actualiza su fecha de revisión.'],
        'CO-10': ['implantado(s) sin responsable', 'Todo control necesita un responsable identificable.', 'Asigna un responsable a cada control.'],
        'CO-11': ['parcial(es) sin acción planificada con fecha', 'Un control parcial sin plan no avanza y deja requisitos a medias en todas las normas que lo usan.', 'Planifica cada uno en el plan de acción con responsable y fecha.'] },
      grpT: (n, t) => `${n} control${n === 1 ? '' : 'es'} ${t}`, nCtl: (n) => `${n} controles`, afecta: (l) => ` Afecta a: ${l}.`,
      co07: [(r) => `Exclusión sin justificar: ${r}`, 'Documenta por qué el requisito no aplica.'],
      co03: [(r) => `${r} excluido, pero es obligatorio en otra norma`, (l) => `El mismo control lo exigen: ${l}. La exclusión no ahorra trabajo y un auditor la verá incoherente.`, 'Revisa la exclusión: si el control se implanta por la otra norma, decláralo aplicable.'],
      co06: [(id) => `La SoA del ENS dice «Implantada» en ${id}, pero sus controles no están implantados del todo`, 'Alinea el estado de los controles con la SoA o corrige la SoA.'],
      co06p: (n) => `${n === 1 ? 'Una medida declarada' : n + ' medidas declaradas'} «Implantada${n === 1 ? '' : 's'}» en la SoA del ENS con controles solo parciales`, nMed: (n) => `${n} medidas del ENS`,
      co12: ['Sin notificación a la autoridad aeronáutica', (e) => `Part-IS exige notificar a la autoridad competente (AESA o EASA) los incidentes y vulnerabilidades que puedan suponer un riesgo significativo para la seguridad operacional, coordinado con el Reglamento (UE) 376/2014. No sustituye a la notificación de NIS2. El control INC-09 está ${e}.`, 'Define el canal, los plazos del punto .230 y su AMC, y quién notifica; enlázalo con la notificación de sucesos que ya hace el SMS.', 'Part-IS, punto IS.I.OR.230 / IS.D.OR.230'],
      co13: ['Riesgos sin la mirada de la seguridad operacional', (e) => `Part-IS no mide solo la información: pide identificar los elementos e interfaces cuya alteración podría afectar a la seguridad operacional y evaluarlos con el SMS. El control RIE-12 está ${e}.`, 'Inventaría los elementos e interfaces relevantes para la seguridad operacional y llévalos al análisis de riesgos junto al responsable del SMS.', 'Part-IS, puntos .205 y .210'],
      co19: ['Sin notificación de incidentes graves (DORA)', (e) => `DORA exige notificar los incidentes TIC graves a la autoridad financiera: inicial en 4 h desde la clasificación y como mucho 24 h, intermedio en 72 h y final en un mes. El control INC-12 está ${e}.`, 'Aprueba el procedimiento con los criterios de clasificación del art. 18, las plantillas de las ITS y quién notifica.', 'DORA, arts. 18 y 19'],
      co20: ['Sin registro de información de proveedores TIC', (e) => `El registro del art. 28.3 se remite a la autoridad cuando lo pide y es la base para evaluar la concentración. El control PRO-06 está ${e}.`, 'Completa el registro con todos los acuerdos TIC y marca los que soportan funciones esenciales o importantes.', 'DORA, art. 28.3'],
      co17: ['Sin notificación a ENISA', (e) => `El art. 14 del CRA obliga desde el 11-09-2026 a notificar las vulnerabilidades explotadas y los incidentes graves: alerta en 24 h, notificación en 72 h e informe final. No sustituye a la de NIS2. El control INC-11 está ${e}.`, 'Da de alta a la organización en la plataforma única de ENISA y define quién detecta, evalúa y notifica cada caso.', 'CRA, art. 14'],
      co18: ['Productos sin SBOM', (e) => `Sin lista de materiales de software no se pueden identificar las vulnerabilidades de los componentes (anexo I, parte II, punto 1). El control DES-09 está ${e}.`, 'Genera la SBOM en cada versión desde la cadena de construcción, en SPDX o CycloneDX.', 'CRA, anexo I.II.1'],
      co15: ['Sin alfabetización en IA', (e) => `El art. 4 del RIA obliga desde el 02-02-2025 a proveedores y responsables del despliegue a adoptar medidas de alfabetización en IA. El control IA-15 está ${e}.`, 'Define un plan de alfabetización por perfil y registra la formación de quien opera o usa la IA.', 'RIA, art. 4'],
      co16: ['Sin revisión de prácticas prohibidas', (e) => `Las prácticas del art. 5 están prohibidas desde el 02-02-2025 y llevan las multas más altas del RIA. El control IA-16 está ${e}.`, 'Contrasta cada sistema y uso de IA con el art. 5 y documenta la decisión.', 'RIA, art. 5'],
      co14: [(m, n) => `${m}: ${n} requisito${n === 1 ? '' : 's'} sin controles`, 'Un requisito sin controles cuenta siempre como brecha: Rosetta no puede saber qué lo cumple.', 'Abre el marco en Alcance y asigna los controles, empezando por las sugerencias.']
    },
    en: {
      est: (e) => ESTADO_LABEL_EN[e].toLowerCase(), y: ' and ',
      co01: ['No timely incident reporting', (e) => `NIS2 requires an early warning within 24 h, a notification within 72 h and a final report within one month. Control INC-07 is ${e}.`, 'Approve the reporting procedure with templates and contacts for the reference CSIRT, and rehearse it.', 'Directive (EU) 2022/2555, art. 23'],
      co04: ['Under NIS2, management bodies approve the measures, oversee their implementation, receive training and can be held personally liable.', 'Take the measures to formal management approval and set a periodic follow-up report.', 'Schedule specific training for management and keep the records.', 'Directive (EU) 2022/2555, art. 20'],
      co05: ['No impact assessment for AI systems', 'No security standard covers this: it is not inherited from the ENS or ISO/IEC 27001.', 'Define the impact assessment process (individuals, groups and society) and apply it to every system before deployment.', 'ISO/IEC 42001:2023, 6.1.4, 8.4 and A.5'],
      co02: [(id, n) => `${id} marked "Not applicable", but ${n} require it`, (k, l) => `It supports ${k} in-scope requirement(s): ${l}.`, 'Implement the control or formally exclude each requirement with its justification.'],
      grp: { 'CO-08': ['implemented without evidence', 'Without evidence, an auditor cannot accept the control as implemented in any of the frameworks that use it.', 'Attach the usual evidence for each control (suggested in its sheet).'],
        'CO-09': ['not reviewed in 12 months or with no review date', 'Every framework requires periodic review of control effectiveness.', 'Review each control and update its review date.'],
        'CO-10': ['implemented without an owner', 'Every control needs an identifiable owner.', 'Assign an owner to each control.'],
        'CO-11': ['partial without a dated action', 'A partial control without a plan does not move and leaves requirements half-done in every framework that uses it.', 'Plan each one in the action plan with an owner and a date.'] },
      grpT: (n, t) => `${n} control${n === 1 ? '' : 's'} ${t}`, nCtl: (n) => `${n} controls`, afecta: (l) => ` Affects: ${l}.`,
      co07: [(r) => `Unjustified exclusion: ${r}`, 'Document why the requirement does not apply.'],
      co03: [(r) => `${r} excluded, but mandatory in another framework`, (l) => `The same control is required by: ${l}. The exclusion saves no work and an auditor will see it as inconsistent.`, 'Review the exclusion: if the control is implemented for the other framework, declare it applicable.'],
      co06: [(id) => `The ENS SoA says "Implemented" for ${id}, but its controls are not fully implemented`, 'Align the control states with the SoA or correct the SoA.'],
      co06p: (n) => `${n === 1 ? 'One measure' : n + ' measures'} declared "Implemented" in the ENS SoA with only partial controls`, nMed: (n) => `${n} ENS measures`,
      co12: ['No reporting to the aviation authority', (e) => `Part-IS requires reporting to the competent authority (AESA or EASA) the incidents and vulnerabilities that may represent a significant risk to aviation safety, coordinated with Regulation (EU) 376/2014. It does not replace NIS2 reporting. Control INC-09 is ${e}.`, 'Define the channel, the deadlines of point .230 and its AMC, and who reports; link it to the occurrence reporting the SMS already does.', 'Part-IS, point IS.I.OR.230 / IS.D.OR.230'],
      co13: ['Risk assessment without the aviation safety view', (e) => `Part-IS does not look only at information: it asks you to identify the elements and interfaces whose compromise could affect aviation safety and to assess them with the SMS. Control RIE-12 is ${e}.`, 'List the elements and interfaces relevant to aviation safety and bring them into the risk assessment with the safety manager.', 'Part-IS, points .205 and .210'],
      co19: ['No major incident reporting (DORA)', (e) => `DORA requires reporting major ICT incidents to the financial authority: initial within 4 h of classification and at most 24 h, intermediate within 72 h and final within one month. Control INC-12 is ${e}.`, 'Approve the procedure with the art. 18 classification criteria, the ITS templates and who reports.', 'DORA, arts. 18 and 19'],
      co20: ['No register of ICT third-party information', (e) => `The art. 28.3 register is submitted to the authority on request and underpins the concentration assessment. Control PRO-06 is ${e}.`, 'Complete the register with every ICT arrangement and flag those supporting critical or important functions.', 'DORA, art. 28.3'],
      co17: ['No reporting to ENISA', (e) => `CRA art. 14 has required reporting actively exploited vulnerabilities and severe incidents since 11-09-2026: early warning within 24 h, notification within 72 h and a final report. It does not replace NIS2 reporting. Control INC-11 is ${e}.`, 'Register the organisation on ENISA’s single reporting platform and define who detects, assesses and reports each case.', 'CRA, art. 14'],
      co18: ['Products without an SBOM', (e) => `Without a software bill of materials, component vulnerabilities cannot be identified (Annex I, Part II, point 1). Control DES-09 is ${e}.`, 'Generate the SBOM for every release from the build pipeline, in SPDX or CycloneDX.', 'CRA, Annex I.II.1'],
      co15: ['No AI literacy', (e) => `AI Act art. 4 has required providers and deployers to take AI literacy measures since 02-02-2025. Control IA-15 is ${e}.`, 'Define a literacy plan by role and record the training of those who operate or use AI.', 'AI Act, art. 4'],
      co16: ['No review of prohibited practices', (e) => `The practices in art. 5 have been prohibited since 02-02-2025 and carry the AI Act’s highest fines. Control IA-16 is ${e}.`, 'Check every AI system and use against art. 5 and document the decision.', 'AI Act, art. 5'],
      co14: [(m, n) => `${m}: ${n} requirement${n === 1 ? '' : 's'} without controls`, 'A requirement without controls always counts as a gap: Rosetta cannot know what meets it.', 'Open the framework in Scope and assign controls, starting with the suggestions.']
    }
  };
  const REGLAS_EN = {
    'CO-01': 'NIS2 in scope without a 24 h / 72 h / 1 month incident reporting procedure.', 'CO-02': 'Control marked "Not applicable" that an in-scope framework requires.',
    'CO-03': 'Exclusion in one framework that contradicts an obligation in another.', 'CO-04': 'NIS2 in scope without management oversight and training (art. 20).',
    'CO-05': 'ISO/IEC 42001 in scope without an AI system impact assessment.', 'CO-06': 'The ENS SoA declares a measure implemented while its controls are not fully implemented.',
    'CO-07': 'Requirement excluded without justification.', 'CO-08': 'Control implemented without evidence.', 'CO-09': 'Control not reviewed in the last 12 months or with no review date.',
    'CO-10': 'Control implemented without an owner.', 'CO-11': 'Partial control without a dated planned action.',
    'CO-12': 'Part-IS in scope without external reporting to the aviation authority (point .230).',
    'CO-13': 'Part-IS in scope without a risk assessment covering the impact on aviation safety (point .205).',
    'CO-14': 'Requirement of a custom framework with no controls assigned: it cannot be measured.',
    'CO-15': 'AI Act in scope without AI literacy (art. 4, mandatory since 02-02-2025).',
    'CO-16': 'AI Act in scope without a review of prohibited practices (art. 5, mandatory since 02-02-2025).',
    'CO-17': 'CRA in scope without reporting actively exploited vulnerabilities and severe incidents to ENISA (art. 14, from 11-09-2026).',
    'CO-18': 'CRA in scope without a software bill of materials (SBOM) for the products.',
    'CO-19': 'DORA in scope without reporting major incidents to the financial authority (art. 19).',
    'CO-20': 'DORA in scope without a register of information on ICT third-party arrangements (art. 28.3).'
  };
  function coherencia(ix, st, calc, opts = {}) {
    const lang = opts.lang === 'en' ? 'en' : 'es'; const M = MSG[lang];
    const off = new Set(opts.reglasOff || []); const hoy = opts.hoy || new Date().toISOString().slice(0, 10);
    const F = []; const add = (id, ambito, titulo, detalle, accion, ref, extra) => { if (!off.has(id)) F.push({ id, sev: REGLAS.find((r) => r[0] === id)[1], ambito, titulo, detalle, accion, ref: ref || '', ...(extra || {}) }); };
    const on = (f) => calc.alcance.includes(f);
    const est = (id) => estadoUc(st, id);
    const ct = (id) => tt(ix.ucMap[id], 't', lang);
    const lbl = (f) => etiqueta(ix, f, lang);
    const rq = (f, id) => `${lbl(f)} ${codigo(ix, f, id)}`;
    if (on('nis2') && est('INC-07') !== 'implantado') add('CO-01', 'INC-07', M.co01[0], M.co01[1](M.est(est('INC-07'))), M.co01[2], M.co01[3]);
    if (on('nis2')) for (const id of ['GOB-03', 'GOB-04']) if (est(id) !== 'implantado') add('CO-04', id, `${ct(id)}: ${M.est(est(id))}`, M.co04[0], id === 'GOB-03' ? M.co04[1] : M.co04[2], M.co04[3]);
    if (on('iso42001') && est('IA-05') !== 'implantado') add('CO-05', 'IA-05', M.co05[0], M.co05[1], M.co05[2], M.co05[3]);
    if (on('partis') && ix.ucMap['INC-09'] && est('INC-09') !== 'implantado') add('CO-12', 'INC-09', M.co12[0], M.co12[1](M.est(est('INC-09'))), M.co12[2], M.co12[3]);
    if (on('dora') && ix.ucMap['INC-12'] && est('INC-12') !== 'implantado') add('CO-19', 'INC-12', M.co19[0], M.co19[1](M.est(est('INC-12'))), M.co19[2], M.co19[3]);
    if (on('dora') && ix.ucMap['PRO-06'] && est('PRO-06') !== 'implantado') add('CO-20', 'PRO-06', M.co20[0], M.co20[1](M.est(est('PRO-06'))), M.co20[2], M.co20[3]);
    if (on('cra') && ix.ucMap['INC-11'] && est('INC-11') !== 'implantado') add('CO-17', 'INC-11', M.co17[0], M.co17[1](M.est(est('INC-11'))), M.co17[2], M.co17[3]);
    if (on('cra') && ix.ucMap['DES-09'] && est('DES-09') !== 'implantado') add('CO-18', 'DES-09', M.co18[0], M.co18[1](M.est(est('DES-09'))), M.co18[2], M.co18[3]);
    if (on('ria') && ix.ucMap['IA-15'] && est('IA-15') !== 'implantado') add('CO-15', 'IA-15', M.co15[0], M.co15[1](M.est(est('IA-15'))), M.co15[2], M.co15[3]);
    if (on('ria') && ix.ucMap['IA-16'] && est('IA-16') !== 'implantado') add('CO-16', 'IA-16', M.co16[0], M.co16[1](M.est(est('IA-16'))), M.co16[2], M.co16[3]);
    if (on('partis') && ix.ucMap['RIE-12'] && est('RIE-12') !== 'implantado') add('CO-13', 'RIE-12', M.co13[0], M.co13[1](M.est(est('RIE-12'))), M.co13[2], M.co13[3]);
    for (const f of calc.alcance) {
      if (!ix.propio[f]) continue;
      const sin = ix.cat.frameworks[f].reqs.filter((r) => !ix.reqUcs[f][r.id].length).map((r) => r.id);
      if (sin.length) add('CO-14', lbl(f), M.co14[0](lbl(f), sin.length), M.co14[1] + M.afecta(sin.slice(0, 12).join(', ') + (sin.length > 12 ? '…' : '')), M.co14[2], '', { fw: f, reqs: sin });
    }
    const grupo = { 'CO-08': [], 'CO-09': [], 'CO-10': [], 'CO-11': [] };
    for (const c of ix.cat.controls) {
      const cc = calc.controles[c.id]; const d = (st.controles || {})[c.id] || {};
      if (cc.estado === 'no-aplica' && cc.relevante) add('CO-02', c.id, M.co02[0](c.id, cc.normas.map((f) => lbl(f)).join(', ')), M.co02[1](cc.nreq, cc.normas.map((f) => `${lbl(f)} ${cc.reqs[f].map((m) => codigo(ix, f, m.id)).join(', ')}`).join(' · ')), M.co02[2]);
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
    for (const f of ix.fw) {
      if (!on(f)) continue;
      for (const r of calc.req[f]) {
        if (r.estado !== 'excluido') continue;
        if (!String(r.justificacion || '').trim()) add('CO-07', rq(f, r.id), M.co07[0](rq(f, r.id)), titulo(ix, f, r.id, lang), M.co07[1], '', { fw: f, req: r.id });
        const choques = [];
        for (const l of ix.reqUcs[f][r.id].filter((x) => x.w === 1)) {
          for (const g of ix.fw) {
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

  /** Contraste del catálogo con la CCN-STIC 825: qué parejas de la guía conecta Rosetta mediante un control unificado
   *  y cuántas equivalencias ENS ↔ ISO 27001 de Rosetta son criterio propio (no figuran en la guía). */
  function contrasteCcn825(ix) {
    if (!ix.ccnPar) return null;
    const comun = (ens, iso) => ix.cat.controls.some((c) => (c.maps.ens || []).some((m) => m.id === ens) && (c.maps.iso27001 || []).some((m) => m.id === iso));
    const porTipo = {}; const faltan = [];
    for (const [k, p] of ix.ccnPar) {
      const [e, i] = k.split('|'); if (!ix.req.ens[e] || !ix.req.iso27001[i]) continue;
      const t = porTipo[p.tipo] || (porTipo[p.tipo] = { total: 0, conectadas: 0 }); t.total++;
      if (comun(e, i)) t.conectadas++; else if (p.tipo === 'principal') faltan.push(k.replace('|', '→'));
    }
    let propias = 0; const niveles = { analogo: 0, parcial: 0, nula: 0 };
    for (const r of ix.cat.frameworks.ens.reqs) {
      for (const x of equivalencias(ix, 'ens', r.id).otras.iso27001) if (!x.ccn) propias++;
      const m = ix.ccn.medidas[r.id]; if (m) niveles[m.nivel]++;
    }
    const total = Object.values(porTipo).reduce((a, t) => a + t.total, 0);
    return { edicion: ix.ccn.edicion, medidas: Object.keys(ix.ccn.medidas).length, niveles, parejas: total, porTipo, faltan, propias };
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
  /* ---------- Perfil regulatorio: qué marcos aplican según dónde opera y qué es la organización ----------
   * Función pura. Propone, no dictamina: cada estado cita su base y la decisión final la toma el auditor.
   * Estados: obligatoria (la impone una norma), confirmar (depende de algo que el asistente no puede saber),
   * voluntaria (contractual o voluntaria) y no-aplica (con su motivo). */
  const ESTADOS_PERFIL = ['obligatoria', 'confirmar', 'voluntaria', 'no-aplica'];
  const JURISDICCIONES = ['es', 'ue', 'fuera'];
  const AVIACION = ['no', 'I', 'D', 'ID'];
  const PERFIL_DEF = { jurisdiccion: 'es', publico: false, proveedorPublico: false, financiera: false, aviacion: 'no', ia: false, fabricante: false };
  const PR = {
    es: {
      ensFuera: 'El ENS es una norma española: obliga al sector público español y a quienes le prestan servicios.',
      ensPub: 'Entidad del sector público español.', ensProv: 'Presta servicios o provee soluciones al sector público: los sistemas que los soportan deben cumplir el ENS, y el pliego suele exigir la certificación.',
      ensNo: 'Entidad privada sin contratos con el sector público: el ENS no le obliga (puede certificarse de forma voluntaria).',
      iso27: 'Norma voluntaria: se adopta para certificarse o porque la pide un cliente o un pliego.', iso27Base: 'Voluntaria',
      iso27Sgsi: 'Norma voluntaria, pero su sistema de gestión es la base natural del SGSI que exige la normativa de la organización.',
      n2Fuera: 'NIS2 es una directiva de la UE: solo alcanza a entidades que prestan servicios en la Unión.', n2FueraDig: 'Fuera de la UE, pero los proveedores de infraestructura digital que prestan servicios en la Unión deben designar un representante (art. 26).',
      n2Dora: 'Entidad financiera: DORA prevalece como lex specialis en gestión de riesgos y notificación (art. 4 NIS2). Confirma con tu supervisor qué queda de NIS2.',
      n2Base: 'Directiva (UE) 2022/2555, arts. 2 y 3', n2Base26: 'Directiva (UE) 2022/2555, art. 26', n2Base4: 'Directiva (UE) 2022/2555, art. 4', n2Trans: ' La aplicación concreta depende de la ley nacional de transposición.',
      ia: 'Norma voluntaria, pero es la base reconocida para gobernar los sistemas de IA y preparar el RIA (Reglamento (UE) 2024/1689).', iaNo: 'La organización no desarrolla ni despliega sistemas de IA.',
      riaOk: 'Desarrolla o despliega IA en la UE: le aplican al menos la alfabetización en IA y las prácticas prohibidas (desde el 02-02-2025). El resto depende del rol (proveedor o responsable del despliegue) y del riesgo: transparencia desde el 02-08-2026 y alto riesgo del anexo III desde el 02-12-2027 (Reglamento (UE) 2026/1744).',
      dora: 'Entidad financiera de la UE: DORA le aplica desde el 17-01-2025 y prevalece sobre NIS2 en gestión del riesgo TIC y notificación de incidentes.', doraFuera: 'Fuera de la UE, DORA solo alcanza a los proveedores de TIC críticos que sirven a entidades financieras de la Unión.', doraBase: 'Reglamento (UE) 2022/2554, art. 2', doraNo: 'No es una entidad financiera.',
      nist: 'Marco voluntario del NIST (EE. UU.): lenguaje común con clientes internacionales y de LATAM para expresar el perfil actual y el objetivo.', nistBase: 'NIST CSWP 29 (CSF 2.0)',
      cra: 'Fabrica productos con elementos digitales: la notificación de vulnerabilidades explotadas e incidentes graves (art. 14) le obliga desde el 11-09-2026; los requisitos esenciales, la gestión de vulnerabilidades y el marcado CE, desde el 11-12-2027.',
      craFuera: 'Fuera de la UE, el CRA alcanza a quien comercializa productos con elementos digitales en la Unión.', craBase: 'Reglamento (UE) 2024/2847, art. 2', craNo: 'La organización no fabrica productos con elementos digitales.',
      riaFuera: 'Fuera de la UE, el RIA alcanza a quien comercializa sistemas en la Unión o cuyos resultados se usan en ella (art. 2.1).', riaBase: 'Reglamento (UE) 2024/1689, art. 2', riaNo: 'La organización no desarrolla ni despliega sistemas de IA.',
      piI: 'Organización aprobada (operador, CAMO, Part-145, Part-147, ATO, ATM/ANS…): le aplica el anexo II (IS.I.OR) desde el 22-02-2026.',
      piD: 'Organización de diseño o producción (Part-21, subpartes G y J) u operador de aeródromo o servicio de dirección en plataforma: le aplica el anexo (IS.D.OR) desde el 16-10-2025.',
      piID: 'Tiene aprobaciones de los dos grupos: le aplican IS.I.OR (desde el 22-02-2026) e IS.D.OR (desde el 16-10-2025).',
      piDer: ' Salvo derogación aprobada por la autoridad competente (punto .200 e), que exige un análisis de riesgos documentado.',
      piNo: 'No es una organización aprobada por EASA o AESA.',
      piBaseI: 'Reglamento de Ejecución (UE) 2023/203, modificado por el (UE) 2025/2293', piBaseD: 'Reglamento Delegado (UE) 2022/1645, modificado por el (UE) 2025/22',
      propio: 'Marco propio: lo decide la organización o lo pide un cliente.', propioBase: 'Contractual o voluntaria',
     
     
    },
    en: {
      ensFuera: 'The ENS is Spanish law: it binds the Spanish public sector and those who provide services to it.',
      ensPub: 'Spanish public sector entity.', ensProv: 'It provides services or solutions to the public sector: the systems behind them must comply with the ENS, and tenders usually require certification.',
      ensNo: 'Private entity with no public sector contracts: the ENS does not bind it (voluntary certification is possible).',
      iso27: 'Voluntary standard: adopted to get certified or because a customer or a tender asks for it.', iso27Base: 'Voluntary',
      iso27Sgsi: 'Voluntary standard, but its management system is the natural basis for the ISMS the organisation is legally required to run.',
      n2Fuera: 'NIS2 is an EU directive: it only reaches entities providing services in the Union.', n2FueraDig: 'Outside the EU, but digital infrastructure providers offering services in the Union must designate a representative (art. 26).',
      n2Dora: 'Financial entity: DORA prevails as lex specialis for risk management and reporting (NIS2 art. 4). Confirm with your supervisor what remains of NIS2.',
      n2Base: 'Directive (EU) 2022/2555, arts. 2 and 3', n2Base26: 'Directive (EU) 2022/2555, art. 26', n2Base4: 'Directive (EU) 2022/2555, art. 4', n2Trans: ' How it applies depends on the national transposition law.',
      ia: 'Voluntary standard, but the recognised basis to govern AI systems and prepare for the AI Act (Regulation (EU) 2024/1689).', iaNo: 'The organisation neither develops nor deploys AI systems.',
      riaOk: 'It develops or deploys AI in the EU: at least AI literacy and the prohibited practices apply (since 02-02-2025). The rest depends on the role (provider or deployer) and the risk: transparency from 02-08-2026 and Annex III high risk from 02-12-2027 (Regulation (EU) 2026/1744).',
      dora: 'EU financial entity: DORA has applied since 17-01-2025 and prevails over NIS2 for ICT risk management and incident reporting.', doraFuera: 'Outside the EU, DORA only reaches critical ICT third-party providers serving Union financial entities.', doraBase: 'Regulation (EU) 2022/2554, art. 2', doraNo: 'Not a financial entity.',
      nist: 'Voluntary NIST (US) framework: a common language with international and LATAM customers to express current and target profiles.', nistBase: 'NIST CSWP 29 (CSF 2.0)',
      cra: 'It manufactures products with digital elements: reporting actively exploited vulnerabilities and severe incidents (art. 14) has applied since 11-09-2026; the essential requirements, vulnerability handling and CE marking from 11-12-2027.',
      craFuera: 'Outside the EU, the CRA reaches those who place products with digital elements on the Union market.', craBase: 'Regulation (EU) 2024/2847, art. 2', craNo: 'The organisation does not manufacture products with digital elements.',
      riaFuera: 'Outside the EU, the AI Act reaches those who place systems on the Union market or whose output is used in it (art. 2.1).', riaBase: 'Regulation (EU) 2024/1689, art. 2', riaNo: 'The organisation neither develops nor deploys AI systems.',
      piI: 'Approved organisation (operator, CAMO, Part-145, Part-147, ATO, ATM/ANS…): Annex II (IS.I.OR) applies from 22-02-2026.',
      piD: 'Design or production organisation (Part-21, Subparts G and J) or aerodrome operator or apron management service: the Annex (IS.D.OR) applies from 16-10-2025.',
      piID: 'It holds approvals in both groups: IS.I.OR (from 22-02-2026) and IS.D.OR (from 16-10-2025) apply.',
      piDer: ' Unless the competent authority approves a derogation (point .200 e), which requires a documented risk assessment.',
      piNo: 'Not an organisation approved by EASA or a national aviation authority.',
      piBaseI: 'Implementing Regulation (EU) 2023/203, as amended by (EU) 2025/2293', piBaseD: 'Delegated Regulation (EU) 2022/1645, as amended by (EU) 2025/22',
      propio: 'Custom framework: chosen by the organisation or required by a customer.', propioBase: 'Contractual or voluntary',
     
     
    }
  };
  function perfilNormalizado(p) {
    const o = p && typeof p === 'object' ? p : {};
    const r = {}; for (const k of Object.keys(PERFIL_DEF)) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; // solo propiedades propias
    return { jurisdiccion: JURISDICCIONES.includes(r.jurisdiccion) ? r.jurisdiccion : 'es', publico: r.publico === true, proveedorPublico: r.proveedorPublico === true,
      financiera: r.financiera === true, aviacion: AVIACION.includes(r.aviacion) ? r.aviacion : 'no', ia: r.ia === true, fabricante: r.fabricante === true };
  }
  /** Propuesta de marcos aplicables. `propios` son los identificadores de los marcos propios del proyecto. */
  function perfilRegulatorio(perfil, nis2q, lang, propios) {
    const T = PR[lang === 'en' ? 'en' : 'es']; const p = perfilNormalizado(perfil);
    const R = (estado, base, motivo) => ({ estado, base, motivo });
    const ue = p.jurisdiccion !== 'fuera'; const q = nis2q || {};
    const financiera = p.financiera || q.especial === 'dora';
    const m = {};
    // ENS (RD 311/2022, art. 2)
    if (p.jurisdiccion !== 'es') m.ens = R('no-aplica', 'RD 311/2022, art. 2', T.ensFuera);
    else if (p.publico) m.ens = R('obligatoria', 'RD 311/2022, art. 2.1', T.ensPub);
    else if (p.proveedorPublico) m.ens = R('obligatoria', 'RD 311/2022, art. 2.3', T.ensProv);
    else m.ens = R('no-aplica', 'RD 311/2022, art. 2', T.ensNo);
    // NIS2: el razonamiento de los arts. 2 y 3 que ya hace nis2Aplicabilidad
    const n2 = nis2Aplicabilidad(q, lang);
    if (!ue) m.nis2 = q.infraDigital ? R('confirmar', T.n2Base26, T.n2FueraDig) : R('no-aplica', T.n2Base, T.n2Fuera);
    else if (financiera) m.nis2 = R('confirmar', T.n2Base4, T.n2Dora);
    else if (n2.tipo === 'esencial' || n2.tipo === 'importante') m.nis2 = R('obligatoria', T.n2Base, n2.motivo + T.n2Trans);
    else if (n2.tipo === 'a-confirmar') m.nis2 = R('confirmar', T.n2Base, n2.motivo);
    else m.nis2 = R('no-aplica', T.n2Base, n2.motivo);
    // Part-IS: alcanza a la organización aprobada por EASA o por su autoridad nacional, esté donde esté
    const baseI = T.piBaseI, baseD = T.piBaseD;
    if (p.aviacion === 'I') m.partis = R('obligatoria', baseI, T.piI + T.piDer);
    else if (p.aviacion === 'D') m.partis = R('obligatoria', baseD, T.piD + T.piDer);
    else if (p.aviacion === 'ID') m.partis = R('obligatoria', `${baseI} · ${baseD}`, T.piID + T.piDer);
    else m.partis = R('no-aplica', `${baseI} · ${baseD}`, T.piNo);
    // Normas voluntarias
    const sgsiLegal = m.partis.estado === 'obligatoria' || m.nis2.estado === 'obligatoria' || m.ens.estado === 'obligatoria' || financiera;
    m.iso27001 = R('voluntaria', T.iso27Base, sgsiLegal ? T.iso27Sgsi : T.iso27);
    m.iso42001 = p.ia ? R('voluntaria', T.iso27Base, T.ia) : R('no-aplica', T.iso27Base, T.iaNo);
    m.nist = R('voluntaria', T.nistBase, T.nist);
    m.dora = !financiera ? R('no-aplica', T.doraBase, T.doraNo) : ue ? R('obligatoria', T.doraBase, T.dora) : R('confirmar', T.doraBase, T.doraFuera);
    m.cra = !p.fabricante ? R('no-aplica', T.craBase, T.craNo) : ue ? R('obligatoria', T.craBase, T.cra) : R('confirmar', T.craBase, T.craFuera);
    m.ria = !p.ia ? R('no-aplica', T.riaBase, T.riaNo) : ue ? R('obligatoria', T.riaBase, T.riaOk) : R('confirmar', T.riaBase, T.riaFuera);
    for (const f of propios || []) m[f] = R('voluntaria', T.propioBase, T.propio);
    // Normas que la organización tendrá que mirar y Rosetta aún no incluye
    const futuras = [];
    if (lang === 'en') for (const x of futuras) x.base = x.base.replace('Reglamento', 'Regulation');
    return { perfil: p, marcos: m, futuras };
  }

  /* ---------- Sugerencias de mapeo para marcos propios ----------
   * Por palabras: se comparan las raíces (5 letras, sin tildes ni palabras vacías) del requisito con el título, el objetivo
   * y las evidencias de cada control, en los dos idiomas. Solo propone: el usuario confirma cada enlace. */
  const VACIAS = new Set('para como cada sobre entre desde hasta donde cuando sobre segun sera debe deben todos todas otros otras esta este estos estas tiene tienen with that this from have shall must each into their they them which where when will been organisation organizacion organization informacion information seguridad security sistema sistemas system systems'.split(' '));
  function raices(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !VACIAS.has(w)).map((w) => w.slice(0, 5));
  }
  let _raicesCtl = null;
  function sugerirControles(ix, texto, n) {
    const q = new Set(raices(texto)); if (!q.size) return [];
    if (!_raicesCtl || _raicesCtl.cat !== ix.cat.controls) {
      _raicesCtl = { cat: ix.cat.controls, m: ix.cat.controls.map((c) => { const t = new Set(raices([c.t, c.t_en].join(' '))); const o = new Set(raices([c.obj, c.obj_en, c.ev, c.ev_en].join(' '))); return { id: c.id, t, o }; }) };
    }
    const out = [];
    for (const c of _raicesCtl.m) {
      let sc = 0; for (const w of q) sc += c.t.has(w) ? 3 : c.o.has(w) ? 1 : 0;
      if (sc >= 3) out.push({ id: c.id, score: sc });
    }
    return out.sort((a, b) => b.score - a.score || orden(a.id, b.id)).slice(0, n || 3);
  }

  /** Nombre corto de una norma o de un marco propio. */
  function etiqueta(ix, f, lang) { return (lang === 'en' && FW_LABEL_EN[f]) || FW_LABEL[f] || (ix && ix.cat.frameworks[f] && ix.cat.frameworks[f].nombre) || f; }
  function codigo(ix, f, id) { const r = ix.req[f][id]; return r ? r.code || id : id; }
  function titulo(ix, f, id, lang) { const r = ix.req[f][id]; return r ? tt(r, 't', lang) : id; }
  function dias(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
  function instantanea(calc) { const o = {}; for (const f of Object.keys(calc.fw)) o[f] = calc.fw[f].on ? Math.round(calc.fw[f].grado * 1000) / 1000 : null; return { cov: o, grado: Math.round(calc.kpi.grado * 1000) / 1000, brechas: calc.kpi.brechas }; }

  return { FW, FW_LABEL, FW_LABEL_EN, etiqueta, riaAlcance, RIA_ROLES, RIA_GPAI, craAlcance, CRA_CLASES, doraAlcance, DORA_REGIMENES, fundirPropios, listaNormas, FW_LONG, FW_LONG_EN, ESTADOS, ESTADO_LABEL, ESTADO_LABEL_EN, REGLAS_EN, tt, SCORE, W, DIMS, NIVELES_ENS, CAT_NIVEL, REGLAS, TAMANOS, NIS2_ESPECIALES,
    ESTADOS_PERFIL, JURISDICCIONES, AVIACION, PERFIL_DEF, perfilNormalizado, perfilRegulatorio, sugerirControles,
    indexar, nivelExigidoEns, categoriaEfectiva, excluible, exigidaEns, categoriaDeNiveles, aplicaReq, coberturaReq, calcular, solapamiento, inferencia,
    equivalencias, prioridades, parseIsoRef, parejasClase, ccnPareja, fuerzaCcn, contrasteCcn825, coherencia, planAccion, puntuacionEns, desdeSoaEns, nis2Aplicabilidad, orden, codigo, titulo, instantanea, estadoUc };
});

