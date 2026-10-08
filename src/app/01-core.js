/* ---------- Núcleo: datos, almacenamiento, estado global ---------- */
const D = window.ROSETTA_DATA;
const E = window.RosettaEngine;
/* Índice de normas. IX0 es el del catálogo publicado (Part-IS incluido). Si el proyecto activo trae marcos propios,
 * reindex() funde un catálogo derivado y todo lo que depende de él (IX, CAT, FW, SOLAPE) pasa a incluirlos. */
const CAT0 = D.catalog;
const IX0 = E.indexar(CAT0, D.ccn825);
const FW_BASE = E.FW;
let IX = IX0, CAT = CAT0, FW = IX0.fw, IX_SIG = '[]';
/* Normas visibles en las vistas: las regionales (leyes LATAM) solo aparecen si están en el alcance o si el perfil
 * dice que la organización opera en ese país. El cálculo usa siempre todas (FW). */
let FWV = FW;
const regionDe = (f) => (CAT0.frameworks[f] && CAT0.frameworks[f].region) || null;
function visibles(st) {
  if (!st) return FW.filter((f) => !regionDe(f));
  const pf = st.perfil || {}; const ops = Array.isArray(pf.opera) ? pf.opera : [];
  return FW.filter((f) => { const r = regionDe(f); return !r || (st.alcance[f] && st.alcance[f].on) || pf.jurisdiccion === r || ops.includes(r); });
}
/* Librerías de Excel, cargadas solo cuando hacen falta, con integridad verificada (SRI):
 * - leer ficheros de terceros (SoA del ENS) con SheetJS 0.20.3, sin CVE-2023-30533 ni CVE-2024-22363;
 * - escribir el Excel con formato con xlsx-js-style (solo datos generados por Rosetta).
 * Primero se busca la copia autoalojada (vendor/) y, si no está, la misma versión en jsDelivr. tests/build.test.mjs comprueba los hashes. */
const XLSX_LIBS = {
  leer: { file: 'vendor/sheetjs-0.20.3.full.min.js', cdn: 'https://cdn.jsdelivr.net/npm/@e965/xlsx@0.20.3/dist/xlsx.full.min.js', sri: 'sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT' },
  escribir: { file: 'vendor/xlsx-js-style-1.2.0.bundle.js', cdn: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', sri: 'sha384-OUW9euuUyxyHcAhTqbhI+Iyb8LMssXt/cpz0yXhs9UWG2/R/uaWdakx/4cfww7Vb' }
};
const VERSION = '2.8.0';
const DOM = Object.fromEntries(CAT0.domains.map((d) => [d.id, d]));
const SOLAPE0 = E.solapamiento(IX0);
let SOLAPE = SOLAPE0;
const PAREJAS = D.parejas;
const CCN = E.contrasteCcn825(IX0);
/** Rehace el índice si han cambiado los marcos propios del proyecto activo. Devuelve true si cambió. */
function reindex() {
  const ms = state && Array.isArray(state.marcos) ? state.marcos : [];
  const sig = JSON.stringify(ms);
  if (sig === IX_SIG) return false;
  IX_SIG = sig;
  IX = ms.length ? E.indexar(CAT0, D.ccn825, ms) : IX0;
  CAT = IX.cat; FW = IX.fw; SOLAPE = ms.length ? E.solapamiento(IX) : SOLAPE0;
  for (const k of Object.keys(PRISM_DEF)) delete PRISM_DEF[k];
  return true;
}
/* Nombres y colores de cada norma. Los marcos propios toman el nombre que trae su fichero (saneado al importar)
 * y uno de cuatro colores de reserva; las normas incluidas tienen el suyo. */
const FW_SHORT = { ens: 'ENS', iso27001: '27001', nis2: 'NIS2', iso42001: '42001', partis: 'Part-IS', ria: 'RIA', cra: 'CRA', nist: 'CSF', dora: 'DORA', cl21663: 'CL 21.663', cl21719: 'CL 21.719' };
const esPropio = (f) => !!(IX.propio && IX.propio[f]);
const fwLbl = (f) => (FW_BASE.includes(f) || IX.req[f] ? E.etiqueta(IX, f, LANG()) : t('ownFw'));
const fwShort = (f) => (LANG() === 'en' && E.FW_LABEL_EN[f]) || FW_SHORT[f] || (() => { const n = fwLbl(f); return n.length > 14 ? n.slice(0, 13).trim() + '…' : n; })();
const fwCls = (f) => (FW_BASE.includes(f) ? f : 'p' + (Math.max(0, FW.indexOf(f) - FW_BASE.length) % 4));
const PRISM_DEF = {};

const clone = (o) => JSON.parse(JSON.stringify(o));
const $ = (sel, r = document) => r.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const blank = (v) => v === null || v === undefined || String(v).trim() === '';
/* Idioma activo y textos */
const LANG = () => (ws && ws.settings && ws.settings.lang === 'en' ? 'en' : 'es');
const LOC = () => (LANG() === 'en' ? 'en-GB' : 'es-ES');
function t(key, ...args) {
  let v = I18N[LANG()]; for (const k of key.split('.')) v = v == null ? undefined : v[k];
  if (v === undefined) { v = I18N.es; for (const k of key.split('.')) v = v == null ? undefined : v[k]; }
  return typeof v === 'function' ? v(...args) : (v ?? key);
}
const pct = (x, d = 0) => (Number(x) * 100).toLocaleString(LOC(), { maximumFractionDigits: d, minimumFractionDigits: d }) + ' %';
const num1 = (x) => Number(x).toLocaleString(LOC(), { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString(LOC(), { day: 'numeric', month: 'short', year: 'numeric' }); };
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
/* Textos del catálogo en el idioma activo */
const tt = (o, k) => E.tt(o, k, LANG());
const rT = (f, id) => (IX.req[f] && IX.req[f][id] ? tt(IX.req[f][id], 't') : id);
const rG = (f, id) => tt(IX.req[f][id], 'g');
const cT = (id) => tt(IX.ucMap[id], 't');
const dT = (id) => tt(DOM[id], 't');
/* Part-IS: el mismo punto se llama IS.I.OR (Reglamento 2023/203) o IS.D.OR (Reglamento Delegado 2022/1645) según la organización */
const partisPre = () => { const r = state && state.alcance && state.alcance.partis ? state.alcance.partis.regimen : 'I'; return r === 'D' ? 'IS.D.OR' : r === 'ID' ? 'IS.I/D.OR' : 'IS.I.OR'; };
const reqCodeL = (f, id) => { let c = E.codigo(IX, f, id); if (f === 'partis') c = c.replace(/^IS\.I\.OR/, partisPre()); return LANG() === 'en' ? c.replace(/^RE /, 'IR ') : c; };
/* Identificadores con aleatoriedad criptográfica (no Math.random): 9 caracteres aleatorios + 4 de marca temporal */
const uid = () => { const a = new Uint8Array(9); crypto.getRandomValues(a); return Array.from(a, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-4); };
const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '··';
const reqCode = (f, id) => reqCodeL(f, id);
/* Por qué un requisito no se exige: el nivel en el ENS; el rol o el riesgo del sistema en el RIA */
const noExigidoTxt = (f, r) => (f === 'ens' ? t('notRequired', t('lv.' + r.nivel), r.exigencia) : t('notRequiredBy.' + (r.motivo || 'rol')));
const reqTitle = (f, id) => rT(f, id);

/* Almacenamiento: localStorage si está disponible; si no, memoria (la app funciona igual) */
const MEM = {};
let STORE_OK = true;
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? safeParse(v) : (MEM[k] ?? null); } catch (e) { return MEM[k] ?? null; } },
  set(k, v) { MEM[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); STORE_OK = true; } catch (e) { if (STORE_OK) { STORE_OK = false; setTimeout(() => toast(t('tNoStore'), 'error'), 0); } } }, // sin espacio o almacenamiento bloqueado: se avisa una vez
  del(k) { delete MEM[k]; try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
};
const WS_KEY = 'rosetta/v1/ws';
const PKEY = (id) => 'rosetta/v1/p/' + id;

let ws = null;            // perfil, ajustes y lista de proyectos (se valida al arrancar)
const saveWs = () => store.set(WS_KEY, ws);
let state = null;         // proyecto activo
let calc = null, hall = [], plan = [], prio = [];
const initialView = (location.hash || '').replace('#', '');
const ui = {
  view: 'inicio', drawer: false, menu: null, confirm: null, palette: false, paletteQ: '', paletteIdx: 0,
  trFw: 'ens', trId: null, trQ: '', trOpen: false, trIdx: 0, ucQ: '', ucEstado: 'todos', ucFw: 'todos', ucSoloRel: true,
  normaFw: 'ens', normaQ: '', normaEstado: 'todos', mapaQ: '', brechaSev: 'todas', planVer: false,
  helpTab: 'inicio', helpQ: '', glosarioQ: '', wizard: null, insp: null, pop: null, sheet: false, wAnim: true, planAll: false
};

function recompute() {
  reindex(); FWV = visibles(state);
  if (!state) { calc = null; hall = []; plan = []; prio = []; return; }
  calc = E.calcular(IX, state);
  hall = E.coherencia(IX, state, calc, { reglasOff: ws.settings.reglasOff, lang: LANG() });
  prio = E.prioridades(IX, state, calc);
  plan = E.planAccion(IX, state, calc);
}
/* Propuesta del perfil regulatorio para el proyecto activo (se rehace con cada cálculo) */
let _prop = { calc: null, lang: '', v: null };
function propuesta() {
  if (!state) return null;
  if (_prop.calc !== calc || _prop.lang !== LANG()) _prop = { calc, lang: LANG(), v: E.perfilRegulatorio(state.perfil, state.nis2q, LANG(), (state.marcos || []).map((m) => m.id)) };
  return _prop.v;
}
/** Por qué una norma está en el alcance: lo que propone el perfil o, si el perfil dice que no aplica, «elegida» por el auditor. */
function motivoAlcance(f) {
  const p = propuesta(); const x = p && p.marcos[f]; const on = state.alcance[f] && state.alcance[f].on;
  if (!x) return { estado: 'voluntaria', base: '' };
  return { estado: on && x.estado === 'no-aplica' ? 'elegida' : x.estado, base: x.base, motivo: x.motivo };
}
function snapshot() {
  if (!state || !calc) return;
  const s = { fecha: today(), ...E.instantanea(calc) };
  state.historial = (state.historial || []).filter((h) => h.fecha !== s.fecha);
  state.historial.push(s); state.historial = state.historial.slice(-24);
}
let saveT = null;
function saveProject() {
  if (!state || !ws.activeId) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    store.set(PKEY(ws.activeId), state);
    const p = activeMeta();
    if (p) { p.updated = new Date().toISOString(); p.nombre = state.proyecto.nombre || p.nombre; p.organizacion = state.proyecto.organizacion || ''; p.normas = calc ? calc.alcance : []; p.grado = calc ? calc.kpi.grado : 0; p.brechas = calc ? calc.kpi.brechas : 0; }
    saveWs();
  }, 200);
}
/* Deshacer / rehacer: pila de estados del proyecto (máx. 30). Cada commit guarda el estado anterior;
 * la escritura continua en un mismo campo se agrupa en un solo paso. Se vacía al cambiar de proyecto. */
let UNDO = [], REDO = [], undoBase = null, undoLast = { k: null, t: 0 };
function undoReset() { UNDO = []; REDO = []; undoBase = state ? clone(state) : null; undoLast = { k: null, t: 0 }; }
function undoMark(k = null) {
  if (!state) return;
  if (!undoBase) { undoBase = clone(state); return; }
  const now = Date.now();
  if (!(k && undoLast.k === k && now - undoLast.t < 2500)) { UNDO.push(undoBase); if (UNDO.length > 30) UNDO.shift(); }
  REDO = []; undoLast = { k, t: now }; undoBase = clone(state);
}
function undo(rehacer = false) {
  const from = rehacer ? REDO : UNDO, to = rehacer ? UNDO : REDO;
  if (!state || !from.length) { toast(t(rehacer ? 'tNoRedo' : 'tNoUndo')); return; }
  to.push(clone(state)); state = sanitizeState(from.pop()); undoBase = clone(state); undoLast = { k: null, t: 0 };
  recompute(); saveProject(); render(); toast(t(rehacer ? 'tRedone' : 'tUndone'), 'ok', rehacer ? null : { act: 'undo', label: t('undo') });
}
function commit(msg) { recompute(); snapshot(); undoMark(); saveProject(); render(); if (msg) toast(msg, 'ok', { act: 'undo', label: t('undo') }); }

/* ---------- Proyectos ---------- */
const activeMeta = () => ws.projects.find((p) => p.id === ws.activeId) || null;
const isDemo = () => activeMeta()?.kind === 'demo';
function openProject(id, view = 'panel') {
  const st = store.get(PKEY(id));
  if (!st) { toast(t('tProjNotFound')); return; }
  state = sanitizeState(st); ws.activeId = id; saveWs(); reindex();
  ui.insp = null; ui.trId = null; ui.mpOpen = null; if (!FW.includes(ui.ucFw)) ui.ucFw = 'todos';
  ui.normaFw = state.alcance[ui.normaFw]?.on ? ui.normaFw : (FW.find((f) => state.alcance[f].on) || 'ens');
  ui.trFw = FW.find((f) => state.alcance[f].on) || 'ens';
  recompute(); snapshot(); undoReset(); saveProject(); go(view);
}
function openCase(caseId, view = 'panel') {
  const cs = D.casos.find((c) => c.id === caseId); if (!cs) return;
  const id = 'demo-' + caseId;
  if (!store.get(PKEY(id))) {
    store.set(PKEY(id), clone(cs.state));
    ws.projects = ws.projects.filter((p) => p.id !== id);
    ws.projects.unshift({ id, kind: 'demo', caseId, nombre: cs.titulo, organizacion: cs.state.proyecto.organizacion, created: new Date().toISOString(), updated: new Date().toISOString(), normas: cs.meta.normas, grado: cs.meta.grado, brechas: cs.meta.brechas });
  }
  ws.onboarded = true; openProject(id, view);
  toast(t('tCase', cs.titulo));
}
function resetCase(caseId) {
  const cs = D.casos.find((c) => c.id === caseId); if (!cs) return;
  store.set(PKEY('demo-' + caseId), clone(cs.state));
  if (ws.activeId === 'demo-' + caseId) { state = sanitizeState(clone(cs.state)); recompute(); render(); }
  toast(t('tReset'));
}
function createProject(st, { view = 'panel', msg } = {}) {
  const id = 'p-' + uid();
  st = sanitizeState(st);
  store.set(PKEY(id), st);
  ws.projects.unshift({ id, kind: 'own', nombre: st.proyecto.nombre || st.proyecto.organizacion || 'Proyecto', organizacion: st.proyecto.organizacion || '', created: new Date().toISOString(), updated: new Date().toISOString() });
  ws.onboarded = true; saveWs(); openProject(id, view);
  if (msg) toast(msg);
}
function deleteProject(id) {
  store.del(PKEY(id)); ws.projects = ws.projects.filter((p) => p.id !== id);
  if (ws.activeId === id) { ws.activeId = null; state = null; recompute(); }
  saveWs();
}
const alcanceDefecto = () => ({ ens: { on: true, categoria: 'MEDIA', niveles: {} }, iso27001: { on: true }, nis2: { on: false, tipo: 'fuera' }, iso42001: { on: false }, partis: { on: false, regimen: 'I' }, ria: { on: false, ...E.riaAlcance() }, cra: { on: false, ...E.craAlcance() }, nist: { on: false }, dora: { on: false, ...E.doraAlcance() }, cl21663: { on: false, oiv: false }, cl21719: { on: false } });
function blankState({ nombre = '', organizacion = '', sector = '', descripcion = '', alcance, nis2q, perfil } = {}) {
  const st = { version: 1, proyecto: { nombre: nombre || organizacion, organizacion, sector, descripcion },
    alcance: alcance || alcanceDefecto(),
    nis2q: nis2q || { sector: 'ninguno', especial: 'ninguno', tamano: 'pequena', infraDigital: false },
    perfil: perfil || { ...E.PERFIL_DEF },
    controles: {}, exclusiones: Object.fromEntries(FW_BASE.map((f) => [f, {}])), acciones: {}, historial: [], marcos: [] };
  for (const c of CAT0.controls) st.controles[c.id] = { estado: 'pendiente', responsable: '', evidencias: '', revision: '', notas: '', origen: '' };
  return st;
}

/* ¿Se está viendo en oscuro ahora mismo? (tema explícito o preferencia del sistema) */
const isDark = () => ws.settings.tema === 'oscuro' || (ws.settings.tema === 'sistema' && (() => { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } })());

/* ---------- Apariencia ---------- */
function applyTheme() {
  const r = document.documentElement;
  if (ws.settings.tema === 'claro') r.setAttribute('data-theme', 'light');
  else if (ws.settings.tema === 'oscuro') r.setAttribute('data-theme', 'dark');
  else r.removeAttribute('data-theme');
  r.setAttribute('data-accent', ws.settings.acento);
  r.setAttribute('data-density', ws.settings.densidad);
  r.setAttribute('lang', LANG());
  try { document.querySelector('.skip').textContent = t('skip'); $('#tabbar').setAttribute('aria-label', t('sections')); $('#insp').setAttribute('aria-label', t('inspect')); } catch (e) { /* n/a */ }
}

