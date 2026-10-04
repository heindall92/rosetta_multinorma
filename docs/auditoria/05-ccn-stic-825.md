# 05 · Alineación con la guía CCN-STIC 825 (abril 2026)

> Informe generado a partir de `src/data/ccn825.json` y del catálogo 2.2.0. Fuente: CCN-STIC 825 «Esquema Nacional de Seguridad. Certificaciones 27001», Centro Criptológico Nacional, abril de 2026, apartados 5.2.2, 6 y 7.

## 0. Origen de la corrección

Rosetta 2.2.0 publicaba las equivalencias ENS ↔ ISO/IEC 27001 como criterio propio. Tras la publicación del proyecto, Heyker D. (consultor GRC y auditor ENS e ISO/IEC 27001) aportó en LinkedIn esta revisión: el CCN mantiene la guía CCN-STIC 825, actualizada en abril de 2026, para estandarizar la equivalencia entre ambos marcos y evitar interpretaciones. Este informe documenta la corrección que se hizo en la versión 2.3.0 a partir de esa revisión.

## 1. Qué aporta la guía

Para cada una de las 73 medidas del anexo II del RD 311/2022, la guía indica el **control principal** de ISO/IEC 27001:2022, los **controles complementarios**, la **categoría** recomendada para un sistema integrado y el **nivel de medidas compatible**:
- **Análogo**: ambas normas exigen lo mismo o es asimilable.
- **Parcialmente análogo**: hay que complementar el control o una de las normas es más exigente.
- **Nula**: una de las normas no contempla el control.

El apartado 5.2.2 relaciona las cláusulas 4 a 10 con el articulado del ENS. El apartado 7 cita otros controles de la ISO con su consideración en el ENS.

| Indicador | Valor |
|---|---|
| Medidas del anexo II con entrada en la guía | 73 de 73 |
| Niveles | 42 análogas · 26 parcialmente análogas · 5 nulas |
| Parejas ENS–ISO de la guía | 346 (71 principales, 214 complementarias, 34 de cláusulas, 27 del apartado 7) |
| Principales conectadas por un control unificado | 71 de 71 |
| Equivalencias ENS ↔ ISO de Rosetta fuera de la guía (criterio propio) | 91 |

## 2. Equivalencias corregidas

### 2.1 De «equivalente» a «parcial» por decisión de la guía (17)

La guía califica el control principal de estas medidas como *parcialmente análogo*; Rosetta las daba como equivalencia total.

| ENS | ISO/IEC 27001 | Nivel CCN | Antes | Ahora |
|---|---|---|---|---|
| op.exp.3 | 8.9 Gestión de la configuración | principal · parcialmente análogo | equivalente | parcial |
| op.exp.4 | 7.13 Mantenimiento de los equipos | principal · parcialmente análogo | equivalente | parcial |
| op.exp.7 | 5.24 Planificación y preparación de la gestión de incidentes | principal · parcialmente análogo | equivalente | parcial |
| op.exp.8 | 8.15 Registro de eventos | principal · parcialmente análogo | equivalente | parcial |
| op.exp.10 | 8.24 Uso de la criptografía | principal · parcialmente análogo | equivalente | parcial |
| op.ext.2 | 5.22 Seguimiento, revisión y cambios de los servicios de proveedores | principal · parcialmente análogo | equivalente | parcial |
| op.nub.1 | 5.23 Seguridad en el uso de servicios en la nube | principal · parcialmente análogo | equivalente | parcial |
| op.cont.4 | 8.14 Redundancia de las instalaciones de tratamiento | principal · parcialmente análogo | equivalente | parcial |
| op.mon.2 | cl. 9.1 Seguimiento, medición, análisis y evaluación | principal · parcialmente análogo | equivalente | parcial |
| mp.if.3 | 7.5 Protección contra amenazas físicas y ambientales | principal · parcialmente análogo | equivalente | parcial |
| mp.per.2 | 6.2 Términos y condiciones del empleo | principal · parcialmente análogo | equivalente | parcial |
| mp.eq.3 | 8.1 Dispositivos de usuario final | principal · parcialmente análogo | equivalente | parcial |
| mp.eq.4 | 8.1 Dispositivos de usuario final | principal · parcialmente análogo | equivalente | parcial |
| mp.com.1 | 8.20 Seguridad de las redes | principal · parcialmente análogo | equivalente | parcial |
| mp.si.2 | 8.24 Uso de la criptografía | principal · parcialmente análogo | equivalente | parcial |
| mp.sw.2 | 8.29 Pruebas de seguridad en desarrollo y aceptación | principal · parcialmente análogo | equivalente | parcial |
| mp.s.4 | 8.6 Gestión de la capacidad | principal · parcialmente análogo | equivalente | parcial |

### 2.2 Enlaces añadidos al catálogo (control principal sin control común)

Se añaden como relación (peso 0): aparecen en el traductor con la fuerza que fija la guía y no alteran el cálculo de cumplimiento.

| ENS | ISO/IEC 27001 | Control unificado | Nivel CCN |
|---|---|---|---|
| org.4 | 5.2 Roles y responsabilidades de seguridad | GOB-12 | Parcialmente análogo |
| op.acc.5 | 5.18 Derechos de acceso | ACC-03 | Parcialmente análogo |
| op.mon.1 | 8.20 Seguridad de las redes | RED-01 | Parcialmente análogo |
| mp.if.7 | 7.2 Controles físicos de entrada | FIS-05 | Análogo |
| mp.info.4 | 8.26 Requisitos de seguridad de las aplicaciones | ACT-09 | Nula |

### 2.3 Resto de cambios en el traductor (234)

| Cambio | Parejas | Ejemplos |
|---|---|---|
| — → parcial (complementario) | 123 | org.1→6.4, org.2→5.6, org.2→5.11, org.2→5.24, org.2→7.9, org.2→8.1, … |
| equivalente → parcial (complementario) | 22 | op.pl.2→8.27, op.acc.2→8.3, op.acc.5→8.5, op.exp.7→5.26, op.exp.9→5.27, op.ext.1→5.20, … |
| — → parcial (cláusula (5.2.2)) | 21 | org.1→cl. 4.1, org.1→cl. 4.4, org.1→cl. 6.2, org.1→cl. 7.4, org.1→cl. 7.5, org.2→cl. 7.4, … |
| — → relación (apdo. 7) | 20 | org.1→5.6, org.2→5.32, org.2→6.6, org.4→5.36, op.acc.2→5.17, op.acc.3→8.3, … |
| equivalente → parcial (criterio propio) | 16 | org.2→5.37, op.acc.5→5.17, op.acc.6→5.17, op.mon.1→8.16, mp.if.1→7.2, mp.if.2→7.3, … |
| parcial → equivalente (principal) | 10 | org.2→5.1, op.pl.1→cl. 6.1.1, op.pl.2→5.9, op.exp.9→5.26, op.cont.1→5.29, op.cont.3→5.30, … |
| parcial → relación (apdo. 7) | 6 | org.1→5.4, org.1→5.32, op.acc.1→5.17, op.acc.4→8.3, op.ext.1→8.30, mp.info.1→8.11 |
| — → relación (complementario) | 4 | op.pl.5→5.20, op.ext.4→8.20, mp.info.3→8.26, mp.info.5→5.13 |
| — → parcial (principal) | 3 | org.4→5.2, op.acc.5→5.18, op.mon.1→8.20 |
| parcial → relación (complementario) | 3 | op.pl.5→5.19, op.ext.4→8.21, mp.info.4→8.17 |
| relación → parcial (complementario) | 2 | org.4→8.32, mp.sw.2→8.32 |
| parcial → relación (principal) | 1 | op.ext.4→8.22 |
| — → equivalente (principal) | 1 | mp.if.7→7.2 |
| — → relación (criterio propio) | 1 | mp.eq.3→7.2 |
| — → relación (principal) | 1 | mp.info.4→8.26 |

## 3. Medidas del ENS según la guía

| Medida | Nivel | Categoría | Control principal | Complementarios | Apdo. 7 |
|---|---|---|---|---|---|
| org.1 Política de seguridad | Análogo | MEDIA | 5.1 | 5.2, 6.4, 5.31 | 5.4, 5.6, 5.32 |
| org.2 Normativa de seguridad | Análogo | MEDIA | 5.1 | 5.6, 5.10, 5.11, 5.24, 5.36, 6.7, 7.7, 7.9, 8.1 | 5.32, 6.6 |
| org.3 Procedimientos de seguridad | Análogo | MEDIA | 5.37 | 5.5, 5.14, 5.36 | — |
| org.4 Proceso de autorización | Parcialmente análogo | MEDIA | 5.2 | cl. 5.3, 8.1, 5.10, 7.10, 8.19, 8.20, 8.21, 8.32 | 5.36 |
| op.pl.1 Análisis de riesgos | Análogo | MEDIA | cl. 6.1.1 | cl. 6.1.2, cl. 6.1.3, cl. 8.2, cl. 8.3 | — |
| op.pl.2 Arquitectura de Seguridad | Análogo | MEDIA (+R2*) | 5.9 | 8.20, 8.27 | — |
| op.pl.3 Adquisición de nuevos componentes | Parcialmente análogo | MEDIA | 5.8 | 5.19, 5.20 | — |
| op.pl.4 Dimensionamiento/gestión de la capacidad | Análogo | MEDIA | 8.6 | 5.23 | — |
| op.pl.5 Componentes certificados | Nula | MEDIA | — | 5.19, 5.20 | — |
| op.acc.1 Identificación | Análogo | MEDIA | 5.16 | 5.15 | 5.17 |
| op.acc.2 Requisitos de acceso | Análogo | ALTA* | 5.15 | 5.18, 8.2, 8.3, 8.18, 8.4 | 5.17 |
| op.acc.3 Segregación de funciones y tareas | Análogo | MEDIA* | 5.3 | 5.18, 8.2 | 8.3, 8.19 |
| op.acc.4 Proceso de gestión de derechos de acceso | Análogo | MEDIA | 5.18 | 8.2 | 8.3 |
| op.acc.5 Mecanismo de autenticación (usuarios externos) | Parcialmente análogo | MEDIA | 5.18 | 8.5 | — |
| op.acc.6 Mecanismo de autenticación (usuarios de la organización) | Análogo | MEDIA | 8.5 | 5.15 | — |
| op.exp.1 Inventario de activos | Análogo | MEDIA (+R4) | 5.9 | 5.11, 7.8, 7.9 | 5.32 |
| op.exp.2 Configuración de seguridad | Parcialmente análogo | MEDIA | 8.9 | 8.8, 8.12, 8.19, 8.20, 8.21 | 8.34 |
| op.exp.3 Gestión de la configuración de seguridad | Parcialmente análogo | ALTA* | 8.9 | 8.8, 8.12, 8.13, 8.19, 8.20, 8.21 | 5.36, 8.34 |
| op.exp.4 Mantenimiento y actualizaciones de seguridad | Parcialmente análogo | ALTA* | 7.13 | 8.8, 8.31, 8.32 | 5.36, 8.34 |
| op.exp.5 Gestión de cambios | Análogo | ALTA* | 8.32 | 7.13, 8.8, 8.31 | — |
| op.exp.6 Protección frente a código dañino | Análogo | MEDIA | 8.7 | 8.8, 8.9 | — |
| op.exp.7 Gestión de incidentes | Parcialmente análogo | MEDIA | 5.24 | 5.25, 5.26, 5.27, 5.28, 6.8 | 5.5 |
| op.exp.8 Registro de la actividad | Parcialmente análogo | MEDIA | 8.15 | 8.17 | 5.33 |
| op.exp.9 Registro de la gestión de incidentes | Análogo | MEDIA | 5.26 | 5.24, 5.25, 5.27, 5.28, 6.8 | — |
| op.exp.10 Protección de claves criptográficas | Parcialmente análogo | MEDIA | 8.24 | 5.17 | — |
| op.ext.1 Contratación y acuerdos de nivel de servicio | Análogo | MEDIA | 5.19 | 6.6, 5.20, 5.21 | 8.30 |
| op.ext.2 Gestión diaria | Parcialmente análogo | MEDIA | 5.22 | 5.19, 5.20, 5.21 | — |
| op.ext.3 Protección de la cadena de suministro | Análogo | ALTA* | 5.21 | 5.29 | 8.30 |
| op.ext.4 Interconexión de sistemas | Nula | MEDIA | 8.22 | 8.20, 8.21 | — |
| op.nub.1 Protección de servicios en la nube | Parcialmente análogo | MEDIA | 5.23 | 5.19, 5.20, 5.21, 5.22 | — |
| op.cont.1 Análisis de impacto | Análogo | MEDIA | 5.29 | 5.30 | — |
| op.cont.2 Plan de continuidad | Análogo | ALTA* | 5.29 | 5.30, 8.14 | — |
| op.cont.3 Pruebas periódicas | Análogo | MEDIA | 5.30 | 5.29, 8.13 | — |
| op.cont.4 Medios alternativos | Parcialmente análogo | ALTA* | 8.14 | 5.29, 8.13 | — |
| op.mon.1 Detección de intrusión | Parcialmente análogo | MEDIA | 8.20 | 8.21, 8.23 | — |
| op.mon.2 Sistema de métricas | Parcialmente análogo | MEDIA | cl. 9.1 | — | — |
| op.mon.3 Vigilancia | Análogo | MEDIA | 5.7 | 8.8, 8.16 | 5.33 |
| mp.if.1 Áreas separadas y con control de acceso | Análogo | MEDIA | 7.1 | 7.3, 7.6 | — |
| mp.if.2 Identificación de las personas | Análogo | MEDIA | 7.2 | 7.1, 7.6 | — |
| mp.if.3 Acondicionamiento de los locales | Parcialmente análogo | MEDIA | 7.5 | 7.3, 7.6, 7.8, 7.12 | — |
| mp.if.4 Energía eléctrica | Análogo | MEDIA | 7.11 | 7.12, 5.30 | — |
| mp.if.5 Protección frente a incendios | Análogo | MEDIA | 7.5 | 7.3, 7.6 | — |
| mp.if.6 Protección frente a inundaciones | Análogo | MEDIA | 7.5 | 7.3, 7.6 | — |
| mp.if.7 Registro de entrada y salida de equipamiento | Análogo | MEDIA | 7.2 | 7.3, 7.6 | — |
| mp.per.1 Caracterización del puesto de trabajo | Análogo | MEDIA | 6.1 | 6.2, 5.24 | — |
| mp.per.2 Deberes y obligaciones | Parcialmente análogo | MEDIA | 6.2 | 6.4, 6.5, 5.11, 6.6 | 6.7 |
| mp.per.3 Concienciación | Análogo | MEDIA | 6.3 | 5.24 | — |
| mp.per.4 Formación | Análogo | MEDIA | 6.3 | 5.24 | — |
| mp.eq.1 Puesto de trabajo despejado | Análogo | MEDIA | 7.7 | 7.3, 7.8, 5.10 | — |
| mp.eq.2 Bloqueo de puesto de trabajo | Análogo | MEDIA | 7.7 | 8.9 | — |
| mp.eq.3 Protección de dispositivos portátiles | Parcialmente análogo | ALTA* | 8.1 | 7.9, 5.9, 5.12, 5.24, 5.25 | — |
| mp.eq.4 Otros dispositivos conectados a la red | Parcialmente análogo | MEDIA | 8.1 | 5.9, 5.12, 8.9 | — |
| mp.com.1 Perímetro seguro | Parcialmente análogo | MEDIA | 8.20 | 8.21, 8.9 | — |
| mp.com.2 Protección de la confidencialidad | Parcialmente análogo | MEDIA | 8.21 | 8.20, 8.24, 8.9, 8.26 | — |
| mp.com.3 Protección de la integridad y de la autenticidad | Parcialmente análogo | MEDIA | 8.21 | 8.20, 8.24, 8.9, 8.26 | — |
| mp.com.4 Separación de flujos de información en la red | Análogo | MEDIA | 8.22 | 8.20, 8.27, 5.9 | — |
| mp.si.1 Marcado de soportes | Análogo | MEDIA | 5.13 | 5.12, 7.10, 8.12 | — |
| mp.si.2 Criptografía | Parcialmente análogo | MEDIA (+R2)* | 8.24 | 8.13, 8.12, 7.9, 7.10 | — |
| mp.si.3 Custodia | Análogo | MEDIA | 7.10 | 5.9, 5.10, 5.11, 6.3, 8.12 | — |
| mp.si.4 Transporte | Análogo | MEDIA | 7.10 | 8.24, 8.12, 7.2 | — |
| mp.si.5 Borrado y destrucción | Análogo | MEDIA | 7.10 | 8.10, 8.12 | — |
| mp.sw.1 Desarrollo de aplicaciones | Análogo | MEDIA | 8.25 | 8.28, 8.29, 8.31, 8.32, 8.4, 8.30, 8.27, 5.8 | — |
| mp.sw.2 Aceptación y puesta en servicio | Parcialmente análogo | MEDIA | 8.29 | 8.31, 8.32, 8.33, 8.11, 8.30, 8.27, 5.8 | 8.19 |
| mp.info.1 Datos personales | Análogo | MEDIA | 5.34 | 5.31 | 7.4, 8.11 |
| mp.info.2 Calificación de la información | Análogo | MEDIA | 5.12 | 5.13, 5.14, 5.15, 5.9, 5.10, 8.12 | — |
| mp.info.3 Firma electrónica | Nula | MEDIA | 8.24 | 8.26, 5.31 | — |
| mp.info.4 Sellos de tiempo | Nula | ALTA* | 8.26 | 8.17, 8.24 | — |
| mp.info.5 Limpieza de documentos | Nula | MEDIA | — | 5.13, 8.12 | — |
| mp.info.6 Copias de seguridad | Análogo | MEDIA (+R2)* | 8.13 | 8.14, 7.14, 7.10, 5.37, 5.29, 5.30, 5.31 | — |
| mp.s.1 Protección del correo electrónico | Parcialmente análogo | MEDIA | 5.14 | 8.12, 5.10, 5.23, 6.2, 6.3 | — |
| mp.s.2 Protección de servicios y aplicaciones web | Parcialmente análogo | MEDIA | 8.26 | 5.35, 5.8, 5.17, 8.2, 8.5 | 8.34 |
| mp.s.3 Protección de la navegación web | Análogo | MEDIA | 8.23 | 8.9, 8.12, 6.3 | — |
| mp.s.4 Protección frente a denegación de servicio | Parcialmente análogo | MEDIA | 8.6 | 8.16 | — |

## 4. Equivalencias de criterio propio

Las 91 parejas ENS ↔ ISO que Rosetta deriva de sus controles unificados y que la guía no recoge se muestran marcadas como *criterio propio* y con fuerza máxima parcial. Son candidatas a revisión con un auditor:

org.2→5.37 · org.2→cl. 5.2 · org.3→5.6 · org.3→5.10 · org.3→5.24 · op.pl.1→5.7 · op.pl.2→8.21 · op.pl.2→8.22 · op.pl.3→cl. 8.1 · op.pl.4→8.14 · op.pl.5→5.21 · op.acc.1→8.5 · op.acc.3→8.18 · op.acc.4→5.15 · op.acc.4→8.18 · op.acc.5→5.16 · op.acc.5→5.17 · op.acc.6→5.17 · op.acc.6→6.7 · op.acc.6→8.1 · op.exp.1→5.12 · op.exp.1→5.13 · op.exp.2→8.11 · op.exp.3→8.32 · op.exp.3→cl. 8.1 · op.exp.5→cl. 8.1 · op.exp.6→8.19 · op.exp.8→8.16 · op.ext.1→5.14 · op.ext.1→6.2 · op.ext.1→cl. 8.1 · op.ext.3→5.30 · op.ext.4→5.14 · op.nub.1→cl. 8.1 · op.cont.3→8.14 · op.cont.4→5.30 · op.mon.1→8.15 · op.mon.1→8.16 · op.mon.2→5.36 · mp.if.1→7.2 · mp.if.1→7.4 · mp.if.2→7.3 · mp.if.2→7.4 · mp.if.3→7.11 · mp.if.4→7.5 · mp.if.4→7.8 · mp.if.5→7.8 · mp.if.6→7.8 · mp.if.7→7.9 · mp.if.7→7.10 · mp.per.1→5.2 · mp.per.1→6.6 · mp.per.1→cl. 5.3 · mp.eq.2→8.1 · mp.eq.3→6.7 · mp.eq.3→8.24 · mp.eq.3→7.2 · mp.com.1→8.22 · mp.com.2→5.14 · mp.com.3→6.7 · mp.com.3→5.29 · mp.com.4→8.21 · mp.si.2→8.11 · mp.si.4→5.14 · mp.si.4→7.9 · mp.si.5→7.14 · mp.sw.1→8.26 · mp.sw.2→8.12 · mp.info.1→5.32 · mp.info.1→8.12 · mp.info.1→5.12 · mp.info.4→5.31 · mp.info.5→5.14 · mp.info.5→7.14 · mp.info.5→8.10 · mp.s.1→8.7 · mp.s.1→8.23 · mp.s.2→8.8 · mp.s.2→8.25 · mp.s.2→8.28 · mp.s.2→8.29 · mp.s.3→8.7 · mp.s.4→8.14 · art.28→cl. 6.1.1 · art.28→cl. 8.1 · art.28→cl. 8.3 · art.31→5.35 · art.31→8.34 · art.32→cl. 9.1 · art.33→5.5 · art.33→5.24

## 5. Cómo se regenera

```bash
pip install 'markitdown[pdf]'
markitdown 825-27001_ENS.pdf > 825.md          # PDF oficial descargado del CCN-CERT
python3 scripts/ccn825.py 825.md --check     # falla si src/data/ccn825.json no coincide
```
