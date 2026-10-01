/* ---------- Núcleo: datos, almacenamiento, estado global ---------- */
const D = window.ROSETTA_DATA;
const E = window.RosettaEngine;
const IX = E.indexar(D.catalog);
const CAT = D.catalog;
const FW = E.FW;
/* Librerías de Excel, cargadas solo cuando hacen falta, con integridad verificada (SRI):
 * - leer ficheros de terceros (SoA del ENS) con SheetJS 0.20.3, sin CVE-2023-30533 ni CVE-2024-22363;
 * - escribir el Excel con formato con xlsx-js-style (solo datos generados por Rosetta).
 * Primero se busca la copia autoalojada (vendor/) y, si no está, la misma versión en jsDelivr. tests/build.test.mjs comprueba los hashes. */
const XLSX_LIBS = {
  leer: { file: 'vendor/sheetjs-0.20.3.full.min.js', cdn: 'https://cdn.jsdelivr.net/npm/@e965/xlsx@0.20.3/dist/xlsx.full.min.js', sri: 'sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT' },
  escribir: { file: 'vendor/xlsx-js-style-1.2.0.bundle.js', cdn: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', sri: 'sha384-OUW9euuUyxyHcAhTqbhI+Iyb8LMssXt/cpz0yXhs9UWG2/R/uaWdakx/4cfww7Vb' }
};
const VERSION = '2.2.0';
const DOM = Object.fromEntries(CAT.domains.map((d) => [d.id, d]));
const SOLAPE = E.solapamiento(IX);
const PAREJAS = D.parejas;

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
const rT = (f, id) => tt(IX.req[f][id], 't');
const rG = (f, id) => tt(IX.req[f][id], 'g');
const cT = (id) => tt(IX.ucMap[id], 't');
const dT = (id) => tt(DOM[id], 't');
const reqCodeL = (f, id) => { const c = E.codigo(IX, f, id); return LANG() === 'en' ? c.replace(/^RE /, 'IR ') : c; };
/* Identificadores con aleatoriedad criptográfica (no Math.random): 9 caracteres aleatorios + 4 de marca temporal */
const uid = () => { const a = new Uint8Array(9); crypto.getRandomValues(a); return Array.from(a, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-4); };
const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '··';
const reqCode = (f, id) => reqCodeL(f, id);
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
  if (!state) { calc = null; hall = []; plan = []; prio = []; return; }
  calc = E.calcular(IX, state);
  hall = E.coherencia(IX, state, calc, { reglasOff: ws.settings.reglasOff, lang: LANG() });
  prio = E.prioridades(IX, state, calc);
  plan = E.planAccion(IX, state, calc);
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
  state = sanitizeState(st); ws.activeId = id; saveWs();
  ui.insp = null; ui.trId = null;
  ui.normaFw = state.alcance[ui.normaFw]?.on ? ui.normaFw : (FW.find((f) => state.alcance[f].on) || 'ens');
  ui.trFw = FW.find((f) => state.alcance[f].on) || 'ens';
  recompute(); snapshot(); undoReset(); saveProject(); go(view);
}
function openCase(caseId) {
  const cs = D.casos.find((c) => c.id === caseId); if (!cs) return;
  const id = 'demo-' + caseId;
  if (!store.get(PKEY(id))) {
    store.set(PKEY(id), clone(cs.state));
    ws.projects = ws.projects.filter((p) => p.id !== id);
    ws.projects.unshift({ id, kind: 'demo', caseId, nombre: cs.titulo, organizacion: cs.state.proyecto.organizacion, created: new Date().toISOString(), updated: new Date().toISOString(), normas: cs.meta.normas, grado: cs.meta.grado, brechas: cs.meta.brechas });
  }
  ws.onboarded = true; openProject(id);
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
function blankState({ nombre = '', organizacion = '', sector = '', descripcion = '', alcance, nis2q } = {}) {
  const st = { version: 1, proyecto: { nombre: nombre || organizacion, organizacion, sector, descripcion },
    alcance: alcance || { ens: { on: true, categoria: 'MEDIA', niveles: {} }, iso27001: { on: true }, nis2: { on: false, tipo: 'fuera' }, iso42001: { on: false } },
    nis2q: nis2q || { sector: 'ninguno', especial: 'ninguno', tamano: 'pequena', infraDigital: false },
    controles: {}, exclusiones: { ens: {}, iso27001: {}, nis2: {}, iso42001: {} }, acciones: {}, historial: [] };
  for (const c of CAT.controls) st.controles[c.id] = { estado: 'pendiente', responsable: '', evidencias: '', revision: '', notas: '', origen: '' };
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

