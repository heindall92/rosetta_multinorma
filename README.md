![header](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24,30&height=200&section=header&text=ROSETTA&fontSize=64&fontColor=fff&animation=twinkling&fontAlignY=35&desc=Mapa%20multinorma%20%C2%B7%20ENS%20%C2%B7%20ISO%2027001%20%C2%B7%20NIS2%20%C2%B7%20ISO%2042001&descSize=18&descAlignY=56&descAlign=50)

<p align="center">
  <b><i>Implanta cada control una vez. Comprueba al instante qué cubre en cuatro normas, qué falta y qué conviene hacer primero.</i></b>
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia GPLv2" src="https://img.shields.io/badge/LICENCIA-GPLv2-4169A1?style=flat"/></a>
  <img alt="ENS RD 311/2022" src="https://img.shields.io/badge/ENS-RD%20311%2F2022-E07B39?style=flat"/>
  <img alt="ISO/IEC 27001:2022" src="https://img.shields.io/badge/ISO%2FIEC-27001%3A2022-3B6FD4?style=flat"/>
  <img alt="NIS2 + RE 2024/2690" src="https://img.shields.io/badge/NIS2-RE%202024%2F2690-7B4FD1?style=flat"/>
  <img alt="ISO/IEC 42001:2023" src="https://img.shields.io/badge/ISO%2FIEC-42001%3A2023-2E9E7A?style=flat"/>
  <img alt="Sin dependencias en ejecución" src="https://img.shields.io/badge/runtime-0%20dependencias-111?style=flat&logo=javascript&logoColor=F7DF1E"/>
  <img alt="Interfaz ES/EN" src="https://img.shields.io/badge/UI-ES%20%2F%20EN-2E8B57?style=flat"/>
  <a href="https://github.com/heindall92/rosetta_multinorma/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/heindall92/rosetta_multinorma/actions/workflows/ci.yml/badge.svg"/></a>
  <img alt="Iconos Lucide" src="https://img.shields.io/badge/iconos-Lucide-F56565?style=flat&logo=lucide&logoColor=white"/>
</p>

<p align="center">
  <img src="docs/img/readme/panel-dark.png" alt="Órbita: la rueda Rosetta con la cobertura de cada control en cada norma" width="880"/>
</p>

**Rosetta es una piedra de Rosetta para el cumplimiento normativo.** Enlaza los **311 requisitos** del Esquema Nacional de Seguridad, ISO/IEC 27001, NIS2 (con el detalle técnico del Reglamento de Ejecución 2024/2690) e ISO/IEC 42001 con **113 controles unificados** en 13 dominios. Marcas el estado de cada control una sola vez y Rosetta recalcula la cobertura de todas las normas del alcance, detecta incoherencias entre ellas y ordena el plan de acción por retorno: primero lo que más requisitos desbloquea.

Es un único fichero HTML que funciona sin servidor, sin instalación y sin conexión: **los datos no salen del navegador**.

---

## Índice

- [Cómo funciona](#-cómo-funciona)
- [Mapa mental](#-mapa-mental)
- [Qué incluye](#-qué-incluye)
- [Capturas](#-capturas)
- [Arranque rápido](#-arranque-rápido)
- [Arquitectura](#-arquitectura)
- [El motor de cálculo](#-el-motor-de-cálculo)
- [Calidad](#-calidad)
- [Seguridad y privacidad](#-seguridad-y-privacidad)
- [Hacia producción](#-hacia-producción)
- [Limitaciones conocidas](#-limitaciones-conocidas)
- [Estructura](#-estructura)
- [Licencia](#-licencia)
- [Autor](#-autor)

---

## <img src="docs/assets/icons/route.svg" width="20" height="20" valign="middle"/> Cómo funciona

1. **Defines el alcance.** Qué normas aplican y cómo: categoría y niveles por dimensión (D·I·C·A·T) del ENS, si eres entidad esencial o importante según NIS2 (un asistente lo deduce de los arts. 2 y 3 de la Directiva) y si entra ISO/IEC 42001.
2. **Partes de lo que ya tienes.** Importas la Declaración de Aplicabilidad del ENS desde Excel y Rosetta hereda el estado de cada control, o empiezas desde cero o desde uno de los cinco casos de ejemplo.
3. **Marcas cada control una vez.** Implantado, parcial, pendiente o no aplica, con responsable, evidencias y fecha de revisión. Cada cambio recalcula las cuatro normas a la vez.
4. **Rosetta traduce y prioriza.** Muestra la cobertura por norma y requisito, las equivalencias entre normas, las brechas, las incoherencias (por ejemplo, una exclusión que otra norma contradice) y un plan de acción ordenado por impacto.
5. **Exportas.** Excel con el mapa completo, informe en Markdown, plan y controles en CSV y el proyecto en JSON. Todo se genera en el navegador, con tu nombre como autor.

## <img src="docs/assets/icons/brain-circuit.svg" width="20" height="20" valign="middle"/> Mapa mental

```mermaid
mindmap
  root((Rosetta))
    Normas
      ENS RD 311/2022
        73 medidas del Anexo II
        Categoría y niveles D·I·C·A·T
      ISO/IEC 27001:2022
        Cláusulas 4 a 10
        93 controles del Anexo A
      NIS2
        Directiva 2022/2555
        RE 2024/2690
        Esencial o importante
      ISO/IEC 42001:2023
        Cláusulas 4 a 10
        38 controles del Anexo A
    Controles unificados
      113 controles
      13 dominios
      Estado, responsable, evidencias
      Peso total, parcial o relación
    Vistas
      Órbita
      Prisma
      Controles
      Normas y SoA
      Brechas y coherencia
      Plan por retorno
      Mapa de correspondencias
      Alcance
    Entrada y salida
      Importar SoA del ENS
      Excel, Markdown, CSV y JSON
      Copias de seguridad
    Garantías
      Local, sin servidor
      Validación de todo lo que entra
      Antiinyección CSV
      Español e inglés
```

## <img src="docs/assets/icons/list-checks.svg" width="20" height="20" valign="middle"/> Qué incluye

| | Vista | Qué resuelve |
|---|---|---|
| <img src="docs/assets/icons/orbit.svg" width="18"/> | **Órbita** | La rueda Rosetta: cada rayo es un control y cada anillo una norma. Cobertura media, estado por norma, *siguiente mejor jugada* y cuánto heredas en el resto si ya cumples una. |
| <img src="docs/assets/icons/waypoints.svg" width="18"/> | **Prisma** | *Un requisito entra, cuatro normas salen*: elige un requisito de cualquier norma y se descompone en sus controles y se proyecta sobre sus equivalentes (total, parcial o relacionado). |
| <img src="docs/assets/icons/layers.svg" width="18"/> | **Controles** | Los 113 controles unificados con su estado, normas a las que sirven, responsable, evidencias y fecha de revisión. |
| <img src="docs/assets/icons/file-check.svg" width="18"/> | **Normas** | La declaración de aplicabilidad de cada norma: cobertura calculada por requisito, exclusiones con justificación y nivel exigido en el ENS. |
| <img src="docs/assets/icons/shield-alert.svg" width="18"/> | **Brechas** | Requisitos sin soporte y 11 reglas de coherencia multinorma (notificación NIS2 en 24 h / 72 h / 1 mes, formación de la dirección, evaluación de impacto de IA, exclusiones contradictorias, controles sin evidencias o sin revisar en 12 meses…), por severidad. |
| <img src="docs/assets/icons/square-kanban.svg" width="18"/> | **Plan** | Tablero pendiente → en curso → hecha ordenado por retorno, con responsable y fecha. Al cerrar una tarjeta el control pasa a implantado. |
| <img src="docs/assets/icons/grid-3x3.svg" width="18"/> | **Mapa** | Peso de cada norma por dominio, matriz de solapamiento entre normas y tabla completa de correspondencias. |
| <img src="docs/assets/icons/compass.svg" width="18"/> | **Alcance** | Normas en alcance, categoría y niveles del ENS y asistente de aplicabilidad de NIS2. |
| <img src="docs/assets/icons/download.svg" width="18"/> | **Exportar** | Excel con formato, informe Markdown, plan y controles en CSV, proyecto en JSON y copia de seguridad completa. |

Además: **cinco casos de ejemplo** con datos ficticios (un proveedor TIC del sector público, un hospital, una startup de IA, una empresa de agua y un SaaS para ayuntamientos), varios proyectos a la vez, buscador global (`Ctrl + K`), inspector lateral, tema claro y oscuro con siete acentos, densidad compacta, interfaz en español e inglés y vista móvil con barra inferior.

## <img src="docs/assets/icons/image.svg" width="20" height="20" valign="middle"/> Capturas

<table>
<tr>
<td width="50%"><img src="docs/img/readme/inicio-light.png" alt="Inicio"/><br/><sub><b>Inicio</b> · casos de ejemplo y proyectos</sub></td>
<td width="50%"><img src="docs/img/readme/traductor-light.png" alt="Prisma"/><br/><sub><b>Prisma</b> · un requisito del ENS proyectado sobre ISO 27001, NIS2 e ISO 42001</sub></td>
</tr>
<tr>
<td><img src="docs/img/readme/controles-light.png" alt="Controles"/><br/><sub><b>Controles</b> · 113 controles unificados en 13 dominios</sub></td>
<td><img src="docs/img/readme/normas-dark.png" alt="Normas"/><br/><sub><b>Normas</b> · declaración de aplicabilidad calculada</sub></td>
</tr>
<tr>
<td><img src="docs/img/readme/brechas-dark.png" alt="Brechas"/><br/><sub><b>Brechas</b> · huecos y coherencia multinorma</sub></td>
<td><img src="docs/img/readme/plan-dark.png" alt="Plan"/><br/><sub><b>Plan</b> · tablero ordenado por retorno</sub></td>
</tr>
<tr>
<td><img src="docs/img/readme/mapa-light.png" alt="Mapa"/><br/><sub><b>Mapa</b> · solapamiento y correspondencias</sub></td>
<td><img src="docs/img/readme/alcance-light.png" alt="Alcance"/><br/><sub><b>Alcance</b> · ENS por niveles y asistente NIS2</sub></td>
</tr>
</table>

<p align="center">
  <img src="docs/img/readme/mobile-panel-dark.png" alt="Órbita en móvil" width="260"/>
  &nbsp;&nbsp;
  <img src="docs/img/readme/mobile-traductor-light.png" alt="Prisma en móvil" width="260"/>
  <br/><sub><b>Vista móvil</b> · la misma herramienta, con barra inferior</sub>
</p>

## <img src="docs/assets/icons/rocket.svg" width="20" height="20" valign="middle"/> Arranque rápido

**Para usarla** no hace falta nada: descarga [`dist/index.html`](dist/index.html) y ábrelo en el navegador. Funciona sin conexión.

**Para desarrollar** (Node.js 20 o superior):

```bash
git clone https://github.com/heindall92/rosetta_multinorma.git
cd rosetta_multinorma
npm ci                 # solo Playwright, para las pruebas E2E
npm run build          # src/ → dist/index.html
npm run serve          # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run build` | Ensambla `src/` en un único `dist/index.html` autocontenido. |
| `npm run check` | Falla si `dist/index.html` no corresponde a `src/` (lo usa la CI). |
| `npm test` | Pruebas del motor, integridad del catálogo y build (`node:test`, sin dependencias). |
| `npm run test:e2e` | Recorre la aplicación en Chromium con Playwright. |
| `npm run test:all` | Todo lo anterior. |
| `npm run serve` | Servidor estático local, sin dependencias. |

<details>
<summary><b>Publicarla en GitHub Pages</b></summary>

El flujo [`pages.yml`](.github/workflows/pages.yml) construye, prueba y publica `dist/` en cada *push* a `main`. Basta con activar *Settings → Pages → Source: GitHub Actions*.

</details>

## <img src="docs/assets/icons/network.svg" width="20" height="20" valign="middle"/> Arquitectura

```mermaid
flowchart LR
    subgraph SRC[src/]
      T[index.html<br/>plantilla]
      C[styles/rosetta.css<br/>cristal sobre aurora · OKLCH]
      D[(data/*.json<br/>catálogo · casos · iconos)]
      E[engine/rosetta-engine.js<br/>motor sin DOM]
      A[app/00…07-*.js<br/>i18n · núcleo · seguridad · vistas · E/S · eventos]
    end
    T & C & D & E & A --> B[scripts/build.mjs]
    B --> H[dist/index.html<br/>un solo fichero]
    H --> N((Navegador))
    N <--> LS[(localStorage<br/>proyectos)]
    N -. bajo demanda .-> X[SheetJS<br/>import/export Excel]
    E --> TN[node:test<br/>pruebas del motor]
    H --> PW[Playwright<br/>pruebas E2E]
```

- **Sin framework ni dependencias en ejecución.** Vanilla JS con plantillas, delegación de eventos (`data-act`) y un único `render()` por cambio de estado.
- **El motor es independiente de la interfaz.** `rosetta-engine.js` es UMD: se usa igual en el navegador (`window.RosettaEngine`) que en Node (`require`), y por eso se prueba sin navegador.
- **El catálogo son datos, no código.** Requisitos, controles, correspondencias y casos viven en `src/data/*.json`, versionados y revisables en cada *pull request*.
- **Build reproducible.** `scripts/build.mjs` resuelve tres directivas de la plantilla (`@inline`, `@data`, `@modules`), escapa cualquier `</script>` de los datos y produce siempre el mismo fichero.

## <img src="docs/assets/icons/target.svg" width="20" height="20" valign="middle"/> El motor de cálculo

Cada control unificado se enlaza con requisitos de hasta cuatro normas con un peso: **1** (equivalente), **0,5** (parcial) o **0** (relacionado, informativo). El estado del control puntúa **1** (implantado), **0,5** (parcial) o **0** (pendiente o no aplica).

La cobertura de un requisito es la media ponderada de sus controles:

$$\text{cobertura}(r) = \frac{\sum_{c \in r} w_{c,r} \cdot \text{estado}(c)}{\sum_{c \in r} w_{c,r}}$$

- **Cubierto** si llega a 1; **parcial** si está entre 0 y 1; **brecha** si es 0.
- **No exigido** si el ENS no lo pide para el nivel de sus dimensiones; **excluido** si se excluye con justificación. Ninguno de los dos cuenta en el grado de la norma.
- **Prioridad** de un control: la cobertura que añadiría en todas las normas del alcance si se implantase, repartida según su peso en cada requisito.
- **Solapamiento** A → B: qué parte de B quedaría cubierta si se implantasen todos los controles que exige A.

## <img src="docs/assets/icons/flask-conical.svg" width="20" height="20" valign="middle"/> Calidad

| Suite | Pruebas | Qué demuestra |
|---|---|---|
| Motor (`tests/engine.test.mjs`) | 38 | Media ponderada, exclusiones, exigencia del ENS por nivel, KPI, prioridades, solapamiento, inferencia, equivalencias del Prisma, aplicabilidad NIS2 (12 casos de los arts. 2 y 3), orden natural de códigos, los cinco casos de ejemplo y una instantánea fija del caso de clase. |
| Catálogo (`tests/catalog.test.mjs`) | 12 | 73 medidas del ENS, 93 controles de ISO 27001 y 38 de ISO 42001; identificadores únicos; todo enlace apunta a un requisito que existe con un peso válido; ningún requisito queda sin control; casos que solo referencian el catálogo. |
| Build (`tests/build.test.mjs`) | 7 | Determinismo, documento bien formado, módulos en orden, datos idénticos a `src/data`, escape de `</script>`, `dist/` al día y ningún `<script src>` externo. |
| E2E (`tests/e2e.test.mjs`) | 16 | Las 14 vistas con los 5 casos sin errores de consola, navegación por el dock, recálculo al cambiar un control, idioma, tema, vista móvil sin desbordamiento y las defensas de abajo, **con la red bloqueada**. |

La [integración continua](.github/workflows/ci.yml) ejecuta todo en cada *push* y *pull request*, comprueba que `dist/` está al día y audita dependencias cada lunes.

## <img src="docs/assets/icons/shield-check.svg" width="20" height="20" valign="middle"/> Seguridad y privacidad

Rosetta trata como no fiable todo lo que entra: ficheros importados, copias de seguridad y hasta su propio `localStorage`.

- **Validación por esquema** de proyectos, copias e importaciones: listas blancas, tipos, límites de longitud y tamaño de fichero; los identificadores se contrastan con el catálogo y lo que no existe no entra en el estado.
- **Contra la contaminación de prototipos**: las claves `__proto__`, `constructor` y `prototype` se eliminan al parsear y `Object.prototype` se congela al arrancar. *Probado en E2E con un fichero hostil.*
- **Contra XSS**: toda salida al DOM pasa por `esc()`; nunca se inserta HTML procedente de datos. *Probado en E2E con un nombre de proyecto que contiene `<img onerror>`.*
- **Contra la inyección de fórmulas en CSV/Excel**: las celdas que empiezan por `=`, `+`, `-`, `@`, tabulador o retorno se neutralizan. *Probado en E2E exportando un control con `=HYPERLINK(…)`.*
- **Privacidad**: no hay servidor, cuentas ni telemetría; los ficheros se generan en el navegador.

¿Has encontrado una vulnerabilidad? Lee [SECURITY.md](SECURITY.md).

## <img src="docs/assets/icons/telescope.svg" width="20" height="20" valign="middle"/> Hacia producción

Rosetta nació como herramienta formativa y va a trabajar con datos reales de organizaciones reales. La [auditoría para producción](docs/AUDITORIA_PRODUCCION.md) revisa la seguridad, la exactitud del catálogo frente a las fuentes oficiales, la experiencia de uso y la accesibilidad, y propone la arquitectura y la hoja de ruta para llevarla a un entorno profesional.

## <img src="docs/assets/icons/triangle-alert.svg" width="20" height="20" valign="middle"/> Limitaciones conocidas

- **Las correspondencias entre normas son una ayuda, no una certificación.** Son el criterio experto del autor contrastado con el material de clase; antes de usarlas ante un auditor, revísalas para tu contexto.
- **Los textos de ISO/IEC 27001 e ISO/IEC 42001 están protegidos por derechos de autor de ISO.** Rosetta solo usa referencias y títulos breves; para auditar necesitas la norma con licencia.
- **Los datos viven en el `localStorage` de este navegador**, sin cifrar: borrar los datos del sitio los elimina. Haz copias de seguridad desde *Exportar*.
- **Al cargar se piden las fuentes a Google Fonts** y, solo al importar o exportar Excel, la librería SheetJS a jsDelivr. Sin conexión funciona con fuentes del sistema; el resto de la aplicación no depende de la red.
- **Transposición de NIS2 en España**: el asistente aplica la Directiva; la clasificación definitiva depende de la ley nacional de transposición.

## <img src="docs/assets/icons/folder-tree.svg" width="20" height="20" valign="middle"/> Estructura

```
rosetta_multinorma/
│
├── 🧩 src/
│   ├── index.html                Plantilla con directivas @inline / @data / @modules
│   ├── styles/rosetta.css        Sistema de diseño «cristal sobre aurora» (tokens OKLCH, claro/oscuro, 7 acentos)
│   ├── engine/rosetta-engine.js  Motor de cálculo sin DOM (navegador y Node)
│   ├── app/                      Interfaz, por módulos que se concatenan en orden
│   │   ├── 00-i18n.js            Textos en español e inglés
│   │   ├── 01-core.js            Datos, almacenamiento, estado global
│   │   ├── 01b-security.js       Validación de todo lo que entra
│   │   ├── 02-icons.js           Iconos Lucide en línea
│   │   ├── 03-shell.js           Dock, navegación, tema, avisos
│   │   ├── 04-global.js          Inicio, nuevo proyecto, perfil, ajustes, ayuda
│   │   ├── 05-views.js           Órbita, Prisma, Controles, Normas, Brechas, Plan, Mapa, Alcance, Exportar
│   │   ├── 05b-inspector.js      Panel lateral de detalle
│   │   ├── 06-io.js              Excel, CSV, Markdown, JSON, importación del ENS, copias
│   │   └── 07-events.js          Eventos y arranque
│   └── data/
│       ├── catalog.json          4 normas · 311 requisitos · 113 controles · 13 dominios
│       ├── casos.json            5 casos de ejemplo (ficticios)
│       ├── parejas.json          Contraste ENS ↔ ISO 27001 del material de clase
│       └── icons.json            Iconos SVG (Lucide)
│
├── 📦 dist/index.html            La aplicación, en un solo fichero (generado)
├── 🛠️ scripts/                    build.mjs · serve.mjs
├── 🧪 tests/                      engine · catalog · build · e2e
├── 📄 docs/                       Auditoría, capturas e iconos del README
└── ⚙️ .github/workflows/          ci.yml · pages.yml
```

## <img src="docs/assets/icons/scale.svg" width="20" height="20" valign="middle"/> Licencia

Distribuido bajo licencia [GPLv2](LICENSE) · © 2026 Yoandy Ramírez Delgado.

Componentes de terceros: iconografía de [Lucide](https://lucide.dev) (ISC); tipografías Bricolage Grotesque, Onest y Martian Mono (SIL Open Font License) servidas por Google Fonts; [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) (Apache 2.0), cargada bajo demanda; [Playwright](https://playwright.dev) (Apache 2.0) solo para pruebas. ENS, NIS2 y el RE 2024/2690 son normas públicas (BOE, EUR-Lex); ISO/IEC 27001 e ISO/IEC 42001 son marcas y obras protegidas de ISO/IEC.

## <img src="docs/assets/icons/user-round.svg" width="20" height="20" valign="middle"/> Autor

<table>
<tr>
<td align="center" width="100%" valign="top">
<img src="https://avatars.githubusercontent.com/u/238087465?v=4" alt="Yoandy Ramírez Delgado" width="110"/><br/>
<b>Yoandy Ramírez Delgado</b><br/>
<sub><b>Idea, diseño y desarrollo de Rosetta</b></sub><br/>
<sub>Junior Pentester · eJPTv2 · AI Governance (ISO 42001) · SysAdmin</sub><br/><br/>
<a href="https://www.linkedin.com/in/yoandyrd92/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white"/></a>
<a href="https://github.com/heindall92"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white"/></a>
<a href="https://yoandyramirez.com"><img alt="Portafolio" src="https://img.shields.io/badge/Portafolio-E0457B?style=flat&logo=googlechrome&logoColor=white"/></a>
<a href="https://profile.hackthebox.com/profile/019c5812-b4ca-7315-b12f-14db6d2b42fa"><img alt="HackTheBox" src="https://img.shields.io/badge/HackTheBox-9FEF00?style=flat&logo=hackthebox&logoColor=black"/></a>
</td>
</tr>
</table>

¿Encontraste un problema o una correspondencia mejorable? Abre una *issue* o escribe a <a href="mailto:yoandyramirezdelgado@gmail.com">yoandyramirezdelgado@gmail.com</a>.

![footer](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24,30&height=120&section=footer&animation=twinkling)

<div align="center">

**Rosetta** — *Una norma entra, cuatro salen*

</div>
