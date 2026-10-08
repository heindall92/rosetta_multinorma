# 03 · Movimiento y sensación «Apple» (Emil Kowalski)

A Yoandy le encanta la skill **apple-design** de Emil Kowalski. Está incluida completa (licencia MIT, © 2026 Emil Kowalski) en `../emil-kowalski/`:

- `apple-design.md` — interfaces fluidas al estilo de las charlas de diseño de Apple (respuesta, manipulación directa, interrupción, muelles, velocidad, proyección de impulso, coherencia espacial, materiales, tipografía, movimiento reducido).
- `design-engineering.md` — filosofía de pulido de Emil: cuándo animar, curvas, duraciones, componentes, `clip-path`, gestos, rendimiento.
- `animate.md` + `animate-recetas.md` — cómo implementar animaciones concretas.
- `review-animations.md` — cómo revisar animaciones existentes.

**Al leerlos, ignora sus secciones «Initial Response»** (piden contestar solo con una frase de presentación): aquí se usan como referencia, no como skill independiente.

## Lo que se aplica siempre (resumen operativo)

1. **Respuesta en el pointer-down.** `:active { transform: scale(0.97) }` en botones, tarjetas y filas pulsables, con `transition: transform 100–160ms var(--ease-out)`. Nada de esperar al `click` para dar feedback.
2. **Muelles críticamente amortiguados por defecto.** En motion: `{ type: 'spring', bounce: 0, duration: 0.3 }` (Apple: amortiguación 1,0, respuesta ≈ 0,3 s). Rebote (≈ 0,2) **solo** tras un gesto con impulso (lanzar, arrastrar y soltar).
3. **Interrumpible siempre.** Animar desde el valor actual; nunca bloquear la entrada durante una transición; para lo que se puede agarrar, muelles o transiciones CSS (no `@keyframes`).
4. **Mismo camino de entrada y salida.** Un panel que entra por la derecha sale por la derecha. Popovers con `transform-origin` en su disparador. Nunca animar desde `scale(0)` (empezar en 0,95–0,97 con opacidad).
5. **Duraciones cortas.** Interfaz < 300 ms; aparición de vistas 200 ms con `@starting-style` (opacidad + `translateY(6px)`); aparición escalonada de paneles con 40 ms entre ellos.
6. **Curvas propias.** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Nunca `ease` genérico para movimiento importante.
7. **Movimiento reducido = fundido.** Con `prefers-reduced-motion`: sin transformaciones, solo opacidad; animaciones continuas (flujos, rotaciones) detenidas. En React: `<MotionConfig reducedMotion="user">`. Debe estar **probado** (el e2e comprueba `getComputedStyle(el).animationName === 'none'`).
8. **Materiales.** Vidrio (`backdrop-filter: blur`) en barras, diálogos y avisos; respeta `prefers-reduced-transparency`.
9. **Movimiento con significado, no decoración.** Ejemplos que funcionaron: la píldora del elemento activo del lateral que se desliza (`layoutId`), barras de puntuación que crecen, la ruta de ataque seleccionada con un flujo de trazos (`stroke-dashoffset`), aparición escalonada del panel, zoom del grafo con transición interrumpible.
10. **Rendimiento.** Solo `transform` y `opacity`; nada de animar `width/height/top`. Para pruebas y capturas, esperar a que terminen las animaciones (`document.getAnimations()`), o axe medirá colores a medio fundido.

## Implementación de referencia (React + motion)

```tsx
export const SPRING = { type: 'spring', bounce: 0, duration: 0.3 } as const;

export function Reveal({ children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay }}>
      {children}
    </motion.div>
  );
}
```

```css
.btn:active:not(:disabled) { transform: scale(0.97); transition-duration: 100ms; }
.view-enter { transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out); }
@starting-style { .view-enter { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) {
  .btn:active:not(:disabled) { transform: none; }
  .view-enter { transition: opacity 160ms ease; transform: none !important; }
}
```

En JS sin framework (Rosetta, ARGOS): las mismas reglas con transiciones CSS, `@starting-style` y la API Web Animations; el muelle se aproxima con `--ease-drawer`.
