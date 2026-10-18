# Cambios

## 2.15.1 · octubre de 2026

- **Herramientas GRC del autor:** Ayuda → Acerca de pasa a ocho herramientas. Se suma **MCP-Shield**, que audita las configuraciones MCP de los asistentes de IA (Claude Desktop, Cursor, VS Code). Sus hallazgos llegan a Rosetta como evidencia por control a través de CTEM-Nexus 1.2.1: cadena de suministro → DES-09/OPE-05, secretos → ACC-06/OPE-14, ficheros → ACC-02/OPE-01 y *tool poisoning* → OPE-01/OPE-10.
- **Pruebas.** La e2e de Acerca de comprueba las ocho tarjetas y los enlaces a la web y al código de MCP-Shield.

## 2.15.0 · octubre de 2026

**Perfiles de cumplimiento específicos del CCN** (art. 30 del RD 311/2022).

- **CCN-STIC 881A (universidades, categoría MEDIA) y 890A (requisitos fundamentales de entidades locales pequeñas, categoría BÁSICA).** Datos en `src/data/perfiles-ccn.json`, generados con `scripts/perfiles-ccn.py` desde los PDF oficiales, que no se suben al repositorio. Solo se guardan datos objetivos de la declaración de aplicabilidad: el nivel de cada medida, los refuerzos que añade el perfil y la condición. Los criterios específicos se resumen con redacción propia. El script comprueba el recuento de cada guía (69 y 38 medidas) y admite `--check`.
- **Motor.** `indexar` recibe los perfiles y `aplicaReq` aplica el del proyecto (`alcance.ens.perfil`) a las 73 medidas del anexo II: nivel del perfil, refuerzos añadidos sin duplicar, N/A como «no exigida por el perfil» y medidas condicionales (`alcance.ens.perfilCond`: `evidencia` en la 881A, `nis2` en la 890A). El articulado se exige siempre. Fuera de su categoría el perfil no se aplica y se calcula con el anexo II.
- **Regla CO-26 (alta).** Perfil aplicado a un sistema de categoría superior a la del perfil (RD 311/2022, art. 30).
- **Interfaz.** Selector de perfil y casillas de condición en *Alcance → ENS* y en el asistente, con el ámbito, el recuento, el aviso de CO-26 y la nota de la CCN-STIC 892, retirada el 28-03-2025. En la ficha de la medida aparecen el nivel, la guía y el criterio del perfil. Pregunta nueva en la ayuda.
- **Exportaciones.** El resumen del Excel y el informe Markdown declaran el perfil. La SoA del ENS lleva el nivel y la exigencia del perfil, el motivo de las medidas no exigidas y el criterio en la justificación.
- **Anexo II contrastado con el BOE.** `scripts/anexo2-boe.py` compara las dimensiones y la exigencia BAJO/MEDIO/ALTO de las 73 medidas con el texto consolidado del RD 311/2022: las 73 coinciden.
- **Ctrl + Z** deshace en Rosetta aunque el foco esté en una casilla o un desplegable. Antes el atajo se perdía en el navegador, y con el redibujado parcial de la 2.14.0 el foco se queda en el control.
- **Pruebas.** 6 del motor, 1 e2e, 1 de exportaciones y 4 de axe. Total: 169 de motor, catálogo y build, y 96 en navegador.

## 2.14.0 · octubre de 2026

**Accesibilidad y ritmo de trabajo.** Cierra los cuatro puntos de experiencia que seguían abiertos en la auditoría de producción (M2, M3, M8 y M11).

- **La rueda se recorre con el teclado (M3).** Una sola parada de tabulador (foco itinerante); las flechas recorren los 152 controles, Re Pág y Av Pág saltan de dominio, Inicio y Fin van al primero y al último, e Intro abre la ficha. El núcleo de la rueda anuncia el control enfocado, cada rayo tiene nombre accesible y, al cerrar la ficha, el foco vuelve a la rueda. Los atajos están en la ayuda.
- **Acciones en bloque en Controles (M8).** Estado, responsable y fecha de revisión para todos los controles que muestra el filtro actual, con un solo Ctrl + Z para deshacerlo.
- **Redibujado parcial (M2).** Cada cambio compara el HTML nuevo con el de la vista y solo toca lo que cambia: con la CPU ralentizada ×4, el trabajo del navegador por clic baja de 164 a 69 ms en Resumen, de 353 a 72 ms en Controles, de 208 a 39 ms en Requisitos y de 739 a 107 ms en Correspondencias (medido con trazas de Chrome). Se conservan el foco, el scroll y los paneles abiertos.
- **Formateadores en caché.** `pct()` y las fechas creaban un formateador `Intl` en cada llamada: ~150 ms por redibujado del Resumen con la CPU lenta.
- **Exportaciones en inglés (M11).** La exigencia del ENS se traduce en el Excel («applies», «n/a») y las leyes de Latinoamérica llevan nombre en inglés («Law 21.663 (Chile)», «LFPDPPP (Mexico)»). El resto de textos ya estaba en el diccionario.
- **Pruebas.** 3 e2e (rueda con teclado, acciones en bloque, redibujado parcial), 4 de axe, comprobaciones en inglés en la suite de exportaciones y etiquetas en el motor. Total: 163 de motor, catálogo y build y 90 en navegador.

## 2.13.0 · octubre de 2026

**Refuerzos del ENS.** Cierra el hallazgo E05 de la auditoría de producción.

- **92 refuerzos del anexo II** del RD 311/2022 con título en español e inglés y el texto del BOE (`src/data/refuerzos.json`, generado del mismo anexo que usa ENS Compliance Studio).
- **Motor:** `exigenciaRefuerzos` y `refuerzosEstado` leen la exigencia de cada nivel (obligatorios y grupos «[R2 o R3 o R4]») igual que Compliance Studio. Con la evaluación activa, una medida sin sus refuerzos no pasa de 0,5.
- **Regla CO-25 (media):** medidas del ENS sin los refuerzos de su nivel, con los que faltan. CO-06 ya no las cuenta como controles parciales.
- **Interfaz:** casillas por refuerzo en la ficha de la medida, con su papel y el texto del RD; resumen en cada fila de *Requisitos* y aviso en la cabecera; interruptor «Evaluar los refuerzos» en *Alcance* y en el asistente.
- **Compatibilidad:** los proyectos nuevos evalúan los refuerzos; los anteriores a la 2.13.0 no cambian hasta activarlo.
- **Excel:** columna «Refuerzos implantados» en la SoA del ENS; importación desde una columna «Refuerzos» de la plantilla y desde la tabla de refuerzos de las copias de ENS Compliance Studio.
- **Casos:** TechServ, el hospital y Lumen evalúan los refuerzos y enseñan un hueco cada uno; CitaFácil, en BÁSICA, los tiene completos.
- **Exportaciones verificadas:** nueva suite `e2e-exportar.test.mjs` con las 108 exportaciones de los nueve casos en los dos idiomas (Excel, Markdown, CSV, JSON, sobre para CTEM-Nexus y copia de seguridad) e ida y vuelta del proyecto. Fuera de la CI se abrieron además con openpyxl, LibreOffice Calc, html5lib (la app) y el esquema de `yrd-ecosistema`: cero fallos.
- **Accesibilidad:** contraste de las etiquetas de estado en la fila seleccionada de *Requisitos* (4,24:1 → AA).
- **Flujo de trabajo:** desde esta versión, cada versión llega como PR desde `version/X.Y.Z`.
- **Contrato con ENS Compliance Studio:** `tests/fixtures/ens-exigencias-refuerzos.json` (219 exigencias) se comprueba aquí y en Studio con el mismo fichero.
- **Pruebas.** 9 del motor, 1 e2e, 1 de Excel, 3 de exportaciones y 4 de axe. Total: 163 de motor, catálogo y build y 83 en navegador.

## 2.12.0 · octubre de 2026

**RGPD y LOPDGDD.** La ley de protección de datos que faltaba: la europea, con su desarrollo español.

- **Marco `rgpd`:** Reglamento (UE) 2016/679 y Ley Orgánica 3/2018, 15 requisitos sobre el dominio de privacidad, sin controles nuevos. Principios y responsabilidad proactiva, base jurídica (consentimiento desde los 14 años), protección desde el diseño, información por capas, derechos en un mes, encargados, registro de actividades, EIPD, DPD, seguridad del art. 32, violaciones a la autoridad en 72 horas y a los interesados, transferencias y derechos digitales de la LOPDGDD (arts. 87–91). 25 controles enlazados; cada requisito tiene al menos un control total.
- **Regla CO-24 (alta):** RGPD en el sector público o en sus proveedores sin el ENS en el alcance, que la disposición adicional primera de la LOPDGDD exige para los datos personales.
- **CO-22** también salta para el RGPD sin procedimiento de violaciones de datos.
- **Perfil regulatorio:** obligatorio en España y en la UE; a confirmar fuera de la Unión (art. 3.2). Solo el registro, la EIPD, el DPD, las transferencias y los derechos digitales admiten exclusión justificada.
- **Casos:** el hospital y CitaFácil incluyen el RGPD, con el estado de los diez controles de privacidad.
- **Exportación:** hoja «RGPD» (en inglés, «GDPR») en el Excel y fila en el informe.
- **BOE:** comprobada la exigencia por nivel de op.pl.5, op.acc.5, mp.si.1 y mp.s.2 contra el texto consolidado del RD 311/2022; coincide con el catálogo. Era el pendiente de exactitud de la auditoría de producción.
- **Seguridad:** `window.__ROSETTA__` solo existe con el navegador automatizado (`navigator.webdriver`); en uso normal no se expone nada (punto 0.4 de la auditoría).
- **Corrección:** las tarjetas de las normas decían «1 brechas»; ahora concuerdan en singular y plural.
- **Pruebas.** 11 del motor, 2 e2e y 2 de Excel. Total: 154 de motor, catálogo y build y 73 en navegador, con axe a cero.

## 2.11.1 · octubre de 2026

- **Herramientas GRC del autor:** Ayuda → Acerca de pasa de cuatro a siete herramientas (se suman CTEM-Nexus, ENS AD Auditor, con su panel web, y Norvik, de escritorio) y explica que comparten el sobre de intercambio `yrd-ecosistema`. ARGOS ya describe sus máquinas con flags y sus rangos.
- **Pruebas.** La e2e de Acerca de comprueba las siete tarjetas y sus enlaces. Total: 144 de motor, catálogo y build y 69 en navegador.

## 2.11.0 · octubre de 2026

**Evidencia técnica de CTEM-Nexus.** Primera integración del ecosistema con el sobre común `yrd-ecosistema`.

- **Importar hallazgos de CTEM-Nexus** (Exportar → CTEM-Nexus, o «Importar proyecto» con el sobre). La evidencia se sanea al leerla y al cargar el proyecto: identificadores, bandas, estados, fechas y CVE fuera de formato se descartan.
- **Ficha del control** con la exposición técnica: abiertos por prioridad, KEV, vencidos y los peores hallazgos.
- **Regla CO-23 (alta):** control implantado con hallazgos críticos o altos abiertos.
- **Sobre para CTEM-Nexus** con el estado de los 152 controles y la evidencia recibida sin cambios.
- **Accesibilidad.** Las etiquetas del selector de estado de la ficha no llegaban a 4,5:1 en tema claro (3,6:1). Corregido y cubierto por axe.
- **Pruebas.** 4 del motor, 1 e2e y 4 de axe. Total: 144 de motor, catálogo y build y 69 en navegador.

## 2.10.0 · octubre de 2026

**Protección de datos en Colombia, México, Perú y Argentina.** Con esta versión se completa la hoja de ruta.

- **Colombia:** Ley 1581 de 2012 y Decreto 1377 de 2013, 11 requisitos. Autorización, consultas en 10 días hábiles, reclamos en 15, RNBD, incidentes a la SIC en 15 días hábiles, transferencias y responsabilidad demostrada.
- **México:** LFPDPPP de 2025, 10 requisitos. Aviso de privacidad, consentimiento, derechos ARCO (20 + 15 días), seguridad, vulneraciones, confidencialidad, encargados, transferencias y departamento de datos.
- **Perú:** Ley 29733 y Reglamento de 2024, 9 requisitos. Incidentes graves a la ANPD en 48 horas y oficial de datos personales.
- **Argentina:** Ley 25.326, 10 requisitos. Acceso en 10 días corridos, rectificación en 5 días hábiles, registro ante la AAIP y transferencias. Como la ley no obliga a notificar brechas, la alerta CO-22 no se activa.
- **Perfil por país**, con «también opera en». Solo lo que depende del tamaño o la actividad (registros y oficial de datos) admite exclusión justificada.
- Las cuatro leyes reutilizan el dominio de privacidad: no hacen falta controles nuevos.
- **Energía Austral** suma la ley peruana.
- **Pruebas.** 5 pruebas nuevas del motor y una e2e. Total: 140 de motor, catálogo y build y 64 en navegador.

## 2.9.0 · octubre de 2026

**Latinoamérica, empezando por Chile.**

- **Perfil regulatorio con país.** La jurisdicción admite Chile, Colombia, México, Perú y Argentina, y una casilla nueva, «También opera en». Las normas regionales solo se ven si la organización está u opera en ese país, o si las tiene en el alcance.
- **Ley 21.663 Marco de Ciberseguridad.**
  - 10 requisitos vigentes desde el 01-03-2025, con los deberes del art. 8 solo para operadores de importancia vital.
  - Reporte al CSIRT Nacional en 3 h, 72 h (24 h para OIV) y 15 días.
  - Base: Resolución 295/2024 y taxonomía de la Resolución Ex. 7/2025.
- **Ley 21.719 de protección de datos personales.**
  - 10 requisitos, en vigor desde el 01-12-2026.
  - Aviso del Boletín 18.623-07, que propone aplazarla un año.
  - La notificación de vulneraciones no tiene plazo en horas en la ley, y así se explica.
- **Dominio nuevo, Privacidad y protección de datos (PRI)**, con 10 controles reutilizables para las leyes de datos de la región. Controles nuevos INC-13 (reporte al CSIRT Nacional) y GOB-17 (delegado de ciberseguridad). Catálogo 2.9.0: 152 controles, 14 dominios y 539 requisitos.
- **Coherencia.** CO-21 y CO-22.
- **Caso nuevo:** Energía Austral.
- **Pruebas.** 5 pruebas nuevas del motor y una e2e de visibilidad por país.

## 2.8.0 · octubre de 2026

**DORA**, el Reglamento (UE) 2022/2554 de resiliencia operativa digital del sector financiero, aplicable desde el 17-01-2025.

- **24 requisitos** de los capítulos II a VI: gestión del riesgo TIC (arts. 5–14 y el marco simplificado del art. 16), incidentes (arts. 17–19), pruebas (arts. 24–26), terceros proveedores de TIC (arts. 28–30) e intercambio de información (art. 45).
- **Plazos de notificación del Reglamento Delegado (UE) 2025/301** en la ficha del art. 19: 4 h, 24 h, 72 h y un mes.
- **Régimen general o simplificado y designación para TLPT en Alcance.** Lo que no corresponde figura como no exigido, con su motivo. Solo el art. 45 es excluible.
- **Seis controles nuevos:** GOB-16 (marco de riesgo TIC), CON-06 (programa de pruebas), CON-07 (TLPT), PRO-06 (registro de información), PRO-07 (salida y concentración) e INC-12 (notificación a la autoridad financiera). Catálogo 2.8.0: 140 controles y 519 requisitos.
- **Perfil regulatorio.** DORA es obligatorio para entidades financieras de la UE; NIS2 queda a confirmar por la lex specialis. Ya no quedan normas europeas pendientes.
- **Coherencia.** CO-19 (sin notificación de incidentes graves) y CO-20 (sin registro de información).
- **Caso nuevo:** Ribera Banca Digital, con DORA, ISO/IEC 27001 y el RIA.
- **Pruebas.** 7 pruebas nuevas del motor y una e2e.

## 2.7.0 · octubre de 2026

**NIST Cybersecurity Framework 2.0** (NIST CSWP 29, febrero de 2024).

- **Las 106 subcategorías**, en 6 funciones (Gobernar, Identificar, Proteger, Detectar, Responder y Recuperar) y 22 categorías, con su código oficial y títulos abreviados propios en español e inglés.
- **Cobertura completa.** Cada subcategoría tiene un control unificado que la cubre por completo. No hacen falta controles nuevos: el catálogo ya cubría el CSF. Si se implanta todo lo que exige ISO/IEC 27001, se cubre el 88 % del CSF; con el ENS, el 65 %.
- **Voluntario.** El perfil regulatorio lo propone como contractual o voluntario. Las subcategorías que no encajen en el perfil de la organización se excluyen con su justificación.
- **Correspondencias de criterio propio**, nunca más que parciales.
- **Inicio en el móvil.** Las tarjetas de los casos muestran solo los anillos de las normas de su alcance, y el antetítulo con las ocho normas parte línea en lugar de desbordar.
- **Pruebas.** 4 pruebas nuevas del motor: estructura oficial, cobertura, carácter voluntario y solapamiento.

## 2.6.0 · octubre de 2026

**CRA, la ley europea de ciberresiliencia** (Reglamento (UE) 2024/2847), para fabricantes de productos con elementos digitales.

- **29 requisitos**, cada uno con su fecha de aplicación.
  - Notificación a ENISA y al CSIRT coordinador de vulnerabilidades explotadas e incidentes graves (art. 14), en vigor desde el 11-09-2026.
  - 14 propiedades del producto (anexo I, parte I).
  - 8 de gestión de vulnerabilidades (anexo I, parte II).
  - 6 obligaciones del fabricante: evaluación de riesgos, componentes de terceros, periodo de soporte, información al usuario, documentación técnica y conformidad con marcado CE. El resto aplica desde el 11-12-2027.
- **Exclusiones justificadas solo en los puntos 2 b–m de la parte I**, que el reglamento aplica «cuando proceda».
- **Clase del producto en Alcance**, con su ruta de evaluación de la conformidad.
- **Seis controles nuevos**: DES-09 (SBOM), DES-10 (seguridad por defecto), DES-11 (actualizaciones), DES-12 (información al usuario), DES-13 (riesgos del producto) e INC-11 (notificación a ENISA). GOB-15 (conformidad y marcado CE) se comparte con el RIA. Catálogo 2.6.0: 134 controles y 389 requisitos.
- **Perfil regulatorio.** Para un fabricante, el CRA es obligatorio en la UE y a confirmar fuera. Deja de figurar entre las normas futuras; solo queda DORA.
- **Coherencia.** CO-17 (sin notificación a ENISA) y CO-18 (sin SBOM).
- **Caso nuevo:** Sensórica Levante, fabricante ficticio de cámaras IP de clase I.
- **Mapa circular.** Con más de cinco anillos deja más hueco arriba para las etiquetas.
- **Corregido** (fallo de la 2.5.0): en un proyecto, el interruptor del RIA en «Marcos aplicables y por qué» no lo activaba, y su motivo no se guardaba. Nueva prueba e2e que activa, desactiva y razona cada norma.
- **Pruebas:** 119 de motor, catálogo y build y 59 en navegador.

## 2.5.0 · octubre de 2026

**RIA, el Reglamento europeo de IA** (Reglamento (UE) 2024/1689), con las fechas del Ómnibus digital sobre IA (Reglamento (UE) 2026/1744, publicado el 24-07-2026 y en vigor desde el 27-07-2026).

- **28 obligaciones**, cada una con su rol, su riesgo y su fecha de aplicación.
  - Para todos: alfabetización (art. 4) y prácticas prohibidas (art. 5), desde el 02-02-2025.
  - Modelos de uso general: arts. 53 y 55, desde el 02-08-2025.
  - Transparencia: art. 50, desde el 02-08-2026.
  - Alto riesgo: requisitos del sistema, obligaciones del proveedor y del responsable del despliegue (incluida la evaluación de impacto en derechos fundamentales del art. 27). Del anexo III desde el 02-12-2027 y del anexo I desde el 02-08-2028.
- **Rol y riesgo en Alcance.** Lo que no aplica figura como no exigido, con su motivo, en Requisitos, la ficha y el Excel.
- **Nueve controles nuevos.** Alfabetización (IA-15), prácticas prohibidas (IA-16), supervisión humana (IA-17), calidad y seguimiento poscomercialización (IA-18), impacto en derechos fundamentales (IA-19), transparencia (IA-20), modelos de uso general (IA-21), incidentes graves de IA (INC-10) y evaluación de la conformidad y marcado CE (GOB-15), común a varios reglamentos de producto. Catálogo 2.5.0: 128 controles y 360 requisitos.
- **Correspondencias** con ISO/IEC 42001 y el resto de criterio propio, nunca más que parciales.
- **Perfil regulatorio.** Con IA en la UE, el RIA es obligatorio; fuera de la UE, a confirmar. Deja de figurar entre las normas futuras.
- **Coherencia.** CO-15 (sin alfabetización en IA) y CO-16 (sin revisión de prácticas prohibidas).
- **Casos.** Lumen, CitaFácil y el hospital traen el RIA en su alcance; sus cifras se recalculan.
- **Etiqueta en inglés:** «AI Act».
- **Interfaz.** La ficha de cada requisito muestra su fecha de aplicación y su matiz. Los marcos propios usan colores de reserva menos saturados, para distinguirlos de las normas oficiales.
- **Pruebas.** 8 pruebas nuevas del motor (rol, riesgo, fechas, exclusiones, equivalencias, alertas, perfil y etiqueta) y una e2e. axe con el RIA en el alcance.

## 2.4.0 · octubre de 2026

Responde a dos peticiones recibidas en LinkedIn tras publicar la 2.3.0: **Part-IS**, que pidió Zaki Aroutin (sector aéreo), y **marcos propios**, que pidió Javier Pages (GRC, marcos unificados de control). Añade además el **perfil regulatorio**: Rosetta propone qué marcos aplican según la región, el sector y los rasgos de la organización.

- **Part-IS (EASA/AESA).**
  - Los 13 requisitos de organización (.200 a .260) del Reglamento de Ejecución (UE) 2023/203 (IS.I.OR) y del Reglamento Delegado (UE) 2022/1645 (IS.D.OR), con sus modificaciones 2025/2293 y 2025/22. Fuentes y fecha de consulta en el catálogo.
  - El prefijo de los códigos sigue al reglamento elegido en Alcance (IS.I.OR, IS.D.OR o los dos).
  - Cada requisito explica su matiz: impacto en la seguridad operacional, notificación a la autoridad coordinada con el Reglamento (UE) 376/2014, manual ante la autoridad.
  - Correspondencias de criterio propio que nunca pasan de parciales (`tope: parcial` en el catálogo). Sin exclusiones requisito a requisito: solo la derogación del punto .200 e.
  - Cuatro controles nuevos: RIE-12, RIE-13, GOB-14 e INC-09. Catálogo 2.4.0 con 119 controles y 332 requisitos.
  - Dos reglas de coherencia nuevas: CO-12 (sin notificación a la autoridad aeronáutica) y CO-13 (riesgos sin la mirada de la seguridad operacional).
  - Caso de ejemplo nuevo: Alas del Atlántico, aerolínea regional ficticia.
- **Perfil regulatorio.**
  - Jurisdicción, sector público, proveedor del sector público, entidad financiera, aviación, IA y fabricante, más el sector y el tamaño de NIS2.
  - Para cada marco, el motor propone obligatoria, a confirmar, contractual o voluntaria o no aplica, con su base legal. Por ejemplo: RD 311/2022, arts. 2.1 y 2.3; Directiva (UE) 2022/2555, arts. 2, 3, 4 y 26; Reglamentos de Part-IS.
  - Avisa de DORA, RIA y CRA cuando apliquen, aunque aún no estén en Rosetta.
  - El auditor aplica la propuesta y deja el motivo de cada decisión. Rosetta señala cuándo se aparta de la propuesta.
  - El informe Markdown y el Excel (hoja «Aplicabilidad») abren con «Marcos aplicables y por qué».
  - Los cinco casos anteriores traen su perfil.
- **Mapa circular según el alcance.**
  - El mapa dibuja solo los marcos del alcance, con el grosor del anillo según su número.
  - La leyenda marca por qué está cada marco.
- **Marcos propios.**
  - Importación en JSON `rosetta-marco` o CSV, con plantillas de los dos.
  - Editor de mapeo con sugerencias por palabras clave y fuerza de cada enlace.
  - Cálculo, alertas (CO-14: requisitos sin controles), exportación, borrado con deshacer y persistencia con el proyecto.
  - Validación hostil:
    - sin claves de prototipo;
    - nombres sin marcado;
    - identificadores con patrón;
    - solo controles del catálogo;
    - como mucho 6 marcos y 500 requisitos por marco.
  - Los marcos propios tienen colores de reserva.
  - El nombre de las hojas de Excel se sanea.
- **Portada.** El texto y las cifras destacadas incluyen Part-IS (72 % cubierto con ISO/IEC 27001 implantada), el perfil regulatorio y los marcos propios.
- **Tipografía revisada con la guía apple-design (Emil Kowalski).**
  - **Geist** para el texto y la interfaz y **Geist Mono** para códigos y cifras, la pareja común del ecosistema. Sustituyen a Onest y Martian Mono. **Bricolage Grotesque** queda solo para los titulares y las cifras grandes, como seña de Rosetta. Al ir incrustada, se ve igual en cualquier sistema y en las capturas. La página pesa 27 KB menos.
  - Titulares a anchura normal con un espaciado negativo moderado: el titular de la portada se apretaba hasta tocarse las letras.
  - Ninguna etiqueta por debajo de 0,7 rem.
  - Cuerpo en `rem` para respetar el tamaño de letra del usuario.
  - Etiquetas de los anillos más legibles.
- **Pruebas.**
  - 102 de motor, catálogo y build.
  - 55 en navegador, con la nueva `e2e-marcos.test.mjs` (10 pruebas) y ficheros de ejemplo en `tests/fixtures`.
  - axe con 0 violaciones también en Alcance con el editor de mapeo abierto, en claro y oscuro, a 1440 y 390 px.

Invitación abierta a revisar el mapeo de Part-IS: lo que se corrija quedará reconocido aquí, como la revisión de Heyker D. en la 2.3.0.

## 2.3.0 · octubre de 2026

**Corrección a partir de una revisión externa.** Tras publicar Rosetta, [Heyker D.](https://www.linkedin.com/in/heykerdas/) (consultor GRC y auditor ENS e ISO/IEC 27001) señaló en LinkedIn que las equivalencias ENS ↔ ISO/IEC 27001, hasta entonces de criterio propio, debían alinearse con la guía CCN-STIC 825 del Centro Criptológico Nacional. Esta versión aplica esa corrección:

- **Fuente de las equivalencias.** La fuerza de cada equivalencia ENS ↔ ISO/IEC 27001:2022 sale de la guía, edición de abril de 2026:
  - control principal análogo: equivalente;
  - parcialmente análogo o complementario: parcial;
  - medida sin equivalente en la ISO o apartado 7: relación.
- **Equivalencias rebajadas.** 17 equivalencias que la guía califica de parcialmente análogas dejan de figurar como totales. Por ejemplo, op.exp.7 ↔ 5.24, op.exp.8 ↔ 8.15 y op.cont.4 ↔ 8.14.
- **Enlaces añadidos.** Se añaden los 5 enlaces que faltaban para que los 71 controles principales de la guía compartan un control unificado con su medida. Son de relación (peso 0): el cálculo de cumplimiento no cambia.
- **Criterio propio a la vista.** Las 91 equivalencias ENS ↔ ISO que la guía no recoge se marcan como criterio propio y nunca pasan de parciales.
- **Interfaz.**
  - Cada equivalencia ENS ↔ ISO muestra su origen.
  - La ficha de cada medida muestra su nivel de compatibilidad, su categoría y sus controles ISO.
  - Las 5 medidas sin equivalente en la ISO avisan de que no se heredan de una certificación.
- **Herramientas GRC del autor.** Ayuda → Acerca de enlaza las otras tres herramientas, ARGOS, ENS Compliance Studio y KAIROS, con tarjetas para abrir cada app o ver su código. Prueba e2e de los enlaces y axe sobre esa pestaña.
- **Datos reproducibles.** `src/data/ccn825.json` se regenera desde el PDF oficial con `scripts/ccn825.py`.
- **Documentación y pruebas.**
  - Informe en `docs/auditoria/05-ccn-stic-825.md`.
  - 8 pruebas nuevas del motor: 120 en total.
  - Catálogo 2.2.0.

NIS2 e ISO/IEC 42001 siguen siendo correspondencias de criterio propio: no existe una guía oficial equivalente.

## 2.2.0 y anteriores

El historial previo está en los commits del repositorio.
