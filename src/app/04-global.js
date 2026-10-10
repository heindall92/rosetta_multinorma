/* ---------- Vistas globales: inicio, nuevo proyecto, perfil, ajustes, ayuda ---------- */
const TOTAL_REQS = FW_BASE.reduce((a, f) => a + CAT0.frameworks[f].reqs.length, 0);
const totalReqs = () => FW.reduce((a, f) => a + CAT.frameworks[f].reqs.length, 0);
const COLORS = COLOR_IDS;
const caseTxt = (c, k) => (LANG() === 'en' && c[k + '_en'] ? c[k + '_en'] : c[k]);
let HERO = null; // rueda del caso de clase para la portada (se calcula una vez)
function heroWheel() {
  if (!HERO) { const cs = D.casos.find((c) => c.id === 'techserv'); const st = sanitizeState(clone(cs.state)); HERO = { st, calc: E.calcular(IX0, st) }; }
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
      <div class="tag t1"><b>${pct(SOLAPE0.ens.iso27001.pct)}</b>${esc(t('tagOf27'))} ${esc(t('tagEns'))}</div>
      <div class="tag t2"><b>${pct(SOLAPE0.ens.nis2.pct)}</b>${esc(t('tagNis'))}</div>
      <div class="tag t3"><b>${pct(SOLAPE0.iso27001.partis.pct)}</b>${esc(t('tagPartis'))}</div></div>
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
      <div class="rings">${FW_BASE.filter((f) => c.meta.normas.includes(f)).map((f) => { const on = c.meta.normas.includes(f); const cc = caseCalc(c.id); return `<figure>${miniRing(f, on ? cc.fw[f].grado : 0, on ? cc.fw[f].cubiertos : 0, cc.fw[f].aplicables, 40, !on)}<figcaption>${fwShort(f)}</figcaption></figure>`; }).join('')}</div>
      <p>${esc(caseTxt(c, 'resumen'))}</p>
      <ul class="retos">${caseTxt(c, 'retos').map((r) => `<li>${icon('flag', 14)}${esc(r)}</li>`).join('')}</ul>
      <div class="row small muted"><span><b class="num" style="color:var(--ink)">${pct(c.meta.grado)}</b> ${esc(t('covered'))}</span>·<span><b class="num" style="color:var(--ink)">${c.meta.brechas}</b> ${esc(t('gaps'))}</span>·<span><b class="num" style="color:var(--crit)">${c.meta.altas}</b> ${esc(t('highAlerts'))}</span></div>
      <button type="button" class="btn${ws.activeId === 'demo-' + c.id ? '' : ' primary'}" data-act="open-case" data-case="${esc(c.id)}">${esc(ws.projects.some((p) => p.id === 'demo-' + c.id) ? t('continue') : t('openCase'))}${icon('arrow-right', 16)}</button>
    </article>`).join('')}</div></section>` : ''}`;
}
const CASE_CALC = {};
function caseCalc(id) { if (!CASE_CALC[id]) { const cs = D.casos.find((c) => c.id === id); CASE_CALC[id] = E.calcular(IX0, sanitizeState(clone(cs.state))); } return CASE_CALC[id]; }

/* --- Asistente --- */
function wzInit() {
  ui.wizard = { step: 1, organizacion: '', descripcion: '', sector: '', alcance: alcanceDefecto(), perfil: { ...E.PERFIL_DEF },
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
  const vis = (f) => !regionDe(f) || a[f].on || (ui.wizard && (ui.wizard.perfil.jurisdiccion === regionDe(f) || (ui.wizard.perfil.opera || []).includes(regionDe(f))));
  return `<div class="scope">${FW_BASE.filter(vis).map((f) => `<label class="fw-${fwCls(f)}"><input type="checkbox" id="${pre}-on-${f}" data-${pre}="alcance.${f}.on" data-type="bool"${a[f].on ? ' checked' : ''}><span class="chk">${icon('check', 14)}</span><b>${fwLbl(f)}</b><small>${esc(t('fwDesc.' + f))}</small><span class="tiny muted num">${esc(t('reqs', CAT.frameworks[f].reqs.length))}</span></label>`).join('')}</div>`;
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
    const pr = E.perfilRegulatorio(w.perfil, w.nis2q, LANG());
    body = `<div class="stack"><div class="pane-h"><div><h3>${esc(t('prTitle'))}</h3><p>${esc(t('prLead'))}</p></div><button type="button" class="btn sm primary" data-act="wz-perfil-aplicar">${icon('wand-sparkles', 15)}${esc(t('prApply'))}</button></div>${perfilForm(w.perfil, 'wz')}
        <div class="chips wz-prop">${FW_BASE.filter((f) => !regionDe(f) || pr.marcos[f].estado !== 'no-aplica').map((f) => `<span class="wz-p">${fwTag(f, false, true)}${prPill(pr.marcos[f].estado)}</span>`).join('')}</div>${futurasBox(pr)}<p class="hint">${esc(t('prDisclaimer'))}</p></div>
      ${scopeCards(w.alcance, 'wz')}${w.alcance.ens.on ? `<div class="stack"><h3>${fwTag('ens')} ${esc(t('ensCat'))}</h3>${ensLevels(w.alcance.ens, 'wz')}</div>` : ''}
      <div class="stack"><h3>${fwTag('nis2')} ${esc(t('nis2Title'))}</h3>${nis2Form(w.nis2q, 'wz')}${nis2Box(w.nis2q)}</div>`;
  } else {
    const ch = (v, a, b) => `<label class="choice${w.inicio === v ? ' on' : ''}"><input type="radio" name="wz-in" data-wz="inicio" value="${v}"${w.inicio === v ? ' checked' : ''}><span><b>${esc(t(a))}</b><small>${esc(t(b))}</small></span></label>`;
    body = `<div class="grid g3">${ch('cero', 'fromZero', 'fromZeroTxt')}${ch('ens', 'fromEns', 'fromEnsTxt')}${ch('todo', 'fromAll', 'fromAllTxt')}</div>
      ${w.inicio === 'ens' ? `<div class="stack"><h3>${esc(t('ensFile'))}</h3><p class="small muted">${esc(t('ensFileTxt'))}</p><div class="row"><button type="button" class="btn sm" data-act="wz-ens-file">${icon('upload', 15)}${esc(t('chooseFile'))}</button>${w.ensInfo ? `<span class="ok-box">${icon('circle-check', 16)}${esc(w.ensInfo)}</span>` : ''}</div></div>` : ''}
      <div class="glass pane"><dl class="kv"><dt>${esc(t('org'))}</dt><dd><b>${esc(w.organizacion || t('yourOrg'))}</b></dd><dt>${esc(t('scopeDesc'))}</dt><dd>${esc(w.descripcion || '—')}</dd><dt>${esc(t('fws'))}</dt><dd class="chips">${FW_BASE.filter((f) => w.alcance[f].on).map((f) => fwTag(f)).join('') || '—'}</dd>
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
/* ---------- Ayuda ----------
 * Centro de ayuda (buscador, temas y preguntas por tema), metodología, glosario, reglas, atajos,
 * fuentes oficiales y «Acerca de» con los datos de contacto del autor. */
const AUTOR = { nombre: 'Yoandy Ramírez Delgado', email: 'yoandyramirezdelgado@gmail.com', repo: 'https://github.com/heindall92/rosetta_multinorma',
  links: [['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/yoandyrd92/'], ['github', 'GitHub', 'https://github.com/heindall92'],
    ['globe', 'Portafolio', 'https://yoandyramirez.com'], ['hackthebox', 'HackTheBox', 'https://profile.hackthebox.com/profile/019c5812-b4ca-7315-b12f-14db6d2b42fa']] };
const BRAND = { github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12', hackthebox: 'm22.5106 6.4566.0008-.0123a.888.888 0 0 0-.2717-.6384c-.0084-.0084-.018-.0155-.0267-.0235-.0186-.0166-.0371-.0333-.0572-.0484-.0193-.0147-.04-.0276-.0607-.0406-.0096-.006-.0182-.0131-.0281-.0188L12.4576.1266a.891.891 0 0 0-.9223.0043L1.933 5.6744c-.0107.0062-.0203.014-.0307.0205-.0073.0047-.015.008-.0223.0128-.007.0047-.013.0106-.02.0155a.8769.8769 0 0 0-.147.1333l-.0026.003a.8872.8872 0 0 0-.2218.5847l.0009.014c-.0002.0088-.0015.0176-.0015.0264v11.0708c0 .3277.1802.6288.469.7836l9.5986 5.5417c.0076.0044.0158.0075.0236.0117a.8754.8754 0 0 0 .166.0687c.0134.004.0266.0083.0401.0117a.8793.8793 0 0 0 .072.0142c.0117.0019.0232.0045.0349.006a.835.835 0 0 0 .2157 0c.0117-.0015.0232-.0041.0348-.006a.9.9 0 0 0 .072-.0142c.0135-.0034.0267-.0077.04-.0117a.895.895 0 0 0 .0646-.0217.9134.9134 0 0 0 .1015-.047c.0078-.0042.016-.0072.0236-.0117l9.5986-5.5417a.8888.8888 0 0 0 .469-.7836V6.4779c0-.0071-.0012-.0142-.0014-.0213zM5.2543 6.0822l6.5367-3.774a.4182.4182 0 0 1 .4182 0l6.5366 3.774a.4182.4182 0 0 1 0 .7243l-6.5367 3.774a.4182.4182 0 0 1-.4182 0l-6.5366-3.774a.4182.4182 0 0 1 0-.7243zm5.6134 14.3449a.4172.4172 0 0 1-.626.3613L3.718 17.0218a.4173.4173 0 0 1-.2086-.3613V9.1279a.4172.4172 0 0 1 .6258-.3613l6.524 3.7666a.4172.4172 0 0 1 .2086.3614v7.5325zm9.623-3.7666a.4173.4173 0 0 1-.2086.3613l-6.5239 3.7666a.4172.4172 0 0 1-.6259-.3613v-7.5325c0-.149.0796-.2868.2087-.3614l6.5239-3.7666a.4172.4172 0 0 1 .6258.3613v7.5326z' };
const brandIcon = (k, size = 16) => (k === 'linkedin'
  ? `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="4" fill="currentColor"/><text x="12" y="17.2" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="13" fill="#0A66C2">in</text></svg>`
  : BRAND[k] ? `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${BRAND[k]}"/></svg>` : icon(k, size));
const ext = (href, inner, cls = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
/* Resaltado de la búsqueda (sin tildes ni mayúsculas; normTxt está en 05-views.js) sobre el texto ya escapado */
function hl(escaped, q) {
  if (!q || /[&<>"']/.test(q)) return escaped;
  const n = normTxt(escaped), nq = normTxt(q); let out = '', from = 0, i;
  if (n.length !== escaped.length) return escaped;
  while ((i = n.indexOf(nq, from)) >= 0) { out += escaped.slice(from, i) + '<mark>' + escaped.slice(i, i + nq.length) + '</mark>'; from = i + nq.length; }
  return out + escaped.slice(from);
}
const rich = (x, q) => hl(esc(x), q).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
function helpCenter() {
  const q = ui.helpQ.trim(); const nq = normTxt(q);
  const groups = t('helpGroups').map(([id, ic, title, blurb, faqs]) => ({ id, ic, title, blurb, faqs: q ? faqs.filter(([a, b]) => normTxt(a + ' ' + b).includes(nq)) : faqs }))
    .filter((g) => g.faqs.length);
  const gloss = q ? t('glosario').filter(([a, b]) => normTxt(a + ' ' + b).includes(nq)) : [];
  const n = groups.reduce((a, g) => a + g.faqs.length, 0) + gloss.length;
  const hero = `<section class="help-hero"><h2>${esc(t('helpHero'))}</h2><p>${esc(t('helpHeroTxt'))}</p>
    <label class="search help-search">${icon('search', 18)}<input type="search" id="help-q" value="${esc(ui.helpQ)}" placeholder="${esc(t('helpSearchPh'))}" aria-label="${esc(t('search'))}" aria-describedby="help-res"></label><p class="small muted" id="help-res" role="status">${q ? esc(t('helpRes', n)) : ''}</p></section>`;
  const faqs = groups.map((g) => `<section class="help-group" id="help-${g.id}"><h3>${icon(g.ic, 17)}${esc(g.title)}</h3>
    ${g.faqs.map(([a, b]) => `<details class="help-faq"${q ? ' open' : ''}><summary><span>${rich(a, q)}</span>${icon('chevron-down', 16)}</summary><p>${rich(b, q)}</p></details>`).join('')}</section>`).join('');
  if (q) return hero + (n ? faqs + (gloss.length ? `<section class="help-group"><h3>${icon('book-open', 17)}${esc(t('helpTabs.glosario'))}</h3><dl class="gloss">${gloss.map(([a, b]) => `<div><dt>${hl(esc(a), q)}</dt><dd>${hl(esc(b), q)}</dd></div>`).join('')}</dl></section>` : '')
    : `<div class="empty">${icon('search', 28)}<h3>${esc(t('helpNoRes'))}</h3><p>${esc(t('helpNoResTxt'))}</p></div>`);
  const steps = `<h3 class="help-sec">${icon('flag', 16)}${esc(t('helpSteps'))}</h3><ol class="help-steps">${t('steps').map(([h, p, v], i) => `<li class="play-i"><span class="play-n">${i + 1}</span><div><b>${esc(h)}</b><span class="small muted">${esc(p)}</span></div>${state || v === 'inicio' ? `<button type="button" class="btn sm ghost" data-act="nav" data-view="${v}">${esc(t('go'))}${icon('arrow-right', 15)}</button>` : '<span></span>'}</li>`).join('')}</ol>`;
  const topics = `<h3 class="help-sec">${icon('book-open', 16)}${esc(t('helpTopics'))}</h3><div class="help-topics">${t('helpGroups').map(([id, ic, title, blurb]) => `<button type="button" class="help-topic" data-act="help-topic" data-id="${id}"><span class="help-topic-ic">${icon(ic, 18)}</span><b>${esc(title)}</b><span>${esc(blurb)}</span><em>${esc(t('readGuide'))}${icon('arrow-right', 13)}</em></button>`).join('')}</div>`;
  return hero + steps + topics + faqs + helpCta();
}
function helpCta() {
  return `<section class="help-cta"><h3>${icon('life-buoy', 17)}${esc(t('helpCta'))}</h3><p>${esc(t('helpCtaTxt'))}</p><div class="row">
    ${ext(AUTOR.repo + '/issues/new', `${icon('bug', 15)}${esc(t('openIssue'))}`, 'btn sm primary')}
    ${ext('mailto:' + AUTOR.email + '?subject=Rosetta', `${icon('mail', 15)}${esc(t('writeAuthor'))}`, 'btn sm')}
    ${ext(AUTOR.repo, `${brandIcon('github', 15)}${esc(t('seeCode'))}`, 'btn sm')}</div></section>`;
}
const SUITE = [
  ['argos', 'ARGOS', 'https://heindall92.github.io/argos-grc/', 'https://github.com/heindall92/argos-grc'],
  ['rosetta', 'Rosetta', 'https://heindall92.github.io/rosetta_multinorma/', 'https://github.com/heindall92/rosetta_multinorma'],
  ['ens', 'ENS Compliance Studio', 'https://heindall92.github.io/grc_ens_compliance_studio/app/dist/ens-compliance-studio.html', 'https://github.com/heindall92/grc_ens_compliance_studio'],
  ['kairos', 'KAIROS', 'https://heindall92.github.io/kairos/', 'https://github.com/heindall92/kairos'],
  ['ctem', 'CTEM-Nexus', 'https://heindall92.github.io/ctem-nexus/', 'https://github.com/heindall92/ctem-nexus'],
  ['adaudit', 'ENS AD Auditor', 'https://heindall92.github.io/ens_ad-auditor/', 'https://github.com/heindall92/ens_ad-auditor'],
  ['norvik', 'Norvik', null, 'https://github.com/heindall92/Norvik_Gobernanza']
];
function suiteGrc() {
  const d = t('suiteDesc');
  return `<section class="suite" aria-labelledby="suite-h"><h3 class="help-sec" id="suite-h">${icon('layers', 16)}${esc(t('suiteTitle'))}</h3><p class="small muted">${esc(t('suiteTxt'))}</p>
    <div class="suite-grid">${SUITE.map(([id, n, app, repo]) => `<article class="suite-card${id === 'rosetta' ? ' here' : ''}"><div class="suite-hd"><b>${esc(n)}</b>${id === 'rosetta' ? `<span class="pill suite-here">${esc(t('suiteHere'))}</span>` : ''}</div><p>${esc(d[id])}</p>
      <div class="row">${id === 'rosetta' || !app ? '' : ext(app, `${esc(t('suiteOpen'))}${icon('arrow-right', 15)}`, 'btn sm primary')}${ext(repo, `${brandIcon('github', 15)}${esc(t('suiteCode'))}`, 'btn sm')}</div></article>`).join('')}</div></section>`;
}
function helpAbout() {
  return `<div class="about-card"><div class="avatar c-rosa about-av" style="--s:84px" aria-hidden="true">YR</div><div class="about-who">
      <h3>${esc(AUTOR.nombre)}</h3><p class="about-role">${esc(t('aboutRole'))}</p><p class="small muted">${esc(t('aboutBio'))}</p>
      <div class="about-links">${AUTOR.links.map(([k, l, h]) => ext(h, `${brandIcon(k, 16)}${esc(l)}`, `about-link al-${k}`)).join('')}
        ${ext('mailto:' + AUTOR.email, `${icon('mail', 16)}${esc(AUTOR.email)}`, 'about-link al-mail')}</div></div></div>
    <h3 class="help-sec">${icon('info', 16)}${esc(t('aboutApp'))}</h3>
    <p><b>${esc(t('about', VERSION))}</b></p><p>${esc(t('disclaimer'))}</p>
    <p class="small muted">${esc(t('licences'))}</p>
    <p class="small">${ext(AUTOR.repo, `${brandIcon('github', 14)} github.com/heindall92/rosetta_multinorma`, 'about-repo')}</p>${suiteGrc()}${helpCta()}`;
}
function vAyuda() {
  const tabs = [['inicio', 'life-buoy'], ['metodo', 'gauge'], ['glosario', 'book-open'], ['reglas', 'shield-check'], ['atajos', 'keyboard'], ['refs', 'landmark'], ['acerca', 'info']];
  const tb = tabs.some(([id]) => id === ui.helpTab) ? ui.helpTab : 'inicio'; let body = '';
  if (tb === 'inicio') body = helpCenter();
  else if (tb === 'metodo') body = `<p>${esc(t('methodP1', CAT.controls.length, CAT.domains.length))}</p><div class="grid g3">${t('methodCards').map(([h, p]) => `<div class="glass pane"><h3>${esc(h)}</h3><p class="small" style="margin-top:6px">${esc(p)}</p></div>`).join('')}</div>
    <p class="small">${esc(t('methodSrc'))}</p><p class="small">${esc(t('methodCcn', CCN.edicion, CCN.medidas, CCN.parejas, CCN.niveles.analogo, CCN.niveles.parcial, CCN.niveles.nula, CCN.propias))}</p><p class="small">${esc(t('methodVal', pct(PAREJAS.coinciden / PAREJAS.total, 1), PAREJAS.total, PAREJAS.relacion))}</p><p class="small"><b>${esc(t('methodOv'))}</b></p>${overlapGrid(null)}`;
  else if (tb === 'glosario') { const q = ui.glosarioQ.toLowerCase(); const items = t('glosario').filter(([a, b]) => !q || (a + b).toLowerCase().includes(q)); body = `<div class="search">${icon('search', 16)}<input type="search" id="glo-q" value="${esc(ui.glosarioQ)}" placeholder="${esc(t('search2'))}" aria-label="${esc(t('search2'))}"></div><dl class="gloss">${items.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('') || `<p class="muted">${esc(t('noResults'))}</p>`}</dl>`; }
  else if (tb === 'reglas') body = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${esc(t('rule'))}</th><th>${esc(t('severity'))}</th><th>${esc(t('checks'))}</th>${state ? `<th>${esc(t('inProject'))}</th>` : ''}</tr></thead><tbody>${E.REGLAS.map(([id, sv, d]) => `<tr><td><code>${id}</code></td><td>${sevPill(sv)}</td><td>${esc(LANG() === 'en' ? E.REGLAS_EN[id] : d)}</td>${state ? `<td class="num">${hall.filter((f) => f.id === id).length}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  else if (tb === 'atajos') body = `<div class="kbds">${t('keys').map(([a, b]) => `<div><span>${a.split(' ').map((x) => (/^(\+|·|y|luego|then)$/.test(x) ? `<em class="muted">${x}</em>` : `<kbd>${esc(x)}</kbd>`)).join(' ')}</span><span class="small muted">${esc(b)}</span></div>`).join('')}</div>`;
  else if (tb === 'refs') body = `<div class="help-refs">${t('helpRefs').map(([h, ti, d]) => ext(h, `${icon('external-link', 16)}<span><b>${esc(ti)}</b><small>${esc(d)}</small></span>`, 'help-ref')).join('')}</div>`;
  else body = helpAbout();
  return `${head(esc(t('helpEyebrow')), esc(t('helpTitle')), esc(t('helpLead')))}
  <div class="help"><nav class="glass help-nav" aria-label="${esc(t('helpTitle'))}">${tabs.map(([id, ic]) => `<button type="button" data-act="help-tab" data-tab="${id}"${tb === id ? ' aria-current="page"' : ''}>${icon(ic, 16)}${esc(t('helpTabs.' + id))}</button>`).join('')}</nav>
  <section class="glass help-body">${tb === 'inicio' ? '' : `<h2>${esc(t('helpTabs.' + tb))}</h2>`}${body}</section></div>`;
}

