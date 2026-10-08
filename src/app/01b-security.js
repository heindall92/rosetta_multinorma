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

const UC_IDS = new Set(CAT0.controls.map((c) => c.id));
const PARTIS_REG = ['I', 'D', 'ID'];

/* ---------- Marcos propios ----------
 * Entran desde un fichero del usuario (JSON «rosetta-marco» o CSV) o desde un proyecto guardado. Todo se trata como hostil:
 * nombre sin caracteres de marcado, identificadores con patrón, textos recortados, controles solo del catálogo,
 * límites de requisitos, de controles por requisito y de marcos por proyecto. */
const MAX_MARCOS = 6, MAX_REQS_MARCO = 500, MAX_CTL_REQ = 30;
const REQ_ID = /^[A-Za-z0-9][A-Za-z0-9 ._:/()+-]{0,39}$/;
const FUERZA_W = { equivalente: 1, total: 1, parcial: 0.5, relacion: 0, relacionado: 0 };
const W_FUERZA = (w) => (w === 1 ? 'equivalente' : w === 0 ? 'relacion' : 'parcial');
const nombreSeguro = (v, max) => s(v, max).replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim();
const slugMarco = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^mp-/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '');
/** Normaliza un marco propio. Devuelve { marco, omitidos } o { error } con la clave del texto del error. */
function normalizaMarco(raw, { fichero = false } = {}) {
  if (!isObj(raw)) return { error: 'mpErrFormat' };
  if (fichero && (raw.format !== 'rosetta-marco' || Number(raw.version) !== 1)) return { error: 'mpErrFormat' };
  const nombre = nombreSeguro(raw.nombre, 80);
  if (!nombre) return { error: 'mpErrName' };
  const slug = slugMarco(raw.id) || slugMarco(nombre);
  if (!slug) return { error: 'mpErrName' };
  const reqs = []; const ids = new Set(); let omitidos = 0;
  const lista = Array.isArray(raw.requisitos) ? raw.requisitos : [];
  if (lista.length > MAX_REQS_MARCO) omitidos += lista.length - MAX_REQS_MARCO;
  for (const r of lista.slice(0, MAX_REQS_MARCO)) {
    if (!isObj(r)) { omitidos++; continue; }
    const id = s(r.id, 40).trim(); const titulo = s(r.titulo, 300).replace(/\s+/g, ' ').trim();
    if (!REQ_ID.test(id) || ids.has(id) || !titulo) { omitidos++; continue; }
    ids.add(id);
    const controles = []; const vistos = new Set();
    for (const m of arr(r.controles, MAX_CTL_REQ)) {
      const control = typeof m === 'string' ? m.trim() : isObj(m) ? String(m.control || '').trim() : '';
      if (!UC_IDS.has(control) || vistos.has(control)) continue;
      let w = 0.5;
      if (isObj(m) && has(m, 'w') && [0, 0.5, 1].includes(m.w)) w = m.w;
      else if (isObj(m) && has(FUERZA_W, String(m.fuerza || '').toLowerCase())) w = FUERZA_W[String(m.fuerza).toLowerCase()];
      vistos.add(control); controles.push({ control, w });
    }
    reqs.push({ id, titulo, texto: s(r.texto, 2000).trim(), grupo: s(r.grupo, 120).trim(), controles });
  }
  if (!reqs.length) return { error: 'mpErrEmpty' };
  return { marco: { id: 'mp-' + slug, nombre, descripcion: s(raw.descripcion, 400).trim(), tipo: oneOf(raw.tipo, ['propio', 'cliente', 'pliego', 'licencia'], 'propio'), importado: dateOk(raw.importado) || today(), requisitos: reqs }, omitidos };
}
/** Marco propio en el formato de intercambio (para exportarlo y compartirlo). */
const marcoAFichero = (m) => ({ format: 'rosetta-marco', version: 1, id: m.id.replace(/^mp-/, ''), nombre: m.nombre, descripcion: m.descripcion || undefined, tipo: m.tipo,
  requisitos: m.requisitos.map((r) => ({ id: r.id, titulo: r.titulo, texto: r.texto || undefined, grupo: r.grupo || undefined, controles: r.controles.map((c) => ({ control: c.control, fuerza: W_FUERZA(c.w) })) })) });
/* CSV: «id;titulo;texto;grupo;controles» (también con comas). Controles separados por «|», cada uno «ID» o «ID:fuerza». */
function csvFilas(text) {
  const t0 = String(text || '').replace(/^\uFEFF/, ''); const prim = t0.split(/\r?\n/, 1)[0] || '';
  const sep = (prim.match(/;/g) || []).length >= (prim.match(/,/g) || []).length ? ';' : ',';
  const filas = []; let fila = []; let cel = ''; let q = false;
  for (let i = 0; i < t0.length && filas.length <= MAX_REQS_MARCO + 1; i++) {
    const ch = t0[i];
    if (q) { if (ch === '"' && t0[i + 1] === '"') { cel += '"'; i++; } else if (ch === '"') q = false; else cel += ch; continue; }
    if (ch === '"' && cel === '') q = true;
    else if (ch === sep) { fila.push(cel); cel = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t0[i + 1] === '\n') i++; fila.push(cel); filas.push(fila); fila = []; cel = ''; }
    else cel += ch;
  }
  if (cel !== '' || fila.length) { fila.push(cel); filas.push(fila); }
  return filas.filter((f) => f.some((c) => String(c).trim() !== ''));
}
function marcoDesdeCsv(text, nombre) {
  const filas = csvFilas(text); if (filas.length < 2) return { error: 'mpErrEmpty' };
  const cab = filas[0].map((h) => String(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
  const col = (k) => cab.indexOf(k);
  const ci = col('id'), ct = col('titulo') >= 0 ? col('titulo') : col('title'), cx = col('texto') >= 0 ? col('texto') : col('text'), cg = col('grupo') >= 0 ? col('grupo') : col('group'), cc = col('controles') >= 0 ? col('controles') : col('controls');
  if (ci < 0 || ct < 0) return { error: 'mpErrCsv' };
  const requisitos = filas.slice(1).map((f) => ({ id: f[ci], titulo: f[ct], texto: cx >= 0 ? f[cx] : '', grupo: cg >= 0 ? f[cg] : '',
    controles: cc >= 0 ? String(f[cc] || '').split('|').map((x) => { const [control, fuerza] = x.split(':').map((y) => y.trim()); return { control, fuerza: fuerza || 'parcial' }; }) : [] }));
  return normalizaMarco({ nombre, id: nombre, requisitos });
}
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
  // Marcos propios primero: el resto del estado (alcance, exclusiones, historial) se valida contra ellos
  st.marcos = []; const vistos = new Set(FW_BASE);
  for (const m of arr(r.marcos, MAX_MARCOS)) { const x = normalizaMarco(m); if (x.marco && !vistos.has(x.marco.id)) { vistos.add(x.marco.id); st.marcos.push(x.marco); } }
  const fws = [...FW_BASE, ...st.marcos.map((m) => m.id)];
  const reqOk = (f, k) => (FW_BASE.includes(f) ? !!IX0.req[f][k] : st.marcos.find((m) => m.id === f).requisitos.some((x) => x.id === k));
  const mot = (f) => s(g(f).motivo, 300);
  st.alcance = {
    ens: { on: g('ens').on === true, categoria: oneOf(g('ens').categoria, CATS_ENS, 'MEDIA'), niveles: Object.fromEntries(E.DIMS.filter((d) => E.NIVELES_ENS.includes(niv[d])).map((d) => [d, niv[d]])) },
    iso27001: { on: g('iso27001').on === true },
    nis2: { on: g('nis2').on === true, tipo: oneOf(g('nis2').tipo, NIS2_TIPOS, 'fuera') },
    iso42001: { on: g('iso42001').on === true },
    partis: { on: g('partis').on === true, regimen: oneOf(g('partis').regimen, PARTIS_REG, 'I') }
  };
  for (const m of st.marcos) st.alcance[m.id] = { on: g(m.id).on === true };
  for (const f of fws) if (mot(f)) st.alcance[f].motivo = mot(f);
  const pf = isObj(r.perfil) ? r.perfil : {};
  st.perfil = { ...E.perfilNormalizado(pf), confirmado: dateOk(pf.confirmado) };
  const q = isObj(r.nis2q) ? r.nis2q : {};
  st.nis2q = { sector: oneOf(q.sector, ['anexo1', 'anexo2', 'ninguno'], 'ninguno'), especial: oneOf(q.especial, E.NIS2_ESPECIALES, 'ninguno'), tamano: oneOf(q.tamano, E.TAMANOS, 'pequena'), infraDigital: q.infraDigital === true };
  st.controles = {};
  const rc = isObj(r.controles) ? r.controles : {};
  for (const c of CAT0.controls) {
    const d = isObj(rc[c.id]) ? rc[c.id] : {};
    st.controles[c.id] = { estado: oneOf(d.estado, E.ESTADOS, 'pendiente'), responsable: s(d.responsable, 200), evidencias: s(d.evidencias, 2000), revision: dateOk(d.revision), notas: s(d.notas, 2000), origen: oneOf(d.origen, ['', 'ens'], '') };
  }
  st.exclusiones = {};
  const re = isObj(r.exclusiones) ? r.exclusiones : {};
  for (const f of fws) {
    st.exclusiones[f] = {};
    for (const [k, v] of safeEntries(re[f], 400)) if (reqOk(f, k) && E.excluible(f, k)) st.exclusiones[f][k] = s(v, 1000);
  }
  st.acciones = {};
  for (const [k, v] of safeEntries(r.acciones, 400)) if (UC_IDS.has(k) && isObj(v)) st.acciones[k] = { estado: oneOf(v.estado, ACC_ESTADOS, 'Pendiente'), responsable: s(v.responsable, 200), fecha: dateOk(v.fecha), nota: s(v.nota, 1000) };
  if (isObj(r.ensSoa)) {
    st.ensSoa = {};
    for (const [k, v] of safeEntries(r.ensSoa, 100)) if (IX0.req.ens[k] && isObj(v)) st.ensSoa[k] = { aplica: s(v.aplica, 20), estado: s(v.estado, 40), pct: v.pct === null || v.pct === undefined || v.pct === '' ? null : num(v.pct, 0, 1, null), justificacion: s(v.justificacion, 1000), evidencias: s(v.evidencias, 1500), responsable: s(v.responsable, 200) };
  }
  st.historial = arr(r.historial, 60).filter((h) => isObj(h) && dateOk(h.fecha)).map((h) => {
    const cov = {}; const hc = isObj(h.cov) ? h.cov : {};
    for (const f of fws) cov[f] = hc[f] === null || hc[f] === undefined ? null : num(hc[f], 0, 1, 0);
    return { fecha: h.fecha, cov, grado: num(h.grado, 0, 1, 0), brechas: Math.round(num(h.brechas, 0, 9999, 0)), ejemplo: h.ejemplo === true };
  });
  return st;
}
const PROJ_ID = /^(p-[a-z0-9]{4,20}|demo-[a-z]{2,20})$/;
const COLOR_IDS = ['rosa', 'solar', 'glaciar', 'orquidea', 'jade', 'grafito'];
const ACCENTS = ['rosa', 'solar', 'glaciar', 'orquidea', 'verde', 'azul', 'rojo'];
function sanitizeWs(raw) {
  const r = isObj(raw) ? raw : {};
  const pr = isObj(r.profile) ? r.profile : {}; const se0 = isObj(r.settings) ? r.settings : {};
  // Valores por defecto v2 (tema claro y acento azul): se aplican una vez a los navegadores con ajustes anteriores
  const se = se0.def === 2 ? se0 : { ...se0, tema: undefined, acento: undefined };
  return {
    profile: { nombre: s(pr.nombre, 120), rol: s(pr.rol, 80), organizacion: s(pr.organizacion, 160), email: s(pr.email, 160), color: oneOf(pr.color, COLOR_IDS, 'rosa') },
    settings: { tema: oneOf(se.tema, ['sistema', 'claro', 'oscuro'], 'claro'), acento: oneOf(se.acento, ACCENTS, 'azul'), densidad: oneOf(se.densidad, ['comoda', 'compacta'], 'comoda'), lang: oneOf(se.lang, ['es', 'en'], 'es'),
      reglasOff: arr(se.reglasOff, 40).filter((x) => E.REGLAS.some((rr) => rr[0] === x)), mostrarCasos: se.mostrarCasos !== false, mostrarRelaciones: se.mostrarRelaciones !== false, railMin: se.railMin === true, def: 2 },
    projects: arr(r.projects, 300).filter((p) => isObj(p) && PROJ_ID.test(String(p.id))).map((p) => ({ id: p.id, kind: oneOf(p.kind, ['own', 'demo'], 'own'), caseId: CASE_IDS.includes(p.caseId) ? p.caseId : undefined,
      nombre: s(p.nombre, 200), organizacion: s(p.organizacion, 200), created: s(p.created, 40), updated: s(p.updated, 40), normas: arr(p.normas, 12).filter((f) => FW_BASE.includes(f) || /^mp-[a-z0-9-]{1,30}$/.test(f)),
      grado: p.grado === undefined ? undefined : num(p.grado, 0, 1, 0), brechas: Math.round(num(p.brechas, 0, 9999, 0)) })),
    activeId: PROJ_ID.test(String(r.activeId)) ? r.activeId : null, onboarded: r.onboarded === true, profileDone: r.profileDone === true
  };
}
/* CSV: una celda que empieza por = + - @ (o tab/CR) se ejecutaría como fórmula al abrirla en una hoja de cálculo */
const noFormula = (v) => { const x = String(v ?? ''); return /^[\s\u200B-\u200F\u202A-\u202E\u2060\uFEFF]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]|^[\t\r\n]/.test(x) ? "'" + x : x; };
/* Markdown: se neutraliza HTML incrustado, enlaces/imágenes ([ ] !), énfasis y las barras de tabla */
const mdSafe = (v) => String(v ?? '').replace(/[\\`*_[\]!]/g, '\\$&').replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).replace(/\|/g, '/').replace(/[\r\n]+/g, ' ');
function checkSize(f, max, label) { if (f.size > max) { toast(t('tTooBig', label, Math.round(max / 1048576))); return false; } return true; }

