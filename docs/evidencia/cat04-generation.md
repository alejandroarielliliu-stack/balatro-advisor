# CAT04 · Generación, transformaciones, consumibles y tienda

Compatible con **Steam PC 1.0.1o-FULL sin mods**. Regla `jokers.generation`, provisional: inspección estática del ejecutable instalado, realizada el 12 de octubre de 2026. **No se han observado estos casos en una partida real.** Los resultados de prueba se fijan a partir de la fuente Lua, antes de ejecutar las funciones TypeScript.

## Evidencia reproducible

Fuente local: `C:\Program Files (x86)\Steam\steamapps\common\Balatro\Balatro.exe`, abierto como ZIP con Python `zipfile`, sin ejecutar Lua ni modificar la instalación.

| Archivo | SHA-256 |
|---|---|
| `version.jkr` | `a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3` |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |
| `functions/button_callbacks.lua` | `c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101` |
| `functions/state_events.lua` | `6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9` |

`game.lua` define precios, rarezas, compatibilidad Blueprint y valores iniciales; `card.lua` contiene `Card:calculate_joker`, `Card:calculate_dollar_bonus`, `Card:set_cost`, `Card:add_to_deck`, `Card:remove_from_deck` y `Card:is_face`; `functions/common_events.lua` incluye `calculate_reroll_cost`; `functions/button_callbacks.lua` contiene `G.FUNCS.reroll_shop`; `functions/state_events.lua` restablece los rerolls gratis al empezar una ronda. Los metadatos de 53 consumibles se utilizan para validar identidades de resultados generados; sus efectos Tarot/Spectral no se implementan por esta ampliación.

## Reglas y casos mínimos

En todos estos casos la observación en el juego está **pendiente**. «Probado» significa que la implementación produce el resultado literal derivado de la fuente estática, sin usar su propia salida como expectativa. No equivale a validación directa en Balatro.

| Comodín | Regla contrastada en fuente | Caso mínimo y esperado, probado |
|---|---|---|
| Ceremonial Dagger | `setting_blind`, destruye derecha no Eternal; añade 2 × venta a Mult; `joker_main` aplica Mult | Derecha vale $7 → +14 Mult, eliminado, dinero conservado |
| Marble Joker | `setting_blind`, crea una carta Stone | Resultado explícito carta Stone base → +1 carta, ubicación mazo |
| DNA | `before`, primera mano de una carta → copia permanente en mano | Un 2 en primer play → 53 cartas y copia con ID nuevo retenida; segundo play no copia |
| Sixth Sense | `destroying_card`, primer play de un único 6; destruye aunque no haya espacio; genera Spectral solo con espacio | 6 → destruido después de puntuación; Spectral explícito con espacio, ninguno con inventario lleno |
| Hiker | `individual` en zona de juego, +5 perma_bonus por activación | Dos activaciones → +10 fichas permanentes; ninguna suma inmediata adicional del comodín |
| Riff-Raff | `setting_blind`, hasta dos comunes, según capacidad | Dos Joker con IDs distintos → ambos añadidos; lleno → ninguno; DNA rechazado por rareza |
| Vampire | `before`, cada scoring Enhanced no vampired → elimina mejora y +0,1 XMult; sin crecimiento por Blueprint | Steel puntuado → base, XMult 1 → 1,1 |
| Hologram | `playing_card_added`, +0,25 por carta añadida, solo físico | Lote dos cartas → XMult 1 → 1,5; Marble y DNA disparan el mismo evento |
| Midas Mask | `before`, scoring caras → Gold, sin Blueprint | K → Gold; orden Midas/Vampire cambia qué mejora queda; un vampired no se absorbe dos veces esa mano |
| Stone Joker | `joker_main`, 25 fichas por Stone del mazo completo | Dos Stone en cualquier ubicación → +50 fichas |
| Lucky Cat | `individual`, lucky_trigger verdadero → +0,25 una vez por activación; sin crecimiento por Blueprint | Lucky con al menos una tirada acertada → 1,25; dos éxitos en la misma activación no duplican crecimiento |
| Trading Card | `discard`, primer descarte de una carta → destrucción y $3, sin Blueprint | Una carta → mazo −1 y dinero +3; segundo descarte → sin efecto |
| Certificate | `first_hand_drawn`, carta base aleatoria con sello aleatorio a mano | Carta explícita base con Red seal → mazo +1, ubicación mano; mejora Glass rechazada |
| Glass Joker | `cards_destroyed`/`remove_playing_cards`, +0,75 por Glass shattered; `using_consumeable` contempla Glass seleccionados con The Hanged Man | Un Glass roto y una J destruida → Glass 1,75; destruir sin shattered no crece; Hanged Man con una Glass añade 0,75 |
| Invisible Joker | `end_of_round` acumula; `selling_self` desde dos rondas duplica otro Joker; elimina Negative de copia | Dos rondas y venta → copia del target explícito, contadores conservados, Negative retirado |
| Burnt Joker | `pre_discard`, primer descarte sube un nivel de la mano descartada | Pair nivel 1, 10 fichas/2 Mult → nivel 2, 25/3; segundo descarte no cambia |
| Canio | `cards_destroyed`, +1 XMult por cara destruida; sin crecimiento Blueprint | K y J destruidas → XMult 1 → 3 |
| Chaos the Clown | `add_to_deck`/`remove_from_deck`, ±1 free_rerolls; reset ronda = número de Chaos | Primer reroll gratis, después coste pagado $5; no incremento por usar gratis |
| Constellation | `using_consumeable`, +0,1 por Planet usado, sin crecimiento Blueprint | Dos Mercury usados → XMult 1,2 |
| Superposition | `joker_main`, scoring incluye Ace y mano contiene Straight; necesita espacio | A2345 → Tarot explícito añadido |
| To Do List | `before`, $4 por categoría objetivo; final ronda elige otra mano visible | Target Pair, play Pair → $4; nuevo target visible distinto requerido |
| Red Card | `skipping_booster`, +3 Mult físico | Un pack omitido → +3 Mult |
| Séance | `joker_main`, contiene Straight Flush y hay espacio | Straight Flush → Spectral explícito añadido |
| Vagabond | `joker_main`, dinero ≤ $4 y hay espacio | $5 → nada; $4 → Tarot explícito |
| Hallucination | `open_booster`, probabilidad normal/2; Oops modifica numerador; necesita espacio | Rama false → nada; un Oops → éxito seguro y Tarot explícito |
| Fortune Teller | `joker_main`, total de Tarot usados en la partida | 7 Tarot usados registrados → +7 Mult |
| Diet Cola | `selling_self`, añade Double Tag | Lista de tags + `tag_double`; no recompensa monetaria automática |
| Flash Card | `reroll_shop`, +2 Mult por reroll, también gratis | Gratis y pagado → +4 Mult |
| Campfire | `selling_card`, +0,25 por carta vendida; reset al derrotar boss; sin crecimiento Blueprint | Venta → 1,25; final Big conserva; boss ganado → 1 |
| Showman | Pool permite duplicados de Joker/Tarot/Planet/Spectral | Selector de pool devuelve duplicados permitidos cuando está poseído |
| Satellite | `calculate_dollar_bonus`, $1 por identidad Planet usada única | Mercury dos veces y Mars una → $2 al cobro |
| Cartomancer | `setting_blind`, crea Tarot si hay espacio | Tarot explícito añadido al seleccionar ciega |
| Astronomer | `set_cost`, Planet o Booster cuyo nombre contiene Celestial → coste cero | Planet y Celestial $0; Tarot $3 y Joker $8 conservan precio |
| Perkeo | `ending_shop`, copia un consumible poseído elegido aleatoriamente, edición Negative | Target Moon poseído → copia Negative, ID nuevo, ningún slot base ocupado adicional |

`Card:is_face` consulta Pareidolia incluso cuando la carta es Stone; se reproduce esa condición. Los casos de cartas debuffed dependen del filtro de activación del motor común. Vampire usa un conjunto por mano para reproducir la marca `vampired` que Lua libera con un evento posterior.

## Entradas explícitas, azar y datos desconocidos

Cada resultado aleatorio debe venir con `knowledge: 'known' | 'hypothetical'` y `basis` no vacío. No se genera azar, no se calcula un resultado medio y no se convierte una rama hipotética en estado real. Duplicar una clave produce `duplicate_outcome`; omitirla produce `needs_outcome`; un dato de partida desconocido produce `unknown_data`. Un inventario lleno impide generación y no exige describir un resultado que no puede activarse.

Claves CAT04 (el prefijo es **ID de instancia**, no nombre ni ID de catálogo):

| Efecto | Clave y tipo |
|---|---|
| Marble, Certificate | `<id>:marble`, `<id>:certificate` → `card` |
| Riff-Raff | `<id>:riff_raff:1`, `<id>:riff_raff:2` → `joker`, rareza común real |
| Sixth Sense, Cartomancer, Superposition, Séance, Vagabond | `<id>:<engineId>` → `consumable`, tipo comprobado |
| Hallucination | `<id>:hallucination_trigger` → `boolean`; si acierta, `<id>:hallucination` → `consumable` |
| Invisible, Perkeo | `<id>:invisible`, `<id>:perkeo` → `target`, ID poseído |
| To Do List al terminar ronda | `<id>:todo_list` → `integer`, índice 0–11 de `HAND_BASES`, visible y distinto |
| Lucky Cat, integración del motor | `luckyTriggeredIds` para activación actual; si se usa módulo aislado, `<cardId>:lucky_trigger:<activation>` boolean |

DNA utiliza un ID nuevo determinista: sus propiedades son una copia exacta de una carta conocida, por tanto no necesita inventar un resultado aleatorio. La categoría inicial de To Do List **es aleatoria**: `handIndex` debe registrarse o resolverse con una elección explícita al adquirirlo; el valor inicial descriptivo del catálogo no constituye una observación de la partida.

Los historiales `tarotsUsed`, `planetsUsed`, `tags`, `visibleHands`, inventario y slots de consumibles viven en `observed.jokerContext`. Un campo ausente no implica cero. `rerollCost` representa el próximo **coste pagado**, separado de `freeRerolls`; la visualización será cero mientras queden gratis.

## Integración y límites

- `generationBeforeJoker` se intercala en el orden de comodines, después de identificar mano y cartas puntuadas. Vampire no reclasifica una mano cuando elimina Stone. `generationBefore` es el wrapper del módulo para pruebas.
- `generationCard` va después de los efectos propios de la carta, por activación. Hiker incrementa permanentes para futuras activaciones; no devuelve fichas adicionales inmediatas.
- `generationMain` aporta Chips/Mult/XMult y generaciones de la fase principal. Las copias Blueprint leen el contador del objetivo; los crecimientos marcados `not context.blueprint` afectan solo a instancias físicas.
- `generationEvent` admite la lista efectiva para activaciones copiables. Los historiales de consumo se actualizan una sola vez globalmente. `handsUsed` y `discardsUsed` son los consumidos **antes** de la acción, incluso en el evento `after_hand`.
- `select_blind` agrupa aquí la generación del comienzo: Marble al seleccionar; Certificate representa el posterior `first_hand_drawn`. `generatedLocations` distingue mano y mazo para que el motor inserte Certificate después de la mano inicial y no cambie los robos del plan.
- `generationCardsAdded` y `generationCardsDestroyed` procesan cambios externos del mazo y sus contadores. Glass exige `shatteredIds` expresos; no todo Glass retirado de un mazo cuenta como roto.
- `generationSellingSelf` requiere el comodín vendido antes de retirarlo; `generationEvent(sell)` procesa Campfire de los que permanecen. La venta y adquisición de Chaos actualizan gratis mediante `generationShopInventoryChanged`.
- `generationRoundIncome` se incorpora al desglose de cobro; no se duplica con un evento `end_round`.
- `generationShopPrice`, `generationAllowsDuplicatePool` y `generationUseReroll` implementan condiciones de tienda. Reemplazar el inventario ofertado tras un reroll necesita datos explícitos de la nueva tienda; el helper de coste no inventa sus ofertas.
- Crear consumibles y registrar su uso permite calcular los beneficios del comodín. Aplicar las transformaciones específicas de todos los Tarot/Spectral, generar todo un pack y consumir tags son módulos distintos: deben aportar su cambio real/escenario de forma explícita. La existencia del tag de Diet Cola no valida una recompensa futura.

Pruebas del módulo: `npm run build` seguido de `node --test dist/tests/generation-jokers.test.js`. 31 casos sintéticos, incluyendo errores, orden, ramas y contadores. La conservación del estado original se comprueba por las pruebas del motor público: este módulo interno muta exclusivamente la copia de evaluación suministrada.
