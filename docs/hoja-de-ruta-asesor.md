# Plan de ejecución: asesor de partida con pocas entradas

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
