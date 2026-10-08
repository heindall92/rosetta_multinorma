# Cambios

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
