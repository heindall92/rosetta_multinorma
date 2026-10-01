# Política de seguridad

Rosetta va a trabajar con datos reales de cumplimiento (declaraciones de aplicabilidad, brechas, responsables y evidencias). Una vulnerabilidad aquí expone información sensible de una organización, así que se toma en serio.

## Versiones con soporte

| Versión | Soporte |
|---|---|
| 2.2.x (rama principal) | ✅ |
| Anteriores | ❌ |

## Cómo informar de una vulnerabilidad

**No abras una *issue* pública.** Usa una de estas vías:

1. [Aviso de seguridad privado de GitHub](https://github.com/heindall92/rosetta_multinorma/security/advisories/new) (preferida).
2. Correo a **yoandyramirezdelgado@gmail.com** con el asunto `[SEGURIDAD] Rosetta`.

Incluye: versión o *commit*, navegador, pasos para reproducirlo, impacto y, si lo tienes, una prueba de concepto (un fichero JSON o Excel de ejemplo vale más que mil palabras).

## Qué puedes esperar

| Plazo | Compromiso |
|---|---|
| 72 h | Acuse de recibo |
| 7 días | Evaluación inicial y severidad (CVSS 4.0) |
| 30 días | Corrección o mitigación para severidad alta o crítica |
| Tras publicar la corrección | Divulgación coordinada y reconocimiento, si lo deseas |

## Alcance

Dentro: el código de `src/`, el fichero generado `dist/index.html`, los scripts de `scripts/` y los flujos de `.github/workflows/`. En especial: XSS, contaminación de prototipos, inyección de fórmulas en exportaciones, evasión de la validación de ficheros importados, fugas de datos a terceros y cadena de suministro.

Fuera: ataques que requieren acceso físico al equipo desbloqueado de la víctima o una extensión maliciosa del navegador, ingeniería social y denegación de servicio por ficheros enormes que el propio usuario elige abrir.

## Modelo de amenazas resumido

| Activo | Amenaza | Defensa actual |
|---|---|---|
| Datos del proyecto en `localStorage` | Otro usuario del mismo perfil del navegador u otra página del mismo origen | Documentado y avisado; cifrado en reposo en la fase 1 de la hoja de ruta |
| Ficheros importados (JSON, Excel) | XSS, contaminación de prototipos, estado inválido | Esquema con listas blancas, `safeParse`, `Object.prototype` congelado, límites de tamaño |
| Exportaciones CSV/Excel | Inyección de fórmulas al abrirlas | `noFormula()` en cada celda |
| Código servido | Cadena de suministro | CSP con hashes; sin peticiones a terceros al cargar; librerías de Excel autoalojadas con SRI |
