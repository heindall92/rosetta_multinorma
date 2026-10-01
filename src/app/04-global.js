/* ---------- Vistas globales: inicio, nuevo proyecto, perfil, ajustes, ayuda ---------- */
const TOTAL_REQS = FW.reduce((a, f) => a + CAT.frameworks[f].reqs.length, 0);
const COLORS = COLOR_IDS;
const caseTxt = (c, k) => (LANG() === 'en' && c[k + '_en'] ? c[k + '_en'] : c[k]);
let HERO = null; // rueda del caso de clase para la portada (se calcula una vez)
function heroWheel() {
  if (!HERO) { const cs = D.casos.find((c) => c.id === 'techserv'); const st = sanitizeState(clone(cs.state)); HERO = { st, calc: E.calcular(IX, st) }; }
  return wheelSVG(HERO.st, HERO.calc, { hero: true });
}

function vInicio() {
  const own = ws.projects.filter((p) => p.kind === 'own'); const demos = ws.projects.filter((p) => p.kind === 'demo');
  const nombre = ws.profile.nombre ? ws.profile.nombre.split(' ')[0] : '';
  const pr = (p) => {
    const del = ui.confirm === 'del:' + p.id;
    return `<div class="pr"><span class="case-ic">${icon(p.kind === 'demo' ? caseIcon(p.caseId) : 'building-complex', 18)}</span>
      <div style="min-width:0"><b>${esc(p.nombre)}</b><small>${esc(p.organizacion || '')}${p.kind === 'demo' ? ' · ' + esc(t('demoCase')) : ''} · ${esc(t('updated'))} ${fmtDate(p.updated)}</small></div>
      <div class="row pr-meta">${(p.normas || []).map((f) => fwTag(f, false, true)).join('')}${p.grado !== undefined ? `<span class="small muted num">${pct(p.grado)} ${esc(t('covered'))}</span>` : ''}</div>
      <div class="row">${del ? `<span class="small">${esc(t('delQ'))}</span><button type="button" class="btn sm danger-solid" data-act="del-project" data-id="${esc(p.id)}">${esc(t('del'))}</button><button type="button" class="btn sm" data-act="confirm-no">${esc(t('cancel'))}</button>`
        : `<button type="button" class="btn sm" data-act="open-project" data-id="${esc(p.id)}">${esc(t('open'))}</button><button type="button" class="ibtn sm" data-act="ask" data-what="del:${esc(p.id)}" aria-label="${esc(t('del'))} ${esc(p.nombre)}">${icon('trash', 16)}</button>`}</div></div>`;
  };
  return `
  <section class="hero">
    <div><div class="eyebrow">${icon('sparkles', 14)}${esc(t('heroEyebrow'))}</div>
      <h1>${esc(t('heroA'))}<br>${esc(t('heroB'))} <em>${esc(t('heroC'))}</em></h1>
      <p class="lead">${esc(t('heroLead', TOTAL_REQS, CAT.controls.length))}</p>
      <div class="hero-cta"><button type="button" class="btn primary" data-act="nav" data-view="nuevo">${icon('plus', 17)}${esc(t('stNew'))}</button><button type="button" class="btn" data-act="open-case" data-case="techserv">${icon('orbit', 17)}${esc(t('openCase'))} · TechServ</button></div></div>
    <div class="hero-wheel" aria-hidden="true">${heroWheel()}
      <div class="tag t1"><b>${pct(SOLAPE.ens.iso27001.pct)}</b>${esc(t('tagOf27'))} ${esc(t('tagEns'))}</div>
      <div class="tag t2"><b>${pct(SOLAPE.ens.nis2.pct)}</b>${esc(t('tagNis'))}</div>
      <div class="tag t3"><b>${pct(SOLAPE.iso27001.iso42001.pct)}</b>${esc(t('tagAi'))}</div></div>
  </section>
  ${!ws.onboarded && !ws.profileDone ? `<section class="glass pane onboard"><div><h3>${esc(t('whoTitle'))}</h3><p class="small muted" style="margin-top:4px">${esc(t('whoTxt'))}</p></div>
      <div class="form"><label class="fld">${esc(t('name'))}<input type="text" id="ob-nombre" data-ws="profile.nombre" value="${esc(ws.profile.nombre)}" placeholder="${esc(t('namePh'))}"></label>
      <label class="fld">${esc(t('role'))}<select id="ob-rol" data-ws="profile.rol">${opt('', t('chooseRole'), ws.profile.rol)}${t('roles').map((r) => opt(r, r, ws.profile.rol)).join('')}</select></label>
      <div class="row span2"><button type="button" class="btn primary sm" data-act="ob-save">${icon('check', 15)}${esc(t('save'))}</button><button type="button" class="btn ghost sm" data-act="ob-skip">${esc(t('notNow'))}</button></div></div></section>` : ''}
  <div class="starts">
    <button type="button" class="start primary" data-act="nav" data-view="nuevo"><span class="ico">${icon('plus', 22)}</span><b>${esc(t('stNew'))}</b><span>${esc(t('stNewTxt'))}</span><em>${esc(t('stNewCta'))}${icon('arrow-right', 16)}</em></button>
    <button type="button" class="start" data-act="import-ens"><span class="ico">${icon('upload', 22)}</span><b>${esc(t('stImp'))}</b><span>${esc(t('stImpTxt'))}</span><em>${esc(t('stImpCta'))}${icon('arrow-right', 16)}</em></button>
    <a class="start" href="#casos" data-act="scroll-casos"><span class="ico">${icon('book-open', 22)}</span><b>${esc(t('stCase'))}</b><span>${esc(t('stCaseTxt'))}</span><em>${esc(t('stCaseCta'))}${icon('arrow-right', 16)}</em></a>
  </div>
  ${own.length || demos.length ? `<section class="glass projects"><div class="pane-h" style="padding:18px 20px 0"><h2>${esc(t('yourProjects'))}</h2><span class="small muted">${esc(t('own', own.length))} · ${demos.length} ${esc(t('openCases').toLowerCase())}</span></div>${[...own, ...demos].map(pr).join('')}</section>` : ''}
  ${ws.settings.mostrarCasos ? `<section id="casos" class="stack"><div class="row spread"><h2>${esc(t('cases'))}</h2><span class="small muted">${esc(t('casesSub'))}</span></div>
    <div class="cases">${D.casos.map((c) => `<article class="glass case">
      <div class="case-top"><span class="case-ic">${icon(caseIcon(c.id), 22)}</span>${c.meta.nis2 ? entPill(c.meta.nis2) : ''}</div>
      <div><h3>${esc(c.titulo)}</h3><span class="small muted">${esc(caseTxt(c, 'sector'))}</span></div>
      <div class="rings">${FW.map((f) => { const on = c.meta.normas.includes(f); const cc = caseCalc(c.id); return `<figure>${miniRing(f, on ? cc.fw[f].grado : 0, on ? cc.fw[f].cubiertos : 0, cc.fw[f].aplicables, 40, !on)}<figcaption>${FW_SHORT[f]}</figcaption></figure>`; }).join('')}</div>
      <p>${esc(caseTxt(c, 'resumen'))}</p>
      <ul class="retos">${caseTxt(c, 'retos').map((r) => `<li>${icon('flag', 14)}${esc(r)}</li>`).join('')}</ul>
      <div class="row small muted"><span><b class="num" style="color:var(--ink)">${pct(c.meta.grado)}</b> ${esc(t('covered'))}</span>·<span><b class="num" style="color:var(--ink)">${c.meta.brechas}</b> ${esc(t('gaps'))}</span>·<span><b class="num" style="color:var(--crit)">${c.meta.altas}</b> ${esc(t('highAlerts'))}</span></div>
      <button type="button" class="btn${ws.activeId === 'demo-' + c.id ? '' : ' primary'}" data-act="open-case" data-case="${esc(c.id)}">${esc(ws.projects.some((p) => p.id === 'demo-' + c.id) ? t('continue') : t('openCase'))}${icon('arrow-right', 16)}</button>
    </article>`).join('')}</div></section>` : ''}`;
}
const CASE_CALC = {};
function caseCalc(id) { if (!CASE_CALC[id]) { const cs = D.casos.find((c) => c.id === id); CASE_CALC[id] = E.calcular(IX, sanitizeState(clone(cs.state))); } return CASE_CALC[id]; }

/* --- Asistente --- */
function wzInit() {
  ui.wizard = { step: 1, organizacion: '', descripcion: '', sector: '', alcance: { ens: { on: true, categoria: 'MEDIA', niveles: {} }, iso27001: { on: true }, nis2: { on: false }, iso42001: { on: false } },
    nis2q: { sector: 'ninguno', especial: 'ninguno', tamano: 'pequena', infraDigital: false }, inicio: 'cero', ensSoa: null, ensInfo: '', error: '' };
}
function nis2Box(q) {
  const r = E.nis2Aplicabilidad(q, LANG());
  return `<div class="nis2-box">${icon('compass', 20)}<div><div class="row">${entPill(r.tipo)}${r.cir ? `<span class="pill accent">${esc(t('cirApplies'))}</span>` : ''}</div><p>${esc(r.motivo)}</p>
    ${r.tipo === 'fuera' ? `<p class="hint">${esc(t('nis2Out'))}</p>` : ''}<p class="hint">${esc(t('nis2Law'))}</p></div></div>`;
}
function nis2Form(q, pre) {
  const S = t('nis2Sectors');
  return `<div class="form">
    <label class="fld span2">${esc(t('nis2Sector'))}<select id="${pre}-sec" data-${pre}="nis2q.sector">${S.map(([v, l]) => opt(v, l, q.sector)).join('')}</select><span class="hint">${esc((S.find((x) => x[0] === q.sector) || [])[2] || '')}</span></label>
    <label class="fld">${esc(t('nis2Size'))}<select id="${pre}-tam" data-${pre}="nis2q.tamano">${t('nis2Sizes').map(([v, l]) => opt(v, l, q.tamano)).join('')}</select></label>
    <label class="fld">${esc(t('nis2Special'))}<select id="${pre}-esp" data-${pre}="nis2q.especial">${t('nis2Specials').map(([v, l]) => opt(v, l, q.especial)).join('')}</select></label>
    <label class="switch-l span2"><span class="switch"><input type="checkbox" id="${pre}-cir" data-${pre}="nis2q.infraDigital" data-type="bool"${q.infraDigital ? ' checked' : ''}><span></span></span><span class="small">${esc(t('nis2Digital'))}</span></label></div>`;
}
function ensLevels(a, pre) {
  return `<div class="form"><label class="fld">${esc(t('category'))}<select id="${pre}-cat" data-${pre}="alcance.ens.categoria">${['BÁSICA', 'MEDIA', 'ALTA'].map((c) => opt(c, t('cats.' + c), a.categoria)).join('')}</select></label>
    <div class="fld">${esc(t('dimLevels'))}<span class="hint">${esc(t('dimOpt'))}</span></div></div>
    <div class="dims">${E.DIMS.map((d) => `<label>${d}<select id="${pre}-dim-${d}" data-${pre}="alcance.ens.niveles.${d}" aria-label="${d}">${opt('', '—', a.niveles[d] || '')}${E.NIVELES_ENS.map((n) => opt(n, t('lv.' + n), a.niveles[d] || '')).join('')}</select></label>`).join('')}</div>`;
}
function scopeCards(a, pre) {
  return `<div class="scope">${FW.map((f) => `<label class="fw-${f}"><input type="checkbox" id="${pre}-on-${f}" data-${pre}="alcance.${f}.on" data-type="bool"${a[f].on ? ' checked' : ''}><span class="chk">${icon('check', 14)}</span><b>${E.FW_LABEL[f]}</b><small>${esc(t('fwDesc.' + f))}</small><span class="tiny muted num">${esc(t('reqs', CAT.frameworks[f].reqs.length))}</span></label>`).join('')}</div>`;
}
function vNuevo() {
  if (!ui.wizard) wzInit();
  const w = ui.wizard; const steps = t('wzSteps');
  const stepper = `<ol class="steps">${steps.map((st, i) => `<li class="${w.step === i + 1 ? 'on' : w.step > i + 1 ? 'done' : ''}"><span>${w.step > i + 1 ? icon('check', 14) : i + 1}</span>${esc(st)}</li>`).join('')}</ol>`;
  let body = '';
  if (w.step === 1) {
    body = `<div class="form"><label class="fld span2">${esc(t('orgReq'))}<input type="text" id="wz-org" data-wz="organizacion" value="${esc(w.organizacion)}" placeholder="${esc(t('orgPh'))}"></label>
      <label class="fld span2">${esc(t('scopeReq'))}<input type="text" id="wz-desc" data-wz="descripcion" value="${esc(w.descripcion)}" placeholder="${esc(t('scopePh'))}"></label>
      <label class="fld">${esc(t('sector'))}<select id="wz-sector" data-wz="sector">${opt('', t('choose'), w.sector)}${t('sectors').map((x) => opt(x, x, w.sector)).join('')}</select></label></div>`;
  } else if (w.step === 2) {
    body = `${scopeCards(w.alcance, 'wz')}${w.alcance.ens.on ? `<div class="stack"><h3>${fwTag('ens')} ${esc(t('ensCat'))}</h3>${ensLevels(w.alcance.ens, 'wz')}</div>` : ''}
      <div class="stack"><h3>${fwTag('nis2')} ${esc(t('nis2Title'))}</h3>${nis2Form(w.nis2q, 'wz')}${nis2Box(w.nis2q)}</div>`;
  } else {
    const ch = (v, a, b) => `<label class="choice${w.inicio === v ? ' on' : ''}"><input type="radio" name="wz-in" data-wz="inicio" value="${v}"${w.inicio === v ? ' checked' : ''}><span><b>${esc(t(a))}</b><small>${esc(t(b))}</small></span></label>`;
    body = `<div class="grid g3">${ch('cero', 'fromZero', 'fromZeroTxt')}${ch('ens', 'fromEns', 'fromEnsTxt')}${ch('todo', 'fromAll', 'fromAllTxt')}</div>
      ${w.inicio === 'ens' ? `<div class="stack"><h3>${esc(t('ensFile'))}</h3><p class="small muted">${esc(t('ensFileTxt'))}</p><div class="row"><button type="button" class="btn sm" data-act="wz-ens-file">${icon('upload', 15)}${esc(t('chooseFile'))}</button>${w.ensInfo ? `<span class="ok-box">${icon('circle-check', 16)}${esc(w.ensInfo)}</span>` : ''}</div></div>` : ''}
      <div class="glass pane"><dl class="kv"><dt>${esc(t('org'))}</dt><dd><b>${esc(w.organizacion || t('yourOrg'))}</b></dd><dt>${esc(t('scopeDesc'))}</dt><dd>${esc(w.descripcion || '—')}</dd><dt>${esc(t('fws'))}</dt><dd class="chips">${FW.filter((f) => w.alcance[f].on).map((f) => fwTag(f)).join('') || '—'}</dd>
        ${w.alcance.ens.on ? `<dt>ENS</dt><dd>${esc(t('category'))}: ${esc(t('cats.' + w.alcance.ens.categoria))}</dd>` : ''}<dt>NIS2</dt><dd>${entPill(E.nis2Aplicabilidad(w.nis2q).tipo)}</dd></dl></div>`;
  }
  return `${head(esc(t('wzEyebrow')), esc(t('wzTitle')), esc(t('wzLead')))}
  <section class="glass pane stack" style="gap:22px">${stepper}${w.error ? `<div class="alert">${icon('triangle-alert', 16)}${esc(w.error)}</div>` : ''}${body}
    <div class="wz-foot">${w.step > 1 ? `<button type="button" class="btn" data-act="wz-back">${icon('arrow-left', 16)}${esc(t('back'))}</button>` : `<button type="button" class="btn ghost" data-act="nav" data-view="inicio">${esc(t('cancel'))}</button>`}
      ${w.step < 3 ? `<button type="button" class="btn primary" data-act="wz-next">${esc(t('next'))}${icon('arrow-right', 16)}</button>` : `<button type="button" class="btn primary" data-act="wz-create">${icon('check', 16)}${esc(t('create'))}</button>`}</div></section>`;
}

/* --- Perfil --- */
const firma = () => ws.profile.nombre ? `${ws.profile.nombre}${ws.profile.rol ? ' – ' + ws.profile.rol : ''}` : t('noAuthor');
function vPerfil() {
  const p = ws.profile;
  return `${head(esc(t('account')), esc(t('profileTitle')), esc(t('profileLead')))}
  <div class="grid g-prof">
    <section class="glass profile">${avatar(96)}<h2>${esc(p.nombre || t('noName'))}</h2><p class="muted">${esc(p.rol || t('noRole'))}</p>${p.organizacion ? `<p class="small">${esc(p.organizacion)}</p>` : ''}
      <div class="swatches" role="group" aria-label="${esc(t('avatarColor'))}">${COLORS.map((c) => `<button type="button" class="swatch avatar c-${c}${p.color === c ? ' on' : ''}" style="--s:30px" data-act="set-color" data-c="${c}" aria-label="${esc(t('accents.' + c))}" aria-pressed="${p.color === c}" data-tip="${esc(t('accents.' + c))}"></button>`).join('')}</div>
      <div class="row" style="gap:24px;margin-top:10px"><div><b class="num" style="font:700 1.4rem var(--f-display)">${ws.projects.filter((x) => x.kind === 'own').length}</b><div class="tiny muted">${esc(t('nProjects'))}</div></div><div><b class="num" style="font:700 1.4rem var(--f-display)">${ws.projects.filter((x) => x.kind === 'demo').length}</b><div class="tiny muted">${esc(t('nCases'))}</div></div></div></section>
    <section class="glass pane"><h3>${esc(t('data'))}</h3><div class="form" style="margin-top:16px">
      <label class="fld span2">${esc(t('fullName'))}<input type="text" id="pf-n" data-ws="profile.nombre" value="${esc(p.nombre)}"></label>
      <label class="fld">${esc(t('role'))}<select id="pf-r" data-ws="profile.rol">${opt('', t('chooseRole'), p.rol)}${t('roles').map((r) => opt(r, r, p.rol)).join('')}${p.rol && !t('roles').includes(p.rol) ? opt(p.rol, p.rol, p.rol) : ''}</select></label>
      <label class="fld">${esc(t('org'))}<input type="text" id="pf-o" data-ws="profile.organizacion" value="${esc(p.organizacion)}"></label>
      <label class="fld span2">${esc(t('email'))}<input type="text" id="pf-e" data-ws="profile.email" value="${esc(p.email)}" placeholder="nombre@organizacion.es"></label></div>
      <p class="small muted" style="margin-top:16px">${esc(t('appearsAs'))} <b>${esc(firma())}</b></p></section>
  </div>`;
}

/* --- Ajustes --- */
function setRow(title, desc, control) { return `<div class="set-row"><div><b>${title}</b>${desc ? `<p>${desc}</p>` : ''}</div><div>${control}</div></div>`; }
function vAjustes() {
  const st = ws.settings;
  const seg = (key, opts) => `<div class="chipset" role="group">${opts.map(([v, l, ic]) => `<button type="button" data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${st[key] === v}">${ic ? icon(ic, 15) : ''}${esc(l)}</button>`).join('')}</div>`;
  const sw = (key, id, label) => `<label class="switch"><input type="checkbox" id="${id}" data-ws="settings.${key}" data-type="bool" aria-label="${esc(label)}"${st[key] ? ' checked' : ''}><span></span></label>`;
  const conf = ui.confirm === 'wipe';
  return `${head(esc(t('prefs')), esc(t('settingsTitle')), esc(t('settingsLead')))}
  <div class="stack" style="max-width:940px;gap:var(--gap)">
    <section class="glass pane"><h3>${esc(t('appearance'))}</h3>
      ${setRow(esc(t('language')), esc(t('langHint')), `<div class="lang" role="group"><button type="button" data-act="lang" data-v="es" aria-pressed="${LANG() === 'es'}">Español</button><button type="button" data-act="lang" data-v="en" aria-pressed="${LANG() === 'en'}">English</button></div>`)}
      ${setRow(esc(t('theme')), esc(t('themeHint')), seg('tema', [['sistema', t('system'), 'monitor'], ['claro', t('light'), 'sun'], ['oscuro', t('dark'), 'moon']]))}
      ${setRow(esc(t('accent')), '', `<div class="swatches" style="padding:0">${ACCENTS.map((a) => `<button type="button" class="swatch sw-${a}${st.acento === a ? ' on' : ''}" data-act="accent" data-v="${a}" aria-label="${esc(t('accents.' + a))}" data-tip="${esc(t('accents.' + a))}"></button>`).join('')}</div>`)}
      ${setRow(esc(t('density')), esc(t('densityHint')), seg('densidad', [['comoda', t('cozy')], ['compacta', t('compact')]]))}
      ${setRow(esc(t('railPref')), esc(t('railPrefHint')), sw('railMin', 'st-rail', t('railPref')))}</section>
    <section class="glass pane"><h3>${esc(t('mapPrefs'))}</h3>${setRow(esc(t('showRel')), esc(t('showRelHint')), sw('mostrarRelaciones', 'st-rel', t('showRel')))}</section>
    <section class="glass pane"><h3>${esc(t('rulesTitle'))}</h3>
      <details data-keep="rulesOpen"${ui.rulesOpen ? ' open' : ''} style="margin-top:10px"><summary class="small">${esc(t('activeRules'))} · ${E.REGLAS.length - st.reglasOff.length}/${E.REGLAS.length}</summary>
        ${E.REGLAS.map(([id, sv, d]) => `<label class="rule"><span class="switch"><input type="checkbox" data-rule="${id}"${st.reglasOff.includes(id) ? '' : ' checked'}><span></span></span><code>${id}</code>${sevPill(sv)}<span>${esc(LANG() === 'en' ? E.REGLAS_EN[id] : d)}</span></label>`).join('')}</details></section>
    <section class="glass pane"><h3>${esc(t('casesPref'))}</h3>
      ${setRow(esc(t('showCases')), esc(t('showCasesHint')), sw('mostrarCasos', 'st-mc', t('showCases')))}
      ${setRow(esc(t('closeCases')), esc(t('closeCasesHint')), `<button type="button" class="btn sm" data-act="close-demos">${icon('x', 15)}${esc(t('closeN', ws.projects.filter((p) => p.kind === 'demo').length))}</button>`)}</section>
    <section class="glass pane"><h3>${esc(t('dataPriv'))}</h3><p class="small muted" style="margin:6px 0">${esc(t('dataPrivTxt'))}</p>${location.protocol === 'file:' ? `<div class="alert">${icon('triangle-alert', 16)}${esc(t('fileWarn'))}</div>` : ''}
      ${setRow(esc(t('backup')), esc(t('backupHint')), `<div class="row"><button type="button" class="btn sm" data-act="backup">${icon('download', 15)}${esc(t('download'))}</button><button type="button" class="btn sm" data-act="restore">${icon('upload', 15)}${esc(t('restore'))}</button></div>`)}
      ${setRow(esc(t('wipe')), esc(t('wipeHint')), conf ? `<div class="row"><button type="button" class="btn sm danger-solid" data-act="wipe">${esc(t('wipeYes'))}</button><button type="button" class="btn sm" data-act="confirm-no">${esc(t('cancel'))}</button></div>` : `<button type="button" class="btn sm danger" data-act="ask" data-what="wipe">${icon('trash', 15)}${esc(t('wipeAsk'))}</button>`)}</section>
  </div>`;
}

/* --- Ayuda --- */
function vAyuda() {
  const tabs = [['inicio', 'flag'], ['metodo', 'gauge'], ['glosario', 'book-open'], ['reglas', 'shield-check'], ['atajos', 'keyboard'], ['faq', 'circle-question-mark'], ['acerca', 'info']];
  const tb = ui.helpTab; let body = '';
  if (tb === 'inicio') body = `<ol class="stack" style="list-style:none;padding:0;margin:0">${t('steps').map(([h, p, v], i) => `<li class="play-i"><span class="play-n">${i + 1}</span><div><b>${esc(h)}</b><span class="small muted">${esc(p)}</span></div>${state || v === 'inicio' ? `<button type="button" class="btn sm ghost" data-act="nav" data-view="${v}">${esc(t('go'))}${icon('arrow-right', 15)}</button>` : '<span></span>'}</li>`).join('')}</ol>`;
  else if (tb === 'metodo') body = `<p>${esc(t('methodP1', CAT.controls.length, CAT.domains.length))}</p><div class="grid g3">${t('methodCards').map(([h, p]) => `<div class="glass pane"><h3>${esc(h)}</h3><p class="small" style="margin-top:6px">${esc(p)}</p></div>`).join('')}</div>
    <p class="small">${esc(t('methodSrc'))}</p><p class="small">${esc(t('methodVal', pct(PAREJAS.coinciden / PAREJAS.total, 1), PAREJAS.total, PAREJAS.relacion))}</p><p class="small"><b>${esc(t('methodOv'))}</b></p>${overlapGrid(null)}`;
  else if (tb === 'glosario') { const q = ui.glosarioQ.toLowerCase(); const items = t('glosario').filter(([a, b]) => !q || (a + b).toLowerCase().includes(q)); body = `<div class="search">${icon('search', 16)}<input type="search" id="glo-q" value="${esc(ui.glosarioQ)}" placeholder="${esc(t('search2'))}"></div><dl class="gloss">${items.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('') || `<p class="muted">${esc(t('noResults'))}</p>`}</dl>`; }
  else if (tb === 'reglas') body = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${esc(t('rule'))}</th><th>${esc(t('severity'))}</th><th>${esc(t('checks'))}</th>${state ? `<th>${esc(t('inProject'))}</th>` : ''}</tr></thead><tbody>${E.REGLAS.map(([id, sv, d]) => `<tr><td><code>${id}</code></td><td>${sevPill(sv)}</td><td>${esc(LANG() === 'en' ? E.REGLAS_EN[id] : d)}</td>${state ? `<td class="num">${hall.filter((f) => f.id === id).length}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  else if (tb === 'atajos') body = `<div class="kbds">${t('keys').map(([a, b]) => `<div><span>${a.split(' ').map((x) => (/^(\+|·|y|luego|then)$/.test(x) ? `<em class="muted">${x}</em>` : `<kbd>${esc(x)}</kbd>`)).join(' ')}</span><span class="small muted">${esc(b)}</span></div>`).join('')}</div>`;
  else if (tb === 'faq') body = `<div class="faq">${t('faq').map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
  else body = `<p><b>${esc(t('about', VERSION))}</b></p><p>${esc(t('author'))}</p><p>${esc(t('disclaimer'))}</p><p class="small muted">${esc(t('licences'))}</p>`;
  return `${head(esc(t('helpEyebrow')), esc(t('helpTitle')), esc(t('helpLead')))}
  <div class="help"><nav class="glass help-nav">${tabs.map(([id, ic]) => `<button type="button" data-act="help-tab" data-tab="${id}"${tb === id ? ' aria-current="page"' : ''}>${icon(ic, 16)}${esc(t('helpTabs.' + id))}</button>`).join('')}</nav>
  <section class="glass help-body"><h2>${esc(t('helpTabs.' + tb))}</h2>${body}</section></div>`;
}

