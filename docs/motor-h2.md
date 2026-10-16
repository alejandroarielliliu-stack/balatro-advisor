# Motor H2 — entrega funcional provisional

**Vigente 0.6.0:** [CAT02](comodines-cat02.md), 41 efectos de comodín y cotas con ×Mult entero. Las cifras inferiores de ocho efectos son históricas.

**Vigente 0.5.0:** [DECK03](composicion-deck03.md), diez barajas, composición explícita y doce categorías. Las cifras inferiores de 0.4.0/DECK02 son históricas.

**Contrato vigente 0.4.0:** [condiciones de baraja DECK02](barajas-condiciones.md), siete perfiles integrados y quince catalogados. La referencia Blue/0.2.0 inferior es histórica. Puntuación y cotas aplican Plasma; rondas y tienda respetan capacidades; Verde necesita descartes para el cobro.

Actualización 2026-10-10: [T07b](comparacion-t07b.md) añade el evaluador de planes y comparación descriptiva sobre este motor. Los párrafos siguientes registran el alcance de H2 al entregarse; la evidencia de partida sigue pendiente.

Contrato activo: **1.0.1o-FULL, PC Steam, Blue Deck, White Stake, sin mods**; ruleset `balatro-pc-1.0.1o-blue-white-v1`, motor 0.2.0. Se mantienen ocho comodines, nueve categorías, mazo original y cuatro jefes. La identificación de versión y las reglas temporales tienen nueva [evidencia estática L01](evidencia/h2-inspeccion-local.md). No se ha ejecutado una partida de verificación.

## Ejecutar

Desde `balatro-advisor/`, con Node 24.x y las dependencias de H1:

```sh
npm ci
npm run check
npm run demo
```

En PowerShell se puede usar npm.cmd. `npm run demo -- ruta/al/ejemplo.json` acepta otro estado, con las ofertas/IDs y cartas concretas que utiliza este demostrador. Sin argumento carga [el ejemplo sintético](../examples/shop-purchase.json), lo valida, guarda y recupera con el store H1 en memoria, compra Half, imprime estados completos antes/después, ocupación y trazas. No sobrescribe el guardado real del navegador.

Resultado de la demostración: dinero **7→2**, plazas **0→1 de 5**, oferta o2 retirada, revisión 0→1; pareja de ochos **(10+8+8)×2=52 → (10+8+8)×(2+20)=572**. Se conserva la entrada. La cabecera y los resultados indican que son provisionales.

## API pública y separación

Exportaciones desde src/index.ts. H1 conserva su esquema 0.1, validaciones y persistencia sin cambios. El motor no importa DOM, almacenamiento, Node, red, reloj ni generadores aleatorios; solo la CLI importa Node. IDs de nueva instancia, revisión esperada y fecha de edición se suministran explícitamente.

| Operación | Contrato |
| --- | --- |
| applyShopAction(state, action, mutation, options?) | Hold, buy, sell o replace. Devuelve state proyectado, plazas libres/ocupadas, pasos y traza; replace ejecuta venta y compra y solo devuelve éxito si ambas son legales. |
| enumerateActions(state, mutation, options?) | Candidatos y causas de ilegalidad; no recomienda ni ordena por valor estratégico. |
| scoreHand(state, {cardIds, discardsRemaining}, options?) | Clasifica, selecciona cartas puntuadas y devuelve fichas, Mult, total, Green posterior hipotético y traza. No consume recursos ni modifica contadores de entrada. |
| interestOnBalance(state, options?) | Interés del saldo explícito; no afirma que ese saldo vaya a mantenerse al cobro. |
| projectCashout(state, {handsRemaining, won, noMoneyChangesDuringRound}, options?) | Proyección condicional de recompensa, manos, Golden, interés y saldo. Exige declarar ausencia de cambios de dinero durante la ronda. |
| beginRound(state, initialHand, options?) | Ronda derivada a partir de ocho cartas explícitas; aplica recursos y Water. |
| applyRoundEvent(round, event, mutation, options?) | Play/discard con cartas realmente disponibles y robos explícitos; actualiza puntuación, recursos y Green, detiene al vencer/perder. |
| finishRound(round, mutation, options?) | Finaliza ronda ganada/perdida; conserva Green, aplica cobro cuando procede y devuelve un borrador para registrar nueva ciega/tienda. Ante 8 ganado: goalReached y cashout:null, sin ingresos posteriores proyectados. |

`mutation = {expectedRevision, updatedAt}`. Una compra/venta/evento incrementa revisión; replace incrementa dos veces y conserva ambos pasos. Error de compra después de venta no devuelve una venta parcial ni altera la entrada. Cada función es pura: repetir una proyección con idéntica entrada devuelve lo mismo, no autoriza cobrar dos veces una partida real.

Resultado exitoso: `ok, value, trace, evidence, engineVersion, projected:true`. Error: `ok:false, errors[{path,code,message}], evidence, engineVersion`. Cada traza contiene ruleId, etiqueta y valores de entrada/contribución/resultado. Aritmética con enteros seguros; desbordamiento produce error.

**Proyecciones frente a hechos:** los estados de salida conservan la forma H1 para poder revisarlos y eventualmente guardarlos, pero el envoltorio projected:true identifica que todavía no son observaciones. Los Fact de valores calculados usan el formato de entrada manual de H1; eso no constituye procedencia observada. Un consumidor no debe guardar value.state como una partida realizada sin confirmación de que el usuario hizo la acción. Los contadores round y los resultados derivados no se agregan al JSON H1 como campos autoritativos.

RoundState es efímero; hand/remaining/spent forman una partición completa del mazo. No tiene robos aleatorios ni semilla: drawnCardIds es entrada observada o hipotética, nunca generada. La cantidad de robos debe reponer la mano si la ronda sigue activa; al terminar debe ser cero. No se implementó todavía un corredor de todos los roundPlans del estado ni un asesor.

## Cobertura y restricciones reales

- Clasificación por prioridad, A2345 y TJQKA, sin escalera circular; Royal normalizada a Straight Flush. Acompañantes excluidos de puntuación. Bases transcritas para cualquier nivel positivo; no se calculan incrementos de planetas.
- Orden: categoría/base; incremento Green; cartas puntuadas en orden con Scholar/Even según orden de comodines; efectos independientes de comodines; fichas×Mult. Golden no aporta puntos; Abstract se cuenta a sí mismo.
- Green nuevo comienza en cero; el poseído requiere contador conocido al calcular su efecto. Descartar resta una vez por acción con suelo cero; fin de ronda no lo resetea. Desconocer su contador no impide venderlo o calcular interés.
- Small/Big y Psychic/Water/Wall/Violet Vessel, con objetivos del alcance. Psychic exige cinco cartas; no se implementan activaciones de manos inválidas del jefe. Water deriva cero descartes desde recursos base. Jefe futuro desconocido no bloquea un cálculo sobre la próxima Big conocida.
- Compra sin dinero/plazas, revisión obsoleta, oferta agotada, IDs repetidos, duplicado de catálogo, comodín no compatible, edición/sticker, precio/venta diferente del catálogo base y recursos alterados producen errores. Una oferta incompatible puede aparecer entre candidatos, pero queda ilegal con causa.
- Mazo explícito admite IDs propios siempre que enumere las 52 combinaciones normales; otros mazos, mejoras, sellos, fichas permanentes, vales, consumibles y tags están fuera de cobertura. H1 puede guardarlos; H2 no los trata como cero.
- No se implementan rerolls, paquetes, préstamos, descuentos, múltiples compras como estrategia, cotas de S09, comparación estratégica, interfaz completa ni simulación. Las llamadas repetidas a compra son transiciones mecánicas, no una ampliación de la política de una acción por análisis.

## Evidencia y cierre

`getEngineRuleRegistry()` es el registro activo 1.0.1o. `getRuleRegistry()` y `assessAnalysis()` se conservan para la metadata histórica H1/1.0.1f; no habilitan el motor nuevo. No se transforma un estado 1.0.1f en 1.0.1o automáticamente.

El motor usa solo las dependencias de cada operación. Todas sus reglas de cálculo son provisionales con fuentes y advertencias; U1/U2 se implementan ahora por el sustento adicional de L01. No se desactivó una puerta pendiente sin evidencia: se documentó la reclasificación de hipótesis y se mantuvo pendiente su **confirmación ejecutada**. La regla runtime.confirmation sigue pendiente. `options={requireObserved:true}` exige esa evidencia y devuelve pending_rule; una futura dependencia pendiente/ausente también bloquea la operación que la use. No existe opción para inventar un resultado de una regla pendiente.

Verificación de software: **57 pruebas aprobadas, 0 fallidas, 10 TODO de ejecución manual**, incluyendo las 23 pruebas H1 existentes; tipos y build correctos. `npm run demo` también ejecutado correctamente. El aviso experimental de Web Storage pertenece a la prueba de persistencia H1 de Node, no al motor. [Oráculos y qué demuestran](evidencia/h2-oraculos.md).

**H2 parcial, no cerrado:** la entrega funcional y sus pruebas documentales están disponibles; T01 aún necesita resultados en partida para declarar reglas contrastadas. H3 comenzará con una matriz de alternativas sobre las mismas manos/planes, consumiendo estas trazas y sus limitaciones, sin porcentajes ni una puntuación estratégica opaca. No se implementó H3 en esta entrega.
