/* ---------- Seguridad: todo lo que entra se trata como no fiable ----------
 * - Validación por esquema de proyectos, copias, importaciones y almacenamiento local (listas blancas, límites, tipos).
 * - Claves peligrosas (__proto__, constructor, prototype) eliminadas al parsear y bloqueadas en cualquier ruta de escritura.
 * - Identificadores de requisitos y controles validados contra el catálogo: nada fuera del catálogo entra en el estado.
 * - Neutralización de fórmulas en CSV (CSV/Formula injection) y de HTML en informes Markdown.
 * - Límites de tamaño en ficheros importados.
 * La salida al DOM se escapa siempre con esc(); nunca se inserta HTML procedente de datos. */
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const LIM = { str: 4000, fileJson: 25 * 1024 * 1024, fileXlsx: 15 * 1024 * 1024 };
const s = (v, max = LIM.str) => (v === null || v === undefined ? '' : String(typeof v === 'object' ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const num = (v, min, max, def = min) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };
const dateOk = (v) => { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''; const d = new Date(v + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === v ? v : ''; };
const arr = (v, max = 2000) => (Array.isArray(v) ? v.slice(0, max) : []);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function safeEntries(o, max = 1000) { return isObj(o) ? Object.keys(o).filter((k) => !BAD_KEYS.has(k)).slice(0, max).map((k) => [k, o[k]]) : []; }
function safeParse(text) { return JSON.parse(text, (k, v) => (BAD_KEYS.has(k) ? undefined : v)); }

const UC_IDS = new Set(CAT.controls.map((c) => c.id));
const CASE_IDS = D.casos.map((c) => c.id);
const CATS_ENS = ['BÁSICA', 'MEDIA', 'ALTA'];
const NIS2_TIPOS = ['esencial', 'importante', 'fuera', 'a-confirmar'];
const ACC_ESTADOS = ['Pendiente', 'En curso', 'Hecha'];

function sanitizeState(raw) {
  const r = isObj(raw) ? raw : {};
  const st = { version: 1 };
  if (CASE_IDS.includes(r.caseId)) st.caseId = r.caseId;
  const p = isObj(r.proyecto) ? r.proyecto : {};
  st.proyecto = { nombre: s(p.nombre, 200), organizacion: s(p.organizacion, 200), sector: s(p.sector, 120), descripcion: s(p.descripcion, 400) };
  const a = isObj(r.alcance) ? r.alcance : {};
  const g = (f) => (isObj(a[f]) ? a[f] : {});
  const niv = isObj(g('ens').niveles) ? g('ens').niveles : {};
  st.alcance = {
    ens: { on: g('ens').on === true, categoria: oneOf(g('ens').categoria, CATS_ENS, 'MEDIA'), niveles: Object.fromEntries(E.DIMS.filter((d) => E.NIVELES_ENS.includes(niv[d])).map((d) => [d, niv[d]])) },
    iso27001: { on: g('iso27001').on === true },
    nis2: { on: g('nis2').on === true, tipo: oneOf(g('nis2').tipo, NIS2_TIPOS, 'fuera') },
    iso42001: { on: g('iso42001').on === true }
  };
  const q = isObj(r.nis2q) ? r.nis2q : {};
  st.nis2q = { sector: oneOf(q.sector, ['anexo1', 'anexo2', 'ninguno'], 'ninguno'), especial: oneOf(q.especial, E.NIS2_ESPECIALES, 'ninguno'), tamano: oneOf(q.tamano, E.TAMANOS, 'pequena'), infraDigital: q.infraDigital === true };
  st.controles = {};
  const rc = isObj(r.controles) ? r.controles : {};
  for (const c of CAT.controls) {
    const d = isObj(rc[c.id]) ? rc[c.id] : {};
    st.controles[c.id] = { estado: oneOf(d.estado, E.ESTADOS, 'pendiente'), responsable: s(d.responsable, 200), evidencias: s(d.evidencias, 2000), revision: dateOk(d.revision), notas: s(d.notas, 2000), origen: oneOf(d.origen, ['', 'ens'], '') };
  }
  st.exclusiones = {};
  const re = isObj(r.exclusiones) ? r.exclusiones : {};
  for (const f of FW) {
    st.exclusiones[f] = {};
    for (const [k, v] of safeEntries(re[f], 400)) if (IX.req[f][k] && E.excluible(f, k)) st.exclusiones[f][k] = s(v, 1000);
  }
  st.acciones = {};
  for (const [k, v] of safeEntries(r.acciones, 400)) if (UC_IDS.has(k) && isObj(v)) st.acciones[k] = { estado: oneOf(v.estado, ACC_ESTADOS, 'Pendiente'), responsable: s(v.responsable, 200), fecha: dateOk(v.fecha), nota: s(v.nota, 1000) };
  if (isObj(r.ensSoa)) {
    st.ensSoa = {};
    for (const [k, v] of safeEntries(r.ensSoa, 100)) if (IX.req.ens[k] && isObj(v)) st.ensSoa[k] = { aplica: s(v.aplica, 20), estado: s(v.estado, 40), pct: v.pct === null || v.pct === undefined || v.pct === '' ? null : num(v.pct, 0, 1, null) };
  }
  st.historial = arr(r.historial, 60).filter((h) => isObj(h) && dateOk(h.fecha)).map((h) => {
    const cov = {}; const hc = isObj(h.cov) ? h.cov : {};
    for (const f of FW) cov[f] = hc[f] === null || hc[f] === undefined ? null : num(hc[f], 0, 1, 0);
    return { fecha: h.fecha, cov, grado: num(h.grado, 0, 1, 0), brechas: Math.round(num(h.brechas, 0, 9999, 0)), ejemplo: h.ejemplo === true };
  });
  return st;
}
const PROJ_ID = /^(p-[a-z0-9]{4,20}|demo-[a-z]{2,20})$/;
const COLOR_IDS = ['rosa', 'solar', 'glaciar', 'orquidea', 'jade', 'grafito'];
const ACCENTS = ['rosa', 'solar', 'glaciar', 'orquidea', 'verde', 'azul', 'rojo'];
function sanitizeWs(raw) {
  const r = isObj(raw) ? raw : {};
  const pr = isObj(r.profile) ? r.profile : {}; const se = isObj(r.settings) ? r.settings : {};
  return {
    profile: { nombre: s(pr.nombre, 120), rol: s(pr.rol, 80), organizacion: s(pr.organizacion, 160), email: s(pr.email, 160), color: oneOf(pr.color, COLOR_IDS, 'rosa') },
    settings: { tema: oneOf(se.tema, ['sistema', 'claro', 'oscuro'], 'sistema'), acento: oneOf(se.acento, ACCENTS, 'rosa'), densidad: oneOf(se.densidad, ['comoda', 'compacta'], 'comoda'), lang: oneOf(se.lang, ['es', 'en'], 'es'),
      reglasOff: arr(se.reglasOff, 40).filter((x) => E.REGLAS.some((rr) => rr[0] === x)), mostrarCasos: se.mostrarCasos !== false, mostrarRelaciones: se.mostrarRelaciones !== false, railMin: se.railMin === true },
    projects: arr(r.projects, 300).filter((p) => isObj(p) && PROJ_ID.test(String(p.id))).map((p) => ({ id: p.id, kind: oneOf(p.kind, ['own', 'demo'], 'own'), caseId: CASE_IDS.includes(p.caseId) ? p.caseId : undefined,
      nombre: s(p.nombre, 200), organizacion: s(p.organizacion, 200), created: s(p.created, 40), updated: s(p.updated, 40), normas: arr(p.normas, 4).filter((f) => FW.includes(f)),
      grado: p.grado === undefined ? undefined : num(p.grado, 0, 1, 0), brechas: Math.round(num(p.brechas, 0, 9999, 0)) })),
    activeId: PROJ_ID.test(String(r.activeId)) ? r.activeId : null, onboarded: r.onboarded === true, profileDone: r.profileDone === true
  };
}
/* CSV: una celda que empieza por = + - @ (o tab/CR) se ejecutaría como fórmula al abrirla en una hoja de cálculo */
const noFormula = (v) => { const x = String(v ?? ''); return /^[\s\u200B-\u200F\u202A-\u202E\u2060\uFEFF]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]|^[\t\r\n]/.test(x) ? "'" + x : x; };
/* Markdown: se neutraliza HTML incrustado, enlaces/imágenes ([ ] !), énfasis y las barras de tabla */
const mdSafe = (v) => String(v ?? '').replace(/[\\`*_[\]!]/g, '\\$&').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/\|/g, '/').replace(/[\r\n]+/g, ' ');
function checkSize(f, max, label) { if (f.size > max) { toast(t('tTooBig', label, Math.round(max / 1048576))); return false; } return true; }

