# Reglas y evidencia — v0.1

Contrato propuesto: `balatro-pc-1.0.1f-blue-white-v1`. Consulta: 2026-10-08. Esta es la fuente única de reglas del alcance; los ejemplos remiten a los IDs siguientes.

**Actualización H2, 2026-10-09:** contrato activo `balatro-pc-1.0.1o-blue-white-v1`. [L01](evidencia/h2-inspeccion-local.md) identifica versión y respalda estáticamente los efectos, precios e hipótesis de intereses/Green. Las tablas siguientes siguen siendo el modelo documental; no se declaran resultados ejecutados. El [motor](motor-h2.md) usa un registro activo separado de la metadata histórica 1.0.1f.

## Calidad de evidencia y versión

**D** = comprobación documental comunitaria; **P** = fuente primaria del desarrollador; **E** = observación ejecutada en el juego con build registrada. En H0 no se obtuvo evidencia E. Varias páginas de Fandom rechazaron apertura directa; se pudo leer su contenido indexado mediante búsqueda. Se indica como evidencia documental, no como inspección de código o captura del juego.

[Anuncio oficial 1.0.1f en Steam](https://steamcommunity.com/games/2379780/announcements/detail/4208127528883891676) (P): identifica el parche, publicado el 1 de mayo de 2024. La apertura web devolvió contenido incompleto, pero en T01 se recuperó el texto original mediante la API pública Steam News: autor LocalThunk, gid `5766372999940479946`. Confirma documentalmente el cambio de Banner a 30 fichas por descarte. Método, hash y límites en [T01/P01](evidencia/t01-reglas.md). No verifica un ejecutable local ni los eventos de intereses/Green.

[Historial comunitario del parche](https://balatrogame.fandom.com/wiki/Update_1.0.1f) (D) documenta los cambios. No hay base aquí para certificar que todas las páginas actuales describen exactamente esa build. T01 debe fijar la compatibilidad; no se trasladan automáticamente datos de 1.0.1o o 1.1.

## R-BASE: configuración y puntuación

[Blue Deck](https://balatrogame.fandom.com/wiki/Blue_Deck) (D): una mano adicional por ronda y 52 cartas normales. [Stakes](https://balatrogame.fandom.com/wiki/Stakes) (D): White es la dificultad base. Valores de configuración a contrastar en T01: 5 manos, 3 descartes, tamaño de mano 8 y 5 espacios de comodines, antes de efectos de jefe.

[Card Ranks](https://balatrogame.fandom.com/wiki/Card_Ranks) (D): fichas de cartas numéricas iguales al rango; figuras 10; as 11. [Poker Hands](https://balatrogame.fandom.com/wiki/Poker_Hands) (D): puntúan las cartas que forman la categoría reconocida; los acompañantes no puntúan por defecto.

| Categoría (prioridad ascendente) | Fichas base nivel 1 | Mult base nivel 1 |
| --- | ---: | ---: |
| High Card | 5 | 1 |
| Pair | 10 | 2 |
| Two Pair | 20 | 2 |
| Three of a Kind | 30 | 3 |
| Straight | 30 | 4 |
| Flush | 35 | 4 |
| Full House | 40 | 4 |
| Four of a Kind | 60 | 7 |
| Straight Flush | 100 | 8 |

Una escalera admite A2345 o TJQKA, sin envolver QKA23. Royal Flush se normaliza a Straight Flush. Elegir la categoría de mayor prioridad, no la que más puntúe con comodines. High Card puntúa una carta máxima; en empate elegir la primera máxima de la lista jugada (con este alcance el empate no cambia el resultado). Pareja/trío/póker puntúan las cartas del grupo; dos parejas puntúan cuatro; el resto cinco. Nivel distinto de 1 usa las bases observadas en el juego, no una fórmula de niveles inferida.

En este catálogo sin XMult, mejoras ni retriggers: `puntos = (baseChips + suma de fichas de cartas puntuadas + bonusChips) × (baseMult + bonusMult)`. No es una fórmula universal para Balatro. La secuencia de activación sigue siendo explícita para no bloquear ampliaciones.

## R-J: catálogo cerrado de ocho comodines

Precios base sin descuentos ni ediciones. La entrada manual del precio de compra/venta visible manda; una discrepancia se valida como posible modificador incompatible, no se corrige silenciosamente. Todos son comunes y disponibles desde el inicio según las fichas comunitarias.

| ID | Efecto para implementar | Compra / venta base | Fuente (D salvo indicación) |
| --- | --- | --- | --- |
| `joker` | +4 Mult independiente. | 2 / 1 | [Joker](https://balatrogame.fandom.com/wiki/Joker) |
| `half_joker` | +20 Mult cuando se juegan como máximo 3 cartas; cuenta jugadas, no solo puntuadas. | 5 / 2 | [Half Joker](https://balatrogame.fandom.com/wiki/Half_Joker) |
| `abstract_joker` | +3 Mult por comodín poseído, incluyéndose a sí mismo. Recontar después de cada venta/compra. | 4 / 2 | [Jokers](https://balatrogame.fandom.com/wiki/Jokers), [detalle de inclusión](https://teemo.dev/game-design/balatro/wiki/jokers/abstract-joker/) |
| `even_steven` | +4 Mult por carta puntuada de rango 2, 4, 6, 8 o 10. Las figuras no son rango 10. | 4 / 2 | [Jokers](https://balatrogame.fandom.com/wiki/Jokers) |
| `scholar` | Cada as puntuado añade 20 fichas y 4 Mult. | 4 / 2 | [Scholar](https://balatrogame.fandom.com/wiki/Scholar) |
| `banner` | +30 fichas por descarte restante al puntuar. | 5 / 2 | [Banner](https://balatrogame.fandom.com/wiki/Banner); cambio a 30 confirmado en P01 de [T01](evidencia/t01-reglas.md), precios/activación todavía sin E. |
| `green_joker` | Contador persistente inicial 0; una mano jugada suma 1; una acción de descarte resta 1 con suelo 0, independientemente de cuántas cartas descarta. Añade el contador al Mult. | 4 / 2 | [Green Joker](https://balatrogame.fandom.com/wiki/Green_Joker) |
| `golden_joker` | Añade 4 dólares al cobro de una ronda ganada mientras se conserva. No añade puntuación. | 6 / 3 | [Golden Joker](https://balatrogame.fandom.com/wiki/Golden_Joker) |

[Guide: Activation Sequence](https://balatrogame.fandom.com/wiki/Guide%3A_Activation_Sequence) (D) sitúa el crecimiento de Green antes de puntuar. Orden propuesto: evento de mano → actualización Green → fichas de cartas/Scholar/Even → bonus independientes → multiplicación final. Confirmar U2 antes de declarar esas trazas verificadas. La reducción de Green se aplica por evento: `max(0,g-1)`; no usar una resta agregada que pierda el suelo entre eventos. No incluir el efecto de The Hook: es incompatible.

## R-ECO: economía y acciones

[Gameplay rules](https://balatrogame.fandom.com/wiki/Gameplay_rules) y [To the Moon](https://balatrogame.fandom.com/wiki/To_the_Moon) (D) sustentan un dólar por cada cinco del saldo y el tope base de cinco. Para saldo no negativo `B`: `I(B)=min(5,floor(B/5))`.

El saldo relevante es el que se tiene al calcular intereses al final de la ronda, no necesariamente el de salida de tienda. No sumar automáticamente recompensa de ciega/manos/Golden a la base de intereses del mismo cobro. [Referencia comunitaria sobre el cobro](https://teemo.dev/game-design/balatro/systems/hands-blinds-and-scoring-reference/) apoya esa separación. En T01 la [sección de economía](https://teemo.dev/game-design/balatro/systems/economy-money-interest-and-the-shop/) describe además que el desglose visual no significa que los importes ya estén en el saldo usado para interés. Sigue siendo evidencia D: no elevar ese orden a E ni inferirlo solo del orden de líneas de la pantalla. Ver U1 y los casos I01–I05 de T01.

En nuestro alcance sin dinero durante las manos, sin consumibles ni ventas durante la ronda, la hipótesis de trabajo es:

```text
B = saldo después de la acción de tienda
I = min(5, floor(B / 5))
saldo de próxima tienda = B + recompensaCiega + manosNoUsadas + 4*nGolden + I
```

La última línea está condicionada a ganar y al número real de manos usadas; todavía requiere U1. La pérdida de interés `I(Bantes)-I(Bdespués)` es por un cobro bajo esos supuestos, no una penalización perpetua. Nunca sumar ingresos de rondas perdidas o posteriores al final del ante 8.

[The Shop](https://balatrogame.fandom.com/wiki/The_Shop) (D): tienda tras vencer una ciega; dos ofertas de cartas por defecto, además de paquetes y vale. No generar tres ofertas simultáneas en fixtures. v0.1 registra las otras ofertas como fuera de comparación. Capacidad 5: para reemplazar, vender primero, acreditar su venta y después comprar si alcanza el saldo; no permitir una sexta carta temporal. No hay préstamos. Fórmulas locales exactas: compra `B-p`, venta `B+s`, reemplazo `B+s-p`. No inferir venta a partir de compra cuando existe valor observado.

## R-BLIND: objetivo y restricciones

[Blinds and Antes](https://balatrogame.fandom.com/wiki/Blinds_and_Antes) (D): bases White por ante 1–8: `300, 800, 2000, 5000, 11000, 20000, 35000, 50000`. Small usa ×1 y paga 3; Big ×1,5 y paga 4. The Psychic exige jugar cinco cartas, aunque no todas puntúen; The Water inicia con cero descartes. Ambos requieren ×2 y pagan 5; Water aparece desde ante 2. The Wall, desde ante 2, usa ×4 y paga 5. Violet Vessel, jefe final de ante 8, usa ×6 y paga 8. El objetivo visible se registra y contrasta con la tabla, sin sustituir diferencias silenciosamente.

Las manos que no satisfacen Psychic no puntúan. Para evitar depender de activaciones de manos inválidas todavía no verificadas, el asesor solo evalúa secuencias con cinco cartas por mano en ese jefe. El ante 8 solo se gana al derrotar al jefe, no al llegar al ante.

## Incertidumbres y puertas de validación

Estado histórico de T01 en la tabla siguiente. En H2, U1/U2 cuentan además con L01: implementadas como **provisionales**, mientras la comprobación ejecutada sigue pendiente. U3 tiene versión del archivo identificada, no observación del contrato completo. Ninguna prueba de software convierte una fila en evidencia E.

| ID | Incertidumbre / impacto | Resolución y criterio de salida |
| --- | --- | --- |
| U1 | Orden de intereses frente al cobro de Golden y recompensa. Afecta el coste real de invertir. | Pendiente E. Casos I01–I05 de T01: saldo 19 con/sin Golden; fronteras 24/25 y saldo 30 para demostrar el tope. Registrar antes, desglose y saldo después. |
| U2 | Momento exacto del incremento Green en la build objetivo; las fuentes lo describen antes de puntuar, sin comprobación propia. | Pendiente E. G01–G05 de T01: el resultado de la mano distingue incremento previo/posterior; el contador final solo no basta. Probar decremento por acción y suelo cero. |
| U3 | Las fuentes actuales no constituyen un snapshot completo de 1.0.1f-FULL. | Pendiente E y build local. V01–V04/C01–C06 de T01 fijan versión, configuración, precios y catálogo. La existencia del parche y el cambio de Banner sí están confirmados documentalmente por P01, no el contrato completo. |
| U4 | Calidad estratégica de las preferencias no validada. | Evaluación posterior con decisiones y desenlaces, separada de corrección de reglas. No bloquea un asesor rotulado experimental; sí bloquea promesas de ganar más. |

U1–U3 siguen pendientes, pero **no bloquean H0 ni H1** bajo la instrucción revisada. La versión condiciona la compatibilidad de los análisis; U1 condiciona validar cobros/intereses y U2 condiciona validar transiciones de Green. U3 se divide por módulo, no exige comprobar todo el catálogo antes de trabajar en otro. El [informe de evidencia](evidencia/t01-reglas.md) conserva los resultados observados, actualmente ausentes. Ninguna operación aritmética o fuente secundaria se registra como ejecución en Balatro.

## Registro implementado en H1

`src/rules/evidence.ts` registra alcance, procedencia, limitaciones y estado sin implementar estas fórmulas.

El registro anterior se conserva para H1/1.0.1f. En H2, `src/rules/engine-evidence.ts` declara las reglas de cálculo de 1.0.1o como provisionales, con L01 de tipo local_source; runtime.confirmation pendiente exige abstención cuando se solicita resultado observado. Los módulos shop/scoring/round/economy implementan las fórmulas separadamente. La identificación de version.jkr está confirmada como lectura de archivo; no como comportamiento en partida.

| Reglas | Estado | Evidencia y límite |
| --- | --- | --- |
| Compatibilidad de versión, momento de intereses y Green | Pendiente | Falta build identificada y observación; D01–D03 solo apoyan hipótesis. |
| Configuración, bases, precios, jefes, fórmula de interés, cambios de Green y demás efectos | Provisional | Fuentes comunitarias anteriores; no contrastadas directamente con esa build. |
| Banner +30 | Confirmada documentalmente | P01, anuncio primario. No certifica activación, precios ni observación en juego. |

Los estados `confirmed/provisional/pending` no sustituyen el tipo de evidencia `primary_document/secondary_document/game_observation`. Actualmente ninguna regla tiene observación en juego. Una dependencia pendiente o ausente obliga a abstenerse; una provisional limita el resultado explícitamente. Incluso una confirmación documental conserva su advertencia de falta de observación. La validación estructural no consulta el catálogo: poder guardar una build, saldo o contador no significa que un análisis sea compatible.


L05 (2026-10-12): [vales de interés y cobro automático](cobro-automatico.md). Seed Money/Money Tree integrados con evidencia estática y estatus provisional; la exclusión histórica de todos los vales se reduce a los no implementados.


L06: [Vales adquiridos](vales.md), inspección estática de recursos y requisitos en 1.0.1o-FULL. Provisional, sin observación en partida.
