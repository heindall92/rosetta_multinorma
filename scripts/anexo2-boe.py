#!/usr/bin/env python3
"""Comprueba las 73 medidas del ENS del catálogo contra la tabla del anexo II del RD 311/2022 consolidado del BOE.

Descarga el PDF del BOE (texto consolidado de BOE-A-2022-7191, https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191)
y pásalo al script:  python3 scripts/anexo2-boe.py BOE-A-2022-7191-consolidado.pdf
Necesita pdftotext (poppler-utils). Compara, medida a medida, las dimensiones y la exigencia de los niveles BAJO, MEDIO y
ALTO («aplica», «n.a.», «+ R1», «+ [R2 o R3 o R4] + R5»…) con src/data/catalog.json. No escribe nada: sale con error
si alguna medida no coincide. El texto del BOE se puede reproducir, pero aquí solo se usa para comparar.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / 'src' / 'data' / 'catalog.json').read_text(encoding='utf-8'))
ENS = {r['id']: r for r in CAT['frameworks']['ens']['reqs'] if r['g'] != 'Articulado'}
CODE = re.compile(r'^((?:org|op|mp)\.(?:[a-z]+\.)?\d+)\s')
norm = lambda s: re.sub(r'\s+', '', s or '').lower()


def leer(pdf):
    t = subprocess.run(['pdftotext', '-layout', str(pdf), '-'], check=True, capture_output=True, text=True).stdout.split('\n')
    i0 = next(i for i, l in enumerate(t) if 'Por categoría o' in l)
    i1 = next(i for i in range(i0, len(t)) if 'En las tablas del presente anexo' in t[i])
    return t[i0:i1]


def filas(ls):
    """Agrupa las líneas por medida. Las celdas de varias líneas quedan centradas en vertical: las líneas sueltas entre dos
    medidas se reparten, la primera mitad para la de arriba y el resto para la de abajo."""
    cols, out, pend, actual = None, {}, [], None
    for l in ls:
        if 'Por categoría o' in l:  # cabecera de cada página: posición de las columnas
            if actual: out[actual][1].extend(pend)
            pend, actual = [], None
            cols = [l.index('Por categoría o')] + [m.start() + len(m.group()) / 2 for m in re.finditer(r'BAJO|MEDIO|ALTO', l)]
            continue
        if not l.strip() or re.search(r'Página \d+|BOLETÍN OFICIAL|LEGISLACIÓN CONSOLIDADA|Medidas de Seguridad|dimensión\(es\)|BÁSICA\s+MEDIA|Nivel de las dimensiones', l):
            continue
        m = CODE.match(l)
        if m and m.group(1) in ENS:
            n = len(pend); corte = n
            if actual:  # corte por la mitad, salvo que deje un corchete abierto en la medida de arriba («+ [R1 o R2 o» / «R3]»)
                for c in sorted(range(n + 1), key=lambda c: abs(c - (n - n // 2))):
                    txt = ' '.join(out[actual][1] + pend[:c])
                    if txt.count('[') == txt.count(']'):
                        corte = c; break
                out[actual][1].extend(pend[:corte])
            arriba = pend[corte:] if actual else []
            actual = m.group(1); out[actual] = (cols, arriba + [l]); pend = []
        elif CODE.match(l) or re.match(r'^(org|op|mp)\s|^(op|mp)\.[a-z]+\s', l):
            if actual: out[actual][1].extend(pend)
            pend, actual = [], None  # encabezado de grupo (op.pl, mp.if…)
        else:
            pend.append(l)
    if actual: out[actual][1].extend(pend)
    return out


def celdas(cols, lineas):
    dims_x, centros = cols[0], cols[1:]
    c = {'dims': [], 'bajo': [], 'medio': [], 'alto': []}
    for l in lineas:
        for m in re.finditer(r'\S+(?: \S+)*', l):
            ini, fin = m.start(), m.end()
            if fin <= dims_x: continue  # código y título
            txt = m.group()
            if ini < centros[0] - 12 and re.fullmatch(r'Categoría|[CITAD]+', txt): c['dims'].append(txt); continue
            mid = (ini + fin) / 2
            col = min(range(3), key=lambda i: abs(centros[i] - mid))
            c[['bajo', 'medio', 'alto'][col]].append(txt)
    return {k: ' '.join(v) for k, v in c.items()}


def main():
    pdf = next((a for a in sys.argv[1:] if not a.startswith('--')), None)
    if not pdf:
        raise SystemExit(__doc__)
    grupos = filas(leer(pdf)); dif = []
    faltan = sorted(set(ENS) - set(grupos))
    if faltan: dif.append('no están en la tabla del BOE: ' + ', '.join(faltan))
    for code, (cols, ls) in grupos.items():
        c = celdas(cols, ls); r = ENS[code]
        for k in ('dims', 'bajo', 'medio', 'alto'):
            a, b = norm(c[k]), norm(r[k])
            if k == 'dims' and a != 'categoría': a, b = ''.join(sorted(a)), ''.join(sorted(b))  # «TA» y «AT» son las mismas dimensiones
            if a != b: dif.append(f'{code} {k}: BOE «{c[k]}» · catálogo «{r[k]}»')
    if dif:
        raise SystemExit('✗ El catálogo no coincide con el BOE:\n  ' + '\n  '.join(dif))
    print(f'✓ Las {len(grupos)} medidas del anexo II coinciden con el BOE: dimensiones y exigencia en BAJO, MEDIO y ALTO')


if __name__ == '__main__':
    main()
