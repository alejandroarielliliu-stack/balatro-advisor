# Plan: decisiones útiles y comparación visible

5 de noviembre de 2026. Plan original basado en el repositorio independiente, revisión `b842092`. Responde a dos observaciones del usuario: abstención excesiva al jugar/saltar y dificultad para encontrar la comparación de tienda. La [entrega y cobertura real](decisiones-visibles.md) registra su implementación posterior; EVAL02 conserva pendiente la sesión con jugadores. Las tablas siguientes describen el plan previo, no constituyen por sí mismas evidencia de implementación.

## 1. Resultado que debe experimentar el jugador

**Selección de ciega:** ver una orientación breve sobre jugar/saltar con motivo, sacrificio y condición que podría cambiarla. La falta de una simulación de la etiqueta limita su proyección, pero permite orientación heurística cuando los hechos disponibles la sustentan.

**Tienda:** introducir las ofertas y ver juntas las alternativas: conservar, comprar, vender y reemplazar. La comparación debe tener nombre estable, estar en la Mesa y actualizarse al editar los datos. Las jugadas de prueba siguen siendo opcionales.

La importación de archivos nativos de Balatro queda fuera de esta entrega. El estado, el guardado JSON y la edición actuales permiten resolver ambas observaciones; importar partidas no es una dependencia.

## 2. Diagnóstico comprobado

| Observación | Comportamiento actual encontrado | Consecuencia para el plan |
|---|---|---|
| Abstención al jugar/saltar | `compareBlindChoices` exige `skip.ok && allClear`. Sin planes completos que superen la ciega y calculen cobro, no prefiere ninguna ruta. Solo Economía e Inversión tienen proyección de salto. La preferencia monetaria también restringe las familias de comodines | Añadir una política cualitativa separada de las proyecciones y de sus requisitos de evidencia |
| Comparación difícil de encontrar | `#shop-recommendation` cambia de nombre según el consejo. Abre un diálogo y sus alternativas están en un desplegable | Acceso explícito y estable «Comparar opciones»; resultados principales visibles dentro de la tienda |
| Cobertura del recorrido rápido | DEC00 prueba conservar y una compra o reemplazo por oferta. No enumera ventas individuales por defecto. `replacementId` sustituye comprar por un único reemplazo, con el mismo ID de opción | Comparar las ramas simultáneas necesita una pequeña integración funcional, además del cambio de interfaz |
| Conexión entre motores | `options.actions` afecta a las pruebas H2/H3, pero el contexto rápido se calcula aparte. `ShopOption.kind` no representa una venta | Integrar explícitamente las alternativas con el informe rápido; pasar más acciones a DEC00 por sí solo no resuelve la comparación |

Reutilizar [TAG01b](comparacion-ciegas-tag01b.md), [DEC00](contrato-decision-dec00.md), [DEC02](comparacion-dec02.md), [T07b](comparacion-t07b.md), [ventas T08c](ventas-t08c.md), H2 y T09b. Los resultados actuales se conservan como regresión; no equivalen a resolver las dos observaciones.

## 3. Orientación estratégica al jugar o saltar

### 3.1 Un límite de cálculo no debe borrar todo el consejo

Mantener dos informaciones en el mismo informe:

- **Consecuencias calculadas:** importes, recursos, escenarios, trazas y errores procedentes del motor existente. Un efecto no implementado sigue sin proyectarse.
- **Orientación:** jugar, saltar, intercambio o abstención; regla heurística, razones, sacrificios, condiciones y datos que podrían cambiar la elección. Indicar si procede de heurísticas, escenarios explícitos o ambos.

Usar la revisión/tokens actuales. El dato «efecto no ejecutable» debe ser distinto de «beneficio de la etiqueta desconocido». Para orientar hace falta entender su beneficio pertinente; no hace falta generar la recompensa ni completar toda su mecánica.

La interfaz tendrá una sola conclusión principal. No mostrará simultáneamente una antigua abstención genérica y una preferencia nueva sin explicar que una se refiere al cálculo y otra a orientación. Los escenarios conservan su horizonte y sus condiciones; un resultado monetario local no demuestra superioridad durante toda la partida.

### 3.2 Primera política, sin pesos arbitrarios

1. Validar fase, compatibilidad y acciones legales. Una Jefe no admite salto.
2. Enumerar oportunidades de jugar: premio condicionado a superar la ciega, tienda posterior y desarrollo pertinente de la composición. Solo cuantificar lo respaldado por datos y reglas disponibles.
3. Identificar el beneficio de la etiqueta, su plazo y sus condiciones relevantes. No equiparar una recompensa futura con dinero disponible hoy.
4. Revisar excepciones: sinergias con saltar, cola de etiquetas, desgaste o destrucción de efectos al jugar, recursos necesarios y riesgos conocidos. Un contador mayor no demuestra beneficio aprovechable.
5. Dar una orientación contextual. Favorecer jugar cuando los motivos de cobro/tienda/desarrollo sean pertinentes y no aparezca una compensación concreta suficiente por saltar. Favorecer saltar únicamente cuando exista una ventaja documentada y pertinente, conservando sus condiciones. Si hay motivos cruzados, mostrarlos.

**La etapa cambia el contexto; no decide por sí sola.** Tampoco se ordenan las rutas mediante una suma de dólares, tiendas, puntos y contadores.

Cuando solo exista el criterio general, mostrarlo como orientación inicial. Ejemplo de redacción propuesta:

> Me inclino por jugar: conservas la oportunidad de cobrar y visitar otra tienda. El beneficio de esta etiqueta todavía no está valorado; podría cambiar el consejo. Falta evaluar si superas la ciega.

Cuando el beneficio cualitativo sí esté documentado, sustituir esa incertidumbre por sus condiciones reales. No llamar mala a una etiqueta únicamente porque su ejecución falte en el motor. La regla debe producir razones vinculadas al estado, no repetir siempre una frase genérica.

### 3.3 Supervivencia y preguntas mínimas

No exigir manos de prueba para el consejo básico. La puntuación de composición tampoco certifica superar la ciega.

Reutilizar primero el rendimiento reciente observado que ya exista, anotando los cambios de composición o condiciones que impidan trasladarlo a esta ciega. Ese contexto no convierte una mano favorable anterior en prueba de consistencia.

Si el riesgo puede cambiar la orientación y no hay evidencia suficiente, ofrecer una sola pregunta contextual opcional: **«¿Cómo llegas a esta ciega? La suelo superar / Voy justo / No lo sé»**. Es una valoración declarada del jugador, con procedencia y vigencia limitadas a esa decisión. No se transforma en probabilidad ni en resultado del motor. Cambiar de ciega o una modificación material invalida esa respuesta.

Una respuesta de riesgo impide la preferencia automática por jugar, pero no demuestra que saltar salve la partida: también hay que considerar la siguiente ciega. No contestar permite una orientación condicional cuando sea útil.

### 3.4 Fichas cualitativas y evidencia

Añadir fichas pequeñas y versionadas: beneficio descrito, plazo, condiciones, relaciones pertinentes, fuente y estado de evidencia. Consultar primero la evidencia ya guardada de Steam `1.0.1o-FULL`; verificar en el ejecutable únicamente las descripciones que necesiten los primeros casos.

Economía/Inversión y los metadatos existentes son una base, no un catálogo estratégico completo. Empezar por unas pocas situaciones de queja y sus contraejemplos. No convertir «implementar las 24 etiquetas» en una condición previa ni derivar valor estratégico de su disparador solamente.

Cada ficha distinguirá inspección del ejecutable, observación en partida e hipótesis estratégica. No habrá nueva declaración de comprobación directa si no se realiza. El modo estricto conserva sus restricciones: una heurística no certifica un cálculo ni habilita una operación bloqueada por evidencia. La orientación normal se identifica como heurística; no se rebaja silenciosamente el modo estricto.

## 4. Comparación de tienda como función principal

### 4.1 Flujo y presentación

En la Mesa, dentro de **Tienda**:

1. Ofertas visibles con sus precios, conservando las ilustraciones y el lenguaje de Balatro.
2. Encabezado estable **«Comparar opciones»**, visible incluso cuando el consejo cambie.
3. Referencia permanente **«Conservar»** y filas compactas de las alternativas evaluadas. La conclusión recomendada aparece como resultado junto a esas filas.
4. En cada alternativa: acción y carta afectada, coste neto/saldo posterior, beneficio, pérdida y condición importante. Datos ausentes aparecen como desconocidos.
5. Al seleccionar una fila, ver el detalle. La consulta funciona sin pestañas adicionales, planes de manos ni guardado manual adicional para datos básicos.

Mostrar las diferencias juntas, con imágenes/nombres; no obligar a recordar el contenido de diálogos anteriores. Agrupar variantes de reemplazo bajo su oferta, con acceso explícito. En móvil usar filas apiladas legibles y controles táctiles, manteniendo «Conservar» como referencia.

La primera vista no tiene que desplegar veinte variantes largas: debe mostrar que existen ventas/reemplazos y permitir elegirlos directamente. Indicar cuántas alternativas se evaluaron y cuáles quedaron fuera. Los detalles mecánicos completos y los planes de Análisis permanecen bajo demanda.

Comprobar la comparación en escritorio y a 360/390 px, con teclado, nombres completos accesibles y sin desbordamiento horizontal. Reutilizar las comprobaciones actuales; la emulación no se presenta como prueba en Android físico.

No mostrar deltas de fichas de mano sin una mano/escenario calculado. Si se muestran índices de composición, conservar su significado heurístico y no utilizarlos como única regla de compra.

### 4.2 Alternativas acotadas con identidad propia

Primera cobertura propuesta:

- Conservar sin transacción.
- Una compra por oferta compatible de comodín.
- Una venta por comodín propio compatible.
- Cada venta→compra compatible entre una instancia propia y una oferta.
- Vales y sobres ya admitidos conservan sus consecuencias y límites actuales dentro de la comparación; un sobre cerrado sigue teniendo contenido desconocido.

Excluir secuencias con varias compras, varias ventas, renovaciones y búsqueda de todos los órdenes. No introducir controles de Renovar. No declarar exhaustividad fuera de las acciones individuales descritas.

Usar IDs de alternativa distintos, por ejemplo `hold`, `buy:<oferta>`, `sell:<instancia>` y `replace:<oferta>:<instancia>`. La oferta real mantiene su ID único: no se duplica una carta en la tienda para representar distintos reemplazos. El reemplazo sigue siendo la secuencia legal venta→compra.

Reutilizar la enumeración T07b/T08c y verificar su compatibilidad con DEC00. Cada rama parte de una copia del mismo estado. H2 resuelve dinero, espacios, restricciones y consecuencias. No reimplementar sus fórmulas en la interfaz.

El límite actual de 50 acciones solicitadas debe respetarse. Si un estado excede la cobertura, comunicar qué falta o permitir seleccionar el grupo evaluado; no recortar silenciosamente y afirmar que se comparó todo.

### 4.3 Preferencia y confirmación

Conectar las ramas al informe rápido y a sus razones. Enumerar una venta no exige afirmar que convenga venderla. Mantener empates, intercambios y opciones sin preferencia cuando la política no tenga fundamento para ordenarlas. Ampliar una regla estratégica solo por un caso congelado que lo justifique.

Presentar por separado lo calculado por H2 y lo inferido por heurística. Una oferta pendiente limita las comparaciones afectadas, sin borrar las ramas calculables. Si puede cambiar la conclusión global, el alcance parcial debe quedar junto al consejo.

Consultar o seleccionar no cambia dinero, inventario, historial ni estado de edición real. **«Registrar lo que hice»** mantiene confirmación explícita y revisión vigente. Si solo ocurrió la venta, registrar únicamente la venta. Un reemplazo completo valida todos sus pasos antes de persistir; reutilizar T09b para fallos, duplicados y recuperación.

## 5. Casos de aceptación antes de ajustar la política

Congelar estado, opciones, condiciones relevantes y expectativas antes de observar la nueva salida. No generar expectativas con el propio asesor.

| Caso | Resultado de producto que se comprobará |
|---|---|
| Etiqueta con descripción conocida y ejecución pendiente | Orientación condicional y coste de oportunidad visibles; no se fabrica saldo de salto |
| Misma situación con una compensación relevante por saltar | El asesor cambia su explicación o muestra intercambio; no repite «jugar siempre» |
| Sin planes y supervivencia desconocida | Consejo básico posible con límite explícito; no pide configurar manos para empezar |
| Riesgo declarado o efecto que se consume al jugar | Se retira la preferencia automática por jugar y se explica qué podría compensar el salto |
| Double/cola desconocida y sinergia de salto | Incertidumbre localizada; no se simulan duplicaciones ni se convierte el contador en utilidad garantizada |
| Jefe, modo estricto y revisión antigua | Se conserva legalidad y evidencia; recomendación antigua no se registra automáticamente |
| Tienda con dos compras y conservar | Se reconocen y comparan desde Mesa, sin abrir Análisis ni un desplegable para ver la comparación básica |
| Inventario lleno y distintas cartas vendibles | Compra aislada ilegal y reemplazos legales diferenciados; se identifica exactamente lo sacrificado |
| Venta sola y venta→compra de la misma carta | Alternativas distintas, saldos y acciones correctos; la venta no necesita fingir una compra |
| Carta eterna, precio desconocido o efecto no admitido | Restricción explícita por alternativa; las otras siguen evaluándose |
| Compra útil, ahorro, crecimiento perdido y resultado inconcluyente | Se reutilizan casos compatibles de DEC02/H3 y se añaden los necesarios; no se ordena solo por nota |
| Consulta, selección hipotética, fallo de guardado y recarga | Cero escrituras/edición real al consultar; acciones confirmadas y recuperación coherentes |

Para cálculos: expectativas literales independientes o fórmulas documentadas y evidencia de reglas. Para heurísticas: contrato de conducta revisable, no afirmación de decisión óptima. Para usabilidad: sesión observada, no éxito atribuido a una captura.

## 6. Entregas y dependencias

| Orden | Tarea pequeña | Dependencia | Criterio de aceptación |
|---|---|---|---|
| P01 | Congelar casos de ambas quejas y contraejemplos | Código/documentación actuales | Entradas y expectativas independientes; evidencia pendiente identificada por caso |
| UX03 | Mostrar la comparación existente con nombre estable y contenido básico inline | UI02/DEC02; puede empezar mientras se prepara P01 | Conservar y opciones actuales visibles desde Mesa; sin planes ni consultas que escriban |
| DEC03a | Enumerar y validar alternativas individuales con IDs distintos | P01, H2/T07b/T08c | Comprar, vender y varios reemplazos coexisten, usan la misma oferta real y respetan legalidad |
| DEC03b | Conectar esas alternativas al informe rápido y a las filas de comparación | DEC03a; se integra con UX03 | Consecuencias y límites visibles por alternativa; consejo parcial y empates conservados |
| STR02a | Describir las etiquetas necesarias para los primeros casos y sus excepciones | P01 y evidencia local pertinente | Fichas cualitativas con fuente/versión; no requiere ejecutar todos sus efectos |
| STR02b | Añadir orientación condicional jugar/saltar | STR02a; independiente de DEC03 | Sin planes ofrece consejo fundamentado; riesgos/excepciones lo cambian; modo estricto intacto |
| UX04 | Mostrar esa orientación en selección de ciega y pedir solo el dato decisivo | STR02b | Acción, motivo y condición visibles; preguntar opcionalmente por riesgo sin inventar supervivencia |
| EVAL02 | Comprobar utilidad de los dos recorridos | Empieza con UX03; cierre tras DEC03b/UX04 | El jugador encuentra comparar, distingue las cuatro acciones y entiende por qué jugar/saltar; registros intactos |

**Primera implementación recomendada: UX03.** Hace inmediatamente reconocible la función principal con los cálculos ya existentes. En paralelo se fijan P01 y las fichas pertinentes de STR02a. La integración funcional de ventas/reemplazos y la orientación de ciegas avanzan como ramas independientes, con pruebas antes de ajustar sus reglas.

EVAL02 es el lote concreto de las dos quejas dentro de EVAL01b, no otra infraestructura de evaluación. No requiere importación nativa, simulación, completar catálogos, nuevas cuentas ni rehacer el juego.

## 7. Base y límites de la investigación

Diagnóstico técnico: `src/advisor/blind-decision.ts`, `src/rules/tags.ts`, `src/advisor/decision.ts`, `src/advisor/shop-context.ts`, `src/advisor/shop-comparison.ts`, `src/ui/blind-decision-view.ts` y `src/ui/storefront.ts`, en la revisión indicada.

Mecánicas: evidencia ya documentada en TAG01a/TAG01b, inspección del ejecutable de la versión objetivo. Esta planificación no añade una observación en Balatro ni una nueva inspección de sus efectos.

Diseño: [NN/g, reconocimiento frente a recuerdo](https://www.nngroup.com/articles/recognition-and-recall/) fundamenta mostrar opciones y acciones con nombres reconocibles; [heurísticas de usabilidad](https://www.nngroup.com/articles/ten-usability-heuristics/) apoya una jerarquía centrada en la tarea, estado visible y prevención de errores. Son criterios de diseño, no evidencia de que este flujo ya sea usable.

Las heurísticas de juego propuestas siguen siendo hipótesis que se contrastarán con los casos y el uso. No se adoptan reglas universales, porcentajes, precios de tiendas futuras ni decisiones de vídeos basándose solo en resultados de búsqueda.
