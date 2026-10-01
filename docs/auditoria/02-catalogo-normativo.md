# Auditoría del catálogo de Rosetta multinorma

> **Informe original de la auditoría (1 de octubre de 2026).** Se conserva tal como se redactó, sobre el código de ese momento. Qué se ha corregido desde entonces y qué queda pendiente está en [AUDITORIA_PRODUCCION.md](../AUDITORIA_PRODUCCION.md). Las rutas a pruebas de concepto y scripts de medición se refieren al material de trabajo de la auditoría, que no se versiona.

**Objeto:** `src/data/catalog.json` (113 controles unificados; ENS 73, ISO/IEC 27001 117, NIS2 57, ISO/IEC 42001 64 requisitos) y su motor `src/engine/rosetta-engine.js`.
**Fecha:** 1 de octubre de 2026. **Alcance:** solo lectura. No se ha modificado el repositorio.
**Correcciones en formato máquina:** `audit-data-fixes.json`. Contiene 15 correcciones del catálogo y 8 del motor. Se ha simulado su aplicación sobre una copia del catálogo y todas se aplican sin errores (`audit-data/sim.js`).

> **Limitación de fuentes.** El proxy de salida de este entorno bloqueó el acceso a BOE, EUR-Lex, ISO OBP, CCN-CERT y otros sitios. Solo funcionó la búsqueda web, que devuelve fragmentos. La verificación se ha hecho con conocimiento experto de los textos oficiales y con esos fragmentos. Las URL citadas son las fuentes canónicas que hay que consultar. Lo que no se ha podido confirmar con un fragmento lleva la marca *«verificar»*.

---

## 1. Resumen

| Área | Resultado |
|---|---|
| **ENS, Anexo II** | Están las 73 medidas, con códigos y nombres correctos. La aplicabilidad por nivel y los refuerzos coinciden con el RD 311/2022 en todo lo que se ha podido contrastar: op.pl.1 (`+R1`/`+R2`) y op.acc.6 (`+[R1 o R2 o R3 o R4] + R8 + R9` …) están confirmados con fuente. **Falta el articulado**: Declaración de Aplicabilidad (art. 28), auditoría bienal (art. 31), INES (art. 32) y notificación al CCN-CERT (art. 33). Además, los **refuerzos no se modelan**: son solo texto. |
| **ISO/IEC 27001:2022** | Están los 93 controles del Anexo A, con numeración y títulos correctos. **Falta la cláusula 6.1.1.** No se recoge la enmienda Amd 1:2024 sobre cambio climático en 4.1 y 4.2; es informativo. |
| **ISO/IEC 42001:2023** | Están los 38 controles del Anexo A (A.2–A.10), con ids correctos. **Falta la cláusula 6.1.1.** |
| **NIS2** | Las secciones 1 a 13 del anexo del RE 2024/2690 están completas y bien tituladas. Se representan los arts. 20.1, 20.2, 21.2 j, 21.4 y 23.4 a, b y d. **Faltan el art. 23.4 c (informe intermedio) y el 23.4 e (informe de situación).** No hay requisitos para el art. 21.2 a–i de la Directiva. Esto importa porque el RE solo obliga a los proveedores digitales del art. 1 del RE. |
| **Calidad de las correspondencias** | Se han revisado 62 controles (sección 4). En general son buenas. Hay **sobreafirmaciones relevantes**: op.pl.5 (CPSTIC) aparece como equivalente «total» de A.8.27; INC-07 (24 h/72 h) es necesario para ISO A.5.5/A.5.24; las cláusulas de ISO 42001 se heredan al 100 % desde controles del SGSI; mp.info.5 no tiene ningún control propio. |
| **Motor** | La fórmula de cobertura es razonable. Un requisito solo sale «cubierto» si todos sus controles con w>0 están implantados. Hay 6 defectos con impacto de auditoría (sección 5). El más grave es que **el solapamiento ISO 27001→ENS es del 96 % (66/73 medidas completas)**, una cifra que contradice la práctica del CCN y puede inducir a error a un cliente. |
| **Derechos de autor** | Los títulos en inglés del Anexo A de ISO 27001 son prácticamente literales. Los de ISO 42001 están abreviados y son paráfrasis. No hay texto de controles ISO, así que el riesgo es bajo. Aun así, la afirmación de la herramienta «los títulos son paráfrasis del autor» es inexacta. |
| **Hoja de ruta** | Prioridad 1: RGPD/LOPDGDD, Ley de IA (UE) (Reglamento 2024/1689), DORA y los refuerzos y perfiles del ENS. Prioridad 2: CRA, ISO 22301 e ISO 27701. Prioridad 3: NIST CSF 2.0 y CIS v8.1 (ojo a su licencia). |

**Veredicto:** el catálogo es estructuralmente sólido y útil como herramienta de *gap analysis*. **No debe presentarse a un cliente como evidencia de cumplimiento** sin corregir antes las correcciones de severidad alta: F05, F06, F12, F13, F15, E01, E02, E03, E05 y E06.

---

## 2. Completitud y códigos

### 2.1 ENS (RD 311/2022, Anexo II)

- **Recuento:** 73 medidas en total: org 4, op 33 (pl 5, acc 6, exp 10, ext 4, nub 1, cont 4, mon 3) y mp 36 (if 7, per 4, eq 4, com 4, si 5, sw 2, info 6, s 4). Coincide con el RD.
- **Nombres:** coinciden con el RD 311/2022, por ejemplo op.acc.5 «Mecanismo de autenticación (usuarios externos)», op.exp.10, op.nub.1 y mp.s.4.
- **Dimensiones:**
  - D: op.pl.4, op.cont.*, mp.if.4–6, mp.info.6 y mp.s.4.
  - T: op.exp.8 y mp.info.4.
  - AT: op.acc.1.
  - ICAT: op.acc.2–6.
  - A: mp.eq.2.
  - C: mp.eq.4, mp.com.2, mp.si.1, mp.si.5, mp.info.2 y mp.info.5.
  - IA: mp.com.3 y mp.info.3.
  - IC: mp.si.2.
  - Todo es coherente con el RD.
- **Aplicabilidad por nivel:** coincide con el RD en las 73 filas según mi revisión. Confirmado con fuente: op.pl.1 «aplica / +R1 / +R2» y op.acc.6 «+[R1 o R2 o R3 o R4]+R8+R9 / …+R5+R8+R9 / …+R5+R6+R7+R8+R9». *Verificar* contra la tabla del BOE estas filas, que son las que más se transcriben mal: op.pl.5, op.acc.5 (ALTO), mp.si.1 (BAJO) y mp.s.2 (BAJO `+[R1 o R2]`).
- **Huecos estructurales:**
  1. **Articulado ausente.** Faltan la Declaración de Aplicabilidad firmada (art. 28), la auditoría ordinaria cada dos años para MEDIA/ALTA y la autoevaluación en BÁSICA (art. 31), el INES (art. 32) y la notificación de incidentes al CCN-CERT (art. 33). También faltan los roles y su separación (art. 13) y la conformidad o certificación (art. 38 y siguientes). Consecuencia: **RIE-08 (auditoría) no tiene ningún enlace ENS**, así que un proyecto solo-ENS nunca muestra la auditoría bienal como brecha. Las correcciones F12–F15 lo resuelven. Conviene agruparlas como «Articulado» y ajustar el texto de la UI («73 medidas»).
  2. **Refuerzos.** Las columnas `bajo`, `medio` y `alto` son solo texto. El motor no distingue `op.acc.6` en BÁSICA de `op.acc.6 + R5 + R6 + R7` en ALTA. En categorías MEDIA y ALTA la cobertura queda sistemáticamente sobrestimada (E05).
  3. **Perfiles de Cumplimiento Específicos (PCE) del CCN.** No están soportados. Un PCE puede sustituir el conjunto de medidas por defecto para un colectivo, por ejemplo entidades locales.

### 2.2 ISO/IEC 27001:2022

- **Anexo A:** 93/93 controles (5.1–5.37, 6.1–6.8, 7.1–7.14, 8.1–8.34). Numeración y títulos correctos.
- **Cláusulas:** hay 24 requisitos (4.1–10.2). **Falta 6.1.1**, «Acciones para abordar riesgos y oportunidades — generalidades» (corrección F01). Las subcláusulas 9.2.1–9.2.2 y 9.3.1–9.3.3 están agregadas, lo cual es aceptable.
- **Informativo:** la ISO/IEC 27001:2022/Amd 1:2024 añade el cambio climático a 4.1 y 4.2. Conviene mencionarlo en la ficha de C4.1 y C4.2.
- **Títulos en inglés:** algunos están ligeramente abreviados respecto al oficial. A.5.25, A.5.26 y A.5.27 omiten «information security» y A.5.36 omite «for information security». No es un error de auditoría.

### 2.3 ISO/IEC 42001:2023

- **Anexo A:** 38/38 controles. A.2 (3), A.3 (2), A.4 (5), A.5 (4), A.6.1 (2), A.6.2 (7), A.7 (5), A.8 (4), A.9 (3) y A.10 (3). Los ids son correctos y los títulos son paráfrasis breves aceptables.
- **Cláusulas:** **falta 6.1.1** (F02). Sí están 6.1.4 y 8.4, la evaluación de impacto de los sistemas de IA.

### 2.4 NIS2: Directiva (UE) 2022/2555 y RE (UE) 2024/2690

- **Anexo del RE:** las secciones 1 a 13 están completas: 1.1–1.2, 2.1–2.3, 3.1–3.6, 4.1–4.3, 5.1–5.2, 6.1–6.10, 7, 8.1–8.2, 9, 10.1–10.4, 11.1–11.7, 12.1–12.5 y 13.1–13.3. Los títulos son correctos; 11.7, 12.5 y 13.3 están confirmados con fuente.
- **Art. 20:** 20.1 y 20.2 están representados. La segunda frase del 20.2, que anima a formar también a los empleados, podría enlazarse a PER-04 con w=0.
- **Art. 23:** están 23.4 a (24 h), 23.4 b (72 h), 23.4 d (un mes) y la comunicación a destinatarios (23.1–2). **Faltan 23.4 c**, informe intermedio a petición, y **23.4 e**, informe de situación si el incidente sigue abierto (F03 y F04).
- **Huecos de alcance:**
  - **Art. 21.2 a–i como requisitos propios.** El RE 2024/2690 solo es de aplicación directa a los proveedores de su art. 1: DNS, TLD, nube, centros de datos, CDN, MSP, MSSP, mercados en línea, buscadores, redes sociales y prestadores de confianza. Para un hospital o una empresa de aguas, la obligación es el art. 21.2 transpuesto y el RE es una referencia. El glosario lo reconoce, pero los requisitos solo existen con códigos «RE x.y». Se recomienda añadir las letras 21.2 a–i y enlazarlas.
  - **Otras obligaciones no representadas:** art. 21.3 (cadena de suministro), art. 24 (esquemas de certificación) y art. 27 (registro de entidades digitales).

---

## 3. Errores concretos encontrados

| # | Id | Valor actual | Valor correcto / propuesto | Fuente | Severidad |
|---|---|---|---|---|---|
| 1 | iso27001 · C6.1.1 | ausente | Añadir el requisito y enlazarlo a RIE-01 y RIE-02 (w 0,5) | [ISO OBP 27001](https://www.iso.org/obp/ui/#iso:std:iso-iec:27001:ed-3:v1:en) | Media |
| 2 | iso42001 · C6.1.1 | ausente | Añadir el requisito y enlazarlo a IA-04 (w 1) | [ISO OBP 42001](https://www.iso.org/obp/ui/#iso:std:iso-iec:42001:ed-1:v1:en) | Media |
| 3 | nis2 · Art. 23.4 c | ausente | Informe intermedio a petición → INC-07 (w 1) | [Directiva 2022/2555](https://eur-lex.europa.eu/eli/dir/2022/2555/oj) | Media |
| 4 | nis2 · Art. 23.4 e | ausente | Informe de situación → INC-07 (w 1) | ídem | Media |
| 5 | OPE-16 → ens op.pl.5 | w=1 | Eliminar el enlace. Crear **DES-08 «Productos certificados (CPSTIC)»** → op.pl.5 w=1; ISO A.5.21 y NIS2 6.1 con w=0 | [RD 311/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191), Anexo II op.pl.5; [guías CCN-STIC (105)](https://www.ccn-cert.cni.es/es/800-guia-esquema-nacional-de-seguridad/) | **Alta** |
| 6 | INC-07 → iso27001 A5.5 y A5.24 | w=0,5 | w=0 (relación informativa) | ISO 27001 no impone plazos regulatorios; art. 23 de la Directiva | Media |
| 7 | ens · mp.info.5 | solo soportes parciales (ACT-05 y ACT-06 al 0,5) | Nuevo control **ACT-10 «Limpieza de metadatos»** con w=1; ACT-05→mp.info.5 pasa a w=0 | RD 311/2022, mp.info.5; CCN-STIC 835 | Media |
| 8 | RIE-02 → iso27001 C8.1 | w=1 (soporte único) | w=0,5; añadir OPE-03 y PRO-01 → C8.1 con w 0,5 | ISO 27001 cl. 8.1 (cambios planificados y procesos externos) | Media |
| 9 | ens op.pl.5 · `ref` | «…8.9 Gestión de la configuración…» | Quitar 8.9 | parejasClase; RD 311/2022 | Baja |
| 10 | ens op.exp.3 · `ref` | «…8.13 Copias de seguridad» | Quitar 8.13 | parejasClase | Baja |
| 11 | ens · art. 28 | ausente | Declaración de Aplicabilidad → RIE-02 (w 1) | [RD 311/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191) *(verificar apartado)* | **Alta** |
| 12 | ens · art. 31 | ausente | Auditoría (bienal en MEDIA/ALTA; autoevaluación en BÁSICA) → RIE-08 (w 1) | RD 311/2022; CCN-STIC 808 | **Alta** |
| 13 | ens · art. 32 | ausente | INES → RIE-07 (w 1) | RD 311/2022 *(verificar apartado)* | Media |
| 14 | ens · art. 33 | ausente | Notificación al CCN-CERT → INC-07 (w 1) | RD 311/2022 | **Alta** |
| 15 | i18n `nis2Law` | «España aún no ha publicado la ley…» | Correcto a octubre de 2026, pero incompleto. Debe decir que **siguen vigentes el RDL 12/2018 y el RD 43/2021 (NIS1)**, con obligación de notificar para operadores de servicios esenciales y proveedores de servicios digitales. También debe citar el anteproyecto de Ley de Coordinación y Gobernanza de la Ciberseguridad (aprobado en primera vuelta el 14-01-2025, sin publicar en el BOE a julio-agosto de 2026 según fuentes secundarias) y el dictamen motivado de la Comisión del 7-05-2025 | [estado NIS2 España](https://nisd2.eu/es/wiki/timelines-and-status/nis2-status-spain), [A. Ortega](https://angelortegacastro.com/ley-coordinacion-gobernanza-ciberseguridad-nis2-estado-boe/), [Creando Patria jul-2026](https://ciberseguridad.creandopatria.com/noticia/nis2-sigue-sin-publicarse-en-el-boe-en-julio-de-2026-espana-encara-la-recta-final-antes-de-la-aplicacion-plena-prevista-para-octubre-2) | Media |
| 16 | UI `nis2Box` (pastilla «RE 2024/2690 de aplicación directa») | Aparece si `infraDigital=true` aunque la entidad esté fuera de alcance. Ejemplo: el caso CitaFácil, una pyme SaaS pequeña, sale «fuera» y a la vez «RE de aplicación directa» | Mostrarla solo si el tipo es esencial o importante | Arts. 2–3 de la Directiva; art. 1 del RE | Media |

### Análisis de `parejasClase` (ref ENS → ISO frente a los mapas)

Resultado: 224 parejas; 196 con cobertura, 4 solo de relación y **24 sin ningún control común**. Las he clasificado así:

- **Ref errónea o muy débil: quitar del `ref`.**
  - op.pl.5→A8.9 y op.exp.3→A8.13: corrección propuesta (F10 y F11).
  - org.4→A8.20, org.4→A5.2, org.2→A8.1, org.3→A5.14, op.exp.4→A8.31, op.acc.1→A8.15, op.exp.10→A5.17, op.exp.6→A8.16, op.mon.1→A8.20, mp.s.3→A8.16, mp.si.3→A5.9 y mp.info.3/4→A8.26.
- **Correspondencia legítima que falta en los mapas: añadir con w=0 o w=0,5.**
  - op.ext.4→A8.20 (RED-04 → A8.20 con 0,5).
  - mp.if.7→A7.2 (FIS-05 → A7.2 con 0,5).
  - mp.eq.4→A8.20.
  - op.exp.5→A8.29 y op.pl.3→A8.29 (DES-03 → op.exp.5 y op.pl.3 con 0,5).
  - mp.s.1→A8.24 (OPE-15 → A8.24 con 0,5).
  - mp.s.4→A5.30.
  - org.4→A5.10 y op.pl.2→A8.26 (relación).

Recomendación: que el campo `ref` se **derive de los mapas** o se valide en los tests (parejasClase con `faltan` = 0), para que no haya dos fuentes de verdad.

---

## 4. Revisión de correspondencias (62 controles)

Leyenda: ✔ correcta; ▲ sobreafirmada (el peso w o la equivalencia es excesivo); ▼ infraafirmada o falta un enlace; ✖ errónea.

| Control | Enlaces revisados | Juicio | Comentario / propuesta |
|---|---|---|---|
| GOB-01 Política | org.1=1, C5.2=1, A5.1=1, RE 1.1=1, 42001 A2.3=0,5 | ✔ | RE 1.1 exige además las políticas temáticas. Se cubre con GOB-05, que está al 0,5 sobre 1.1. |
| GOB-02 Roles | C5.3=1, A5.2=1, RE 1.2=1, org.1=0,5 | ✔/▼ | El ENS exige los roles del art. 13 (información, servicio, seguridad y sistema, con separación). Falta el requisito del articulado. |
| GOB-03 Dirección | C5.1, A5.4, art. 20.1, 42001 C5.1 (todos 1) | ▲ (42001) | 42001 5.1 exige compromiso con la *política de IA*. Un compromiso solo de seguridad no basta: w=0,5. |
| GOB-04 Formación de la dirección | art. 20.2=1 | ✔ | Añadir PER-04 → 20.2 con w=0 (la frase sobre empleados). |
| GOB-05 Normativa y procedimientos | org.2=1, org.3=1, A5.37=1, A5.10=0,5 | ✔ | |
| GOB-06 Contexto y alcance | 27001 C4.1–4.4=1; 42001 C4.1–4.4=1 | ▲ | 42001 4.1 exige determinar el **rol de la organización respecto a la IA** y el uso previsto. Un alcance solo del SGSI no lo cubre. Hay que bajar las cláusulas 42001 a 0,5 o crear «IA-00 Contexto del SGIA». |
| GOB-07 Objetivos y cambios | C6.2, C6.3 (en ambas normas)=1 | ▲ (42001) | Mismo patrón: los objetivos de IA son distintos de los de seguridad. |
| GOB-08 Información documentada | C7.5 (en ambas)=1, org.3=0,5 | ✔ | Genérico; aceptable si el control se define para «todos los sistemas de gestión en alcance». |
| GOB-09 Comunicación | C7.4=1, 42001 A8.5=0,5 | ✔ | |
| GOB-10 Recursos | C7.1=1 | ✔ | |
| GOB-11 Autoridades | A5.5=1, A5.6=1, org.3=0,5 | ▲ leve | org.3 no trata el contacto con autoridades. En el ENS, la relación con el CCN-CERT está en op.exp.7 y en el art. 33. |
| GOB-12 Autorización | org.4=1 | ✔ | |
| GOB-13 Proyectos | A5.8=1, op.pl.3=0,5, RE 6.1=0,5 | ✔ | |
| RIE-01 Análisis de riesgos | op.pl.1=1, C6.1.2=1, C8.2=1, RE 2.1=1 | ✔ | En ALTA, op.pl.1+R2 exige análisis formal; queda sin modelar (E05). |
| RIE-02 Tratamiento y SoA | C6.1.3=1, **C8.1=1**, C8.3=1 | ▲ | C8.1 → 0,5 (F09). |
| RIE-03 Inteligencia de amenazas | A5.7=1, op.mon.3=0,5, op.pl.1=0,5 | ✔ | |
| RIE-04 Requisitos legales | A5.31=1, A5.32=1 | ✔ | |
| RIE-05 Datos personales | mp.info.1=1, A5.34=1 | ✔ | Base natural para un futuro módulo RGPD. |
| RIE-07 Métricas | op.mon.2=1, C9.1=1, RE 7=1, 42001 C9.1=1 | ▲ (42001) | Las métricas del SGIA son de desempeño de los sistemas de IA: 0,5. Añadir el INES (art. 32 del ENS). |
| RIE-08 Auditoría | C9.2, A5.35, A8.34, RE 2.3=1 | ▼ | **Sin enlace ENS**; falta el art. 31 (F13). |
| RIE-09 Revisión por la dirección | C9.3=1, art. 20.1=0,5 | ✔ | |
| RIE-10 Cumplimiento de políticas | A5.36=1, RE 2.2=1 | ✔ | |
| RIE-11 No conformidades | C10.1, C10.2, art. 21.4=1 | ✔ | |
| PER-01 Antecedentes | A6.1=1, RE 10.2=1, mp.per.1=0,5 | ✔ | |
| PER-02 Deberes | mp.per.1=1, mp.per.2=1, A6.2=1, A6.6=1, RE 10.1=1 | ✔ | |
| PER-03 Concienciación | A6.3=1, C7.3=1, RE 8.1=1, 42001 C7.3=1 | ▲ | A6.3 incluye formación: w=0,5. 42001 7.3 trata la concienciación sobre la política de IA: w=0,5, y añadir IA-01. |
| PER-04 Formación | C7.2=1, RE 8.2=1, 42001 C7.2=1, **42001 A4.6=1** | ✖ | A.4.6 consiste en *documentar* los recursos humanos y competencias del sistema de IA: PER-04→A4.6 con 0,5 e IA-03→A4.6 con 1. |
| PER-05 Disciplinario | A6.4, RE 10.4=1 | ✔ | |
| PER-06 Cese | A6.5, A5.11, RE 10.3, RE 12.5=1 | ✔ | |
| PER-07 Teletrabajo | A6.7=1 | ✔ | |
| ACT-01 Inventario | op.exp.1, A5.9, RE 12.4=1 | ✔ | |
| ACT-02 Clasificación | mp.info.2=1, mp.si.1=1, A5.12=1, A5.13=1, RE 12.1=1 | ✔ | La «calificación» del ENS se rige por normativa legal y no solo por política interna; se puede anotar. |
| ACT-04 Soportes | mp.si.3=1, mp.si.4=1, A7.10=1, RE 12.3=1 | ✔ | |
| ACT-05 Borrado | mp.si.5=1, A8.10=1, A7.14=1, **mp.info.5=0,5** | ✖ (mp.info.5) | La limpieza de documentos no es borrado (F08). |
| ACT-06 Transferencia | A5.14=1 | ✔ | |
| ACT-07 Enmascaramiento y DLP | A8.11, A8.12=1 | ✔ | |
| ACT-08 Copias | mp.info.6, A8.13, RE 4.2=1 | ✔ | RE 4.2 exige además redundancia (CON-04 al 0,5). Correcto. |
| ACT-09 Firma y sellado | mp.info.3=1, mp.info.4=1 | ✔ | |
| ACC-01 Identificación | op.acc.1, A5.16, RE 11.5=1 | ✔ | |
| ACC-02 Acceso | op.acc.2, A5.15, A8.3, RE 11.1=1 | ✔ | |
| ACC-03 Derechos | op.acc.4, A5.18, RE 11.2=1 | ✔ | |
| ACC-04 Segregación | op.acc.3, A5.3=1 | ✔ | |
| ACC-05 Privilegiados | A8.2, A8.18, RE 11.3, RE 11.4=1 | ✔ | |
| ACC-06 Autenticación | op.acc.5=1, op.acc.6=1, A5.17=1, A8.5=1, RE 11.6=1 | ✔ (a nivel de medida) | En MEDIA y ALTA el ENS exige MFA (R5 y siguientes). ACC-07 está al 0,5; sin modelar refuerzos se sobrestima. |
| ACC-07 MFA | RE 11.7=1, art. 21.2 j=0,5, op.acc.5 y op.acc.6=0,5 | ✔ | |
| OPE-01 Bastionado | op.exp.2=1, A8.9=0,5, RE 6.3=0,5 | ✔ | Delta ENS: configuraciones según guías CCN-STIC (no reflejado). |
| OPE-02 Configuración | op.exp.3, A8.9, RE 6.3=1 | ✔ | |
| OPE-03 Cambios | op.exp.5, A8.32, RE 6.4=1 | ✔ | Añadir → C8.1 con 0,5 (F09). |
| OPE-04 Parcheo | op.exp.4=1, A7.13=1, RE 6.6=1, A8.8=0,5 | ✔ | |
| OPE-05 Vulnerabilidades | A8.8=1, RE 6.10=1 | ✔ | RE 6.10 incluye la divulgación coordinada, que ya está en la descripción. |
| OPE-06 Malware | op.exp.6, A8.7, RE 6.9=1 | ✔ | |
| OPE-08 Registros | op.exp.8, A8.15=1, RE 3.2=0,5 | ✔ | |
| OPE-10 Monitorización | op.mon.1=1, op.mon.3=1, A8.16=1, RE 3.2=1 | ✔ | |
| OPE-11 Capacidad y DoS | op.pl.4=1, mp.s.4=1, A8.6=1 | ▲ leve | A.8.6 no cubre la denegación de servicio. El enlace es aceptable porque el control combina ambas cosas, pero el traductor muestra mp.s.4 ↔ A8.6 como «total». |
| OPE-12 Puestos | mp.eq.3=1, mp.eq.4=1, A8.1=1 | ✔ | |
| OPE-14 Criptografía | op.exp.10=1, mp.si.2=1, A8.24=1, RE 9=1 | ✔ | Delta ENS: algoritmos autorizados por el CCN (CCN-STIC 807). |
| OPE-16 Arquitectura y certificados | op.pl.2=1, **op.pl.5=1**, A8.27=1 | ✖ | El traductor muestra **op.pl.5 ↔ A.8.27 «total»**. Hay que separarlo (F05 y F06). |
| RED-01 a RED-05 | mp.com.*, A8.20–8.22, RE 6.7–6.8, art. 21.2 j | ✔ | |
| DES-01 SDLC | mp.sw.1, A8.25, A8.28, RE 6.2=1 | ✔ | |
| DES-03 Pruebas | mp.sw.2=1, A8.29=1, A8.33=1, **RE 6.5=1** | ▲ | RE 6.5 abarca pruebas periódicas de los sistemas en explotación, como pentest, y no solo la aceptación: w=0,5, y añadir OPE-05 al 0,5. |
| DES-06 Adquisición | op.pl.3=1, RE 6.1=1, A5.19=0,5 | ✔ | |
| PRO-01 a PRO-05 | op.ext.*, op.nub.1, A5.19–5.23, RE 5.1–5.2 | ✔ | Delta ENS en op.nub.1 R1/R2: servicios en la nube certificados ENS y configurados según guías CCN. |
| INC-01 a INC-06 | op.exp.7 y op.exp.9, A5.24–5.28, A6.8, RE 3.1–3.6 | ✔ | |
| INC-07 Notificación | art. 23.4 a/b/d=1; **A5.5 y A5.24=0,5**; op.exp.7=0,5 | ▲ | ISO → w=0 (F07). ENS → añadir el art. 33 (F15). Faltan 23.4 c y e (F03 y F04). |
| INC-08 Destinatarios | 23.1–2=1, 42001 A8.4=1 | ▲ leve | 42001 A.8.4 se refiere a incidentes del sistema de IA: 0,5. |
| CON-01 a CON-05 | op.cont.*, A5.29, A5.30, A8.14, RE 4.1–4.3 | ✔ | |
| FIS-01 a FIS-04 | mp.if.1–6, A7.1–7.6, A7.8, A7.11, A7.12, RE 13.x | ✔ | |
| FIS-05 Entrada y salida | mp.if.7=1, A7.9=1 | ▲ leve | mp.if.7 se corresponde mejor con A7.2 y A7.10. A7.9 es «activos fuera de las instalaciones»: 0,5. |
| IA-01 a IA-14 | 42001 A.2–A.10, cláusulas 6.1.2–8.4 | ✔ | Bien construidos. Los enlaces a seguridad son w=0, lo cual es correcto. |

**Patrón sistémico.** Los controles de sistema de gestión compartidos (GOB-03, GOB-06, GOB-07, RIE-07, PER-03 y PER-04) enlazan con w=1 tanto la cláusula de ISO 27001 como la de ISO 42001, que tienen la misma redacción de la «estructura armonizada». El texto es idéntico pero el objeto es distinto (seguridad frente a IA). Hay dos opciones:

- **(a)** Bajar a 0,5 los enlaces de 42001.
- **(b)** Añadir al estado del control un atributo «sistemas de gestión cubiertos». La cláusula 42001 solo contaría como cubierta si el control declara incluir el SGIA.

---

## 5. Semántica del motor

1. **Fórmula de cobertura** (`coberturaReq`): es la media ponderada Σw·score/Σw, y el requisito sale «cubierto» solo si score = 1, es decir, si todos los controles con w>0 están implantados. Es **sólida y conservadora**: los controles marcados «no aplica» puntúan 0 y CO-02 los señala. Defectos:
   - **E01 (alta).** Si todos los enlaces de un requisito son parciales (w=0,5), basta con implantarlos para que salga «cubierto» aunque por definición ninguno lo cubra entero. Ocurre hoy con ENS mp.info.5 y con ISO 42001 C5.3 y C8.1. Propuesta: sin ningún enlace w=1, el estado máximo es «parcial».
   - **E02 (alta).** Se puede excluir cualquier requisito, incluidas las cláusulas 4–10 de ISO 27001 y 42001 (que no son excluibles) y las obligaciones de los arts. 20, 21.4 y 23 de NIS2. CO-07 solo exige que haya justificación. Propuesta: lista de requisitos no excluibles. Para el ENS, la exclusión debe exigir justificación y, en su caso, medidas compensatorias.
   - Los KPI «ahorro» y «reutilización» son métricas comerciales, no de auditoría. Conviene etiquetarlas así.
2. **ENS: `nivelExigidoEns`.**
   - Las medidas de «Categoría» usan la categoría del sistema. Las medidas por dimensión usan el máximo nivel entre sus dimensiones y, si no se han valorado, la categoría. Es correcto y conservador.
   - **E04.** La categoría se puede fijar a mano por debajo de máx(niveles). Según el Anexo I del RD 311/2022, la categoría es el nivel más alto de cualquier dimensión, así que debe forzarse.
   - **E05.** Faltan los refuerzos (ver 2.1).
   - `desdeSoaEns` hereda estados por media ponderada con umbrales de 0,95 y 0,2. Una SoA del ENS con op.pl.5 «implantada» marca OPE-16 como implantado y propaga a ISO A.8.27. Se resuelve con F05.
3. **Solapamiento e inferencia (E06, alta).** `solapamiento` da **ISO 27001→ENS 96 % (66/73 medidas completas)**, ISO→NIS2 93 % y NIS2→ENS 80 %. «Implantar A» activa todos los controles con cualquier enlace w>0 en A, de modo que se heredan también los «deltas» propios de B: productos CPSTIC, notificación CCN-CERT/LUCIA, nube certificada ENS, configuraciones CCN-STIC y refuerzos.
   - Tras aplicar F05–F15, ISO→ENS baja a 66/77 y ISO→NIS2 a 85 % (50/59). Sigue siendo alto, así que el ajuste estructural es necesario: propagar solo enlaces w=1 y modelar los deltas por norma.
   - Esta cifra no debe enseñarse a un cliente como «ya cumples el 96 % del ENS». La experiencia de certificación del CCN y del sector (por ejemplo, los talleres de «upgrading» de ISO 27001 a ENS) muestra brechas sustanciales.
4. **NIS2: `nis2Aplicabilidad` frente a los arts. 2–3.**
   - **Correcto:** art. 3.1 a (anexo I y gran empresa → esencial); art. 3.1 b (QTSP, TLD y DNS → esencial sin umbral); art. 3.1 c (telecomunicaciones medianas → esencial; pequeñas → importante por el art. 2.2 a i y el 3.2); art. 3.1 d (administración central); art. 3.2 (anexo I mediana y anexo II mediana o grande → importante); administración regional y local «a confirmar» (art. 2.5). Los cinco casos de `casos.json` se clasifican correctamente.
   - **E03, faltan:**
     - art. 3.1 f: **entidades críticas de la Directiva CER (UE) 2022/2557**, esenciales sea cual sea su tamaño. En España son relevantes los operadores críticos de la Ley 8/2011.
     - Art. 3.1 e y art. 2.2 b–e: designaciones expresas (hoy solo hay una nota).
     - Prestadores de confianza **no cualificados**: entran en el ámbito con independencia del tamaño (art. 2.2 a iii) y hoy salen «fuera» si son pequeños.
     - Art. 2.4: servicios de registro de dominios, solo a efectos del art. 28.
     - **Lex specialis del art. 4**: para banca e infraestructuras de mercados financieros, DORA sustituye a los arts. 21 y 23.
     - Exclusiones de los arts. 2.7–2.8: seguridad nacional, defensa y justicia.
     - El cálculo de tamaño con empresas asociadas y vinculadas de la Recomendación 2003/361.
   - **Bug de UI:** la pastilla «RE de aplicación directa» aparece también para entidades fuera de alcance (error 16 de la tabla).
   - **España, octubre de 2026:** NIS2 sigue sin transponerse. El anteproyecto de Ley de Coordinación y Gobernanza de la Ciberseguridad (14-01-2025) crea el Centro Nacional de Ciberseguridad, reparte la supervisión y convive con el ENS. Mientras tanto siguen vigentes el RDL 12/2018 y el RD 43/2021, y la herramienta no los modela.
5. **Reglas de coherencia.**
   - CO-01, CO-04 y CO-05 están bien dirigidas.
   - CO-03, que usa solo enlaces w=1, es correcta.
   - **E07:** CO-06 solo salta si el estado es «brecha» (debería ser «≠ cubierto») y CO-09 no avisa cuando falta la fecha de revisión.
   - Faltan reglas de alto valor:
     - **ENS MEDIA/ALTA sin auditoría bienal** (art. 31).
     - **ENS sin Declaración de Aplicabilidad firmada**.
     - **NIS2 con entidad del sector financiero → aviso DORA**.
     - **ISO 42001 junto con la Ley de IA**: sistema de alto riesgo sin FRIA ni registro.
     - **NIS2 «esencial» o «importante» sin registro ante la autoridad**.

---

## 6. Derechos de autor

| Contenido | Situación | Riesgo |
|---|---|---|
| Texto del ENS (RD 311/2022) | Norma legal. El art. 13 del TRLPI excluye de protección las disposiciones legales | Nulo |
| Directiva NIS2 y RE 2024/2690 | Su reutilización está permitida (Decisión 2011/833/UE; aviso legal de EUR-Lex) | Nulo |
| Títulos del Anexo A de ISO/IEC 27001 en inglés (`t_en`) | **Prácticamente literales** (por ejemplo «Information security roles and responsibilities», «Secure system architecture and engineering principles») | **Bajo.** Los títulos cortos y la numeración se usan ampliamente en mapeos públicos (NIST OLIR, ENISA), pero ISO se reserva la reproducción y la serie completa de 93 títulos ordenados reproduce la estructura de la norma |
| Títulos en español de ISO 27001 (`t`) | Muy próximos a la traducción UNE-EN ISO/IEC 27001:2023, que es © UNE | Bajo |
| Títulos de ISO/IEC 42001 | Abreviados y parafraseados | Muy bajo |
| Descripciones `obj` y `ev` de los controles unificados | Redacción propia; no se ha detectado texto de ISO 27002 ni de ISO 42001 | Nulo |
| Guías CCN-STIC | Solo se citan por número | Nulo |

**Recomendaciones:**

1. Mantener los **identificadores** y sustituir `t_en` y `t` de ISO por **etiquetas propias de 2 a 5 palabras**, distintas del título oficial (por ejemplo, A.5.2 «Asignar funciones de seguridad»).
2. Ofrecer una **importación local opcional de títulos o textos oficiales aportados por el usuario** con licencia ISO o UNE, guardada en su navegador o proyecto y **nunca distribuida** con la herramienta.
3. Corregir `methodSrc`: hoy afirma que «los títulos son paráfrasis breves del autor», y no es cierto para ISO 27001.
4. Añadir este aviso: «ISO/IEC 27001 y 42001 © ISO/IEC; las referencias no sustituyen a la norma; se requiere licencia para su texto».
5. No incorporar nunca guía de implantación de ISO 27002 ni de 42001 (Anexo B).
6. **CIS Controls** se distribuye con licencia CC BY-NC-ND 4.0, que restringe el uso comercial y las obras derivadas. Habría que consultar al CIS antes de incluirlo.

---

## 7. Hoja de ruta de marcos

| Prioridad | Marco | Motivo para un consultor español o europeo | Esfuerzo estimado | Notas |
|---|---|---|---|---|
| **P1** | **RGPD art. 32 + LOPDGDD** (con arts. 5.1 f, 24, 25, 28, 30, 33–35 y la DA 1.ª de la LOPDGDD) | Aplica a casi todos los clientes. La DA 1.ª obliga al sector público a aplicar las medidas del ENS a los tratamientos | Bajo-medio (~20 requisitos; reutiliza RIE-05, INC-07 y ACT-07) | Texto legal libre. Alto solapamiento |
| **P1** | **Ley de IA (UE), Reglamento 2024/1689** | Complemento natural de ISO 42001. Las prohibiciones y la alfabetización (art. 4) se aplican desde el 02-02-2025 y la IA de propósito general desde el 02-08-2025. Según fuentes secundarias, el *Digital Omnibus* (acuerdo de 7-05-2026, en vigor el 27-07-2026) retrasa el alto riesgo al 02-12-2027 (anexo III) y al 02-08-2028 (anexo I) | Medio-alto (~40–60 requisitos: arts. 9–15, 17, 26, 27 FRIA, 49, 50, 72, 73) | Vigilar las normas armonizadas de CEN-CENELEC JTC 21 |
| **P1** | **DORA (Reglamento 2022/2554)** + RTS 2024/1774 (gestión del riesgo TIC) + RTS/ITS de incidentes + registro de información + TLPT | Se aplica desde el 17-01-2025. Es lex specialis respecto de NIS2 para entidades financieras | Alto (~80–120 requisitos) | Exige el aviso DORA en `nis2Aplicabilidad` |
| **P1** | **Refuerzos del ENS (R1..Rn) y PCE del CCN** | Hoy la cobertura del ENS en MEDIA y ALTA está sobrestimada (E05) | Medio (~150 refuerzos con sus condiciones `[Rx o Ry]`) | Texto del BOE, sin problema de licencia |
| P2 | **CRA (Reglamento 2024/2847)** | **Las obligaciones de notificación del art. 14 se aplican desde el 11-09-2026**; todas las demás desde el 11-12-2027. Relevante para fabricantes de software | Medio (~25 requisitos: anexo I partes I y II, y arts. 13–14) | Encaja con DES-* y OPE-05 |
| P2 | **ISO 22301:2019** | Muy pedida junto al ENS (op.cont.*) y por NIS2 4.x | Bajo (cláusulas 4–10 + 8.2–8.6; reutiliza CON-*) | Mismas cautelas de copyright que ISO |
| P2 | **ISO/IEC 27701** (edición 2025, ahora certificable de forma independiente) | Privacidad sobre el SGSI; une RGPD y 27001 | Medio | Requiere licencia ISO; usar paráfrasis |
| P3 | **NIST CSF 2.0** | Clientes multinacionales | Bajo (106 subcategorías). Es de dominio público y NIST publica mapeos OLIR a 27001 | |
| P3 | **CIS Controls v8.1** | Muy operativo y técnico | Bajo-medio (153 salvaguardas) | **Licencia CC BY-NC-ND**: requiere acuerdo con el CIS para un producto comercial |
| P3 | Otros: ISO 27017/27018, PCI DSS v4.0.1, esquema EUCS (cuando se adopte), ENS para servicios en la nube (op.nub.1 R1/R2) | A demanda | Variable | |

---

## 8. Fuentes

- RD 311/2022 (ENS), BOE-A-2022-7191: https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
- Guías CCN-STIC serie 800 (804, 808, 809, 825, 835) y CCN-STIC 105 (CPSTIC): https://www.ccn-cert.cni.es/es/800-guia-esquema-nacional-de-seguridad/
- Directiva (UE) 2022/2555 (NIS2): https://eur-lex.europa.eu/eli/dir/2022/2555/oj
- Reglamento de Ejecución (UE) 2024/2690: https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj
- ISO/IEC 27001:2022 (vista previa OBP): https://www.iso.org/obp/ui/#iso:std:iso-iec:27001:ed-3:v1:en
- ISO/IEC 42001:2023 (vista previa OBP): https://www.iso.org/obp/ui/#iso:std:iso-iec:42001:ed-1:v1:en
- Confirmación de las secciones 11.7, 12.5 y 13.3 del RE: https://nisd2.eu/wiki/umsetzung/mfa-pflicht-nis2 , https://www.cyberday.ai/requirement/nis2-guide-12-5-deposit-return-or-deletion-of-assets-upon-termination-of-employment
- Estado de NIS2 en España: https://nisd2.eu/es/wiki/timelines-and-status/nis2-status-spain , https://angelortegacastro.com/ley-coordinacion-gobernanza-ciberseguridad-nis2-estado-boe/ , https://ciberseguridad.creandopatria.com/noticia/nis2-sigue-sin-publicarse-en-el-boe-en-julio-de-2026-espana-encara-la-recta-final-antes-de-la-aplicacion-plena-prevista-para-octubre-2
- Digital Omnibus y Ley de IA: https://www.gibsondunn.com/wp-content/uploads/2026/05/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes.pdf , https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-omnibus-vii-deadline-delay-20260/
- Reglamento (UE) 2024/1689 (Ley de IA): https://eur-lex.europa.eu/eli/reg/2024/1689/oj ; DORA: https://eur-lex.europa.eu/eli/reg/2022/2554/oj ; CRA: https://eur-lex.europa.eu/eli/reg/2024/2847/oj

*Scripts y extractos de trabajo:* `audit-data/controls.txt` (volcado de los mapas), `audit-data/build-fixes.js` y `audit-data/sim.js` (simulación de las correcciones).
