# Informe del código — Balatro Advisor

Fecha: 15 de octubre de 2026. Código auditado: `56a495354f23eb3d21961ddb10d8c1945d856f04`, publicado en GitHub Pages. Este informe no incorpora nuevas reglas, modifica cálculos ni habilita comodines.

**Conclusión:** hay una base reutilizable de estado, reglas, persistencia y evaluación. La web funciona como valorador contextual de una composición y comparador de escenarios acotados. **Todavía no funciona como acompañante continuo de una partida que aconseje jugar/saltar, comprar, usar objetos y avanzar con pocas entradas.** Para lograrlo falta integrar el recorrido de partida y mejorar la política de decisiones; no basta con completar datos de comodines o cambiar el diseño.

El [plan de producto y recorrido paso a paso](plan-asesor-de-partida.md) explica cómo llegar a ese objetivo.

## 1. Inventario comprobado

Conteo del código, no de las cifras históricas del README: 93 archivos TypeScript de fuente y 41 de pruebas; unas 11.150 líneas de fuente, incluidas 1.940 del simulador EFHIII vendorizado. Las líneas describen tamaño, no calidad o avance porcentual.

| Capa | Lo que hay | Límite relevante |
|---|---|---|
| Estado | Hechos conocidos/desconocidos, identidades de cartas/comodines, revisiones, validación y copias independientes | La fase persistida solo admite `shop` o `draft`; no representa el ciclo completo |
| Guardado | Estado e historial atómicos, revisiones, duplicados, corrección/deshacer, exportación/importación | Las confirmaciones actuales son de acciones de tienda, no de toda la partida |
| Reglas | Comprar/vender/reemplazar, puntuar manos, efectos, contadores, recursos y fin de ronda | Cobertura y contexto admitido limitados; parte del núcleo ampliado no está conectada a la web |
| Escenarios | Manos/descartes/robos explícitos; mismas condiciones por alternativa; parada temprana | Los escenarios los proporciona el usuario; no se generan estrategias de juego adaptadas |
| Asesor H3 | Comparación por escenario, sacrificios, economía y recursos; empate/abstención | No decide saltos ni compara paquetes, vales, consumibles y compras múltiples por ese flujo |
| Encaje rápido | 150 perfiles y condiciones de preparación, etapa, material y familias de composición | Es una rúbrica editorial; no mide probabilidades de ganar ni puntuación efectiva de una ronda |
| Tienda de Mesa | Ofertas con precio/edición, reemplazo seleccionado, vales y sobres; consejo contextual | Ofertas solo de sesión; no están unificadas con la tienda guardada o las confirmaciones |
| Web | Cliente estático, recursos locales, PC/móvil emulado y GitHub Pages automático | No lee Balatro, su semilla, capturas o guardados del juego automáticamente |

### Cobertura: cuatro cosas distintas

- **150 comodines en catálogo y perfiles contextuales.** El catálogo web habilita `engineId` para **82**; los otros **68** tienen `null` y el cálculo detallado de la interfaz los limita expresamente. [Catálogo](../web/assets/jokers/catalog.json), [prueba de contrato](../tests/collection.test.ts), [entrada del cálculo web](../src/ui/app.ts#L291).
- **El núcleo contiene más efectos que los habilitados en la web.** Hay módulos de generación, historial, azar y economía. No corresponde decir que todos esos efectos faltan, ni habilitar los 68 quitando una bandera sin conectar sus datos y resultados.
- **32 relaciones documentales** en la biblioteca de sinergias, con `engineSupport: reference-only`. Por separado hay **17 familias de composición con predicados programados**. Una relación descrita no significa que todas sus variantes se calculen. [Biblioteca](../src/catalog/synergies.ts), [predicados](../src/advisor/composition-signals.ts).
- **15 barajas catalogadas, 10 admitidas por H2; 32 vales catalogados, 10 con efectos persistentes integrados; 15 tipos de sobres con metadatos e imágenes.** Esto no equivale a comprar, abrir y resolver todo ese contenido desde la web. [Barajas](../src/catalog/decks.ts#L71), [vales](../src/catalog/vouchers.ts), [sobres](../src/catalog/booster-catalog.ts).

H2 mantiene el contrato PC/Steam, `1.0.1o-FULL`, sin mods, White Stake y diez barajas. Sus jefes exactos disponibles son Psychic, Water, Wall y Violet Vessel. Las demás dificultades/jefes no se vuelven compatibles por introducir su nombre o su objetivo manual. [Control de alcance](../src/rules/core.ts#L55), [ciegas](../src/catalog/blinds.ts).

## 2. Lo que conviene conservar

1. **Separación de hechos e hipótesis.** El modelo distingue desconocido de cero y el evaluador no debe cambiar la partida por consultar una alternativa. Es una garantía esencial para el nuevo producto.
2. **Funciones de reglas con trazas y legalidad.** `applyShopAction`, `beginRound`, `applyRoundEvent`, `finishRound` y `applyGameEvent` evitan reescribir reglas dentro de un asesor nuevo. [Tienda](../src/rules/shop.ts), [ronda](../src/rules/round.ts), [eventos ampliados](../src/rules/full-events.ts).
3. **Persistencia y control de revisiones.** T09b ya resuelve buena parte de guardar juntos estado/historial, impedir duplicados y corregir errores. Extender su contrato es preferible a construir una arquitectura nueva de eventos. [Almacenamiento confirmado](../src/storage/confirmed-store.ts).
4. **Comparación equivalente.** T07b conserva cartas y supuestos por alternativa, termina una ronda cuando corresponde y separa resultados incompletos de derrota. Es una base útil para evaluar decisiones futuras.
5. **Evidencia explícita.** Hay reglas respaldadas por inspección, pruebas documentales, contraste acotado con EFHIII y modo estricto. Deben conservarse sus diferencias.

No hace falta migrar de framework, añadir backend, cuentas, una base de datos remota o reescribir la interfaz para comenzar el siguiente alcance.

## 3. Brechas funcionales que cambian el consejo

### A. Falta una partida que avance por fases

`GameState.phase` solo admite `shop | draft`. Existe una ronda efímera, pero `finishRound` deja desconocidas la siguiente ciega/tienda y vuelve a `draft`. No hay transición confirmada de selección de ciega, salto, ronda activa, cobro y apertura de sobre. [Modelo](../src/state/model.ts#L55), [fin de ronda](../src/rules/round.ts#L187).

`blindsSkipped` y `tags` son datos de contexto para efectos: **no son una implementación de saltar ciegas**. El horizonte actual exige ciegas consecutivas y excluye operaciones intermedias. [Eventos](../src/rules/full-events.ts#L20), [horizonte](../src/evaluation/horizon.ts#L18).

### B. Mesa, Tienda y Registro no forman un único flujo

Las ofertas de `storefront.ts` viven en arrays de sesión. El formulario sigue construyendo `observed.shop` desde el editor avanzado; H3 consulta `record.state` y requiere guardar los cambios. La tienda que el usuario está mirando no alimenta automáticamente ese flujo. Es una separación documentada, no una corrupción del guardado. [Tienda visual](../src/ui/storefront.ts#L15), [lectura de estado](../src/ui/app.ts#L249), [consulta H3](../src/ui/app.ts#L395).

La venta rápida actualiza el borrador de dinero/inventario y avisa que no se guardó. Recargar puede recuperar el registro previo. La tienda nueva tampoco confirma sus compras, adquisición de vales o elecciones de sobres. Este comportamiento debe cambiar antes de prometer seguimiento automático de una run.

### C. Hay funciones internas que el usuario no puede alimentar cómodamente

`mountFullJokerData` y `mountEffectChoices` existen, pero no tienen importación/invocación desde el flujo principal. T09b confirma `hold/buy/sell/replace`; su corrección no admite `jokerContext`. Los eventos internos de planetas, consumibles, sobres y fin de tienda todavía no mantienen una partida real por ese sistema. [Editor desconectado](../src/ui/full-joker-data.ts#L18), [confirmaciones y campos corregibles](../src/storage/confirmed-store.ts#L15).

La solución no es montar de golpe otro formulario enorme: hay que conectar esas capacidades mediante preguntas y acciones concretas.

### D. El consejo rápido no equivale a elegir la mejor compra

La política exige encaje al menos 70 y un rol sin soporte o una sinergia identificada; además protege conservadoramente crecimiento existente. No calcula cuánto compensa cada mejora ni la urgencia de la siguiente ciega. [Condición de compra](../src/advisor/shop-context.ts#L120).

Hay una prueba que exige ahorrar frente a un segundo Joker cuando ya se posee uno. Esa compra puede sumar Mult; la política la descarta por no identificar una mejora del tipo exigido. Esto no demuestra que comprarlo sea siempre correcto, pero sí que **cubrir un rol nuevo no puede ser requisito universal para una mejora útil**. La necesidad de puntuación puede justificar reforzar un rol existente o sustituir un escalador desarrollado. [Caso reproducible](../tests/shop-context.test.ts#L54).

También se conserva la diferencia entre precio observado y transacción validada: con descuentos no admitidos se calcula el saldo aritmético, pero H2 puede devolver `unsupported_price`. No basta con mostrar un precio editable para admitir todo el sistema de precios. [Compra](../src/rules/shop.ts#L65).

### E. Los números actuales no diagnostican supervivencia

Quick-fit usa anclajes de ante 1/4/8 y ajustes editoriales. La sección «Puntuación» utiliza encaje y cobertura de roles, no fichas de una mano; el global promedia apartados aplicables. Un valor mayor no demuestra mayor probabilidad de ganar, ni la diferencia entre dos globales justifica por sí sola gastar. [Política individual](../src/advisor/fit-index.ts), [política global](../src/advisor/composition-policy.ts), [contrato](composicion-global.md).

H3 sí comprueba objetivos en planes suministrados, pero se abstiene sin escenarios. Ocultar el formulario de planes no proporciona la evaluación que falta. [Asesor](../src/advisor/advisor.ts#L149), [alternativas excluidas](../src/evaluation/comparison.ts#L82).

## 4. Mantenimiento y documentación

- El código está separado en capas útiles. Parte de las funciones está muy comprimida y `app.ts` coordina formulario, borrador, escenarios y registro; añadir el nuevo ciclo ahí sin un coordinador pequeño haría más difícil comprobar sus transiciones.
- Conviene centralizar una **matriz de capacidades**: visible en catálogo, evaluable contextualmente, puntuable, aplicable y confirmable, con datos necesarios. Evitar que UI, catálogo y motor prometan coberturas diferentes.
- El README/backlog acumulan cifras históricas de 8/41/82 comodines y 141/375/522 pruebas. Aunque hay avisos históricos, dificultan entender el estado actual. Un resumen vigente corto debe preceder al historial.
- `evidence.ts` contiene una referencia L08 a `docs/comodines-cat04.md`, ausente en este checkout. Es una referencia documental rota; no prueba que falte todo el módulo. Reparar el enlace sin inventar evidencia.

## 5. Qué acreditan las pruebas

La ejecución de migración y el workflow `38837789088` aprobaron **522 pruebas**, con **10 TODO manuales**, tipos/build y ocho grupos estáticos. El acceso público también se comprobó sin sesión, con importación/recarga y consulta inmutable. [Workflow](https://github.com/alejandroarielliliu-stack/balatro-advisor/actions/runs/38837789088).

En esta auditoría se volvió a ejecutar la suite de tienda: **29/29 aprobadas**, incluida la política de ahorrar ante el segundo Joker. Las pruebas verdes acreditan los contratos programados; **no validan que el consejo maximice las posibilidades de ganar**. EFHIII contrasta una intersección de puntuación, no decisiones de saltar, contenido de sobres o eficacia estratégica. No se jugó una partida nueva en Balatro para este informe.

## 6. Primera entrega que desbloquea el objetivo

**RUN01 + SHOP03: una sesión real por fases, acciones observadas confirmadas y tienda unificada, con autoguardado y deshacer.** Debe permitir empezar una partida, transcribir solo cambios y conservarlos al recargar, sin que consultar modifique el estado real.

Después: motor legal de jugar/saltar con tags, preguntas por dependencia y un comparador contextual que pueda reforzar un rol existente. El orden, las entradas mínimas y las pruebas de aceptación están en el [plan](plan-asesor-de-partida.md). Completar los 150 de principio a fin y calibrar la estrategia siguen siendo trabajos distintos.
