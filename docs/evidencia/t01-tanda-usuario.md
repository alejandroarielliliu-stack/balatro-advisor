# T01 — primera tanda para la instalación del usuario

## Identificación recibida

**Actualización H2:** [L01](h2-inspeccion-local.md) leyó version.jkr en el ejecutable instalado: 1.0.1o-FULL. La transcripción original siguiente se conserva como antecedente, ya no impide identificar el contrato. La captura del menú servirá para vincular la sesión de pruebas con ese contrato; no se vuelve a pedir versión, plataforma o mods.

El usuario informa que Balatro está instalado, plataforma Steam y sin mods; transcribe la versión literalmente como **`1.01o-full`**. Fuente: conversación, declaración del usuario. No es una captura revisada ni una ejecución observada. No normalizar silenciosamente a `1.0.1o-FULL`: la captura inicial del menú fijará la cadena exacta sin volver a pedir los tres datos.

Esta instalación sustituye a 1.0.1f como candidata para las comprobaciones. El contrato histórico, fixtures y registro de evidencia 1.0.1f se conservan; no se certifica equivalencia entre versiones ni se activa el asesor cambiando una etiqueta. T01a tiene los datos declarados; queda contrastar la cadena visual y registrar el nuevo contrato antes de habilitar análisis. H1 sigue permitiendo guardar cualquier versión.

## Preparación mínima

Una captura inicial del menú con versión; usar Blue Deck/White Stake en una partida de prueba, Small o Big Blind. Si Blue no está desbloqueada, registrar la baraja y los recursos reales: intereses y Green pueden investigarse por separado, sin afirmar que se validó Blue. No reiniciar una partida importante ni modificar guardados para fabricar estados.

Los casos siguientes proceden de las hipótesis documentales D01–D03 de [T01](t01-reglas.md), anteriores al código. **No están verificados para la versión declarada.** Registrar discrepancias, no corregir el observado para ajustarlo al esperado. No se pide el catálogo completo ni los casos de tope en esta tanda.

## Tres casos agrupados

| Caso / regla o hipótesis | Estado mínimo y acción | Esperado bajo la hipótesis | Observado / estado |
| --- | --- | --- | --- |
| M-I1: recompensa/manos quedan fuera de la base de interés. | Saldo inmediatamente anterior al cobro B=19, sin Golden ni otros ingresos/modificadores de interés; ganar Small/Big. Registrar recompensa R y manos sobrantes H; R+H debe ser al menos 1 para distinguir el cruce de 20. | Interés 3, saldo posterior 19+R+H+3. Si R=3 y H=2: 27. Incluir esos ingresos en la base daría al menos 4. Fuente D01. | Sin observación; pendiente. |
| M-I2: Golden queda fuera de la misma base. | B=19 y exactamente un Golden normal, sin otros cambios de dinero; ganar Small/Big. Registrar R/H y el texto de Golden. | Golden 4, interés 3, saldo posterior 19+R+H+4+3. Fuente D01 y R-J. Contrastar con M-I1; si M-I1 contradice su hipótesis, no atribuir el resultado de M-I2 únicamente a Golden. | Sin observación; pendiente. |
| M-G1: incremento antes de puntuar, decremento por acción y suelo cero. | Green normal con contador 0 como único comodín, High Card nivel 1 mostrado como 5×1, cartas normales, al menos dos manos y tres descartes. Jugar K solo, después Q sola; descartar tres cartas en un clic y después una carta en cada uno de otros dos clics. Cada carta debe estar realmente disponible. | Primera mano 30 puntos y contador 1; segunda 45 y contador 2; descartes: 2→1→0→0. Incremento posterior daría 15 y 30 puntos respectivamente. Fuentes D02/D03. | Sin observación; pendiente. |

Para M-G1 no son obligatorios K/Q: cualquier carta normal individual sirve si se identifica antes su valor c. Primer esperado (5+c)×2 y segundo (5+c)×3. Confirmar que no se gana la ronda antes de terminar la secuencia. No sumar el acumulado como si fuera puntuación de una mano. Si bases, contador u otros efectos difieren, adaptar el caso antes de interpretar el resultado.

## Evidencia que recoger, solo cuando aparezcan las condiciones

- M-I1/M-I2: captura antes de la mano ganadora con saldo, inventario y recursos; captura del desglose completo de cobro; captura del saldo en la siguiente tienda antes de gastar. Anotar ausencia de vales, tags u otros efectos económicos; tooltip de Golden en M-I2. El saldo de antes sirve únicamente si no cambia durante esa mano.
- M-G1: vídeo continuo corto con contador inicial, base High Card, cartas seleccionadas, puntos y contador tras cada mano, y las tres acciones de descarte. Alternativa: capturas antes/después de cada acción, anotando número de cartas y puntos de cada mano.

No es necesario conseguir los tres casos en una sesión. Si todavía no aparece Golden/Green, registrar primero el cobro sin ellos. Otro saldo solo sustituye B=19 si sigue distinguiendo las hipótesis; el tope puede ocultar diferencias.

Al recibir evidencia registrar caso, versión visual, sesión, baraja/dificultad, estado, acción, esperado previo, observado, archivos y conclusión (coincide/contradice/no concluyente). Los casos de fórmula/tope I03–I05 y el resto del catálogo quedan para la dependencia concreta posterior.

## Observación recibida el 2026-10-10

[O-I1: captura directa del cobro](t11/balatro-cobro-2026-10-10.md) registra una variante con The Psychic: saldo 19, recompensa 5, cero manos y tres dólares de interés; cobro total 8. Coincide en ese caso con excluir la recompensa de la base. No prueba manos sobrantes, Golden, Green ni topes. Falta saldo posterior en tienda y vínculo visual de versión; no cierra el protocolo completo ni cambia automáticamente el registro de reglas.


Actualización O-I1: saldo posterior $27 confirmado por el usuario y capturado directamente en la tienda (t11/balatro-tienda-27-2026-10-10.png). Ese extremo ya no está pendiente; permanecen versión visual y las demás limitaciones del caso.
