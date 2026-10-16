**Actualización T08c-3:** [auditoría integrada](auditoria-t08c.md) completada. `Advice.contextNotes` identifica un jefe posterior conocido o ausente sin calcularlo implícitamente. Scholar/Even explican cantidades del mazo estándar, sin probabilidades. No cambia la política h3-2 ni los guardados.

**Actualización T08c-1:** política vigente **h3-2**, mismas prioridades cualitativas con ventas individuales añadidas al universo de candidatos. [Contrato, oráculos y pruebas](ventas-t08c.md). Se admite sell en options.actions; sacrificed también cubre ventas solas. Las descripciones históricas de h3-1 de abajo conservan su contexto original.

**Actualización T07c:** [cotas conservadoras](cotas-t07c.md) disponibles como API y comprobación web adicional. No se cambia la política h3-1 ni se ordenan acciones por la magnitud de una cota. Los planes H3 y los certificados de insuficiencia del modelo son resultados distintos.

# H3 — asesor heurístico básico

Actualización posterior: [T09b](confirmaciones-t09b.md) ya implementa confirmaciones y guardado sin modificar este asesor. Las referencias inferiores a esa tarea como siguiente paso corresponden al cierre histórico de H3; ahora sigue T10.

Entrega de software: 2026-10-10. Política `h3-1`, motor H2 `0.2.0`, escenarios `scenario-1`. Contrato de juego sin cambios: 1.0.1o-FULL / PC Steam / Blue / White. Reglas provisionales; esta entrega no acredita eficacia para ganar partidas ni sustituye la evidencia pendiente de H2.

## Verificación de dependencias

Se revisaron instrucciones, código, tests, backlog y documentación. No hay AGENTS.md aplicable en Balatro ni sus ancestros. T07b pasó sus 72 pruebas, con 10 TODO de juego pendientes. Su evaluación por rama, fin temprano, contador y cobro separado bastan para este alcance: no se modificaron reglas H2, esquema/persistencia H1 ni comportamiento T07b. T07c (cotas) no es necesario porque H3 no afirma imposibilidad global ni calcula cotas.

## Ejecutar

```powershell
npm.cmd run check
npm.cmd run demo:advisor
npm.cmd run demo:advisor -- --json
```

La demo reutiliza los cuatro casos sintéticos T07b y muestra orden por niveles, consejo y reglas heurísticas. JSON contiene todos los cálculos, supuestos, estados, errores y trazas. No aplica ni guarda ninguna compra. Las demos H2 y T07b siguen disponibles.

API desde src/index.ts:

```ts
const result = adviseShop(state, [
  { role: 'representative', plan: roundPlan },
  { role: 'adverse', plan: adversePlan }
], { expectedRevision: state.revision, updatedAt }, {
  requireObserved: false
  // actions: lista opcional de ShopAction devueltas por T07b
});
```

role acepta favorable/adverse/representative. Es una etiqueta del llamador, no evidencia de representatividad ni un peso. Entre cero y veinte escenarios; cero produce abstención. IDs repetidos, contratos inválidos y acciones inventadas producen errores. El límite veinte es técnico, no estadístico. No se infieren escenarios de probes históricos ni se transforma una jugada en predicción.

Sin actions se utilizan los candidatos de T07b: conservar, compras unitarias y reemplazos venta→compra. Con actions se exige un subconjunto no vacío, sin duplicados y con los mismos IDs de instancia generados por T07b; se declara la restricción. Las acciones ilegales siguen visibles con sus causas, pero no entran al orden de opciones evaluables. Esta búsqueda no incluye ventas solas, secuencias de varias compras, reordenación, rerolls o paquetes; no es exhaustiva.

## Política explícita

Reglas centralizadas en [policy.ts](../src/advisor/policy.ts), sin pesos, tipo de cambio entre unidades ni umbral por ante. Cada alternativa se evalúa con exactamente los mismos planes usando compareShopAlternatives; H3 no recalcula puntuación, interés, legalidad ni contadores. El margen es una resta del total calculado por H2 y el objetivo registrado: puede ser negativo. No es una estimación de potencia máxima ni de probabilidad.

| Regla | Condición y preferencia | Límites |
| --- | --- | --- |
| H-COVERAGE | A supera todos los escenarios que supera B y al menos uno adicional; preferir A bajo esos planes. | Prioriza esa mejora frente al gasto o pérdida de beneficios. Si cada alternativa supera un escenario distinto no domina ninguna. No se usa el número de éxitos como tasa. |
| H-ECONOMY | Mismo conjunto de éxitos y todos los escenarios superados: preferir A solo si no deja menos dinero tras tienda/cobro ni usa más manos/descartes en ninguno, con al menos una mejora estricta. | Puntos sobrantes se muestran pero no compensan dólares. No afirma que el margen extra carezca de valor fuera de estos planes. |
| H-PROGRESS | Mismos éxitos pero quedan escenarios sin superar: exige las condiciones económicas/de recursos anteriores y no empeorar el margen de cada escenario fallido. | No recomendar una compra solo porque aumente puntos sin resolver ningún ejemplo. Si nadie vence ninguno, abstenerse aunque se pueda ordenar algún resultado parcial. |
| H-PERSISTENCE | A igual cobertura, no declarar A preferible a B si pierde un tipo de beneficio persistente demostrado en B: Green aplicado a puntos o ingreso de Golden calculado. | Deja el compromiso abierto, no asigna precio ni magnitud futura. No premia el contador bruto; desaparece al alcanzar el objetivo final del ante 8. H-COVERAGE puede justificar ese sacrificio. |
| H-INCOMPLETE | No aconsejar globalmente con escenarios/alternativas legales incompletas, precio pendiente que impida decidir legalidad, enumeración incompleta, sin escenarios o sin ningún éxito. | Se mantienen todas las métricas calculables y órdenes parciales; no se declara derrota inevitable. |

Son prioridades heurísticas, no teoremas de optimalidad. A igual cobertura se usa dominancia por componentes: más dinero y menos recursos consumidos, sin convertir unidades. Cuando hay victoria parcial, solo se valora margen en los escenarios no superados. Una mejora de dinero con mayor consumo de manos puede quedar empatada; no se introduce un desempate oculto.

El cobro debe conocerse en ambas ramas ganadoras para usar H-ECONOMY/H-PROGRESS. Si falta recompensa o el supuesto de saldo constante, se conserva H-COVERAGE cuando puede demostrarse y se suspende la comparación económica correspondiente. Al terminar el ante 8 no se exige un cobro posterior que H2 excluye del objetivo.

Sinergia y condiciones: activatedEffects enlaza los pasos H2 con contribuciones positivas de fichas/Mult, por evento. Combinar fichas de Banner con Mult de Even es una activación demostrada en el ejemplo; no una probabilidad de hallar esas cartas. Los efectos inactivos siguen en la traza completa y las condiciones explican qué hace falta para activarlos. No se estima frecuencia, consistencia de mazo ni interacción causal mediante quitar comodines hipotéticamente.

Crecimiento: growth registra contador anterior/posterior y remite a green.timing en cada mano para ver su aplicación. Una cifra mayor no se convierte en utilidad futura. H-PERSISTENCE protege cualitativamente una opción cuyo beneficio llegó a utilizarse; no compara cuánto vale Green 12 frente a Green 11. Los comodines vendidos y sus contadores figuran en sacrificed. Las condiciones de Golden y Green explican que seguir aprovechándolos depende de rondas/manos futuras no modeladas.

## Resultado estructurado y orden

El envoltorio EngineResult conserva evidencia, versión de motor y projected:true. Advice añade policyVersion, inputRevision, rulesetId, escenarios completos y comparaciones T07b sin perder trazas. Por alternativa: acción, legalidad, métricas y cálculos por escenario, efectos activados, crecimiento, sacrificios, condiciones y limitaciones. Los saldos/coste neto provienen de calculation, no se duplican como fórmula del asesor.

reachedScenarioIds, unreachedScenarioIds e incompleteScenarioIds muestran sensibilidad. Un plan agotado sigue teniendo su significado T07b; no se renombra como derrota. Las diferencias numéricas respecto de conservar están en comparisons[].value.differences. preferences incluye par de alternativas, regla, escenarios y explicación; los números que fundamentan el motivo se consultan en esas filas de metrics/calculation.

tiers es una lista ordenada de niveles no dominados. Dentro del mismo nivel no hay preferencia: puede ser igualdad o compromiso. orderedAlternativeIds presenta primero esos niveles y después opciones ilegales/incompletas sin tier. alternatives conserva IDs/orden de enumeración para referencias estables. Un tier calculado con información parcial no anula una abstención global.

recommendation devuelve:

- conditional: una sola candidata superior dentro de los planes y acciones declarados, con su ShopAction. Un replace conserva sus pasos venta→compra en calculation.shop.value.steps.
- tie: varias candidatas no dominadas; action:null y sin preferencia única.
- abstain: datos insuficientes o ningún escenario superado; action:null. candidates puede mostrar opciones parcialmente evaluables, no recomendaciones.

Se conservan supuestos de carta conocida/hipotética y saldo constante, y se advierte si no hay escenario etiquetado adverso. No se ponderan ni promedian escenarios. Duplicar un plan con distinto ID no le da mayor peso: la inclusión de conjuntos y las desigualdades por escenario no se convierten en votación. Los planes fijos no demuestran cómo rendiría jugar de forma adaptada a cada compra.

## Pruebas y estado

`npm.cmd run check`: **87 aprobadas, 0 fallidas, 10 TODO manuales**, incluidas 15 pruebas nuevas de H3. Tipos, build y tres demos pasan. [Oráculos y evaluación de la política](evidencia/h3-politica.md). Pruebas aritméticas/políticas no equivalen a validación en Balatro ni a evaluación de calidad sobre partidas independientes.

H3 básico implementado como software, con validación de reglas y eficacia aún pendientes. No se cierran los criterios completos de producto S01–S09/A1–A8: faltan cotas S09, horizontes de varias rondas, ventas solas en el comparador, confirmación/guardado de acciones, UI y evaluación integrada. Próxima tarea: T09b, aplicar solo acciones que el usuario confirme realizadas con control de revisión, reutilizando el guardado H1. T07c y la evidencia manual continúan por sus dependencias propias.


