# Plan vigente: un asesor útil con pocas entradas

Revisión: 18 de octubre de 2026. **Esta sección fija las prioridades actuales** y sustituye los órdenes de ejecución anteriores. El detalle histórico se conserva plegado al final; el [backlog](backlog.md) contiene las tareas activas. La [primera entrega UX01](consejo-compacto-ux01.md) ya implementa el consejo compacto; la siguiente es UX01b. El resto se mantiene como plan, sin nuevas capacidades declaradas.

## 1. Qué queremos conseguir

Durante una partida, el usuario indica lo básico, transcribe la tienda y obtiene una orientación breve: **comprar, ahorrar o reemplazar**, con el beneficio, el sacrificio y la condición que podría cambiar el consejo. La composición conserva su puntaje y las barras existentes. Las manos concretas permanecen en Análisis y no son requisito del recorrido principal.

El objetivo final hasta ante8 sigue vigente. El siguiente producto comprobable es **la tienda con pocos datos**; jugar/saltar y decisiones de sobres se mejorarán después de que ese recorrido sea útil. No necesitamos recrear toda la partida para orientar compras, aunque algunos cálculos exactos sí requieren más información.

Requisitos establecidos por el usuario: composición y sinergias reales; etapa; baraja y modificaciones; vales pertinentes; actualización dinámica; interfaz de Balatro; pocas entradas; decisiones realizadas separadas de hipótesis. No se retiran las herramientas ya construidas.

Propuesta de esta revisión: tres entregas pequeñas, con evaluación de uso desde la primera. No se añade simulación ni se completa el catálogo por inercia. Los objetivos numéricos de uso que siguen son **criterios iniciales de producto**, no resultados obtenidos ni umbrales científicos.

## 2. Qué hay y qué falta realmente

Auditoría del repositorio independiente en `c93149dbe53955afcb20db5430e45dfbad1ced7a`; sin AGENTS.md aplicable encontrado. Referencia verificable: [EVAL01a](evaluacion-asesor-eval01.md).

| Ya existe y se reutiliza | Brecha que sí merece trabajo |
|---|---|
| H1, guardado/recuperación, revisión, autoguardado de acciones y deshacer T09b | El mazo se representa íntegro o desconocido; no admite resúmenes parciales utilizables |
| H2, compras/ventas legales y consecuencias puras; modo estricto | No convertir una transacción desconocida en compra certificada para facilitar una recomendación |
| 150 perfiles, 17 familias ejecutables, seis barras y puntaje contextual | Ni una nota alta ni un rol ausente demuestran utilidad; no crear otra nota ni nuevos pesos sin casos que lo justifiquen |
| Consejo `quick-shop-2`, composición y contrato DEC00 | Varias ofertas preparadas suelen empatar sin diferenciar bien coste, condición y sacrificio |
| T07b/H3 para escenarios explícitos; EFHIII como contraste puntual | El recorrido rápido no debe exigir escribir manos ni convertir esas herramientas en predictores de una partida |
| Web pública estática y almacenamiento local | La explicación actual es demasiado extensa; pide datos de forma poco dirigida |
| 920 pruebas de código, ocho del evaluador; aceptación de 12 casos estratégicos de desarrollo y seis reservados | Falta demostrar que alguien entiende el consejo con poco esfuerzo durante una partida |

Diagnóstico: el problema principal es **foco de producto y utilidad del consejo**, no falta de infraestructura. Completar más Tarot no resuelve por sí solo ninguna de estas brechas.

## 3. Qué aprendemos de la investigación

| Fuente consultada | Decisión que fundamenta | Lo que no prueba |
|---|---|---|
| [NNGroup: divulgación progresiva](https://www.nngroup.com/articles/progressive-disclosure/) | Mostrar conclusión y datos decisivos; desplegar trazas, premisas extensas y herramientas avanzadas | No permite esconder un coste, ilegalidad o condición que cambie la acción |
| [NNGroup: reconocimiento frente a recuerdo](https://www.nngroup.com/articles/recognition-and-recall/) | Inventario/ofertas visibles, selección visual y datos anteriores conservados; evitar recordar candidatos o repetir el mazo | No justifica inferir datos que el jugador no indicó |
| [NNGroup: reducir carga en formularios](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/) | Preguntas concretas con contexto, respuesta «no lo sé» y explicación breve de para qué sirve | Reducir campos no elimina incertidumbre |
| [GOV.UK: probar las partes arriesgadas en alpha](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works) | Comprobar primero si pocos datos producen una decisión entendible; ampliar solo después | No trasladamos su burocracia, plazos ni métricas gubernamentales al proyecto |
| [Martin Fowler: YAGNI](https://martinfowler.com/bliki/Yagni.html) | Aplazar funcionalidades y abstracciones para necesidades futuras no demostradas; conservar código fácil de cambiar y pruebas útiles | No significa abandonar validaciones, claridad o mantenimiento necesario |
| [EFHIII: repositorio original](https://github.com/EFHIII/balatro-calculator) | Reutilizar el contraste de manos concretas cuando sea pertinente; no duplicar su herramienta en el recorrido básico | No es una política de tienda, prueba directa en Balatro ni validador universal |

Reglas mecánicas: siguen las fuentes y la versión compatible ya documentadas en [reglas y fuentes](reglas-y-fuentes.md) y [evidencia EVAL01a](evaluacion-asesor-eval01.md). Esta investigación no aporta una nueva observación en el juego. Las guías de jugadores y vídeos sirven para proponer hipótesis estratégicas; no se importan tiers, pesos o afirmaciones generales como verdad. No se atribuyen decisiones a vídeos que solo se hayan localizado por sus metadatos.

## 4. Información mínima: preguntar por la decisión presente

**Base que se conserva:** baraja, ante/ciega, dinero, comodines y sus datos dinámicos pertinentes, vales y ofertas visibles con precio. Perfil compatible se confirma una vez; orden y edición se reutilizan cuando importan. Con esto debe existir una primera valoración contextual sin manos de prueba ni guardado manual adicional.

**Datos adicionales bajo demanda:** solo los que use un comodín poseído o una oferta concreta. Ejemplos: reyes para Barón, Acero para Steel Joker, efectos retenidos para Mimo, contador de un escalador, requisito/efecto del vale visible. No pedir inicialmente todos los palos, rangos, mejoras, niveles y consumibles.

**Lo desconocido sigue desconocido:** cero se registra solo cuando el usuario lo confirma. La baraja inicial proporciona la composición inicial únicamente cuando se inicia una partida o se confirma que sigue intacta; no reconstruye el mazo modificado. Una elección «no lo sé» permite continuar con consejo parcial. Las ediciones válidas de hechos básicos y resumen se guardarán al terminar el campo o grupo mediante las observaciones/T09b existentes: no habrá que pasar por Registro para obtener o conservar ese consejo. No crear una entrada por tecla. Un fallo de guardado conserva el último estado válido y se muestra en el mismo lugar; las compras reales mantienen su confirmación explícita.

Resumen inicial propuesto: tamaño, cantidades pertinentes y, si hace falta, solapamientos observados. Empezar por reyes, Acero y otros efectos retenidos relevantes (Oro/sello azul); otros campos se añaden cuando una familia existente los consume y hay un caso que exige hacerlo. No construir un formulario universal vacío.

- Cinco reyes y seis Acero no dicen cuántos reyes son de Acero. Si tamaño y cuentas son exactos, la intersección queda entre `max(0, reyes + acero − tamaño)` y `min(reyes, acero)`. Es un límite combinatorio, no probabilidad de robo ni dato observado.
- Barón necesita reyes retenidos para activarse; **Acero no es un requisito de Barón**. Mimo puede apoyar otros efectos retenidos. El resumen no demuestra qué cartas estarán en mano.
- No se deducen manos, orden, cartas ficticias, robos ni frecuencia de activación. El resumen no entra al puntuador exacto ni a T07b como si fuera un mazo completo.
- Una transformación o cambio de mazo invalida únicamente las cuentas afectadas que no puedan actualizarse con certeza. Recibir información completa compatible permite calcular sus cuentas; una contradicción pide corrección, no elige silenciosamente una fuente.

No hace falta construir un algoritmo general de «valor de información». Un mapa pequeño de requisitos de las familias presentes basta: comprobar qué falta, a qué opciones afecta y cuál es la siguiente pregunta útil. Primero material/requisito ausente que cambia preparación; después refinamientos. Mostrar una pregunta principal por vez; no forzar respuestas irrelevantes para una compra independiente.

## 5. Cómo debe aconsejar

Se conservan tres niveles de evidencia: consecuencia exacta compatible de H2; expectativa heurística con hechos conocidos; aspecto no evaluado. Las seis barras son un resumen editorial y no arbitran por sí solas una compra.

Orden de comparación propuesto, sin sumar unidades distintas:

1. Excluir acciones ilegales y señalar operaciones no compatibles. Una descripción o precio pagable no certifica la operación.
2. Identificar el efecto que funciona ahora, su condición y soporte. Diferenciar una sinergia preparada de una promesa de desarrollo futuro. La etapa modifica horizonte y coste de empezar, no reemplaza la preparación ni impone una regla rígida por ante.
3. Mostrar el coste neto, saldo, reserva, interés condicional y efectos perdidos. No comparar cifras de puntuación total sin una mano/escenario compatible ni equiparar fichas, dólares y contadores.
4. Preferir solo cuando la evidencia admita una diferencia clara dentro del alcance: por ejemplo, una mejora utilizable frente a material ausente. Preferir menor coste por efectos equivalentes exige comprobar también edición, condiciones, cambios de saldo y beneficios conservados; no basta el mismo rol o una nota mayor.
5. Si hay intercambio, dar una condición útil: «A si necesitas reforzar X ahora; conservar mantiene Y». Si una oferta no está modelada, presentar «Entre las opciones evaluadas…» y la limitación global. No borrar las comparaciones independientes ni declarar una ganadora sobre lo desconocido.

Opciones del próximo alcance: ahorrar, compras individuales compatibles y reemplazos venta→compra cuando falten huecos o el usuario lo pida. Enumerar cuáles se compararon. Sin búsqueda de varias compras, renovaciones futuras, secuencias de sobres o estrategia global óptima. No inferir necesidad de puntuación solo por el ante, los roles, el índice o un resultado favorable anterior.

**Presentación principal:** una acción, empate útil o pregunta; un beneficio y un sacrificio; importe o dato clave. Como máximo dos frases de motivos visibles, con «Ver por qué» para el resto. Si falta un dato decisivo, se muestra junto a esa conclusión. No ocultar la limitación importante entre advertencias repetidas.

Ejemplo de forma, no recomendación preasignada: «Entre lo evaluado, considera A · cuesta $4 y deja $8. Refuerza tu Mult; B depende de un material todavía no confirmado». Las explicaciones deben salir de los hechos/resultados de esa ejecución, no de párrafos copiados por caso.

## 6. Tres entregas, seis tareas y dependencias reales

| Entrega / tarea | Cambio pequeño y reutilización | Dependencias | Aceptación comprobable |
|---|---|---|---|
| **A — UX01: entender el consejo** | Compactar `src/ui/storefront.ts` usando resultados actuales: acción, beneficio, sacrificio, dato pendiente y detalle desplegable. Análisis/Registro continúan accesibles | H2/DEC00 actuales; independiente del resumen parcial | En390px la conclusión no queda detrás de párrafos; precio/saldo y condición decisiva visibles. Abrir detalle conserva trazas. Consulta/cierre/recarga no escriben acciones. No cambia la política para acomodar la UI |
| **A — UX01b: hechos sin Guardar** | Persistir una observación completa al terminar el campo/cerrar el editor con `store.correct`, revisión, pestaña escritora y deshacer existentes. Dinero, contador, inventario y vales; ante/fase usan el recorrido actual | H1/T09b actuales; independiente del resumen | Editar dinero y un contador, registrar ofertas y recargar sin pasar por Registro ni bloqueo `dirty` tras éxito. No guardar por tecla, simular compra al transcribir ni inventar transiciones. Ante error conservar registro previo y borrador visible |
| **B — OBS01d.1: resumen seguro** | Extensión mínima de H1 y observaciones/T09b existentes; una consulta de material compartida por `composition`, `quick-fit` y `composition-signals` | Modelo actual, validaciones y T09b | Resúmenes conocidos/parciales se guardan y recuperan; antiguos0.1/0.2 siguen legibles. Cuentas imposibles/contradictorias dan errores claros. No se fabrican cartas ni se rompe la recuperación ante fallos; una edición válida no exige Registro y consultar no guarda hipótesis |
| **B — OBS01d.2: tres condiciones y preguntas** | Conectar Barón, Mimo y Steel Joker al resumen, manteniendo sus diferencias y vales ya integrados. Preguntas pequeñas ligadas a las ofertas/familias presentes | OBS01d.1 | Reyes/Acero/cantidades en el mazo de cartas con efectos de retención cambian la valoración pertinente; desconocido no vale cero; no pide los52 naipes ni otras mejoras irrelevantes. Una compra independiente de esos datos sigue evaluable. Después solo ampliar si aparecen decisiones que lo necesitan |
| **C — DEC02: comparar con criterio** | Reutilizar `shop-context`, DEC00 y proyecciones H2. Beneficio preparado, sacrificio, comparaciones acotadas y preferencia parcial; no otro motor | UX01; datos necesarios de OBS01d para las ramas materiales | Distingue mejora/ahorro/inversión; no gana por rareza, nota, rol o ante solamente. Reemplazo no hereda contadores y muestra pérdida. Empate o condición cuando no puede justificar orden. Oferta pendiente no borra lo calculable |
| **C — EVAL01b: comprobar utilidad** | Revisar el recorrido completo y un lote nuevo antes de ajustar DEC02; usar el evaluador y los scripts web existentes | Empieza con UX01; cierra sobre B/C | Datos pedidos, comprensión, errores y desacuerdos registrados. Casos nuevos/expectativas congelados antes del ajuste; reservado nuevo si se reclama evaluación independiente. Contraste manual de reglas por dependencia; ninguna observación inventada |

**Orden:** UX01 → UX01b → OBS01d.1 → OBS01d.2 → DEC02. EVAL01b acompaña cada entrega y tiene un cierre final; las incertidumbres de una regla bloquean solo su operación. Una entrega fallida se corrige o limita antes de ampliar cobertura. No se necesita completar todos los Tarot, todos los comodines ni la simulación.

### Casos mínimos que deben orientar el siguiente lote

| Situación | Qué se quiere distinguir, sin afirmar optimalidad |
|---|---|
| Mazo desconocido, Joker simple en oferta | Beneficio propio contextual disponible sin exigir composición completa; supervivencia sin demostrar |
| Barón sin reyes vs con reyes, en etapas distintas | Material ausente frente a potencial real; la etapa cambia horizonte, no crea reyes ni exige Acero |
| Mimo con cero Acero pero Oro o sellos azules confirmados | No confundir ausencia de Acero con ausencia de todo soporte; distinguir ingreso/nivel de puntuación |
| Reyes y Acero por separado, solapamiento desconocido | No inventar reyes de Acero; preguntar solo si cambia la comparación concreta |
| Oferta preparada frente a ahorro y otra oferta pendiente | Conservar consejo parcial y expresar coste de oportunidad sin prometer la tienda futura |
| Inventario lleno y comodín desarrollado o temporal | Venta→compra legal, pérdida real y beneficios que no se heredan; no veto automático por contador |
| Mismo inventario, un vale adquirido distinto | Cambian recursos/reglas pertinentes, sin añadir una «sinergia» por el nombre del vale |
| Paso a otra ciega con un cambio de mazo | Reutilizar datos vigentes e invalidar los afectados, sin repetir todo ni reconstruir hechos desconocidos |

Para que DEC02 no cierre simplemente cambiando el nombre de los empates, el lote deberá contener estos contrastes concretos, completando estado/precios válidos y expectativas **antes** de tocar la política:

- **Comprar condicionado:** Burglar poseído y Cumbre mística ofrecida, con los recursos resultantes confirmados. Reconocer el soporte de cero descartes y el refuerzo propio; preferencia condicional frente a una oferta sin material, sin garantizar supervivencia.
- **Ahorrar condicionado:** Seed Money ofrecido a precio base con saldo20. La compra deja10 y no aprovecha el tope adicional en ese saldo; no preferirla como ingreso inmediato ni por una nota de economía. Explicar la inversión futura si se ofrece como alternativa.
- **Reemplazar condicionado:** Riff-Raff en inventario lleno sin otro efecto que libere huecos, frente a Abstract en una venta→compra compatible. Para una prioridad declarada de refuerzo actual, contrastar el aporte propio preparado con la generación actualmente sin huecos; conservar el beneficio futuro sacrificado y el coste. No exigir reemplazar si falta ese contexto o hay otro intercambio relevante.
- **Empate útil:** una mejora de puntuación frente a ingreso al final de ronda, sin evidencia de necesidad de puntuación. Explicar qué condición favorece cada opción; no inventar una ganadora sumando dólares y puntos.

Son borradores de aceptación cualitativa, no nuevos casos ya ejecutados ni pruebas de optimalidad. Los casos nuevos que vayan a reservarse se escribirán aparte sin consultar la política ajustada; no reutilizar el reservado abierto de EVAL01a como si siguiera oculto.

Las expectativas mecánicas se fijan independientemente del código, con evidencia compatible. Los casos de estrategia aceptan alternativas condicionadas justificadas; no exigen una única acción por intuición del implementador. EVAL01a es regresión; su reservado ya abierto no vuelve a considerarse nuevo.

## 7. Cómo sabremos que esta versión sirve

Objetivos iniciales de aceptación, a medir y ajustar con uso, no requisitos para inventar resultados:

- Con los datos básicos registrados, consultar una tienda no exige introducir manos,52cartas ni nuevas bases. Solo se preguntan los datos que usa esa decisión.
- El usuario identifica acción/condición y sacrificio mirando la conclusión, sin leer trazas. Objetivo de prueba: hacerlo en unos diez segundos en una tarea concreta; registrar si no ocurre.
- Completar un cambio simple tras una ciega pide ese cambio, no reintroducir inventario/baraja/vales. No atribuir ahorro de tiempo hasta medirlo.
- Comparar recorrido actual y revisado con las mismas situaciones: número de respuestas nuevas, repeticiones, errores de transcripción, tiempo y comprensión. Usar una ficha local de observaciones; no analytics, cuentas ni plataforma experimental.
- Primera revisión con el usuario y, si están disponibles, otros jugadores: pequeña muestra cualitativa (propuesta de 3–5) para encontrar fricción, no prueba estadística ni porcentaje de eficacia. La ausencia de participantes no bloquea software independiente; mantiene abierta la aceptación de uso.
- Las condiciones mecánicas utilizadas se contrastan por un lote mínimo. PC y móvil emulado siguen siendo pruebas de interfaz; Android físico permanece aplazado por decisión del usuario.

Se publica como **asesor heurístico con cobertura declarada** al superar A–C en su alcance y dejar visibles las limitaciones. La calidad durante partidas completas conserva una comprobación propia y no se deduce de compilar o aprobar casos sintéticos.

## 8. Freno a la sobreingeniería

Antes de aceptar otra tarea: **¿qué decisión o esfuerzo del jugador mejora?, ¿qué módulo existente se aprovecha?, ¿qué caso demuestra esa mejora?** Si no hay respuesta concreta, se aplaza.

- Un flujo principal en Mesa, una partida persistente y un contrato de decisión. Sin nuevos frameworks, backend, cuentas, base de datos, servicios de IA, arquitectura de eventos ni lenguaje genérico de reglas.
- Un pequeño acceso compartido al material evita duplicación real; no construir un sistema universal de predicados, consultas de información o plugins por posibilidades futuras.
- No sumar nuevos indicadores ni recalibrar puntajes para que parezcan más precisos. Primero utilidad y comprensión; conservar pruebas de invariantes y reglas que importan.
- Fuerza, el resto de Tarot, 150 efectos completos, más dificultades y expansión de barajas quedan aplazados, salvo un efecto indispensable para un caso seleccionado. Ese cambio debe justificar qué consejo desbloquea.
- No Monte Carlo, aprendizaje automático, OCR, lectura de guardados o búsqueda profunda en A–C. Considerar automatización/simulación solo después de observar un fallo repetido que estos cambios pequeños no resuelvan, y comparar una prueba acotada con la alternativa sencilla.
- Jugar/saltar es la continuación una vez útil la tienda: reutilizar TAG01, pedir etiqueta/jefe que importe y comparar oportunidad/economía sin tienda ni robos ficticios. Se planifica su lote entonces; no bloquea A–C ni se promete cobertura completa ahora.
- No borrar las capacidades anteriores ni reescribir módulos sanos. Mantener H2 separado de interfaz/guardado; reglas provisionales, vigencia y confirmación explícita continúan intactas.

**UX01 implementada:** [resultado y pruebas](consejo-compacto-ux01.md). Compra, intercambio y dato pendiente se presentan de forma compacta con detalle recuperable, escritorio/390px y consulta sin escrituras. **Siguiente tarea concreta: UX01b**, observaciones básicas sin Guardar mediante la corrección/recuperación T09b existente; ante y fase conservan el recorrido observado.

---

<details>
<summary>Plan y entregas anteriores: conservados como historial, no como cola de ejecución vigente</summary>

## Hoja histórica: ejecución del asesor de partida

**EVAL01a (2026-10-18), aceptación acotada del consejo rápido:** [evaluación y resultados](evaluacion-asesor-eval01.md). Política `quick-shop-2`: admite refuerzo del mismo rol, distingue efecto preparado de nota editorial, explica reemplazos/efectos temporales, reserva e intereses condicionales, y limita compras a H2. Banco congelado antes de las salidas: 12 casos estratégicos de desarrollo y 6 reservados cumplen sus criterios sintéticos; un caso negativo de legalidad y dos límites de representación se informan aparte. 920 pruebas de código, ocho del runner y siete grupos web nuevos; 0 fallos, diez TODO manuales. **No cierra la eficacia estratégica ni la evidencia de partida.** Prioridad siguiente: OBS01d, resumen parcial del mazo con intersecciones desconocidas; sesiones reales EVAL01b y SURV02 siguen abiertas. Fuerza/DECK04e conserva su alcance y pasa después de esta prioridad.

**DECK04d (2026-10-18) entregado como software:** [Ermitaño/Templanza](tarot-dinero-deck04d.md) con L14, dependencias económicas específicas, uso propio y directo de Arcana, T09b y comparación contextual sin objetivos. Siguiente: Fuerza/cambios de rango; el resto de DECK04 y EVAL01 permanece abierto.

**DECK04c (2026-10-18) entregado como software:** [comparación de objetivos Arcana](objetivos-arcana-deck04c.md), búsqueda acotada de la próxima elección, proyecciones H2, apartados contextuales, sacrificios y abstención. No certifica equivalencia estratégica ni optimiza dos elecciones Mega. Continúa DECK04d para Ermitaño/Templanza y EVAL01 mantiene su validación independiente.

Plan del 15 de octubre de 2026. Actualización del 16: **SHOP03a, RUN01a y RUN01b completados como software**; [tienda persistente](tienda-persistente.md), [fases/migración recuperable](fases-y-migracion.md) y [recorrido observado](recorrido-run01b.md). Las demás entregas siguen pendientes. Parte de la [auditoría del código](reporte-codigo-2026-10-15.md). El [plan de producto](plan-asesor-de-partida.md) conserva el recorrido del juego, la evidencia y las entradas por momento; este documento concreta entregas, contratos y condiciones de cierre.

**Actualización 2026-10-17:** [SHOP02c](comparacion-sobres-shop02c.md) conecta el consejo de la próxima elección visible de Buffoon/Celestial con las acciones recuperables de SHOP02b. Mantiene alternativas independientes, encaje separado de bases/puntuación, mano objetivo opcional, empates/abstención y evidencia provisional. No recorre secuencias Mega completas. Continúa DECK04 para efectos de Tarot observados y objetivos; EVAL01 y SURV02 conservan dependencias independientes.

**DECK04a (2026-10-17) entregado como software:** [doce Tarot dirigidos](tarot-deck04a.md) poseídos, con mano real observada en ronda, proyección H2 y confirmación recuperable. No requiere historial previo exacto para transformar cartas; lo desconocido sigue desconocido. Siguiente: DECK04b/Arcana con mano y contenido observados, sin consumibles o robos ficticios. Jefes con debilitamiento no integrado y demás efectos permanecen limitados.

**DECK04b (2026-10-18) entregado:** [Arcana normal/Jumbo/Mega](arcana-deck04b.md), doce efectos compartidos, mano completa observada y uso directo sin inventario ficticio. No se ordenan automáticamente los objetivos. Continúa DECK04c para comparar combinaciones legales bajo la política contextual; demás Tarot/Spectral/Standard por familias y EVAL01 separados.

## 1. Resultado que se va a entregar

Una persona inicia o retoma una partida y la web conserva su situación. En cada selección de ciega o tienda ve una preferencia con su beneficio/sacrificio, alternativas empatadas o una pregunta concreta; puede consultar alternativas, confirmar lo que hizo o corregirlo. El consejo considera composición, baraja, etapa, dinero, vales, material del mazo y condiciones del jefe cuando esos datos están disponibles.

No se exige escribir planes de manos ni repetir el inventario. El análisis de manos sigue siendo una herramienta opcional. La nota y las barras resumen la composición, pero no deciden por sí solas una compra ni certifican supervivencia.

La acción preferida será la mejor **entre opciones evaluadas y bajo premisas declaradas**. Con información incompleta, el producto debe seguir siendo útil: dar una preferencia parcial, una condición o una pregunta concreta. No prometerá la ruta global óptima con datos que no conoce.

### Experiencia prevista

| Momento | Interacción del jugador | Respuesta de la web |
|---|---|---|
| Inicio | Baraja/dificultad; o situación actual si la partida ya empezó | Estado inicial compatible o continuación parcial; recuperar datos previos |
| Selección de ciega | Tag y jefe que aún no se conocen | Jugar/saltar comparados con sus sacrificios; pregunta si falta un dato decisivo |
| Fin de ciega en modo rápido | Resultado, saldo observado y cambios relevantes | Avance y conciliación del estado, sin transcribir cada mano |
| Tienda | Artículos/precios visibles | Comprar/ahorrar/reemplazar y secuencias pequeñas comparadas |
| Sobre abierto | Contenido visible y objetivos necesarios | Elección o uso concreto, respetando elecciones restantes |
| Acción real | «Compré», «Vendí», «Salté», «Usé» o resultado observado | Validar, guardar automáticamente, recalcular y permitir deshacer |

Las entradas de hechos son observaciones; las alternativas siguen siendo hipótesis. Ver un consejo, abrir una ficha o probar una compra nunca confirma esa compra.

## 2. Límites y criterio de prioridad

Primero se entrega un recorrido completo en el contrato actual: PC/Steam 1.0.1o-FULL, sin mods, White Stake y un subconjunto de efectos declarado. La cobertura se amplía por familias hasta conectar el catálogo existente; no se ocultan ni se declaran implementados los elementos restantes. Otras dificultades requieren una entrega propia, no valores de White introducidos por defecto.

No se cambia de framework, se añade backend ni se crea otra base de datos. Se reutilizan H1, H2, T07b, H3 y T09b. GitHub Pages y el guardado local bastan para este alcance. Leer capturas o guardados del juego queda como una mejora futura: no es una dependencia del asesor manual.

Se prioriza terminar recorridos comprobables antes de añadir más indicadores o formularios. Una regla pendiente bloquea su operación, no toda la partida. Las pruebas manuales de fidelidad continúan por los módulos que se vayan utilizando, sin exigir observar todo el catálogo de una vez.

## 3. Contratos mínimos

### Partida y confirmaciones

- Una sola fuente de hechos persistentes y una tienda observada compartida por Mesa, motor y asesor. Los borradores inválidos y las alternativas no sustituyen el último registro válido.
- Fases explícitas: selección, ronda, resultado/cobro, tienda, sobre y fin; el sobre conserva la fase a la que debe regresar. Cada transición declara qué conoce, qué calcula y qué queda pendiente.
- Una confirmación aplica una operación legal al registro. Una observación corrige o completa un hecho. Ambas usan revisión, identificador único, persistencia atómica e historial de T09b.
- Las observaciones válidas se guardan al completar la edición; no se crea una entrada por cada tecla. Mostrar «Guardado» solo tras éxito. Los botones de acción usan pasado («Compré»), para distinguirlos de consultar.
- Ante discrepancias entre juego y modelo, conservar los datos observados mediante corrección explícita. No inventar una operación exitosa ni forzar al usuario a aceptar el cálculo.
- La migración conserva el archivo anterior y contempla `initialState`, `state` y los estados `before/after` de **todo el historial**. Un antiguo `draft` no se convierte en selección sin evidencia suficiente; pedir solo esa aclaración.

El almacén actual presupone un escritor. Al integrar el autoguardado hay que definir y comprobar cómo se evita la escritura simultánea de dos pestañas; comparar revisiones antes de escribir no constituye por sí solo una transacción entre pestañas. El primer alcance puede limitar la edición a una pestaña activa y dejar las demás en consulta. No prometer sincronización remota ni colaboración.

### Hechos parciales y preguntas

Una necesidad de datos incluye campo/entidad, tipo de respuesta, motivo, opciones afectadas y condiciones de caducidad. Priorizar las preguntas cuya respuesta podría cambiar la preferencia; reutilizar la respuesta hasta que una acción o un cambio la invalide.

Un mazo completo y un resumen parcial son representaciones distintas. Conservar cantidades, intersecciones conocidas y desconocidos sin fabricar cartas o IDs. Un resumen parcial no entra al puntuador exacto como un mazo íntegro. Los contadores no reconstruibles con el resumen de ronda se preguntan por su valor final observado.

### Análisis y recomendación

Entrada: revisión de partida, fase, ofertas/alternativas observadas, hechos, capacidades y política identificada. Vincular el resultado también al contexto de evaluación: si cambian ofertas, hipótesis o política, invalidar la comparación aunque la partida no haya realizado otra acción.

Salida mínima:

- Acción o secuencia preferida y alternativas legales consideradas; límites de búsqueda.
- Consecuencias calculadas: dinero, inventario, recursos, efectos y crecimiento que se conservan o sacrifican.
- Motivos con referencia al dato, cálculo o criterio utilizado; separar exacto, escenario y expectativa heurística.
- Opciones no dominadas, empate, preferencia condicional o abstención. Una rama incompleta no impide comparar dos ramas independientes bien definidas.
- Datos faltantes, supuestos y reglas provisionales que pueden cambiar esa preferencia.

No se suman dólares, fichas y contadores en una sola unidad. Las barras editoriales se mantienen como resumen, separadas de la recomendación y de las pruebas de supervivencia.

### Dónde vive cada responsabilidad

| Capa existente | Cambio previsto |
|---|---|
| `src/state` | Versionar fases y observaciones parciales, validarlas y migrar estados; sin decidir compras |
| `src/rules` | Transiciones legales puras, tags y operaciones aún no conectadas; reutilizar sus fórmulas |
| `src/storage` | Ampliar confirmaciones y observaciones de T09b, conservar revisiones/recuperación; sin puntuar alternativas |
| `src/evaluation` | Aplicar alternativas a copias y generar/evaluar escenarios; separar la búsqueda de la política estratégica |
| `src/advisor` | Contrato de decisión, criterios contextuales, necesidades de datos y explicaciones derivadas de resultados |
| `src/catalog` | Capacidades, requisitos de efectos y evidencia por versión; una descripción no habilita una operación |
| `src/ui` | Un coordinador pequeño conecta lectura, consulta y confirmación; las vistas no duplican estado ni fórmulas |

No se conserva otra partida real dentro del asesor o de la tienda. El asesor recibe datos y devuelve resultados; no lee DOM/almacenamiento ni confirma acciones.

## 4. Entregas y dependencias

Los IDs amplían el backlog vigente; no sustituyen sus entregas históricas. El primer corte se limita a tienda para aprovechar lo que ya funciona.

| Entrega | Tareas y resultado | Dependencia real | Condición de cierre |
|---|---|---|---|
| A. Tienda que conserva cambios — entregada | **SHOP03a:** ofertas visuales de comodines compartidas, compra/venta confirmadas, autoguardado y deshacer desde la misma ficha | H1/H2/T09b actuales; no necesita sobres ni todas las fases | Comprar Joker de $2 con $25 deja $23, consume un hueco y retira la oferta; recargar conserva y deshacer recupera. Consultar no escribe |
| B. Recorrido persistente — entregado dentro del contrato | **RUN01a:** esquema/fases y migración; **RUN01b:** iniciar/retomar, resultado observado y siguiente selección/tienda | Integrado con T09b; no depende de simulación ni tags | Selección → ronda/resumen → cobro observado → tienda → selección; fin ante8/derrota/detención. No inventa stock, jefe o robos. Los datos dinámicos no observados caducan; OBS01 afina sus dependencias |
| C. Información mínima | **OBS01:** hechos parciales, preguntas por dependencia y actualización de contadores/contexto; **CAP01a:** capacidades por operación | Paralela a A/B; reutiliza validación y catálogo | No repetir inventario ni pedir cartas irrelevantes. Desconocido sigue desconocido; desactualizar solo respuestas afectadas |
| D. Mejor consejo de compra | **DEC00:** contrato unificado; **DEC01:** consecuencias incrementales; **SURV01:** nivel de evidencia de supervivencia | A + datos necesarios de C; no necesita jugar/saltar o sobres | Compra útil del mismo rol, ahorro, reemplazo compensado y pérdida de crecimiento explicados. No usar encaje ≥70 o rol faltante como permiso universal |
| E. Jugar o saltar | **TAG01a:** acción legal y efectos observados; **TAG01b:** comparación de oportunidades | B + capacidades de tags; comparación con DEC00/SURV01 | Boss no saltable; sin cobro/tienda ficticios. Economy/Investment y crecimiento de Throwback como primer lote. Incluir tienda y desarrollo sacrificados sin inventar su valor monetario |
| F. Tienda completa por lotes | **SHOP02a/DECK04:** compra/uso de vales y consumibles, apertura y elecciones de sobres | A + fases/contextos de B; comparación con D | Pagar, abrir, elegir, usar y omitir separados. Primero vales ya compatibles, planetas, Buffoon y Celestial; después Tarot/Spectral y restantes efectos con objetivos |
| G. Evaluación automática de capacidad | **SURV02:** escenarios internos; **PG02/PG03 (H4):** contrato de azar, política de juego y muestreo reproducible | H2 y datos suficientes de C; no requiere todos los 150 efectos | El usuario no escribe un `RoundPlan`. Cartas legales, mismo entorno externo, política que puede adaptar su jugada a cada alternativa, recursos y parada temprana correctos |
| H. Consejo probado y alcance ampliado | **EVAL01/PG04 (H5):** casos reservados y sesiones; **CAP01b:** familias de comodines/vales/barajas/jefes | Evaluación empieza en paralelo; cierre sobre entregas integradas y reglas utilizadas | Separar fidelidad de reglas, calidad del consejo y facilidad de uso. Publicar cobertura/resultados, incluidos desacuerdos y abstenciones; no declarar validez universal |

**Orden de integración:** A → B → D → E/F → G → H. C y el diseño de B avanzan junto a A; el banco de pruebas de H empieza antes de ajustar la política. D puede desarrollarse sobre A sin esperar a todas las fases de B; E/F no necesitan esperar a un simulador probabilístico.

No existe dependencia de SHOP03a respecto de abrir sobres. La incertidumbre sobre tags tampoco bloquea vender un comodín compatible en tienda.

## 5. Cómo se construye el criterio estratégico

### D: comparación incremental y contexto

1. Enumerar conservar, comprar, vender y venta→compra. Añadir después cambios de orden y secuencias acotadas de dos acciones; declarar exclusiones y presupuestos. Cada paso valida dinero, espacios y efectos resultantes.
2. Evaluar efectos que se activan, requisitos materiales, disponibilidad de recursos y pérdidas al vender. Las sinergias documentales pasan a predicados comprobables por lotes, con sus contraejemplos.
3. Separar necesidad inmediata, oportunidad de crecer y reserva económica. El ante modifica el horizonte disponible, pero no sustituye conocer preparación, recursos y jefe.
4. Eliminar solo opciones dominadas cuando sus consecuencias y premisas sean comparables. Si se cambia dinero por puntuación o preparación, mostrar el intercambio y aplicar un criterio visible, no una suma arbitraria.
5. Si la suficiencia ante la ciega no está demostrada, no diagnosticarla con el puntaje global. Usar un resultado acotado, una expectativa declarada o pedir el dato que cambia la decisión.

La ausencia de una sinergia catalogada no prueba que una mejora sea inútil. Un contador mayor tampoco es crecimiento aprovechable sin oportunidades y forma de convertirlo en puntuación o recursos.

### E/F: decisiones con contenido desconocido

Saltar compara efecto del tag, cobro condicional de jugar, crecimiento/consumos, acceso a tienda y preparación del próximo objetivo. El contenido de una tienda futura se registra como oportunidad desconocida; no se inventa una oferta ni se le asignan dólares sin modelo.

Un sobre cerrado solo permite valorar coste, capacidad de elección y familias potencialmente útiles bajo supuestos declarados. Después de abrirlo, se compara contenido real y objetivos legales. No presentar una carta deseada como resultado de comprar el sobre. Las distribuciones aleatorias solo se usarán si se modelan sus reglas y contexto.

### G: pasar de reglas útiles a pruebas de capacidad

Primero generar automáticamente casos internos reproducibles de activación, fallo y estrés. T07b permanece como laboratorio para escenarios explícitos; no se promedian esos casos como si fueran equiprobables ni se llaman consistencia del mazo.

Después hace falta un modelo de evaluación de juego contrastado, mediante búsqueda, simulación u otro método comprobable. La entrega de muestreo H4 necesita especificar robos, reemplazo/sin reemplazo, efectos aleatorios y una política de elegir mano/descartar/retener. H2 o EFHIII puntúan dentro de su cobertura; no eligen por sí solos una buena estrategia. El modelo debe validar esa política por separado. Comparar alternativas con azar externo equivalente cuando corresponda, permitiendo diferencias propias de cada alternativa y registrando el presupuesto de búsqueda.

El primer horizonte será la siguiente ciega compatible, después el tramo hasta el jefe. No extender el actual horizonte de rondas consecutivas fingiendo que incluye tiendas y saltos. Un resultado para ese horizonte no es probabilidad de ganar ante 8. Las estimaciones solo se muestran después de contrastar fidelidad, error y estabilidad; los casos sin datos suficientes conservan consejo heurístico condicionado.

### H: llegar al objetivo sin esconder límites

Ampliar los efectos internos aún desconectados por familias: contexto necesario → operación/puntuación → explicación → confirmación real → pruebas. Registrar por separado capacidad de mostrar, valorar, puntuar, aplicar y confirmar. Esto incluye los 150 comodines, los 32 vales y las 15 barajas del catálogo, sin habilitarlos por una bandera general. Dificultades adicionales y jefes necesitan sus propias pruebas.

La simulación no bloquea una primera versión útil del recorrido. Para fundamentar una evaluación automática amplia del rendimiento hace falta un modelo de juego validado, más allá de reglas y escenarios concretos; la simulación es una técnica posible. Esa capacidad no se anunciará como terminada por ocultar el editor de planes.

## 6. Banco de aceptación desde el comienzo

Crear fixtures versionados antes de ajustar la política. Cada uno incluye hechos, incógnitas, alternativas, cálculos de referencia independientes, razones aceptables y afirmaciones prohibidas. No fijar una compra como óptima sin evidencia. Separar desarrollo/ajuste y un conjunto reservado de evaluación; los ejemplos usados para escribir reglas no acreditan generalización.

| Caso | Comportamiento que se exige |
|---|---|
| Compra/venta básica y reemplazo parcial | Saldo/espacios/oferta correctos; confirmar solo venta no confirma compra; dos acciones legítimas distintas no se confunden con doble clic |
| Ahorro frente a mejora poco útil | Explicar dinero y beneficio marginal; una mayor nota no obliga a comprar |
| Refuerzo del mismo rol necesario en el escenario | No descartarlo por rol repetido; dar resultados y premisas que justifican gastar |
| Reemplazo de escalador desarrollado | Comparar compensación; no protegerlo ni venderlo por una regla absoluta |
| Barón/Mimo y mazo parcial | Preguntar solo material/condiciones relevantes; no inventar reyes retenidos ni intersecciones rey/Acero |
| Vale que cambia recursos o economía | Aplicar una vez y propagar al análisis; conservar limitación cuando el efecto no esté implementado |
| Saltar cambia dinero pero sacrifica tienda/crecimiento | Mostrar ambos lados; no declarar ganador solo por saldo. Red Card no crece por saltar ciega |
| Jefe o dato nuevo invierte la preferencia | Invalidar consejo y preguntas afectadas; conservar datos independientes |
| Mismo candidato con distinta etapa/baraja/preparación | Justificar por qué cambia o no la preferencia; el número de ante no impone una clasificación fija |
| Sobre cerrado frente a abierto | No anticipar contenido; respetar origen, elecciones y uso; omitir no equivale a saltar ciega |
| Rama incompatible o incompleta | Conservar comparaciones válidas y marcar que no existe una ganadora universal |
| Recarga, error de guardado, importación y revisión vieja | Estado/historial consistentes; copia previa recuperable; no duplicar acciones ni aplicar consejo antiguo |
| Sesión completa y continuación a mitad de partida | Seguir hasta ante 8 o derrota real sin reintroducir inventario ni preparar planes; no convertir escenario insuficiente en derrota observada |

Tres evaluaciones independientes:

- **Reglas:** esperado previo y evidencia primaria; distinguir inspección estática, contraste con otra implementación y partida observada. Comparar solo intersecciones compatibles con EFHIII.
- **Política:** acciones legales, contradicciones, opciones dominadas, sensibilidad y revisión de decisiones. Más adelante, experimentos con políticas de referencia, presupuesto equivalente, casos reservados e incertidumbre. No medir calidad por acuerdo con la misma heurística.
- **Uso:** número de entradas y repeticiones, preguntas que cambian una decisión, tiempo/fricción y errores de transcripción en tareas concretas. Registrar resultados, sin inventar participantes o umbrales ya cumplidos. PC y móvil emulado; Android físico sigue aplazado por decisión del usuario.

Antes de ajustar H5 se fijan las políticas de referencia, horizonte, conjuntos reservados y criterios para aceptar, rechazar o limitar una mejora. Si no supera esa evaluación, se conserva el consejo básico y se registra el resultado; añadir simulaciones o decimales no acredita progreso estratégico.

## 7. Cierre del alcance y primera tarea

La primera versión del nuevo recorrido se cierra cuando A–F permiten una sesión con recomendaciones condicionadas y todos los casos compatibles pasan; se publica como **asesor heurístico**, con matriz de cobertura vigente. G/H son la continuación para fundamentar mejor la capacidad y evaluar el consejo; la aprobación del software no cierra H2 empírico, H4 o H5.

El resultado final buscado requiere además que la política se evalúe en sesiones y casos reservados, que sus límites estén visibles y que el seguimiento no obligue a repetir datos. Alcance ampliado y calidad estratégica tienen cierres separados: completar catálogo no demuestra recomendar mejor.

### RUN01a entregado y continuación

El modelo existente ya admite estado `0.2` y registro `confirmed-2`, con datos discriminados por fase. [Contrato y uso](fases-y-migracion.md). No se envuelve el estado en otra partida persistente: existe una sola fase autoritativa. La implementación y sus pruebas satisfacen los puntos técnicos siguientes; no equivalen a implementar sus transiciones reales:

- Congelar los validadores antiguos y validar antes/después de una migración pura. Convertir también `initialState`, `state` y cada `before/after`; conservar IDs, revisiones, fechas y evidencia, sin reproducir acciones con reglas nuevas.
- `shop` antiguo puede conservar su fase; `draft` pasa a una fase desconocida con motivo. No convertirlo en victoria, derrota o selección por conveniencia.
- Mantener la misma clave activa y Web Lock; usar respaldo íntegro del documento antiguo antes del reemplazo atómico. Si falla respaldo, validación, cuota o conflicto, el registro activo previo continúa recuperable.
- Vincular análisis también a la versión del esquema para invalidar consejos anteriores a la migración, aunque la revisión numérica no cambie.
- Revisar `finishRound`, horizontes y editor, que hoy construyen `draft` o asumen tienda. Una unión de tipos por sí sola no resuelve esas transiciones. Las rondas hipotéticas nunca pasan a ser fases reales automáticamente.
- Cerrar con migración de historial mixto compra/reemplazo/corrección/undo, copia H1 sin historial, `draft` ambiguo, documento roto/futuro, fallos de respaldo/escritura y regresión de H2/SHOP03a.

**RUN01b entregado:** inicio/continuación, selección, resultado declarado, saldo absoluto, tienda y siguiente selección; [contrato y límites](recorrido-run01b.md). No aplica los hooks proyectados de H2 ni reconstruye Green desde totales de manos/descartes. Terminar el recorrido no cierra la eficacia estratégica.

**OBS01a entregado:** [grupos independientes y hechos numéricos pendientes](observaciones-obs01a.md). No cierra OBS01 ni la matriz CAP01a.

**OBS01b entregado para cartas y consumibles:** [registro por instancia y referencia real](cambios-inventario-obs01b.md). No aplica efectos de uso ni restaura historia obsoleta.

**OBS01c entregado para correcciones puntuales:** [copias de comodines, bases e historial parcial](datos-puntuales-obs01c.md). Continúa la conciliación de cambios de identidades y preguntas priorizadas; no se restaura un inventario desconocido ni se ejecutan consumibles.

**CAP01a/DEC00 entregado:** [capacidades por operación](capacidades-cap01a.md) e [informe por revisión/fase/ofertas](contrato-decision-dec00.md). El catálogo no certifica todos los efectos; cada transacción/escenario conserva sus pruebas y evidencia. Las preguntas corresponden a bloqueos encontrados y ejes de encaje sin completar. Los resultados hipotéticos no habilitan registro real.

**DEC01/SURV01 entregado con planes explícitos:** [consecuencias inmediatas y comparación visible](consecuencias-dec01-surv01.md). La tienda permite activar los escenarios temporales de Análisis sin exigirlos para la valoración básica. Dinero/huecos/recursos y pérdidas por reemplazo vienen de H2; objetivo, consumos, sensibilidad y preferencia de H3. No calcula supervivencia sin planes ni interpreta el fallo de un plan como derrota.

**TAG01a/b entregados con alcance acotado:** [registro](etiquetas-tag01.md) y [comparación](comparacion-ciegas-tag01b.md). Economía/Inversión proyectadas, sin copiar el resultado al registro; planes actuales/siguientes explícitos por DEC00/H3/T07b. Preferencia condicional para los ocho efectos iniciales retenidos, sin probabilidades ni precio de tienda futura. TAG01 permanece parcial por los otros premios, política ampliada y contraste en partida.

**SHOP02a, lote de diez vales entregado como software:** [contrato y evidencia](compras-vales-shop02a.md), compra confirmada con precio observado, prerrequisitos y cambio de recursos mediante H2/T09b; consultar no adquiere. Otros 22 vales y descuentos pendientes, sin ranking H3 de vales. **SHOP02b entregado como software:** [seis sobres y elecciones observadas](sobres-shop02b.md), sin generar contenido ni ingreso futuro. **SHOP02c entregado como software:** [próxima elección visible](comparacion-sobres-shop02c.md), dominancia contextual conservadora, intención Celestial y omitir, sin una búsqueda de secuencias Mega. **DECK04a entregado:** doce Tarot propios con objetivos en ronda. **DECK04b entregado: Arcana con mano y contenido observados**. Siguiente DECK04c, comparación de objetivos legales; demás Tarot, Black Hole, Spectral/Standard y descuentos siguen en DECK04/SHOP04. SURV02 y EVAL01 conservan sus dependencias independientes.


</details>
