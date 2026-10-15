#!/usr/bin/env python3
"""Extrae los perfiles de cumplimiento específicos (PCE) del CCN y genera src/data/perfiles-ccn.json.

Las guías no se incluyen en el repositorio: su aviso legal prohíbe reproducirlas. Descárgalas del portal del CCN-CERT
(serie 800, Esquema Nacional de Seguridad) y pásalas a este script:
  python3 scripts/perfiles-ccn.py CCN-STIC_881A.pdf CCN-STIC-890A.pdf [--check]
Necesita pdftotext (poppler-utils). Solo se guardan datos objetivos de la declaración de aplicabilidad de cada guía:
el nivel o la categoría con que se exige cada medida del anexo II, los refuerzos que el perfil añade, si es
condicional y si tiene un criterio específico. Los criterios se resumen con redacción propia (no se copian).
Con --check no escribe: falla si el resultado no coincide con src/data/perfiles-ccn.json.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'perfiles-ccn.json'
CAT = json.loads((ROOT / 'src' / 'data' / 'catalog.json').read_text(encoding='utf-8'))
MEDIDAS = [r['id'] for r in CAT['frameworks']['ens']['reqs'] if r['g'] != 'Articulado']
# En la columna «Aplicación» la guía da la categoría si la medida afecta a las cinco dimensiones y el nivel si no
NIVEL = {'BÁSICA': 'BAJO', 'MEDIA': 'MEDIO', 'ALTA': 'ALTO', 'BAJO': 'BAJO', 'MEDIO': 'MEDIO', 'ALTO': 'ALTO'}
TOK = r'(N/A|BÁSICA|MEDIA|ALTA|BAJO|MEDIO|ALTO)\s*(?:\(\s*\+\s*(R\d+)\s*\))?\s*(\(\*\)|\*)?\d?(?:\s+(\d\.\d))?'

# Metadatos y criterios específicos: redacción propia, breve, a partir de lo que establece cada guía
GUIAS = {
    '881a': {
        'clave': '881A', 'guia': 'CCN-STIC 881A', 'nombre': 'Universidades', 'nombre_en': 'Universities', 'edicion': '2022-05',
        'categoria': 'MEDIA', 'aplican': 69,
        'ambito': 'Sistemas de las universidades con necesidades de seguridad de categoría MEDIA.',
        'ambito_en': 'University systems with MEDIUM-category security needs.',
        'cond': {'mp.info.4': 'evidencia'},
        'criterios': {
            'op.acc.5': ('Si los servicios tratan información con confidencialidad de nivel BAJO, basta con los requisitos de categoría BÁSICA más R5.', 'For services handling information with LOW confidentiality, BASIC requirements plus R5 are enough.'),
            'op.exp.6': ('Requisitos de categoría BÁSICA más R4 (capacidad de respuesta: EDR en puestos y servidores).', 'BASIC requirements plus R4 (response capability: EDR on endpoints and servers).'),
            'op.mon.3': ('Requisitos de categoría BÁSICA más R1 (correlación automática de eventos de seguridad).', 'BASIC requirements plus R1 (automatic correlation of security events).'),
            'mp.per.2': ('Requisitos de categoría BÁSICA.', 'BASIC requirements.'),
            'mp.eq.4': ('Requisitos de nivel BAJO.', 'LOW-level requirements.'),
            'mp.si.2': ('Requisitos de nivel MEDIO más R2 (copias de seguridad cifradas con algoritmos autorizados por el CCN).', 'MEDIUM-level requirements plus R2 (backups encrypted with CCN-approved algorithms).'),
            'mp.sw.2': ('Las aplicaciones que no gestionan servicios corporativos pueden quedarse en categoría BÁSICA.', 'Applications that do not run corporate services may stay at BASIC category.'),
            'mp.info.4': ('Nivel ALTO solo para la información que pueda usarse como evidencia electrónica; si no la hay, la medida no aplica.', 'HIGH level only for information that may be used as electronic evidence; otherwise the measure does not apply.'),
        },
    },
    '890a': {
        'clave': '890A', 'guia': 'CCN-STIC 890A', 'nombre': 'Entidades locales (requisitos fundamentales)', 'nombre_en': 'Local entities (fundamental requirements)', 'edicion': '2025-11',
        'categoria': 'BÁSICA', 'aplican': 38,
        'ambito': 'Ayuntamientos de menos de 5.000 habitantes, sus agrupaciones y entidades locales menores, con servicios de nivel BAJO en todas las dimensiones. Es transitorio: hay que seguir mejorando hasta la categoría que corresponda.',
        'ambito_en': 'Municipalities under 5,000 inhabitants, their groupings and minor local entities, with services at LOW level in every dimension. It is transitional: security must keep improving up to the proper category.',
        'cond': {'op.cont.2': 'nis2'},
        'criterios': {
            'op.pl.1': ('Análisis de riesgos automatizado en la Plataforma de Gobernanza del CCN.', 'Risk analysis automated in the CCN Governance Platform.'),
            'op.acc.6': ('Se recomienda R2 (contraseña más otro factor) también desde zonas controladas, sobre todo si se prestan servicios de los anexos I y II de NIS2.', 'R2 (password plus another factor) is recommended even from controlled zones, especially when providing NIS2 Annex I and II services.'),
            'op.exp.8': ('Basta con registrar la actividad de los usuarios en los servidores.', 'Logging user activity on servers is enough.'),
            'op.cont.2': ('Solo si la entidad presta servicios de los anexos I y II de NIS2 (agua, residuos, tráfico): mecanismos efectivos de continuidad, con el modelo de la CCN-STIC 890 anexo IV.', 'Only if the entity provides NIS2 Annex I and II services (water, waste, traffic): effective continuity mechanisms, using the CCN-STIC 890 Annex IV model.'),
            'mp.if.1': ('Sin CPD, el equipamiento se instala en áreas a las que solo accede personal autorizado.', 'Without a data centre, equipment goes in areas only authorised staff can access.'),
            'mp.com.1': ('Sin red, cada equipo tiene activo el cortafuegos del sistema operativo.', 'Without a network, each device runs the operating system firewall.'),
            'mp.info.6': ('Al menos una copia de seguridad fuera de línea, actualizada y en lugar seguro.', 'At least one offline backup, kept up to date and stored securely.'),
        },
    },
}
RETIRADOS = [{'guia': 'CCN-STIC 892', 'nombre': 'Entidades del Reglamento de Ejecución (UE) 2024/2690 (NIS2)', 'retirada': '2025-03-28',
              'nota': 'Despublicada por el CCN con efecto inmediato; se elabora una nueva versión para las entidades sujetas al RE 2024/2690 y al ENS. Los certificados ya emitidos siguen siendo válidos.',
              'nota_en': 'Withdrawn by the CCN with immediate effect; a new version for entities under IR 2024/2690 and the ENS is being drafted. Certificates already issued remain valid.'}]


def texto(pdf):
    return subprocess.run(['pdftotext', '-layout', str(pdf), '-'], check=True, capture_output=True, text=True).stdout


def clave_de(t):
    for k, g in GUIAS.items():
        if g['guia'].replace(' ', '[ -]?') and re.search(g['guia'].replace(' ', r'[ -]?'), t[:3000]):
            return k
    raise SystemExit('No reconozco la guía (se esperan la CCN-STIC 881A o la 890A).')


def tabla(t):
    """Líneas de la tabla de la declaración de aplicabilidad (de la cabecera «Afectadas» a «MEDIDAS DE APLICACIÓN»)."""
    ls = t.split('\n')
    i0 = next(i for i, l in enumerate(ls) if 'Afectadas' in l)
    i1 = next(i for i in range(i0, len(ls)) if re.search(r'MEDIDAS DE APLICACI', ls[i]))
    return ls[i0:i1]


def extraer(t):
    ls = tabla(t)
    out = {}
    for code in MEDIDAS:
        pat = re.compile(r'(?<![\w.])' + re.escape(code) + r'(?![\w.])')
        idx = [i for i, l in enumerate(ls) if pat.search(l)]
        if len(idx) != 1:
            raise SystemExit(f'{code}: aparece {len(idx)} veces en la tabla')
        i = idx[0]; resto = ls[i][pat.search(ls[i]).end():]
        m = re.match(r'\s*' + TOK, resto)
        if not m:  # filas partidas en varias líneas: el valor de «Aplicación» queda al final de la línea anterior o siguiente
            otra = re.compile(r'(?<![\w.])(?:org|op|mp)\.[a-z]*\.?\d+(?![\w.])')
            for j in (i - 1, i + 1, i - 2, i + 2):
                if 0 <= j < len(ls) and not otra.search(ls[j]):
                    m = re.search(r'\s{2,}' + TOK + r'\s*$', ls[j])
                    if m:
                        break
        if not m:
            raise SystemExit(f'{code}: sin valor de «Aplicación»')
        tok, extra, ast, ref = m.groups()
        out[code] = {'tok': tok, 'extra': [extra] if extra else [], 'criterio': bool(ast or ref)}
    return out


def perfil(k, filas):
    g = GUIAS[k]; medidas = {}
    for code in MEDIDAS:
        f = filas[code]
        cond = g['cond'].get(code)
        if f['tok'] == 'N/A' and not cond:
            medidas[code] = None
            continue
        nivel = 'ALTO' if f['tok'] == 'N/A' else NIVEL[f['tok']]  # N/A condicional: se exige la medida tal cual (anexo II, ALTA)
        m = {'nivel': nivel}
        if f['extra']: m['extra'] = f['extra']
        if cond: m['cond'] = cond
        if code in g['criterios']:
            m['criterio'], m['criterio_en'] = g['criterios'][code]
        elif f['criterio']:
            raise SystemExit(f'{k} {code}: la guía marca un criterio específico que no está resumido en GUIAS')
        medidas[code] = m
    n = sum(1 for code in MEDIDAS if filas[code]['tok'] != 'N/A')  # como cuenta la guía: todo lo que su tabla no marca N/A
    if n != g['aplican']:
        raise SystemExit(f'{k}: aplican {n} medidas y la guía dice {g["aplican"]}')
    meta = {x: g[x] for x in ('guia', 'nombre', 'nombre_en', 'edicion', 'categoria', 'aplican', 'ambito', 'ambito_en')}
    return {**meta, 'medidas': medidas}


def main():
    pdfs = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not pdfs:
        raise SystemExit(__doc__)
    perfiles = {}
    for p in pdfs:
        t = texto(p); k = clave_de(t)
        perfiles[k] = perfil(k, extraer(t))
    faltan = set(GUIAS) - set(perfiles)
    if faltan:
        raise SystemExit('Faltan guías: ' + ', '.join(GUIAS[k]['guia'] for k in sorted(faltan)))
    data = {'fuente': 'Guías CCN-STIC 881A (mayo de 2022) y 890A (noviembre de 2025) del Centro Criptológico Nacional: solo la declaración de aplicabilidad (nivel por medida, refuerzos añadidos y criterios resumidos). Las guías no se reproducen.',
            'perfiles': dict(sorted(perfiles.items())), 'retirados': RETIRADOS}
    txt = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        if OUT.read_text(encoding='utf-8') != txt:
            raise SystemExit(f'✗ {OUT.relative_to(ROOT)} no coincide con las guías')
        print(f'✓ {OUT.relative_to(ROOT)} coincide con las guías')
        return
    OUT.write_text(txt, encoding='utf-8')
    for k, v in data['perfiles'].items():
        print(f"✓ {v['guia']}: {v['aplican']} medidas exigidas, {sum(1 for m in v['medidas'].values() if m and m.get('cond'))} condicionales, {sum(1 for m in v['medidas'].values() if m and m.get('criterio'))} con criterio")


if __name__ == '__main__':
    main()
