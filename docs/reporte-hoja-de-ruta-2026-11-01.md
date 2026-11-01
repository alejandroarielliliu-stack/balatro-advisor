# Estado de la hoja de ruta — 1 de noviembre de 2026

Revisión del código y la documentación en `5bcef642208aee92fc5670108bd7709387236afc`. No se ejecutaron pruebas nuevas ni una partida de Balatro para elaborar este reporte. Se contrastaron las fuentes, las comprobaciones conservadas y la evidencia pública de la última entrega. Los cambios de esta revisión son documentales. **Actualización posterior:** [DEC02](comparacion-dec02.md) ya tiene una primera entrega de software. Las tablas siguientes conservan el diagnóstico previo al ajuste y su revisión `5bcef64`; el orden actual está en el backlog.

## Diagnóstico

La estructura del asesor está construida y la web está publicada. Ya permite mantener una partida y obtener valoraciones contextuales de composición y tienda con pocos datos. El trabajo principal pendiente es **distinguir mejor entre alternativas y comprobar que el consejo sea útil durante una partida**.

No corresponde decir que solo faltan datos, que todos los efectos están completos ni asignar un porcentaje de avance al plan general. La cantidad de pruebas tampoco mide la calidad estratégica.

## Entrega vigente

| Parte | Estado comprobado | Límite pendiente |
|---|---|---|
| UX01: consejo breve | Implementado: conclusión, beneficio/sacrificio y detalle recuperable | Comprensión y utilidad con jugadores |
| UX01b: datos sin Guardar | Implementado: dinero, inventario/orden, contadores y vales, revisión, errores y recuperación | Los ajustes avanzados conservan su flujo explícito |
| OBS01d: mazo actual | Implementado: inicio compatible, cambios de cartas guardados y material compartido por valoraciones/composición/tienda | Un mazo desconocido no se reconstruye; Errática necesita sus cartas reales |
| DEC02: comparación práctica | Pendiente como mejora de política; ya dispone de legalidad, costes, pérdidas y valoraciones reutilizables | Elegir solo cuando la diferencia esté justificada; consejo parcial y condiciones útiles |
| EVAL01b: utilidad | Pendiente; puede comenzar con el flujo actual | Comprobar esfuerzo de entrada, comprensión, errores y decisiones con casos nuevos y uso real |

La web pública conserva evidencia de diez grupos de navegador, veinte archivos contrastados y cero errores JavaScript para el commit revisado y el workflow `41350594984`. La comprobación de código de la entrega registra967 aprobadas,0 fallos y10 TODO manuales. Las pruebas Chrome/390px son actuales; las comprobaciones Firefox y rendimiento anteriores conservan su versión y alcance.

## Cobertura real

| Elementos | Qué está disponible | Qué no certifica la cifra |
|---|---|---|
| Comodines |150 fichas y150 perfiles de valoración;82 entradas del catálogo enlazadas al cálculo web mediante `engineId` | No son150 efectos completos, ni82 comodines con todas sus interacciones certificadas |
| Composiciones |17 familias ejecutables, requisitos de material y condiciones | No abarcan todos los combos posibles ni prueban que las cartas se robarán/retendrán |
| Vales |32 registrables,10 con efectos integrados en el motor | Registrar un vale no implementa automáticamente sus reglas |
| Sobres |15 catalogados,9 tamaños/familias integrados: Buffoon, Celestial y Arcana | Otros contenidos y secuencias permanecen limitados |
| Barajas |10 perfiles integrados;15 catalogados | El nombre no reconstruye un mazo modificado o aleatorio desconocido |
| Reglas/calidad | Motor determinista, trazas, oráculos y contraste puntual EFHIII | El registro activo mantiene evidencia provisional; diez casos manuales siguen pendientes de observación |

Estos datos se comprobaron en catálogo/perfiles, `catalogCapabilities`, `supportsVoucher`, familias de sobres y perfiles de baraja. La ruta de puntuación del catálogo es condicional: solo una operación H2 concreta puede certificar la compatibilidad de un estado/efecto.

## Brecha del consejo rápido

En `src/advisor/shop-context.ts`, varias compras preparadas desembocan en un empate general. Los intercambios relevantes también se muestran como alternativas condicionadas sin una comparación más precisa entre coste y beneficio. Una oferta manual sin evaluar puede causar abstención global, aunque las opciones conocidas conserven resultados propios.

`src/advisor/decision.ts` ya proporciona operaciones independientes, legalidad, consecuencias y preguntas. El recorrido normal prueba conservar y una compra/reemplazo seleccionado por oferta; no enumera automáticamente todos los reemplazos ni secuencias de varias compras. Lo declara no exhaustivo.

Las barras y notas son índices orientativos de preparación. La puntuación de una mano se calcula en su modo específico; la supervivencia no se acredita solo por esos índices. Hay comparaciones por escenarios explícitos, con sus límites, que se reutilizan cuando están disponibles.

## Ajustes necesarios en el plan

1. **Mantener el objetivo y la prioridad DEC02.** La hoja vigente ya frenó la expansión innecesaria. La infraestructura, un nuevo motor o completar todas las cartas no son requisitos para mejorar el consejo actual.
2. **Consolidar el flujo de datos acordado.** Composición inicial → cambios observados → cantidades derivadas. Retirar del alcance activo el segundo formulario/esquema de recuentos parciales. Conservarlo solo como propuesta aplazada.
3. **Separar publicación y evaluación.** El despliegue público está terminado. La aceptación de H7 como beta evaluada y la eficacia estratégica continúan pendientes.
4. **Dividir DEC02 y evaluar desde el inicio.** Primero fijar casos/esperados, después corregir las diferencias demostradas y probar el recorrido con el usuario. No esperar a completar otro lote de Tarot o comodines.
5. **Mantener una sola cola activa.** Hoja vigente y backlog mandan; el plan H0–H7 conserva la visión amplia. La simulación H4/H5, más dificultades, cinco barajas restantes y nuevas familias quedan aplazadas hasta que un problema concreto justifique su coste.

Se corrigieron en los documentos de planificación las referencias a920 pruebas como estado actual, la brecha de explicación extensa ya tratada por UX01, la propuesta de recuentos duplicados y la afirmación de que aún no existe publicación pública. No se reescribieron como actuales los resultados históricos de cada entrega.

## Secuencia pequeña recomendada

1. **DEC02a — cuatro contrastes antes de tocar la política:** comprar con soporte real; ahorrar cuando el gasto no aporta una utilidad preparada; reemplazar mostrando el beneficio perdido; conservar un empate útil cuando puntuación/economía no permiten concluir. Con estados y precios posibles y expectativas independientes; lo que la política ya cumpla queda como regresión.
2. **DEC02b — comparación acotada:** reutilizar costes/efectos H2 y la preparación existente. Preferir solo opciones realmente comparables; explicar sacrificios, mantener condiciones y dar una preferencia parcial entre lo evaluado cuando haya una oferta desconocida. Sin otra nota, suma arbitraria de dólares y fichas ni búsqueda general de secuencias.
3. **EVAL01b — comprobar el recorrido:** con una partida y tiendas representativas, registrar qué datos hubo que introducir, si se entiende acción/condición/sacrificio y dónde falla el consejo. Corregir esos fallos y repetir el caso. Un reservado nuevo solo cuando se reclame evaluación independiente; EVAL01a abierto queda como regresión.

Después se decide si conviene ampliar jugar/saltar, una familia concreta o un efecto no cubierto. El criterio es una decisión que el usuario no pueda resolver con el asesor actual, no el número de cartas pendientes. No se solicitan aquí nuevas cuentas, infraestructura ni comprobaciones de Android físico.

Referencias: [hoja vigente](hoja-de-ruta-asesor.md), [backlog](backlog.md), [hitos del plan general](plan-general-reconciliado.md), [entrega OBS01d](mazo-actual-obs01d.md) y [evaluación EVAL01a](evaluacion-asesor-eval01.md).
