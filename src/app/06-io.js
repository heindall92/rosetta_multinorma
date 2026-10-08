/* ---------- Entrada y salida: descargas, Excel, informes, importación, copias ---------- */
const tx = (es, en) => (LANG() === 'en' ? en : es);
async function saveFile(filename, data) {
  try {
    const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename, data }); toast(t('tSavedFile', filename)); return; }
  } catch (e) {
    if (e && e.code === 'declined') { toast(t('tDeclined')); return; }
    if (e && e.code === 'rate_limited') { toast(t('tPending')); return; }
    if (e && e.code && !['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e.code)) { toast(t('tCantSave', e.message || e.code), 'error'); return; }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast(t('tDownloaded', filename));
}
const slug = () => (state?.proyecto?.organizacion || state?.proyecto?.nombre || 'rosetta').replace(/\s*\((fictici[oa]|fictitious)\)/i, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'rosetta';
const FNAME = { map: ['mapa_multinorma', 'multi_framework_map'], report: ['informe_multinorma', 'multi_framework_report'], plan: ['plan_accion', 'action_plan'], ctl: ['controles', 'controls'], proj: ['proyecto_rosetta', 'rosetta_project'], backup: ['rosetta_copia', 'rosetta_backup'] };
const fname = (k, ext, withSlug = true) => `${withSlug ? slug() + '_' : ''}${FNAME[k][LANG() === 'en' ? 1 : 0]}_${today()}.${ext}`;
const csvCell = (v) => { const x = noFormula(v); return /[",;\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
const toCsv = (rows) => '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
const mapsTxt = (c, f) => c.maps[f].filter((m) => m.w > 0).map((m) => reqCode(f, m.id) + (m.w < 1 ? ` (${t('fuerzaCorta.parcial')})` : '')).join(', ');
const estL = (e) => t('est.' + e);
const ucList = (f, id) => IX.reqUcs[f][id].map((l) => `${l.uc}${l.w < 1 ? '~' : ''} ${estL(E.estadoUc(state, l.uc)).toLowerCase()}`).join(', ');
const yes = () => tx('SÍ', 'YES'), no = () => tx('NO', 'NO');

/* --- Informe Markdown (en el idioma activo) --- */
function informeMd() {
  const k = calc.kpi; const p = state.proyecto; const L = [];
  const fl = (f) => fwLong(f);
  L.push(`# ${tx('Informe multinorma', 'Multi-framework report')} — ${mdSafe(p.nombre || p.organizacion)}`, '');
  L.push(`**${t('org')}:** ${mdSafe(p.organizacion)}  `, `**${t('scopeDesc')}:** ${mdSafe(p.descripcion || '—')}  `, `**${t('fws')}:** ${calc.alcance.map(fl).join(' · ') || '—'}  `, `**${tx('Fecha', 'Date')}:** ${today()} · **${tx('Elaborado por', 'Prepared by')}:** ${mdSafe(firma())}`, '');
  L.push(...aplicabilidadMd(), '');
  L.push(`## ${tx('Resumen ejecutivo', 'Executive summary')}`, '');
  L.push(tx(`- Cobertura media: **${pct(k.grado, 1)}** de ${k.requisitos} requisitos aplicables en ${plural(k.normas, 'norma', 'normas')}.`, `- Average coverage: **${pct(k.grado, 1)}** of ${k.requisitos} applicable requirements across ${plural(k.normas, 'framework', 'frameworks')}.`));
  L.push(tx(`- Controles unificados relevantes: **${k.controles}** (${k.implantados} implantados, ${k.parciales} parciales, ${k.pendientes} pendientes). Cada control cubre de media **${num1(k.reutilizacion)}** requisitos: ${pct(k.ahorro)} menos trabajo que abordar cada norma por separado.`,
    `- Relevant unified controls: **${k.controles}** (${k.implantados} implemented, ${k.parciales} partial, ${k.pendientes} pending). Each control covers **${num1(k.reutilizacion)}** requirements on average: ${pct(k.ahorro)} less work than tackling each framework separately.`));
  if (state.alcance.nis2.on) { const r = E.nis2Aplicabilidad(state.nis2q, LANG()); L.push(`- NIS2: **${mdSafe(t('ent.' + state.alcance.nis2.tipo))}**. ${mdSafe(r.motivo)}`); }
  const sv = (x) => hall.filter((h) => h.sev === x).length;
  L.push(tx(`- Revisión de coherencia: **${sv('Alta')} alertas altas**, ${sv('Media')} medias y ${sv('Baja')} bajas.`, `- Consistency review: **${sv('Alta')} high alerts**, ${sv('Media')} medium and ${sv('Baja')} low.`), '');
  L.push(`## ${tx('Cobertura por norma', 'Coverage by framework')}`, '', `| ${tx('Norma', 'Framework')} | ${tx('Aplicables', 'Applicable')} | ${t('cov.cubierto')} | ${t('cov.parcial')} | ${tx('Brechas', 'Gaps')} | ${tx('Excluidos', 'Excluded')} | ${tx('Cobertura', 'Coverage')} |`, '|---|---:|---:|---:|---:|---:|---:|');
  for (const f of calc.alcance) { const w = calc.fw[f]; L.push(`| ${fl(f)} | ${w.aplicables} | ${w.cubiertos} | ${w.parciales} | ${w.brechas} | ${w.excluidos} | ${pct(w.grado, 1)} |`); }
  L.push('');
  if (calc.alcance.length > 1) {
    L.push(`## ${tx('Solapamiento entre las normas del alcance', 'Overlap between the frameworks in scope')}`, '', tx('Si se implantan todos los controles que exige la norma de la fila, parte de la norma de la columna que queda cubierta:', 'If every control the row framework requires is implemented, share of the column framework that is covered:'), '', `| ${t('overlapRow')} | ${calc.alcance.map((f) => fwLbl(f)).join(' | ')} |`, `|---|${calc.alcance.map(() => '---:').join('|')}|`);
    for (const a of calc.alcance) L.push(`| ${fwLbl(a)} | ${calc.alcance.map((b) => (a === b ? '—' : pct(SOLAPE[a][b].pct))).join(' | ')} |`);
    L.push('');
  }
  if (hall.length) {
    L.push(`## ${tx('Incoherencias y alertas', 'Inconsistencies and alerts')}`, '', `| ${t('rule')} | ${t('severity')} | ${tx('Ámbito', 'Scope')} | ${tx('Hallazgo', 'Finding')} | ${tx('Acción recomendada', 'Recommended action')} |`, '|---|---|---|---|---|');
    for (const h of hall) L.push(`| ${h.id} | ${t('sev.' + h.sev)} | ${mdSafe(h.ambito)} | **${mdSafe(h.titulo)}.** ${mdSafe(h.detalle)} | ${mdSafe(h.accion)} |`);
    L.push('');
  }
  L.push(`## ${tx('Qué hacer primero', 'What to do first')}`, '', `| # | ${t('control')} | ${tx('Estado', 'State')} | ${t('fws')} | ${tx('Requisitos que cubre', 'Requirements covered')} |`, '|---:|---|---|---|---:|');
  prio.slice(0, 15).forEach((x, i) => L.push(`| ${i + 1} | ${x.id} · ${mdSafe(cT(x.id))} | ${estL(x.estado)} | ${x.normas.map((f) => fwLbl(f)).join(', ')} | ${num1(x.ganancia)} |`));
  L.push('');
  for (const f of calc.alcance) {
    const br = calc.req[f].filter((r) => r.estado === 'brecha'); if (!br.length) continue;
    L.push(`## ${tx('Brechas en', 'Gaps in')} ${fl(f)} (${br.length})`, '', `| ${tx('Requisito', 'Requirement')} | ${tx('Título', 'Title')} | ${tx('Controles necesarios', 'Controls needed')} |`, '|---|---|---|');
    for (const r of br) L.push(`| ${mdSafe(reqCode(f, r.id))} | ${mdSafe(rT(f, r.id))} | ${IX.reqUcs[f][r.id].map((l) => l.uc).join(', ')} |`);
    L.push('');
  }
  L.push('---', tx('_Informe generado con Rosetta · Mapa multinorma. Las correspondencias entre normas son criterio del autor, contrastado con el material de clase y la guía técnica de ENISA (las de Part-IS y las de los marcos propios, también criterio propio o del usuario); revísalas para cada organización. No sustituye a la auditoría de certificación._',
    '_Report generated with Rosetta · Multi-framework map. Mappings between frameworks are the author’s judgement, checked against the class material and ENISA technical guidance (those of Part-IS and of custom frameworks are also the author’s or the user’s judgement); review them for each organisation. It does not replace a certification audit._'));
  return L.join('\n');
}
/* «Marcos aplicables y por qué»: el primer folio que pide un auditor */
function aplicabilidadFilas() {
  const prop = propuesta();
  return FW.map((f) => { const x = prop.marcos[f] || { estado: 'voluntaria', base: '', motivo: '' }; const a = state.alcance[f];
    return { f, nombre: fwLbl(f), estado: t('prEstado.' + x.estado), base: x.base, motivo: x.motivo, on: !!a.on, decision: a.motivo || '' }; });
}
function aplicabilidadMd() {
  const L = [`## ${t('fwsApplicable')}`, '', `| ${tx('Marco', 'Framework')} | ${t('proposal')} | ${t('basis')} | ${t('decision')} | ${t('reason')} |`, '|---|---|---|---|---|'];
  for (const r of aplicabilidadFilas()) L.push(`| ${mdSafe(r.nombre)} | ${mdSafe(r.estado)} | ${mdSafe(r.base)} | ${r.on ? tx('En el alcance', 'In scope') : tx('Fuera', 'Out')} | ${mdSafe(r.decision || r.motivo)} |`);
  const prop = propuesta();
  if (prop.futuras.length) L.push('', `${t('prFuturas')}: ${prop.futuras.map((x) => `${x.nombre} (${x.base})`).join(' · ')}.`);
  L.push('', `_${t('prDisclaimer')}${state.perfil.confirmado ? ' ' + t('prApplied', fmtDate(state.perfil.confirmado)) + '.' : ''}_`);
  return L;
}
const planCsv = () => toCsv([[tx('Prioridad', 'Priority'), tx('Puesto', 'Rank'), t('control'), tx('Acción', 'Action'), tx('Estado del control', 'Control state'), t('fws'), tx('Requisitos que cubre', 'Requirements covered'), t('owner'), t('due'), tx('Estado de la acción', 'Action state'), t('notes')],
  ...plan.map((a) => [t('prio.' + a.prioridad), a.rank || '', a.id, cT(a.id), estL(a.estadoControl), a.normas.map((f) => fwLbl(f)).join(' | '), num1(a.ganancia), a.responsable, a.fecha, a.verificada ? t('verified') : t('lanes.' + a.estado), a.nota])]);
const ctlCsv = () => toCsv([['ID', tx('Dominio', 'Domain'), t('control'), tx('Estado', 'State'), t('owner'), t('lastRev'), t('evidence'), ...FW.map((f) => fwLbl(f)), tx('Relevante', 'Relevant')],
  ...CAT.controls.map((c) => { const d = state.controles[c.id]; return [c.id, dT(c.dom), cT(c.id), estL(d.estado), d.responsable, d.revision, d.evidencias, ...FW.map((f) => mapsTxt(c, f)), calc.controles[c.id].relevante ? yes() : no()]; })]);

/* --- Excel --- */
const XLSX_CACHE = {};
function loadScript(src, sri) {
  return new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = src; sc.async = true; sc.referrerPolicy = 'no-referrer';
    // SRI: el navegador rechaza el fichero si cambia un solo byte. Desde el disco (file://) Chromium no puede verificarlo
    // (no hay CORS) y tampoco aporta nada: quien puede cambiar vendor/ puede cambiar también este HTML.
    if (!(location.protocol === 'file:' && !/^https?:/.test(src))) { sc.integrity = sri; sc.crossOrigin = 'anonymous'; }
    sc.onload = () => { sc.remove(); res(); }; sc.onerror = () => { sc.remove(); rej(new Error(t('tXlsxLib'))); };
    document.head.appendChild(sc);
  });
}
/* Las dos librerías publican window.XLSX: cada una se guarda aparte y el global se retira tras cargarla. */
function loadXLSX(uso = 'escribir') {
  if (XLSX_CACHE[uso]) return XLSX_CACHE[uso];
  const lib = XLSX_LIBS[uso];
  const take = () => { const X = window.XLSX; try { delete window.XLSX; } catch (e) { window.XLSX = undefined; } if (!X) throw new Error(t('tXlsxLib')); return X; };
  XLSX_CACHE[uso] = loadScript(lib.file, lib.sri).catch(() => loadScript(lib.cdn, lib.sri)).then(take)
    .catch((e) => { delete XLSX_CACHE[uso]; throw e; });
  return XLSX_CACHE[uso];
}
async function exportXlsx() {
  try {
    const X = await loadXLSX();
    const wb = X.utils.book_new(); // las celdas se escriben como texto o número, nunca como fórmula
    const acc = 'B8336A';
    const S = { head: { font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 10 }, fill: { fgColor: { rgb: acc } }, alignment: { wrapText: true, vertical: 'center' } },
      cell: { font: { name: 'Calibri', sz: 10 }, alignment: { wrapText: true, vertical: 'top' } },
      title: { font: { bold: true, sz: 14, name: 'Calibri', color: { rgb: '0F1B22' } } }, sub: { font: { italic: true, sz: 10, name: 'Calibri', color: { rgb: '5B6B74' } } } };
    const COV = { cubierto: 'E3F2E8', parcial: 'FBEFD9', brecha: 'FBE3E0', excluido: 'EEF2F3', 'no-exigido': 'F6F8F8', implantado: 'E3F2E8', pendiente: 'FBE3E0', 'no-aplica': 'EEF2F3', Alta: 'FBE3E0', Media: 'FBEFD9', Baja: 'E3F3F2' };
    const FILLKEY = {}; // etiqueta visible (en el idioma activo) → color de fondo
    for (const k2 of ['cubierto', 'parcial', 'brecha', 'excluido', 'no-exigido']) FILLKEY[t('cov.' + k2)] = COV[k2];
    for (const k2 of E.ESTADOS) FILLKEY[t('est.' + k2)] = COV[k2];
    for (const k2 of ['Alta', 'Media', 'Baja']) FILLKEY[t('sev.' + k2)] = COV[k2];
    const sheet = (aoa, widths, headerRow = 0, opts = {}) => {
      const w = X.utils.aoa_to_sheet(aoa); const rng = X.utils.decode_range(w['!ref']);
      for (let R = rng.s.r; R <= rng.e.r; R++) for (let Cc = rng.s.c; Cc <= rng.e.c; Cc++) {
        const ref = X.utils.encode_cell({ r: R, c: Cc }); const cell = w[ref]; if (!cell) continue;
        cell.s = R === headerRow ? S.head : (R < headerRow ? (R === 0 ? S.title : S.sub) : S.cell);
        if (R > headerRow && opts.fillCol && opts.fillCol.includes(Cc) && has(FILLKEY, cell.v)) cell.s = { ...cell.s, fill: { fgColor: { rgb: FILLKEY[cell.v] } } };
        if (R > headerRow && opts.pctCol && opts.pctCol.includes(Cc) && typeof cell.v === 'number') cell.z = '0%';
      }
      w['!cols'] = widths.map((x) => ({ wch: x }));
      if (opts.autofilter !== false) w['!autofilter'] = { ref: X.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: rng.e.r, c: rng.e.c } }) };
      if (opts.freeze) w['!freeze'] = opts.freeze;
      return w;
    };
    const k = calc.kpi; const p = state.proyecto; const nPctRows = [];
    const res = [[tx('MAPA MULTINORMA', 'MULTI-FRAMEWORK MAP') + ' · ' + FW.map((f) => fwLbl(f)).join(' · ')], [`${p.organizacion} · ${p.descripcion || ''} · ${today()} · ${firma()}`],
      [tx('Norma', 'Framework'), tx('En alcance', 'In scope'), tx('Requisitos', 'Requirements'), tx('Aplicables', 'Applicable'), t('cov.cubierto'), t('cov.parcial'), t('cov.brecha'), t('cov.excluido'), t('cov.no-exigido'), tx('Cobertura', 'Coverage')],
      ...FW.map((f) => { const w = calc.fw[f]; return [fwLong(f), w.on ? yes() : no(), w.total, w.aplicables, w.cubiertos, w.parciales, w.brechas, w.excluidos, w.noExigidos, w.grado]; }),
      [], [tx('Indicador', 'Indicator'), tx('Valor', 'Value')]];
    const kv = (lab, v, isPct) => { if (isPct) nPctRows.push(res.length); res.push([lab, v]); };
    kv(tx('Cobertura media del alcance', 'Average coverage in scope'), k.grado, true); kv(tx('Requisitos aplicables', 'Applicable requirements'), k.requisitos); kv(tx('Controles relevantes', 'Relevant controls'), k.controles);
    kv(t('est.implantado'), k.implantados); kv(t('est.parcial'), k.parciales); kv(t('est.pendiente'), k.pendientes); kv(t('kReuseS'), Math.round(k.reutilizacion * 100) / 100);
    kv(tx('Ahorro por reutilización de controles', 'Saving from control reuse'), k.ahorro, true); kv(t('highAlerts'), hall.filter((h) => h.sev === 'Alta').length);
    if (state.alcance.nis2.on) kv('NIS2', t('ent.' + state.alcance.nis2.tipo));
    if (state.alcance.ens.on) kv(tx('Categoría ENS', 'ENS category'), t('cats.' + state.alcance.ens.categoria));
    res.push([]); const ovStart = res.length + 1;
    res.push([tx('Solapamiento (si cumples la fila → cobertura de la columna)', 'Overlap (if you comply with the row → coverage of the column)'), ...FW.map((f) => fwLbl(f))], ...FW.map((a) => [fwLbl(a), ...FW.map((b) => (a === b ? '—' : SOLAPE[a][b].pct))]));
    const wsR = sheet(res, [48, 12, 12, 12, 12, 12, 12, 12, 12, 12], 2, { autofilter: false, pctCol: [9] });
    for (const R of nPctRows) { const ref = X.utils.encode_cell({ r: R, c: 1 }); if (wsR[ref]) wsR[ref].z = '0%'; }
    for (let R = ovStart; R < res.length; R++) for (let Cc = 1; Cc <= FW.length; Cc++) { const ref = X.utils.encode_cell({ r: R, c: Cc }); if (wsR[ref] && typeof wsR[ref].v === 'number') wsR[ref].z = '0%'; }
    X.utils.book_append_sheet(wb, wsR, tx('Resumen', 'Summary'));
    X.utils.book_append_sheet(wb, sheet([[tx('Marco', 'Framework'), t('proposal'), t('basis'), tx('Motivo de la propuesta', 'Reason for the proposal'), tx('En alcance', 'In scope'), t('prDecision')],
      ...aplicabilidadFilas().map((r) => [r.nombre, r.estado, r.base, r.motivo, r.on ? yes() : no(), r.decision])], [26, 22, 44, 70, 11, 44], 0, { autofilter: false }), tx('Aplicabilidad', 'Applicability'));
    const rank = Object.fromEntries(prio.map((x, i) => [x.id, i + 1]));
    X.utils.book_append_sheet(wb, sheet([['ID', tx('Dominio', 'Domain'), t('control'), t('objective'), tx('Estado', 'State'), t('owner'), t('evidence'), t('lastRev'), ...FW.map((f) => fwLbl(f)), tx('Normas del alcance', 'Frameworks in scope'), tx('Prioridad', 'Priority')],
      ...CAT.controls.map((c) => { const d = state.controles[c.id]; const cc = calc.controles[c.id]; return [c.id, dT(c.dom), cT(c.id), tt(c, 'obj'), estL(d.estado), d.responsable, d.evidencias, d.revision, ...FW.map((f) => mapsTxt(c, f)), cc.normas.map((f) => fwLbl(f)).join(', '), rank[c.id] || '']; })],
      [9, 22, 36, 50, 12, 24, 50, 12, ...FW.map(() => 22), 26, 9], 0, { fillCol: [4], freeze: { xSplit: 3, ySplit: 1 } }), tx('Controles unificados', 'Unified controls'));
    const sheetName = { ens: 'SoA ENS', iso27001: 'SoA ISO 27001', nis2: 'NIS2', iso42001: 'SoA ISO 42001', partis: 'SoA Part-IS', ria: tx('RIA', 'AI Act'), cra: 'CRA' };
    const usados = new Set(['Resumen', 'Summary', 'Aplicabilidad', 'Applicability']);
    for (const f of FW) if (!sheetName[f]) { // marcos propios: nombre válido para Excel (sin : \ / ? * [ ], 31 caracteres) y único
      let n = fwLbl(f).replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 22) || 'Marco'; let k = 2; const b = n;
      while (usados.has(n)) n = `${b} ${k++}`; usados.add(n); sheetName[f] = n;
    }
    for (const f of FW) {
      const rows = calc.req[f].map((r) => {
        const aplica = r.estado === 'no-exigido' ? tx('NO EXIGIDO', 'NOT REQUIRED') : r.estado === 'excluido' ? no() : yes();
        const just = r.estado === 'excluido' ? r.justificacion || `(${t('unjustified')})` : r.estado === 'no-exigido' ? noExigidoTxt(f, r) : tx(`Aplica. Soportado por ${IX.reqUcs[f][r.id].map((l) => l.uc).join(', ')}.`, `Applies. Supported by ${IX.reqUcs[f][r.id].map((l) => l.uc).join(', ')}.`);
        const evid = IX.reqUcs[f][r.id].map((l) => state.controles[l.uc].evidencias ? `[${l.uc}] ${state.controles[l.uc].evidencias}` : '').filter(Boolean).join(' · ').slice(0, 3000);
        return [reqCode(f, r.id), rT(f, r.id), rG(f, r.id), ...(f === 'ens' ? [r.nivel ? t('lv.' + r.nivel) : '', r.exigencia || ''] : []), aplica, just, t('cov.' + r.estado), r.estado === 'no-exigido' || r.estado === 'excluido' ? '' : r.score, ucList(f, r.id), evid];
      });
      const hd = [tx('Código', 'Code'), tx('Requisito', 'Requirement'), tx('Grupo', 'Group'), ...(f === 'ens' ? [tx('Nivel exigido', 'Required level'), t('exig')] : []), tx('¿Aplica?', 'Applies?'), t('justification'), tx('Cobertura', 'Coverage'), tx('% soporte', '% support'), tx('Controles (estado)', 'Controls (state)'), t('evidence')];
      const off = f === 'ens' ? 2 : 0;
      X.utils.book_append_sheet(wb, sheet([hd, ...rows], [10, 44, 26, ...(f === 'ens' ? [10, 18] : []), 12, 50, 12, 10, 50, 60], 0, { fillCol: [5 + off], pctCol: [6 + off], freeze: { xSplit: 2, ySplit: 1 } }), sheetName[f] + (calc.fw[f].on ? '' : tx(' (fuera)', ' (out)')));
    }
    X.utils.book_append_sheet(wb, sheet([[t('control'), t('description'), ...FW.map((f) => (f === 'nis2' ? tx('NIS2 (art. y RE 2024/2690)', 'NIS2 (art. and IR 2024/2690)') : fwLbl(f))), tx('Relaciones informativas', 'Informative relations')],
      ...CAT.controls.map((c) => [c.id, cT(c.id), ...FW.map((f) => mapsTxt(c, f)), FW.map((f) => c.maps[f].filter((m) => m.w === 0).map((m) => `${fwLbl(f)} ${reqCode(f, m.id)}`).join(', ')).filter(Boolean).join(' · ')])],
      [9, 40, ...FW.map(() => 28), 36], 0, { freeze: { xSplit: 2, ySplit: 1 } }), tx('Matriz de correspondencias', 'Crosswalk'));
    X.utils.book_append_sheet(wb, sheet([[t('rule'), t('severity'), tx('Ámbito', 'Scope'), tx('Hallazgo', 'Finding'), tx('Detalle', 'Detail'), tx('Acción recomendada', 'Recommended action'), tx('Referencia', 'Reference')], ...hall.map((h) => [h.id, t('sev.' + h.sev), h.ambito, h.titulo, h.detalle, h.accion, h.ref])], [9, 10, 18, 44, 70, 60, 26], 0, { fillCol: [1] }), tx('Coherencia', 'Consistency'));
    X.utils.book_append_sheet(wb, sheet([[tx('Puesto', 'Rank'), tx('Prioridad', 'Priority'), t('control'), tx('Acción', 'Action'), tx('Estado del control', 'Control state'), t('fws'), tx('Requisitos que cubre', 'Requirements covered'), t('owner'), t('due'), tx('Estado', 'State')],
      ...plan.map((a) => [a.rank || '', t('prio.' + a.prioridad), a.id, cT(a.id), estL(a.estadoControl), a.normas.map((f) => fwLbl(f)).join(', '), Math.round(a.ganancia * 10) / 10, a.responsable, a.fecha, a.verificada ? t('verified') : t('lanes.' + a.estado)])], [8, 10, 9, 44, 14, 30, 14, 24, 12, 12], 0, { fillCol: [1, 4] }), tx('Plan de acción', 'Action plan'));
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    await saveFile(fname('map', 'xlsx'), new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } catch (e) { toast(e.message || t('tXlsxFail'), 'error'); }
}

/* --- Importar la SoA del ENS (Excel de la plantilla o proyecto de ENS Compliance Studio) --- */
const normH = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%?]+/g, ' ').trim();
function nivelesDe(categorizacion) {
  const niveles = {};
  for (const d of E.DIMS) {
    const vals = arr(categorizacion, 200).map((a) => (isObj(a) ? String(a[d] || '').trim().toUpperCase() : '')).filter((v) => E.NIVELES_ENS.includes(v));
    if (vals.length) niveles[d] = vals.reduce((x, y) => (E.NIVELES_ENS.indexOf(y) > E.NIVELES_ENS.indexOf(x) ? y : x));
  }
  return niveles;
}
function limpiaSoa(raw) {
  const out = {};
  for (const [code, d] of safeEntries(raw, 200)) {
    if (!IX.req.ens[code] || !isObj(d)) continue;
    let pv = d.pct; if (typeof pv === 'string' && pv.trim()) { const x = parseFloat(pv.replace('%', '').replace(',', '.')); pv = isNaN(x) ? null : (x > 1 ? x / 100 : x); } else if (pv === '' || pv === undefined) pv = null;
    out[code] = { aplica: s(d.aplica, 20), estado: s(d.estado, 40), pct: pv === null ? null : num(pv, 0, 1, null), evidencias: s(d.evidencias, 1500), responsable: s(d.responsable, 200), justificacion: s(d.justificacion, 1000) };
  }
  return out;
}
async function leerSoaEns(file) {
  if (/\.json$/i.test(file.name) || file.type === 'application/json') {
    if (!checkSize(file, LIM.fileJson, t('fileIs'))) return null;
    let o = safeParse(await file.text());
    if (isObj(o) && o.kind === 'ens-studio-backup') { const items = arr(o.projects, 300).filter((x) => isObj(x) && isObj(x.state) && isObj(x.state.soa)); const own = items.find((x) => isObj(x.meta) && x.meta.kind === 'own'); o = (own || items[0] || {}).state; }
    if (!isObj(o) || !isObj(o.soa)) throw new Error(t('tNoJsonSoa'));
    const pr = isObj(o.proyecto) ? o.proyecto : {};
    return { soa: limpiaSoa(o.soa), niveles: nivelesDe(o.categorizacion), organizacion: s(pr.organizacion, 200), descripcion: s(pr.sistema, 300) };
  }
  if (!checkSize(file, LIM.fileXlsx, t('excelIs'))) return null;
  const X = await loadXLSX('leer');
  const wb = X.read(await file.arrayBuffer(), { type: 'array', cellFormula: false, cellHTML: false, sheetStubs: false });
  if (wb.SheetNames.length > 40) throw new Error(t('tTooManySheets'));
  const rowsOf = (name) => X.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true }).slice(0, 5000).map((r) => (r || []).slice(0, 60).map((c) => (c === null || typeof c === 'number' ? c : s(c))));
  let soaRows = null, h = -1;
  for (const n of wb.SheetNames) { const r = rowsOf(n); const i = r.findIndex((row, ix) => ix < 10 && (row || []).some((c) => normH(c) === 'codigo') && (row || []).some((c) => /aplica/.test(normH(c)))); if (i >= 0) { soaRows = r; h = i; break; } }
  if (!soaRows) throw new Error(t('tNoSoa'));
  const hdr = soaRows[h].map(normH);
  const col = (...keys) => hdr.findIndex((x) => keys.some((k2) => x === normH(k2) || x.startsWith(normH(k2))));
  const C = { codigo: col('Código'), aplica: col('¿Aplica?', 'Aplica'), just: col('Justificación'), estado: col('Estado de implantación', 'Estado'), pct: col('% implantación'), ev: col('Evidencias'), resp: col('Responsable') };
  const raw = {};
  for (const r of soaRows.slice(h + 1)) {
    const code = String(r[C.codigo] ?? '').trim(); if (!IX.req.ens[code]) continue;
    const g = (i) => (i >= 0 ? (r[i] ?? '') : '');
    raw[code] = { aplica: g(C.aplica), estado: g(C.estado), pct: g(C.pct), evidencias: g(C.ev), responsable: g(C.resp), justificacion: g(C.just) };
  }
  let categorizacion = [];
  for (const name of wb.SheetNames) {
    const r = rowsOf(name); const i = r.findIndex((row, ix) => ix < 10 && ['id', 'd', 'i', 'c', 'a', 't'].every((m) => (row || []).map(normH).includes(m))); if (i < 0) continue;
    const hh = r[i].map(normH); categorizacion = r.slice(i + 1).filter((row) => row && /^[A-Za-z]+-\d+/.test(String(row[hh.indexOf('id')] || ''))).map((row) => Object.fromEntries(E.DIMS.map((d) => [d, row[hh.indexOf(d.toLowerCase())]])));
    break;
  }
  let organizacion = file.name.replace(/\.xlsx$/i, ''); let descripcion = '';
  const pName = wb.SheetNames.find((x) => normH(x) === 'portada');
  if (pName) for (const row of rowsOf(pName)) { const v = (row || []).filter((c) => c !== null && c !== ''); if (v.length === 2 && normH(v[0]) === 'organizacion') organizacion = s(v[1], 200).replace(/\s+–.*$/, ''); if (v.length === 2 && normH(v[0]) === 'sistema de informacion') descripcion = s(v[1], 300); }
  return { soa: limpiaSoa(raw), niveles: nivelesDe(categorizacion), organizacion, descripcion };
}
function aplicaImportEns(st, data) {
  const r = E.desdeSoaEns(IX, data.soa);
  for (const [id, c] of Object.entries(r.controles)) st.controles[id] = { ...st.controles[id], ...c };
  st.exclusiones.ens = r.exclusiones;
  st.ensSoa = Object.fromEntries(Object.entries(data.soa).map(([k2, d]) => [k2, { aplica: d.aplica, estado: d.estado, pct: d.pct, justificacion: d.justificacion, evidencias: d.evidencias, responsable: d.responsable }]));
  if (Object.keys(data.niveles || {}).length) { st.alcance.ens.niveles = data.niveles; st.alcance.ens.categoria = E.categoriaDeNiveles(data.niveles) || st.alcance.ens.categoria; }
  st.alcance.ens.on = true;
  return r.heredados;
}
async function importEns(file, destino) {
  try {
    const data = await leerSoaEns(file); if (!data) return;
    const n = Object.keys(data.soa).length; if (!n) throw new Error(t('tNoMeasures'));
    if (destino === 'wizard') {
      const w = ui.wizard; w.ensSoa = data; if (!w.organizacion) w.organizacion = data.organizacion; if (!w.descripcion) w.descripcion = data.descripcion;
      if (Object.keys(data.niveles).length) { w.alcance.ens.niveles = data.niveles; w.alcance.ens.categoria = E.categoriaDeNiveles(data.niveles) || w.alcance.ens.categoria; }
      w.alcance.ens.on = true; w.ensInfo = t('measuresRead', n, Object.keys(data.niveles).length ? t('cats.' + w.alcance.ens.categoria) : ''); render(); return;
    }
    if (destino === 'actual' && state) { const h = aplicaImportEns(state, data); commit(t('tEnsApplied', h)); return; }
    const st = blankState({ organizacion: data.organizacion, descripcion: data.descripcion, nombre: `${data.organizacion} · multinorma`, alcance: alcanceDefecto() });
    const h = aplicaImportEns(st, data);
    createProject(st, { msg: t('tImported', n, h) });
    setTimeout(() => toast(t('tIsoFromEns', pct(calc.fw.iso27001.grado))), 3000);
  } catch (e) { toast(e.message || t('tReadFail'), 'error'); }
}

/* --- Proyectos y copias --- */
function importProyecto(text) {
  try {
    const o = safeParse(text);
    if (isObj(o) && o.kind === 'rosetta-backup') { restoreBackup(o); return; }
    if (isObj(o) && isObj(o.controles) && isObj(o.alcance)) { createProject(o, { msg: t('tSaved') }); return; }
    throw new Error('formato');
  } catch (e) { toast(t('tNotProject'), 'error'); }
}
function backup() {
  const projects = ws.projects.map((p) => ({ meta: p, state: store.get(PKEY(p.id)) }));
  saveFile(fname('backup', 'json', false), JSON.stringify({ kind: 'rosetta-backup', version: VERSION, fecha: new Date().toISOString(), profile: ws.profile, settings: ws.settings, projects }, null, 1));
}
function restoreBackup(b) {
  const nw = sanitizeWs({ profile: b.profile, settings: b.settings, projects: arr(b.projects, 300).map((x) => x && x.meta), onboarded: true, profileDone: true });
  ws.profile = nw.profile; ws.settings = nw.settings;
  let n = 0;
  for (const item of arr(b.projects, 300)) { if (!isObj(item) || !isObj(item.state)) continue; const meta = nw.projects.find((m) => m.id === item.meta?.id); if (!meta) continue; store.set(PKEY(meta.id), sanitizeState(item.state)); ws.projects = ws.projects.filter((p) => p.id !== meta.id); ws.projects.push(meta); n++; }
  ws.onboarded = true; ws.profileDone = true; saveWs(); applyTheme(); toast(t('tRestored', n)); go('inicio');
}


/* --- Perfil regulatorio y marcos propios --- */
/** Lleva la propuesta del perfil al alcance: activa las obligatorias y quita las que no aplican; lo demás no cambia. */
function perfilAplicar(st, fws) {
  const p = E.perfilRegulatorio(st.perfil, st.nis2q, LANG(), (st.marcos || []).map((m) => m.id));
  for (const f of fws) { const x = p.marcos[f]; if (!x || !st.alcance[f]) continue; if (x.estado === 'obligatoria') st.alcance[f].on = true; else if (x.estado === 'no-aplica') st.alcance[f].on = false; }
  if (st.perfil.aviacion !== 'no') st.alcance.partis.regimen = st.perfil.aviacion;
}
const mpOf = (fid) => (state && state.marcos ? state.marcos.find((m) => m.id === fid) : null);
const mpReq = (fid, rid) => { const m = mpOf(fid); return m ? m.requisitos.find((r) => r.id === rid) || null : null; };
function mpAdd(fid, rid, ctl) {
  const r = mpReq(fid, rid); if (!r || !UC_IDS.has(ctl) || r.controles.some((c) => c.control === ctl) || r.controles.length >= MAX_CTL_REQ) return;
  r.controles.push({ control: ctl, w: 0.5 }); commit(t('tMpAdd', ctl, rid));
}
function mpImport(file) {
  if (!checkSize(file, 2 * 1024 * 1024, t('mpTitle'))) return;
  if ((state.marcos || []).length >= MAX_MARCOS) { toast(t('tMpMax', MAX_MARCOS), 'error'); return; }
  readText(file, (text) => {
    let res;
    if (/\.csv$/i.test(file.name) || !/^\s*[{[]/.test(text)) res = marcoDesdeCsv(text, nombreSeguro(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), 80));
    else { try { res = normalizaMarco(safeParse(text), { fichero: true }); } catch (e) { res = { error: 'mpErrFormat' }; } }
    if (res.error) { toast(t(res.error), 'error'); return; }
    const m = res.marco; let id = m.id; let k = 2;
    while (FW_BASE.includes(id) || state.marcos.some((x) => x.id === id)) id = `${m.id.slice(0, 30)}-${k++}`;
    m.id = id; state.marcos.push(m);
    state.alcance[id] = { on: true }; state.exclusiones[id] = {};
    ui.mpOpen = m.requisitos.some((r) => !r.controles.length) ? id : null; ui.mpAll = false;
    commit(t('tMpImported', m.nombre, m.requisitos.length) + (res.omitidos ? t('tMpOmit', res.omitidos) : ''));
  });
}
function mpExport(fid) {
  const m = mpOf(fid); if (!m) return;
  saveFile(`${m.id.replace(/^mp-/, '')}_${tx('marco_rosetta', 'rosetta_framework')}_${today()}.json`, JSON.stringify(marcoAFichero(m), null, 2));
}
function mpDel(fid) {
  const m = mpOf(fid); if (!m) return;
  state.marcos = state.marcos.filter((x) => x.id !== fid); delete state.alcance[fid]; delete state.exclusiones[fid];
  ui.confirm = null; if (ui.mpOpen === fid) ui.mpOpen = null;
  if (ui.normaFw === fid) ui.normaFw = 'ens'; if (ui.trFw === fid) ui.trFw = 'ens'; if (ui.ucFw === fid) ui.ucFw = 'todos';
  commit(t('tMpDeleted', m.nombre));
}
/* Plantillas con un ejemplo ficticio: dos requisitos, uno mapeado y otro para que el asistente sugiera */
const mpPlantilla = () => ({ format: 'rosetta-marco', version: 1, id: tx('politica-ejemplo', 'example-policy'), nombre: tx('Política de seguridad de ejemplo (ficticia)', 'Example security policy (fictitious)'), tipo: 'propio',
  requisitos: [
    { id: 'POL-01', titulo: tx('Copias de seguridad cifradas y probadas cada trimestre', 'Encrypted backups tested every quarter'), texto: tx('Texto opcional que aporta el usuario', 'Optional text provided by the user'), grupo: tx('Continuidad', 'Continuity'), controles: [{ control: 'ACT-08', fuerza: 'equivalente' }, { control: 'CON-03', fuerza: 'parcial' }] },
    { id: 'POL-02', titulo: tx('Autenticación multifactor en los accesos remotos', 'Multi-factor authentication for remote access'), grupo: tx('Acceso', 'Access'), controles: [] }
  ] });
const mpPlantillaCsv = () => toCsv([['id', 'titulo', 'texto', 'grupo', 'controles'], ...mpPlantilla().requisitos.map((r) => [r.id, r.titulo, r.texto || '', r.grupo || '', r.controles.map((c) => `${c.control}:${c.fuerza}`).join('|')])]);
