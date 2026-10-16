# CAT04 · Siete comodines económicos

Motor compatible con Steam PC **1.0.1o-FULL**, sin mods. Las reglas siguientes están respaldadas por **inspección estática** del ejecutable local, y son provisionales hasta contrastarlas durante una partida. Regla: `jokers.economy`. No se usan pruebas aritméticas como evidencia de ejecución directa del juego.

Fuente: `C:\Program Files (x86)\Steam\steamapps\common\Balatro\Balatro.exe`, entradas ZIP `game.lua` y `card.lua`. SHA-256 de esas entradas: `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` y `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453`, respectivamente.

| Comodín | Regla y fuente | Caso mínimo / esperado independiente |
|---|---|---|
| Credit Card | `game.lua` 388: precio $1, crédito $20, Blueprint incompatible. `card.lua` 593–595 y 655–657: modifica el límite de deuda al adquirir o retirar el físico. | Con $0 y una Credit Card se admite comprar por $20, pero no $21. Blueprint no amplía crédito. Su venta base es $1. |
| Egg | `game.lua` 416: incremento $3, Blueprint incompatible. `card.lua` 2985–2992: aumenta `extra_value` y recalcula venta al finalizar ronda. | Venta $2 pasa a $5; una copia Blueprint no aumenta ese crecimiento. |
| Faceless Joker | `game.lua` 427; `card.lua` 2858–2872: $5 al descartar al menos tres figuras, una vez por descarte. Blueprint compatible. | Descartar K/Q/J produce $5; dos figuras producen cero. Blueprint añade otro pago de $5. Pareidolia cuenta cartas Stone como figuras; cartas debuff no cuentan. |
| Gift Card | `game.lua` 451: $1 y Blueprint incompatible. `card.lua` 2993–3011: incrementa la venta de todos los comodines y consumibles, incluido sí mismo. | Egg $2, Gift $3 y Tarot $1 pasan a $6, $4 y $2 al finalizar ronda, contando además el crecimiento propio de Egg. |
| Baseball Card | `game.lua` 465; `card.lua` 3397–3409: ×1,5 por cada comodín físico de rareza uncommon, aplicado en `other_joker`. | Un Rough Gem físico provoca ×1,5; Blueprint copiando Rough Gem sigue siendo rare y no provoca ese multiplicador por sí mismo. Blueprint copiando Baseball puede aportar otro ×1,5 sobre Rough Gem, total ×2,25. |
| Golden Ticket | `game.lua` 480; `card.lua` 3150–3160: $4 por cada activación de carta puntuada con mejora Gold. | Tres activaciones de la carta Gold dan $12; una carta base da cero. Esto no incluye el cobro independiente de Gold retenida al terminar ronda. |
| Rough Gem | `game.lua` 490; `card.lua` 3224–3236: $1 por cada activación de diamante puntuado. | Diamante da $1; Wild también; con Smeared, corazón también. Stone no tiene palo; una carta debuff no activa el efecto. |

`Card:set_cost`, `card.lua` 372–387: venta base `max(1,floor(cost/2))`, más `extra_value`. El mínimo $1 importa para Credit Card. Las ediciones y los cambios de precio requieren el precio compatible calculado por la tienda; estos módulos no inventan descuentos.

`functions/button_callbacks.lua` 56–63 permite la compra si el coste no supera `dollars - bankrupt_at`; el crédito no se añade al dinero del jugador ni produce intereses como saldo disponible. El módulo `creditLimit` expone capacidad de crédito físico para que las operaciones legales de H2 la usen.

`functions/state_events.lua` 101 ejecuta `end_of_round` antes de decidir `game_over`. Por eso Egg/Gift también actualizan su venta en una ronda perdida; no se condicionan a `won: true`. `card.lua` 2874–2888 excluye efectos de final de ronda copiados con Blueprint.

Orden de Baseball: `functions/state_events.lua` 917–935 evalúa `other_joker` después del efecto principal de cada comodín físico. La rareza corresponde a esa carta física, aunque su efecto principal sea una copia. La suma/venta Egg + Gift da el mismo resultado en ambos órdenes, pero se conserva el orden físico en el registro de cálculos.

`tests/economic-jokers.test.ts` comprueba estos oráculos literales, capacidad de crédito, incremento observado de venta, identidad/rareza física, fases, cartas Wild/Stone/debuff, consumibles desconocidos, crecimiento sin copias e independencia del estado original cuando el llamador suministra una copia. Estos resultados prueban comportamiento del módulo; **no son observaciones realizadas en Balatro**. El modo estricto conserva la exigencia de evidencia observada.
