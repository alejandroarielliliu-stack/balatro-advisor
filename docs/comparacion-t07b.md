**Actualización T08c-1:** ahora también se enumeran ventas individuales al final; se calcula ingreso, puntos y beneficio sacrificado con H2 sobre el mismo plan. [Contrato actualizado](ventas-t08c.md). Las exclusiones de venta sola de la entrega original inferior quedan sustituidas por esta ampliación; siguen excluidas secuencias de múltiples ventas/compras.

# T07b — comparación de escenarios explícitos

Actualización posterior: [H3](asesor-h3.md) ya añade política y consejo sobre esta API. T07b mantiene su contrato descriptivo sin ranking propio; las menciones a H3 pendiente al final documentan la entrega anterior.

Entrega: 2026-10-10. Implementada y probada como software sobre el [motor H2 provisional](motor-h2.md). No constituye un asesor estratégico ni una validación en partida. La versión del motor de reglas permanece 0.2.0; el nuevo contrato de escenario es `scenario-1`.

## Ejecutar y consumir

Desde balatro-advisor:

```powershell
npm.cmd run check
npm.cmd run demo:compare
npm.cmd run demo:compare -- --json
```

La demo presenta cuatro escenarios sintéticos, definidos en [demo-scenarios.ts](../src/demo-scenarios.ts). El modo JSON imprime estados completos, secuencia, trazas y evidencia de cada rama. No guarda proyecciones en la partida real. La demo H2 anterior continúa en `npm.cmd run demo`.

Exportaciones de src/index.ts:

```ts
validateRoundPlan(plan); // Result<RoundPlan>
evaluateRoundPlan(state, plan, updatedAt, { requireObserved: false });
compareShopAlternatives(state, plan, {
  expectedRevision: state.revision,
  updatedAt: '2026-10-10T12:00:00Z'
});
```

El estado de [shop-purchase.json](../examples/shop-purchase.json) y el escenario [round-plan.json](../examples/round-plan.json) forman el primer ejemplo. Se cargan como JSON y se validan por separado. No hay acceso al disco, reloj, almacenamiento, DOM ni azar en evaluation/. Solo la CLI usa Node.

## Alcance de alternativas

Se enumeran conservar, una compra por oferta y una venta→compra por pareja de instancia poseída/oferta. Se permite reemplazar aun con espacio libre. Se reutiliza enumerateActions y se excluyen sus ventas sin compra para este comparador. Los candidatos ilegales permanecen visibles con errores; solo se evalúan los legales. Un reemplazo conserva los dos pasos y sus saldos en shop.value.steps.

Quedan fuera ventas solas, varias compras/ventas, reordenar comodines, rerolls, paquetes, vales, consumibles y cambios de plan por rama. `coverage.exhaustive` es false: no es búsqueda exhaustiva de todas las decisiones del juego. El orden es el del inventario y las ofertas, **no una preferencia**. Si falta la tienda se evalúa conservar y se devuelve enumerationErrors; no se afirma haber enumerado compras.

## Contrato del escenario

RoundPlan contiene schemaVersion, planId, description, initialHand, events y assumptions.noMoneyChangesDuringRound. Hay ocho cartas iniciales y de uno a cien eventos como límite técnico. Cada evento tiene type play/discard, entre una y cinco cardIds y drawIfContinues. No se transforma silenciosamente el RoundPlan histórico de H1, que no llevaba procedencia: el llamador debe aportar este contrato explícito. El esquema y guardado H1 no cambian.

Cada carta inicial o robada incluye cardId, knowledge (`known` o `hypothetical`) y basis (descripción obligatoria de la procedencia o hipótesis). `known` significa que el llamador declara una observación; no demuestra que la regla fue observada ni que esas cartas estén garantizadas para alternativas contrafactuales. Los ejemplos de la demo son íntegramente hipotéticos. La secuencia de selecciones conserva el orden indicado.

**drawIfContinues es condicional por definición:** representa los robos siguientes únicamente si quedan manos y aún no se vence la ciega. En una rama terminal se registran en skippedDraws y no se consumen. Los eventos siguientes aparecen como índices en unexecutedEventIndices. Este contrato evita cambiar silenciosamente el plan para una rama que gana antes. Si continúa, debe aportar exactamente la reposición requerida por H2; no se corrige un robo incompleto, una carta repetida o una acción sin recursos.

Se comprueba la estructura y pertenencia al mazo de todas las referencias. Disponibilidad, reposición, jefe, manos y descartes se comprueban al ejecutar cada evento. Los eventos posteriores al fin no se declaran legales ni se ejecutan. Las cartas forman la partición mano/disponibles/gastadas de H2. El motor no estima probabilidades ni predice el orden del mazo.

## Ejecución equivalente y resultados

Cada rama parte de una copia independiente de la misma revisión del estado y del mismo escenario, con idénticas cartas y supuestos externos. Solo difieren las consecuencias de su acción de tienda. Una preevaluación pura identifica si la mano termina la ronda; applyRoundEvent aplica una sola vez sus contadores y recursos. Las pruebas de Green verifican que esa preevaluación no duplica crecimiento.

Cada alternativa entrega action, shop (incluidos estados intermedios y traza), coste neto positivo al gastar, saldo inicial y tras tienda, evaluation y evidence. Si no se conoce un saldo se devuelve null, nunca cero supuesto. evaluation contiene puntuación y acumulado por evento, manos/descartes consumidos y restantes, round, finalState, contadores, eventos no ejecutados, errores y settlement cuando procede. Una acción ilegal tiene evaluation:null.

| outcome | Significado dentro del escenario |
| --- | --- |
| reached_target | Supera o iguala la ciega; se detiene inmediatamente. |
| plan_exhausted | Terminó la lista con manos disponibles. No demuestra pérdida de la partida. |
| hands_exhausted | Se usaron todas las manos sin vencer en este escenario. No es una predicción de la partida real. |
| incompatible | El siguiente evento no puede evaluarse; se conserva el prefijo válido y el error. Incluye datos faltantes, diferenciados por su código. |

En caso de error atómico de evento, no se consumen parcialmente cartas o recursos. settlement es un resultado separado de finishRound: recompensa desconocida o ausencia del supuesto de saldo constante no borran las puntuaciones ya calculadas. No se anticipa cobro para un plan agotado. Ganar el boss de ante 8 conserva cashout:null según el objetivo de H2. moneyAfterRound:null significa que no se calculó un saldo de cobro, no dinero cero. finalState sin settlement es la instantánea proyectada al último evento, no una partida lista para registrar la próxima tienda.

Las diferencias son respecto de conservar: puntos acumulados, dinero, manos y descartes. Se advierte que el número de manos puede diferir por finalización temprana. Se compara saldo tras cobro solo si ambas ramas lo tienen; no se mezcla un saldo sin cobro con uno ya cobrado. Reemplazar muestra el comodín vendido y sus contadores, con la pérdida de crecimiento de Green o ingreso de Golden explícita. Los contadores finales completos siguen disponibles para contrastar persistencia y crecimiento.

No hay puntuación estratégica, ranking ni desempate heurístico. recommendation es null incluso cuando hay ventajas claras en una dimensión. Esta decisión deja visibles intercambios entre dinero, puntos, recursos y crecimiento sin afirmar optimalidad fuera del escenario.

## Evidencia y verificación

Cada evento y rama conserva el gate de H2 y sus fuentes; el resultado superior agrega sus limitaciones por regla. Consultar también errores por rama y de settlement: una limitación de datos no es una nueva regla provisional. No se promueve ninguna regla a observada. `requireObserved:true` mantiene la abstención existente; en modo provisional no se añaden dependencias ajenas (conservar sin vencer no consulta interés; vender Green elimina su dependencia de puntuación).

`npm.cmd run check`: **72 aprobadas, 0 fallidas, 10 TODO manuales**, incluyendo las 57 pruebas anteriores y 15 nuevas. Tipos, build, demo H2 y demo de comparación pasan. El aviso Web Storage experimental corresponde a H1. Las expectativas literales y derivaciones están en [oráculos T07b](evidencia/t07b-oraculos.md), separados del código evaluado.

T07b está completo en su alcance de software; H2 sigue pendiente de contraste en partida. H3 aún necesita métricas por varias manos/escenarios representativos y adversos, criterios estratégicos explícitos, preferencias condicionales y pruebas de sensibilidad. El [backlog](backlog.md) mantiene T07c y T08 como pasos siguientes, sin Monte Carlo ni interfaz completa.

