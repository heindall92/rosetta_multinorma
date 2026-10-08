# Cambios

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
- **Tipografía revisada con la guía apple-design (Emil Kowalski).**
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
