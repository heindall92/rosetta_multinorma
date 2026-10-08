# Hoja de ruta de Rosetta multinorma

Siguientes versiones y por qué. La preparación para usar Rosetta con datos reales de cliente (arquitectura, cifrado, evidencias, informes) está en [docs/AUDITORIA_PRODUCCION.md](docs/AUDITORIA_PRODUCCION.md); este documento trata de **qué marcos cubre** Rosetta y cómo crecer sin romper lo que ya funciona.

## De dónde sale

La publicación de Rosetta en LinkedIn (octubre de 2026, más de 5.600 impresiones) trajo dos peticiones concretas de profesionales del sector:

- **Zaki Aroutin** (director de sistemas en el sector aéreo) preguntó por **Part-IS de AESA**. Se le respondió que es viable y que iría en la siguiente versión, con la invitación a revisar el mapeo. **Es un compromiso público: va primero.**
- **Javier Pages** (Head of GRC, marcos unificados de control) pidió **más marcos públicos** (IEC 62443, ISO/IEC 20000, NIST, RIA, CRA) **y marcos privados ad hoc**.

Las dos encajan con el rumbo del ecosistema: marcos públicos sin problemas de derechos de autor, sectores regulados (banca, transporte, industria) y correcciones hechas en abierto con revisión experta, como la de Heyker D. con la CCN-STIC 825 en la 2.3.0.

## Estado actual (2.10.0): hoja de ruta completada

- Marcos: **ENS** (RD 311/2022), **ISO/IEC 27001:2022**, **NIS2** (Directiva 2022/2555 y Reglamento de Ejecución 2024/2690), **ISO/IEC 42001:2023** **Part-IS** (Reglamentos (UE) 2023/203 y 2022/1645) el **RIA** (Reglamento (UE) 2024/1689, con el Ómnibus 2026/1744) el **CRA** (Reglamento (UE) 2024/2847), el **NIST CSF 2.0** y **DORA** (Reglamento (UE) 2022/2554), relacionados mediante un catálogo común de 134 controles (`src/data/catalog.json`).
- ENS ↔ ISO/IEC 27001 sigue la CCN-STIC 825; el resto de correspondencias son criterio propio y la interfaz lo indica. Las de Part-IS nunca pasan de parciales.
- **Perfil regulatorio** con la propuesta de marcos aplicables y su base legal; el mapa circular dibuja solo los marcos del alcance.
- **Marcos propios** en JSON o CSV, con mapeo asistido.

---

## 2.4.0 · Part-IS, marcos propios y perfil regulatorio ✓ publicada

### 1. Part-IS (EASA / AESA)

**Fuentes, citables por ser legislación de la UE (EUR-Lex):**

| Reglamento | Ámbito | Aplicable desde |
|---|---|---|
| Reglamento Delegado (UE) 2022/1645 | Organizaciones de diseño y producción (requisitos `IS.D.OR`) | 16-10-2025 |
| Reglamento de Ejecución (UE) 2023/203 | Operadores, mantenimiento, formación, ATM/ANS, aeródromos… (requisitos `IS.I.OR`) | 22-02-2026 |

Fechas y numeración contrastadas el 8 de octubre de 2026 con el BOE (DOUE-L-2023-80133, DOUE-L-2022-81402, DOUE-L-2025-81691), las Easy Access Rules for Information Security de EASA y sus guías de supervisión y de derogación.

**Requisitos de organización** (la misma estructura en los dos reglamentos):
- .200 Sistema de gestión de la seguridad de la información (SGSI)
- .205 Evaluación de riesgos · .210 Tratamiento de riesgos
- .215 Notificación interna · .220 Detección, respuesta y recuperación de incidentes · .225 Respuesta a hallazgos de la autoridad
- .230 Notificación externa a la autoridad
- .235 Contratación de actividades · .240 Personal · .245 Registros · .250 Manual del SGSI · .255 Cambios · .260 Mejora continua

**Matices que el mapeo tiene que reflejar:**
- Part-IS mide el impacto en la **seguridad operacional de la aviación** (*aviation safety*), no solo en la confidencialidad, integridad y disponibilidad de la información. Cada correspondencia con ENS, ISO/IEC 27001 o NIS2 debe decir si cubre ese matiz o se queda en parcial.
- La **notificación externa** (.230) tiene plazos y destinatario propios (la autoridad competente: AESA en España, o EASA). No equivale a la de NIS2 aunque se parezca.
- Las correspondencias son **criterio propio**: no hay guía oficial de equivalencias. Se marcan como tales y nunca pasan de parciales, igual que NIS2 e ISO/IEC 42001.
- En el asistente de **Alcance**, una pregunta de aplicabilidad: «¿Es una organización aprobada por EASA o AESA (operador, CAMO, Part-145, Part-21, ATO, ATM/ANS, aeródromo…)?».

**Revisión experta:** al publicar, invitar a Zaki Aroutin a revisar el mapeo. Lo que corrija se documenta en el CHANGELOG con su nombre, como con Heyker.

### 2. Marcos propios (ad hoc)

El usuario importa su propio marco (una política corporativa, los requisitos de un cliente, un pliego o una norma de la que tiene licencia) y Rosetta lo relaciona con el catálogo común. A partir de ahí calcula su cumplimiento como el de cualquier otra norma.

**Por qué es la pieza clave:** resuelve las peticiones de marcos con derechos de autor (IEC 62443, ISO/IEC 20000) **sin reproducir su texto**. Rosetta solo publicaría la numeración; cada organización carga el texto desde su copia y se queda en su navegador.

**Formato de intercambio** (JSON versionado, validado en `src/app/01b-security.js`):

```json
{
  "format": "rosetta-marco",
  "version": 1,
  "id": "pol-acme-2026",
  "nombre": "Política de seguridad de ACME 2026",
  "tipo": "propio",
  "requisitos": [
    {
      "id": "ACME-07",
      "titulo": "Copias de seguridad cifradas y probadas cada trimestre",
      "texto": "Texto opcional que aporta el usuario",
      "controles": [{ "control": "<id del catálogo común>", "fuerza": "parcial" }]
    }
  ]
}
```

- **Fuerza** con la misma escala de la 2.3.0: `equivalente`, `parcial` o `relacion` (peso 0).
- **Importación también desde CSV** (`id;titulo;texto;controles`) con plantilla descargable. Celdas que empiezan por = + − @ neutralizadas al exportar.
- **Asistente de mapeo:** para cada requisito sin controles, se proponen los del catálogo por palabras clave. El usuario confirma; nunca se asigna nada sin revisión.
- **Sanear todo lo que entra:** tamaño máximo, sin claves de prototipo, identificadores con patrón, textos recortados, límite de requisitos.
- **Interfaz:** el marco propio aparece junto a las normas en Resumen, Requisitos, Brechas y Exportar, con una etiqueta «Marco propio» y la indicación de que su mapeo es del usuario.
- **Se exporta** con el proyecto y por separado, para compartirlo con otros equipos.

### 3. Perfil regulatorio: qué normas aplican según región y sector

Idea de Yoandy a partir de los perfiles de ponderación de CTEM-Nexus. Hoy el usuario marca a mano qué normas entran en el proyecto. Solo NIS2 tiene un asistente que razona su aplicabilidad (artículos 2 y 3).

La propuesta es generalizar ese asistente. A partir de **dónde opera** la organización y **qué es**, Rosetta propone qué marcos le aplican y por qué, y el mapa circular muestra solo los que el auditor confirma.

**Preguntas del perfil** (pocas y en lenguaje de negocio):
- **Jurisdicción:** España, otro Estado de la UE, o fuera de la UE (con país, para las leyes LATAM futuras).
- **Sector:** el actual de NIS2, más aviación.
- **Rasgos:**
  - sector público o proveedor TIC del sector público;
  - entidad financiera;
  - organización aprobada por EASA o AESA;
  - desarrolla o despliega sistemas de IA;
  - fabrica productos con elementos digitales;
  - tamaño.

**Lo que devuelve el motor** para cada marco del catálogo (función pura en `rosetta-engine.js`, con pruebas):

| Estado | Significado | Ejemplo |
|---|---|---|
| **Obligatoria** | La impone una norma, que se cita | ENS para una Administración española (RD 311/2022, art. 2); Part-IS para un operador aprobado |
| **A confirmar** | Depende de algo que el asistente no puede saber | NIS2 en una administración local, pendiente de la ley de transposición |
| **Contractual o voluntaria** | No la exige la ley, pero se elige | ISO/IEC 27001 para certificarse o porque un cliente la pide en el pliego |
| **No aplica** | Con el motivo | ENS para una empresa privada sin contratos con el sector público |

**Cómo se ve:**
- **Alcance** muestra la propuesta con su base legal. El auditor acepta, quita o añade marcos. **Nunca se oculta nada sin confirmar**: la decisión final es del auditor y queda guardada con su motivo.
- El **mapa circular** dibuja solo los marcos en alcance. En su leyenda, cada uno lleva una marca del motivo (obligatoria, contractual o voluntaria), sin recargar el anillo.
- **Exportar e informes** incluyen una tabla «Marcos aplicables y por qué». Es el primer folio que pide un auditor.

**Por qué en la 2.4.0:** Part-IS necesita igualmente su pregunta de aplicabilidad, y cada marco nuevo de la hoja de ruta (RIA, CRA, DORA, leyes LATAM) añade solo su regla al perfil, sin rehacer el asistente.

**Cuidado:** el motor propone, no dictamina. Cada regla cita su artículo y la interfaz recuerda que la aplicabilidad final la confirma el responsable jurídico o el auditor.

### Aceptación de la 2.4.0

- [x] Part-IS completo (los 13 requisitos de organización de cada reglamento) en el catálogo, con fuente y fecha de consulta en EUR-Lex.
- [x] Perfil regulatorio (jurisdicción, sector y rasgos) con estado y base legal de cada marco, incluida la aplicabilidad de Part-IS. Pruebas del motor por cada regla; el auditor confirma y su decisión queda guardada; el mapa y los informes muestran el motivo.
- [x] Marcos propios: importar (JSON y CSV), mapear, calcular, exportar y borrar, con validación hostil probada.
- [x] Ficheros de ejemplo ficticios en `src/data/` o `tests/`: un marco propio y un CSV.
- [x] Pruebas del motor nuevas para Part-IS y para el cálculo con marcos propios; e2e de importar y mapear; axe con 0 infracciones en las vistas nuevas.
- [x] Interfaz completa en español y en inglés.
- [x] README, CHANGELOG, capturas y cifras de pruebas al día.
- [ ] Publicación en LinkedIn **al menos 3 o 4 días después** de la anterior, citando las dos peticiones y con invitación a revisar.

---

## Después de la 2.4.0 (una norma por versión)

| Versión | Marco | Fuente citable | Notas |
|---|---|---|---|
| 2.5.0 ✓ publicada | **RIA / AI Act** | Reglamento (UE) 2024/1689 | Se cruza con ISO/IEC 42001, que ya está en Rosetta. Obligaciones por rol (proveedor, responsable del despliegue) y por nivel de riesgo. |
| 2.6.0 ✓ publicada | **CRA** | Reglamento (UE) 2024/2847 | Requisitos esenciales del anexo I para productos con elementos digitales. Interesa a fabricantes de software y hardware. |
| 2.7.0 ✓ publicada | **NIST CSF 2.0** | Publicación del NIST (dominio público en EE. UU.) | Seis funciones, incluida *Govern*. Útil para clientes internacionales y para LATAM. |
| 2.8.0 ✓ publicada | **DORA** | Reglamento (UE) 2022/2554 y sus normas técnicas | Banca y servicios financieros. Se relaciona con NIS2, que ya se menciona en el asistente de Alcance. |
| 2.9.0 ✓ publicada | **Chile**: Ley 21.663 y Ley 21.719 | Diario Oficial de Chile | Perfil con país y «también opera en»; dominio de privacidad. |
| 2.10.0 ✓ publicada | Protección de datos de **Colombia, México, Perú y Argentina** | Ley 1581, LFPDPPP 2025, Ley 29733 y Reglamento 2024, Ley 25.326 | Reutiliza el dominio de privacidad. |

**Mediante marcos propios, sin texto en el repositorio:** IEC 62443 e ISO/IEC 20000. Como mucho se publicaría una plantilla con su numeración; el texto lo pone quien tiene la licencia.

## Reglas que no cambian

- **Nunca texto de normas ISO o IEC**, solo numeración y títulos abreviados propios.
- Cada correspondencia indica su origen: guía oficial o criterio propio.
- Local-first: los marcos propios y su texto no salen del navegador.
- Autor: Yoandy Ramírez Delgado. Las revisiones externas se reconocen por su nombre en el CHANGELOG.
