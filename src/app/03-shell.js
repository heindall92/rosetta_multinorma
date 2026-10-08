/* ---------- Piezas de presentación ---------- */
const COV_IC = { cubierto: 'circle-check', parcial: 'contrast', brecha: 'circle-dashed', excluido: 'circle-slash', 'no-exigido': 'info' };
const ST_IC = { pendiente: 'circle-dashed', parcial: 'contrast', implantado: 'circle-check', 'no-aplica': 'circle-slash' };
const fwTag = (f, off = false, short = false) => `<span class="fwt fw-${fwCls(f)}${off ? ' off' : ''}"${short || fwLbl(f).length > 24 ? ` title="${esc(fwLbl(f))}"` : ''}><span class="fwt-l">${esc(short ? fwShort(f) : fwLbl(f))}</span></span>`;
const covPill = (st) => `<span class="pill ${esc(st)}">${icon(COV_IC[st] || 'info', 13)}${esc(t('cov.' + st))}</span>`;
const stPill = (st) => `<span class="pill ${esc(st)}">${icon(ST_IC[st], 13)}${esc(t('est.' + st))}</span>`;
const sevPill = (sv) => `<span class="pill ${sv === 'Alta' ? 'crit' : sv === 'Media' ? 'warn' : 'accent'}">${esc(t('sev.' + sv))}</span>`;
const entPill = (x) => `<span class="pill ent ${esc(x)}">${esc(t('ent.' + x))}</span>`;
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${esc(label ?? v)}</option>`;
const avatar = (size = 32) => `<span class="avatar c-${esc(ws.profile.color || 'rosa')}" style="--s:${size}px">${esc(initials(ws.profile.nombre))}</span>`;
const ucChip = (id) => `<button type="button" class="uc" data-act="insp-uc" data-id="${esc(id)}" data-tip="${esc(cT(id))}">${esc(id)}</button>`;
/* Origen de una equivalencia ENS ↔ ISO/IEC 27001: la pareja de la CCN-STIC 825 o criterio propio de Rosetta */
const esParCcn = (f, g) => (f === 'ens' && g === 'iso27001') || (f === 'iso27001' && g === 'ens');
const ccnTxt = (f, g, x) => (!esParCcn(f, g) ? '' : x.ccn ? t('ccnDe', t('ccnTipo.' + x.ccn.tipo)) : t('ccnPropio'));
/* Fila «CCN-STIC 825» de la ficha de una medida del ENS */
function ccnFicha(id) {
  const m = D.ccn825 && D.ccn825.medidas[id]; if (!m) return '';
  const cods = (l) => l.map((c) => reqCode('iso27001', c)).join(', ');
  return `<dt>${esc(t('ccnRow'))}</dt><dd>${esc(t('ccnMedida', t('ccnNivel.' + m.nivel), m.cat, cods(m.principal), cods(m.complementarios)))}</dd>`;
}
const ccnAviso = (f, id) => (f === 'ens' && D.ccn825 && D.ccn825.medidas[id] && D.ccn825.medidas[id].nivel === 'nula' ? `<div class="callout">${icon('info', 17)}<span>${esc(t('ccnNula'))}</span></div>` : '');
function reqChip(f, id, { fuerza = 'total', cov = null, origen = '' } = {}) {
  const tip = `${fwLbl(f)} ${reqCode(f, id)} · ${rT(f, id)}${fuerza !== 'total' ? ` (${t('fuerza.' + fuerza).toLowerCase()})` : ''}${cov ? ` · ${t('cov.' + cov)}` : ''}${origen ? ` · ${origen}` : ''}`;
  return `<button type="button" class="rq fw-${fwCls(f)} ${fuerza}${cov ? ' st-' + esc(cov) : ''}" data-act="insp-req" data-fw="${f}" data-id="${esc(id)}" data-tip="${esc(tip)}">${esc(reqCode(f, id))}</button>`;
}
/* Interruptor de cuatro posiciones para el estado de un control */
function stateSwitch(id, st, lg = false) {
  return `<span class="stsw${lg ? ' lg' : ''}" role="group" aria-label="${esc(t('stateOf', id))}">${E.ESTADOS.map((e) => `<button type="button" class="${e}" data-act="set-state" data-id="${esc(id)}" data-v="${e}" aria-pressed="${st === e}" aria-label="${esc(t('est.' + e))}"${lg ? '' : ` data-tip="${esc(t('est.' + e))}"`}>${icon(ST_IC[e], 16)}${lg ? `<span>${esc(t('est.' + e))}</span>` : ''}</button>`).join('')}</span>`;
}
const caseIcon = (id) => ({ techserv: 'server', hospital: 'hospital', lumen: 'sparkles', aguas: 'droplet', citafacil: 'cloud', alas: 'plane', sensorica: 'cpu', ribera: 'landmark' }[id] || 'building-complex');
function head(eyebrow, title, lead, actions = '') {
  return `<header class="head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</header>`;
}
function empty(ic, title, text, action = '') { return `<div class="empty">${icon(ic, 30)}<h3>${title}</h3><p>${text}</p>${action}</div>`; }
function miniRing(f, grado, cubiertos, n, size = 46, off = false) {
  const r = 18, c = 2 * Math.PI * r; const full = n ? cubiertos / n : 0; const g = Math.max(0, Math.min(1, grado));
  return `<svg class="mini-ring fw-${fwCls(f)}" width="${size}" height="${size}" viewBox="0 0 46 46" role="img" aria-label="${fwLbl(f)} ${pct(g)}"${off ? ' opacity=".5"' : ''}>
    <circle class="trk" cx="23" cy="23" r="${r}" fill="none" stroke-width="5"/>
    <circle class="prt" cx="23" cy="23" r="${r}" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - g)}" transform="rotate(-90 23 23)"/>
    <circle class="val" cx="23" cy="23" r="${r}" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - full)}" transform="rotate(-90 23 23)"/></svg>`;
}
function stackBar(x) {
  const n = x.aplicables || 1; const seg = (k, cls) => (x[k] ? `<i class="${cls}" style="width:${(x[k] / n) * 100}%" data-tip="${t('cov.' + (k === 'cubiertos' ? 'cubierto' : k === 'parciales' ? 'parcial' : 'brecha'))}: ${x[k]}"></i>` : '');
  return `<div class="bar" role="img" aria-label="${x.cubiertos} / ${x.parciales} / ${x.brechas}">${seg('cubiertos', 'ok')}${seg('parciales', 'warn')}${seg('brechas', 'crit')}</div>`;
}

/* ---------- Vistas y navegación ---------- */
const PROJECT_VIEWS = ['panel', 'traductor', 'controles', 'normas', 'brechas', 'plan', 'mapa', 'alcance', 'exportar'];
const GLOBAL_VIEWS = ['inicio', 'nuevo', 'perfil', 'ajustes', 'ayuda'];
const NAV = [['panel', 'orbit'], ['traductor', 'waypoints'], ['controles', 'layers'], ['normas', 'file-check'], ['brechas', 'shield-alert'], ['plan', 'square-kanban'], ['mapa', 'grid-3x3'], ['alcance', 'compass'], ['exportar', 'download']];
function go(view) {
  if (ui._tT) { clearTimeout(ui._tT); ui._tT = null; if (state) { recompute(); undoMark('texto'); saveProject(); } } // aplica lo que se estaba escribiendo antes de cambiar de vista
  ui.view = view; ui.railOpen = false; ui.pop = null; ui.sheet = false; ui.confirm = null; ui.trOpen = false; ui.wAnim = true;
  try { history.replaceState(null, '', '#' + view); } catch (e) { /* entorno aislado */ }
  render(); window.scrollTo({ top: 0 });
  const v = $('#view'); if (v) v.focus({ preventScroll: true });
}
/* Clave estable del elemento con foco (para recuperarlo tras redibujar con innerHTML aunque no tenga id) */
const FOCUS_ATTRS = ['act', 'id', 'v', 'fw', 'key', 'dir', 'view', 'pop', 'tab', 'case', 'k'];
function focusKey(el) {
  if (!el || !el.dataset || !el.dataset.act) return null;
  return FOCUS_ATTRS.filter((a) => el.dataset[a] !== undefined).map((a) => `[data-${a}="${CSS.escape(el.dataset[a])}"]`).join('');
}
function restoreFocus(key, scope) {
  if (!key) return;
  const host = (scope && scope.isConnected ? scope : null) || document;
  const ok = (x) => x.tabIndex >= 0 && !x.disabled && x.getClientRects().length > 0;
  const el = [...host.querySelectorAll(key)].find(ok) || [...document.querySelectorAll(key)].find(ok);
  if (el) el.focus({ preventScroll: true });
}
function render() {
  const ae = document.activeElement; const active = ae && ae.id;
  const fKey = !active && ae !== document.body ? focusKey(ae) : null;
  const fScope = ae && ae.closest ? (ae.closest('#insp') ? 'insp' : ae.closest('#dock') ? 'dock' : ae.closest('#tabbar') ? 'tabbar' : null) : null;
  let sel = null; try { if (ae && typeof ae.selectionStart === 'number') sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { sel = null; }
  applyRail(); $('#dock').innerHTML = renderDock();
  $('#tabbar').innerHTML = renderTabbar();
  const V = { inicio: vInicio, nuevo: vNuevo, perfil: vPerfil, ajustes: vAjustes, ayuda: vAyuda, panel: vOrbita, traductor: vPrisma, controles: vControles, normas: vNormas, mapa: vMapa, alcance: vAlcance, brechas: vBrechas, plan: vPlan, exportar: vExport };
  $('#view').innerHTML = !state && PROJECT_VIEWS.includes(ui.view) ? vNeedProject(ui.view) : (state && isDemo() && PROJECT_VIEWS.includes(ui.view) ? demoBanner() : '') + (V[ui.view] || vInicio)();
  renderInsp(); renderPop(); renderSheet(); renderPalette();
  if (ui.view === 'traductor') requestAnimationFrame(drawBeams);
  if (active) { const el = document.getElementById(active); if (el) { el.focus({ preventScroll: true }); if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* n/a */ } } } }
  else if (fKey && !(fScope === 'insp' && $('#insp').hidden) && (!document.activeElement || document.activeElement === document.body)) restoreFocus(fKey, fScope ? $('#' + fScope) : null);
}
function navBadge(v) {
  if (!state) return '';
  if (v === 'brechas') { const n = hall.filter((h) => h.sev === 'Alta').length; return n ? `<span class="badge-n">${n}</span>` : ''; }
  return '';
}
/* Raíl lateral: plegado si el usuario lo eligió (≥ 1241 px) o, entre 901 y 1240 px, salvo que se despliegue encima */
const railMedium = () => window.innerWidth > 900 && window.innerWidth <= 1240;
const railCollapsed = () => (railMedium() ? !ui.railOpen : !!ws.settings.railMin);
function applyRail() {
  const r = document.documentElement;
  if (!railMedium()) ui.railOpen = false;
  r.toggleAttribute('data-mini', railMedium() || !!ws.settings.railMin); // raíl compacto (se despliega encima al pasar el ratón)
  r.toggleAttribute('data-rail-open', railMedium() ? !!ui.railOpen : false);
}
function toggleRail() {
  if (railMedium()) ui.railOpen = !ui.railOpen; else { ws.settings.railMin = !ws.settings.railMin; saveWs(); }
  applyRail(); $('#dock').innerHTML = renderDock(); renderPop();
  setTimeout(() => { if (ui.view === 'traductor') drawBeams(); }, 320);
}
function renderDock() {
  const p = activeMeta(); const dark = isDark();
  const item = ([v, ic]) => `<button type="button" class="nav-i${state ? '' : ' locked'}" data-act="nav" data-view="${v}"${ui.view === v ? ' aria-current="page"' : ''}${!state ? ' aria-describedby="nav-note"' : ''} data-tip="${esc(t('nav.' + v))}">${icon(ic, 17)}<span class="lbl">${esc(t('nav.' + v))}</span>${navBadge(v)}${state ? '' : icon('lock', 13, 'lk')}</button>`;
  const cur = NAV.findIndex(([v]) => v === ui.view);
  return `<button type="button" class="brand" data-act="nav" data-view="inicio" aria-label="Rosetta · ${esc(t('nav.inicio'))}">${rosette(34)}<span><b>Rosetta</b><small>${esc(t('brandSub'))}</small></span></button><span class="rail-sp" aria-hidden="true"></span>
    <button type="button" class="ibtn rail-tg" data-act="rail-toggle" aria-expanded="${!railCollapsed()}" aria-label="${esc(t(railCollapsed() ? 'railOpen' : 'railClose'))}" data-tip="${esc(t(railCollapsed() ? 'railOpen' : 'railClose'))} · [">${icon(railCollapsed() ? 'chevron-right' : 'chevron-left', 17)}</button>
    <button type="button" class="proj-pill" data-act="pop" data-pop="proyectos" aria-haspopup="true" aria-expanded="${ui.pop === 'proyectos'}"><span class="dotc">${icon(state ? (p?.kind === 'demo' ? caseIcon(p.caseId) : 'building-complex') : 'folder', 15)}</span><span>${state ? esc(state.proyecto.nombre || '—') : esc(t('noProject'))}</span>${icon('chevron-down', 15)}</button>
    ${state ? '' : `<p class="nav-note" id="nav-note" role="note">${icon('info', 15)}<span><b>${esc(t('navNoteT'))}</b>${esc(t('navNoteTxt'))}</span></p>`}
    <nav class="nav" aria-label="${esc(t('sections'))}"${cur >= 0 ? ` data-cur style="--cur:${cur}"` : ''}><span class="nav-glow" aria-hidden="true"></span>${NAV.map(item).join('')}</nav>
    <div class="tools">
      <button type="button" class="search-pill" data-act="palette" aria-label="${esc(t('search'))}">${icon('search', 16)}<span class="lbl">${esc(t('search'))}</span><kbd>Ctrl K</kbd></button>
      <div class="acts"><div class="lang" role="group" aria-label="${esc(t('language'))}"><button type="button" data-act="lang" data-v="es" aria-pressed="${LANG() === 'es'}">ES</button><button type="button" data-act="lang" data-v="en" aria-pressed="${LANG() === 'en'}">EN</button></div>
      <button type="button" class="theme-sw${dark ? ' dark' : ''}" role="switch" aria-checked="${dark}" data-act="toggle-theme" aria-label="${esc(t('toTheme', dark))}">${icon('sun', 14, 'sun')}${icon('moon', 14, 'moon')}<span class="knob">${icon(dark ? 'moon' : 'sun', 15)}</span></button>
      <button type="button" class="ibtn acc-btn" data-act="pop" data-pop="acento" aria-label="${esc(t('accent'))}" aria-haspopup="true">${icon('palette', 18)}</button></div>
      <button type="button" class="avatar-btn" data-act="pop" data-pop="cuenta" aria-label="${esc(t('nav.perfil'))}" aria-haspopup="true">${avatar(34)}<span class="who"><b>${esc(ws.profile.nombre || t('noName'))}</b><small>${esc(ws.profile.rol || t('noRole'))}</small></span>${icon('ellipsis', 16, 'who-more')}</button>
    </div>`;
}
function renderTabbar() {
  const it = (v, ic) => `<button type="button" data-act="nav" data-view="${v}"${ui.view === v ? ' aria-current="page"' : ''}${!state && PROJECT_VIEWS.includes(v) ? ' class="locked"' : ''}>${icon(ic, 20)}<span>${esc(t('nav.' + v))}</span>${navBadge(v)}</button>`;
  return `${it('inicio', 'house')}${it('panel', 'orbit')}${it('traductor', 'waypoints')}${it('controles', 'layers')}<button type="button" data-act="sheet"${ui.sheet ? ' aria-current="page"' : ''}>${icon('ellipsis', 20)}<span>${esc(t('nav.mas'))}</span></button>`;
}
function renderSheet() {
  const host = $('#sheet');
  if (!ui.sheet) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false; const dark = isDark();
  const b = (v, ic) => `<button type="button" data-act="nav" data-view="${v}"${ui.view === v ? ' aria-current="page"' : ''}${!state && PROJECT_VIEWS.includes(v) ? ' class="locked"' : ''}>${icon(ic, 20)}${esc(t('nav.' + v))}</button>`;
  host.innerHTML = `<div class="overlay" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-label="${esc(t('nav.mas'))}">
    <div class="grid-i">${b('normas', 'file-check')}${b('brechas', 'shield-alert')}${b('plan', 'square-kanban')}${b('mapa', 'grid-3x3')}${b('alcance', 'compass')}${b('exportar', 'download')}${b('ayuda', 'circle-question-mark')}${b('ajustes', 'sliders-horizontal')}${b('perfil', 'user')}</div>
    <div class="row spread" style="margin-top:12px">
      <div class="lang" role="group" aria-label="${esc(t('language'))}"><button type="button" data-act="lang" data-v="es" aria-pressed="${LANG() === 'es'}">ES</button><button type="button" data-act="lang" data-v="en" aria-pressed="${LANG() === 'en'}">EN</button></div>
      <div class="swatches" style="padding:0">${ACCENTS.map((a) => `<button type="button" class="swatch sw-${a}${ws.settings.acento === a ? ' on' : ''}" data-act="accent" data-v="${a}" aria-label="${esc(t('accents.' + a))}"></button>`).join('')}</div>
      <button type="button" class="theme-sw${dark ? ' dark' : ''}" role="switch" aria-checked="${dark}" data-act="toggle-theme" aria-label="${esc(t('toTheme', dark))}">${icon('sun', 14, 'sun')}${icon('moon', 14, 'moon')}<span class="knob">${icon(dark ? 'moon' : 'sun', 15)}</span></button>
    </div></div>`;
}
/* Menús emergentes anclados al botón que los abre */
function renderPop() {
  document.querySelectorAll('.pop').forEach((x) => x.remove());
  if (!ui.pop) return;
  const anchor = document.querySelector(`[data-pop="${ui.pop}"]`); if (!anchor) return;
  const r = anchor.getBoundingClientRect(); const el = document.createElement('div'); el.className = 'pop'; el.setAttribute('role', 'menu');
  if (ui.pop === 'proyectos') {
    const own = ws.projects.filter((p) => p.kind === 'own'); const demos = ws.projects.filter((p) => p.kind === 'demo');
    const row = (p) => `<button type="button" class="pop-i${p.id === ws.activeId ? ' on' : ''}" data-act="open-project" data-id="${esc(p.id)}">${icon(p.kind === 'demo' ? caseIcon(p.caseId) : 'building-complex', 16)}<span>${esc(p.nombre)}</span>${p.id === ws.activeId ? icon('check', 16) : ''}</button>`;
    el.innerHTML = `${own.length ? `<div class="pop-l">${esc(t('myProjects'))}</div>${own.map(row).join('')}` : ''}${demos.length ? `<div class="pop-l">${esc(t('openCases'))}</div>${demos.map(row).join('')}` : ''}${own.length || demos.length ? '<div class="pop-sep"></div>' : ''}
      <button type="button" class="pop-i" data-act="nav" data-view="nuevo">${icon('plus', 16)}<span>${esc(t('newProject'))}</span></button>
      <button type="button" class="pop-i" data-act="import-ens">${icon('upload', 16)}<span>${esc(t('importEns'))}</span></button>
      <button type="button" class="pop-i" data-act="nav" data-view="inicio">${icon('house', 16)}<span>${esc(t('allProjects'))}</span></button>`;
  } else if (ui.pop === 'acento') {
    el.innerHTML = `<div class="pop-l">${esc(t('accent'))}</div><div class="swatches">${ACCENTS.map((a) => `<button type="button" class="swatch sw-${a}${ws.settings.acento === a ? ' on' : ''}" data-act="accent" data-v="${a}" aria-label="${esc(t('accents.' + a))}" data-tip="${esc(t('accents.' + a))}"></button>`).join('')}</div>`;
  } else if (ui.pop === 'cuenta') {
    el.innerHTML = `<div class="row" style="padding:8px 10px 10px">${avatar(40)}<div><b>${esc(ws.profile.nombre || t('noName'))}</b><div class="tiny muted">${esc(ws.profile.rol || t('noRole'))}</div></div></div><div class="pop-sep"></div>
      <button type="button" class="pop-i" data-act="nav" data-view="perfil">${icon('user', 16)}<span>${esc(t('nav.perfil'))}</span></button>
      <button type="button" class="pop-i" data-act="nav" data-view="ajustes">${icon('sliders-horizontal', 16)}<span>${esc(t('nav.ajustes'))}</span></button>
      <button type="button" class="pop-i" data-act="nav" data-view="ayuda">${icon('circle-question-mark', 16)}<span>${esc(t('nav.ayuda'))}</span></button>
      ${state ? `<div class="pop-sep"></div><button type="button" class="pop-i" data-act="nav" data-view="alcance">${icon('compass', 16)}<span>${esc(t('nav.alcance'))}</span></button><button type="button" class="pop-i" data-act="nav" data-view="exportar">${icon('download', 16)}<span>${esc(t('nav.exportar'))}</span></button>` : ''}`;
  }
  document.body.appendChild(el);
  const w = el.offsetWidth; const h = el.offsetHeight;
  if (window.innerWidth > 900 && anchor.closest('.dock')) { // raíl lateral: el menú se abre a la derecha del botón
    el.style.left = Math.min(window.innerWidth - w - 12, r.right + 12) + 'px';
    el.style.top = Math.max(12, Math.min(window.innerHeight - h - 12, r.top)) + 'px';
  } else {
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w > 12 && ui.pop !== 'proyectos' ? r.right - w : r.left));
    el.style.left = left + 'px'; el.style.top = r.bottom + 10 + 'px';
  }
}
function demoBanner() {
  const p = activeMeta();
  return `<div class="glass pane row spread demo-bar" style="padding:12px 16px"><div class="row">${icon('info', 18)}<span class="small"><b class="demo-long">${esc(t('demo'))}</b><b class="demo-short">${esc(t('demoShort'))}</b> <span class="demo-txt">${esc(t('demoTxt'))}</span></span></div>
    <div class="row"><button type="button" class="btn sm ghost" data-act="reset-case" data-case="${esc(p.caseId)}">${icon('rotate-ccw', 15)}${esc(t('reset'))}</button><button type="button" class="btn sm primary" data-act="nav" data-view="nuevo">${esc(t('startMine'))}${icon('arrow-right', 15)}</button></div></div>`;
}

/* ---------- Paleta de comandos ---------- */
function paletteItems() {
  const q = ui.paletteQ.trim();
  const items = [];
  for (const [v, ic] of [['inicio', 'house'], ...NAV, ['ayuda', 'circle-question-mark'], ['ajustes', 'sliders-horizontal'], ['perfil', 'user'], ['nuevo', 'plus']]) if (state || !PROJECT_VIEWS.includes(v)) items.push({ grupo: t('go'), label: t('nav.' + v), ic, act: () => go(v) });
  if (state) {
    items.push({ grupo: '⌘', label: t('exp')[0][1], ic: 'file-spreadsheet', act: () => exportXlsx() });
    items.push({ grupo: '⌘', label: t('exp')[1][1], ic: 'file-text', act: () => saveFile(`${slug()}_${LANG() === 'en' ? 'multi_framework_report' : 'informe_multinorma'}_${today()}.md`, informeMd()) });
  }
  items.push({ grupo: '⌘', label: t('toTheme', isDark()), ic: 'moon', act: () => { ws.settings.tema = isDark() ? 'claro' : 'oscuro'; saveWs(); applyTheme(); render(); } });
  items.push({ grupo: '⌘', label: LANG() === 'es' ? 'Switch to English' : 'Cambiar a español', ic: 'languages', act: () => setLang(LANG() === 'es' ? 'en' : 'es') });
  for (const c of D.casos) items.push({ grupo: t('cases'), label: c.titulo, ic: caseIcon(c.id), act: () => openCase(c.id) });
  if (q) {
    for (const f of FW) for (const r of CAT.frameworks[f].reqs) items.push({ grupo: fwLbl(f), label: `${reqCode(f, r.id)} · ${rT(f, r.id)}`, ic: 'file-check', act: () => openInsp('req', r.id, f), hint: state ? t('cov.' + calc.req[f].find((x) => x.id === r.id).estado) : '' });
    for (const c of CAT.controls) items.push({ grupo: t('nav.controles'), label: `${c.id} · ${cT(c.id)}`, ic: 'layers', act: () => openInsp('uc', c.id), hint: state ? t('est.' + calc.controles[c.id].estado) : '' });
  }
  const norm = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(q);
  return (q ? items.filter((it) => norm(it.label).includes(nq) || norm(it.grupo).includes(nq)) : items).slice(0, 60);
}
function renderPalette() {
  const host = $('#palette');
  if (!ui.palette) { const had = !host.hidden; host.hidden = true; host.innerHTML = ''; if (had && (!document.activeElement || document.activeElement === document.body)) { const r = ui._palReturn; if (typeof r === 'string') restoreFocus(r); else if (r && r.isConnected) r.focus({ preventScroll: true }); } return; }
  const items = paletteItems(); ui._pItems = items;
  if (ui.paletteIdx >= items.length) ui.paletteIdx = Math.max(0, items.length - 1);
  let last = ''; let html = '';
  items.forEach((it, i) => {
    if (it.grupo !== last) { html += `<div class="pal-g">${esc(it.grupo)}</div>`; last = it.grupo; }
    html += `<button type="button" class="pal-i${i === ui.paletteIdx ? ' on' : ''}" data-act="pal-run" data-i="${i}" id="pal-${i}" role="option" aria-selected="${i === ui.paletteIdx}" tabindex="-1">${icon(it.ic, 16)}<span>${esc(it.label)}</span>${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`;
  });
  const wasOpen = !host.hidden; host.hidden = false;
  if (!wasOpen || !$('#pal-q')) host.innerHTML = `<div class="overlay" data-act="pal-close"></div><div class="palette" role="dialog" aria-modal="true" aria-label="${esc(t('search'))}"><div class="pal-in">${icon('search', 18)}<input id="pal-q" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="${esc(t('search'))}" placeholder="${esc(t('searchPh'))}" value="${esc(ui.paletteQ)}" autocomplete="off"><kbd>Esc</kbd></div><div class="pal-list" id="pal-list" role="listbox" aria-label="${esc(t('search'))}"></div></div>`;
  $('#pal-list').innerHTML = html || `<div class="pal-e">${esc(t('noResults'))}</div>`;
  const on = $('#pal-' + ui.paletteIdx); if (on) on.scrollIntoView({ block: 'nearest' });
  if (on) $('#pal-q').setAttribute('aria-activedescendant', on.id); else $('#pal-q').removeAttribute('aria-activedescendant');
  if (!wasOpen) { ui._palReturn = document.activeElement !== document.body ? focusKey(document.activeElement) || document.activeElement : null; $('#pal-q').focus(); }
}
function openInsp(type, id, fw) {
  if (type === 'uc' && !IX.ucMap[id]) return;
  if (type === 'req' && !(FW.includes(fw) && IX.req[fw][id])) return;
  if (!state) return;
  if (!ui.insp) { const ae = document.activeElement; ui._inspReturn = ae && !ae.closest('#insp') ? focusKey(ae) : null; }
  ui.insp = { type, id, fw }; render();
  const x = $('#insp'); if (x) { x.scrollTop = 0; const h = x.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
}
function setLang(l) { ws.settings.lang = l === 'en' ? 'en' : 'es'; saveWs(); applyTheme(); recompute(); render(); }

/* ---------- Avisos ---------- */
let toastT = null;
function toast(msg, kind = 'ok', action = null) {
  const x = $('#toast'); const err = kind === 'error';
  x.setAttribute('role', err ? 'alert' : 'status'); x.classList.toggle('err', err);
  x.innerHTML = `${icon(err ? 'triangle-alert' : 'circle-check', 16)}<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-act" data-act="${esc(action.act)}">${icon('undo-2', 15)}${esc(action.label)}</button>` : ''}`; x.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { x.hidden = true; }, err ? 7000 : Math.max(action ? 5000 : 2800, 1500 + msg.length * 45));
}


/* Vista de proyecto sin proyecto abierto: explica qué muestra y ofrece las tres formas de empezar */
function vNeedProject(v) {
  const ic = (NAV.find(([x]) => x === v) || [, 'folder'])[1];
  return `${head(`${icon(ic, 14)}${esc(t('needEyebrow'))}`, esc(t('nav.' + v)), esc(t('needLead', t('viewDesc.' + v))))}
  <div class="starts">
    <button type="button" class="start primary" data-act="nav" data-view="nuevo"><span class="ico">${icon('plus', 22)}</span><b>${esc(t('stNew'))}</b><span>${esc(t('stNewTxt'))}</span><em>${esc(t('stNewCta'))}${icon('arrow-right', 16)}</em></button>
    <button type="button" class="start" data-act="import-ens"><span class="ico">${icon('upload', 22)}</span><b>${esc(t('stImp'))}</b><span>${esc(t('stImpTxt'))}</span><em>${esc(t('stImpCta'))}${icon('arrow-right', 16)}</em></button>
    <button type="button" class="start" data-act="open-case" data-case="techserv" data-then="${esc(v)}"><span class="ico">${icon('book-open', 22)}</span><b>${esc(t('needCase'))}</b><span>${esc(t('needCaseTxt'))}</span><em>${esc(t('openCase'))}${icon('arrow-right', 16)}</em></button>
  </div>`;
}
