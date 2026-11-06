# STR02 — perfiles cualitativos de etiquetas

5 de noviembre de 2026. Evidencia para orientación, no ampliación del ejecutor de etiquetas. Versión Steam PC `1.0.1o-FULL`, sin declarar una nueva partida observada.

## Método

Lectura de los archivos ZIP contenidos en la instalación propia `Balatro.exe`, sin ejecutar Lua, iniciar el juego ni modificar su instalación. La versión y huellas coinciden con TAG01a/TAG01b:

- Ejecutable SHA256: `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`.
- `game.lua`: `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912`.
- `tag.lua`: `42b589519d7f6e4dd14fc4628198386daae1bbc011ba4125f86eec4e1ec29fe3`.

No se redistribuye el código propietario. Las descripciones siguientes siguen siendo provisionales respecto a ejecución real; no activan reglas nuevas de H2.

| Regla / hipótesis | Caso mínimo propuesto y resultado esperado independiente | Resultado de la inspección | Evidencia | Estado |
|---|---|---|---|---|
| Economía depende del saldo, con tope de su definición | Saldo20 al recoger: ingreso20, sin tienda por el salto | La definición establece tope40; el efecto utiliza el saldo no negativo hasta ese tope | `game.lua:248`, `tag.lua:176–189`; TAG01b ya documenta los cálculos | Inspección confirmada; partida pendiente |
| Inversión es diferida | Recogerla no suma25 al saldo disponible; vencer al jefe la hace cobrable | El disparador exige evaluación de una ciega jefe completada | `game.lua:231`, `tag.lua:117–129` | Inspección confirmada; partida pendiente |
| D6 no concede dinero ni compras gratuitas | Próxima tienda sin otros modificadores: base temporal de renovar0; renovar no se interpreta como comprar una carta gratis | El efecto fija la base temporal0 y recalcula sin incremento inicial. El coste general incorpora incrementos posteriores | `game.lua:244`, `tag.lua:382–391`, `functions/common_events.lua:2263–2268` | Inspección confirmada; efecto no ejecutado en Advisor; partida pendiente |
| Cupón afecta cartas y sobres iniciales pertinentes | Una carta y un sobre de la tienda pasan a coste0; no asumir vale gratis ni todas las renovaciones gratis | El efecto marca las áreas de cartas y sobres; el cálculo de precio reconoce esa marca en dichas áreas | `game.lua:241`, `tag.lua:447–462`, `card.lua:383` | Inspección confirmada; efecto no ejecutado en Advisor; partida pendiente |
| Double depende de la siguiente etiqueta pertinente | Recoger otra Double no dispara su duplicación; otra etiqueta puede duplicarse | La condición excluye identidad `tag_double` y agrega copia de la etiqueta recibida | `game.lua:242`, `tag.lua:319–332`; TAG01a | Inspección confirmada; efecto no ejecutado en Advisor; partida pendiente |

**Resultado observado en una partida: pendiente para todos los casos de esta tabla.** Una suma aritmética, una prueba automática o esta lectura estática no sustituyen esa observación.

Las inferencias estratégicas se prueban por separado con casos congelados: conservar oportunidades de ronda/tienda, valor diferido, desgaste y sinergias. El perfil no asigna una nota, precio o probabilidad a una etiqueta y no convierte una recompensa desconocida en cero.

El primer contraste manual, cuando corresponda, puede limitarse a D6: registrar etiqueta y cola, siguiente tienda y coste de renovar antes/después de una renovación. No se solicita recopilar todo el catálogo para continuar las tareas independientes.
