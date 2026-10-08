/* ---------- Inspector: hoja lateral (inferior en móvil) con el detalle de un control o de un requisito ---------- */
function renderInsp() {
  const box = $('#insp'); const scrim = $('#scrim');
  const it = ui.insp;
  const valid = it && state && (it.type === 'uc' ? !!IX.ucMap[it.id] : FW.includes(it.fw) && !!IX.req[it.fw][it.id]);
  if (!valid) { if (it) ui.insp = null; box.hidden = true; scrim.hidden = true; box.innerHTML = ''; document.body.classList.remove('insp-open'); return; }
  const top = box.scrollTop;
  box.innerHTML = it.type === 'uc' ? inspUc(it.id) : inspReq(it.fw, it.id);
  box.hidden = false; scrim.hidden = false; document.body.classList.add('insp-open');
  box.scrollTop = top;
}
function inspHead(eyebrow, title, ic, fwc = '') {
  return `<div class="insp-h"><span class="case-ic${fwc ? ' ' + fwc : ''}">${icon(ic, 20)}</span><div style="min-width:0"><div class="eyebrow">${eyebrow}</div><h2>${esc(title)}</h2></div><span class="spacer"></span>
    <button type="button" class="ibtn" data-act="insp-close" aria-label="${esc(t('close'))}">${icon('x', 18)}</button></div>`;
}
function inspUc(id) {
  const c = IX.ucMap[id]; const d = state.controles[id]; const cc = calc.controles[id];
  const g = prio.find((p) => p.id === id); const rank = g ? prio.indexOf(g) + 1 : 0;
  const maps = FWV.map((f) => {
    const ms = c.maps[f].filter((m) => m.w > 0 || ws.settings.mostrarRelaciones); if (!ms.length) return '';
    return `<div>${fwTag(f, !onFw(f))}<div class="chips">${ms.map((m) => reqChip(f, m.id, { fuerza: fuerzaDe(m.w), cov: onFw(f) ? reqRow(f, m.id).estado : null })).join('')}</div></div>`;
  }).join('');
  return `${inspHead(`${esc(id)} · ${esc(dT(c.dom))}`, cT(id), DOM[c.dom].ic)}
  ${stateSwitch(id, cc.estado, true)}
  ${g ? `<div class="callout">${icon('lightbulb', 17)}<span>${esc(t('unlocksTxt', num1(g.ganancia), g.normas.map((f) => fwLbl(f)).join(', '), rank))}</span></div>` : ''}
  <div class="blk"><h4>${esc(t('objective'))}</h4><p class="small">${esc(tt(c, 'obj'))}</p></div>
  <div class="blk"><h4>${esc(t('usualEv'))}</h4><p class="norma">${esc(tt(c, 'ev'))}</p></div>
  <div class="form">
    <label class="fld">${esc(t('owner'))}<input type="text" id="uc-r-${esc(id)}" data-set="controles.${esc(id)}.responsable" value="${esc(d.responsable)}"></label>
    <label class="fld">${esc(t('lastRev'))}<input type="date" id="uc-d-${esc(id)}" data-set="controles.${esc(id)}.revision" value="${esc(d.revision)}"></label>
    <label class="fld span2">${esc(t('evidence'))}<textarea id="uc-e-${esc(id)}" data-set="controles.${esc(id)}.evidencias" placeholder="${esc(t('evPh'))}">${esc(d.evidencias)}</textarea></label>
    <label class="fld span2">${esc(t('notes'))}<textarea id="uc-n-${esc(id)}" data-set="controles.${esc(id)}.notas">${esc(d.notas)}</textarea></label></div>
  ${d.origen === 'ens' ? `<p class="tiny"><span class="origin">${esc(t('inheritedEns'))}</span></p>` : ''}
  <div class="blk"><h4>${esc(t('covers'))}</h4><div class="maps">${maps}</div></div>`;
}
/* Ficha de un requisito: el matiz de Part-IS con su fuente, o el texto que trae un marco propio */
function extraReq(f, r) {
  if (r.nota || r.desde) return `${r.nota ? `<div class="nota fw-${fwCls(f)}"><b>${esc(t(f === 'partis' ? 'partisNota' : 'fwNota'))}.</b> ${esc(tt(r, 'nota'))}</div>` : ''}${r.desde ? `<p class="small"><b>${esc(t('appliesFrom'))}:</b> ${esc(fmtDate(r.desde))}</p>` : ''}${r.ref ? `<p class="tiny muted">${esc(tt(r, 'ref'))}</p>` : ''}`;
  if (esPropio(f)) return `<div class="blk"><h4>${esc(t('mpBadge'))} · ${esc(t('mpUserMap'))}</h4>${r.texto ? `<p class="small">${esc(r.texto)}</p>` : ''}</div>`;
  return '';
}
function inspReq(f, id) {
  const r = IX.req[f][id]; const cov = reqRow(f, id); const showRel = ws.settings.mostrarRelaciones;
  const eq = E.equivalencias(IX, f, id);
  const ctl = eq.controles.filter((l) => l.w > 0 || showRel);
  const ex = cov.estado === 'excluido'; const canEx = onFw(f) && cov.estado !== 'no-exigido' && E.excluible(f, id);
  const ens = f === 'ens' ? `<dl class="kv small"><dt>${esc(t('dims'))}</dt><dd>${esc(r.dims)}</dd><dt>${esc(t('exig'))}</dt><dd class="mono">B ${esc(r.bajo)} · M ${esc(r.medio)} · A ${esc(r.alto)}</dd>${state.alcance.ens.on ? `<dt>${esc(t('inYourSys'))}</dt><dd>${esc(t('level'))} ${esc(t('lv.' + cov.nivel))} · <code>${esc(exigL(cov.exigencia))}</code></dd>` : ''}${ccnFicha(id)}<dt>${esc(t('classIso'))}</dt><dd>${esc(r.ref || '—')}</dd></dl>${ccnAviso(f, id)}` : '';
  const eqs = FWV.filter((g) => g !== f).map((g) => {
    const rows = eq.otras[g].filter((x) => x.fuerza !== 'relacionado' || showRel);
    return `<div>${fwTag(g, !onFw(g))}<div class="chips">${rows.length ? rows.map((x) => reqChip(g, x.id, { fuerza: x.fuerza, cov: onFw(g) ? reqRow(g, x.id).estado : null, origen: ccnTxt(f, g, x) })).join('') : `<span class="tiny muted">${esc(g === 'iso42001' || f === 'iso42001' ? t('noEqAi') : t('noEq'))}</span>`}</div></div>`;
  }).join('');
  return `${inspHead(`${fwTag(f, !onFw(f))} <span class="mono">${esc(reqCode(f, id))}</span>`, rT(f, id), 'file-check', `fw-${fwCls(f)}`)}
  <p class="small muted">${esc(rG(f, id))}</p>
  <div class="row">${onFw(f) ? covPill(cov.estado) : `<span class="pill neutral">${esc(t('outOfScope'))}</span>`}${cov.estado !== 'no-exigido' && cov.estado !== 'excluido' ? `<span class="small muted num">${esc(t('support', pct(cov.score)))}</span>` : ''}</div>
  ${cov.estado === 'no-exigido' ? `<div class="callout">${icon('info', 17)}<span>${esc(noExigidoTxt(f, cov))}</span></div>` : ''}
  ${ens}${extraReq(f, r)}
  <div class="blk"><h4>${esc(t('supportedBy'))} · ${ctl.length}</h4>${ctl.map((l) => { const fz = fuerzaDe(l.w); return `<div class="ucrow">${ucChip(l.uc)}<div style="min-width:0"><b>${esc(cT(l.uc))}</b><div><span class="weight ${fz}">${esc(t('fuerzaCorta.' + fz))}</span></div></div>${l.w > 0 ? stateSwitch(l.uc, E.estadoUc(state, l.uc)) : '<span></span>'}</div>`; }).join('')}</div>
  <div class="blk"><h4>${esc(t('equivalents'))}</h4><div class="maps">${eqs}</div></div>
  ${canEx ? `<div class="blk"><h4>${esc(t('exclusion'))}</h4>
    <label class="switch-l"><span class="switch"><input type="checkbox" id="ex-sw" data-exsw="1" data-fw="${f}" data-id="${esc(id)}"${ex ? ' checked' : ''}><span></span></span>${esc(t('excludeIt'))}</label>
    ${ex ? `<label class="fld">${esc(t('justification'))}<input type="text" id="ex-${f}-${esc(id)}" data-exfw="${f}" data-exid="${esc(id)}" value="${esc(cov.justificacion || '')}" placeholder="${esc(t('justPh'))}"></label>` : ''}</div>` : onFw(f) && !E.excluible(f, id) ? `<div class="blk"><h4>${esc(t('exclusion'))}</h4><p class="hint">${esc(t({ partis: 'notExcludablePartis', ria: 'notExcludableRia', cra: 'notExcludableCra', dora: 'notExcludableDora', cl21663: 'notExcludableLey', cl21719: 'notExcludableLey' }[f] || 'notExcludable'))}</p></div>` : ''}
  <button type="button" class="btn" data-act="tr-center" data-fw="${f}" data-id="${esc(id)}">${icon('waypoints', 16)}${esc(t('openPrism'))}</button>`;
}

