# CAT02 — 33 comodines deterministas nuevos

2026-10-11, motor **0.6.0**. **41 efectos implementados**, 109 solo catálogo. Cobertura adicional autorizada por el usuario; no equivale a implementar los 150 ni a validar probabilidades de victoria.

## Efectos habilitados

| Grupo | Comodines nuevos | Operación |
| --- | --- | --- |
| Palo puntuado | Greedy, Lusty, Wrathful, Gluttonous Joker | +3 Mult por diamante/corazón/pica/trébol que puntúa |
| Rangos puntuados | Odd Todd, Fibonacci, Walkie Talkie | +31 fichas en A/9/7/5/3; +8 Mult en A/2/3/5/8; +10 fichas/+4 Mult en 10/4 |
| Figuras puntuadas | Scary Face, Smiley Face | +30 fichas / +5 Mult por J/Q/K |
| Palo puntuado, raros | Arrowhead, Onyx Agate | +50 fichas por pica / +7 Mult por trébol |
| Patrones contenidos | Jolly, Zany, Mad, Crazy, Droll | +8/+12/+10/+12/+10 Mult para pareja/trío/doble pareja/escalera/color |
| Patrones contenidos | Sly, Wily, Clever, Devious, Crafty | +50/+100/+80/+100/+80 fichas para esos mismos patrones |
| Patrones con ×Mult | The Duo, The Trio, The Family, The Order, The Tribe | ×2/×3/×4/×3/×2 para pareja/trío/póquer/escalera/color |
| Recursos | Mystic Summit | +15 Mult con cero descartes restantes |
| Dinero actual | Bull, Bootstraps | +2 fichas por dólar / +2 Mult por cada $5 completos |
| Valor de venta | Swashbuckler | Suma el valor de venta observado de los otros comodines |
| Palos de cartas puntuadas | Flower Pot, Seeing Double | ×3 con los cuatro palos / ×2 con trébol y otro palo |
| Selección de cartas | Splash | Todas las cartas jugadas puntúan y activan los efectos compatibles |

Se conservan los ocho originales. Los precios base proceden del catálogo y se verifican contra él; compra/venta/reemplazo y persistencia usan H2/T09b existentes. El selector, el buscador y los filtros de colección muestran los 41, con sus ilustraciones. `engine-support.json` conserva los mapeos explícitos al regenerar el catálogo; no convierte automáticamente todos sus datos en efectos ejecutables.

## Orden, dependencias y límites

- Categoría de mano y conjunto puntuado se calculan por separado. Splash cambia el conjunto, no la categoría. Los patrones contenidos se comprueban sobre las cartas jugadas: un full house contiene pareja, trío y doble pareja. Flower Pot y Seeing Double miran el conjunto puntuado; un trébol descartado de ese conjunto no los activa.
- Bonos de cartas: se aplican por carta y en orden de comodines. Después se aplican los efectos principales en el orden del inventario. ×Mult entero multiplica el Mult acumulado en ese momento, antes de la operación final de Plasma.
- Bull/Bootstraps usan el dinero de la alternativa después de comprar/vender. Swashbuckler usa valores de venta actuales, excluyendo su propia instancia. Un dato necesario desconocido bloquea ese cálculo; no se asume cero.
- No hay efectos nuevos de ingreso durante la mano. Por eso el saldo suministrado basta dentro de este catálogo; incorporar Rough Gem/Business Card u otros ingresos exigirá modelar el momento en que cambia el saldo y revisar estos cálculos.
- Se mantienen las exclusiones de mejoras, ediciones, sellos, duplicados de comodín, efectos copiados y consumibles no implementados. No hay Pareidolia, Wild Cards o Smeared que alteren figuras/palos en este alcance.
- Las cotas reutilizan magnitudes y condiciones del catálogo. Relajan las condiciones, acumulan sumandos no negativos y aplican todos los factores ×Mult al final, lo que sobreestima cualquier orden real con factores ≥1. Se aplican después los factores finales de Plasma. No generalizar esta prueba a multiplicadores fraccionarios, reducciones o retriggers.
- H3 reutiliza las puntuaciones, recursos y economía por escenario; registra activaciones aditivas, ×Mult y cartas adicionales de Splash. No inventa crecimiento ni cambia su política para favorecer nombres específicos.

## Evidencia L04

Inspección estática de la misma instalación **Steam 1.0.1o-FULL**, sin ejecutar una partida. Parámetros/precios en `game.lua` y textos/configuración en el catálogo cotejado. Condiciones en `card.lua`: Scary/Smiley 3136–3148, Walkie 3167, Fibonacci 3185, Odd Todd 3206, Suit Mult 3217, Onyx/Arrowhead 3233–3245, ×Mult por patrón 3653, t_mult/t_chips 3660–3666, Mystic 3694, Flower Pot 3807, Seeing Double 3840, Bull 3936, Swashbuckler 3974 y recálculo 4240, Bootstraps 4046. Splash en `functions/state_events.lua` 583.

Huellas SHA-256 de las fuentes, conservadas de L01: game.lua `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912`. card.lua `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453`. Todas las reglas nuevas siguen **provisionales**, verificadas documentalmente por inspección local, no observadas en juego. `requireObserved` conserva su abstención.

## Validación

`tests/simple-jokers.test.ts` contiene un resultado literal independiente por cada nuevo comodín, comparación con cota, compra legal e inmutabilidad. También cubre condiciones negativas, figuras/rangos, cartas jugadas que no puntúan, patrones contenidos, orden de ×Mult, Splash con Scholar/Flower Pot, pérdida de beneficios al vender, umbrales de dinero, datos desconocidos y modo estricto.

Ejemplos calculados de las reglas antes de ejecutar el motor:

- Pareja de ochos + Fibonacci: (10+8+8)×(2+8+8)=468.
- Joker → The Duo: 26×(2+4)×2=312. The Duo → Joker: 26×(2×2+4)=208.
- Pareja de ochos y As adicional + Splash/Scholar: (10+8+8+11+20)×(2+4)=342.
- H3: con objetivo 450 y plan de dos parejas, comprar Fibonacci alcanza 468 en la primera mano; conservar solo acumula 80. Resultado condicional a ese plan, no predicción.

`npm run check`: **212 aprobadas, cero fallos, 10 TODO existentes**. Chrome: regresión de 17 grupos, diseño y colección con 41 seleccionables, búsqueda, ilustraciones, cinco tamaños y guardado independiente. Las 29 comparaciones previas con EFHIII siguen coincidiendo; no se presentan como validación de los 33 nuevos. Falta contraste en partida y evaluación estratégica amplia.

## Siguientes grupos

1. Efectos que usan cartas retenidas o posición: requieren contexto de mano completo en cada consulta (p. ej. Raised Fist, Blackboard).
2. Contadores y caducidad (Ice Cream, Popcorn, Ramen), ingresos y modificaciones de valores: requieren eventos y persistencia, no solo fórmulas de puntuación.
3. Cambios de recursos/patrones (Juggler, Troubadour, Four Fingers, Shortcut, Smeared): deben modificar legalidad y resultados, no solo el total.
4. Retriggers, copias, generación y azar (Mime, Blueprint, Brainstorm, Hanging Chad, Bloodstone y otros): al final, con sus dependencias explícitas.

No se ha afirmado que los 109 restantes sean todos complejos; permanecen sin cálculo hasta completar su integración y pruebas.
