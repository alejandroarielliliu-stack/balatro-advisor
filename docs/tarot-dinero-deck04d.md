# DECK04d: Ermitaño y Templanza

18 de octubre de 2026, motor 0.9.3. Añade dos efectos del catálogo existente a los doce Tarot dirigidos de DECK04a/b: **14 Tarot compatibles**, sin integrar los otros ocho, Soul ni Spectral. Reutiliza H1/T09b y la comparación de [objetivos Arcana](objetivos-arcana-deck04c.md).

## Uso y dependencias

Un Tarot propio de dinero puede confirmarse desde **Tienda** o una **ronda en curso**, en el panel Tarot. La vista previa muestra saldo anterior, ingreso y saldo resultante; no solicita objetivos ni una mano para estos dos efectos. En ronda, el editor de mano queda disponible para los Tarot dirigidos y no es un requisito para los de dinero.

También pueden observarse y usarse directamente desde Arcana. El saldo de Ermitaño es el que queda **después de pagar el sobre**: abrir por $4 desde $20 deja $16; usarlo añade $16 y deja $32. No se cobra otro Tarot ni se inserta temporalmente en el inventario de consumibles. Un Mega puede usar primero dinero y registrar después su mano aún desconocida para el Tarot dirigido restante; una mano ya registrada no puede sustituirse después de elegir.

| Efecto | Datos que necesita | Cálculo exacto bajo L14 |
|---|---|---|
| Ermitaño | Saldo actual conocido | Ingreso `max(0, min(saldo, 20))`; no reduce una deuda |
| Templanza | Saldo e inventario físico de comodines, valores de venta | Ingreso `min(50, suma de ventas)`; no vende ningún comodín |

No se requieren mazo completo, mano, tamaño, jefe o capacidad de consumibles para calcular este dinero. Templanza no copia efectos de Blueprint ni anticipa crecimiento de Egg/Gift Card: usa las ventas observadas actuales, incluso si un comodín no se puede vender por su pegatina. Una venta desconocida bloquea su ingreso solo si las conocidas todavía no alcanzan el tope; si ya suman $50 se conserva el ingreso exacto limitado y la incertidumbre se explica, sin asignar cero a los desconocidos. Ermitaño sigue disponible aunque falten esas ventas.

No se paga interés, recompensa, carta Gold ni otro cierre de ronda. El Tarot propio usado se retira una vez; el historial conocido de Tarot aumenta una vez y uno desconocido sigue desconocido. Los efectos posteriores de dinero se recalculan a partir del nuevo saldo, sin añadir una activación de puntuación ficticia.

`use_tarot` reutiliza `targetCardIds: []` para estos dos efectos. Un objetivo extra se rechaza; los doce Tarot dirigidos conservan sus límites y la fase de ronda para los propios. El uso de consumibles propios dentro de un sobre permanece fuera de este lote. Las animaciones y bloqueos temporales del juego no se controlan: se registra una acción que el usuario confirma haber realizado.

## Comparación y registro

Arcana representa un Tarot de dinero mediante una sola alternativa sin objetivos. La falta de mano bloquea las transformaciones que la necesitan y la conclusión global correspondiente; conserva los ingresos independientes que sí se pueden calcular. Se muestran saldo e ingreso junto a los apartados contextuales, sin tratar dólares como fichas. La búsqueda y sus límites siguen declarados; no optimiza el orden de dos usos Mega.

La selección y el análisis no escriben. Confirmar usa la revisión y persistencia atómica de T09b; recargar conserva dinero, consumibles e historial juntos, y deshacer los recupera juntos. Los guardados 0.2 anteriores siguen cargándose. Una opción antigua guardada como `unsupported` no se promueve silenciosamente: antes de elegir puede corregirse el contenido; después hay que deshacer el registro equivocado y transcribirlo de nuevo. El formato 0.1 permanece congelado.

## L14: evidencia primaria y contraste pendiente

Lectura local del ejecutable Steam sin mods declarado, con `zipfile.ZipFile`, sin ejecutar el Lua, extraer archivos del juego al proyecto ni redistribuirlos. `version.jkr`: `1.0.1o-FULL`, `1.0.1o`, `PROD_PC_Console`.

| Fuente | SHA-256 |
|---|---|
| Balatro.exe | `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47` |
| version.jkr | `a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3` |
| game.lua | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| card.lua | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |

| Regla / caso mínimo | Esperado independiente | Observado en la fuente | Estado |
|---|---|---|---|
| Ermitaño con $7, $41 o deuda $−5 | Ingresos $7, $20 y $0; saldos $14, $61 y $−5 | `game.lua:542` fija tope20; `card.lua:1385–1391` limita por saldo y por cero | Provisional por inspección; partida pendiente |
| Templanza con ventas físicas $2+$7; luego total mayor de50 | Ingreso $9; con suma superior al tope, $50 | `game.lua:547` fija50; `card.lua:4167–4174` suma `sell_cost` físico y limita; 1393–1398 abona | Provisional por inspección; partida pendiente |
| Ambos sin cartas seleccionadas | Efecto de dinero disponible sin objetivo | `card.lua:1523–1531` separa disponibilidad de estos dos efectos de la selección de cartas, sujeto a bloqueos temporales | Provisional; no se simulan animaciones |

Los resultados de H2 y las pruebas de navegador **no son** el observado de una partida. Para completar el contraste basta, cuando aparezcan, con una captura antes/después de Ermitaño mostrando su saldo y consumo, y otra de Templanza con sus ventas físicas visibles y el saldo antes/después. No se necesita recorrer el resto del catálogo; versión/plataforma/mods ya están declarados salvo que cambien.

## Verificación y continuación

```powershell
npm.cmd run check
npm.cmd run demo:tarot-money
npm.cmd run test:tarot-money
```

13 casos nuevos cubren ingresos literales, topes, deuda, desconocidos, separación de dependencias, objetivos ilegales, modo estricto, desbordamiento, copia, Mega, confirmación/recarga/duplicado/deshacer y fallo de guardado. Se comprueban seis flujos nuevos de navegador, más las regresiones de objetivos Arcana, Arcana, Tarot dirigidos y subruta. Los perfiles son temporales y los escenarios sintéticos. La emulación móvil de390px no acredita un Android físico. Los reportes/capturas locales están en `docs/evidencia/tarot-money/`; la variante pública contrasta los archivos del artefacto antes de interactuar.

La evidencia sigue provisional y el modo estricto sigue absteniéndose. EVAL01 no está cerrado por estas pruebas. Siguiente: **Fuerza**, un lote independiente de cambios de rango, antes de añadir destrucción/copia de cartas y sus hooks. Otros Tarot, Spectral/Standard, Black Hole, Omen Globe y optimización de secuencias siguen pendientes.
