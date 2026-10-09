# 06 · Contenido GRC, tono y ecosistema

## Propiedad intelectual y fuentes

- **ISO/IEC** (27001, 27002, 27005, 22301, 42001, 19011…): solo número y título breve propio de cláusula o control (p. ej. «A.5.15 Control de acceso»). Nunca el texto. Nunca copias filtradas, escaneos ni resúmenes que sustituyan a la norma.
- **BOE** (RD 311/2022 del ENS, LOPDGDD, transposición de NIS2…) y **diarios oficiales de la UE** (NIS2, DORA, RGPD, AI Act): se pueden citar literalmente, con referencia (artículo, anexo, fecha).
- **CCN-STIC**: referenciar las guías (p. ej. 825 para equivalencias ENS ↔ ISO) sin reproducir tablas completas.
- **NIST** (CSF 2.0, SP 800-53, 800-61): dominio público en EE. UU.; citar igualmente la fuente.
- **PCI DSS**: solo referencias a requisitos por número.
- **MITRE ATT&CK**: IDs y nombres de técnicas con atribución y aviso de marca; **CISA KEV** y **FIRST EPSS**: datos públicos con fuente y fecha de descarga.
- Material de cursos (exámenes, casos de profesores como TechServ): no se publica ni se usa como contenido.
- **Aviso de independencia** en README, ayuda e informes: la herramienta no está afiliada ni respaldada por ISO, IEC, PECB, CCN, Gartner, MITRE, CISA, FIRST ni ninguna entidad de certificación; no sustituye una auditoría.

## Tono

- Español de España, claro, directo y técnico. Frases cortas, verbos concretos, cifras exactas.
- Sin relleno de IA: nada de «¡Excelente pregunta!», «en el panorama actual», «sumérgete», «potencia tu…», listas de emoji, ni cierres del tipo «¿Quieres que…?» cuando la tarea está clara.
- En la interfaz, microtexto que explica el **porqué** («Corta 3 rutas hacia el controlador de dominio»), no solo el qué.
- Las correcciones se **explican** (qué estaba mal, por qué, cómo se ha comprobado). Si fallaste tú, dilo.
- **Sin jerga que el público no entiende.** Cada término técnico se define donde aparece por primera vez (glosario de la ayuda e indicación en el campo). En todo el ecosistema se dice **«activo crítico»** (criticidad 5: aquel cuyo compromiso pararía el negocio o expondría su información más sensible), **nunca «joya de la corona»**; como mucho se menciona que en la jerga del sector se llama así.
- Con Yoandy: resumen final breve con lo hecho, lo encontrado, cifras de pruebas y el siguiente paso.

## Estrategia de LinkedIn (analítica 2–8 oct 2026)

- 12 580 impresiones, 5 324 miembros alcanzados, 2 914 seguidores (+204 en la semana).
- **Lo que más rinde son los lanzamientos GRC**: Rosetta (5 175 impresiones, 264 interacciones), #grc #ens #iso27001 (3 621). Pentesting/HTB: 200–480. Los picos de seguidores coinciden con lanzamientos GRC.
- **Espaciar los lanzamientos 3–4 días o más** (uno publicado justo después de otro se quedó en 348).
- Público: consultoría TI 24 %, seguridad 14 %, banca 9 %; jefes de seguridad y auditores; Madrid 11 %, LATAM fuerte (Buenos Aires, Bogotá, Santiago, CDMX, Lima, Quito). **Mencionar LATAM y banca.**
- Siguiente ola de marcos sin problemas de derechos: NIST CSF 2.0, DORA, NIS2 y su transposición, leyes LATAM (Chile Ley 21.663, Colombia, México, Perú, Argentina), PCI DSS solo por referencias.
- Formato: carrusel o captura + enlace a la demo en vivo. Artículos prácticos tipo «de un Nmap a un plan de remediación con SLA».
- Ángulo diferencial: el **puente ofensivo ↔ GRC** (CTEM-Nexus, ENS AD Auditor, ARGOS).

## Ecosistema (cada herramienta enlaza a las demás y comparte JSON de intercambio)

| Herramienta | Repositorio | Web | Qué hace | Firma visual |
|---|---|---|---|---|
| Rosetta Multinorma | `heindall92/rosetta_multinorma` | heindall92.github.io/rosetta_multinorma/ | ENS, ISO/IEC 27001, NIS2 e ISO/IEC 42001 sobre 115 controles unificados (CCN-STIC 825) | Anillos y círculos |
| ENS Compliance Studio | `heindall92/grc_ens_compliance_studio` | …/grc_ens_compliance_studio/ | Categorización, MAGERIT y declaración de aplicabilidad; se importa en Rosetta | Propia |
| KAIROS | `heindall92/kairos` | …/kairos/ | Continuidad: BIA, BCP, DRP y ruta crítica de recuperación | Propia (tiempo) |
| CTEM-Nexus | `heindall92/ctem-nexus` | …/ctem-nexus/ | Prioriza exposición técnica y rutas de ataque hacia los activos críticos | Franjas por activo y grafo |
| ENS AD Auditor | `heindall92/ens_ad-auditor` | (sin web publicada) | Directorio activo frente a las medidas del ENS | Propia |
| ARGOS | `heindall92/argos-grc` | …/argos-grc/ | Laboratorio GRC estilo Hack The Box: rutas, máquinas con flags, simulacros, rangos y logros | Propia (juego) |
| Norvik | `heindall92/Norvik_Gobernanza` | (sin web publicada) | Gobernanza: roles, políticas y el marco que une al resto | Propia |

Antes de afirmar que una web existe, compruébalo; si no hay, `web: null` y solo enlace al código.

## Autor (para «Acerca de», README e informes)

**Yoandy Ramírez Delgado** · Junior Pentester · eJPTv2 · AI Governance (ISO 42001) · SysAdmin · GitHub `heindall92` · `yoandyramirezdelgado@gmail.com`.
