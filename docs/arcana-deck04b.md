# DECK04b — Arcana con contenido y mano observados

**Ampliación DECK04d:** [Ermitaño y Templanza](tarot-dinero-deck04d.md) añaden dos efectos sin objetivos, propios desde tienda/ronda y directos desde Arcana. La cobertura actual es14 Tarot; las cifras y límites dirigidos que siguen corresponden a la entrega original.

Entrega del 18 de octubre de 2026, motor 0.9.2. Amplía [SHOP02b](sobres-shop02b.md) a Arcana y reutiliza las doce transformaciones de [DECK04a](tarot-deck04a.md). No añade efectos Tarot, un inventario paralelo ni una nueva migración de los guardados 0.2.

## Recorrido

En Tienda, registra el Arcana y su precio visible. **Abrí el sobre** confirma pago y apertura; el contenido y la mano comienzan desconocidos. Después registra las opciones mostradas y las cartas que realmente robó Balatro, por separado y en cualquier orden. Ninguna observación consume una elección ni aplica mejoras.

Cada Tarot compatible permite seleccionar sus objetivos **entre las cartas de la mano del sobre**. La vista previa muestra los cambios de H2 y un índice contextual opcional, separado de las fichas de una mano. **Usé esta carta** requiere confirmación explícita antes de guardar. No inserta un Tarot temporal en el inventario de consumibles ni cobra otra compra.

| Tipo | Precio base | Opciones visibles | Elecciones |
|---|---|---|---|
| Arcana normal | $4 | 3 | 1 |
| Jumbo | $6 | 5 | 1 |
| Mega | $8 | 5 | 2 |

En Mega, la primera elección conserva los mismos IDs de mano con sus propiedades actualizadas. No se vuelve a robar. La segunda elección usa ese estado: por ejemplo, Chariot puede convertir KH a Steel y después Moon cambiarlo a KC Steel. Recargar conserva la primera elección. Terminar u omitir regresa a la misma tienda; las cartas siguen en el mazo con sus transformaciones y el contexto de mano del sobre desaparece.

Omitir el resto conserva las transformaciones anteriores y no devuelve el precio pagado. Red Card usa el hook de omisión existente; no se registra otro uso de Tarot por omitir. Si se desconoce la mano o el contenido, no se certifica que el botón Omitir estuviera habilitado: esa limitación se muestra y se guarda junto a la confirmación de la acción realizada. Una mano conocida vacía y tamaño positivo rechaza el estado de preparación incompatible.

## Mano real y límites

La mano no se elige para construir una hipótesis favorable: debe coincidir con el robo que se vio. Desde la tienda ordinaria, el juego devuelve y mezcla las cartas antes de abrir el sobre. Con composición y tamaño conocidos, el contrato exige `min(cartas del mazo, tamaño de mano)` IDs distintos y existentes. Con 52 cartas y tamaño 8, registrar 3 devuelve `incomplete_pack_hand`; no completa las otras 5. Un mazo de 5 admite sus 5 y tamaño 0 admite mano vacía. La comprobación se repite al usar una opción para cubrir contextos importados.

El tamaño desconocido conserva una limitación y no se sustituye por ocho. Después de una elección, estos doce efectos no cambian el número de cartas ni roban: no se permite reemplazar la mano transcrita silenciosamente. Una observación equivocada se corrige mediante el historial y deshacer. No se ordena ni se deduce la semilla a partir del orden del mazo guardado.

El jefe de `nextBlind` **todavía no está activo** dentro de un sobre de tienda. Las transformaciones compartidas refrescan el debilitamiento bajo ese contexto, sin aplicar el palo o las condiciones del próximo jefe. Tarot poseído en una ronda mantiene su propia comprobación del jefe activo; no se convierte una fase en otra para reutilizar el efecto.

Se registran como compatibles los doce Tarot dirigidos ya implementados; los otros diez y **Soul** pueden observarse como opciones con uso pendiente. Observar Soul no concede un Legendario. Omen Globe puede producir otros Spectral según L13; su vale/efectos continúan fuera del contrato H2 y se comunican como incompatibles, sin reinterpretarlos ni activar cobertura automáticamente. Descuentos, apertura desde etiquetas, consumibles propios usados dentro del sobre y generación aleatoria siguen pendientes.

## Contratos y separación de responsabilidades

El catálogo conserva sus 15 sobres; ahora nueve tienen apertura y elecciones integradas: Buffoon, Celestial y Arcana, cada uno en tres tamaños. La matriz de capacidades indica operación condicional, no soporte de toda carta que pueda aparecer.

La extensión de estado es opcional y exclusiva de 0.2:

```ts
// Fragmentos, no un estado completo ni un robo previsto.
context.heldCardIds = { status: 'known', source: 'manual', value: observedIds };
const entry = { entryId: 'option-1', kind: 'tarot', catalogId: 'c_chariot' };
const observation = { type: 'observe_pack_hand', cardIds: observedIds };
const choice = { type: 'choose_pack_item', entryId: 'option-1', targetCardIds: ['KH'] };
```

`observedIds` debe ser la mano real completa. Un contexto anterior sin `heldCardIds` sigue cargándose sin añadir valores. H1 comprueba tipos, duplicados y referencias; H2 comprueba familia, origen, cantidad y objetivos. `targetCardIds` se rechaza en elecciones Joker/Planet, en vez de ignorarlo. El formato 0.1 y su historial permanecen congelados.

`applyTargetedTarotUse` comparte el efecto y el conteo con los Tarot poseídos. El adaptador propio valida y retira su instancia; el adaptador Arcana valida la opción, aplica el efecto directamente y resta una elección. El metadato del evento identifica oferta/opción, no una posesión creada. El inventario de consumibles queda idéntico, aunque esté lleno o sea desconocido. El total anterior de Tarot desconocido sigue desconocido, con su limitación de Fortune Teller; uno conocido aumenta una vez por opción utilizada.

Compra, observaciones y elecciones son acciones T09b separadas: revisión, ID único, validación antes de guardar, documento atómico con historial, recuperación tras cuota, recarga y deshacer. La consulta y selección de objetivos no escriben. Los análisis antiguos no se aplican tras otra elección. Deshacer una elección recupera el sobre abierto y su mano; no devuelve el dinero de una apertura anterior.

## Verificación

```powershell
npm.cmd run demo:arcana
npm.cmd run check
npm.cmd run test:arcana
```

**866 pruebas aprobadas, 0 fallos y 10 TODO manuales.** Se añaden 23 casos H2 y 14 de persistencia. Los oráculos independientes incluyen $20→$16, Chariot sin segundo pago, contador 7→8, Mega con misma mano y dos usos, inventario lleno intacto, mazo de 5/tamaño 8 y rechazo de 3/52/tamaño 8. Las pruebas de equivalencia, aislamiento y cuota verifican contratos internos; no demuestran utilidad estratégica ni una partida de Balatro.

Diez grupos nuevos de navegador cubren el recorrido, objetivos, Mega, omisión, límites locales, cuota, revisiones, recarga/deshacer y 390 px con lector. Se repiten las regresiones de Tarot poseído y sobres anteriores. Capturas/reportes quedan como evidencia local ignorada. `ARCANA_BASE_URL`, `ARCANA_COMMIT` y `ARCANA_WORKFLOW` permiten repetir los diez flujos públicos y contrastar 21 módulos críticos, HTML y CSS: 23 hashes. Solo una ejecución aprobada confirma ese despliegue.

[L13](evidencia/arcana/README.md) registra la inspección primaria, versión y hashes, esperados independientes y contrastes manuales pendientes. Las reglas siguen provisionales por inspección estática; el modo estricto conserva su abstención. No se declara ejecución directa en Balatro ni Android físico.

## Siguiente entrega

No hay una recomendación automática del mejor Tarot u objetivos de Arcana: el usuario puede previsualizar combinaciones legales, pero no se enumeran todas ni se usa la mayor nota como prueba de supervivencia. La siguiente tarea es comparar esas combinaciones con la política contextual existente, conservar empates/intercambios y mostrar exactamente qué objetivos se compararon. Los demás Tarot y Spectral/Standard/Black Hole se integrarán por efectos; la calibración estratégica EVAL01 permanece separada.
