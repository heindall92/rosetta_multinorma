# Cambios

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
