# Investigación del criterio estratégico rápido

Consulta: 2026-10-13. Objetivo del producto: llegar al jefe del ante 8, Steam 1.0.1o-FULL sin mods, dificultad Blanca dentro de las barajas compatibles. Esta investigación aporta **heurísticas**, no reglas nuevas del motor, probabilidades de victoria, calibración de una nota ni comprobaciones observadas en el juego.

## Fuentes originales consultadas

| ID | Fuente y alcance | Información aprovechable | Límite |
| --- | --- | --- | --- |
| META01 | [Balatro Basics 2 — Balatro University](https://www.youtube.com/watch?v=i_Wr7giQFKI), 2024-03-20, versión 1.0.0n | La descripción del autor presenta economía, prioridades de compra y adaptación a lo que ofrece la partida como temas centrales de los antes iniciales e intermedios. | Se consultó la descripción indexada, no una transcripción completa. Versión anterior: no usar para valores de efectos actuales. |
| META02 | [Balatro has a MASSIVE balance problem — Balatro University](https://www.youtube.com/watch?v=pA_DiPpJkX8), 2026-01-22, versión 1.0.1o | El autor identifica las parejas como elección habitual para rachas de victorias en Gold. Sirve para distinguir el meta de dificultad alta de una simple búsqueda de manos de mayor rango. | Solo título y descripción disponibles. No demuestra que parejas sea siempre la mejor opción en Blanca ni en cada baraja. No se extrajeron tasas de victoria. |
| META03 | [A New Player’s Primer to Balatro — charles leshrac](https://steamcommunity.com/sharedfiles/filedetails/?id=3166946815), actualizado 2024-03-11 | Explica coste de oportunidad: ahorrar puede perjudicar supervivencia; un comodín económico ocupa un espacio vendible; crecer requiere tiempo, acciones y a veces dinero. Advierte que una Daga nueva en ante 8 puede aportar poco sin algo que consumir. Recomienda mirar el jefe conocido y los rasgos que activan los comodines. | Varias descripciones quedaron antiguas: Hiker +4 y Swashbuckler limitado a izquierda, entre otras. Importar el razonamiento general, nunca estos efectos. La afirmación de que toda modificación de cartas carece de coste adicional también necesita matices. |
| META04 | [Intermediate Players’ Guide to Balatro — DaemonXI](https://steamcommunity.com/sharedfiles/filedetails/?id=3171311533), actualizado 2024-03-02 | Propone mirar puntuaciones y cobros recientes para detectar necesidades; ahorrar cuando las rondas se superan con pocos recursos; sustituir comodines que ya no cumplen su función; mejorar manos realmente utilizadas. | Consejos demasiado absolutos: destruir todos los rangos bajos perjudica Wee/Fibonacci/Hack; “toda run necesita chips, +Mult, XMult, planetas y tarot” no es una condición necesaria. La puntuación reciente es referencia contextual, no garantía ante otro jefe. |
| META05 | [A Guide to Scaling — Grgapm_](https://www.reddit.com/r/balatro/comments/1cjyigp/a_guide_to_scaling/), 2024 | Razona el valor relativo de aportes aditivos y multiplicativos, su orden y el rendimiento decreciente de acumular un solo tipo de aporte. Distingue sumar Mult antes o después de Acero/Fotografía. El crecimiento necesita activaciones, no basta con la palabra “escalable”. | Sus umbrales de puntuación incluyen Purple+. No trasladarlos a Blanca. Tampoco imponer sus fases por ante como orden universal: la construcción y los niveles pueden cambiar el valor de cada aporte. |
| META06 | [Gold Stake tier lists on everything after 2000+ Hours and 55 Gold Streak — SyndromedGD](https://www.reddit.com/r/balatro/comments/1u5asrc/gold_stake_tier_lists_on_everything_after_2000/), 2026 | El propio autor advierte que las listas pierden matices. Sus respuestas diferencian efecto inmediato, mano de preparación, vulnerabilidad ante jefes, recursos para crecer y restricciones de espacios. Ejemplo: Card Sharp exige una mano previa del mismo tipo; Erosión no sirve para estabilizar si falta reducción del mazo. | Experiencia personal en Gold, sin modelo estadístico ni benchmark público que calibre una nota. Restricciones Eternal/Rental/Perishable no son las de Blanca. Sus cantidades de crecimiento por ronda son experiencias, no expectativas que el asesor pueda asignar automáticamente. |

Se localizó además [How to Beat Gold Stake: Overexplained Balatro — Roffle Lite con DrSpectred](https://www.youtube.com/watch?v=oqU1IvCW-XA), 2025-03-29. La descripción confirma una discusión conjunta de decisiones, pero no se consultó el contenido audiovisual completo; queda como referencia para revisión posterior, no como evidencia de detalles adicionales.

## Síntesis propuesta para el producto

Esta sección es una **propuesta de diseño** deducida del conjunto de fuentes. No es una política óptima demostrada.

1. **Valorar el rol que falta y lo que ya existe.** Separar fichas, +Mult, XMult, economía, repetición y utilidad. La ausencia de un comodín de fichas no demuestra ausencia de fichas: pueden venir de niveles, cartas y mejoras. La mera presencia de dos roles tampoco prueba que ambos se activen.
2. **Detectar sinergias como condiciones.** Mimo con Acero requiere cartas de Acero retenidas; Fotografía con Chad requiere que la primera carta que puntúa sea figura; Barón requiere reyes retenidos. No convertir la presencia de cartas elegibles en una probabilidad de robarlas o una activación demostrada. Un dato desconocido no equivale a cero.
3. **Distinguir aporte actual de inversión.** Conocer contador actual, acciones que lo aumentan, restricciones, coste y horizonte hasta ante 8. Ante temprano permite más oportunidades; no demuestra que estas se producirán. Una compra tardía de crecimiento puede ser útil si ya existe un habilitador inmediato, por ejemplo un Huevo desarrollado para Daga.
4. **Economía condicionada a utilidad y supervivencia.** Mostrar precio, venta y saldo reales por H2. El meta no autoriza afirmar que se sobrevive sin cartas, niveles, recursos y jefe. Tampoco rechazar automáticamente una compra porque baja de $25; supervivencia y habilitar la construcción pueden justificarla. Cualquier cálculo de interés continúa sujeto a la evidencia y modo del motor.
5. **Coste de espacio y de sustitución.** Mostrar qué rol, efecto, contador o ingreso se pierde; no suponer que un contador puede recuperarse. Considerar los efectos del orden y si la nueva carta necesita recursos que la construcción ya consume.
6. **Resultado rápido parcial.** Puede emitir “encaja”, “condicional”, “sin beneficio demostrado” o “faltan datos” con comodines, baraja, etapa y economía. Este modo puede identificar un combo entre comodines; no debe emitir una puntuación de mano inventada ni diagnosticar supervivencia.

## Datos mínimos y preguntas adaptativas

- Entrada básica: baraja inicial compatible, ante y ciega actual, dificultad, dinero, comodines en orden con edición y contador actual cuando exista, espacios y vales conocidos.
- Si el efecto depende de cartas: solicitar únicamente los rasgos relevantes, por ejemplo cantidad de Acero, reyes, figuras, doses, corazones o cartas de Suerte. Distinguir mazo inicial confirmado de mazo modificado o desconocido. El mazo inicial no se conserva automáticamente después de modificarlo.
- Si depende de una mano: mano habitual y nivel; una etiqueta “suelo jugar pareja” es intención/historial declarado, no consistencia probada.
- Si depende de historia: contador actual o acción relevante, por ejemplo tarot utilizados o ciegas saltadas. No solicitar toda la historia de la run cuando un contador basta.
- Para valorar riesgo inmediato: jefe próximo conocido y, opcionalmente, puntuación reciente contextualizada o escenarios exactos. Estos datos mejoran evidencia; no garantizan el resultado de la siguiente ronda.
- Para candidatos: precio real y sustitución elegida si no hay espacio. El precio base del catálogo debe quedar identificado como supuesto cuando no es el observado.

## Comprobaciones mínimas de la futura política

| Caso | Comportamiento comprobable |
| --- | --- |
| Mimo sin datos de Acero/reyes | Detectar dependencia; no afirmar combo activo ni cero cartas. |
| Fotografía + Chad con figuras posibles | Identificar condición de primera carta que puntúa; una partida con figuras no demuestra que siempre se cumpla. |
| Holograma inicial frente a Holograma ya desarrollado en ante 8 | No desvalorar el contador existente por la etapa; separar crecimiento nuevo de aporte actual. |
| Daga en ante 8 con Huevo desarrollado | Reconocer habilitador actual y sacrificio; no rechazar solo por ser tardío. |
| Bull/Bootstraps tras compra que consume dinero | Usar saldo después de comprar; expresar que comprar puede reducir su aporte. |
| Venta de comodín económico para XMult | Mostrar pérdida de ingresos frente a potencial de puntuación; no sumarlos en una cantidad sin unidad. |
| Baraja Plasma | No aplicar un ranking convencional de equilibrio fichas/Mult: necesita política específica compatible con su regla. |
| Solo comodines + ante | Permitir lectura parcial de roles/combos; bloquear puntuación exacta y garantía de superar la ciega. |

## Relación con trabajo existente

`docs/sinergias.md` ya define 32 relaciones con mecanismos, condiciones, riesgos y fuentes. Es una biblioteca de referencia; su texto no constituye por sí solo condiciones ejecutables. Reutilizar sus IDs y verificar cada predicado antes de llamarlo detector.

La rúbrica de `docs/plan-valoracion-contextual.md` dependía de escenarios de cartas explícitas y cinco ejes 0–2 sin calibración empírica. Una valoración rápida basada en meta no puede reutilizar esos números como si se hubieran validado para el nuevo modo. Mantener los cálculos de H2/H3 separados de estas heurísticas y explicar cuando ambas capas no permiten una decisión concluyente.
