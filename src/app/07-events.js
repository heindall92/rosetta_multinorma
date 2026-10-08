/* ---------- Eventos ---------- */
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function setPath(obj, path, value, schema = 'state') {
  const ks = String(path).split('.');
  if (ks.some((k) => BAD_KEYS.has(k))) return false; // defensa ante prototype pollution
  // Solo rutas conocidas del modelo (lista blanca)
  const okState = (ks[0] === 'controles' && UC_IDS.has(ks[1]) && ['estado', 'responsable', 'evidencias', 'revision', 'notas'].includes(ks[2]) && ks.length === 3)
    || (ks[0] === 'proyecto' && ['nombre', 'organizacion', 'descripcion', 'sector'].includes(ks[1]) && ks.length === 2)
    || (ks[0] === 'alcance' && FW.includes(ks[1]) && ((['on', 'motivo'].includes(ks[2]) && ks.length === 3) || (ks[1] === 'ens' && ks[2] === 'categoria' && ks.length === 3) || (ks[1] === 'ens' && ks[2] === 'niveles' && E.DIMS.includes(ks[3]) && ks.length === 4) || (ks[1] === 'partis' && ks[2] === 'regimen' && ks.length === 3) || (ks[1] === 'ria' && ['rol', 'alto', 'transparencia', 'gpai'].includes(ks[2]) && ks.length === 3) || (ks[1] === 'cra' && ks[2] === 'clase' && ks.length === 3)))
    || (ks[0] === 'perfil' && has(E.PERFIL_DEF, ks[1]) && ks.length === 2)
    || (ks[0] === 'nis2q' && ['sector', 'especial', 'tamano', 'infraDigital'].includes(ks[1]) && ks.length === 2);
  const ok = schema === 'ws' ? ((ks[0] === 'profile' || ks[0] === 'settings') && ks.length === 2)
    : schema === 'wz' ? (okState && ks[0] !== 'controles' && ks[0] !== 'proyecto') || (['organizacion', 'descripcion', 'sector', 'inicio'].includes(ks[0]) && ks.length === 1)
      : okState;
  if (!ok) return false;
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (!has(o, k) || o[k] === null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  const last = ks[ks.length - 1];
  if (value === '' && ks[2] === 'niveles') delete o[last];
  else if (ks[0] === 'controles' && last === 'estado') o[last] = oneOf(value, E.ESTADOS, 'pendiente');
  else if (ks[0] === 'controles' && last === 'revision') o[last] = dateOk(value);
  else if (ks[0] === 'alcance' && last === 'categoria') o[last] = oneOf(value, CATS_ENS, 'MEDIA');
  else if (ks[0] === 'alcance' && ks[2] === 'niveles') o[last] = oneOf(value, E.NIVELES_ENS, undefined);
  else if (ks[0] === 'alcance' && last === 'regimen') o[last] = oneOf(value, PARTIS_REG, 'I');
  else if (ks[0] === 'alcance' && ks[1] === 'ria' && ['rol', 'alto', 'transparencia', 'gpai'].includes(last)) o[last] = E.riaAlcance({ [last]: value })[last];
  else if (ks[0] === 'alcance' && ks[1] === 'cra' && last === 'clase') o[last] = E.craAlcance({ [last]: value })[last];
  else if (ks[0] === 'alcance' && last === 'motivo') o[last] = s(value, 300);
  else if (ks[0] === 'perfil') o[last] = typeof E.PERFIL_DEF[last] === 'boolean' ? value === true : E.perfilNormalizado({ [last]: value })[last];
  else o[last] = typeof value === 'string' ? s(value) : value;
  return true;
}
function readVal(el) { return el.type === 'checkbox' || el.dataset.type === 'bool' ? !!el.checked : el.value; }
function pickFile(accept, cb) {
  const inp = $('#file-any'); inp.accept = accept; inp.value = '';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) cb(f); };
  inp.click();
}
const readText = (f, cb) => { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.onerror = () => toast(t('tReadFail'), 'error'); r.readAsText(f); };
function syncNis2(obj) { obj.alcance.nis2.tipo = E.nis2Aplicabilidad(obj.nis2q).tipo; }
function setState(id, v) {
  if (!state || !UC_IDS.has(id) || !E.ESTADOS.includes(v)) return;
  const d = state.controles[id]; if (d.estado === v) return;
  d.estado = v; if ((v === 'implantado' || v === 'parcial') && !d.revision) d.revision = today();
  commit(t('tState', id, t('est.' + v)));
}

/* Los campos de texto se guardan mientras se escribe y no redibujan la vista al perder el foco:
 * así un clic en un botón justo después de escribir nunca se pierde. */
const esTexto = (el) => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['text', 'search', 'email', ''].includes(el.type));
function refrescoLigero(k) { recompute(); undoMark(k || 'texto'); saveProject(); $('#dock').innerHTML = renderDock(); $('#tabbar').innerHTML = renderTabbar(); }
function planField(el) {
  const a = plan.find((x) => x.key === el.dataset.plan); if (!a || !UC_IDS.has(a.key)) return false;
  const f = oneOf(el.dataset.f, ['responsable', 'fecha'], null); if (!f) return false;
  const val = f === 'fecha' ? dateOk(el.value) : s(el.value, 200);
  state.acciones[a.key] = { estado: a.estado, responsable: a.responsable, fecha: a.fecha, nota: a.nota, ...(state.acciones[a.key] || {}), [f]: val };
  a[f] = val; // el plan en memoria queda al día aunque aún no se haya recalculado (exportar justo después de escribir)
  return true;
}
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (esTexto(el) && (el.dataset.ws || el.dataset.set || el.dataset.wz || el.dataset.plan || el.dataset.exfw)) {
    if (el.dataset.exfw && state && has(state.exclusiones[el.dataset.exfw] || {}, el.dataset.exid)) toast(t('tJust'));
    return; // ya guardado en «input»
  }
  if (el.dataset.uibool) { ui[el.dataset.uibool] = el.checked; render(); return; }
  if (el.dataset.exsw && state) {
    const f = el.dataset.fw, id = el.dataset.id; if (!FW.includes(f) || !IX.req[f][id] || !E.excluible(f, id)) return;
    if (el.checked) { state.exclusiones[f][id] = ''; commit(t('tExcl', `${fwLbl(f)} ${reqCode(f, id)}`)); const inp = document.getElementById(`ex-${f}-${id}`); if (inp) inp.focus(); }
    else { delete state.exclusiones[f][id]; commit(t('tIncl', `${fwLbl(f)} ${reqCode(f, id)}`)); }
    return;
  }
  if (el.dataset.ws) { if (setPath(ws, el.dataset.ws, readVal(el), 'ws')) { const clean = sanitizeWs(ws); ws.settings = clean.settings; ws.profile = clean.profile; saveWs(); recompute(); render(); } return; }
  if (el.dataset.wz) { const w = ui.wizard; if (w && setPath(w, el.dataset.wz, readVal(el), 'wz')) { if (el.dataset.wz.startsWith('nis2q.')) { const tp = E.nis2Aplicabilidad(w.nis2q).tipo; if (tp === 'esencial' || tp === 'importante') w.alcance.nis2.on = true; } if (el.dataset.wz === 'perfil.aviacion' && w.perfil.aviacion !== 'no') w.alcance.partis.regimen = w.perfil.aviacion; w.error = ''; render(); } return; }
  if (el.dataset.rule) { const st = new Set(ws.settings.reglasOff); el.checked ? st.delete(el.dataset.rule) : st.add(el.dataset.rule); ws.settings.reglasOff = [...st]; saveWs(); recompute(); render(); return; }
  if (el.dataset.plan && state) { if (planField(el)) commit(); return; }
  if (el.dataset.mpfz && state) { const r = mpReq(el.dataset.mpfz, el.dataset.req); const c = r && r.controles.find((x) => x.control === el.dataset.ctl); const w = Number(el.value); if (c && [0, 0.5, 1].includes(w)) { c.w = w; commit(t('tMpFz', c.control, t('mpFz.' + W_FUERZA(w)))); } return; }
  if (el.dataset.mpadd && state) { mpAdd(el.dataset.mpadd, el.dataset.req, el.value); return; }
  const path = el.dataset.set; if (!path || !state) return;
  const v = readVal(el);
  if (!setPath(state, path, v)) return;
  if (path.startsWith('nis2q.')) { syncNis2(state); const tp = state.alcance.nis2.tipo; if ((tp === 'esencial' || tp === 'importante') && !state.alcance.nis2.on) { state.alcance.nis2.on = true; toast(t('tNis2On')); } }
  if (path === 'perfil.aviacion' && state.perfil.aviacion !== 'no') state.alcance.partis.regimen = state.perfil.aviacion;
  if (path.startsWith('alcance.ens.niveles')) { const c = E.categoriaDeNiveles(state.alcance.ens.niveles); if (c) state.alcance.ens.categoria = c; }
  if (path === 'alcance.ens.categoria') state.alcance.ens.categoria = E.categoriaEfectiva(state.alcance.ens); // nunca por debajo de los niveles
  if (/^controles\.[^.]+\.estado$/.test(path)) { const d = state.controles[path.split('.')[1]]; if ((v === 'implantado' || v === 'parcial') && !d.revision) d.revision = today(); }
  commit();
});
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.uiq) { ui[el.dataset.uiq] = s(el.value, 200); clearTimeout(ui._qT); ui._qT = setTimeout(render, 150); return; }
  if (el.id === 'tr-q') { ui.trQ = s(el.value, 200); ui.trOpen = true; ui.trIdx = 0; clearTimeout(ui._qT); ui._qT = setTimeout(render, 120); return; }
  if (el.id === 'help-q') { ui.helpQ = s(el.value, 200); clearTimeout(ui._qT); ui._qT = setTimeout(render, 150); return; }
  if (el.id === 'glo-q') { ui.glosarioQ = s(el.value, 200); clearTimeout(ui._qT); ui._qT = setTimeout(render, 150); return; }
  if (el.id === 'pal-q') { ui.paletteQ = s(el.value, 200); ui.paletteIdx = 0; renderPalette(); return; }
  if (!esTexto(el)) return;
  if (el.dataset.exfw && state) { const f = el.dataset.exfw, id = el.dataset.exid; if (FW.includes(f) && IX.req[f][id] && has(state.exclusiones[f], id)) { state.exclusiones[f][id] = s(el.value, 1000); clearTimeout(ui._tT); ui._tT = setTimeout(refrescoLigero, 400); } return; }
  if (el.dataset.plan && state) { if (planField(el)) { clearTimeout(ui._tT); ui._tT = setTimeout(refrescoLigero, 400); } return; }
  if (el.dataset.set && state) { if (setPath(state, el.dataset.set, el.value)) { clearTimeout(ui._tT); ui._tT = setTimeout(refrescoLigero, 400); } return; }
  if (el.dataset.wz && ui.wizard) { setPath(ui.wizard, el.dataset.wz, el.value, 'wz'); ui.wizard.error = ''; return; }
  if (el.dataset.ws) { if (setPath(ws, el.dataset.ws, s(el.value, 160), 'ws')) { saveWs(); $('#dock').innerHTML = renderDock(); } }
});
document.addEventListener('focusin', (ev) => { if (ev.target.id === 'tr-q' && !ui.trOpen) { ui.trOpen = true; ui.trIdx = 0; render(); } });

/* ---------- Teclado ---------- */
let gPending = false;
function closeLayers() {
  if (ui.railOpen) { ui.railOpen = false; applyRail(); $('#dock').innerHTML = renderDock(); return true; }
  if (ui.palette) { ui.palette = false; renderPalette(); return true; }
  if (ui.pop) { const was = ui.pop; ui.pop = null; renderPop(); const tr = document.querySelector(`#dock [data-pop="${was}"]`); if (tr) tr.focus({ preventScroll: true }); return true; }
  if (ui.sheet) { ui.sheet = false; renderSheet(); render(); return true; }
  if (ui.trOpen) { ui.trOpen = false; render(); return true; }
  if (ui.insp) { closeLayersInsp(); return true; }
  if (ui.confirm) { ui.confirm = null; render(); return true; }
  return false;
}
document.addEventListener('keydown', (ev) => {
  const tg = ev.target; const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) && tg.id !== 'pal-q' && tg.id !== 'tr-q';
  if ((ev.ctrlKey || ev.metaKey) && !typing && state && (ev.key.toLowerCase() === 'z' || ev.key.toLowerCase() === 'y')) { ev.preventDefault(); undo(ev.key.toLowerCase() === 'y' || ev.shiftKey); return; }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); ui.palette = !ui.palette; ui.paletteQ = ''; ui.paletteIdx = 0; renderPalette(); return; }
  if (ui.palette) {
    const items = ui._pItems || [];
    if (ev.key === 'Escape') { ui.palette = false; renderPalette(); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); $('#pal-q').focus(); return; } // diálogo modal: el foco no sale de la paleta
    if (ev.key === 'ArrowDown') { ev.preventDefault(); ui.paletteIdx = Math.min(items.length - 1, ui.paletteIdx + 1); renderPalette(); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); ui.paletteIdx = Math.max(0, ui.paletteIdx - 1); renderPalette(); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); const it = items[ui.paletteIdx]; ui.palette = false; renderPalette(); if (it) it.act(); return; }
    return;
  }
  if (tg.id === 'tr-q') { // buscador del Prisma: flechas, Intro y Escape
    const list = prismResults();
    if (ev.key === 'ArrowDown') { ev.preventDefault(); ui.trOpen = true; ui.trIdx = Math.min(list.length - 1, ui.trIdx + 1); render(); const o = $('#tri-' + ui.trIdx); if (o) o.scrollIntoView({ block: 'nearest' }); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); ui.trIdx = Math.max(0, ui.trIdx - 1); render(); const o = $('#tri-' + ui.trIdx); if (o) o.scrollIntoView({ block: 'nearest' }); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); const it = list[ui.trIdx]; if (it) { ui.trId = it.id; ui.trOpen = false; ui.trQ = ''; render(); } return; }
    if (ev.key === 'Escape') { ev.preventDefault(); ui.trOpen = false; tg.blur(); render(); return; }
    return;
  }
  if (ui.pop && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && tg.closest && tg.closest('.pop')) {
    ev.preventDefault(); const its = [...document.querySelectorAll('.pop button')]; const i = its.indexOf(tg);
    const nx = its[(i + (ev.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length]; if (nx) nx.focus(); return;
  }
  if (ev.key === 'Escape') { if (closeLayers()) ev.preventDefault(); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && tg.getAttribute && tg.getAttribute('role') === 'button' && tg.dataset.act && tg.tagName !== 'BUTTON') { ev.preventDefault(); tg.click(); return; }
  if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === '/') { const q = $('#uc-q') || $('#tr-q') || $('#norma-q') || $('#mapa-q') || $('#help-q') || $('#glo-q'); ev.preventDefault(); if (q) q.focus(); else { ui.palette = true; ui.paletteQ = ''; renderPalette(); } return; }
  if (ev.key === '?') { ui.helpTab = 'atajos'; go('ayuda'); return; }
  if (ev.key === '[') { ev.preventDefault(); toggleRail(); return; }
  if (ev.key.toLowerCase() === 'g') { gPending = true; setTimeout(() => { gPending = false; }, 900); return; }
  if (gPending) { gPending = false; const m = { o: 'panel', p: 'traductor', c: 'controles', n: 'normas', m: 'mapa', b: 'brechas', l: 'plan', i: 'inicio', a: 'alcance', e: 'exportar' }[ev.key.toLowerCase()]; if (m) go(m); }
});
document.addEventListener('toggle', (ev) => { const k = ev.target && ev.target.dataset && ev.target.dataset.keep; if (k) ui[k] = ev.target.open; }, true);

/* ---------- Tooltip ligero para [data-tip] (texto plano: textContent) y núcleo vivo de la rueda ---------- */
const tipEl = () => $('#tip');
let hoverSpoke = null;
document.addEventListener('mouseover', (ev) => {
  const tg = ev.target; const tp = tipEl();
  const sp = tg.closest ? tg.closest('.wheel:not(.hero) .spoke') : null;
  if (sp !== hoverSpoke) { hoverSpoke = sp; wheelHover(sp); }
  const el = tg.closest && tg.closest('[data-tip]');
  if (!el || (el.classList.contains('nav-i') && el.querySelector('.lbl') && el.querySelector('.lbl').offsetParent)) { tp.hidden = true; return; } // con la etiqueta a la vista sobra el tooltip
  tp.textContent = el.getAttribute('data-tip'); tp.hidden = false;
  const r = el.getBoundingClientRect(); const tw = tp.offsetWidth;
  tp.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + 'px';
  const above = r.top - tp.offsetHeight - 8; tp.style.top = (above < 8 ? r.bottom + 8 : above) + 'px';
});
document.addEventListener('scroll', () => { tipEl().hidden = true; }, true);

/* ---------- Arrastrar y soltar en el tablero del plan ---------- */
let dragKey = null;
document.addEventListener('dragstart', (ev) => { const c = ev.target.closest && ev.target.closest('.card-k'); if (!c) return; if (ev.target.closest('input')) { ev.preventDefault(); return; } dragKey = c.dataset.key; c.classList.add('dragging'); try { ev.dataTransfer.setData('text/plain', dragKey); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { /* n/a */ } });
document.addEventListener('dragend', (ev) => { const c = ev.target.closest && ev.target.closest('.card-k'); if (c) c.classList.remove('dragging'); document.querySelectorAll('.lanek.over').forEach((x) => x.classList.remove('over')); dragKey = null; });
document.addEventListener('dragover', (ev) => { const l = ev.target.closest && ev.target.closest('.lanek'); if (!l || !dragKey) return; ev.preventDefault(); document.querySelectorAll('.lanek.over').forEach((x) => { if (x !== l) x.classList.remove('over'); }); l.classList.add('over'); });
document.addEventListener('drop', (ev) => { const l = ev.target.closest && ev.target.closest('.lanek'); if (!l || !dragKey) return; ev.preventDefault(); const k = dragKey; dragKey = null; l.classList.remove('over'); moveAction(k, l.dataset.lane); });

/* ---------- Clics ---------- */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act], [data-pop]');
  if (ui.pop && !ev.target.closest('.pop') && !(el && el.dataset.pop)) { ui.pop = null; renderPop(); $('#dock').innerHTML = renderDock(); }
  if (ui.trOpen && !ev.target.closest('.prism-pick')) { ui.trOpen = false; render(); }
  if (ui.railOpen && !ev.target.closest('#dock') && !ev.target.closest('.pop')) { ui.railOpen = false; applyRail(); $('#dock').innerHTML = renderDock(); }
  if (!el || el.disabled) return;
  if (el.dataset.pop && !el.dataset.act) return;
  const act = el.dataset.act; const i = el.dataset.i !== undefined ? +el.dataset.i : null;
  switch (act) {
    case 'nav': if (el.dataset.view === 'nuevo' && ui.view !== 'nuevo') ui.wizard = null; go(el.dataset.view); break;
    case 'pop': { const k = el.dataset.pop; ui.pop = ui.pop === k ? null : k; $('#dock').innerHTML = renderDock(); renderPop();
      const first = ui.pop && document.querySelector('.pop .pop-i, .pop button'); const tr = document.querySelector(`#dock [data-pop="${k}"]`);
      if (first) first.focus({ preventScroll: true }); else if (tr) tr.focus({ preventScroll: true }); break; }
    case 'sheet': ui.sheet = !ui.sheet; render(); break;
    case 'sheet-close': ui.sheet = false; render(); break;
    case 'lang': setLang(el.dataset.v); ui.pop = null; renderPop(); break;
    case 'toggle-theme': {
      const dark = !isDark(); ws.settings.tema = dark ? 'oscuro' : 'claro'; saveWs(); applyTheme();
      document.querySelectorAll('.theme-sw').forEach((b) => { b.classList.toggle('dark', dark); b.setAttribute('aria-checked', String(dark)); });
      setTimeout(render, 320); break;
    }
    case 'accent': if (ACCENTS.includes(el.dataset.v)) { ws.settings.acento = el.dataset.v; saveWs(); applyTheme(); render(); } break;
    case 'set': { const k = el.dataset.k; const allowed = { tema: ['sistema', 'claro', 'oscuro'], densidad: ['comoda', 'compacta'] }; if (allowed[k] && allowed[k].includes(el.dataset.v)) { ws.settings[k] = el.dataset.v; saveWs(); applyTheme(); render(); } break; }
    case 'set-color': if (COLOR_IDS.includes(el.dataset.c)) { ws.profile.color = el.dataset.c; saveWs(); render(); } break;
    case 'rail-toggle': toggleRail(); break;
    case 'palette': ui.palette = true; ui.paletteQ = ''; ui.paletteIdx = 0; renderPalette(); break;
    case 'pal-close': ui.palette = false; renderPalette(); break;
    case 'pal-run': { const it = (ui._pItems || [])[i]; ui.palette = false; renderPalette(); if (it) it.act(); break; }
    case 'help-tab': ui.helpTab = el.dataset.tab; render(); break;
    case 'help-topic': { const g = document.getElementById('help-' + el.dataset.id); if (g) { g.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); const d = g.querySelector('details'); if (d) { d.open = true; d.querySelector('summary').focus({ preventScroll: true }); } } break; }
    case 'scroll-casos': ev.preventDefault(); { const c = $('#casos'); if (c) c.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); else { ws.settings.mostrarCasos = true; saveWs(); render(); const c2 = $('#casos'); if (c2) c2.scrollIntoView({ block: 'start' }); } } break;
    /* proyectos */
    case 'open-project': ui.pop = null; openProject(el.dataset.id); break;
    case 'open-case': ui.pop = null; openCase(el.dataset.case, PROJECT_VIEWS.includes(el.dataset.then) ? el.dataset.then : 'panel'); break;
    case 'reset-case': resetCase(el.dataset.case); break;
    case 'close-demos': for (const p of ws.projects.filter((x) => x.kind === 'demo')) deleteProject(p.id); render(); toast(t('tCasesClosed')); break;
    case 'ask': ui.confirm = el.dataset.what; render(); break;
    case 'perfil-aplicar': if (state) { perfilAplicar(state, FW); state.perfil.confirmado = today(); syncNis2(state); commit(t('tPerfil')); } break;
    case 'wz-perfil-aplicar': if (ui.wizard) { perfilAplicar(ui.wizard, FW_BASE); ui.wizard.error = ''; render(); toast(t('tPerfil')); } break;
    case 'mp-import': if (state) pickFile('.json,.csv,application/json,text/csv', mpImport); break;
    case 'mp-tpl-json': saveFile(LANG() === 'en' ? 'rosetta_framework_template.json' : 'plantilla_marco_rosetta.json', JSON.stringify(mpPlantilla(), null, 2)); break;
    case 'mp-tpl-csv': saveFile(LANG() === 'en' ? 'rosetta_framework_template.csv' : 'plantilla_marco_rosetta.csv', mpPlantillaCsv()); break;
    case 'mp-open': ui.mpOpen = ui.mpOpen === el.dataset.fw ? null : el.dataset.fw; ui.mpAll = false; render(); break;
    case 'mp-all': ui.mpAll = true; render(); break;
    case 'mp-export': mpExport(el.dataset.fw); break;
    case 'mp-del': mpDel(el.dataset.fw); break;
    case 'mp-add': mpAdd(el.dataset.fw, el.dataset.req, el.dataset.ctl); break;
    case 'mp-rm': { const r = mpReq(el.dataset.fw, el.dataset.req); if (r) { r.controles = r.controles.filter((c) => c.control !== el.dataset.ctl); commit(t('tMpRm', el.dataset.ctl)); } break; }
    case 'confirm-no': ui.confirm = null; render(); break;
    case 'del-project': deleteProject(el.dataset.id); ui.confirm = null; render(); toast(t('tDeleted')); break;
    case 'wipe': for (const p of ws.projects) store.del(PKEY(p.id)); store.del(WS_KEY); ws = sanitizeWs(null); state = null; recompute(); applyTheme(); ui.confirm = null; ui.insp = null; go('inicio'); toast(t('tWiped')); break;
    case 'ob-save': ws.profileDone = true; saveWs(); render(); toast(ws.profile.nombre ? t('tHi', ws.profile.nombre.split(' ')[0]) : t('tProfile')); break;
    case 'ob-skip': ws.profileDone = true; saveWs(); render(); break;
    case 'backup': backup(); break;
    case 'restore': case 'import-json': pickFile('.json,application/json', (f) => checkSize(f, LIM.fileJson, t('fileIs')) && readText(f, importProyecto)); break;
    case 'import-ens': ui.pop = null; renderPop(); pickFile('.xlsx,.json,application/json', (f) => importEns(f, 'nuevo')); break;
    case 'import-ens-into': pickFile('.xlsx,.json,application/json', (f) => importEns(f, 'actual')); break;
    /* asistente */
    case 'wz-ens-file': pickFile('.xlsx,.json,application/json', (f) => importEns(f, 'wizard')); break;
    case 'wz-back': ui.wizard.step--; ui.wizard.error = ''; render(); break;
    case 'wz-next': { const w = ui.wizard;
      if (w.step === 1 && (blank(w.organizacion) || blank(w.descripcion))) { w.error = t('errOrg'); render(); break; }
      if (w.step === 2 && !FW_BASE.some((f) => w.alcance[f].on)) { w.error = t('errFw'); render(); break; }
      w.step++; w.error = ''; render(); break; }
    case 'wz-create': { const w = ui.wizard;
      if (w.inicio === 'ens' && !w.ensSoa) { w.error = t('errFile'); render(); break; }
      const alc = clone(w.alcance); alc.nis2.tipo = E.nis2Aplicabilidad(w.nis2q).tipo;
      const st = blankState({ organizacion: w.organizacion, descripcion: w.descripcion, sector: w.sector, nombre: w.organizacion, alcance: alc, nis2q: clone(w.nis2q), perfil: clone(w.perfil) });
      if (w.inicio === 'todo') for (const c of CAT0.controls) st.controles[c.id].estado = 'parcial';
      let h = 0; if (w.inicio === 'ens') h = aplicaImportEns(st, w.ensSoa);
      ui.wizard = null; createProject(st, { msg: h ? t('tCreatedEns', h) : t('tCreated') }); break; }
    /* inspector y estado de controles */
    case 'insp-uc': openInsp('uc', el.dataset.id); break;
    case 'insp-req': if (FW.includes(el.dataset.fw)) openInsp('req', el.dataset.id, el.dataset.fw); break;
    case 'insp-close': closeLayersInsp(); break;
    case 'set-state': ev.stopPropagation(); setState(el.dataset.id, el.dataset.v); break;
    /* navegación del proyecto */
    case 'goto-norma': if (FW.includes(el.dataset.fw)) { ui.normaFw = el.dataset.fw; ui.normaEstado = 'todos'; go('normas'); } break;
    case 'goto-brechas': ui.brechaSev = ['Alta', 'Media', 'Baja'].includes(el.dataset.v) ? el.dataset.v : 'todas'; go('brechas'); break;
    case 'tr-fw': if (FW.includes(el.dataset.fw) && el.dataset.fw !== ui.trFw) { ui.trFw = el.dataset.fw; ui.trId = null; ui.trQ = ''; ui.trIdx = 0; render(); } break;
    case 'tr-pick': ui.trId = el.dataset.id; ui.trOpen = false; ui.trQ = ''; render(); break;
    case 'tr-center': { const f = el.dataset.fw, id = el.dataset.id; if (!FW.includes(f) || !IX.req[f][id]) break; ui.trFw = f; ui.trId = id; ui.trQ = ''; ui.trOpen = false; ui.insp = null; if (ui.view !== 'traductor') go('traductor'); else { render(); const st = $('.stage'); if (st && st.getBoundingClientRect().top < 60) st.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); } break; }
    case 'uc-fw': ui.ucFw = ['todos', ...FW].includes(el.dataset.v) ? el.dataset.v : 'todos'; render(); break;
    case 'uc-estado': ui.ucEstado = ['todos', ...E.ESTADOS].includes(el.dataset.v) ? el.dataset.v : 'todos'; render(); break;
    case 'norma-fw': if (FW.includes(el.dataset.fw)) { ui.normaFw = el.dataset.fw; render(); } break;
    case 'norma-estado': ui.normaEstado = el.dataset.v; render(); break;
    case 'brecha-sev': ui.brechaSev = ui.brechaSev === el.dataset.v || !['Alta', 'Media', 'Baja'].includes(el.dataset.v) ? 'todas' : el.dataset.v; render(); break;
    case 'plan-start': { const id = el.dataset.id; if (!UC_IDS.has(id)) break; const a = plan.find((x) => x.key === id); state.acciones[id] = { estado: 'En curso', responsable: a ? a.responsable : '', fecha: a ? a.fecha : '', nota: '', ...(state.acciones[id] || {}), estado: 'En curso' }; commit(t('tStarted', id)); openInsp('uc', id); break; }
    case 'plan-move': { const a = plan.find((x) => x.key === el.dataset.key); if (!a) break; const li = LANES.indexOf(laneOf(a)) + (el.dataset.dir === '1' ? 1 : -1); if (li >= 0 && li < LANES.length) moveAction(a.key, LANES[li]); break; }
    case 'plan-all': ui.planAll = true; render(); break;
    case 'undo': undo(); break;
    /* exportaciones */
    case 'export-xlsx': exportXlsx(); break;
    case 'export-md': saveFile(fname('report', 'md'), informeMd()); break;
    case 'export-plan': saveFile(fname('plan', 'csv'), planCsv()); break;
    case 'export-ctl': saveFile(fname('ctl', 'csv'), ctlCsv()); break;
    case 'export-json': saveFile(fname('proj', 'json'), JSON.stringify(state, null, 1)); break;
    default: break;
  }
});
function closeLayersInsp() {
  const back = ui.insp; ui.insp = null; render();
  if (ui._inspReturn) { restoreFocus(ui._inspReturn); ui._inspReturn = null; } // vuelve al elemento que abrió el inspector
  if ((!document.activeElement || document.activeElement === document.body) && back && back.type === 'uc') { const el = document.getElementById('uc-' + back.id); if (el) el.focus({ preventScroll: true }); }
}

/* Barra lateral: el resaltado sigue al puntero (la posición la fija --g; ver rosetta.css) */
document.addEventListener('pointerover', (ev) => {
  const nav = document.querySelector('#dock .nav'); if (!nav) return;
  const it = ev.target.closest && ev.target.closest('#dock .nav-i');
  if (it && !it.disabled) { nav.style.setProperty('--g', [...nav.querySelectorAll('.nav-i')].indexOf(it)); nav.classList.add('hov'); }
  else if (!(ev.target.closest && ev.target.closest('#dock .nav'))) { nav.style.removeProperty('--g'); nav.classList.remove('hov'); }
});

/* Barra lateral compacta: se despliega mientras el foco de teclado está dentro (clase .kb; ver rosetta.css) */
document.addEventListener('focusin', (ev) => { const d = document.getElementById('dock'); if (d) d.classList.toggle('kb', !!(ev.target.closest && ev.target.closest('#dock') && ev.target.matches(':focus-visible'))); });
document.addEventListener('focusout', (ev) => { const d = document.getElementById('dock'); if (d && !(ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest('#dock'))) d.classList.remove('kb'); });

/* Redibujar los haces del Prisma y recolocar menús al cambiar el tamaño */
let rzT = null;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { applyRail(); $('#dock').innerHTML = renderDock(); if (ui.view === 'traductor') drawBeams(); if (ui.pop) renderPop(); }, 120); });
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ws.settings.tema === 'sistema') render(); }); } catch (e) { /* n/a */ }
try { document.fonts && document.fonts.ready.then(() => { if (ui.view === 'traductor') drawBeams(); }); } catch (e) { /* n/a */ }

/* ---------- Arranque ---------- */
ws = sanitizeWs(store.get(WS_KEY));
try { Object.freeze(Object.prototype); } catch (e) { /* entorno que no lo permite */ }
applyTheme();
if (ws.activeId && store.get(PKEY(ws.activeId))) { state = sanitizeState(store.get(PKEY(ws.activeId))); recompute(); ui.trFw = FW.find((f) => state.alcance[f].on) || 'ens'; ui.normaFw = ui.trFw; }
ui.view = [...PROJECT_VIEWS, ...GLOBAL_VIEWS].includes(initialView) && (state || !PROJECT_VIEWS.includes(initialView)) ? initialView : (state ? 'panel' : 'inicio');
render();
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready'))); // sin animación del raíl al cargar
window.__ROSETTA__ = Object.freeze({ get state() { return state; }, get calc() { return calc; }, get hall() { return hall; }, get plan() { return plan; }, get prio() { return prio; }, get ws() { return ws; }, get ui() { return ui; }, openCase, go, get IX() { return IX; }, get FW() { return FW; } });
