# 07 · Lecciones aprendidas y lista de cierre

## Lecciones (cosas que salieron mal y no deben repetirse)

1. **Fórmula inventada en la ayuda.** La ayuda mostraba pesos 0,35/0,30/0,20/0,15 que no eran los del motor. Ahora la fórmula se **genera desde las constantes** y el e2e la comprueba. Regla: ningún número de la documentación escrito a mano si existe en el código.
2. **«No más círculos».** Se aplicó el radar circular de Rosetta a otra herramienta y Yoandy lo rechazó: cada herramienta necesita su visualización. Se sustituyó por franjas por activo y un flujo vertical del ciclo.
3. **Choque de color en claro.** Rojo/naranja/amarillo saturados junto al azul eléctrico chirriaban. Solución: rampa ocre → coral → carmesí, validada con `validate_palette.js`; el anillo KEV pasó a color tinta. Revisa siempre **claro y oscuro con el acento azul**.
4. **La demo envejecía.** Fechas fijas hacían que todo apareciera vencido. Se desplazan a hoy al cargar.
5. **Aviso fijo que tapaba la pantalla.** En móvil ocupaba un 20 %. Ahora se desplaza con el contenido.
6. **Controles duplicados.** Tema e idioma estaban en la barra superior y en el lateral. Cada control, una sola vez.
7. **Avatar «·»** cuando no había nombre. Ahora se muestra el icono `User`.
8. **Foco robado.** Un `onClose` en línea volvía a ejecutar el efecto del diálogo en cada render. Solución: guardarlo en una ref. Escape escucha en la ventana.
9. **axe no lo ve todo.** Un bloque de código con contraste 1,17:1 quedó como «incompleto». Se añadió un barrido propio de contraste.
10. **Inestabilidad del e2e.**
    - Carreras de foco: esperar a que el diálogo tenga el foco.
    - `wait_for_function` bloqueado por la CSP: sondear con `page.evaluate`.
    - Antes de cerrar, ejecutar la suite 3 veces seguidas.
11. **Lighthouse sin gzip** daba 64 en rendimiento (engañoso). Hay que servir como Pages, con gzip: da 97.
12. **`aria-selected` en botones** lo rechaza axe; usa `aria-current` o `aria-pressed`.
13. **Objetivos de 8 px** en marcas de gráfico: deben ser botones de 24 px con la marca en `::before`.
14. **Etiquetas truncadas en móvil** dentro del gráfico: pon la leyenda debajo.
15. **Cifras del README desfasadas**: recuéntalas en cada versión (la prueba de coherencia ayuda).
16. **Webs del ecosistema supuestas**: comprueba antes de enlazar.
17. **Tabla cortada en el móvil sin desplazamiento** (Movilización, «Riesgos principales»). Dos causas: la utilidad `table` de Tailwind 4 anula `hidden` (oculta un `div` envoltorio, nunca la `<table class="table">`), y un panel con `overflow-hidden` esconde el desbordamiento, así que «anchura de página ≤ 390» no lo ve. Toda tabla necesita tarjetas por debajo de 640 px o un envoltorio con `overflow-x-auto`, y el e2e comprueba en cada vista que ningún texto visible se sale de la pantalla.

## Lista de cierre (antes de decir «terminado»)

### Producto
- [ ] Hace lo pedido de punta a punta, con estado vacío, demo, error y carga.
- [ ] Español e inglés completos; sin restos de español en inglés.
- [ ] Claro y oscuro, siete acentos, 1440 y 390 px revisados **con capturas miradas**; en 390 px ninguna tabla ni texto recortado (comprobación e2e de recorte por vista).
- [ ] Barra lateral, barra superior (búsqueda, idioma, tema, ayuda), cabecera de página y centro de ayuda (guía, método, datos, atajos, glosario, acerca de con ecosistema y soporte).
- [ ] Movimiento: escala 0,97 al pulsar, muelles sin rebote, movimiento reducido = fundido (probado).
- [ ] Visualización propia de la herramienta, paleta validada en claro y oscuro.

### Calidad
- [ ] Pruebas unitarias, paridad (si aplica), API, e2e (3 ejecuciones seguidas) y axe con 0 infracciones.
- [ ] Lighthouse con gzip ≥ 95 en accesibilidad, buenas prácticas y SEO.
- [ ] Toda entrada saneada; CSP por hashes; sin peticiones externas.
- [ ] Prueba de mutación de cada comprobación nueva.

### Repositorio
- [ ] Versión subida en la única fuente; CHANGELOG, README (cifras reales, capturas, PDF), ROADMAP marcados.
- [ ] Avisos de independencia y propiedad intelectual correctos (sin texto ISO).
- [ ] Commits a nombre de Yoandy (`git log -1 --format='%an <%ae>'`), sin atribución a IA.
- [ ] Push a la rama correcta y **CI en verde** comprobada.

### Respuesta
- [ ] Resumen breve en español: qué cambió, qué se encontró (incluidos tus fallos), cifras de pruebas, enlaces y siguiente paso. Sin ofrecer «dejarlo para después».
