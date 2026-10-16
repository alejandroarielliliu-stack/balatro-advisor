# CAT04 · Comodines con resultados aleatorios explícitos

Compatible con Steam PC, sin mods, **1.0.1o-FULL**. Evidencia **provisional por inspección estática del ejecutable instalado**; estas comprobaciones no son observaciones realizadas durante una partida. Regla del motor: `jokers.random`.

## Fuente inspeccionada

Archivo local: `C:\Program Files (x86)\Steam\steamapps\common\Balatro\Balatro.exe`, leído como ZIP. No se altera ni se distribuye el ejecutable.

| Entrada | SHA-256 |
|---|---|
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |

Precios, valores y compatibilidad con Blueprint: `game.lua` líneas 394–395, 407, 411, 414, 432, 454, 491 y 501. Los valores de venta base son `floor(precio/2)`, siguiendo la política de tienda ya implementada.

## Cobertura y oráculos

| Comodín | Regla | Punto del código inspeccionado | Caso mínimo / esperado independiente |
|---|---|---|---|
| 8 Ball | Cada 8 puntuado tiene probabilidad normal/4 de crear un Tarot si cabe; cada repetición vuelve a comprobar capacidad y tirar. | `card.lua` 3106–3129 | 8H con dos espacios y rama fallida: cero Tarots. Rama exitosa con `c_fool` explícito: un Tarot. Capacidad completa: sin tirada ni creación. |
| Misprint | Entero 0–23 de Mult en joker-main. | `card.lua` 3700–3705 | Rama 7: +7 Mult; 24 o fracción: error. |
| Gros Michel | +15 Mult; normal/6 de destruirse al terminar la ronda. Su destrucción marca `gros_michel_extinct`. | `card.lua` 3020–3044 y 4022–4027 | Mult inicial 1 pasa a 16; destrucción explícita elimina solo su instancia y conserva el indicador. |
| Business Card | Figuras puntuadas: normal/2 de ganar $2, en cada activación. | `card.lua` 3175–3186 | K con éxito: $2; no figura: no tirada. Pareidolia permite la activación sobre cualquier carta. |
| Space Joker | normal/4 de subir la categoría jugada antes de leer sus factores. | `card.lua` 3420–3426; `common_events.lua` 464–469 | Pareja nivel 1 (10,2) pasa a nivel 2 (25,3). Dos ochos puntúan 123 tras subir, frente a 52 sin subida. |
| Cavendish | ×3 Mult; normal/1000 de destruirse al terminar la ronda. | `card.lua` 3020–3044 y 4028–4033 | Conservarlo en la rama declarada mantiene ×3; destrucción elimina su instancia. |
| Reserved Parking | Figuras retenidas: normal/2 de ganar $1, en cada activación de mano, incluida la repetición de Mime. | `card.lua` 3302–3320 | Q retenida con éxito: $1; Q puntuada no recibe este pago. |
| Bloodstone | Corazones puntuados: normal/2 de ×1,5 Mult, por activación. | `card.lua` 3247–3254 | Dos éxitos multiplican Mult por 2,25. Smeared hace compatibles los diamantes; Wild tiene palo; Stone no tiene palo. |
| Oops! All 6s | Cada instancia física dobla todos los numeradores de probabilidades listadas, incluidos riesgos de destrucción. Incompatible con Blueprint. | `card.lua` 608–611 y 665–668 | Un Oops convierte Bloodstone 1/2 en certeza; dos convierten Space 1/4 en certeza. Misprint sigue teniendo rango entero 0–23. |

La progresión de manos procede de `game.lua` 2002–2013: Pair +15 fichas/+1 Mult por nivel; High Card +10/+1; Two Pair +20/+1; Three of a Kind +20/+2; Straight +30/+3; Flush +15/+2; Full House +25/+2; Four of a Kind +30/+3; Straight Flush +40/+4; Five of a Kind +35/+3; Flush House +40/+4; Flush Five +50/+3. Space rechaza un nivel cuyos factores guardados no coinciden con esa progresión.

`functions/state_events.lua` 101 llama `end_of_round` antes de decidir el fin de partida: Gros/Cavendish pueden destruirse aunque la ronda resulte perdida. No se aplica `randomEvent` en `after_hand`, `discard` ni fases de tienda.

## Resultados explícitos y limitaciones

No se introduce RNG, promedio ni puntuación esperada. Una rama incierta sin resultado produce `needs_outcome` **solo cuando la condición del efecto se cumple**. Un efecto seguro por Oops se calcula sin resultado manual; declarar un fallo en ese caso produce `contradictory_outcome`.

Cada `EffectChoice` incluye `key`, `kind`, `value`, `knowledge` (`known` o `hypothetical`) y `basis`. Las claves tienen forma `fase:catalogId:instanceId:cardId:activación`, por ejemplo `card:bloodstone:bs-1:8H:2`. Se pasan **por evento o mano**; el mismo ID en otra mano no reutiliza una tirada a menos que el llamador lo declare. Las fases de esta familia son `before`, `card`, `held`, `main` y `end_round`. Para un Tarot de 8 Ball, la elección concreta tiene la clave de éxito seguida de `:created` y `kind: consumable`. No existe fallback que invente sus datos.

Los consumibles generados se escriben únicamente en la copia proyectada de `observed.jokerContext.consumables`; marcar un resultado como hipotético no lo convierte en dato observado del estado real. El contexto debe declarar capacidad e inventario. Los consumibles negativos no consumen capacidad base. La selección aleatoria futura del catálogo y sus restricciones se representa con el resultado concreto; no se predice su frecuencia sin semilla/modelo validado. El desbloqueo de Cavendish se guarda como contexto, pero no se afirma que vaya a aparecer en la tienda.

Blueprint/Brainstorm reciben la identidad de la copia física para distinguir las tiradas, aunque conserven los contadores del efecto copiado. La destrucción afecta solo al plátano físico. El modo estricto requiere observación en juego y sigue absteniéndose cuando esta regla provisional sea necesaria.

Las pruebas de `tests/random-jokers.test.ts` usan ramas y resultados literales obtenidos de esta inspección, incluidos límites, fases, capacidad, certeza con Oops y datos faltantes. La aritmética de los oráculos verifica la implementación; **no constituye prueba directa de una partida**.
