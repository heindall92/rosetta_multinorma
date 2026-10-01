/* Genera tests/fixtures/soa-ens-ejemplo.xlsx: una SoA del ENS ficticia con la plantilla de 73 medidas
 * (hojas «Portada», «SoA» y «Categorización»). Uso: node tests/fixtures/make-soa.cjs */
const path = require('node:path');
const X = require('../../src/vendor/sheetjs-0.20.3.full.min.js');
const CAT = require('../../src/data/catalog.json');

const medidas = CAT.frameworks.ens.reqs.filter((r) => r.g !== 'Articulado');
const estados = ['Implantada', 'Implantada', 'En curso', 'No implantada'];
const soa = [['Código', 'Medida', '¿Aplica?', 'Justificación', 'Estado de implantación', '% implantación', 'Evidencias', 'Responsable']];
medidas.forEach((m, i) => {
  const na = m.id === 'op.nub.1';
  soa.push([m.code, m.t, na ? 'NO' : 'SÍ', na ? 'Sin servicios en la nube' : '', na ? '' : estados[i % 4], na ? null : [100, 100, 50, 0][i % 4], i % 4 === 0 ? 'Procedimiento firmado' : '', i % 2 ? 'CISO' : 'Responsable de sistemas']);
});
const wb = X.utils.book_new();
X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['Organización', 'Ayuntamiento de Ejemplo (ficticio) – SoA'], ['Sistema de información', 'Sede electrónica']]), 'Portada');
X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(soa), 'SoA');
X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['ID', 'Servicio', 'D', 'I', 'C', 'A', 'T'], ['SRV-1', 'Sede electrónica', 'MEDIO', 'MEDIO', 'BAJO', 'MEDIO', 'MEDIO']]), 'Categorización');
require('node:fs').writeFileSync(path.join(__dirname, 'soa-ens-ejemplo.xlsx'), X.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log(`✓ ${medidas.length} medidas`);
