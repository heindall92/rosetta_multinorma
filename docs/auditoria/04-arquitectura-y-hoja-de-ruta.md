# Rosetta multinorma → producción con datos reales de cliente

> **Informe original de la auditoría (1 de octubre de 2026).** Se conserva tal como se redactó, sobre el código de ese momento. Qué se ha corregido desde entonces y qué queda pendiente está en [AUDITORIA_PRODUCCION.md](../AUDITORIA_PRODUCCION.md). Las rutas a pruebas de concepto y scripts de medición se refieren al material de trabajo de la auditoría, que no se versiona.

**Arquitectura objetivo y hoja de ruta** · v1.0 · 2026-10-01
Ámbito: ENS (RD 311/2022) · ISO/IEC 27001:2022 · NIS2 (Directiva 2022/2555 + RE 2024/2690) · ISO/IEC 42001:2023
Punto de partida analizado: commit `4e8c702`, `package.json` v2.2.0, `dist/index.html` (≈610 KB, fichero único).

---

## 0. Resumen ejecutivo (opinión firme)

1. **Hoy Rosetta es un buen prototipo pero no debe recibir datos reales de cliente.** El estado de una SoA, sus exclusiones y el plan de acción describen *dónde es débil* un cliente: son datos de seguridad sensibles (y, en NIS2/ENS, potencialmente información clasificada como de uso interno o restringido). Ahora mismo viven en `localStorage` en claro, la página carga código de terceros sin SRI (jsDelivr) y fuentes de Google, no hay CSP y la depuración expone el estado global (`window.__ROSETTA__`).
2. **Recomendación: estrategia en dos pasos, no elegir una sola.**
   - **Paso A (semanas): PWA local-first endurecida** — es el producto que puedes usar *ya* en encargos reales con tu portátil como frontera de confianza: cero servidor, cero tratamiento de datos por tu parte como encargado, cifrado en reposo con WebCrypto, sin dependencias en tiempo de ejecución desde Internet. Encaja con el perfil de consultor-pentester que trabaja con clientes del sector público (ENS) que no quieren sus brechas en un SaaS ajeno.
   - **Paso B (trimestres): servidor multi-tenant** — necesario en cuanto quieras (i) que el cliente colabore (responsables subiendo evidencias), (ii) auditor con acceso de solo lectura, (iii) flujos de aprobación con firma, (iv) integraciones (Jira, Entra, Wazuh, Defender…), (v) vender como servicio. Esto no puede hacerse de forma seria en local.
   - **Clave arquitectónica que une ambos pasos:** extraer el motor (`src/engine/rosetta-engine.js`, ya sin DOM y probado en Node) y el catálogo a un **paquete compartido versionado** (`@rosetta/engine`, `@rosetta/catalog`) y definir **un formato de proyecto canónico con esquema (JSON Schema/Zod) y migraciones**. La PWA y el servidor consumen el mismo paquete; el fichero único sigue construyéndose desde ese paquete durante toda la transición.
3. **No reescribir antes de tiempo.** Fase 0 (días) endurece el build actual; Fase 1 (≈4–6 semanas) lo convierte en PWA local-first cifrada; Fase 2 (≈3–4 meses, 1–2 personas) MVP de servidor; Fase 3 enterprise. El fichero único (`dist/index.html`) se mantiene como "edición offline/portable" hasta que el servidor esté en producción y, probablemente, para siempre como modo *air-gapped*.

---

## 1. Diagnóstico del código actual

### 1.1 Lo que está bien y hay que conservar

| Aspecto | Dónde | Valor |
|---|---|---|
| Motor puro, determinista, sin DOM, UMD (`module.exports` / `window.RosettaEngine`) | `src/engine/rosetta-engine.js` | Reutilizable tal cual en servidor, workers, CLI y tests. Es el activo principal. |
| Catálogo como dato (`catalog.json` v5: 13 dominios, 113 controles, 73 ENS / 117 ISO 27001 / 57 NIS2 / 64 ISO 42001 requisitos, con pesos `w` 1 / 0,5 / 0) | `src/data/catalog.json` | Base para versionado de catálogo y migraciones. |
| Saneado por esquema con listas blancas, límites y bloqueo de `__proto__` | `src/app/01b-security.js` (`sanitizeState`, `sanitizeWs`, `safeParse`) | Patrón correcto; se traduce 1:1 a Zod/JSON Schema en el servidor. |
| `setPath` con lista blanca de rutas escribibles | `src/app/07-events.js` | Equivale a una política de *mass-assignment* — mantener en la API. |
| Neutralización de CSV injection y HTML en Markdown | `noFormula`, `mdSafe` | Mantener en todos los exportadores nuevos (XLSX, DOCX). |
| `Object.freeze(Object.prototype)` | `07-events.js:253` | Defensa en profundidad útil. |
| Build reproducible con `--check` y hash | `scripts/build.mjs` | Base para firmar releases y calcular hashes CSP. |
| Tests unitarios (motor, catálogo, build) + e2e Playwright, incluido proyecto hostil y CSV injection | `tests/` | Buen punto de partida para la estrategia de pruebas. |

### 1.2 Bloqueantes para datos reales (por gravedad)

| # | Hallazgo | Evidencia | Riesgo | Fase |
|---|---|---|---|---|
| H1 | **Datos de cliente en claro en `localStorage`** (proyectos completos bajo `rosetta/v1/p/<id>`) | `01-core.js` `store`, `PKEY` | Cualquier XSS, extensión del navegador, perfil compartido o forense del portátil expone todas las brechas de todos los clientes. Sin límite de cuota real (~5 MB) → pérdida silenciosa (el `catch` ignora el error de escritura). | 0 (aviso) / 1 (cifrado) |
| H2 | **Código de terceros cargado en caliente sin SRI**: `xlsx-js-style@1.2.0` desde jsDelivr | `XLSX_URL` en `01-core.js`, `loadXLSX()` en `06-io.js` | Compromiso de CDN o del paquete = ejecución arbitraria con acceso a todo el estado. Además `xlsx-js-style` es un *fork* de SheetJS CE antiguo: verificar exposición a CVE-2023-30533 (prototype pollution al leer ficheros) y CVE-2024-22363 (ReDoS); el `Object.freeze(Object.prototype)` mitiga lo primero, no lo segundo. Se parsean **XLSX del cliente** (no fiables). | 0 |
| H3 | **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | `src/index.html` l. 9-11 | Fuga de IP del usuario a un tercero en EE. UU. (precedente LG München 3 O 17493/20) y dependencia de red. | 0 |
| H4 | **Sin Content-Security-Policy** y todo el JS inline | `src/index.html`, build en un único HTML | Sin CSP, un XSS no tiene contención. Para CSP con scripts inline hay que usar hashes `sha256-…` calculados en build. Hay ~40 atributos `style="…"` en `03/04/05/05b` → requiere `style-src-attr 'unsafe-inline'` o refactor a clases. | 0 |
| H5 | **Estado global expuesto** `window.__ROSETTA__` (state, ws, calc…) | `07-events.js:259` | Facilita la exfiltración a cualquier script inyectado; útil solo para e2e. | 0 (solo en build de test) |
| H6 | Renderizado por `innerHTML` + plantillas (28 sumideros) con `esc()` manual | `03-shell.js`, `05-views.js`, `05b-inspector.js` | Hoy correcto por disciplina, pero frágil: un `${x}` sin `esc()` = XSS almacenado vía proyecto importado. Añadir Trusted Types en CSP + lint. | 0/1 |
| H7 | IDs con `Math.random()` | `uid()` en `01-core.js` | No criptográfico; colisiones y predictibilidad irrelevantes en local, inaceptables en servidor. → `crypto.randomUUID()` / UUIDv7. | 0 |
| H8 | **Modelo de datos insuficiente para auditoría** | `blankState`, `sanitizeState` | `evidencias` es texto libre (2000 car.), sin ficheros ni hash ni caducidad; `exclusiones[f][req]` es solo una cadena (sin autor, fecha, aprobador, vigencia); `acciones` indexado por control → **una sola acción por control**; `historial` guarda 24 instantáneas agregadas (KPI), **no un registro de cambios**; no hay autoría de ningún cambio. | 1/2 |
| H9 | **Pérdida de datos en la importación ENS**: `limpiaSoa` lee `justificacion`, `evidencias`, `responsable`, pero `aplicaImportEns` solo guarda `{aplica, estado, pct}` en `st.ensSoa`; la evidencia solo sobrevive concatenada y truncada a 1500 car. en los controles unificados. | `06-io.js` `aplicaImportEns` | La SoA ENS reexportada no es fiel a la de origen; un auditor lo detecta. | 1 |
| H10 | Sin versión de catálogo en el proyecto (`version: 1` es del esquema de estado; el catálogo es v5 pero el proyecto no lo referencia) | `sanitizeState` | Al cambiar un mapeo, el % de cumplimiento histórico cambia sin trazabilidad → **no reproducible** ante auditoría. | 1 |
| H11 | Integración `window.claude.use('downloads')` | `saveFile()` | Correcto como *feature detection* para el modo artefacto; en la PWA/servidor debe quedar aislado tras un adaptador. | 1 |
| H12 | Textos de normas ISO en el catálogo (títulos de controles 27001/42001) | `catalog.json` | Riesgo de **derechos de autor de ISO** si se comercializa: usar títulos parafraseados propios + referencia al número; nunca texto literal de la norma. ENS y NIS2 son normas públicas (sin problema). | 2 (revisión legal) |
| H13 | `.github/workflows/` vacío | repo | Sin CI: ni tests, ni `build --check`, ni SAST. | 0 |

---

## 2. Opciones de arquitectura objetivo

### 2.1 Opción A — PWA local-first endurecida

```
┌────────────────────────── Navegador (frontera de confianza = equipo del consultor) ─────────────────────────┐
│  UI (vanilla hoy → Svelte en F2)        Service Worker (precache, offline, sin red en runtime)               │
│        │                                                                                                    │
│  @rosetta/engine  ◄──── catálogo versionado (@rosetta/catalog, firmado)                                     │
│        │                                                                                                    │
│  Repositorio (adapter) ──► IndexedDB: registros cifrados AES-256-GCM                                        │
│        │                     clave de datos (DEK) envuelta con KEK derivada de passphrase (PBKDF2-SHA256     │
│        │                     ≥600k it. o Argon2id-WASM) y/o passkey WebAuthn-PRF                             │
│        └─► Export/Import: .rosetta (JSON cifrado + manifiesto firmado), XLSX/DOCX/PDF generados en local     │
│  Evidencias: ficheros en OPFS cifrados por fragmentos, SHA-256 calculado antes de cifrar                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
CSP: default-src 'none'; script-src 'self' 'sha256-…'; connect-src 'none' (o 'self'); require-trusted-types-for 'script'
```

**Pros:** sin tratamiento de datos de cliente por un tercero (tú no eres encargado del tratamiento para el software; el cliente/consultor lo es en su equipo); despliegue trivial (GitHub Pages / fichero); funciona en entornos aislados (sector público, OT); superficie de ataque mínima; coste cero de operación.
**Contras:** sin colaboración en tiempo real; sin flujos de aprobación con identidad verificable (no hay *non-repudiation* fuerte); backups dependen del usuario; la pérdida de la passphrase = pérdida de datos (por diseño); integraciones solo vía ficheros.

### 2.2 Opción B — Servidor multi-tenant

```
                      ┌──────────── Keycloak (OIDC, MFA TOTP/WebAuthn, federación Entra ID/Google) ───────────┐
                      │                                                                                      │
Navegador ──TLS1.3──► Reverse proxy (Caddy/Traefik, HSTS, WAF ligero/CrowdSec)                              │
   SvelteKit SPA        │                                                                                      │
   (lucide-svelte)      ├──► API (Fastify + TypeScript, Zod, OpenAPI 3.1) ── @rosetta/engine (mismo paquete)  │
                        │        │  ├─ RBAC + ABAC por proyecto        ├─ Outbox → Worker (BullMQ/pg-boss)      │
                        │        │  ├─ Audit log append-only (hash-chain)  ├─ Conectores (Jira, Entra, Wazuh…) │
                        │        │  └─ Generador informes (docx/pdf)       ├─ Notificaciones (email, Teams, webhook)
                        │        ▼                                         └─ Escáner AV (ClamAV) de evidencias │
                        │   PostgreSQL 16 (RLS por tenant, pgcrypto, PITR)                                     │
                        │   Object storage S3-compatible (MinIO / Scaleway / OVH / IONOS), SSE-KMS, Object Lock │
                        │   Redis/Valkey (sesiones, colas, rate-limit)                                         │
                        └──► LLM local (Ollama/vLLM, red aislada) — opcional, por tenant, apagado por defecto  │
                                                                                                             │
Observabilidad: OpenTelemetry → Grafana (Loki/Tempo/Prometheus), Sentry self-hosted (sin PII)               │
Hosting UE: Hetzner/OVHcloud/Scaleway/IONOS (región ES/FR/DE); opción on-prem del cliente (Helm/Compose)    │
```

### 2.3 Recomendación

**Hacer A primero, diseñada como "cliente offline" de B.** Razones:

1. **Tiempo hasta valor real:** A permite usar datos reales en ~1–2 meses con riesgo aceptable; B tarda trimestres en ser seguro (un SaaS GRC mal hecho es peor que una hoja de cálculo).
2. **Mercado inicial:** consultoría ENS/sector público y PYMEs NIS2 valoran "tus datos no salen de tu equipo". Es un argumento de venta, no una limitación.
3. **Reutilización:** el trabajo de A (paquete motor/catálogo, esquema canónico con migraciones, cifrado de exportación `.rosetta`, generadores XLSX/DOCX, evidencias con SHA-256) se reutiliza íntegramente en B. El formato `.rosetta` cifrado se convierte en el mecanismo de **import/export y de sincronización offline** con el servidor.
4. **B es imprescindible para escalar** (multi-usuario, aprobación, auditor externo, integraciones, ingresos recurrentes). Empezar B cuando haya 3–5 clientes usando A y requisitos validados.

**Stack recomendado para B (opinión):**

| Capa | Elección | Por qué / alternativa descartada |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo**, TypeScript estricto | Un lenguaje de extremo a extremo permite compartir el motor sin reescribirlo. Python/FastAPI obligaría a portar el motor o ejecutarlo en Node aparte → descartado salvo para el servicio de IA. |
| Frontend | **SvelteKit (modo SPA/adapter-static) + lucide-svelte** | Menos runtime, más cercano al estilo actual (plantillas + estado simple), excelente para PWA. React+Vite+lucide-react es alternativa válida si se prevé contratar equipo React. |
| Backend | **Fastify + Zod + `fastify-type-provider-zod` + OpenAPI** | Ligero, rápido, esquemas compartidos con el front. NestJS solo si el equipo crece >4 devs y quiere DI/módulos opinados. |
| ORM / SQL | **Drizzle** (o Kysely) + migraciones SQL versionadas | SQL explícito, compatible con RLS (`SET LOCAL app.tenant_id`). Prisma complica RLS por *pooling*. |
| BD | **PostgreSQL 16** con **RLS** por `tenant_id`, `pgaudit`, PITR | Aislamiento a nivel de BD, no solo de aplicación. |
| Ficheros | **S3-compatible UE** con *Object Lock* (modo *governance*) para evidencias congeladas | Integridad y retención demostrables. |
| Identidad | **Keycloak** (realm por instalación, organización/grupo por tenant) | OIDC + MFA + federación con Entra ID del cliente; alternativa gestionada: Zitadel (UE). |
| Colas | **pg-boss** (en Postgres) al inicio; BullMQ/Valkey si crece | Menos piezas en MVP. |
| Informes | **docx** (npm `docx`) para Word; PDF vía **Gotenberg** (LibreOffice/Chromium en contenedor aislado) o Typst | DOCX editable es lo que el consultor entrega; PDF/A firmado para la versión final. |
| Despliegue | Contenedores distroless + Docker Compose (MVP) → Kubernetes/Helm (F3) | Instalación on-prem para clientes ENS ALTA. |

---

## 3. Ruta de migración (el fichero único sigue funcionando)

```
Fase 0 ──► Fase 1 ─────────────────────────► Fase 2 ─────────────────────────► Fase 3
repo actual   packages/engine, catalog,        apps/api + apps/web (SvelteKit)     enterprise
endurecido    schema extraídos; dist/index.html  dist/index.html sigue generándose  dist/ = "Rosetta Portable"
              = misma app + PWA + cifrado        desde los mismos paquetes          (air-gapped, importa/exporta .rosetta)
```

Estructura objetivo del monorepo:

```
rosetta/
├─ packages/
│  ├─ engine/        ← src/engine/rosetta-engine.js (UMD → ESM + d.ts; UMD sigue publicándose para el single-file)
│  ├─ catalog/       ← src/data/catalog.json, parejas.json + versiones + migraciones de mapeo + firma
│  ├─ schema/        ← esquema canónico del proyecto (Zod) = sanitizeState() formalizado + migraciones v1→vN
│  ├─ exporters/     ← XLSX, CSV, MD, DOCX, SoA ENS, SoA ISO (puros, ejecutables en navegador y Node)
│  └─ crypto/        ← formato .rosetta (envelope AES-GCM, KDF, manifiesto, firma Ed25519)
├─ apps/
│  ├─ portable/      ← la app vanilla actual (src/app/*.js) + scripts/build.mjs → dist/index.html
│  ├─ web/           ← SvelteKit (F2)
│  ├─ api/           ← Fastify (F2)
│  └─ worker/        ← conectores, informes, notificaciones (F2)
└─ infra/            ← compose, helm, keycloak realm, políticas OPA/rego (opcional)
```

Reglas de la transición:

1. **El motor no cambia de comportamiento sin test de regresión de "golden files"**: congelar hoy la salida de `E.calcular/coherencia/planAccion` para los 5 casos (`techserv, hospital, lumen, aguas, citafacil`) y exigir igualdad bit a bit en CI.
2. **Esquema canónico único**: `packages/schema` sustituye a `sanitizeState` (la app portable lo importa en el build). Cada cambio incrementa `schemaVersion` y añade una migración pura `migrate_vN_to_vN+1(state)`.
3. **Proyecto referencia catálogo**: `state.catalogo = { version: 5, sha256: "…" }`. Calcular siempre con la versión con la que se registró y ofrecer "migrar a catálogo v6" como acción explícita (con diff de impacto en %).
4. **`.rosetta` es el puente**: la PWA exporta `.rosetta` cifrado; el servidor lo importa (y viceversa) → un consultor puede trabajar offline en casa del cliente y sincronizar al volver.
5. El build portable debe seguir pasando `npm run check` y los e2e actuales en cada PR hasta la Fase 3.

---
## 4. Modelo de datos

### 4.1 Correspondencia con el estado actual

| Estado actual (`state.*`) | Entidad(es) objetivo | Cambio principal |
|---|---|---|
| `proyecto {nombre, organizacion, sector, descripcion}` | `organization`, `project` | La organización cliente pasa a ser entidad propia (varias evaluaciones por cliente). |
| `alcance {ens{on,categoria,niveles}, iso27001, nis2{tipo}, iso42001}` + `nis2q` | `project_scope` (1 fila por norma) + `information_system` + `nis2_assessment` | Categorización ENS por sistema/servicio con dimensiones D/I/C/A/T justificadas; resultado NIS2 con fecha y base legal. |
| `controles[UC] {estado, responsable, evidencias, revision, notas, origen}` | `control_state` + `evidence` + `evidence_link` | `evidencias` deja de ser texto: N ficheros/enlaces con hash y caducidad; `responsable` → `user`/`contact`. |
| `exclusiones[f][req] = "justificación"` | `exclusion` + `approval` | Autor, fecha, vigencia, estado (borrador → propuesta → aprobada/rechazada), firmante. |
| `acciones[UC] {estado, responsable, fecha, nota}` | `action` (N por control, opcionalmente por requisito o riesgo) + `external_ref` | Varias acciones por control; vínculo Jira/GitHub. |
| `ensSoa[req] {aplica, estado, pct}` | `framework_requirement_state` | Guarda **todos** los campos de la SoA ENS (incluye justificación, evidencias, responsable) → corrige H9. |
| `historial[] {fecha, cov, grado, brechas}` | `snapshot` (estado completo congelado + KPI + hash) y `audit_event` | Instantánea = estado reproducible firmado; auditoría = cada cambio. |
| catálogo embebido | `catalog_version`, `framework`, `requirement`, `unified_control`, `control_mapping` | Versionado e inmutable una vez publicado. |

### 4.2 Diagrama ER

```mermaid
erDiagram
    TENANT ||--o{ MEMBERSHIP : "tiene"
    USER ||--o{ MEMBERSHIP : "pertenece"
    TENANT ||--o{ ORGANIZATION : "gestiona (clientes)"
    ORGANIZATION ||--o{ PROJECT : "evaluaciones"
    ORGANIZATION ||--o{ INFORMATION_SYSTEM : "sistemas/servicios"
    PROJECT }o--|| CATALOG_VERSION : "calcula con"
    PROJECT ||--o{ PROJECT_SCOPE : "normas en alcance"
    PROJECT ||--o{ PROJECT_MEMBER : "acceso"
    USER ||--o{ PROJECT_MEMBER : "rol en proyecto"
    PROJECT_SCOPE }o--o| INFORMATION_SYSTEM : "categoriza (ENS)"
    PROJECT ||--o| NIS2_ASSESSMENT : "aplicabilidad"
    CATALOG_VERSION ||--o{ FRAMEWORK : "incluye"
    FRAMEWORK ||--o{ REQUIREMENT : "define"
    CATALOG_VERSION ||--o{ UNIFIED_CONTROL : "define"
    UNIFIED_CONTROL ||--o{ CONTROL_MAPPING : "mapea"
    REQUIREMENT ||--o{ CONTROL_MAPPING : "cubierto por (w=1|0.5|0)"
    PROJECT ||--o{ CONTROL_STATE : "estado"
    UNIFIED_CONTROL ||--o{ CONTROL_STATE : "evaluado en"
    PROJECT ||--o{ REQUIREMENT_STATE : "SoA por norma"
    REQUIREMENT ||--o{ REQUIREMENT_STATE : "evaluado en"
    PROJECT ||--o{ EVIDENCE : "custodia"
    EVIDENCE ||--o{ EVIDENCE_VERSION : "versiones (sha256)"
    EVIDENCE ||--o{ EVIDENCE_LINK : "soporta"
    CONTROL_STATE ||--o{ EVIDENCE_LINK : ""
    REQUIREMENT_STATE ||--o{ EVIDENCE_LINK : ""
    PROJECT ||--o{ EXCLUSION : "declara"
    REQUIREMENT ||--o{ EXCLUSION : "excluido"
    EXCLUSION ||--o{ APPROVAL : "requiere"
    USER ||--o{ APPROVAL : "firma"
    PROJECT ||--o{ ACTION : "plan"
    UNIFIED_CONTROL ||--o{ ACTION : "remedia"
    RISK ||--o{ ACTION : "trata"
    ACTION ||--o{ EXTERNAL_REF : "Jira/GitHub"
    PROJECT ||--o{ RISK : "registro de riesgos"
    RISK }o--o{ UNIFIED_CONTROL : "salvaguardas"
    ASSET ||--o{ RISK : "afectado"
    INFORMATION_SYSTEM ||--o{ ASSET : "contiene"
    PROJECT ||--o{ SNAPSHOT : "instantáneas"
    PROJECT ||--o{ COMMENT : "hilos"
    PROJECT ||--o{ INCIDENT : "NIS2 art. 23"
    INCIDENT ||--o{ INCIDENT_DEADLINE : "24h/72h/1m"
    TENANT ||--o{ INTEGRATION : "conectores"
    INTEGRATION ||--o{ INTEGRATION_RUN : "ejecuciones"
    TENANT ||--o{ AUDIT_EVENT : "registro inmutable"
    TENANT ||--o{ WEBHOOK_SUBSCRIPTION : ""

    TENANT {
        uuid id PK
        text name
        text plan
        text data_region
        timestamptz created_at
    }
    USER {
        uuid id PK
        text oidc_sub UK
        text email
        text display_name
        bool mfa_enrolled
    }
    MEMBERSHIP {
        uuid tenant_id FK
        uuid user_id FK
        text tenant_role "owner|admin|member"
    }
    ORGANIZATION {
        uuid id PK
        uuid tenant_id FK
        text legal_name
        text nif
        text sector
        text nis2_sector
    }
    INFORMATION_SYSTEM {
        uuid id PK
        uuid org_id FK
        text name
        jsonb ens_levels "D,I,C,A,T + justificación"
        text ens_category
    }
    PROJECT {
        uuid id PK
        uuid tenant_id FK
        uuid org_id FK
        text name
        uuid catalog_version_id FK
        int schema_version
        text status
        date period_start
        date period_end
    }
    PROJECT_SCOPE {
        uuid project_id FK
        text framework
        bool in_scope
        text ens_category
        text nis2_type
        text justification
    }
    PROJECT_MEMBER {
        uuid project_id FK
        uuid user_id FK
        text role "consultor|auditor|cliente|lector"
        date expires_at
    }
    NIS2_ASSESSMENT { uuid project_id FK; text sector; text special; text size; bool digital_infra; text result; text legal_basis; date assessed_at }
    CATALOG_VERSION {
        uuid id PK
        int version UK
        text sha256
        text signature
        timestamptz published_at
        text changelog
    }
    FRAMEWORK {
        uuid id PK
        uuid catalog_version_id FK
        text code "ens|iso27001|nis2|iso42001"
        text edition
    }
    REQUIREMENT {
        uuid id PK
        uuid framework_id FK
        text ref "org.1, A5.1, 21.2.a"
        text title_es
        text title_en
        text dims
        jsonb ens_levels
    }
    UNIFIED_CONTROL {
        uuid id PK
        uuid catalog_version_id FK
        text code "GOB-01"
        text domain
        text title_es
        text objective_es
        text evidence_hint_es
    }
    CONTROL_MAPPING {
        uuid control_id FK
        uuid requirement_id FK
        numeric weight "1|0.5|0"
    }
    CONTROL_STATE {
        uuid id PK
        uuid project_id FK
        uuid control_id FK
        text status "implantado|parcial|pendiente|no-aplica"
        uuid owner_id FK
        date last_review
        date next_review
        text notes
        text origin
        int row_version
    }
    REQUIREMENT_STATE {
        uuid id PK
        uuid project_id FK
        uuid requirement_id FK
        text applies
        text impl_status
        numeric impl_pct
        text justification
        text source "manual|ens-soa|pilar"
    }
    EVIDENCE {
        uuid id PK
        uuid project_id FK
        text title
        text kind "file|url|integration"
        uuid owner_id FK
        date valid_from
        date expires_at
        date review_due
        text classification
    }
    EVIDENCE_VERSION {
        uuid id PK
        uuid evidence_id FK
        text sha256
        bigint size
        text mime
        text storage_key
        text av_status
        uuid uploaded_by FK
        timestamptz uploaded_at
        bool locked
    }
    EVIDENCE_LINK {
        uuid evidence_id FK
        uuid control_state_id FK
        uuid requirement_state_id FK
        text note
    }
    EXCLUSION {
        uuid id PK
        uuid project_id FK
        uuid requirement_id FK
        text justification
        text status "borrador|propuesta|aprobada|rechazada|caducada"
        date valid_until
        uuid proposed_by FK
    }
    APPROVAL {
        uuid id PK
        text subject_type
        uuid subject_id
        uuid approver_id FK
        text decision
        text comment
        text content_sha256
        text signature
        timestamptz decided_at
    }
    ACTION {
        uuid id PK
        uuid project_id FK
        uuid control_id FK
        uuid risk_id FK
        text title
        text status
        text priority
        uuid owner_id FK
        date due_date
        date verified_at
    }
    EXTERNAL_REF {
        uuid id PK
        uuid action_id FK
        text system "jira|github|azdo"
        text external_key
        text url
        text sync_status
    }
    ASSET {
        uuid id PK
        uuid system_id FK
        text magerit_type "[D] [S] [SW] [HW] [COM] [L] [P]…"
        text name
        jsonb valuation "D,I,C,A,T"
    }
    RISK {
        uuid id PK
        uuid project_id FK
        uuid asset_id FK
        text threat_ref "MAGERIT E.x/A.x"
        numeric likelihood
        numeric impact
        numeric inherent
        numeric residual
        text treatment "mitigar|aceptar|transferir|evitar"
        uuid accepted_by FK
    }
    SNAPSHOT {
        uuid id PK
        uuid project_id FK
        text label
        jsonb state "estado completo"
        jsonb kpi
        uuid catalog_version_id FK
        text sha256
        uuid created_by FK
        bool frozen "baseline de auditoría"
    }
    COMMENT {
        uuid id PK
        uuid project_id FK
        text subject_type
        uuid subject_id
        uuid author_id FK
        text body
        uuid parent_id
        bool resolved
    }
    INCIDENT {
        uuid id PK
        uuid project_id FK
        text title
        timestamptz detected_at
        timestamptz aware_at
        bool significant
        text csirt "INCIBE-CERT|CCN-CERT"
        text status
    }
    INCIDENT_DEADLINE {
        uuid incident_id FK
        text kind "early_warning_24h|notification_72h|final_1m"
        timestamptz due_at
        timestamptz submitted_at
    }
    INTEGRATION {
        uuid id PK
        uuid tenant_id FK
        text type
        text secret_ref "vault"
        jsonb config
        bool enabled
    }
    INTEGRATION_RUN {
        uuid id PK
        uuid integration_id FK
        timestamptz started_at
        text status
        jsonb summary
        text result_sha256
    }
    AUDIT_EVENT {
        bigint seq PK
        uuid tenant_id
        uuid actor_id
        text action
        text entity
        uuid entity_id
        jsonb diff
        inet ip
        text prev_hash
        text hash
        timestamptz at
    }
    WEBHOOK_SUBSCRIPTION {
        uuid id PK
        uuid tenant_id FK
        text url
        text events
        text secret_ref
        bool active
    }
```

### 4.3 Reglas de modelo clave

- **Aislamiento:** toda tabla de negocio lleva `tenant_id NOT NULL`; política RLS `USING (tenant_id = current_setting('app.tenant_id')::uuid)`; el rol de aplicación **no** es propietario de las tablas ni tiene `BYPASSRLS`. Tests automáticos que intentan leer entre tenants.
- **Concurrencia:** `row_version` y `If-Match`/ETag en la API (optimistic locking) — dos consultores editando la misma SoA.
- **Inmutabilidad:** `catalog_version` publicada, `evidence_version`, `approval`, `snapshot.frozen=true` y `audit_event` son *append-only* (sin `UPDATE/DELETE` concedidos; trigger que lo impide).
- **Audit log encadenado:** `hash = SHA-256(prev_hash || canonical_json(evento))`; anclaje diario del último hash (correo firmado al tenant o sello de tiempo RFC 3161 de un TSA cualificado UE) → manipulaciones detectables.
- **Aprobación ligada al contenido:** `approval.content_sha256` = hash del texto exacto de la justificación aprobada. Si la justificación cambia, la aprobación deja de ser válida automáticamente.
- **Snapshot reproducible:** guarda el estado completo + `catalog_version_id`; `@rosetta/engine` recalcula y debe dar el mismo KPI (test de reproducibilidad en cada informe).
- **Modelo local (PWA)**: mismo esquema serializado como documento JSON por proyecto (como hoy) pero con las nuevas colecciones (`evidence[]`, `exclusions[]` con `approvals[]`, `actions[]`, `events[]`) — así `.rosetta` ↔ servidor es una transformación directa.

---

## 5. Funcionalidades para consultoría real

### 5.1 Gestión de evidencias
- Subida de ficheros (PWA: OPFS cifrado; servidor: S3 con URL prefirmada de subida **directa**, tamaño máx. y tipos MIME en lista blanca; validación de *magic bytes*; ClamAV; los Office con macros se marcan).
- **SHA-256 calculado en cliente y verificado en servidor**; el hash aparece en la SoA y en el informe ("evidencia E-0142, sha256 9f3c…"). El auditor puede verificar el fichero entregado.
- Metadatos: `valid_from`, `expires_at` (p. ej. certificado de pentest de 12 meses, informe de auditoría ENS bienal), `review_due`, propietario, clasificación (Uso interno / Difusión limitada).
- Estados derivados en el motor: evidencia caducada ⇒ control `implantado` pasa a alerta (nueva regla de coherencia tipo `CO-08` ya existente para "implantado sin evidencias").
- Evidencias reutilizables: una evidencia soporta N controles/requisitos (vista "qué se cae si caduca esto").
- Congelado para auditoría: al crear *baseline* las versiones referenciadas se bloquean (Object Lock).
- Petición de evidencias al cliente: enlace de subida para el rol `cliente` con fecha límite y recordatorios.

### 5.2 Exclusiones / no aplicabilidad con aprobación
- Flujo: `borrador → propuesta → aprobada | rechazada → caducada` (al vencer `valid_until` o cambiar el alcance/categoría ENS).
- Reglas por norma: en **ISO 27001** la exclusión de controles del Anexo A requiere justificación en la SoA (cl. 6.1.3 d) y **las cláusulas 4–10 no son excluibles** → el motor debe bloquear exclusiones de `C4.x–C10.x`. En **ENS** las medidas solo pueden excluirse si no aplican por categoría/dimensión o con justificación y, en su caso, **medidas compensatorias** (RD 311/2022, art. 28 y anexo II) → modelar `compensatory_control_ids`. En **NIS2** las medidas del art. 21.2 no son excluibles, solo proporcionales.
- Firma: aprobación por el responsable de seguridad / dirección del cliente (rol `cliente` con permiso `approve`), con reautenticación MFA (step-up) y registro del hash del contenido. Fase 3: firma avanzada con certificado (AutoFirma/@firma o eIDAS QES vía proveedor cualificado) del PDF de la SoA.

### 5.3 Generación de SoA por norma
- **ENS — Declaración de Aplicabilidad** en el formato habitual que exige la auditoría (guía CCN-STIC 808/804): medida, ¿aplica?, nivel exigido según D/I/C/A/T y categoría, refuerzos aplicables, estado, % implantación, medidas compensatorias, justificación, evidencias, responsable. Exportación XLSX re-importable (cerrar el ciclo con el importador actual) y DOCX/PDF firmado.
- **ISO/IEC 27001 SoA**: 93 controles Anexo A: aplicable S/N, justificación de inclusión/exclusión, estado de implantación, referencia a documentos/evidencias.
- **ISO/IEC 42001 SoA** (Anexo A, 38 controles) con justificación — mismo generador.
- **NIS2**: matriz art. 21.2 a–j + RE 2024/2690 (para entidades del ámbito digital) con medidas y proporcionalidad.
- Todas generadas desde **snapshot** (no del estado vivo) con pie: versión de catálogo, sha256 del snapshot, fecha, aprobaciones.

### 5.4 Informes listos para auditoría (DOCX/PDF)
- Plantillas DOCX parametrizables por consultora (logo, estilos) con `docx`/`docxtemplater`; PDF/A-2b vía Gotenberg; índice, resumen ejecutivo, cobertura por norma (gráficos SVG del panel), brechas por gravedad, plan de acción, exclusiones aprobadas, anexo de evidencias con hashes, anexo metodológico ("las correspondencias son criterio del autor…", ya presente en `informeMd`).
- Comparativa entre snapshots (pre/post auditoría; año N vs N-1) — se apoya en `instantanea()`.
- Generación en local en la PWA (sin servidor) para DOCX; PDF vía impresión del navegador con hoja de estilo `@media print` en F1.

### 5.5 Registro de riesgos (MAGERIT v3 / ISO/IEC 27005:2022)
- Activos por tipo MAGERIT ([essential], [D], [S], [SW], [HW], [COM], [L], [P]…) valorados en D/I/C/A/T (coherente con la categorización ENS ya usada en `alcance.ens.niveles`).
- Amenazas del catálogo MAGERIT (N, I, E, A) con probabilidad/degradación; riesgo potencial → salvaguardas = **controles unificados** → riesgo residual calculado con el estado de `control_state` (implantado = eficacia alta, parcial = media).
- Tratamiento (ISO 27005): mitigar/aceptar/transferir/evitar, con **aceptación del riesgo residual aprobada** (mismo flujo de aprobación que exclusiones) — requisito de ISO 27001 cl. 6.1.3 f.
- Para ISO 42001: registro de **riesgos e impactos de IA** (cl. 6.1.2/6.1.4, AI system impact assessment) con plantilla separada.
- El plan de acción prioriza por ganancia de cobertura (actual `prioridades()`) **y** por reducción de riesgo.

### 5.6 Importación PILAR
- PILAR (CCN) exporta informes y bases en formatos propios; lo práctico: importar los **informes exportados a CSV/XML/XLSX** (activos, valoración, salvaguardas con nivel de madurez L0–L5, riesgo residual) y mapear salvaguardas PILAR ↔ medidas ENS ↔ controles unificados. Madurez → estado: L0–L1 pendiente, L2–L3 parcial, L4–L5 implantado (configurable). Validar con ficheros reales de 2–3 clientes antes de comprometer formato; incluir el mapeo en `@rosetta/catalog` como tabla versionada.

### 5.7 Integraciones (todas por *worker* con secretos en vault y resultado = evidencia con hash)

| Integración | Dirección | Uso | Notas |
|---|---|---|---|
| **Jira Cloud/DC**, **GitHub Issues**, Azure DevOps | bidireccional | Acción del plan ⇄ ticket; estado sincronizado; cierre del ticket ⇒ acción "Hecha" pero **no verificada** hasta revisión del consultor | OAuth 2.0 (3LO) / GitHub App con permisos mínimos; webhooks entrantes firmados. |
| **Microsoft 365 / Entra ID** | entrada | Federación SSO; evidencias automáticas: MFA/Conditional Access, cuentas privilegiadas, revisión de accesos, registros de auditoría habilitados (Graph API) | App registration por cliente, permisos `*.Read.All` mínimos, certificado (no secreto). |
| **Microsoft Defender Secure Score** | entrada | Puntuación y acciones mapeadas a controles (p. ej. identidad → `ACC-*`) | Graph `security/secureScores`. Tendencia como evidencia mensual. |
| **Wazuh / SIEM** | entrada | Evidencia de monitorización (CO/OP.MON), FIM, SCA (benchmarks CIS) y alertas → indicadores de incidente NIS2 | API Wazuh / OpenSearch; solo agregados, nunca eventos con datos personales. |
| **OpenSCAP / CIS-CAT** | entrada (fichero o API) | Resultados ARF/XCCDF → % cumplimiento de bastionado por sistema → controles de configuración segura (ENS op.exp.2/3, ISO A8.9) | Parser XCCDF en worker aislado (XML no fiable: deshabilitar DTD/XXE). |
| **AWS Security Hub / Azure Policy / Defender for Cloud** | entrada | Estado de estándares (CIS AWS, ENS en Azure Policy existe como iniciativa regulatoria) | Role assumption con ExternalId; lectura únicamente. |
| **Email / Teams / Slack** | salida | Notificaciones | Sin datos sensibles en el cuerpo: enlace a la app. |

Principio: **la integración propone, el consultor dispone** — un dato automático nunca cambia el estado de un control sin revisión humana (queda como "sugerencia" con evidencia adjunta).

### 5.8 Plazos de notificación de incidentes NIS2
- Entidad `INCIDENT` con `aware_at` (momento en que se tiene conocimiento): plazos **alerta temprana 24 h**, **notificación 72 h**, **informe final 1 mes** (art. 23 NIS2) y, cuando aplique, informe intermedio y de situación; para ENS, notificación a CCN-CERT según guía CCN-STIC 817; para RGPD, 72 h a la AEPD (art. 33) si hay datos personales → los tres relojes en paralelo.
- Notificaciones escalonadas (T-12h, T-2h, vencido) por email/Teams/webhook; plantillas de notificación por CSIRT (INCIBE-CERT / CCN-CERT / ESPDEF-CERT según tipo de entidad, a confirmar con la ley española de transposición).
- Calendario general: revisiones de evidencias, caducidad de exclusiones, revisión anual de política, auditoría ENS bienal, auditoría de seguimiento ISO.

### 5.9 API y webhooks
- API REST OpenAPI 3.1 versionada (`/v1`), autenticación OAuth2 client-credentials (Keycloak) para máquinas, *scopes* por recurso, rate-limit por token, paginación por cursor, `Idempotency-Key` en POST.
- Webhooks salientes: `control.status_changed`, `evidence.expiring`, `exclusion.approved`, `incident.deadline_due`, `snapshot.created`; firmados HMAC-SHA256 con timestamp (anti-replay), reintentos exponenciales, *dead-letter*, verificación SSRF (bloquear IPs privadas/metadata 169.254.169.254).
- Export/import `.rosetta` por API = backup portable del cliente (portabilidad RGPD art. 20 y salida del proveedor).

### 5.10 Asistente de IA (gobernado bajo ISO/IEC 42001)
- **Uso permitido:** redactar borradores de políticas, justificaciones de exclusión, descripciones de acciones, resúmenes ejecutivos; sugerir evidencias habituales (ya existen en `ev` del catálogo); explicar diferencias entre normas.
- **Nunca fuente de verdad:** el motor determinista calcula cobertura; la IA no puede cambiar estados, aprobar, ni generar mapeos. Todo texto IA queda marcado `ai_generated=true`, requiere aceptación humana explícita y se registra en el audit log (modelo, versión, hash del prompt, usuario que aceptó).
- **Despliegue:** LLM local (Ollama/vLLM con un modelo abierto de pesos conocidos) en la red del tenant o en la propia máquina (PWA ↔ `localhost`); sin envío a APIs externas por defecto; si un tenant habilita un proveedor externo, debe ser UE/DPA firmada y opt-in por proyecto.
- **RAG** solo sobre textos de los que se tiene derecho (ENS, NIS2, guías CCN públicas, políticas del propio cliente); nunca sobre texto de normas ISO sin licencia.
- **Controles ISO 42001 aplicados a la propia Rosetta** (dogfooding, útil también como caso de demostración para tus clientes): política de IA (A.2), roles y responsabilidades (A.3), inventario de recursos de IA — modelo, datos, herramientas (A.4), evaluación de impacto del sistema de IA (A.5), ciclo de vida y verificación (A.6), datos (A.7, sin entrenamiento con datos de cliente), información a usuarios (A.8: etiqueta visible "borrador IA"), uso responsable y supervisión humana (A.9), proveedores (A.10). Registrar el asistente en el inventario y como sistema de **riesgo limitado** según el AI Act (obligación de transparencia, art. 50).
- Mitigar *prompt injection* desde evidencias/documentos del cliente: el LLM no tiene herramientas con efectos; salida tratada como texto no fiable (escape, sin Markdown→HTML sin sanear).

---
## 6. Requisitos no funcionales

### 6.1 Seguridad — objetivo OWASP ASVS 4.0.3 nivel 2 (ASVS 5.0 cuando se estabilice el mapeo)

| Capítulo ASVS | Decisión concreta |
|---|---|
| V1 Arquitectura | Threat model versionado en el repo (`docs/threat-model.md`), revisado en cada épica; separación api/worker/generador PDF en contenedores distintos. |
| V2/V3 Autenticación y sesión | Delegado en Keycloak: MFA obligatorio (WebAuthn preferente, TOTP), política de contraseñas NIST 800-63B, bloqueo progresivo; BFF con cookie `__Host-` `HttpOnly; Secure; SameSite=Lax`, tokens nunca en `localStorage`; step-up MFA para aprobar/exportar/borrar. |
| V4 Control de acceso | RBAC + ABAC por proyecto, *deny by default*, comprobación en servicio **y** RLS en BD; tests de autorización generados por matriz rol×endpoint. |
| V5 Validación | Zod en cada frontera (reutiliza el enfoque de `sanitizeState`); parseo de XLSX/XML/CSV en worker aislado con límites de tamaño, filas, tiempo y memoria. |
| V7 Logs | Audit log de negocio (encadenado) separado de logs técnicos; sin PII ni secretos en logs técnicos. |
| V8 Protección de datos | Cifrado por tenant (ver RGPD), `Cache-Control: no-store` en API, borrado verificable. |
| V12 Ficheros | Subida directa a S3 con *content-type* y tamaño firmados, AV, descarga con `Content-Disposition: attachment` y dominio separado (`files.`) sin cookies. |
| V13 API | OpenAPI como contrato, rechazar campos desconocidos (anti mass-assignment, como `setPath`). |
| V14 Configuración | CSP estricta con nonces/hashes + Trusted Types, HSTS preload, `Permissions-Policy`, `COOP/COEP/CORP`, contenedores distroless no-root, *read-only rootfs*. |

**Roles (RBAC):**

| Permiso | consultor | auditor | cliente | lector |
|---|---|---|---|---|
| Ver proyecto, SoA, informes | ✓ | ✓ (solo snapshots/baseline asignados) | ✓ | ✓ |
| Editar estado de controles / requisitos | ✓ | ✗ | ✓ (los asignados) | ✗ |
| Subir evidencias | ✓ | ✗ | ✓ | ✗ |
| Proponer exclusión / aceptar riesgo | ✓ | ✗ | ✓ | ✗ |
| **Aprobar** exclusión / riesgo residual | ✗ (segregación de funciones) | ✗ | ✓ si tiene `approver` | ✗ |
| Comentar / observaciones de auditoría | ✓ | ✓ | ✓ | ✗ |
| Crear snapshot / baseline, generar informes | ✓ | ✗ (descarga sí) | ✗ | ✗ |
| Gestionar miembros e integraciones | ✓ (admin del tenant) | ✗ | ✗ | ✗ |

Acceso del auditor con **caducidad** y limitado a un baseline congelado.

**Threat model STRIDE (resumen):**

| Amenaza | Escenario principal en Rosetta | Mitigación |
|---|---|---|
| **S**poofing | Robo de sesión de consultor; suplantación de webhook entrante de Jira/GitHub | OIDC+MFA, cookies `__Host-`, step-up; verificación HMAC/firma de webhooks con timestamp. |
| **T**ampering | Alterar el estado de una SoA o una evidencia tras la auditoría; manipular `.rosetta` importado; envenenar el catálogo | Snapshots y evidencias inmutables con SHA-256, audit log encadenado, catálogo firmado (Ed25519, clave offline) y verificado al cargar; importación con esquema estricto (ya existe). |
| **R**epudiation | "Yo no aprobé esa exclusión" | Aprobación con step-up MFA, hash del contenido aprobado, audit log anclado con sello de tiempo. |
| **I**nformation disclosure | **Fuga entre tenants** (el riesgo nº 1 de un SaaS GRC: mapa de debilidades de un cliente); XSS que exfiltra estado; evidencias públicas por URL; LLM que mezcla contextos | RLS + tests cross-tenant en CI; CSP+Trusted Types; URLs prefirmadas de corta vida; IA por tenant sin memoria compartida; cifrado por tenant. |
| **D**enial of service | XLSX/XML bomba (zip bomb, *billion laughs*), ReDoS en parsers, generación masiva de PDFs | Workers con límites de CPU/mem/tiempo, cuotas por tenant, rate-limit, colas con prioridad. |
| **E**levation of privilege | `cliente` que se autoaprueba; IDOR por UUID de proyecto; SSRF en webhooks/integraciones hacia metadata cloud | Segregación de funciones en reglas; autorización por objeto; egress allow-list y bloqueo de rangos privados. |

Además: pentest externo antes de GA y anual (y tu propio pentest continuo — aprovecha tu perfil, pero contrata un tercero para independencia ante clientes ENS), programa de divulgación responsable (`security.txt`).

### 6.2 RGPD y protección de datos
- **Roles:** en la PWA local el proveedor no trata datos; en SaaS eres **encargado del tratamiento** (art. 28 RGPD) de la consultora o del cliente final → **DPA** estándar, lista de subencargados publicada, notificación de cambios con 30 días.
- **Datos personales tratados:** nombres/emails de responsables, usuarios; ocasionalmente datos en evidencias (listados de usuarios, logs). Minimizar: evidencias de integraciones solo agregadas; aviso al subir ficheros.
- **Residencia UE:** hosting y backups en la UE con proveedor de matriz europea (evita exposición a CLOUD Act); para clientes ENS categoría ALTA/sector público: opción on-prem o nube cualificada en el **Catálogo CPSTIC** del CCN. Valorar a medio plazo la propia **certificación ENS** del servicio SaaS (exigida por las AAPP a sus proveedores, art. 2 y disp. adic. RD 311/2022) e ISO 27001.
- **Cifrado:** TLS 1.3 (1.2 mínimo) con HSTS; en reposo: disco cifrado + **cifrado por tenant a nivel de aplicación** para campos sensibles (justificaciones, notas, comentarios) y evidencias, con *envelope encryption* (DEK por tenant, KEK en KMS/Vault/HSM). Borrar el tenant = destruir su DEK (*crypto-shredding*), incluido en backups.
- **Retención:** configurable por tenant (por defecto: proyecto activo + 6 años, alineado con conservación de evidencias de auditoría/fiscal; audit log 6 años; logs técnicos 90 días; backups 35 días). Exportación completa y borrado verificado al terminar el contrato.
- **Derechos ARSULIPO:** export por usuario, anonimización de autor en audit log tras baja (pseudónimo estable para no romper la cadena de hashes: el hash se calcula sobre `actor_id` pseudónimo).
- **RAT y EIPD:** registro de actividades del propio servicio; EIPD recomendable por tratar información de seguridad de terceros a gran escala.

### 6.3 Observabilidad
- OpenTelemetry (trazas, métricas, logs) → Prometheus/Grafana/Loki/Tempo self-hosted en UE; correlación por `trace_id`; **sin PII** en atributos (lint de atributos permitidos).
- Métricas de negocio: proyectos activos, evidencias caducadas, integraciones fallidas, plazos NIS2 en riesgo.
- Alertas: errores 5xx, latencia p95, cola atascada, fallo de backup, intento de acceso cross-tenant (debe ser 0 → alerta de seguridad), anomalías de exportación masiva.
- Frontend: Sentry self-hosted o GlitchTip con `beforeSend` que elimina contenido.

### 6.4 Copias de seguridad y continuidad
- PostgreSQL: WAL archiving + PITR (pgBackRest) con retención 35 días, copia diaria cifrada a **segunda región UE / segundo proveedor**; S3 con versionado y replicación; claves de backup custodiadas aparte (offline).
- **Pruebas de restauración mensuales automatizadas** (restaurar en entorno efímero, verificar hashes de audit log y evidencias).
- Objetivos: **RPO ≤ 15 min, RTO ≤ 4 h** (MVP); RPO ≤ 5 min / RTO ≤ 1 h (enterprise).
- PWA: recordatorio de backup `.rosetta` cifrado cada N días; exportación automática a carpeta elegida (File System Access API) cuando esté disponible.

### 6.5 SLO
| Indicador | MVP | Enterprise |
|---|---|---|
| Disponibilidad mensual API/web | 99,5 % | 99,9 % |
| Latencia p95 lecturas | < 300 ms | < 200 ms |
| Latencia p95 recálculo de cobertura (113 controles, 4 normas) | < 150 ms | < 100 ms |
| Generación de informe DOCX/PDF p95 | < 30 s | < 15 s |
| Entrega de notificación de plazo NIS2 | < 5 min desde el disparo, 99,9 % | idem con doble canal |
| Fugas cross-tenant | 0 (SLO de seguridad, *error budget* nulo) | 0 |

### 6.6 CI/CD (GitHub Actions)
Workflows (acciones fijadas por **SHA** de commit, `permissions:` mínimas por job, OIDC hacia el registro/cloud, sin secretos de larga vida):

1. **`ci.yml`** (PR y main): `npm ci` → ESLint (+ `eslint-plugin-no-unsanitized`, `eslint-plugin-security`) + Prettier → `node --test` (motor, catálogo, build) → `npm run check` (dist al día) → e2e Playwright (Chromium/Firefox/WebKit) → **golden files** del motor → cobertura (umbral motor ≥ 90 %).
2. **`codeql.yml`**: CodeQL `javascript-typescript` (security-extended) en PR + semanal.
3. **`deps.yml`**: `npm audit --audit-level=high` / `osv-scanner`, Dependabot o Renovate (agrupado, con *minimum release age* ≥ 3 días para mitigar paquetes comprometidos), `dependency-review-action` en PR, licencias (bloquear AGPL en el cliente si vendes licencias propietarias).
4. **`secrets`**: gitleaks + *push protection* de GitHub.
5. **`release.yml`** (tag): build reproducible → **SBOM CycloneDX** (`@cyclonedx/cyclonedx-npm`; `syft` para imágenes) → **firma** de `dist/index.html` y artefactos con **Sigstore cosign** (keyless, OIDC de GitHub) + **atestación SLSA de procedencia** (`actions/attest-build-provenance`) → publicar hash SHA-256 en la release (los clientes pueden verificar el fichero portable).
6. **Contenedores** (F2+): build multi-stage distroless, **Trivy/Grype** (fallo en CRITICAL/HIGH con fix), firma cosign, verificación de firma en el despliegue (policy-controller/Kyverno en F3).
7. **DAST**: OWASP ZAP baseline contra el entorno de *staging* en cada despliegue; full scan semanal.
8. Entornos: `preview` por PR (datos sintéticos — los 5 casos demo), `staging`, `prod` con aprobación manual y despliegue progresivo; migraciones de BD *expand/contract* compatibles hacia atrás.
9. OpenSSF Scorecard en el repo; *branch protection* con revisión obligatoria y commits firmados.

### 6.7 Estrategia de pruebas
| Nivel | Qué | Herramienta |
|---|---|---|
| Unitarias motor | Ya existentes + **golden files** por caso + **property-based** (fast-check): cobertura ∈ [0,1], monotonía (subir un control nunca baja cobertura), excluir un requisito nunca baja el %, idempotencia de `sanitizeState(sanitizeState(x))` | `node:test`, fast-check |
| Catálogo | Integridad (ya existe) + cada requisito en alcance cubierto por ≥1 control con `w>0` o justificado; diff entre versiones con informe de impacto | `node:test` |
| Esquema/migraciones | Cada migración vN→vN+1 con fixtures reales anonimizados; ida y vuelta `.rosetta` | Vitest |
| Seguridad | Fuzzing de importadores (JSON/XLSX/XCCDF/CSV) con corpus hostil (prototype pollution, zip bomb, fórmulas, XXE); tests de CSP (ninguna violación en e2e); **matriz de autorización rol×endpoint**; **tests cross-tenant RLS** | Jazzer.js / fast-check, Playwright, Vitest + Testcontainers Postgres |
| Integración API | Contrato OpenAPI (Schemathesis), Testcontainers (Postgres, MinIO, Keycloak) | Vitest, Schemathesis |
| E2E | Flujos críticos: crear proyecto → importar SoA ENS → evidencias → proponer y aprobar exclusión → snapshot → SoA DOCX; accesibilidad (axe) WCAG 2.2 AA; móvil 390 px (ya existe) | Playwright + axe |
| Informes | Snapshot visual/estructural de DOCX/XLSX generados (comparar XML normalizado) | custom |
| Rendimiento | k6: 200 usuarios concurrentes, proyecto de 5 normas | k6 |
| Restauración | Restore-test mensual automatizado | pgBackRest + script |

---
## 7. Hoja de ruta priorizada

Esfuerzo en persona-día (pd) para un desarrollador senior full-stack familiarizado con el código; añadir 20–30 % de contingencia.

### Fase 0 — Endurecer el build actual (≈ 5–8 pd, 1–2 semanas)

Objetivo: que el fichero único sea seguro para **demos y datos reales no críticos** en el equipo del consultor, sin cambiar la arquitectura.

| # | Entregable | Ficheros afectados | Esfuerzo |
|---|---|---|---|
| 0.1 | **Vendorizar SheetJS**: sustituir `xlsx-js-style@1.2.0` de jsDelivr por SheetJS CE ≥ 0.20.3 (tarball oficial de cdn.sheetjs.com, con estilos vía alternativa o mantener el fork tras auditar) **embebido en el build** o servido como fichero local con **SRI** `integrity=sha384-…`; cargar solo al importar/exportar. Verificar CVE-2023-30533 / CVE-2024-22363. | `01-core.js` (`XLSX_URL`), `06-io.js` (`loadXLSX`), `scripts/build.mjs`, `package.json` | 1–1,5 |
| 0.2 | **Self-host de fuentes** (Bricolage Grotesque, Onest, Martian Mono — licencia OFL) en base64/woff2 dentro del build o en `/fonts`; eliminar `preconnect` a Google. | `src/index.html`, `styles/rosetta.css` | 0,5 |
| 0.3 | **CSP por `<meta http-equiv>`** generada en build con hashes SHA-256 de cada `<script>` inline: `default-src 'none'; script-src 'sha256-…'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'` (+ `require-trusted-types-for 'script'` tras 0.5). Test e2e que falla ante cualquier `securitypolicyviolation`. | `scripts/build.mjs`, `tests/e2e.test.mjs` | 1 |
| 0.4 | Quitar `window.__ROSETTA__` del build de producción (flag de build `--test`) o hacerlo opt-in con `?debug`. | `07-events.js`, `build.mjs`, e2e | 0,5 |
| 0.5 | Política **Trusted Types** mínima (`rosetta#html`) que envuelve los 28 `innerHTML`; regla ESLint `no-unsanitized/property`. | `03-shell.js`, `05-views.js`, `05b-inspector.js`, `07-events.js` | 1–1,5 |
| 0.6 | `uid()` → `crypto.randomUUID()` (manteniendo el patrón `PROJ_ID` o ampliándolo con migración). | `01-core.js`, `01b-security.js` | 0,25 |
| 0.7 | Detección de **cuota/fallo de escritura** en `store.set` con aviso visible ("los cambios no se están guardando") y botón de copia. | `01-core.js` | 0,25 |
| 0.8 | **Banner de clasificación** al crear proyecto propio: "Los datos se guardan sin cifrar en este navegador. No uses equipos compartidos." + recordatorio de copia. | `04-global.js`, i18n | 0,25 |
| 0.9 | Corregir **H9**: conservar `justificacion`, `evidencias`, `responsable` en `st.ensSoa` (ampliar `sanitizeState` con límites) y reexportarlos en la hoja ENS. | `06-io.js`, `01b-security.js`, tests | 0,5 |
| 0.10 | **CI mínima** en `.github/workflows/`: `ci.yml` (`npm ci`, `npm test`, `npm run check`, e2e), `codeql.yml`, dependency-review, gitleaks; release con SHA-256 + cosign + atestación de procedencia. | `.github/workflows/*` | 1–1,5 |
| 0.11 | `SECURITY.md`, `security.txt`, licencia explícita, nota sobre títulos ISO parafraseados. | raíz, `docs/` | 0,25 |

**Criterios de aceptación F0**
- `dist/index.html` funciona sin red (DevTools *offline*): **cero peticiones a terceros** en la carga (verificado por test e2e que intercepta `page.on('request')`).
- Cero violaciones CSP en todos los e2e; CSP sin `unsafe-eval` ni `unsafe-inline` en `script-src`.
- `npm audit` sin vulnerabilidades altas; CodeQL sin alertas *high*.
- La SoA ENS importada y reexportada conserva justificación/evidencias/responsable (test con fichero de ejemplo).
- Release firmada verificable con `cosign verify-blob` y hash publicado.

### Fase 1 — PWA local-first cifrada (≈ 25–35 pd, 5–7 semanas)

Objetivo: **apto para datos reales de cliente** en el portátil del consultor.

| # | Entregable | Esfuerzo |
|---|---|---|
| 1.1 | Monorepo pnpm: `packages/engine` (ESM + UMD + tipos `d.ts`/JSDoc), `packages/catalog` (con `version`, `sha256`, firma Ed25519 verificada al cargar), `packages/schema` (Zod; `sanitizeState` generado/derivado), `apps/portable` (app actual). Golden files de los 5 casos. | 4–5 |
| 1.2 | **Esquema v2** + migración v1→v2: `catalogo{version,sha256}`, `evidencias[]`, `exclusiones` con `{justificacion, autor, fecha, estado, validoHasta, aprobaciones[]}`, `acciones[]` (N por control), `eventos[]` (registro local de cambios con autor = perfil), `snapshots[]` completos. Compatibilidad: importar proyectos/backups v1. | 4–5 |
| 1.3 | **Almacén cifrado**: IndexedDB con registros AES-256-GCM (IV aleatorio por registro, AAD = id+versión); DEK aleatoria envuelta por KEK derivada de passphrase (PBKDF2-SHA256 600 000 it. — o Argon2id WASM) y opcionalmente **passkey WebAuthn PRF**; bloqueo por inactividad (clave fuera de memoria); migración automática desde `localStorage` y borrado seguro del original. Clave de recuperación imprimible. | 6–8 |
| 1.4 | **Service Worker** (precache versionado, sin runtime fetch), `manifest.webmanifest`, instalación; despliegue en GitHub Pages/Cloudflare Pages con cabeceras HTTP reales (CSP, HSTS, COOP/COEP) — el fichero único sigue publicándose como "Portable". | 2–3 |
| 1.5 | **Evidencias locales**: ficheros en OPFS cifrados, SHA-256 (SubtleCrypto, por streaming para ficheros grandes), metadatos de caducidad/revisión, vinculación N:M a controles/requisitos; nuevas reglas de coherencia (evidencia caducada, revisión vencida). | 4–5 |
| 1.6 | **Formato `.rosetta`**: ZIP/JSON con manifiesto, contenido cifrado (passphrase de exportación distinta), hashes de cada parte, firma opcional del consultor; sustituye a la copia JSON en claro (mantener export en claro con aviso explícito). | 2–3 |
| 1.7 | **Exclusiones con aprobación "ligera"**: firma local = nombre + fecha + hash del contenido + exportación de "acta de aprobación" DOCX/PDF para firma manuscrita/electrónica fuera de la app. Reglas por norma (ISO cl. 4–10 no excluibles; NIS2 21.2 no excluible). | 2 |
| 1.8 | **Generadores**: SoA ENS (formato CCN, re-importable), SoA ISO 27001 y 42001, informe DOCX (`docx` en navegador) desde snapshot; impresión PDF con CSS de impresión. | 5–6 |

**Criterios de aceptación F1**
- Con DevTools: ningún dato de proyecto legible en claro en `localStorage`, IndexedDB ni OPFS (test e2e que inspecciona el almacenamiento tras crear un proyecto con un marcador conocido).
- App instalable, 100 % offline, Lighthouse PWA/seguridad sin fallos; cero peticiones externas.
- Proyecto v1 (incluidos los 5 casos y una copia de seguridad real) migra a v2 sin pérdida (test de ida y vuelta) y el KPI coincide con los golden files.
- SoA ENS exportada → reimportada por el importador actual = mismos datos (*round-trip*).
- Una evidencia tiene hash SHA-256 visible en la ficha, en la SoA y en el informe; alteración de fichero detectada.
- Revisión de seguridad propia (pentest de la PWA) sin hallazgos altos.

### Fase 2 — MVP servidor multi-tenant (≈ 60–80 pd, 3–4 meses con 1–2 personas)

Objetivo: colaboración consultor–cliente–auditor con trazabilidad; primeros clientes de pago en piloto.

| # | Entregable | Esfuerzo |
|---|---|---|
| 2.1 | `apps/api` Fastify + Zod + OpenAPI; Drizzle + migraciones; PostgreSQL con **RLS** y tests cross-tenant; BFF de sesión. | 12–15 |
| 2.2 | **Keycloak**: realm, MFA obligatorio, organizaciones por tenant, federación Entra ID opcional; roles consultor/auditor/cliente/lector; step-up. | 5–6 |
| 2.3 | `apps/web` SvelteKit + lucide-svelte, reutilizando `@rosetta/engine` en cliente (recálculo instantáneo) y en servidor (fuente de verdad); diseño portado del CSS actual (temas/acento/densidad). | 15–20 |
| 2.4 | Evidencias en S3 UE (subida prefirmada, SHA-256 verificado, ClamAV, Object Lock en baseline), caducidades y recordatorios. | 6–8 |
| 2.5 | Flujos de **aprobación** (exclusiones, aceptación de riesgo) con step-up MFA y hash; **audit log encadenado** con anclaje diario. | 5–6 |
| 2.6 | Snapshots/baselines inmutables; vista de auditor; comentarios/observaciones en hilo. | 4–5 |
| 2.7 | Generación DOCX/PDF en worker (Gotenberg aislado, sin red). | 4 |
| 2.8 | Import/export `.rosetta` ⇄ servidor (onboarding desde PWA y salida del proveedor). | 3 |
| 2.9 | Integración **Jira / GitHub Issues** para acciones (bidireccional) + webhooks salientes firmados. | 5–6 |
| 2.10 | Infra: Docker Compose de producción en proveedor UE, backups PITR + restore test, OTel/Grafana, ZAP en staging, contenedores firmados y escaneados. | 6–8 |

**Criterios de aceptación F2**
- ASVS L2 autoevaluado con evidencias por requisito; **pentest externo** sin hallazgos críticos/altos abiertos.
- Test automatizado: un usuario de tenant A no puede leer/escribir ningún recurso de tenant B por API ni por BD (RLS) — 100 % de endpoints cubiertos.
- Flujo E2E completo verde: invitar cliente → importar SoA ENS → cliente sube evidencia → consultor propone exclusión → cliente aprueba con MFA → baseline → auditor descarga SoA PDF y verifica hashes.
- Restauración PITR probada (RTO ≤ 4 h, RPO ≤ 15 min) y documentada.
- DPA, RAT, EIPD, política de privacidad y lista de subencargados publicados; datos y backups solo en UE.
- SLO MVP medidos durante 30 días de piloto con ≥ 2 clientes.

### Fase 3 — Enterprise (≈ 4–8 meses, equipo 2–4)

| Bloque | Entregables | Esfuerzo orientativo |
|---|---|---|
| Riesgos | Registro MAGERIT/ISO 27005 enlazado con controles; riesgo residual; aceptación aprobada; riesgos/impactos de IA (ISO 42001 6.1.4). | 25–35 pd |
| PILAR | Importador de informes PILAR (activos, valoración, salvaguardas/madurez) con tabla de correspondencias versionada. | 10–15 pd (dependiente de muestras reales) |
| Integraciones de evidencia | Entra ID/M365 (Graph), Defender Secure Score, Wazuh (SCA/FIM), OpenSCAP/CIS-CAT (XCCDF/ARF), AWS Security Hub, Azure Policy/Defender for Cloud — patrón "sugerencia + evidencia con hash". | 8–12 pd cada una |
| NIS2 incidentes | Módulo de incidentes con relojes 24 h / 72 h / 1 mes + RGPD 72 h + CCN-CERT; plantillas por CSIRT; notificaciones multicanal con doble canal. | 10–15 pd |
| IA gobernada | Asistente con LLM local por tenant, RAG sobre fuentes con licencia, marcado `ai_generated`, aceptación humana, registro en audit log; documentación ISO 42001 del propio sistema (política, AIIA, inventario). | 20–30 pd |
| API pública | OAuth client-credentials, scopes, rate-limit, SDK TS, portal de documentación. | 10 pd |
| Firma cualificada | Firma eIDAS de SoA/actas (proveedor de confianza cualificado UE o integración AutoFirma). | 8–12 pd |
| Plataforma | Kubernetes/Helm, instalación on-prem para AAPP (ENS ALTA), cifrado por tenant con KMS/HSM y *crypto-shredding*, SSO SAML, SCIM, multi-región UE, SLO 99,9 %. | 30–45 pd |
| Cumplimiento propio | Certificación **ENS (categoría MEDIA mínima)** del servicio e ISO/IEC 27001; opcional ISO/IEC 42001 del asistente — usando la propia Rosetta (dogfooding comercializable). | proyecto propio 4–6 meses |

**Criterios de aceptación F3** — por bloque: integración con tests de contrato y entorno sandbox; ≥ 1 cliente piloto usando cada integración; SLO 99,9 % durante 90 días; certificación ENS obtenida antes de vender a AAPP.

---

## 8. Riesgos del plan y decisiones a tomar ya

| Riesgo / decisión | Recomendación |
|---|---|
| Derechos de autor ISO en el catálogo | Revisar con abogado; títulos parafraseados propios, referencia numérica, nunca texto literal; el cliente aporta su copia licenciada. |
| Responsabilidad sobre los mapeos (el % de cumplimiento puede inducir a error) | Mantener el descargo actual en informes, versionar mapeos con justificación por mapeo y revisor; nunca prometer "conforme". |
| Pérdida de passphrase en PWA | Clave de recuperación impresa + recordatorios de backup; explicarlo como característica (nadie más puede leer los datos). |
| Alcance excesivo en F2 | MVP sin riesgos/PILAR/IA; solo colaboración, evidencias, aprobaciones, SoA e informes. |
| Licencia del producto | Decidir pronto (propietaria con núcleo motor abierto, o AGPL + comercial) — condiciona dependencias y contribución. |
| Transposición española de NIS2 | Parametrizar CSIRT/plazos/autoridades como datos del catálogo (no código) para ajustarlos cuando la ley esté en vigor/actualizada. |

## 9. Próximos 10 días (accionable)

1. Crear `.github/workflows/ci.yml` y `codeql.yml` (0.10) — protege todo lo demás.
2. Congelar golden files del motor con los 5 casos.
3. Vendorizar SheetJS + SRI (0.1) y fuentes (0.2) → test "cero peticiones externas".
4. CSP con hashes generada en `scripts/build.mjs` (0.3) + quitar `__ROSETTA__` en prod (0.4).
5. Arreglar pérdida de campos en la importación ENS (0.9).
6. Banner de "datos sin cifrar" (0.8) mientras llega la Fase 1.
7. Redactar `docs/threat-model.md` con la tabla STRIDE de este documento y empezar el diseño del esquema v2 (1.2).

---

### Ficheros críticos del repositorio para la implementación
- `src/engine/rosetta-engine.js` — motor a extraer como `@rosetta/engine`.
- `src/app/01-core.js` — almacenamiento (`store`, `PKEY`), `uid()`, `XLSX_URL`, `blankState`, snapshots.
- `src/app/01b-security.js` — `sanitizeState`/`sanitizeWs` → base del esquema canónico.
- `src/app/06-io.js` — importador SoA ENS (`limpiaSoa`, `aplicaImportEns`), exportadores, `loadXLSX`, backups.
- `scripts/build.mjs` — punto para CSP por hashes, vendorizado y firma de releases.
- `src/data/catalog.json` — catálogo a versionar y firmar.
