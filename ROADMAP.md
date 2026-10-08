# Hoja de ruta de Rosetta multinorma

Siguientes versiones y por qué. La preparación para usar Rosetta con datos reales de cliente (arquitectura, cifrado, evidencias, informes) está en [docs/AUDITORIA_PRODUCCION.md](docs/AUDITORIA_PRODUCCION.md); este documento trata de **qué marcos cubre** Rosetta y cómo crecer sin romper lo que ya funciona.

## De dónde sale

La publicación de Rosetta en LinkedIn (octubre de 2026, más de 5.600 impresiones) trajo dos peticiones concretas de profesionales del sector:

- **Zaki Aroutin** (director de sistemas en el sector aéreo) preguntó por **Part-IS de AESA**. Se le respondió que es viable y que iría en la siguiente versión, con la invitación a revisar el mapeo. **Es un compromiso público: va primero.**
- **Javier Pages** (Head of GRC, marcos unificados de control) pidió **más marcos públicos** (IEC 62443, ISO/IEC 20000, NIST, RIA, CRA) **y marcos privados ad hoc**.

Las dos encajan con el rumbo del ecosistema: marcos públicos sin problemas de derechos de autor, sectores regulados (banca, transporte, industria) y correcciones hechas en abierto con revisión experta, como la de Heyker D. con la CCN-STIC 825 en la 2.3.0.

## Estado actual (2.3.0)

- Marcos: **ENS** (RD 311/2022), **ISO/IEC 27001:2022**, **NIS2** (Directiva 2022/2555 y Reglamento de Ejecución 2024/2690) e **ISO/IEC 42001:2023**, relacionados mediante un catálogo común de controles (`src/data/catalog.json`).
- ENS ↔ ISO/IEC 27001 sigue la CCN-STIC 825; el resto de correspondencias son criterio propio y la interfaz lo indica.
- No hay forma de cargar un marco propio.

---

## 2.4.0 · Part-IS y marcos propios ← siguiente versión

### 1. Part-IS (EASA / AESA)

**Fuentes, citables por ser legislación de la UE (EUR-Lex):**

| Reglamento | Ámbito | Aplicable desde |
|---|---|---|
| Reglamento Delegado (UE) 2022/1645 | Organizaciones de diseño y producción (requisitos `IS.D.OR`) | 16-10-2025 |
| Reglamento de Ejecución (UE) 2023/203 | Operadores, mantenimiento, formación, ATM/ANS, aeródromos… (requisitos `IS.I.OR`) | 22-02-2026 |

Antes de implementar, comprueba las fechas y la numeración contra el texto consolidado de EUR-Lex.

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

### Aceptación de la 2.4.0

- [ ] Part-IS completo (los 13 requisitos de organización de cada reglamento) en el catálogo, con fuente y fecha de consulta en EUR-Lex.
- [ ] Pregunta de aplicabilidad de Part-IS en el asistente de Alcance.
- [ ] Marcos propios: importar (JSON y CSV), mapear, calcular, exportar y borrar, con validación hostil probada.
- [ ] Ficheros de ejemplo ficticios en `src/data/` o `tests/`: un marco propio y un CSV.
- [ ] Pruebas del motor nuevas para Part-IS y para el cálculo con marcos propios; e2e de importar y mapear; axe con 0 infracciones en las vistas nuevas.
- [ ] Interfaz completa en español y en inglés.
- [ ] README, CHANGELOG, capturas y cifras de pruebas al día.
- [ ] Publicación en LinkedIn **al menos 3 o 4 días después** de la anterior, citando las dos peticiones y con invitación a revisar.

---

## Después de la 2.4.0 (una norma por versión)

| Versión | Marco | Fuente citable | Notas |
|---|---|---|---|
| 2.5.0 | **RIA / AI Act** | Reglamento (UE) 2024/1689 | Se cruza con ISO/IEC 42001, que ya está en Rosetta. Obligaciones por rol (proveedor, responsable del despliegue) y por nivel de riesgo. |
| 2.6.0 | **CRA** | Reglamento (UE) 2024/2847 | Requisitos esenciales del anexo I para productos con elementos digitales. Interesa a fabricantes de software y hardware. |
| 2.7.0 | **NIST CSF 2.0** | Publicación del NIST (dominio público en EE. UU.) | Seis funciones, incluida *Govern*. Útil para clientes internacionales y para LATAM. |
| 2.8.0 | **DORA** | Reglamento (UE) 2022/2554 y sus normas técnicas | Banca y servicios financieros. Se relaciona con NIS2, que ya se menciona en el asistente de Alcance. |
| Más adelante | Leyes LATAM de ciberseguridad y protección de datos | Chile (Ley 21.663), Colombia, México, Perú, Argentina | Texto oficial público. |

**Mediante marcos propios, sin texto en el repositorio:** IEC 62443 e ISO/IEC 20000. Como mucho se publicaría una plantilla con su numeración; el texto lo pone quien tiene la licencia.

## Reglas que no cambian

- **Nunca texto de normas ISO o IEC**, solo numeración y títulos abreviados propios.
- Cada correspondencia indica su origen: guía oficial o criterio propio.
- Local-first: los marcos propios y su texto no salen del navegador.
- Autor: Yoandy Ramírez Delgado. Las revisiones externas se reconocen por su nombre en el CHANGELOG.
