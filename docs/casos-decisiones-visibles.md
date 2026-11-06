# P01 — casos previos a decisiones visibles

5 de noviembre de 2026. Banco de desarrollo para [el plan de las dos quejas](plan-decisiones-visibles.md). Las entradas y expectativas se fijaron antes de ejecutar el nuevo asesor de ciegas o el comparador ampliado sobre estos casos. Se leyó código de las políticas **anteriores** y contratos existentes; no se presentan estas expectativas como una evaluación ciega independiente del proyecto.

## Uso y límites

- [Entradas y expectativas](../evaluation/fixtures/decisiones-visibles-development.json): 16 casos con `state`, `options`, `mechanicalOracles` y `behaviorOracle`; los cinco de tienda incluyen `snapshot`. El contexto de lectura está en `interaction`, no en el estado de Balatro.
- [Congelación](../evaluation/fixtures/decisiones-visibles-freeze.json): SHA256 de bytes exactos y momento previo a la primera ejecución del nuevo evaluador sobre el banco.
- Quince casos son escenarios sintéticos compatibles con Steam PC `1.0.1o-FULL`, Azul, Blanca, sin mods. El decimosexto es una entrada defensiva identificada expresamente: Eternal en Blanca no cuenta como una partida naturalmente alcanzable con ese perfil.
- Los estados fueron comprobados mediante H1. Esa validación verifica estructura, no reproduce una partida ni demuestra optimalidad. Las expectativas mecánicas son importes o restricciones literales documentadas; las heurísticas son contratos de conducta propuestos.
- No se utiliza el conjunto reservado EVAL01. No se infieren frecuencia de robos, porcentaje de victoria, precio de una tienda futura ni dinero garantizado por jugar.

## Tienda

| ID | Estado y pregunta | Comprobación independiente |
|---|---|---|
| DV-SHOP-01 | $20, inventario vacío, Joker$2 y Abstract$4. ¿Se encuentra la comparación básica? | Conservar20; comprar Joker18; comprar Abstract16. Las tres ramas visibles sin manos de prueba ni escrituras |
| DV-SHOP-02 | $20, Green7 (venta2) y Joker (venta1), Abstract$4 y Golden$6 | Vender Green deja22; sustituirlo por Abstract deja18 y pierde su contador7; sustituir Joker deja17. Comprar, vender y ambos reemplazos mantienen identidades distintas |
| DV-SHOP-03 | $20, cinco comodines vendibles, Abstract$4 | Comprar sin vender está bloqueado por capacidad; vender Riff-Raff3 y comprar deja19; vender Joker1 y comprar deja17. Las otras cuatro variantes no se ocultan por el bloqueo de compra |
| DV-SHOP-04 | Copia defensiva del anterior, con Riff-Raff Eternal | Venta y reemplazo de esa instancia ilegales; las otras alternativas continúan. **Entrada estructural defensiva, fuera del conjunto de partidas naturales Blanca** |
| DV-SHOP-05 | $20, precio de Joker sin transcribir, Abstract$4; pestaña en lectura | El desconocido no vale cero; Abstract puede calcular16, el alcance permanece parcial y se consulta sin escribir ni habilitar confirmación desde lectura |

Las ventas no reciben una preferencia universal. Se exige mostrar ingreso y efecto/counter sacrificado; no asignarles un precio estratégico inventado. La selección hipotética conserva estado, historial y estado de edición real.

## Ciegas

Todos los casos carecen de planes explícitos. La supervivencia queda sin certificar.

| ID | Contexto | Contrato esperado |
|---|---|---|
| DV-BLIND-01 | Ante1/Pequeña, $4, Economía | Orientación condicional por jugar y conservar tienda, con condición económica y supervivencia explícitas |
| DV-BLIND-02 | Mismo contexto, $20 | La compensación concreta evita «jugar siempre»; intercambio o salto condicionado, sin valorar la tienda en dólares |
| DV-BLIND-03 | D6, beneficio cualitativo documentado pero ejecución pendiente | Orientación útil con la condición de tienda futura y el límite mecánico; no llamar mala a la etiqueta ni tratar el efecto como ejecutado |
| DV-BLIND-04 | Inversión, $4 | El saldo inmediato sigue4, ingreso0 y promesa25 al ganar un jefe; no29 disponibles ni jefe ganado por adelantado |
| DV-BLIND-05 | Economía$4 y jugador declara «voy justo» | Retirar preferencia automática por jugar; la declaración no prueba que saltar haga segura la siguiente ciega |
| DV-BLIND-06 | Economía y Double pendiente | No ignorar ni simular la duplicación; condición relevante visible y sin preferencia automática por jugar |
| DV-BLIND-07 | Economía y cola desconocida | Localizar esa incertidumbre; no asumir cola vacía ni ingreso garantizado |
| DV-BLIND-08 | Ante2/Pequeña, Throwback y dos saltos previos | Reconocer incentivo de salto sin convertir contador en utilidad futura garantizada |
| DV-BLIND-09 | Economía, modo estricto | Mantener falta de evidencia observada; una orientación heurística no certifica reglas provisionales |
| DV-BLIND-10 | Jefe | Saltar no se ofrece como acción legal; jugar no implica victoria garantizada |
| DV-BLIND-11 | Ante2/Pequeña, Popcorn12 | Reconocer desgaste al terminar ronda; jugar no significa crecimiento universal. Historia posible: compra tras Pequeña de ante1 y dos rondas posteriores completadas |

Economía ofrece ingreso `min(40,max(0,saldo))` según la evidencia L09 existente. Para el caso01, si se gana sin cambios de saldo ni ingresos adicionales, quedan0..4 manos y el cobro es `3 + manos + 0`: ingresos3..7, saldo7..11. Desde una mano restante iguala los4 que ofrece Economía; la visita a tienda es un motivo separado. **No se supone que pueda dejar esa mano.**

En caso02, bajo esos mismos supuestos, el interés aislado es4 y el cobro es `3 + manos + 4`: ingresos7..11, saldo27..31. No iguala el ingreso20 del salto dentro de ese intervalo. Esto justifica exigir intercambio, sin demostrar que saltar sea óptimo ni asignar un precio a la tienda omitida.

## Procedencia y cierre

Cada caso conserva sus `sourceIds`; el banco incluye rutas y localizadores. D6 procede de la inspección estática de [STR02a](evidencia/str02-etiquetas.md). Economía, Inversión, cola y avance reutilizan [TAG01b](comparacion-ciegas-tag01b.md). Se separa inspección de ejecutable de observación de una partida.

P01 cierra la preparación de estas expectativas y su estructura. Que una implementación cumpla este banco no cerrará EVAL02 ni demostrará utilidad real con jugadores. Cualquier ampliación posterior debe añadirse como un lote nuevo, sin reescribir estos resultados esperados a partir de la salida evaluada.
