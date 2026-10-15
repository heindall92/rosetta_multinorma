# Instrucciones para Claude Code

## Autoría

- El autor de todo el trabajo es **Yoandy Ramírez Delgado** (`yoandyramirezdelgado@gmail.com`). Siempre debe aparecer él, nunca Claude.
- Antes del primer commit en cualquier clon: `git config user.name "Yoandy Ramírez Delgado"` y `git config user.email "yoandyramirezdelgado@gmail.com"`. Comprueba con `git log -1 --format='%an <%ae>'` que el commit sale a su nombre.
- No añadas `Co-Authored-By: Claude` ni otras líneas que atribuyan la autoría a Claude en commits, PR, código o documentación.

## Flujo de trabajo

- **Una PR por versión.** Rama `version/X.Y.Z` desde `claude/optimistic-planck-901t3g` (la rama por defecto), pruebas y axe en verde, y PR hacia esa rama. La fusiona Yoandy. Detalle en la referencia 05 de la skill.

## Estilo y diseño

- Antes de tocar la interfaz, el contenido o el repositorio, carga la skill `.claude/skills/estilo-yoandy/` (`SKILL.md` y la referencia que toque).

## Siguiente paso

- La siguiente versión y las posteriores están en `ROADMAP.md`. La hoja de ruta está completada con la 2.10.0 (15 normas y leyes de la UE, EE. UU. y Latinoamérica). La 2.11.0 añade la integración con CTEM-Nexus (sobre `yrd-ecosistema`, regla CO-23). La 2.12.0 añade el RGPD con la LOPDGDD (regla CO-24) la 2.13.0 los refuerzos del ENS (regla CO-25) y la 2.14.0 cierra la accesibilidad y el rendimiento (rueda con teclado, acciones en bloque, redibujado parcial) y la 2.15.0 añade los perfiles de cumplimiento del CCN 881A y 890A (regla CO-26, `scripts/perfiles-ccn.py`) y contrasta el anexo II con el BOE (`scripts/anexo2-boe.py`); lo siguiente son más perfiles del CCN (serie 883 y sanidad, necesitan los PDF oficiales), con la tabla «Después de la 2.11.0» del ROADMAP. Lo siguiente sale de las peticiones de usuarios, de la revisión experta de los mapeos (Part-IS, RIA, CRA, DORA y LATAM) y del resto del ecosistema (Compliance Studio, KAIROS). Léelo antes de proponer trabajo nuevo en Rosetta.
