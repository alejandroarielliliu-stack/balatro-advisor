# Consecuencias y supervivencia en planes explícitos

DEC01/SURV01, entrega del 16 de octubre de 2026. Primera integración visible del [informe DEC00](contrato-decision-dec00.md) con consecuencias inmediatas de H2 y resultados de H3/T07b. No añade una política nueva ni estima supervivencia automáticamente a partir de la valoración editorial.

## Uso

Abre **Decisión de tienda** en Mesa. Bajo cada opción compatible aparecen el dinero antes/después, los huecos libres que cambia y, en un reemplazo, el comodín y los contadores sacrificados. Las cifras proceden de una prueba independiente de H2; no son una adquisición registrada.

Sin planes, se indica **Supervivencia sin evaluar**. La valoración por composición continúa con los datos básicos actuales; no exige introducir jugadas.

Para comparar puntos y objetivo:

1. Configura tus escenarios explícitos en **Análisis**, con cartas, jugadas y supuestos.
2. Vuelve a Mesa → **Decisión de tienda** → **Comparar escenarios de Análisis**.
3. La tabla agrupa cada plan y muestra conservar/compras/reemplazos seleccionados: objetivo, puntos, manos/descartes y diferencia de saldo de tienda frente a conservar.
4. Abre una alternativa para consultar las diferencias comparables tras el cobro, los contadores que cambiaron y los errores de esa rama. **Solo valoración** desactiva esta capa.

Al comparar planes, el consejo por composición queda en un apartado cerrado separado. La preferencia visible en los planes procede de H3 y se identifica como tal: no representa una comparación completa con vales, sobres o futuros contenidos desconocidos. No se mezclan ambas políticas para inventar una recomendación global.

Los escenarios siguen siendo temporales y explícitos. No se crean plantillas automáticamente, no se modifican los planes para favorecer una compra y no se copian al registro real. Si están incompletos, se eliminan los resultados anteriores y se mantiene la valoración básica. Cambiar cartas, planes u ofertas obliga a recalcular; la confirmación real sigue usando T09b/SHOP03a.

## Contratos añadidos

`ActionCapability.consequences` contiene diferencias entre los estados inicial y posterior **devueltos por H2**: dinero, espacios ocupados/libres, recursos, instancias añadidas/retiradas y cambios de contadores conservados. Una transacción que falla no tiene consecuencias calculadas. Un dato desconocido permanece `null`; no se supone cero. La identidad retirada conserva sus hechos para explicar qué se sacrifica; los contadores no se transfieren al comodín nuevo.

`ShopDecision.scenarioConsequences` es una proyección de los resultados existentes de H3/T07b. No aplica fórmulas de juego ni reordena alternativas. Conserva por plan:

- Objetivo alcanzado, plan insuficiente, incompatible o sin cálculo, con métricas y errores.
- Diferencias frente a conservar: puntos solo cuando se consumieron las mismas manos y descartes; con parada temprana distinta se muestran los consumos propios y el objetivo, sin presentar una resta de puntos como potencia equivalente.
- Saldos tras tienda; diferencias tras cobro solo cuando ambas ramas alcanzaron el objetivo y ambos cobros se conocen. No se resta un saldo aún sin cobrar de otro liquidado.
- Cambios observados en las copias proyectadas de los contadores. Cambiar un contador no demuestra crecimiento útil; la valoración sigue dependiendo de las activaciones y planes evaluados.
- Comodines sacrificados y sensibilidad si una alternativa supera unos planes y otros no. No se promedian planes ni se muestran porcentajes de éxito.

La síntesis de cada alternativa distingue `not_assessed`, `reaches_all`, `reaches_some`, `reaches_none` e `incomplete`. Estos estados describen exclusivamente los planes aportados. Una lista vacía produce falta de evaluación y abstención, sin el error anterior de candidatos inexistentes. Modo estricto, identidad de ofertas, estados desconocidos y evidencia provisional conservan las puertas de DEC00/H2.

## Pruebas y ejemplo

```powershell
npm.cmd run demo:consequences
npm.cmd run check
npm.cmd run test:consequences
```

Con pareja de ochos y objetivo450, conservar da52, Joker156 y Half572: solo Half supera ese plan. Con escalera real de picas, las tres alternativas superan450 con1208/1812/1208; H3 prefiere conservar por dinero. Las fórmulas independientes y casos de parada temprana, reemplazo, sensibilidad, recursos incompatibles y desconocidos se registran en [evidencia](evidencia/consecuencias/README.md).

Esta entrega completa la comparación visible **con planes explícitos** de DEC01/SURV01. Quedan la estimación automática de capacidad (SURV02), juego adaptado por compra, validación estratégica EVAL01, TAG01 jugar/saltar y SHOP02a sobres. No se presenta el asesor como final ni se cierran las verificaciones manuales de reglas. La próxima entrega del recorrido puede abordar TAG01 dentro de su cobertura, conservando abstención cuando falten datos para valorar el coste de saltar; no depende de introducir Monte Carlo.
