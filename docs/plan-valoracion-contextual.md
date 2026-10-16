# VC01 — valoración contextual 0–10

**Corrección de contexto:** la baraja inicial es una dependencia previa de la valoración. [DECK01](evidencia/barajas-l03.md) habilita Azul/Roja/Amarilla con recursos propios; las restantes barajas requieren DECK02 antes de emitir notas. Nunca aplicar el modelo Azul por omisión a una run distinta.

2026-10-11. Plan ajustado a la aclaración del usuario: una nota contextual de 0 a 10, no la escala −2…+2 propuesta inicialmente. Primera entrega VC01a implementada; VC01b–d pendientes.

## Rúbrica explícita

Cinco ejes de 0 a 2, con la misma ponderación como decisión de diseño inicial, **no calibrada con partidas ni validada empíricamente**. Se suman grados de una rúbrica, nunca dólares, fichas y contadores. Dos cantidades muy diferentes pueden recibir el mismo grado; la nota resume direcciones de cambio, no la magnitud exacta del beneficio. No se usa como nuevo algoritmo de ordenación: el asesor conserva la prioridad de supervivencia y sus abstenciones.

| Eje | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Objetivo | No supera el plan ni mejora margen frente a conservar | Mejora margen sin superar la ciega | Supera la ciega del escenario |
| Recursos | Usa más manos/descartes, sin mejora en la otra dimensión | Igualdad o intercambio entre ambas | Usa menos sin empeorar la otra |
| Economía | Deja menos dinero, sin mejora en otra dimensión comparable | Igualdad o intercambio entre saldos | Deja más sin empeorar otro saldo comparable |
| Activación | No se identifican efectos positivos compatibles | No se utiliza este grado | Hay trazas positivas o ingreso Golden calculado |
| Continuidad | Pierde beneficios persistentes demostrados | Sin beneficios nuevos demostrados | Añade beneficios sin perder los existentes |

La referencia económica es conservar: saldo tras tienda, y también cobro cuando ambas ramas vencen y no han terminado la partida en su objetivo. Si ambas vencen y falta un cobro necesario, no se emite nota. Si una no vence, no se equipara su cobro inexistente con el de una ronda ganada. Las manos/descartes se comparan como consumos del plan, no como estimación de robos.

Activación corresponde a la **construcción resultante completa**, no atribuye todos los efectos a la carta nueva. Continuidad reutiliza exclusivamente `green-applied` y `golden-income` de H3; no cuenta un contador grande como crecimiento útil, no valora todos los beneficios futuros y no distingue magnitudes diferentes del mismo beneficio. Los rasgos de mazo de la biblioteca SYN01 todavía no intervienen.

## Presentación y límites

- Nota por alternativa y escenario, con revisión de entrada y desglose. Un intervalo mínimo–máximo conserva sensibilidad entre escenarios; no hay promedios ni probabilidades implícitas. Un escenario incompleto impide una nota global.
- Ilegalidad, falta de referencia, saldo o soporte producen **Sin evaluar**, nunca un cero ficticio.
- Puntos reales separados de la rúbrica. La diferencia se presenta solo con igual número de manos y descartes; en caso contrario se conservan los totales independientes. La comparación sigue siendo entre planes fijos, no entre estrategias adaptadas.
- Los empates de H3 no se rompen usando estas notas. Una nota mayor **no anula** la prioridad de superar más escenarios ni significa mayor probabilidad de victoria. Tampoco afirma una nota universal para un comodín.
- No se modifican el estado real, el guardado, las reglas ni la política estratégica. Editar datos invalida el análisis como antes.

## Entregas y dependencias reales

1. **VC01a entregado:** módulo `src/advisor/ratings.ts`, UI de comparación, razones por eje y diferencias. Usa las alternativas legales y ocho comodines de H2; varios comparten nota si satisfacen la misma rúbrica. Pruebas de fixtures documentales, inmutabilidad e integración web. No equivale a calificar los 150 efectos.
2. **VC01b pendiente:** ampliar H2 con Acero/Mimo/Barón y sellos, cartas modificadas, orden y repeticiones. Fixtures independientes, negativos y evidencia. Depende de SYN02; reglas pendientes solo bloquean lo afectado.
3. **VC01c pendiente:** condiciones ejecutables del mazo real; distinguir contar Acero en el mazo, tenerlo retenido y poder robarlo. Mostrar potencial y activación demostrada separadamente. No convertir las fichas textuales en detección automática sin implementar sus condiciones.
4. **VC01d pendiente:** notas contextuales directamente en el selector de ofertas, con revisión, precios y reemplazos. Ampliar por lotes; el catálogo general no tendrá notas fijas. Cartas y sobres requieren sus propias acciones legales y evaluación de incertidumbre, aún no implementadas.

## Comprobación

`npm run check`: 154 aprobadas, cero fallos y 10 TODO de observación existentes. Cinco pruebas nuevas verifican la rúbrica con fixtures independientes de sus resultados, saldos desconocidos, ilegalidad, intervalos y separación del estado. No son pruebas de eficacia estratégica ni de nuevas reglas de Balatro.

`npm run test:design`: desglose visible, 5 anchos, 200 % de ampliación y confirmación real sin que consultar escriba. `npm run test:web`: regresión de 17 grupos. La evidencia visual queda en `docs/evidencia/redesign/`. La entrega posterior debe evaluar si esta rúbrica resulta útil antes de incorporarla a decisiones automáticas.
