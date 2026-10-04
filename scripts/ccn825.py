#!/usr/bin/env python3
"""Extrae las correspondencias ENS ↔ ISO/IEC 27001:2022 de la guía CCN-STIC 825 y genera src/data/ccn825.json.

La guía no se incluye en el repositorio (su aviso legal prohíbe reproducirla). Descárgala de la web del CCN-CERT:
  https://www.ccn-cert.cni.es/es/series-ccn-stic/guias/series-ccn-stic/800-guia-esquema-nacional-de-seguridad/543-ccn-stic-825-ens-iso27001/file.html
y conviértela a Markdown con MarkItDown de Microsoft:
  pip install 'markitdown[pdf]'  &&  markitdown 825-27001_ENS.pdf > 825.md
Uso:  python3 scripts/ccn825.py 825.md [--check]
  Lee el apartado 6 (control principal, controles complementarios, categoría y nivel compatible de cada medida) y el
  apartado 7 (otros controles de la ISO). La tabla de cláusulas 4 a 10 del apartado 5.2.2 se transcribió a mano porque
  su maquetación en columnas giradas no se puede extraer como texto: se conserva tal cual del fichero actual.
  Con --check no escribe: falla si el resultado no coincide con src/data/ccn825.json.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'ccn825.json'
NIVEL = {'Análogo': 'analogo', 'Parcialmente análogo': 'parcial', 'Nula': 'nula'}
ENS_RE = r'\b((?:org|op|mp)\.[a-z]+(?:\.\d+)?|org\.\d)(?![\d.])'


def plano(lines):
    """Convierte las filas de tabla que genera MarkItDown en líneas de texto."""
    out = []
    for raw in lines:
        l = raw.strip()
        if l.startswith('|'):
            cells = [c.strip() for c in l.strip('|').split('|')]
            if all(set(c) <= set('- ') for c in cells):
                continue
            l = ' '.join(c for c in cells if c)
        out.append(l)
    return out


def codigo(txt, iso):
    t = txt.strip()
    m = re.match(r'^Cl[aá]usula\s+(\d+(?:\.\d+)*)', t)
    if m:
        c = 'C' + m.group(1)
    else:
        m = re.match(r'^(\d+(?:\.\d+)*)\s*(–|-)?\s*(.*)$', t)
        n, dash = m.group(1), m.group(2); parts = n.split('.')
        # Los controles del anexo A tienen dos niveles (5.1 … 8.34); con guion o con otro número de niveles son cláusulas
        c = ('C' if dash or len(parts) != 2 or parts[0] in ('4', '9', '10') else 'A') + n
    c = {'C6.1': 'C6.1.1', 'C9': 'C9.1'}.get(c, c)
    if c not in iso:
        raise SystemExit(f'Código ISO desconocido: «{t}» → {c}')
    return c


def medidas(L, iso, ens):
    s = max(i for i, l in enumerate(L) if l.startswith('6. DESARROLLO DE MEDIDAS'))
    e = max(i for i, l in enumerate(L) if l.startswith('7. OTROS CONTROLES DE LA ISO'))
    hdr = re.compile(r'^(?:\[|\.\.\s*)((?:org|op|mp)\.[a-z]+(?:\.\d+)?|org\.\d+)\]?\s+(.+)$')
    res, cur, modo = [], None, None
    for l in plano(L[s:e]):
        m = hdr.match(l)
        if m and re.match(r'^(org\.\d|op\.[a-z]+\.\d|mp\.[a-z]+\.\d)', m.group(1)):
            cur = {'id': m.group(1), 'principal': [], 'complementarios': [], 'cat': None, 'nivel': None}; res.append(cur); modo = None; continue
        if cur is None:
            continue
        if 'Control Principal' in l: modo = 'principal'; continue
        if 'Controles Complementarios' in l or 'Control Complementario' in l: modo = 'complementarios'; continue
        mc = re.match(r'^Categor[ií]a:\s*(.+)$', l)
        if mc: cur['cat'] = mc.group(1).strip(); modo = None; continue
        mn = re.match(r'^Nivel de medidas? [Cc]ompatibles?:\s*(.+)$', l)
        if mn: cur['nivel'] = mn.group(1).strip(); modo = None; continue
        if modo and l not in ('o', ''):
            x = re.sub(r'^o\s+', '', l)
            if re.match(r'^(Cl[aá]usula\s+)?\d+(?:\.\d+)*\b', x): cur[modo].append(x)
            elif re.match(r'^(No hay|No se contempla)', x): pass
            elif cur[modo]: cur[modo][-1] += ' ' + x
            elif modo == 'principal' and x.startswith('Términos y condiciones'): cur[modo].append('6.2 ' + x)  # mp.per.2: la guía omite el número
    res = [r for r in res if r['nivel']]  # descarta menciones [xx.y] dentro del texto
    out = {}
    for r in res:
        if r['id'] not in ens:
            raise SystemExit(f'Medida desconocida: {r["id"]}')
        p = list(dict.fromkeys(codigo(x, iso) for x in r['principal']))
        c = [x for x in dict.fromkeys(codigo(x, iso) for x in r['complementarios']) if x not in p]
        out[r['id']] = {'nivel': NIVEL[r['nivel']], 'cat': re.sub(r'\s+', ' ', r['cat']).replace(' *', '*'), 'principal': p, 'complementarios': c}
    return out


def otros(L, ens):
    s = max(i for i, l in enumerate(L) if l.startswith('7. OTROS CONTROLES DE LA ISO'))
    e = max(i for i, l in enumerate(L) if l.startswith('ANEXO A'))
    res, cur, cons = [], None, False
    for l in plano(L[s + 1:e]):
        m = re.match(r'^([5-8]\.\d{1,2})\s+([A-ZÁÉÍÓÚ].{3,80})$', l)
        if m and not l.endswith('.'):
            cur = {'iso': 'A' + m.group(1), 'ens': [], 'articulos': []}; res.append(cur); cons = False; continue
        if cur is None: continue
        if l.startswith('Consideración en el ENS'): cons = True; continue
        if cons:
            l = re.sub(r'\b(mp\.[a-z]+)(\d)', r'\1.\2', l)
            cur['ens'] += [x for x in re.findall(ENS_RE, l) if x in ens]
            cur['articulos'] += ['art.' + x for x in re.findall(r'Art[ií]culo\s+(\d+)', l)] + ['anexo.' + x for x in re.findall(r'Anexo\s+(I{1,3})\b', l)]
    return res


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    L = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8').split('\n')
    cat = json.loads((ROOT / 'src' / 'data' / 'catalog.json').read_text(encoding='utf-8'))
    iso = {r['id'] for r in cat['frameworks']['iso27001']['reqs']}
    orden = [r['id'] for r in cat['frameworks']['ens']['reqs']]
    m = medidas(L, iso, set(orden)); o = otros(L, set(orden))
    for x in o:
        for e in x['ens']:
            if e in m and x['iso'] not in m[e]['principal'] + m[e]['complementarios'] and x['iso'] not in m[e].get('consideracion', []):
                m[e].setdefault('consideracion', []).append(x['iso'])
    actual = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    data = {'fuente': 'CCN-STIC 825 «Esquema Nacional de Seguridad. Certificaciones 27001»', 'edicion': 'abril 2026',
            'nota': actual.get('nota', ''), 'medidas': {k: m[k] for k in orden if k in m},
            'otrosIso': o, 'clausulas': actual.get('clausulas', {})}
    txt = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        ok = json.loads(txt) == actual
        print('ccn825.json coincide con la guía' if ok else 'ccn825.json NO coincide con la guía'); sys.exit(0 if ok else 1)
    OUT.write_text(txt, encoding='utf-8'); print(f'{len(data["medidas"])} medidas → {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
