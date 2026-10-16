# EFHIII · Reutilización del cálculo de manos

Revisión: 2026-10-12. Se revisaron el [sitio oficial](https://efhiii.github.io/balatro-calculator/), el [repositorio del autor](https://github.com/EFHIII/balatro-calculator), su código fijado y la copia local existente. El proyecto sí permite aprovechar su motor de puntuación y sus repeticiones sin reescribir ese trabajo. Su salida debe pasar por un adaptador de compatibilidad: no sustituye las acciones de tienda, la evolución de la partida ni la política estratégica del Advisor.

## Código y licencia

Referencia fijada: commit `55322d59197ba08c16874a54b59ac0d443c8ab32`. Copia existente en `tools/reference/efhiii/`; `provenance.json` registra el commit y estos hashes SHA-256:

| Archivo | SHA-256 |
|---|---|
| `balatro-sim.js` | `27ada8d35202a698ebd30b803e13dd1c765222f2e36ba54e806b5d69f69302a8` |
| `cards.js` | `4ff113b9c7c867a82f14a861c9099430241408fea8b288ba7f12b59086c8d1af` |
| `LICENSE` | `d8aa41d3131bfa811bb095a7b55a59763f3798be4f5d805ac71b1ff3572736c4` |
| `README.md` | `a8b03d96cd616b5caf72d7738f7267985d81b072c1a4898c5c7c2801d8e4a5b8` |

Su [licencia MIT fijada](https://github.com/EFHIII/balatro-calculator/blob/55322d59197ba08c16874a54b59ac0d443c8ab32/LICENSE) permite incorporar y modificar el código conservando la licencia y el aviso de copyright de Saffron Haas. No requiere un servidor externo ni consultas al sitio. La licencia del código no debe usarse para atribuir al calculador derechos sobre ilustraciones o fuentes que pertenecen a terceros.

El [README del autor](https://github.com/EFHIII/balatro-calculator/blob/55322d59197ba08c16874a54b59ac0d443c8ab32/README.md) reconoce que algunos comodines pueden funcionar incorrectamente. No declara compatibilidad específica con nuestro ejecutable **1.0.1o-FULL**. Por tanto sus resultados son evidencia de implementación externa, nunca observación directa en una partida.

## API real del motor local

`balatro-sim.js` no publica una API ESM/npm; define la clase `Hand` y constantes en un script JavaScript. El cálculo no depende de DOM. Para usarlo en navegador puede servirse una copia local con una envoltura ESM que exporte `Hand`, o cargarse como script dentro de un Worker propio. Debe conservarse el archivo fijado para verificar hashes y registrar por separado cualquier parche.

```js
const h = new Hand({
  cards,               // cartas jugadas, en orden
  cardsInHand,         // cartas retenidas, en orden
  jokers,              // comodines físicos, en orden
  hands,               // exactamente 12 categorías, con nivel e historial
  TheFlint: false,
  TheEye: false,
  PlasmaDeck: false,
  Observatory: false
});
h.randomMode = 1;      // solo con una cobertura que descarte azar incierto
h.compileAll();
const result = h.simulate();
```

Las llamadas reales son `compileJokers()`, `compileJokerOrder()`, `compileCards()`, `compileAll()`, `simulate()`, `simulateBestHand()`, `simulateWorstHand()` y `simulateRandomHand()`. La salida de `simulate` es:

```text
[scoreMantissa, scoreExponent, chips, [multMantissa, multExponent]]
```

Puntuación numérica: `scoreMantissa × 10**scoreExponent`. El resultado puede contener fracciones; para un resultado exacto compatible con Balatro hace falta aplicar el redondeo final apropiado. Mantener mantisa/exponente evita convertir puntuaciones enormes en `Infinity`; nunca introducirlas como enteros seguros en nuestro estado actual. En Plasma, el tercer campo también puede ser una pareja mantisa/exponente. `h.typeOfHand` identifica categoría; `h.earnedMoney` contiene algunos ingresos durante puntuación, sin constituir un cobro completo de ronda.

El motor **modifica sus matrices de entrada** al compilar Wild, resolver copias y mantener datos temporales de Hiker. El adaptador debe clonar cartas, comodines y manos antes de cada evaluación. Crear `new Hand` por alternativa evita que cachés y contadores temporales de una prueba contaminen otra.

## Datos exactos de entrada

Carta: `[rank, suit, edition, enhancement, seal, extraChips, disabled]`. Índices internos 7/8 son temporales y no deben persistirse como cartas reales.

| Campo | Codificación |
|---|---|
| `rank` | 0–12: 2,3,4,5,6,7,8,9,10,J,Q,K,A |
| `suit` | 0 corazones, 1 tréboles, 2 diamantes, 3 picas |
| `edition` | 0 base, 1 foil, 2 holográfica, 3 policroma, 4 negativa |
| `enhancement` | 0 ninguna, 1 bonus, 2 mult, 3 wild, 4 glass, 5 steel, 6 stone, 7 gold, 8 lucky |
| `seal` | 0 ninguno, 1 gold, 2 red, 3 blue, 4 purple; no asumir que todos producen efectos dentro del alcance de puntuación |
| `extraChips` | Fichas permanentes adicionales ya observadas en la carta |
| `disabled` | 0 normal, 1 debuff/inactiva |

Comodín: `[jokerId, value, edition, disabled, sellValue]`. `value` **tiene unidades diferentes según el comodín**. No pasar sin transformación nuestros contadores `chips`, `mult`, `x100`, etc. El ID corresponde a la posición de `jokerTexts` en el `cards.js` fijado (`columna + 10×fila`), no a su número de desbloqueo. Tampoco debe inferirse siempre del sprite del ejecutable: Wee utiliza el sprite base de Joker en el juego, pero su ID EFHIII es 40. La correspondencia debe mantenerse explícita y verificada. El texto EFHIII llama “Canio” a Caino; requiere una equivalencia declarada.

Cada mano: `[level, planetsHeld, playedRun, playedThisRound]`. El orden completo es: flush_five, flush_house, five_kind, straight_flush, four_kind, full_house, flush, straight, three_kind, two_pair, pair, high_card. `planetsHeld` corresponde a Observatory, **no** al número de planetas usados. Los recuentos de manos se pasan **antes de jugar**, porque efectos como Supernova incorporan internamente la mano actual.

## Semántica de `value`

Tabla derivada de los `switch` de la copia local. “Previo” significa antes de la mano evaluada. Si falta el dato, el adaptador debe pedirlo o abstenerse, nunca rellenar cero automáticamente.

| Comodín / ID EFHIII | Valor requerido |
|---|---|
| Stone / 9 | Cantidad de cartas Stone en el mazo; añade 25 por unidad |
| Acrobat / 12, Mystic Summit / 22, Dusk / 74 | Condición booleana activa, convertida a 0/1 desde recursos reales |
| Banner / 21 | Descartes restantes |
| Loyalty / 24 | 0 significa activar ×4; deben transformarse nuestros contadores de ciclo |
| Steel / 27 | Cantidad de cartas Steel en el mazo |
| Glass / 31 | Cantidad histórica de Glass destruidas; presenta discrepancia documentada debajo |
| Wee / 40 | Fichas previas divididas por 8; internamente crece al puntuar los doses |
| Stencil / 52 | Multiplicador actual menos 1, calculado a partir de espacios físicos |
| Ceremonial / 55, Fortune Teller / 57 | Mult previo; Tarots usados, respectivamente |
| Hit the Road / 58 | `(x100−100)/50`, número de J descartadas equivalente |
| Ride the Bus / 61 | Mult previo; internamente añade la mano actual compatible |
| Driver's License / 70 | Cantidad de cartas mejoradas en el mazo |
| Invisible / 71 | Rondas acumuladas; venta/generación siguen fuera del motor de mano |
| Throwback / 75 | Ciegas saltadas |
| Idol / 76 | `4×rank + suit`, con codificación de carta 0–51 |
| Satellite / 78 | Cantidad de planetas distintos usados; ingreso de final de ronda fuera del cálculo principal |
| Caino / 83 | `x100/100−1` |
| Yorick / 85 | `x100/100`; EFHIII no lleva los descartes necesarios para crecer |
| Bootstraps / 89 | `floor(saldoAntes/5)`; incorpora parte de los ingresos de puntuación internamente |
| Runner / 103 | Fichas previas divididas por 15; internamente añade crecimiento si hay Straight |
| Ice Cream / 104 | `(100−fichasActuales)/5` |
| Blue / 107 | Cartas restantes **menos 52**, pese a su etiqueta visual; fórmula local `104 + 2×value` |
| Constellation / 109 | `(x100−100)/10` |
| Green / 112 | Mult previo; internamente añade 1 |
| To Do / 114 | Categoría objetivo con codificación EFHIII; requiere revisar su uso de orden invertido en UI |
| Red Card / 117 | Mult previo dividido por 3 |
| Madness / 118 | `(x100−100)/50`; no ejecuta seleccionar ciega ni destruir comodín |
| Square / 119 | Fichas previas divididas por 4; internamente añade crecimiento con cuatro cartas |
| Vampire / 122 | `(x100−100)/10`; orden con Midas requiere un caso validado específico |
| Hologram / 124 | `(x100−100)/25`; generación de cartas fuera del motor de mano |
| Cloud 9 / 127 | Cantidad de nueves; cobro fuera del cálculo principal |
| Obelisk / 129 | `(x100−100)/20`; compara el historial de categorías |
| Erosion / 135 | Número de cartas por debajo del tamaño inicial; la etiqueta asume 52 y nuestro modelo debe usar la baraja real |
| Lucky Cat / 145 | `(x100−100)/25`; añade activaciones Lucky internas |
| Bull / 147 | Saldo real antes de puntuar; incorpora algunos ingresos durante puntuación |
| Flash / 150 | Mult previo dividido por 2 |
| Popcorn / 151 | `(20−multActual)/4` |
| Ramen / 152 | `200−x100` |
| Seltzer / 153 | `10−manosRestantes`; selección del efecto no gestiona retirar el físico |
| Trousers / 154 | Mult previo dividido por 2; internamente añade crecimiento si corresponde |
| Campfire / 155 | `(x100−100)/25` |
| Ancient / 157 | Palo objetivo 0–3 |
| Castle / 159 | Fichas previas divididas por 3; la etiqueta de palo no sustituye al contador de fichas |

Si la conversión exige una fracción incompatible con un contador del juego, debe rechazarse antes de llamar al motor externo. Aplicar primero el crecimiento en nuestro motor y luego pasar ese contador a EFHIII lo contabilizaría dos veces en Green, Wee, Runner, Square, Trousers, Vampire y otros.

## Copias y desgloses

Blueprint ID 30 y Brainstorm ID 77 se resuelven en `compileJokerOrder`, con detección limitada de ciclos. Se preserva la rareza física para Baseball en `jokerRarities`, mientras `actualJokers` conserva los originales y `cardCast` guarda el origen de la copia. No pasar a EFHIII nuestra lista de efectos ya copiados: debe recibir la lista física original. La compatibilidad de la copia y los efectos de selección de ciega/tienda siguen validados por H2.

El [módulo `breakdown.js` fijado](https://raw.githubusercontent.com/EFHIII/balatro-calculator/55322d59197ba08c16874a54b59ac0d443c8ab32/breakdown.js) define otra clase `Hand`, con opción `breakdown` y lista de pasos. Cada paso contiene cartas, descripción, fichas, Mult y modificador. Depende de constantes de color del frontend y emite descripciones HTML. No cargar ambas clases en el mismo espacio global ni incorporar ese HTML como contenido confiable. Para nuestro desglose conviene conservar los valores y convertirlos a las explicaciones estructuradas actuales. Las dos implementaciones externas pueden divergir, por lo que deben compararse antes de escoger una como backend.

## Comprobaciones reproducidas en esta revisión

Se ejecutó la copia fijada mediante `node:vm`, sin interfaz ni partida. Los esperados proceden de las reglas inspeccionadas del ejecutable y se fijaron antes de comparar. Ninguno constituye gameplay observado.

| Caso | Esperado independiente del motor externo | Observado EFHIII | Estado |
|---|---|---|---|
| 2H, Q y K retenidas, Shoot the Moon + Baron, orden Q→K | `(5+2)×(1+13)×1,5 = 147` | 147 | Coincide |
| Mismo caso, K→Q | `7×(1×1,5+13) = 101,5`, puntuación final 101 | 101,5 | Orden coincide; falta redondeo final en su salida |
| 2H; K Steel/Red retenida; Baron + Mime | Tres activaciones, cada una ×1,5 Steel y ×1,5 Baron: `7×2,25³ = 79,734375`, final 79 | 79,734375 | Coincide antes de redondear |
| K Red jugada; Photograph + Hanging Chad | Cuatro activaciones: `(5+4×10)×2⁴ = 720` | 720 | Coincide |
| 2H, The Flint, nivel 1 | `blind.lua` 512–516 redondea base 5/1 a 3/1: `(3+2)×1 = 5` | 2,25; fichas 4,5 y Mult 0,5 | Discrepancia; requiere parche o abstención |
| 2H; Glass Joker, tres Glass destruidas previamente, ninguna Glass jugada | ×`(1+3×0,75)=3,25`; `7×3,25=22,75`, final 22 | ×5,5; 38,5 | Discrepancia: duplicación del histórico en `compileCards` |
| Stone/Red jugada + Hiker, sin Pareidolia | Fichas `5+50+55=110`: Hiker añade 5 antes de la repetición | 105 | Discrepancia: fichas de Hiker no incluidas en Stone repetida |
| 2H Lucky; cuatro Oops; Bull con saldo $0; modo pesimista | Ambos efectos Lucky son seguros (16/5 y 16/15); ingreso $20; `(7+40)×21=987` | 147, ingreso $0 | Discrepancia: la rama pesimista exige 20 en vez de 15 para dinero |

El [issue #91](https://github.com/EFHIII/balatro-calculator/issues/91) describe problemas con Baron/Shoot the Moon. Permanecía abierto al consultar, pero **el caso mínimo sí coincide en nuestra revisión fijada**. Un reporte abierto no sustituye una reproducción contra la versión concreta.

Limitaciones adicionales visibles en la copia: no hay ejecución de Space Joker para subir niveles, ni de 8 Ball para crear Tarots; Rough Gem no tiene su pago de puntuación, que afectaría Bull/Bootstraps. Las acciones de compra/venta, la selección de ciega, destrucción al acabar ronda, el mazo completo y las transiciones de consumibles no forman parte de su API de mano. No basta registrar los 150 nombres para afirmar que los 150 efectos estén evaluados por el calculador externo.

## Integración mínima recomendada

1. Mantener H2 como propietario del estado, la legalidad, los eventos, la economía y las incertidumbres. Preparar la mano concreta con sus cartas retenidas y parámetros observados.
2. Añadir una copia local ESM/Worker de `balatro-sim.js`, con MIT, commit y hashes. Reutilizar sus repeticiones, copia y cálculo profundo en las combinaciones aprobadas; no descargar código durante una recomendación.
3. Añadir un adaptador puro `estado + mano → input EFHIII` con conversiones explícitas de esta tabla. Los datos desconocidos y las combinaciones afectadas por diferencias detectadas deben retornar una limitación clara. Cada alternativa comienza con nuevas matrices clonadas.
4. Usar modo determinista solo cuando los efectos inciertos estén ausentes o se hayan adaptado a una rama explícita. El modo optimista/pesimista no representa una tirada observada, ni una probabilidad de ganar. No utilizar `simulateRandomHand()` en el asesor actual.
5. Contrastar con oráculos independientes las combinaciones aceptadas. Después se puede ampliar la cobertura y mantener un registro de parches versionados, conservando el motor externo original para las pruebas de referencia.

El [Worker original fijado](https://raw.githubusercontent.com/EFHIII/balatro-calculator/55322d59197ba08c16874a54b59ac0d443c8ab32/worker.js) admite mensajes `start`, `once`, `dontOptimizeJokers` y `optimizeJokers`. Busca selecciones y orden de cartas y comodines. Si hay diferencia entre resultados mejores/peores, ejecuta 10001 tiradas para media/mediana. **No integrarlo sin adaptación**, porque esa rama introduce Monte Carlo y modifica los supuestos del Advisor. Un Worker fino propio puede llamar directamente a `Hand` y devolver puntuación/desglose de un escenario fijo.

La referencia previa `tools/compare-efhiii.mjs` y su informe comparan 29 casos iniciales; esa cobertura no demuestra todo el catálogo ni los efectos económicos.

## Entrega ejecutable del adaptador

La reutilización ya está implementada en `src/reference/efhiii-scoring.ts`. Importa estáticamente la clase y los helpers MIT de `src/reference/vendor/efhiii-sim.ts`, compilados como ESM. La copia de distribución `web/assets/efhiii/balatro-sim.js` también es ESM y conserva la licencia completa. `web/assets/efhiii/provenance.json` distingue hashes de la fuente original y de la distribución con aviso/export añadidos. No hay `eval`, descarga de código durante el análisis ni llamada a `simulateRandomHand`.

API: `verifyOrScoreEfhiii(state, handInput)` devuelve `{supported, score?, chips?, mult?, reason?, source}`. La lista explícita `EFHIII_JOKER_IDS` delimita la intersección determinista disponible. Las familias con azar, evolución no equivalente o discrepancias reproducidas retornan `supported: false` con su motivo. Lo mismo ocurre con niveles personalizados incompatibles, cartas ilegales, contextos desconocidos o resultados fuera del rango de enteros seguros. La lista indica capacidad del adaptador; la validación final exige coincidencia con los cálculos y trazas independientes de H2.

El llamador debe enviar una instantánea **anterior a los efectos de la mano**. El motor externo incorpora parte del crecimiento, como Green/Runner/Wee, mientras H2 conserva las transiciones y los contadores de la copia local. Una vez calculados ambos resultados, la integración puede utilizar la puntuación EFHIII cuando coinciden; una discrepancia conserva el cálculo local y registra la limitación. No se copian cartas modificadas ni estados finales externos al registro real.

`tests/efhiii-adapter.test.ts` tiene nueve pruebas con resultados literales: los dos órdenes Q/K, Baron + Mime + Steel/Red, Photograph + Hanging Chad + Red, Blueprint + Photograph + Hanging Chad, contextos/cartas incompatibles, familias excluidas, contador Green antes de jugar, niveles canónicos y licencia/hashes. Los cinco casos profundos reutilizan efectivamente la clase vendorizada. También prueban que las entradas de partida y mano permanecen idénticas después de evaluar. La conexión a `scoreInternal` y la comprobación del navegador pertenecen a la integración del motor; ejecutar estas pruebas de módulo por sí solas no afirma que esa conexión haya sido realizada.
