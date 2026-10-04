# Auditoría para producción

Rosetta pasa de herramienta formativa a herramienta de trabajo con datos reales de organizaciones. Antes de ese paso se auditaron cuatro áreas el 1 de octubre de 2026. Este documento resume qué se encontró, qué está corregido y comprobado por pruebas, y qué queda pendiente.

| Área | Informe completo | Resultado |
|---|---|---|
| Seguridad de la aplicación | [01-seguridad.md](auditoria/01-seguridad.md) | 5 vulnerabilidades confirmadas con prueba de concepto. Corregidas las 5 (V-03, parcialmente). |
| Exactitud del catálogo normativo | [02-catalogo-normativo.md](auditoria/02-catalogo-normativo.md) | 15 correcciones de catálogo y 8 del motor. Aplicadas 15 y 6. |
| Experiencia de uso, accesibilidad y rendimiento | [03-ux-accesibilidad-rendimiento.md](auditoria/03-ux-accesibilidad-rendimiento.md) | 1 597 elementos con violaciones WCAG. Ahora 0, con prueba de regresión. |
| Arquitectura y hoja de ruta | [04-arquitectura-y-hoja-de-ruta.md](auditoria/04-arquitectura-y-hoja-de-ruta.md) | Fases 0 a 3. La fase 0 está casi completa. |
| Alineación con la CCN-STIC 825 | [05-ccn-stic-825.md](auditoria/05-ccn-stic-825.md) | Equivalencias ENS ↔ ISO/IEC 27001 alineadas con la guía del CCN (abril 2026): 71 de 71 controles principales conectados, 17 equivalencias rebajadas a parciales, 5 enlaces añadidos y 91 parejas marcadas como criterio propio. |

Los informes se conservan tal como se redactaron, sobre el código de ese día.

---

## 1. Seguridad

| ID | Hallazgo | Severidad | Estado | Prueba |
|---|---|---|---|---|
| V-01 | Librería de Excel cargada desde CDN sin integridad (SRI): una copia alterada leería todos los proyectos | Alta (6,8) | ✅ Autoalojada en `dist/vendor/` con SRI y respaldo en jsDelivr con el mismo hash | `e2e-excel`: librería manipulada rechazada |
| V-02 | SheetJS 0.18.5 con CVE-2023-30533 (contaminación de prototipos) y CVE-2024-22363 (ReDoS) al leer ficheros de terceros | Media (5,3) | ✅ Lectura con SheetJS 0.20.3; xlsx-js-style solo escribe el Excel propio | `build`: hashes SRI; `e2e-excel`: importación |
| V-03 | Datos sin cifrar en `localStorage`; origen compartido en `file://` y en `*.github.io` | Media (5,5) | 🟡 Avisos en Ajustes y en el README. Cifrado en reposo: fase 1 | — |
| V-04 | Inyección de enlaces e imágenes Markdown en el informe | Baja (4,3) | ✅ `mdSafe` neutraliza `[`, `]`, `!`, énfasis y HTML | — |
| V-05 | Google Fonts en cada arranque: la IP del usuario llega a Google (RGPD) | Baja (3,7) | ✅ Fuentes incrustadas (OFL), ninguna petición a terceros | `e2e-excel`: cero peticiones externas |
| — | Variantes de inyección de fórmulas (espacios, caracteres invisibles, `＝` de ancho completo) | Endurecimiento | ✅ `noFormula` ampliado | `e2e`: exportación CSV |
| — | Sin política de seguridad de contenido (CSP) | Endurecimiento | ✅ CSP en `<meta>` con hashes: `default-src 'none'`, `connect-src 'none'` | `e2e-excel`: sin violaciones y bloqueo de código inyectado |
| — | Acciones de GitHub por etiqueta | Endurecimiento | ✅ Fijadas por SHA; CodeQL añadido | — |
| — | `Math.random` para identificadores | Endurecimiento | ✅ `crypto.getRandomValues` | — |
| — | Fallo de escritura en `localStorage` ignorado en silencio | Endurecimiento | ✅ Alerta visible una vez | `e2e`: almacenamiento lleno |
| — | `window.__ROSETTA__` expuesto | Endurecimiento | ⏳ Lo usan las pruebas; con la CSP actual ningún script ajeno puede leerlo | — |
| — | Trusted Types | Endurecimiento | ⏳ Necesita una política para los `innerHTML` de las vistas | — |

Descartados tras probarlos: XSS por cualquiera de las cuatro vías de entrada, contaminación de prototipos en la aplicación, fórmulas en el Excel exportado, bombas ZIP.

## 2. Catálogo y motor de cálculo

**Correcciones de catálogo (15, aplicadas):**

- Cláusula 6.1.1 en ISO/IEC 27001 e ISO/IEC 42001; art. 23.4 c y e en NIS2.
- ENS: arts. 28 (declaración de aplicabilidad), 31 (auditoría), 32 (INES) y 33 (notificación al CCN-CERT). Sin ellos, un proyecto solo ENS no mostraba la auditoría como brecha.
- op.pl.5 (componentes certificados, catálogo CPSTIC) ya no se da por cubierta con ISO A.8.27: nuevo control DES-08.
- mp.info.5 (limpieza de documentos): nuevo control ACT-10.
- INC-07 (plazos de notificación de NIS2) pasa a relación informativa con ISO/IEC 27001, que no fija plazos.
- C8.1 de ISO/IEC 27001 repartida entre tres controles; referencias de op.pl.5 y op.exp.3 corregidas.

**Correcciones del motor:**

| ID | Problema | Estado |
|---|---|---|
| E01 | Un requisito con solo enlaces parciales aparecía «cubierto» | ✅ Techo del 50 % |
| E02 | Se podían excluir cláusulas 4–10 y arts. 20, 21 y 23 de NIS2 | ✅ No excluibles en motor, validación e interfaz |
| E03 | Faltaban entidades CER, prestadores de confianza no cualificados, DORA y exclusiones del art. 2.7–2.8 | ✅ Añadidos; el RE 2024/2690 solo se indica para entidades en el ámbito |
| E04 | La categoría del ENS podía quedar por debajo de los niveles | ✅ Categoría efectiva = máxima |
| E05 | Refuerzos del ENS (R1…Rn) sin modelar | ⏳ Requiere sub-requisitos por refuerzo |
| E06 | Solapamiento ISO/IEC 27001 → ENS inflado (96 %) | ✅ Solo enlaces totales (85 %) |
| E07 | CO-06 ignoraba medidas parciales; CO-09 no avisaba sin fecha | ✅ |
| E08 | El texto de fuentes decía que los títulos ISO eran paráfrasis | ✅ Corregido |

**Pendiente de verificar contra el BOE** (el entorno de la auditoría no tenía acceso): exigencia por nivel de op.pl.5, op.acc.5, mp.si.1 y mp.s.2.

**Siguientes marcos, por prioridad:** RGPD y LOPDGDD, Reglamento de IA (UE) 2024/1689, DORA y perfiles de cumplimiento del CCN (P1); CRA, ISO 22301 e ISO/IEC 27701 (P2); NIST CSF 2.0 y CIS v8.1, este último con permiso de CIS por su licencia (P3).

## 3. Experiencia de uso y accesibilidad

| Hallazgo | Estado |
|---|---|
| 1 597 elementos con violaciones WCAG 2.2 AA (contraste del acento como texto, atenuación por opacidad, controles anidados, tablas ARIA incompletas) | ✅ 0 en 12 vistas × claro/oscuro × escritorio/móvil; `a11y.test.mjs` impide volver atrás |
| El foco del teclado volvía a `<body>` en 8 de 12 recorridos | ✅ Se restaura tras cada redibujado; el inspector lo devuelve a quien lo abrió |
| Sin deshacer en ninguna acción | ✅ Deshacer y rehacer (30 pasos), botón en el aviso, `Ctrl + Z` y `Ctrl + Mayús + Z` |
| Errores mostrados en el mismo aviso verde que los éxitos | ✅ Aviso rojo con `role="alert"` |
| «Sin incoherencias» en verde con 185 brechas abiertas | ✅ Mensaje neutro con el número de requisitos sin cubrir |
| Aviso de caso de ejemplo de 200 px en móvil | ✅ Una línea |
| 6 iconos con nombres obsoletos de Lucide | ✅ Nombres de Lucide 1.49; prueba de que todo icono usado existe |
| Textos que no decían nada («Implanta una vez», «Siguiente mejor jugada», nombres de vista metafóricos) | ✅ Textos funcionales en ES y EN; vistas renombradas por su función |
| Barra lateral con saltos al plegar | ✅ Rediseñada: despliegue al pasar el ratón sin mover los iconos |
| Los 115 segmentos de la rueda no se alcanzan con el teclado | ⏳ M3 |
| Cada interacción reconstruye la vista entera (≈ 55 ms; 270 ms con CPU lenta) | ⏳ M2: actualizaciones parciales |
| Sin acciones masivas en Controles | ⏳ M8 |
| ≈ 60 textos de las exportaciones fuera del diccionario de idiomas | ⏳ M11 |

## 4. Hoja de ruta

Recomendación del informe de arquitectura: primero una aplicación local cifrada (PWA) diseñada como cliente del futuro servidor; después, el servidor multiusuario, cuando haya 3–5 clientes usando la primera. El fichero único se mantiene como edición portátil.

### Fase 0 · Endurecer el build actual

| # | Entregable | Estado |
|---|---|---|
| 0.1 | SheetJS ≥ 0.20.3 autoalojado con SRI | ✅ |
| 0.2 | Fuentes autoalojadas | ✅ |
| 0.3 | CSP con hashes generada en el build | ✅ (`style-src-attr 'unsafe-inline'` por los estilos en línea de las plantillas) |
| 0.4 | `window.__ROSETTA__` solo en pruebas | ⏳ |
| 0.5 | Trusted Types | ⏳ |
| 0.6 | Identificadores con aleatoriedad criptográfica | ✅ |
| 0.7 | Aviso de fallo de guardado | ✅ |
| 0.8 | Aviso de datos sin cifrar al crear un proyecto propio | 🟡 Aviso en Ajustes para `file://` |
| 0.9 | La SoA del ENS conserva justificación, evidencias y responsable | ✅ |
| 0.10 | CI, CodeQL, auditoría de dependencias | ✅ (releases firmadas: pendiente) |
| 0.11 | SECURITY.md, licencia, nota de derechos de autor | ✅ |

### Fase 1 · Aplicación local cifrada (25–35 persona-día)

Monorepo con el motor y el catálogo como paquetes versionados; esquema v2 con migración; almacenamiento en IndexedDB cifrado con AES-256-GCM y clave derivada de contraseña o passkey; Service Worker; evidencias con SHA-256 y caducidad; formato `.rosetta` cifrado; exclusiones con aprobación; generación de SoA del ENS, ISO/IEC 27001 e ISO/IEC 42001 en DOCX y PDF.

### Fase 2 · Servidor multiusuario (60–80 persona-día)

API con Fastify y Zod; PostgreSQL con seguridad por fila para cada cliente; Keycloak con MFA y roles de consultor, auditor, cliente y lector; evidencias en almacenamiento de objetos en la UE con bloqueo de borrado; registro de auditoría encadenado; integración con Jira y GitHub Issues; copias con restauración probada.

### Fase 3 · Producto profesional

Registro de riesgos (MAGERIT e ISO/IEC 27005), importación de PILAR, evidencias desde Microsoft 365, Defender, Wazuh, OpenSCAP y nubes públicas, gestión de plazos de incidentes NIS2, asistente de IA local gobernado según ISO/IEC 42001, firma eIDAS y certificación ENS del propio servicio.

El detalle de cada fase, con criterios de aceptación y esfuerzo, está en el [informe de arquitectura](auditoria/04-arquitectura-y-hoja-de-ruta.md#7-hoja-de-ruta-priorizada).
