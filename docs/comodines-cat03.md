# CAT03 — contexto, copias y contadores

Entrega parcial de la solicitud de integrar los 150. Se añadieron **41 comodines** a los 41 anteriores: **82 compatibles dentro del alcance actual**, con **68 pendientes** enumerados en [la matriz de continuación](cobertura-comodines-pendientes.md). No se declara completada la solicitud.

## Efectos integrados

| Familia | Comodines |
|---|---|
| Mano retenida | Mime, Raised Fist, Baron, Shoot the Moon, Blackboard |
| Repeticiones y efectos por carta | Dusk, Hack, Photograph, Sock and Buskin, Hanging Chad, Triboulet, Pareidolia |
| Contexto y copias | Joker Stencil, Blue Joker, Acrobat, Blueprint, Brainstorm |
| Recursos persistentes | Juggler, Drunkard, Troubadour, Merry Andy, Stuntman |
| Crecimiento | Runner, Square Joker, Spare Trousers, Ride the Bus, Wee Joker |
| Desgaste y descartes | Ice Cream, Popcorn, Seltzer, Ramen, Hit the Road, Yorick |
| Clasificación | Four Fingers, Shortcut, Smeared Joker |
| Composición del mazo | Steel Joker, Driver’s License |
| Cobro | Cloud 9, To the Moon, Delayed Gratification |

El mazo admite ahora cartas base y **Acero**, editable desde «Mazo actual». Otras mejoras, sellos y ediciones siguen fuera de cobertura. Driver’s License puede evaluarse con Acero; una composición con mejoras aún no soportadas se rechaza, no se cuenta como base. No se han implementado cotas conservadoras para CAT03: la cota se abstiene y el comparador utiliza escenarios explícitos.

## Contratos y orden

- `HandInput` admite `heldCardIds`, `remainingCardIds` y `handsRemaining` después de jugar. El escenario de ronda proporciona estos datos antes de robar. Una consulta directa sin contexto necesario se abstiene. `[]` significa vacío explícito, no desconocido. Se valida pertenencia, exclusión de cartas jugadas, duplicados, solapamiento y tamaño de mano.
- Clasificación aplica las reglas pasivas de los comodines físicos. Four Fingers utiliza subconjuntos; Straight Flush une cartas de escalera y color según el código del juego. Smeared afecta también los efectos de palo y las condiciones de Flower Pot/Seeing Double.
- Crecimiento antes de puntuar → cartas puntuadas y repeticiones → efectos retenidos y repeticiones de Mime → efectos principales en orden → Plasma, si corresponde → producto y suelo final. Se conserva Mult fraccionario; ya no se exige que cada factor sea entero.
- Blueprint/Brainstorm resuelven cadenas sin recursión infinita. No copian pasivos incompatibles. Usan el contador del objetivo sin duplicar su crecimiento ni añadir comodines físicos. Ciclos y posiciones sin objetivo aportan cero efecto.
- Ice Cream/Seltzer se consumen después de puntuar. Ramen, Yorick y Hit the Road se actualizan por carta descartada; Green conserva su cambio por acción. Popcorn decae al terminar una ronda ganada y Hit the Road vuelve a ×1.
- Los cambios de recursos al comprar/vender se aplican en H2; la selección manual también actualiza sus campos. Un escenario de ocho cartas no se adapta automáticamente al comprar Juggler: se comunica la incompatibilidad.

## Persistencia e interfaz

El esquema sigue siendo `0.1`. Los contadores usan el registro existente de hechos conocidos/desconocidos. `x100` guarda centésimas enteras de XMult: `150` representa ×1,5. La interfaz lo indica en la etiqueta. Ramen empieza en 200, Hit the Road/Yorick en 100; el contador restante de Yorick empieza en 23 al comprarlo. Esos valores solo se inicializan en una compra modelada; al añadir un comodín ya poseído se solicita su contador observado.

Las consultas devuelven `countersAfter` sin cambiar la entrada. H2 aplica esos cambios exclusivamente a la ronda proyectada. El estado real registrado conserva la separación de T09b; guardar una transcripción no copia los resultados de candidatos. El campo económico opcional `otherJokerIncome` separa Cloud 9/Delayed Gratification de Golden y de los intereses.

## Evidencia L07

Inspección del ejecutable instalado de Steam, `version.jkr = 1.0.1o-FULL`, 2026-10-12:

- `card.lua`, `Card:calculate_joker`: condiciones y fases `before`, `individual`, `repetition`, `joker_main`, `discard`, `after`, `end_of_round`; requisitos de Blueprint.
- `Card:add_to_deck`/`remove_from_deck`: recursos, incluyendo los campos genéricos `h_size`/`d_size` y las ramas Troubadour/Stuntman/To the Moon.
- `Card:calculate_dollar_bonus`: Cloud 9 y Delayed Gratification.
- `functions/misc_functions.lua`: `evaluate_poker_hand`, `get_straight`, `get_flush` y unión de Straight Flush.
- `functions/state_events.lua`: contexto retenido, orden y `math.floor(hand_chips*mult)` al acreditar puntos.
- `game.lua`: parámetros iniciales y precios; los datos y el atlas ya importados mantienen su procedencia.

Las reglas siguen **provisionales por inspección estática**, no observadas en una partida. L07 acompaña las evaluaciones y el modo estricto conserva su abstención.

## Oráculos y pruebas

Derivaciones independientes del código del asesor, aplicando las ramas anteriores:

- Pareja de ochos y Hanging Chad: `(10 + 8×3 + 8) × 2 = 84`.
- Pareja de reyes, Photograph + Hanging Chad: `(10 + 10×3 + 10) × (2×2³) = 800`.
- Pareja de ochos, rey de Acero retenido, Mime + Baron: `suelo(26 × 2 × 1,5⁴) = 263`; Mult intermedio 10,125.
- Pareja de doses, Wee + Hack: `(10 + 2×4 + 8×4) × 2 = 100`. Blueprint + Wee sin Hack: `(10 + 4 + 16 + 16) × 2 = 92`; el crecimiento no se duplica.
- Four Fingers con `2H 3H 4H 9H 5C`: escalera de color por unión de subconjuntos, `(100+23)×8=984`.
- Cloud 9 + Delayed Gratification + To the Moon, mazo estándar, saldo $30, Big Blind, cuatro manos y tres descartes restantes: `$4+$6+$4+$4+$10=$28`.

`tests/context-jokers.test.ts` y `tests/counter-jokers.test.ts` cubren cálculos literales, orden, copias, crecimiento, consumo, fracciones, entradas desconocidas/ilegales e inmutabilidad. `tools/context-jokers-test.mjs` comprueba selección, contadores, Acero, cambios de recursos, guardado/recarga y ancho móvil. Los antiguos casos de rechazo usan Perkeo, que sigue pendiente, en lugar de Blueprint/Mime que ahora se calculan.
