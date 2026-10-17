# TAG01b — comparación condicional de ciegas

Entrega acotada sobre TAG01a, DEC00, T07b, H3 y SURV01. La selección muestra **Jugar / saltar** para consultar consecuencias; **Salté esta ciega** sigue siendo una confirmación real independiente. Versión objetivo Steam `1.0.1o-FULL`, sin mods, White, antes 1–8. Motor `0.8.1`; no cambia los formatos H1/T09b.

## Uso y cobertura

- Por defecto compara lo conocido: premio registrado de la ronda y oportunidad de tienda frente al efecto inmediato de saltar. No presupone victoria ni calcula un cobro sin un plan.
- Lote de recompensas proyectables: **Economía** e **Inversión**. Las otras 22 etiquetas siguen registrables como observaciones, pero su salto no se proyecta.
- Jugadas opcionales: el selector aplica los escenarios temporales de Análisis a **la ciega actual** o, por petición explícita, a **la siguiente tras saltar**. No se transfieren automáticamente cartas/robos de la ronda omitida. Cada plan se valida con el mazo y recursos de su rama.
- La siguiente ciega puede seguir sin jefe/objetivo compatibles. Eso limita sus planes, sin retirar el cálculo independiente del efecto económico del salto.
- El modo estricto exige evidencia de partida y conserva la abstención actual. La inspección del ejecutable no cumple esa exigencia.
- Se pueden consultar borradores válidos y pestañas de lectura. La consulta no guarda saldo, etiquetas, contadores, cartas ni resultados hipotéticos. Los planes siguen temporales al recargar.

No usa probabilidades, no valora ofertas futuras desconocidas ni adapta la estrategia de juego a cada opción. No declara óptimo un salto ni interpreta un plan insuficiente como derrota.

## Reglas H2 nuevas

Parámetros en `src/catalog/tag-effects.ts`; cálculos exclusivamente en `src/rules/tags.ts` y cobro H2:

| Operación | Resultado y límites |
|---|---|
| Saltar Economía | Ingreso `min(40,max(0,saldo))`. Saldo conocido requerido; deuda no genera ingreso negativo. El resultado respeta enteros seguros. |
| Saltar Inversión | Añade una `tag_investment` pendiente; ingreso inmediato cero. Promesa de $25 al superar un jefe, sin añadirla ahora al saldo. Puede conservar saldo desconocido. |
| Saltar Small/Big | Avanza la referencia en el mismo ante; no ronda ganada, cobro, manos consumidas ni tienda. Actualiza el total de saltos solo si el previo era conocido; el motor de Throwback ya utiliza ese total. |
| Cola al saltar | Debe conocerse; Double u otros disparadores `tag_add`, `immediate` o `new_blind_choice` pendientes impiden esta proyección. No se ignoran ni simulan sus duplicaciones. Otros efectos pendientes continúan limitando únicamente las operaciones afectadas de H2. |
| Cobrar Inversión | Al superar un jefe compatible, $25 por cada etiqueta pendiente. El interés conserva su base anterior al cobro; To the Moon no multiplica estos $25. Pequeña/Grande y derrota no los pagan. `finishRound` consume solo esas Inversiones, preservando las demás etiquetas. |
| Fin ante 8 | Se conserva el límite previo: no se proyecta dinero posterior al objetivo. No se amplía a endless. |

La cola desconocida/Juggle sigue limitando recursos; el viejo rechazo de Inversión en cobro de jefe se sustituye por el cálculo documentado. Reglas de etiquetas nuevas: `tags.skip`, `tags.economy`, `tags.investment`, todas **provisionales/documentadas**, con evidencia `L09`; sin observaciones nuevas en Balatro.

La proyección de salto conserva revisión/fecha: no es una confirmación. TAG01a/T09b continúan registrando un saldo y una cola finales **observados**, sin copiar esta proyección ni asumir que la predicción coincidió con el juego.

## Contrato del comparador

`compareBlindChoices(state, {requireObserved?, playScenarios?, afterSkipScenarios?})` devuelve:

- Vinculación de revisión y tokens del estado/opciones completos; `blindDecisionIsCurrent` detecta también cambios de borrador con la misma revisión.
- Resultado H2 independiente del salto, con traza y evidencia, o error localizado.
- Informes DEC00/H3 de jugar la ciega actual y, solo si se solicita, de jugar la siguiente tras saltar.
- Por escenario actual: objetivo alcanzado/no alcanzado/incompatible/no disponible, puntuación, manos/descartes, saldo tras cobro, diferencia frente al saldo inmediato del salto y consecuencias de inventario/contadores.
- Sacrificios de ronda/tienda, condiciones, límites y preferencia explícita o abstención.

El adaptador `selectionScenarioState` crea una copia de consulta con forma de entrada H2 de tienda y **sin ofertas comparadas**, únicamente para evaluar conservar el inventario y el plan de ronda. No describe una tienda real ni predice stock vacío. El estado original conserva su fase de selección. H2/T07b/H3 calculan manos, efectos, finalización temprana, recursos y cobro; el asesor no duplica sus fórmulas.

Las rutas tienen horizontes diferentes y visibles: jugar llega al cobro de la ronda actual, antes de gastar en tienda; saltar llega inmediatamente a la siguiente selección. Los planes después del salto aportan información adicional de esa siguiente ronda; no se restan sus puntos a los de la ronda actual ni se usan para fabricar equivalencia o probabilidades.

## Política `blind-1`

Sin pesos ni conversión entre dólares, puntos, contadores y tiendas. Los resultados de varios escenarios se conservan separados, sin promedio ni probabilidades asumidas.

| Regla | Criterio comprobable |
|---|---|
| `B-INCOMPLETE` | Sin planes actuales completos, efectos del salto sin implementar, evidencia insuficiente o familia persistente aún no cubierta por la preferencia: abstención. No implica que la rama no pueda jugarse o calcularse. |
| `B-CASH-CONDITIONAL` | Todos los planes actuales aportados superan la ciega y calculan cobro; todos dejan **estrictamente más dinero** que el salto; Economía sin cola previa ni recompensa diferida; las cartas, recursos y comodines permanecen iguales. Admite los ocho efectos iniciales: Joker, Half, Banner, Abstract, Even, Scholar, Golden y Green. Green no puede terminar con menor contador. Preferencia **condicional por jugar**, dependiente de ejecutar esos planes. |
| `B-TRADEOFF` | Saldo empatado/cruzado/inferior al salto, Inversión pendiente, cambios de inventario/recursos/contadores o crecimiento de Throwback: mostrar el intercambio sin una ganadora única. Las familias fuera de la regla anterior conservan abstención en vez de inventar una desventaja. |

El contador Green retenido no recibe puntos estratégicos ni precio: se exige no degradarlo para esa preferencia, mostrando su uso real en la rama. Throwback puede mejorar al saltar, pero esa mejora no se vende como utilidad demostrada sin manos futuras compatibles. La preferencia de H3 dentro de una sola ruta no se reutiliza como decisión global jugar/saltar.

Ejemplos sintéticos, posibles bajo las reglas inspeccionadas:

- Azul, ante1/Pequeña, sin comodines, $4 y Economía: el plan hipotético de escalera real puntúa `(100+11+10+10+10+10)×8=1208`, supera300 en una mano y deja `4+3+4+0=11` tras cobro; saltar deja8. Preferencia por jugar **si se puede ejecutar ese plan**, sin afirmar frecuencia de robo.
- Mismo escenario con $20: jugar deja `20+3+4+4=31`; saltar40. Diferencia −9 para jugar, más la tienda omitida al saltar: intercambio explícito, no precio asignado a la tienda.
- Con Inversión y $4: saltar conserva4 y deja25 condicionados al jefe; no se compara como si tuviera29 disponibles.
- Green7 en ante2/Pequeña (adquirido y crecido antes): una mano sin descartes termina8; dos descartes previos y esa mano terminan6. Se conservan el saldo calculado y la pérdida de contador por separado.

## Evidencia primaria y contraste pendiente

Inspección del mismo ejecutable propio identificado en [TAG01a](etiquetas-tag01.md), SHA256 `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`, `version.jkr=1.0.1o-FULL`. No se ejecutó una partida para estas comprobaciones.

| Regla/hipótesis | Caso mínimo; esperado independiente | Observado y fuente | Estado |
|---|---|---|---|
| Economía, tope40 y suelo0 | Saltar con20:40 final; con61:101; con deuda−4:−4 | `game.lua` P_TAGS `config.max=40`; `tag.lua:176–189`, suma de mínimo entre tope y saldo no negativo | Inspección confirmada; partida pendiente |
| Inversión25 por etiqueta | Dos Inversiones, saldo7 antes de jefe; en cobro con3 manos sobrantes y sin otros ingresos: `7+5+3+50+1=66` | `game.lua` `config.dollars=25`; `tag.lua:117–129`; `functions/state_events.lua:1183–1207` suma devolución a acumulador de cobro, interés usa `G.GAME.dollars` previo | Inspección confirmada; partida pendiente |
| Consumo, sin duplicar pago | Superar jefe con dos Inversiones y Double; desaparecen solo las dos Inversiones | `tag.lua:83–99,117–129`, marca disparada y eliminación de etiqueta | Inspección confirmada; partida pendiente |
| Salto sin ronda/tienda y Throwback | Saltar Small, registrar referencia, saldo, cola y total antes/después | Callback `functions/button_callbacks.lua:2740–2800`, `card.lua` contexto skip_blind y fórmula Throwback ya integrada | Inspección confirmada; partida pendiente |

Huellas de `game.lua`, `tag.lua` y callback en TAG01a. Fuente adicional `functions/state_events.lua` SHA256 `6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9`. No se redistribuye Lua.

Si se contrasta manualmente, empezar por **una Economía**: capturas antes con versión/perfil ya conocidos, ciega, etiqueta y saldo; después de terminar todos los efectos, nueva selección, saldo y cola. Después, cuando aparezca Inversión, registrar cola/saldo antes del jefe y todas las líneas del cobro después de superarlo. No se solicita observar el resto del catálogo para continuar tareas independientes. Aritmética, tests y navegador no sustituyen esas observaciones.

## Verificación y continuación

`npm.cmd run check`: 683 aprobadas, 0 fallos y 10 TODO empíricas anteriores; dieciséis casos nuevos, con esperados literales independientes, incluida representación equivalente preset/cartas, inversión múltiple, Verde/To the Moon, crecimiento y caducidad. `npm.cmd run demo:blinds` muestra tres comparaciones sintéticas. `npm.cmd run test:blinds` ejecuta siete grupos de Chrome; [recibos y capturas](evidencia/blind-decision/README.md).

TAG01 sigue **parcial** respecto al plan general: comparación limitada a dos premios, preferencia limitada a ocho efectos retenidos, sin tienda futura ni estrategia adaptada y sin contraste en partida. Siguiente tarea independiente: **SHOP02a, primer lote de compras confirmadas de vales H2 compatibles**, con precio observado, prerrequisitos, recursos y T09b; después sobres observados Buffoon/Celestial y etiquetas relacionadas. EVAL01 continúa pendiente para medir utilidad de los consejos.
