/* ---------- Vistas del proyecto ---------- */
let _rrCalc = null, _rrIdx = null;
function reqRow(f, id) { // índice de cobertura por requisito (se rehace cuando cambia el cálculo)
  if (_rrCalc !== calc) { _rrCalc = calc; _rrIdx = {}; for (const g of FW) { _rrIdx[g] = {}; for (const r of calc.req[g]) _rrIdx[g][r.id] = r; } }
  return _rrIdx[f][id];
}
const onFw = (f) => calc.alcance.includes(f);
const fuerzaDe = (w) => (w === 1 ? 'total' : w > 0 ? 'parcial' : 'relacionado');
const fwLong = (f) => (LANG() === 'en' ? E.FW_LONG_EN[f] : E.FW_LONG[f]);
const exigL = (x) => (LANG() === 'en' ? String(x || '').replace(/^aplica\b/, 'applies').replace(/^n\.a\./, 'n/a') : x);
const normTxt = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const reqsOfDom = (dom, f) => { const set = new Set(); for (const c of CAT.controls) if (c.dom === dom) for (const m of c.maps[f]) if (m.w > 0) set.add(m.id); return set; };
function totalStack() {
  const x = { aplicables: 0, cubiertos: 0, parciales: 0, brechas: 0 };
  for (const f of calc.alcance) for (const k of Object.keys(x)) x[k] += calc.fw[f][k];
  return x;
}
/* Cobertura que tendría una norma fuera del alcance con el estado actual de los controles */
const _cov = {};
function covSiEnAlcance(f) {
  if (_cov.calc !== calc) { _cov.calc = calc; _cov.v = {}; }
  if (_cov.v[f] === undefined) { const st2 = { ...state, alcance: { ...state.alcance, [f]: { ...state.alcance[f], on: true } } }; _cov.v[f] = E.calcular(IX, st2).fw[f].grado; }
  return _cov.v[f];
}

/* ================= Rueda Rosetta =================
 * Cada rayo es un control unificado (en orden de dominio); cada anillo, una norma (ENS fuera → ISO 42001 dentro).
 * Hay celda solo donde el control sostiene algún requisito de esa norma. Relleno: implantado; mitad interior: parcial;
 * contorno: pendiente. La geometría es estática y se calcula una vez; en cada render solo cambian las clases. */
const RINGS = [['ens', 274, 300], ['iso27001', 243, 269], ['nis2', 212, 238], ['iso42001', 181, 207]];
const DSHORT = {
  es: { GOB: 'Gobierno', RIE: 'Riesgos', PER: 'Personas', ACT: 'Activos', ACC: 'Acceso', OPE: 'Operación', RED: 'Redes', DES: 'Desarrollo', PRO: 'Proveedores', INC: 'Incidentes', CON: 'Continuidad', FIS: 'Física', IA: 'IA' },
  en: { GOB: 'Governance', RIE: 'Risk', PER: 'People', ACT: 'Assets', ACC: 'Access', OPE: 'Operations', RED: 'Network', DES: 'Development', PRO: 'Suppliers', INC: 'Incidents', CON: 'Continuity', FIS: 'Physical', IA: 'AI' }
};
let WGEO = null;
function wheelGeo() {
  if (WGEO) return WGEO;
  const P = (r, deg) => { const a = (deg * Math.PI) / 180; return `${(400 + r * Math.sin(a)).toFixed(2)},${(400 - r * Math.cos(a)).toFixed(2)}`; };
  const sector = (r0, r1, a0, a1) => `M${P(r1, a0)}A${r1},${r1} 0 0 1 ${P(r1, a1)}L${P(r0, a1)}A${r0},${r0} 0 0 0 ${P(r0, a0)}Z`;
  const TOP = 4; const slots = CAT.controls.length + (CAT.domains.length - 1) + TOP; const step = 360 / slots; const pad = 0.34;
  let k = TOP / 2; const spokes = []; const doms = [];
  CAT.domains.forEach((d, di) => {
    const cs = CAT.controls.filter((c) => c.dom === d.id); const start = k * step;
    for (const c of cs) {
      const a0 = k * step + pad, a1 = (k + 1) * step - pad; const cells = {};
      for (const [f, r0, r1] of RINGS) if (c.maps[f].some((m) => m.w > 0)) cells[f] = { full: sector(r0, r1, a0, a1), half: sector(r0, r0 + (r1 - r0) / 2, a0, a1) };
      spokes.push({ id: c.id, i: spokes.length, hit: sector(176, 304, k * step, (k + 1) * step), cells });
      k++;
    }
    const end = k * step; const mid = (start + end) / 2; const bottom = mid > 90 && mid < 270;
    const rl = bottom ? 325 : 316;
    doms.push({ id: d.id, arc: `M${P(308, start + pad)}A308,308 0 0 1 ${P(308, end - pad)}`, lbl: bottom ? `M${P(rl, end)}A${rl},${rl} 0 0 0 ${P(rl, start)}` : `M${P(rl, start)}A${rl},${rl} 0 0 1 ${P(rl, end)}` });
    if (di < CAT.domains.length - 1) k++;
  });
  WGEO = { spokes, doms };
  return WGEO;
}
function wheelSVG(st, cc, { hero = false } = {}) {
  const g = wheelGeo(); const L = LANG(); const pre = hero ? 'hw' : 'ow';
  const on = (f) => st.alcance[f] && st.alcance[f].on;
  const sel = !hero && ui.insp && ui.insp.type === 'uc' ? ui.insp.id : null;
  const out = [];
  for (const s of g.spokes) {
    const e = E.estadoUc(st, s.id); let cells = '';
    for (const [f] of RINGS) {
      const c = s.cells[f]; if (!c) continue;
      const cls = `cell fw-${f}${on(f) ? '' : ' off'}`;
      cells += e === 'parcial' ? `<path class="${cls} parcial o" d="${c.full}"/><path class="${cls} parcial f" d="${c.half}"/>` : `<path class="${cls} ${e}" d="${c.full}"/>`;
    }
    const attrs = hero ? '' : ` data-act="insp-uc" data-id="${esc(s.id)}" data-tip="${esc(`${s.id} · ${cT(s.id)} · ${t('est.' + e)}`)}" data-st="${e}"`;
    out.push(`<g class="spoke${sel === s.id ? ' sel' : ''}" style="--i:${s.i}"${attrs}><path class="hit" d="${s.hit}"/>${cells}</g>`);
  }
  const doms = g.doms.map((d) => `<g class="dom" data-tip="${esc(dT(d.id))}"><path class="dom-arc" d="${d.arc}"/><path id="${pre}-${d.id}" d="${d.lbl}" fill="none"/><text class="dom-lbl"><textPath href="#${pre}-${d.id}" startOffset="50%" text-anchor="middle">${esc(DSHORT[L][d.id])}</textPath></text></g>`).join('');
  const rings = RINGS.map(([f, r0, r1]) => `<text class="ring-lbl fw-${f}${on(f) ? '' : ' off'}" x="400" y="${(400 - (r0 + r1) / 2 + 3).toFixed(1)}" text-anchor="middle">${FW_SHORT[f]}</text>`).join('');
  let core;
  if (hero) {
    core = `<defs><linearGradient id="hwg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--fw-nis2)"/></linearGradient></defs><circle class="core" cx="400" cy="400" r="166"/>
      ${[0, 45, 90, 135].map((a) => `<ellipse cx="400" cy="400" rx="38" ry="112" fill="none" stroke="url(#hwg)" stroke-width="3" opacity=".85" transform="rotate(${a} 400 400)"/>`).join('')}<circle cx="400" cy="400" r="20" fill="url(#hwg)"/>`;
  } else {
    const k = cc.kpi;
    core = `<circle class="core" cx="400" cy="400" r="166"/><text class="core-s" x="400" y="336" text-anchor="middle" data-d="${esc(t('wheelLbl').toUpperCase())}">${esc(t('wheelLbl').toUpperCase())}</text>
      <text class="core-v num" x="400" y="424" text-anchor="middle" data-d="${esc(pct(k.grado))}">${esc(pct(k.grado))}</text>
      <text class="core-t" x="400" y="456" text-anchor="middle" data-d="${esc(t('coverage'))}">${esc(t('coverage'))}</text>
      <text class="core-s k2" x="400" y="480" text-anchor="middle" data-d="${esc(t('wheelCore', k.controles, k.requisitos))}">${esc(t('wheelCore', k.controles, k.requisitos))}</text>`;
  }
  const label = hero ? '' : ` role="img" aria-label="${esc(`${t('wheelLbl')}: ${pct(cc.kpi.grado)} ${t('coverage')}`)}"`;
  const anim = hero || ui.wAnim; if (!hero) ui.wAnim = false; // la rueda se despliega al entrar, no en cada cambio
  return `<svg class="wheel${hero ? ' hero' : ''}${anim ? ' anim' : ''}" viewBox="34 34 732 732"${label}${hero ? ' aria-hidden="true"' : ''}>${doms}${rings}${out.join('')}${core}</svg>`;
}
/* Al pasar por un rayo, el núcleo de la rueda cuenta qué control es (y vuelve a la cobertura al salir) */
function wheelHover(spoke) {
  const svg = document.querySelector('.wheel:not(.hero)'); if (!svg) return;
  const v = svg.querySelector('.core-v'), tl = svg.querySelector('.core-t'), s1 = svg.querySelector('.core-s'), s2 = svg.querySelector('.core-s.k2'); if (!v) return;
  if (!spoke) { svg.classList.remove('hov'); for (const x of [v, tl, s1, s2]) x.textContent = x.getAttribute('data-d'); return; }
  const id = spoke.getAttribute('data-id'); const c = IX.ucMap[id]; if (!c) return;
  const tit = cT(id); svg.classList.add('hov');
  v.textContent = id; tl.textContent = tit.length > 30 ? tit.slice(0, 29) + '…' : tit;
  s1.textContent = dT(c.dom).toUpperCase().slice(0, 34);
  s2.textContent = `${t('est.' + E.estadoUc(state, id))} · ${FW.filter((f) => c.maps[f].some((m) => m.w > 0)).map((f) => FW_SHORT[f]).join(' · ')}`;
}
function wheelLegend() {
  const sw = (cls) => `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${cls === 'part' ? '<rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="1.5" y="7" width="11" height="5.5" rx="1.5" fill="currentColor"/>' : cls === 'pend' ? '<rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>' : '<rect x="1" y="1" width="12" height="12" rx="2.5" fill="currentColor"/>'}</svg>`;
  return `<div class="wheel-legend"><span class="lg">${sw('impl')}${esc(t('legend.impl'))}</span><span class="lg">${sw('part')}${esc(t('legend.part'))}</span><span class="lg">${sw('pend')}${esc(t('legend.pend'))}</span>
    ${FW.map((f) => `<span class="lg dotfw fw-${f}${onFw(f) ? '' : ' off'}">${FW_SHORT[f]}${onFw(f) ? '' : ` · ${esc(t('ringOff'))}`}</span>`).join('')}</div>`;
}

/* Solapamiento: si cumples la fila al 100 %, qué parte de la columna heredas */
function overlapGrid(st) {
  const inS = (f) => !st || st.alcance[f].on;
  let h = `<div class="overlap" role="table" aria-label="${esc(t('overlapTitle'))}"><div class="h" role="columnheader"><span class="tiny muted">${esc(t('overlapRow'))} ↓</span></div>${FW.map((f) => `<div class="h" role="columnheader">${fwTag(f, !inS(f), true)}</div>`).join('')}`;
  for (const a of FW) {
    h += `<div class="rh" role="rowheader">${fwTag(a, !inS(a), true)}</div>`;
    for (const b of FW) {
      const x = SOLAPE[a][b]; const v = x.pct;
      if (a === b) { h += '<div class="c self" role="cell">—</div>'; continue; }
      h += `<div class="c${v > 0.62 ? ' hi' : ''}${!inS(a) || !inS(b) ? ' fuera' : ''}" role="cell" style="--v:${v.toFixed(3)}" data-tip="${esc(t('overlapTip', E.FW_LABEL[a], E.FW_LABEL[b], pct(v), x.completos, x.total))}">${Math.round(v * 100)}%</div>`;
    }
  }
  return h + '</div>';
}

/* Evolución de la cobertura media (una serie: el título la nombra, sin leyenda) */
function evolucion(hs) {
  const pts = hs.filter((h) => typeof h.grado === 'number'); if (pts.length < 2) return '';
  const W = 560, H = 150, Lm = 36, Rm = 12, T = 12, B = 24;
  const X = (i) => Lm + (i * (W - Lm - Rm)) / (pts.length - 1); const Y = (v) => T + (1 - v) * (H - T - B);
  const line = pts.map((h, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(h.grado).toFixed(1)}`).join('');
  const mes = (f) => new Date(f + 'T00:00:00').toLocaleDateString(LOC(), { month: 'short' }).replace('.', '');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${t('evo')}: ${pct(pts[0].grado)} → ${pct(pts[pts.length - 1].grado)}`)}">
    <defs><linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${[0, 0.5, 1].map((g) => `<line class="gl" x1="${Lm}" x2="${W - Rm}" y1="${Y(g)}" y2="${Y(g)}"/><text class="ax" x="${Lm - 8}" y="${Y(g) + 3}" text-anchor="end">${g * 100}%</text>`).join('')}
    <path class="ar" d="${line}L${X(pts.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z"/><path class="ln" d="${line}"/>
    ${pts.map((h, i) => `<text class="ax" x="${X(i)}" y="${H - 6}" text-anchor="middle">${h.fecha === today() ? esc(t('today')) : esc(mes(h.fecha))}</text><circle class="pt" cx="${X(i)}" cy="${Y(h.grado)}" r="${i === pts.length - 1 ? 4.5 : 3.2}"/><circle class="hit" cx="${X(i)}" cy="${Y(h.grado)}" r="14" data-tip="${esc(`${fmtDate(h.fecha)} · ${pct(h.grado)} · ${h.brechas} ${t('gaps')}`)}"/>`).join('')}
  </svg>`;
}

/* ================= Órbita ================= */
function vOrbita() {
  const p = state.proyecto;
  const actions = `<button type="button" class="btn" data-act="export-xlsx">${icon('file-spreadsheet', 16)}${esc(t('excel'))}</button><button type="button" class="btn primary" data-act="nav" data-view="traductor">${icon('waypoints', 16)}${esc(t('nav.traductor'))}</button>`;
  const hd = head(`${icon('orbit', 14)}${esc(t('orbitEyebrow'))}${p.organizacion ? ' · ' + esc(p.organizacion) : ''}`, esc(p.nombre || p.organizacion || '—'), esc(t('orbitLead')), actions);
  if (!calc.alcance.length) return `${hd}<section class="glass pane">${empty('compass', esc(t('noScope')), esc(t('noScopeTxt')), `<button type="button" class="btn primary" data-act="nav" data-view="alcance">${esc(t('defineScope'))}${icon('arrow-right', 16)}</button>`)}</section>`;
  const k = calc.kpi; const tot = totalStack(); const hs = state.historial || [];
  const n2 = state.alcance.nis2;
  const lens = FW.map((f) => {
    const w = calc.fw[f];
    if (!w.on) { const g = covSiEnAlcance(f); return `<button type="button" class="lens off fw-${f}" data-act="nav" data-view="alcance">${miniRing(f, g, 0, 1, 46, true)}<span><b>${E.FW_LABEL[f]}</b><small>${esc(t('outScope'))}</small></span><span class="pc num muted">${pct(g)}</span></button>`; }
    return `<button type="button" class="lens fw-${f}" data-act="goto-norma" data-fw="${f}">${miniRing(f, w.grado, w.cubiertos, w.aplicables)}<span><b>${E.FW_LABEL[f]}</b><small>${esc(t('lensSub', w.aplicables, w.brechas))}</small></span><span class="pc num">${pct(w.grado)}</span></button>`;
  }).join('');
  const top = prio.slice(0, 3);
  const play = top.length ? `<ol class="play" style="list-style:none;margin:0;padding:0">${top.map((x, i) => {
    const enCurso = (state.acciones[x.id] || {}).estado === 'En curso';
    return `<li class="play-i"><span class="play-n">${i + 1}</span><div style="min-width:0"><b>${esc(cT(x.id))}</b><div class="row">${ucChip(x.id)}${x.normas.map((f) => fwTag(f, false, true)).join('')}<span class="gain">${esc(t('unlocks', num1(x.ganancia)))}</span></div></div>
      ${enCurso ? `<span class="pill warn">${icon('hourglass', 13)}${esc(t('lanes.En curso'))}</span>` : `<button type="button" class="btn sm" data-act="plan-start" data-id="${esc(x.id)}">${icon('zap', 15)}${esc(t('start'))}</button>`}</li>`;
  }).join('')}</ol>` : `<div class="ok-box">${icon('circle-check', 16)}${esc(t('allDone'))}</div>`;
  const sevN = (sv) => hall.filter((h) => h.sev === sv).length;
  const stat = (ic, kl, v, sub) => `<div class="glass stat"><span class="k">${icon(ic, 15)}${esc(kl)}</span><span class="v num">${v}</span><span class="s">${esc(sub)}</span></div>`;
  return `${hd}
  <div class="orbit">
    <section class="glass wheel-card">${wheelSVG(state, calc)}${wheelLegend()}</section>
    <div class="side-stack">
      <section class="glass pane stack">
        <div class="row">${calc.alcance.map((f) => fwTag(f)).join('')}${n2.on ? entPill(n2.tipo) : ''}${state.alcance.ens.on ? `<span class="cat">ENS · ${esc(t('cats.' + state.alcance.ens.categoria))}</span>` : ''}</div>
        <div class="big-num"><b class="num">${pct(k.grado)}</b><span>${esc(t('ofReqs', k.requisitos, k.normas))}</span></div>
        ${stackBar(tot)}
        <div class="legend"><span><i style="background:var(--ok)"></i>${esc(t('cov.cubierto'))} ${tot.cubiertos}</span><span><i style="background:var(--warn)"></i>${esc(t('cov.parcial'))} ${tot.parciales}</span><span><i style="background:var(--crit)"></i>${esc(t('cov.brecha'))} ${tot.brechas}</span></div>
      </section>
      <section class="glass pane"><div class="pane-h"><h3>${esc(t('lensTitle'))}</h3></div><div class="lens-list">${lens}</div></section>
      <section class="glass pane"><div class="pane-h"><div><h3>${esc(t('nextTitle'))}</h3><p>${esc(t('nextSub'))}</p></div><button type="button" class="btn sm ghost" data-act="nav" data-view="plan">${esc(t('nav.plan'))}${icon('arrow-right', 15)}</button></div>${play}</section>
      <section class="glass pane"><div class="pane-h"><h3>${esc(t('alertsTitle'))}</h3><button type="button" class="btn sm ghost" data-act="goto-brechas" data-v="todas">${esc(t('seeAll'))}${icon('arrow-right', 15)}</button></div>
        <div class="sev-row">${['Alta', 'Media', 'Baja'].map((sv) => `<button type="button" class="sev ${sv}" data-act="goto-brechas" data-v="${sv}"><b class="num">${sevN(sv)}</b><span>${esc(t('sevN', t('sev.' + sv)))}</span></button>`).join('')}</div></section>
    </div>
  </div>
  <div class="stat-strip">
    ${stat('layers', t('kCtl'), `${k.implantados}<small> / ${k.controles}</small>`, t('kCtlS', k.parciales))}
    ${stat('link', t('kReuse'), num1(k.reutilizacion), t('kReuseS'))}
    ${stat('split', t('kSave'), pct(k.ahorro), t('kSaveS', k.controles, k.requisitos))}
    ${stat('network', t('kMulti'), String(k.multinorma), t('kMultiS'))}
  </div>
  <div class="grid g2">
    <section class="glass pane"><div class="pane-h"><h3>${esc(t('evo'))}</h3>${hs.some((h) => h.ejemplo) ? `<span class="tiny muted">${esc(t('evoDemo'))}</span>` : ''}</div>${evolucion(hs) || `<p class="small muted">—</p>`}</section>
    <section class="glass pane"><div class="pane-h"><div><h3>${esc(t('overlapTitle'))}</h3><p>${esc(t('overlapSub'))}</p></div></div>${overlapGrid(state)}</section>
  </div>`;
}

/* ================= Prisma ================= */
const PRISM_DEF = {};
function prismDefault(f) { // el requisito con más equivalencias: la mejor demostración al entrar
  if (!PRISM_DEF[f]) { let best = null, bn = -1; for (const r of CAT.frameworks[f].reqs) { const eq = E.equivalencias(IX, f, r.id); const n = FW.reduce((a, g) => a + eq.otras[g].filter((x) => x.fuerza !== 'relacionado').length, 0); if (n > bn) { bn = n; best = r.id; } } PRISM_DEF[f] = best; }
  return PRISM_DEF[f];
}
function prismResults() {
  const f = ui.trFw; const q = normTxt(ui.trQ.trim());
  return CAT.frameworks[f].reqs.filter((r) => !q || normTxt(`${reqCode(f, r.id)} ${r.code} ${rT(f, r.id)} ${rG(f, r.id)}`).includes(q)).slice(0, 120);
}
function vPrisma() {
  const f = ui.trFw;
  if (!ui.trId || !IX.req[f][ui.trId]) ui.trId = prismDefault(f);
  const id = ui.trId; const r = IX.req[f][id]; const cov = reqRow(f, id);
  const showRel = ws.settings.mostrarRelaciones;
  const eq = E.equivalencias(IX, f, id);
  const ctl = eq.controles.filter((l) => l.w > 0 || showRel);
  let res = '';
  if (ui.trOpen) {
    const list = prismResults(); if (ui.trIdx >= list.length) ui.trIdx = Math.max(0, list.length - 1);
    res = `<div class="pick-res" role="listbox" id="tr-res" aria-label="${esc(E.FW_LABEL[f])}">${list.map((x, i) => { const c = onFw(f) ? reqRow(f, x.id).estado : ''; return `<button type="button" class="pick-i${i === ui.trIdx ? ' on' : ''}${x.id === id ? ' cur' : ''}" role="option" aria-selected="${x.id === id}" data-act="tr-pick" data-id="${esc(x.id)}" id="tri-${i}"><code>${esc(reqCode(f, x.id))}</code><span>${esc(rT(f, x.id))}</span>${c ? `<i class="dot st-${esc(c)}" aria-hidden="true"></i>` : '<i></i>'}</button>`; }).join('') || `<div class="pal-e">${esc(t('noResults'))}</div>`}</div>`;
  }
  const picker = `<section class="glass prism-pick">
    <div class="chipset" role="group" aria-label="${esc(t('source'))}">${FW.map((g) => `<button type="button" data-act="tr-fw" data-fw="${g}" aria-pressed="${g === f}"><span class="dotfw fw-${g}"></span>${FW_SHORT[g]}</button>`).join('')}</div>
    <div class="search">${icon('search', 16)}<input type="search" id="tr-q" value="${esc(ui.trQ)}" placeholder="${esc(t('pickPh'))}" aria-label="${esc(t('pickPh'))}" autocomplete="off" role="combobox" aria-expanded="${ui.trOpen}" aria-controls="tr-res"></div>${res}</section>`;
  const ensInfo = f === 'ens' ? `<dl class="kv small"><dt>${esc(t('dims'))}</dt><dd>${esc(r.dims)}</dd><dt>${esc(t('exig'))}</dt><dd class="mono">B ${esc(r.bajo)} · M ${esc(r.medio)} · A ${esc(r.alto)}</dd>${state.alcance.ens.on ? `<dt>${esc(t('inYourSys'))}</dt><dd>${esc(t('level'))} ${esc(t('lv.' + cov.nivel))} · <code>${esc(exigL(cov.exigencia))}</code></dd>` : ''}<dt>${esc(t('classIso'))}</dt><dd>${esc(r.ref || '—')}</dd></dl>` : '';
  const src = `<div class="src-col"><div class="col-lbl">${esc(t('source'))}</div><div class="src fw-${f}">
    <div class="row">${fwTag(f, !onFw(f))}<code>${esc(reqCode(f, id))}</code></div><h2>${esc(rT(f, id))}</h2><p class="small muted">${esc(rG(f, id))}</p>
    <div class="row" style="margin-top:12px">${onFw(f) ? covPill(cov.estado) + (cov.estado !== 'no-exigido' && cov.estado !== 'excluido' ? `<span class="small muted num">${esc(t('support', pct(cov.score)))}</span>` : '') : `<span class="pill neutral">${esc(t('outOfScope'))}</span>`}</div>
    ${ensInfo ? `<div style="margin-top:14px">${ensInfo}</div>` : ''}
    <div class="row" style="margin-top:14px"><button type="button" class="btn sm" data-act="insp-req" data-fw="${f}" data-id="${esc(id)}">${icon('panel-right', 15)}${esc(t('inspect'))}</button></div></div></div>`;
  const nodes = `<div class="nodes-col"><div class="col-lbl">${esc(t('controlsCol'))} · ${ctl.length}</div>${ctl.map((l) => { const fz = fuerzaDe(l.w); const e = E.estadoUc(state, l.uc); return `<div class="node" role="button" tabindex="0" data-act="insp-uc" data-id="${esc(l.uc)}" data-uc="${esc(l.uc)}" data-w="${l.w}">
      <span class="uc">${esc(l.uc)}</span><b>${esc(cT(l.uc))}</b><div class="row"><span class="weight ${fz}">${esc(t('fuerzaCorta.' + fz))}</span>${l.w > 0 ? stateSwitch(l.uc, e) : ''}</div></div>`; }).join('')}</div>`;
  const lane = (g) => {
    const rows = eq.otras[g].filter((x) => x.fuerza !== 'relacionado' || showRel);
    const noEq = g === 'iso42001' || f === 'iso42001' ? t('noEqAi') : t('noEq');
    return `<div class="lane fw-${g}${onFw(g) ? '' : ' off'}"><h4>${fwTag(g, !onFw(g))}<span class="tiny muted num">${rows.length}</span></h4>
      ${rows.length ? rows.map((x) => { const c = onFw(g) ? reqRow(g, x.id).estado : ''; return `<button type="button" class="eq" data-act="tr-center" data-fw="${g}" data-id="${esc(x.id)}" data-via="${esc(x.via.join(' '))}" data-fz="${x.fuerza}" data-tip="${esc(t('centerHere'))}"><span class="rq fw-${g} ${x.fuerza}${c ? ' st-' + esc(c) : ''}">${esc(reqCode(g, x.id))}</span><span class="t">${esc(rT(g, x.id))}</span><small>${esc(t('fuerza.' + x.fuerza))} · ${esc(t('viaCtl', x.via.join(', ')))}</small></button>`; }).join('') : `<p class="empty-lane">${esc(noEq)}</p>`}</div>`;
  };
  const dst = `<div class="dst"><div class="col-lbl">${esc(t('targets'))}</div>${FW.filter((g) => g !== f).map(lane).join('')}</div>`;
  return `${head(`${icon('waypoints', 14)}${esc(t('prismEyebrow'))}`, esc(t('prismTitle')), esc(t('prismLead')))}
  ${picker}
  <section class="glass stage"><svg class="beams" aria-hidden="true"></svg>${src}${nodes}${dst}</section>`;
}
/* Haces de luz del Prisma: requisito → controles → equivalencias (se miden sobre el DOM real) */
function drawBeams() {
  const stage = document.querySelector('.stage'); const svg = stage && stage.querySelector('.beams'); if (!svg) return;
  if (getComputedStyle(svg).display === 'none') { svg.innerHTML = ''; return; }
  const R = stage.getBoundingClientRect(); const src = stage.querySelector('.src'); if (!src) return;
  const pos = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - R.left, r: r.right - R.left, y: r.top - R.top + Math.min(r.height / 2, 22) }; };
  const curve = (x1, y1, x2, y2) => { const dx = Math.max(20, (x2 - x1) * 0.5); return `M${x1.toFixed(1)},${y1.toFixed(1)} C${(x1 + dx).toFixed(1)},${y1.toFixed(1)} ${(x2 - dx).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; };
  const s = pos(src); const sr = src.getBoundingClientRect(); const sTop = sr.top - R.top + 40, sBot = sr.bottom - R.top - 40;
  const f = ui.trFw; const nodes = {}; let d = '', flow = '';
  stage.querySelectorAll('.node').forEach((n) => {
    const p = pos(n); nodes[n.dataset.uc] = p; const w = +n.dataset.w; const y0 = Math.max(sTop, Math.min(Math.max(sTop, sBot), p.y)); const path = curve(s.r, y0, p.l, p.y);
    d += `<path class="fw-${f} ${fuerzaDe(w)}" d="${path}"/>`; if (w > 0) flow += `<path class="fw-${f} flow" d="${path}"/>`;
  });
  stage.querySelectorAll('.eq').forEach((e) => {
    const p = pos(e); const g = e.dataset.fw; if (!FW.includes(g)) return;
    for (const uc of String(e.dataset.via || '').split(' ')) { const n = nodes[uc]; if (n) d += `<path class="fw-${g} ${oneOf(e.dataset.fz, ['total', 'parcial', 'relacionado'], 'total')}" d="${curve(n.r, n.y, p.l, p.y)}"/>`; }
  });
  svg.setAttribute('width', R.width); svg.setAttribute('height', R.height); svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
  svg.innerHTML = d + flow;
}

/* ================= Controles unificados ================= */
function vControles() {
  const q = normTxt(ui.ucQ.trim());
  const base = CAT.controls.filter((c) => (!ui.ucSoloRel || calc.controles[c.id].relevante) && (ui.ucFw === 'todos' || c.maps[ui.ucFw].some((m) => m.w > 0)));
  const list = base.filter((c) => {
    if (ui.ucEstado !== 'todos' && calc.controles[c.id].estado !== ui.ucEstado) return false;
    if (q && !normTxt(`${c.id} ${cT(c.id)} ${c.t} ${tt(c, 'obj')} ${FW.map((f) => c.maps[f].map((m) => reqCode(f, m.id) + ' ' + IX.req[f][m.id].code).join(' ')).join(' ')}`).includes(q)) return false;
    return true;
  });
  const cnt = (e) => base.filter((c) => calc.controles[c.id].estado === e).length;
  const estados = [['todos', t('all'), base.length], ...E.ESTADOS.map((e) => [e, t('est.' + e), cnt(e)])];
  let html = '';
  for (const d of CAT.domains) {
    const cs = list.filter((c) => c.dom === d.id); if (!cs.length) continue;
    html += `<section class="glass list"><div class="sec-h">${icon(d.ic, 17)}${esc(dT(d.id))}<small>${esc(t('nControls', cs.length))}</small></div>${cs.map((c) => {
      const cc = calc.controles[c.id]; const dd = state.controles[c.id];
      return `<div class="li${cc.relevante ? '' : ' dim'}${ui.insp && ui.insp.type === 'uc' && ui.insp.id === c.id ? ' on' : ''}" id="uc-${esc(c.id)}" role="button" tabindex="0" data-act="insp-uc" data-id="${esc(c.id)}">
        <span class="id">${esc(c.id)}</span><div class="tt"><b>${esc(cT(c.id))}</b><small>${dd.origen === 'ens' ? `<span class="origin">${esc(t('inheritedEns'))}</span> · ` : ''}${esc(dd.responsable || t('noOwner'))}</small></div>
        <div class="fwdots">${FW.map((f) => { const n = c.maps[f].filter((m) => m.w > 0).length; return n ? `<span class="fwn fw-${f}${onFw(f) ? '' : ' off'}" data-tip="${esc(`${E.FW_LABEL[f]}: ${t('reqs', n)}`)}">${n}</span>` : ''; }).join('')}</div>
        ${stateSwitch(c.id, cc.estado)}</div>`;
    }).join('')}</section>`;
  }
  return `${head(`${icon('layers', 14)}${esc(t('ctlEyebrow'))}`, esc(t('ctlTitle')), esc(t('ctlLead', CAT.controls.length, CAT.domains.length)))}
  <div class="toolbar"><div class="search">${icon('search', 16)}<input type="search" id="uc-q" data-uiq="ucQ" value="${esc(ui.ucQ)}" placeholder="${esc(t('ctlSearch'))}" aria-label="${esc(t('ctlSearch'))}"></div>
    <div class="chipset" role="group" aria-label="${esc(t('fws'))}">${[['todos', t('allFw')], ...FW.map((f) => [f, FW_SHORT[f]])].map(([v, l]) => `<button type="button" data-act="uc-fw" data-v="${v}" aria-pressed="${ui.ucFw === v}">${v !== 'todos' ? `<span class="dotfw fw-${v}"></span>` : ''}${esc(l)}</button>`).join('')}</div>
    <label class="switch-l"><span class="switch"><input type="checkbox" id="uc-rel" data-uibool="ucSoloRel"${ui.ucSoloRel ? ' checked' : ''}><span></span></span>${esc(t('onlyScope'))}</label></div>
  <div class="chipset" role="group" aria-label="${esc(t('severity'))}">${estados.map(([v, l, n]) => `<button type="button" data-act="uc-estado" data-v="${v}" aria-pressed="${ui.ucEstado === v}">${v !== 'todos' ? icon(ST_IC[v], 14) : ''}${esc(l)}<span class="n">${n}</span></button>`).join('')}</div>
  ${html || `<section class="glass pane">${empty('search', esc(t('noResults')), esc(t('noResultsTxt')))}</section>`}`;
}

/* ================= Requisitos por norma ================= */
function vNormas() {
  const f = ui.normaFw; const fw = calc.fw[f];
  const q = normTxt(ui.normaQ.trim());
  const rows = calc.req[f].filter((r) => (ui.normaEstado === 'todos' || r.estado === ui.normaEstado) && (!q || normTxt(`${reqCode(f, r.id)} ${IX.req[f][r.id].code} ${rT(f, r.id)}`).includes(q)));
  const tabs = `<div class="lens-row" role="group" aria-label="${esc(t('fws'))}">${FW.map((g) => { const w = calc.fw[g]; return `<button type="button" class="lens-tab fw-${g}${onFw(g) ? '' : ' off'}" data-act="norma-fw" data-fw="${g}" aria-pressed="${g === f}">${miniRing(g, w.grado, w.cubiertos, w.aplicables, 52, !onFw(g))}<span><b>${E.FW_LABEL[g]}</b><small>${onFw(g) ? `${pct(w.grado)} · ${w.brechas} ${esc(t('gaps'))}` : esc(t('ringOff'))}</small></span></button>`; }).join('')}</div>`;
  const cntE = (e) => calc.req[f].filter((r) => r.estado === e).length;
  const filtros = [['todos', t('all'), calc.req[f].length], ...['brecha', 'parcial', 'cubierto', 'excluido', ...(f === 'ens' ? ['no-exigido'] : [])].map((e) => [e, t('cov.' + e), cntE(e)])];
  let html = ''; let lastG = null; let buf = '';
  const flush = () => { if (buf) html += `<section class="glass list"><div class="sec-h">${icon('file-check', 16)}${esc(lastG)}<small>${buf.split('class="li req').length - 1}</small></div>${buf}</section>`; buf = ''; };
  for (const r of rows) {
    const g = rG(f, r.id); if (g !== lastG) { flush(); lastG = g; }
    const ex = r.estado === 'excluido'; const live = r.estado !== 'no-exigido' && !ex;
    const sub = ex ? `${t('excludedBy')}: ${r.justificacion || t('unjustified')}` : f === 'ens' && state.alcance.ens.on ? `${t('level')} ${t('lv.' + r.nivel)} · ${exigL(r.exigencia)}` : '';
    buf += `<div class="li req${live ? '' : ' dim'}${ui.insp && ui.insp.type === 'req' && ui.insp.fw === f && ui.insp.id === r.id ? ' on' : ''}" role="button" tabindex="0" data-act="insp-req" data-fw="${f}" data-id="${esc(r.id)}">
      <span class="id">${esc(reqCode(f, r.id))}</span><div class="tt"><b>${esc(rT(f, r.id))}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>
      <div class="meter">${live ? `<div class="bar"><i class="${r.estado === 'cubierto' ? 'ok' : r.estado === 'parcial' ? 'warn' : 'crit'}" style="width:${Math.max(r.score * 100, r.estado === 'brecha' ? 4 : 0)}%"></i></div><span class="num">${pct(r.score)}</span>` : '<span></span><span></span>'}</div>
      <div>${covPill(r.estado)}</div></div>`;
  }
  flush();
  return `${head(`${icon('file-check', 14)}${esc(t('normEyebrow'))}`, esc(t('normTitle')), esc(t('normLead')))}
  ${tabs}
  <section class="glass pane stack fw-${f}"><div class="row spread"><div><h3>${esc(fwLong(f))}</h3><p class="small muted" style="margin-top:3px">${onFw(f) ? `${esc(t('applicable', fw.aplicables))} · ${pct(fw.grado)}${fw.excluidos ? ` · ${fw.excluidos} ${esc(t('cov.excluido').toLowerCase())}` : ''}${fw.noExigidos ? ` · ${fw.noExigidos} ${esc(t('cov.no-exigido').toLowerCase())}` : ''}` : esc(t('orient'))}</p></div>${onFw(f) ? '' : `<button type="button" class="btn sm" data-act="nav" data-view="alcance">${icon('plus', 15)}${esc(t('addScope'))}</button>`}</div>${stackBar(fw)}</section>
  <div class="toolbar"><div class="search">${icon('search', 16)}<input type="search" id="norma-q" data-uiq="normaQ" value="${esc(ui.normaQ)}" placeholder="${esc(t('reqSearch'))}" aria-label="${esc(t('reqSearch'))}"></div>
    <div class="chipset" role="group">${filtros.map(([v, l, n]) => `<button type="button" data-act="norma-estado" data-v="${v}" aria-pressed="${ui.normaEstado === v}">${esc(l)}<span class="n">${n}</span></button>`).join('')}</div></div>
  ${html || `<section class="glass pane">${empty('search', esc(t('noResults')), esc(t('noResultsTxt')))}</section>`}`;
}

/* ================= Brechas y coherencia ================= */
function vBrechas() {
  const list = hall.filter((h) => ui.brechaSev === 'todas' || h.sev === ui.brechaSev);
  const excl = {};
  for (const f of calc.alcance) excl[f] = calc.req[f].filter((r) => r.estado === 'brecha' && IX.reqUcs[f][r.id].every((l) => calc.controles[l.uc].normas.every((g) => g === f)));
  const ambito = (h) => ((h.ucs && h.ucs.length > 1) || (h.reqs && h.reqs.length > 1) ? '' : h.reqs && h.reqs.length === 1 && IX.req[h.fw] && IX.req[h.fw][h.reqs[0]] ? reqChip(h.fw, h.reqs[0]) : UC_IDS.has(h.ambito) ? ucChip(h.ambito) : h.fw && h.req && FW.includes(h.fw) && IX.req[h.fw][h.req] ? reqChip(h.fw, h.req) : `<span class="cat">${esc(h.ambito)}</span>`);
  const multi = (h) => (h.ucs && h.ucs.length > 1) || (h.reqs && h.reqs.length > 1);
  return `${head(`${icon('shield-alert', 14)}${esc(t('gapEyebrow'))}`, esc(t('gapTitle')), esc(t('gapLead')), `<button type="button" class="btn" data-act="export-md">${icon('file-text', 16)}${esc(t('report'))}</button>`)}
  <div class="sev-row">${['Alta', 'Media', 'Baja'].map((sv) => `<button type="button" class="glass sev ${sv}${ui.brechaSev === sv ? ' on' : ''}" data-act="brecha-sev" data-v="${sv}" aria-pressed="${ui.brechaSev === sv}"><b class="num">${hall.filter((h) => h.sev === sv).length}</b><span>${esc(t('sevN', t('sev.' + sv)))}</span></button>`).join('')}</div>
  ${ui.brechaSev !== 'todas' ? `<div class="row"><span class="small muted">${esc(t('filterBy', t('sev.' + ui.brechaSev)))}</span><button type="button" class="btn sm ghost" data-act="brecha-sev" data-v="todas">${esc(t('showAll'))}</button></div>` : ''}
  <div class="findings">${list.map((h) => `<article class="finding ${h.sev}"><div class="row">${sevPill(h.sev)}<code class="ref">${esc(h.id)}</code>${ambito(h)}</div>
    <div class="t">${esc(h.titulo)}</div><div class="d">${esc(multi(h) ? String(h.detalle).replace(/ (Afecta a|Affects):.*$/, '') : h.detalle)}</div>${multi(h) ? `<div class="chips">${h.ucs ? h.ucs.map(ucChip).join('') : h.reqs.filter((r) => IX.req[h.fw] && IX.req[h.fw][r]).map((r) => reqChip(h.fw, r)).join('')}</div>` : ''}
    <div class="a">${icon('arrow-right', 15)}<span>${esc(h.accion)}</span></div>${h.ref ? `<div class="ref">${esc(h.ref)}</div>` : ''}</article>`).join('') || `<div class="ok-box">${icon('circle-check', 16)}${esc(t('noFindings'))}</div>`}</div>
  <div class="pane-h" style="margin:10px 4px 0"><div><h2>${esc(t('gapsByFw'))}</h2><p>${esc(t('gapsByFwSub'))}</p></div></div>
  <div class="grid g2">${calc.alcance.map((f) => { const br = calc.req[f].filter((r) => r.estado === 'brecha'); return `<section class="glass pane stack"><div class="row spread">${fwTag(f)}<span class="small muted">${br.length} ${esc(t('gaps'))} · ${esc(t('exclusive', excl[f].length))}</span></div>
    ${br.length ? `<div class="chips">${br.map((r) => reqChip(f, r.id, { cov: 'brecha' })).join('')}</div>${excl[f].length ? `<p class="small muted">${esc(t('exclusiveTxt', E.FW_LABEL[f], excl[f].map((r) => reqCode(f, r.id)).join(', ')))}</p>` : ''}` : `<div class="ok-box">${icon('circle-check', 16)}${esc(t('noGaps'))}</div>`}</section>`; }).join('')}</div>`;
}

/* ================= Plan (tablero) ================= */
const LANES = ['Pendiente', 'En curso', 'Hecha'];
const laneOf = (a) => (a.verificada ? 'Hecha' : oneOf(a.estado, LANES, 'Pendiente'));
function vPlan() {
  const hoy = today(); const maxG = Math.max(1e-9, ...plan.map((a) => a.ganancia));
  const card = (a) => {
    const li = LANES.indexOf(laneOf(a)); const late = a.fecha && a.fecha < hoy && !a.verificada;
    return `<article class="card-k" draggable="true" data-key="${esc(a.key)}">
      <div class="row spread"><span class="rank ${a.prioridad}">${a.rank ? '#' + a.rank : '✓'} · ${esc(t('prio.' + a.prioridad))}</span><span class="gain">${a.verificada ? esc(t('verified')) : esc(t('unlocks', num1(a.ganancia)))}</span></div>
      <b>${esc(cT(a.id))}</b>
      <div class="meta">${ucChip(a.id)}${a.normas.map((f) => fwTag(f, false, true)).join('')}${stPill(a.estadoControl)}</div>
      ${a.verificada ? '' : `<div class="gbar" aria-hidden="true"><i style="width:${(a.ganancia / maxG) * 100}%"></i></div>
      <div class="f2"><input type="text" id="pl-r-${esc(a.key)}" data-plan="${esc(a.key)}" data-f="responsable" value="${esc(a.responsable)}" placeholder="${esc(t('owner'))}" aria-label="${esc(t('owner'))} ${esc(a.id)}"><input type="date" id="pl-d-${esc(a.key)}" data-plan="${esc(a.key)}" data-f="fecha" value="${esc(a.fecha)}"${late ? ' class="late"' : ''} aria-label="${esc(t('due'))} ${esc(a.id)}"></div>`}
      <div class="mv"><button type="button" class="ibtn sm" data-act="plan-move" data-key="${esc(a.key)}" data-dir="-1" aria-label="${esc(t('moveL'))}"${li === 0 ? ' disabled' : ''}>${icon('chevron-left', 16)}</button><span class="tiny muted">${esc(t('lanes.' + LANES[li]))}</span><button type="button" class="ibtn sm" data-act="plan-move" data-key="${esc(a.key)}" data-dir="1" aria-label="${esc(t('moveR'))}"${li === 2 ? ' disabled' : ''}>${icon('chevron-right', 16)}</button></div></article>`;
  };
  const LIM_L = 24;
  const lanes = LANES.map((ln) => {
    const items = plan.filter((a) => laneOf(a) === ln).sort((x, y) => (x.rank || 999) - (y.rank || 999));
    const show = ui.planAll || items.length <= LIM_L ? items : items.slice(0, LIM_L);
    return `<section class="lanek lane-${ln === 'En curso' ? 'curso' : ln.toLowerCase()}" data-lane="${ln}" aria-label="${esc(t('lanes.' + ln))}"><div class="lanek-h"><span class="row">${icon(ln === 'Pendiente' ? 'circle-dashed' : ln === 'En curso' ? 'hourglass' : 'badge-check', 17)}${esc(t('lanes.' + ln))}</span><span class="n">${items.length}</span></div>
      ${show.map(card).join('') || `<p class="empty-lane">—</p>`}${show.length < items.length ? `<button type="button" class="btn sm ghost" data-act="plan-all" style="width:100%">+${items.length - show.length}</button>` : ''}</section>`;
  }).join('');
  return `${head(`${icon('square-kanban', 14)}${esc(t('planEyebrow'))}`, esc(t('planTitle')), esc(t('planLead')), `<button type="button" class="btn" data-act="export-plan">${icon('download', 16)}CSV</button>`)}
  <div class="board">${lanes}</div>`;
}
function moveAction(key, lane) {
  const a = plan.find((x) => x.key === key); if (!a || !UC_IDS.has(key) || !LANES.includes(lane)) return;
  state.acciones[key] = { estado: a.estado, responsable: a.responsable, fecha: a.fecha, nota: a.nota, ...(state.acciones[key] || {}), estado: lane };
  const c = state.controles[key];
  if (lane === 'Hecha' && c.estado !== 'implantado') { c.estado = 'implantado'; if (!c.revision) c.revision = today(); commit(t('tDone', key)); return; }
  if (lane !== 'Hecha' && c.estado === 'implantado') c.estado = 'parcial';
  commit(lane === 'En curso' ? t('tStarted', key) : undefined);
}

/* ================= Mapa ================= */
function vMapa() {
  const showRel = ws.settings.mostrarRelaciones;
  const counts = CAT.domains.map((d) => ({ d, n: FW.map((f) => reqsOfDom(d.id, f).size), ctl: CAT.controls.filter((c) => c.dom === d.id).length }));
  const max = Math.max(...counts.flatMap((x) => x.n));
  const grid = `<div style="overflow-x:auto"><div class="dgrid" role="table" aria-label="${esc(t('byDomain'))}"><div class="h"></div>${FW.map((f) => `<div class="h">${fwTag(f, !onFw(f), true)}</div>`).join('')}<div class="h tot tiny muted">${esc(t('controlsN'))}</div>
    ${counts.map(({ d, n, ctl }) => `<div class="rh">${icon(d.ic, 15)}<span>${esc(dT(d.id))}</span></div>${n.map((v, i) => `<div class="c fw-${FW[i]}${v ? '' : ' zero'}${v / max > 0.6 ? ' hi' : ''}" style="--v:${(v / max).toFixed(3)}" data-tip="${esc(`${dT(d.id)} · ${E.FW_LABEL[FW[i]]}: ${t('reqs', v)}`)}">${v || '·'}</div>`).join('')}<div class="tot">${ctl}</div>`).join('')}</div></div>`;
  const q = normTxt(ui.mapaQ.trim());
  let rows = ''; let lastDom = '';
  for (const c of CAT.controls) {
    if (q && !normTxt(`${c.id} ${cT(c.id)} ${FW.map((f) => c.maps[f].map((m) => reqCode(f, m.id) + ' ' + IX.req[f][m.id].code).join(' ')).join(' ')}`).includes(q)) continue;
    if (c.dom !== lastDom) { rows += `<tr class="dom"><td colspan="6">${esc(dT(c.dom))}</td></tr>`; lastDom = c.dom; }
    rows += `<tr><td>${ucChip(c.id)}</td><td class="t"><b>${esc(cT(c.id))}</b></td>${FW.map((f) => `<td><div class="chips">${c.maps[f].filter((m) => m.w > 0 || showRel).map((m) => reqChip(f, m.id, { fuerza: fuerzaDe(m.w), cov: onFw(f) ? reqRow(f, m.id).estado : null })).join('')}</div></td>`).join('')}</tr>`;
  }
  return `${head(`${icon('grid-3x3', 14)}${esc(t('mapEyebrow'))}`, esc(t('mapTitle')), esc(t('mapLead', CAT.controls.length, TOTAL_REQS)), `<button type="button" class="btn" data-act="export-xlsx">${icon('file-spreadsheet', 16)}${esc(t('excel'))}</button>`)}
  <section class="glass pane"><div class="pane-h"><div><h3>${esc(t('byDomain'))}</h3><p>${esc(t('byDomainSub'))}</p></div></div>${grid}</section>
  <div class="toolbar"><div class="search">${icon('search', 16)}<input type="search" id="mapa-q" data-uiq="mapaQ" value="${esc(ui.mapaQ)}" placeholder="${esc(t('mapFilter'))}" aria-label="${esc(t('mapFilter'))}"></div>
    <div class="row small muted"><span class="rq total fw-iso27001">${esc(t('fuerzaCorta.total'))}</span><span class="rq parcial fw-iso27001">${esc(t('fuerzaCorta.parcial'))}</span>${showRel ? `<span class="rq relacionado fw-iso27001">${esc(t('fuerzaCorta.relacionado'))}</span>` : ''}</div></div>
  <section class="glass list xw-wrap"><table class="xw"><thead><tr><th>${esc(t('control'))}</th><th>${esc(t('description'))}</th>${FW.map((f) => `<th>${fwTag(f)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted">${esc(t('noResults'))}</td></tr>`}</tbody></table></section>`;
}

/* ================= Alcance ================= */
function vAlcance() {
  const a = state.alcance; const p = state.proyecto; const S = t('sectors');
  return `${head(`${icon('compass', 14)}${esc(t('scopeEyebrow'))}`, esc(t('scopeTitle')), esc(t('scopeLead')))}
  <section class="glass pane"><h3>${esc(t('org'))}</h3><div class="form" style="margin-top:14px">
    <label class="fld">${esc(t('projName'))}<input type="text" id="al-n" data-set="proyecto.nombre" value="${esc(p.nombre)}"></label>
    <label class="fld">${esc(t('org'))}<input type="text" id="al-o" data-set="proyecto.organizacion" value="${esc(p.organizacion)}"></label>
    <label class="fld span2">${esc(t('scopeDesc'))}<input type="text" id="al-d" data-set="proyecto.descripcion" value="${esc(p.descripcion)}"></label>
    <label class="fld">${esc(t('sector'))}<select id="al-s" data-set="proyecto.sector">${opt('', t('choose'), p.sector)}${S.map((x) => opt(x, x, p.sector)).join('')}${p.sector && !S.includes(p.sector) ? opt(p.sector, p.sector, p.sector) : ''}</select></label></div></section>
  <section class="glass pane stack"><h3>${esc(t('fwInScope'))}</h3>${scopeCards(a, 'set')}</section>
  ${a.ens.on ? `<section class="glass pane stack"><h3>${fwTag('ens')} ${esc(t('ensCat'))}</h3>${ensLevels(a.ens, 'set')}<p class="hint">${esc(t('ensCount', calc.fw.ens.aplicables + calc.fw.ens.excluidos, calc.fw.ens.noExigidos))}</p>
    <div class="row"><button type="button" class="btn sm" data-act="import-ens-into">${icon('upload', 15)}${esc(t('updateFromEns'))}</button><span class="hint">${esc(t('updateFromEnsTxt'))}</span></div></section>` : ''}
  <section class="glass pane stack"><h3>${fwTag('nis2')} ${esc(t('nis2Title'))}</h3>${nis2Form(state.nis2q, 'set')}${nis2Box(state.nis2q)}</section>
  ${a.iso42001.on ? `<section class="glass pane stack"><h3>${fwTag('iso42001')} ${esc(t('aiTitle'))}</h3><p class="small">${esc(t('aiTxt', pct(calc.fw.iso42001.grado)))}</p></section>` : ''}`;
}

/* ================= Exportar ================= */
function vExport() {
  return `${head(`${icon('download', 14)}${esc(t('expEyebrow'))}`, esc(t('expTitle')), esc(t('expLead')))}
  <div class="grid g3">${t('exp').map(([ic, title, desc, act, label], i) => `<section class="glass pane ex${i === 0 ? ' primary-ex' : ''}"><span class="case-ic">${icon(ic, 22)}</span><h3>${esc(title)}</h3><p class="small muted">${esc(desc)}</p><button type="button" class="btn${i === 0 ? ' primary' : ''}" data-act="${act}">${icon('download', 16)}${esc(label)}</button></section>`).join('')}</div>`;
}

