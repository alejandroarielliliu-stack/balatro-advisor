# CAT04 · Comodines de historial y ronda

Versión compatible: **Steam PC, 1.0.1o-FULL, sin mods**. Inspección estática del ZIP contenido en `C:\Program Files (x86)\Steam\steamapps\common\Balatro\Balatro.exe`, realizada el 12 de octubre de 2026. **No son observaciones de una partida ejecutada**. Las reglas permanecen provisionales y el modo que exige evidencia observada debe abstenerse cuando depende de `jokers.history`.

Implementación: `src/catalog/history-jokers.ts`, `src/rules/history-jokers.ts`. Las pruebas independientes de este módulo están en `tests/history-jokers.test.ts`.

## Evidencia y trazabilidad

Los números de línea corresponden al texto UTF-8 extraído sin modificar. El catálogo de nombre, precio y compatibilidad Blueprint se transcribió de `game.lua`: líneas 393, 412, 417, 433, 435, 445–446, 449, 452–453, 455, 472, 476, 481, 488, 502, 504 y 525.

| Archivo interno | SHA-256 |
| --- | --- |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `functions/state_events.lua` | `6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |
| `blind.lua` | `0a7e5fde144da36d4ca1a96950b4bf51e3c95be55fb02764a555de53a3bd8afb` |

## Casos mínimos por efecto

La columna de resultado describe una expectativa obtenida de las ramas del ejecutable, **no una captura de gameplay ni una expectativa generada por el motor**. La inspección encontró las condiciones y constantes indicadas. Las pruebas del módulo contrastan esa transcripción y operaciones concretas; no sustituyen una comprobación dentro del juego.

| Comodín | Regla y caso mínimo | Resultado esperado independiente | Fuente inspeccionada |
| --- | --- | --- | --- |
| Loyalty Card | Recién adquirido; jugar seis manos y continuar hasta doce. | ×4 en la sexta y duodécima; la quinta no activa. El ciclo depende de manos desde adquisición, no del tipo de mano. | `card.lua` 330–333, 3632–3650; `game.lua` 393 (`every=5`, `Xmult=4`). |
| Supernova | Siete parejas previas en la run; jugar otra pareja. | +8 Mult. El contador incluye la jugada actual antes de aplicar el comodín. | `state_events.lua` 574–578; `card.lua` 3731–3735. |
| Burglar | Seleccionar ciega con cuatro manos y tres descartes. | Siete manos y cero descartes. Un Blueprint compatible da otras tres manos; continúa habiendo cero descartes. No cambia la base persistente de manos por ronda. | `card.lua` 2522–2527. |
| Card Sharp | Jugar pareja dos veces en una ronda nueva. | Primera pareja sin ×3; segunda con ×3. Se reinicia el historial de la ronda al seleccionar otra ciega. | `card.lua` 4040–4044; `state_events.lua` 303–305 y 574–575. |
| Madness | Seleccionar ciega pequeña con ×1 y ningún otro comodín; repetir con varios posibles objetivos. | Crece a ×1,5 incluso sin destrucción. Si hay varios objetivos, debe indicarse uno de los otros comodines no eternos. Seleccionar jefe no lo hace crecer. | `card.lua` 2503–2519. |
| Rocket | Ingreso actual $1; completar una ciega grande y luego un jefe. | $1 por la grande. El jefe aumenta primero el contador a $3 y ese mismo cobro paga $3. El ingreso no aumenta el saldo usado para el interés de ese cobro. | `card.lua` 2896–2901 y 1664–1665; `state_events.lua` 100–110, 1175–1191. |
| Obelisk | Historial: pareja 4, carta alta 5; contador ×2. Jugar pareja dos veces. | Tras la primera pareja, pareja 5 empata con carta alta 5 y crece a ×2,2. Tras la segunda, pareja 6 es única más jugada y reinicia a ×1. La comparación usa los conteos después de contar la jugada. | `card.lua` 3543–3561; `state_events.lua` 574–578. |
| Luchador | Venderlo en tienda; compararlo con venderlo mientras un jefe está activo. | La venta en tienda no desactiva el próximo jefe. La venta con jefe activo desactiva ese jefe. | `card.lua` 2354–2359 y 865–866. |
| Turtle Bean | Contador de tamaño adicional 5; terminar una ronda. Repetir con contador 1. | Tamaño adicional 4 después de la primera; al pasar de 1 a 0 se consume y desaparece, retirando la última unidad de capacidad. | `card.lua` 605–607, 662–664, 2903–2932. |
| Erosion | Tamaño inicial explícito 40, mazo actual 35. Comparar con inicial 30, actual 35. | +20 Mult en el primero; 0 en el segundo. No presupone que todas las barajas comenzaron con 52 cartas. | `card.lua` 3893–3899. |
| Mail-In Rebate | Rango objetivo as; descartar as de corazones, as de picas y dos de corazones. | $10, cinco por cada as. Se activa por carta, por lo que copias compatibles pueden activar también el pago. | `card.lua` 2825–2833. |
| Ancient Joker | Palo objetivo picas; puntuar un as de picas, después repetir su activación. | ×1,5 en cada activación; el rango no condiciona el efecto. El próximo palo debe ser distinto del anterior, incluso si ese palo no existe en el mazo. | `card.lua` 3255–3260; `common_events.lua` 2303–2309. |
| Castle | Palo objetivo corazones; fichas acumuladas 9; descartar dos corazones y una pica. | Crece a 15 fichas, tres por cada corazón. Blueprint copia las fichas, no el crecimiento. | `card.lua` 2814–2823 y 3880–3885. |
| Mr. Bones | Agotar manos con objetivo 600; comparar acumulado 149 y 150. | 149 no salva. 150 salva y consume Mr. Bones. La puntuación continúa en 150 y la recompensa de la ciega es $0; salvar la ronda no equivale a superar el objetivo. | `card.lua` 3047–3062; `state_events.lua` 103–105 y 1138–1145. |
| Throwback | Tres ciegas saltadas en toda la run. | ×1,75, incluido cuando el comodín se adquirió después de esos saltos. Sin dato de saltos no se inventa ×1. | `game.lua` 488 (`extra=0.25`); `card.lua` 4176–4177. |
| The Idol | Objetivo as de picas; puntuar as de picas, reina de picas y as de corazones. | ×2 solo en el as de picas. Rango y palo son condiciones conjuntas; cada repetición puede volver a activar el efecto. | `card.lua` 3127–3135. |
| Matador | Jefe activo cuya rama ha marcado `triggered`; comparar con The Wall y una mano válida. | $8 cuando el indicador exacto está activo. El objetivo aumentado de Wall o la reducción de descartes de Water no bastan. Se requiere una rama explícita si el indicador no puede derivarse de las reglas implementadas. | `card.lua` 2735–2746 y 3719–3729; `blind.lua` 519–568. |
| Chicot | Seleccionar Wall con objetivo 1200, Violet Vessel con 1800 o Water con descartes base. | Desactiva el jefe. Wall queda en 600 (`/2`), Violet en 600 (`/3`); Water recupera los descartes que retiró. El premio permanece. | `card.lua` 2492–2501; `blind.lua` 356–395. |

## Datos necesarios, orden y azar

`observed.jokerContext` guarda hechos separados de los contadores: `handCounts`, `roundHandCounts`, `visibleHands`, `startingDeckSize`, `blindsSkipped` y `bossDisabled`. Los valores ausentes permanecen desconocidos. Supernova usa el historial de la categoría actual; Obelisk necesita conocer las categorías visibles y sus cuentas para comparar. Card Sharp usa el historial de la ronda, reiniciado explícitamente al seleccionar ciega.

Se llama una vez a `historyBefore` para contar la mano actual. Después se aplica `historyBeforeJoker` una vez por comodín físico en orden. Se reconstruyen las copias efectivas antes de puntuar para que copien los contadores ya actualizados. Los factores de Ancient e Idol se aplican durante cada activación de carta; los factores y sumas principales respetan el orden general de comodines.

Mail, Ancient, Castle e Idol utilizan objetivos globales de la ronda que el juego elige incluso antes de adquirir el comodín. Sus objetivos iniciales en un estado observado **deben registrarse**; las constantes de inicialización del catálogo no demuestran cuál fue el resultado del sorteo de esta partida.

Al terminar una ronda, los objetivos futuros sin evidencia pasan a hechos desconocidos. Un escenario puede declarar su siguiente resultado en una `EffectChoice` con `kind: 'target'`, `knowledge`, `basis` y clave `<instanceId>:target`. Mail, Castle e Idol reciben una carta real del mazo distinta de Stone: el juego elige entre esas cartas y conserva rango, palo o ambos. Ancient recibe un palo de los otros tres. No se calcula una probabilidad media, no se genera una semilla y no se fija un resultado favorable.

Madness exige `<instanceId>:destroy` cuando hay varios comodines elegibles. Si hay uno, la consecuencia es determinista; si no hay ninguno, el crecimiento sigue ocurriendo. La destrucción se resuelve en orden, sin activar un comodín físico que ya fue destruido.

Para Matador, la clave explícita es `<instanceId>:boss_triggered`. Los cuatro jefes iniciales permiten determinar que una mano válida no activa ese indicador. Las manos anuladas por el jefe requieren el camino `debuffed_hand` del motor, no una puntuación válida inventada.

## Pruebas y comprobaciones pendientes

Resultado local del módulo: **17 pruebas aprobadas**, incluyendo las transcripciones numéricas, falta de historial, objetivos desconocidos, restricciones de azar, Mr. Bones, aplicación de recursos y comparación desde copias independientes. La comprobación de inmutabilidad prueba el uso de una copia de evaluación; los manejadores internos modifican deliberadamente esa copia, al igual que los otros eventos de H2.

No se ha observado directamente una partida para este grupo. Para contrastar la evidencia dentro del juego, bastan capturas antes y después de cada caso mínimo de la tabla, mostrando versión, comodines en orden, sus contadores, categoría de mano, recursos y cobro cuando corresponda. La inspección del ejecutable identifica claramente el comportamiento esperado, pero la etiqueta de evidencia observada sigue pendiente.
