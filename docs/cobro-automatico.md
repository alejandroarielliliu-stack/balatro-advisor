# Premio y cobro automático — 2026-10-12

El premio base de ciega se calcula con `blindRequirement`, compartido con H2; se actualiza con ante/ciega/jefe/baraja. Un valor importado distinto o desconocido se conserva en modo manual. Las sugerencias guardadas usan `confirmedPreset`, sin etiquetarlas como observaciones.

«Cobro de ronda · automático» evalúa los escenarios explícitos de la Mesa con `evaluateRoundPlan`: solo concede ingresos cuando el plan gana. Muestra premio, manos sobrantes, descartes de Verde, Golden Joker, intereses, total y saldo proyectado. No suma ingresos al saldo registrado. El cobro depende de los recursos que realmente consume cada plan; no se supone una victoria ni una cantidad de manos sobrantes. Las compras hipotéticas siguen calculando su propio cobro mediante el mismo motor.

## Vales integrados y evidencia L05

Se admiten `v_seed_money` y `v_money_tree` en la lista de vales existente, sin cambiar el esquema del guardado. Money Tree requiere Seed Money y no se admiten duplicados. El formulario distingue Ninguno, Seed Money y ambos. Otros vales, consumibles, tags y modificadores siguen rechazados.

Inspección estática del ZIP dentro de `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`, build identificada previamente como 1.0.1o-FULL:

- `game.lua`: interés base con `interest_cap = 25`; Seed Money `extra = 50`; Money Tree `extra = 100`, requiere `v_seed_money`.
- `card.lua`: al aplicar Seed Money o Money Tree, asigna `G.GAME.interest_cap = center_table.extra`.
- `functions/state_events.lua`: interés `interest_amount * min(floor(dollars/5), interest_cap/5)`, condicionado a que no esté desactivado.

Por ello los topes de ingreso son $5, $10 y $20. No se aplican intereses a Verde. `vouchers.interest` es provisional, con evidencia L05; modo estricto sigue requiriendo observación de juego. Esta inspección no es una prueba jugada ni valida efectos económicos de otros comodines.

## Corrección manual y límites

El premio base puede corregirse para conservar el dato real. Si difiere del modelo, H2 limita el cobro con `reward_mismatch`, sin alterar la puntuación de las manos.

«Corregir total por cartas u otros efectos» muestra un total manual **de referencia de la sesión**. No modifica el estado, no se guarda como ingreso observado y no sustituye los cálculos económicos del asesor: faltan modelar los efectos de cartas en mano y su momento de activación. La interfaz lo indica al lado de la corrección. No se debe introducir el total de ronda en el campo de premio base, pues duplicaría manos/Golden/intereses.

## Pruebas

- `npm run check`: 220 aprobadas, 10 TODO previos, sin fallos. Oráculos literales para topes y cobro: $101 + premio $4 + 3 manos $3 + Golden $4 + intereses $20 = saldo $132. Verde: premio $4 + 3 manos $6 + 3 descartes $3 + Golden $4 = $17, sin intereses.
- `npm run test:cashout`: premio automático, cobro en vivo $17/$22/$32 al variar vales con cuatro manos sobrantes, corrección manual, guardado/recarga de vales y conservación del saldo $101.
- Regresión web: 17 grupos; diseño aprobado. Capturas de escritorio y móvil emulado en `docs/evidencia/auto-cashout/`.


Actualización: la selección de Seed Money / Money Tree se realiza ahora en [Tus vales](vales.md), debajo de Candidatos. El selector anterior de interés se retiró.
