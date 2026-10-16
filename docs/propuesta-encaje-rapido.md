# Propuesta: encaje rápido sin planes

2026-10-13. **Propuesta original conservada como antecedente.** La primera implementación y sus límites están en [encaje rápido](encaje-rapido.md): la Mesa ya no exige planes y muestra un índice editorial abierto con una décima (quick-fit-2). La rúbrica0–10 fue la primera entrega y se conserva abajo solo como antecedente. La política no está validada contra partidas. Las secciones siguientes describen el diseño previo.

## Qué se valorará

El encaje de un comodín con los datos actuales de la construcción: qué función añade, qué condiciones tiene disponibles, qué relaciones puede aprovechar y qué pierde al reemplazar otro. El resultado será cualitativo: **encaje respaldado**, **potencial condicionado**, **conflicto conocido**, **datos incompletos** o **sin perfil evaluable**. Pueden coexistir beneficios y costes; no hace falta proclamar un ganador.

No se calcularán puntuación de una mano, frecuencia de robo, supervivencia ni probabilidad de ganar. Esos resultados requieren otro modelo y, cuando corresponda, [planes explícitos T07b](comparacion-t07b.md). La valoración rápida y el cálculo de escenarios permanecerán identificados por separado.

## Datos de entrada

| Dato | Uso y tratamiento |
| --- | --- |
| Comodines actuales, orden y ediciones | Roles, relaciones, copias y efectos que se perderían. Inventario desconocido impide afirmar ausencia de un rol. |
| Contadores actuales | Diferenciar un escalador recién comprado de uno ya desarrollado. No suponer cero para una instancia poseída. |
| Baraja inicial | Aplicar sus condiciones; no reemplazar una baraja desconocida por Azul. |
| Composición actual del mazo | Contar material elegible: Acero, figuras, rangos, palos, mejoras y sellos. Un preset solo vale si corresponde al mazo actual. |
| Dinero, espacios y valor de venta | Legalidad y coste de compra/reemplazo mediante H2. Datos ausentes pueden impedir valorar la acción, aunque permitan describir una relación. |
| Vales y modificadores compatibles | Recursos y restricciones. Un modificador incompatible debe limitar los resultados afectados. |
| Ante y próxima ciega | Contexto temporal y restricciones conocidas. El ante por sí solo no diagnostica necesidad de fichas. |
| Categoría de mano que quiere desarrollar, opcional | Intención declarada, no demostración de poder jugarla. No deducirla automáticamente de una sola mano favorable. |
| Bases de manos e historial, cuando sea necesario | Contexto para perfiles dependientes de niveles o historial; no pedir todas las categorías para una relación que no las utiliza. |

Las entradas contextuales se solicitarán solo para los comodines relevantes: Tarots usados para Fortune Teller; categorías jugadas para Supernova/Obelisk; tamaño inicial para Erosion; consumibles y espacios para generadores/Perkeo; objetivos observados para Ancient Joker, Mail-In Rebate, The Idol o To Do List. Los campos ausentes seguirán siendo desconocidos. No se exige introducir datos de los 150 comodines.

El primer resultado útil debe poder aparecer con inventario y un mazo conocido, aunque el dinero o un histórico pendiente dejen incompleta la valoración de compra. Nunca convertir un dato desconocido en un cero o en una condición falsa.

## Criterios visibles

1. **Preparación:** distinguir efecto disponible desde el estado, material presente que necesita una mano concreta y condición conocida imposible.
2. **Función añadida:** describir Fichas, Mult aditivo, multiplicación, repeticiones, economía, recursos o desarrollo del mazo. Un rol ausente es una oportunidad estructural, no prueba de que ese rol sea insuficiente; las bases y Plasma pueden cambiar su utilidad.
3. **Relaciones:** participantes, composición, orden y restricciones explícitos. Mostrar requisitos que aún faltan y conflictos que se incorporan.
4. **Desarrollo:** explicar el contador existente y su mecanismo de aprovechamiento. Separar crecimiento registrado de crecimiento futuro condicionado a acciones que todavía no ocurrieron.
5. **Coste y sacrificio:** dinero tras la transición legal, espacios ocupados y beneficios/contadores eliminados por la venta. No sumar dólares, Fichas y multiplicadores como una única utilidad.
6. **Etapa:** menos ciegas pendientes implica menos oportunidades de recuperar una inversión; no implica que todo escalador sea malo al final. Una ronda puede contener varias manos y terminar antes. No asignar crecimiento futuro ni ingresos garantizados sin acciones y reglas suficientes.

La prioridad inicial será cualitativa. Una rúbrica 0–10 podrá estudiarse después, con ejes, perfiles y criterios publicados; **no queda activada ni validada por esta propuesta**. No habrá notas para los 150 por omisión. La [rúbrica actual de escenarios](plan-valoracion-contextual.md) seguirá siendo distinta: no trasladar sus resultados a un análisis sin escenarios.

## Contrato sugerido y separación

`evaluateJokerFit(state, candidateId, { replacementId?, intendedHand? })` devolverá revisión de entrada, cobertura del perfil, acción propuesta, legalidad o datos que la impiden, roles añadidos/perdidos, señales con hechos y criterios usados, relaciones y sus condiciones pendientes, límites y evidencia. Las señales distinguirán **observado/transcrito**, **derivado** y **heurístico**.

Cada perfil se asociará explícitamente a su ID y evidencia. No interpretar descripciones con expresiones regulares ni considerar que existir en el motor equivale a tener un perfil estratégico. Reutilizar [H2](motor-h2.md) para transiciones de compra/venta; no duplicar sus fórmulas ni usar una mano sintética favorable para generar una nota. Cada alternativa partirá de una copia independiente. Si falta cobertura H2 para una acción, podrá describirse el potencial documental, pero no afirmarse su legalidad calculada.

La biblioteca [SYN01](sinergias.md) es documental. Sus participantes no son predicados ejecutables: `Erosion AND (DNA OR Marble)` no exige poseer los tres. Los requisitos en zonas `held`, `scoring`, `played` o `held-end-round` permanecen potenciales sin una mano concreta. Un requisito `full-deck` sí puede contrastarse con composición conocida. Mimo con Acero en el mazo no acredita que el Acero esté retenido; Mimo tampoco repite Steel Joker.

## Ocho criterios de prueba

Casos propuestos, no ejecutados. Los esperados son descripciones derivadas de condiciones y efectos documentados, no resultados generados por el evaluador futuro. No prueban una estrategia óptima.

| Caso | Estados contrapuestos | Comportamiento esperado |
| --- | --- | --- |
| Q01 · Mult inmediato y reemplazo | Comodín básico con espacio e inventario sin comodines, frente a inventario lleno que obligaría a vender Green desarrollado. | En el primero añade Mult inmediato; en el segundo mostrar coste, pérdida del contador y compromiso. No declarar que el básico mejora la puntuación sin una mano. |
| Q02 · Desarrollo y etapa | Green recién comprado antes de varias ciegas, frente a Green nuevo ante el último jefe; añadir variante con Green ya desarrollado. | Separar potencial de desarrollo de beneficio registrado. Menos ciegas reduce oportunidades; no fijar crecimiento nulo en la última ronda ni eliminar utilidad del contador existente. |
| Q03 · Mimo y Acero | Cuatro Acero en el mazo, frente a ninguna carta con efecto retenido ni otro habilitador conocido. | Primer estado: potencial condicionado a robar y conservar Acero. Segundo: sin soporte retenido demostrado. No inventar frecuencia de robo ni puntuación total. |
| Q04 · Steel Joker frente a Mimo | Mismo mazo con cuatro Acero; candidato Steel Joker o Mimo. | Diferenciar requisito del mazo completo de requisito de mano retenida. No etiquetar las dos relaciones como activadas ni afirmar que Mimo duplica Steel Joker. |
| Q05 · Fotografía y Chad | Chad poseído y figuras en el mazo, frente a Abandonada sin figuras y sin Pareidolia. | Primer estado: relación potencial con primera figura puntuada y orden de cartas pendientes. Segundo: condición de figura no disponible. Variante con Pareidolia debe identificar el habilitador. |
| Q06 · Estandarte y Ladrón | Banner con Burglar, frente a Banner sin Burglar y recursos conocidos. | Mostrar conflicto porque Burglar elimina descartes al seleccionar ciega. Sin Burglar mostrar dependencia de descartes conservados; no asumir que se conservan todos. |
| Q07 · Erosión y construcción | Tamaño inicial 52/actual 40, frente a 52/52; considerar DNA o Marble como candidato. | Identificar soporte por reducción real y tensión al añadir cartas. Si el tamaño inicial es desconocido pedirlo; no suponer 52 para cualquier baraja. No prohibir automáticamente DNA/Marble. |
| Q08 · Ahorro y gasto | Bull/Bootstraps poseídos con saldo conocido; conservar frente a comprar otro comodín, y variante con dinero desconocido. | H2 proporciona saldo legal antes/después. Señalar que gastar reduce el soporte económico de efectos ligados al saldo; separar esa pérdida del efecto de la compra. Con saldo desconocido limitar coste y relación; no dar una recomendación económica concluyente. |

## Ciegas siguientes y autoguardado: diseño futuro

La partida manual debe distinguir **ciega actual/próxima seleccionada** de ciegas futuras previstas. El orden normal se representa como Small → Big → Boss → Small del ante siguiente. Eso no registra automáticamente victorias: el usuario confirma el avance real o un salto, y los efectos compatibles se validan mediante H2.

Al avanzar al ante siguiente, conservar como desconocidos el nuevo jefe y los tags asociados a saltos que no se hayan observado. Sin semilla no se generarán un jefe, tag, tienda ni robos futuros. Un jefe visible del ante anterior no se reutilizará silenciosamente. Tampoco trasladar a la partida cobros proyectados, cartas hipotéticas o estados finales de escenarios.

Un futuro autoguardado debe eliminar pasos innecesarios sin eliminar persistencia ni historial: guardar transcripciones validadas, conservar la revisión previa recuperable y mantener las confirmaciones de acciones reales separadas de la consulta. El borrador inválido podrá conservarse por separado, identificándolo como borrador; no sobrescribirá el último registro válido. Una recomendación estará vinculada a la revisión/datos usados y se invalidará tras editar. Un fallo de almacenamiento conservará la versión anterior y mostrará que la edición no se guardó. Reutilizar [T09b](confirmaciones-t09b.md) para atomicidad, duplicados, correcciones y migración; no añadir una arquitectura de eventos independiente.

## Evidencia y cobertura que habrá que cerrar

El catálogo web publica 82 efectos con cálculo, mientras las nuevas familias del motor amplían la fuente a 150; su integración web y sus perfiles de encaje son trabajos distintos. No activar 68 notas adicionales por cambiar un indicador del catálogo. Las relaciones cuentan con [evidencia SYN01/L02](evidencia/sinergias-l02.md); las familias nuevas tienen inspección estática [histórica](evidencia/cat04-history.md), [de generación](evidencia/cat04-generation.md), [económica](evidencia/cat04-economy.md) y [aleatoria](evidencia/cat04-random.md). Es evidencia provisional, no observación de todos los efectos en partida.

La implementación deberá publicar qué perfiles y predicados evalúa, dejar los restantes como referencia, probar los ocho contrastes y conservar las limitaciones de reglas. La investigación de meta orienta criterios; no convierte por sí sola una opinión de comunidad en un efecto confirmado ni en una fórmula estratégica validada.
