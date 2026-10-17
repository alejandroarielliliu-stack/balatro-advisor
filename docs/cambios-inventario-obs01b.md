# Cambios observados por carta y consumible — OBS01b

Entrega del 16 de octubre de 2026, continuación de [OBS01a](observaciones-obs01a.md). Reduce la transcripción al cambiar el mazo entre ciegas. No ejecuta consumibles ni amplía el catálogo o las reglas estratégicas.

## Uso en Mesa

Con una partida registrada, aparecen **Cambios de cartas** y **Mis consumibles** bajo el recorrido. Primero guarda o descarta las ediciones pendientes del formulario. La otra pestaña del navegador continúa en lectura.

1. Abre el editor. Se muestra la revisión de referencia y el número de objetos conocidos.
2. Elige modificar, añadir o retirar. Dos reyes de picas son copias distintas: cada opción indica su ID de instancia. Puedes cambiar rango, palo, mejora, edición, sello, fichas extra y debilitación.
3. Pulsa **Añadir cambio a la lista**. Puedes retirar una operación de la lista sin modificar la partida. Una carta añadida se define completa; no se selecciona de nuevo dentro del mismo lote.
4. Confirma que los demás objetos y datos conservados siguen igual y pulsa **Registrar cambios**. Cancelar o cerrar no escribe.
5. Para corregir una transcripción equivocada, usa **Deshacer** del recorrido. El historial conserva el registro y su corrección; no deshace acciones dentro de Balatro.

En consumibles se registra la identidad, edición y valor de venta visible. **Ya no está** solo retira esa instancia: no distingue uso/venta ni modifica saldo, niveles, estadísticas o efectos de comodines. Esos resultados deben observarse por separado. Con lista desconocida se puede confirmar expresamente que está vacía; no se asume por omisión. El selector muestra etiquetas en español agrupadas visualmente por tipo (Tarot, Planeta o Espectral); las etiquetas no cambian IDs ni reglas y no se presentan como una transcripción verificada de la localización oficial.

## Contrato de datos

`inventoryChanges(record, request)` es una función sin DOM ni escritura. Valida el registro H1/T09b completo y devuelve un parche observado estrecho, una descripción y la decisión explícita de retirar escenarios guardados. `store.correct` valida y guarda ese parche junto con todo el historial, usando revisión, confirmación y exclusión de pestañas existentes. No cambia formatos ni migra automáticamente copias antiguas.

La solicitud contiene `target` (`deck` o `consumables`), `expectedRevision`, `operations`, `confirmUnchangedOthers`, `discardSavedScenarios` y, opcionalmente, `referenceRevision`. Las operaciones son `add`, `remove` o `update`; consumibles añade `confirm_empty` como operación única. Las operaciones se aplican en orden sobre una copia; una operación ilegal rechaza el lote entero. IDs duplicados/ausentes, campos extra, cambios vacíos y revisiones antiguas producen errores claros.

Una actualización conserva el ID; una adición obtiene un ID nuevo estable durante la confirmación y sus reintentos. Se preservan todas las cartas y los datos no incluidos. Los valores no se extraen de estados finales del comparador, planes ni robos hipotéticos.

## Referencias incompletas y dependencias

Si el grupo actual es desconocido, el modal ofrece la última lista conocida del historial real y advierte que es anterior. El usuario declara que solo cambió lo incluido en el lote. El núcleo solo acepta revisiones existentes en ese mismo registro. No existe reconstrucción a partir de una sola carta; sin referencia completa el lote de mazo se rechaza. Un preset estándar compatible se expande con sus IDs existentes. Errática, Cuadriculada y Abandonada necesitan sus cartas explícitas; no se convierten silenciosamente en 52 estándar.

Restaurar una lista de consumibles desde una revisión anterior no restaura estadísticas históricas antiguas. Si el contexto actual es desconocido, se registra solo la lista observada. Los demás campos siguen ausentes/desconocidos.

Por prudencia, añadir cartas deja pendiente el contador de Hologram poseído; retirar cartas deja pendientes los de Canio/Glass; modificar cartas deja pendiente el de Vampire. No se afirma que el efecto ocurrió ni se calcula su incremento: OBS01a pide el valor visible. Esta invalidación puede ser más amplia de lo necesario. Se apoya en las dependencias ya catalogadas del motor, no en una nueva comprobación directa de Balatro.

Una retirada que invalida referencias de escenarios guardados se rechaza salvo que se autorice retirarlos; sus copias siguen en el historial. Las referencias reales de cartas en mano también se validan y nunca se eliminan por esa autorización. Hay que corregir explícitamente esa mano conocida antes de retirar una carta referenciada. No se altera silenciosamente el plan para hacerlo legal.

## Verificación y límites

- `npm run check`: 616 aprobadas, 0 fallos y 10 TODO manuales existentes. Trece pruebas nuevas cubren identidades, lotes, desconocidos, referencia anterior, consumibles, compatibilidad legada, referencias colgantes, inmutabilidad, cuota, revisión y deshacer.
- `npm run test:inventory-changes`: ocho grupos en Chrome con almacenamiento real aislado, cancelación, confirmación, recarga, deshacer, cuota fallida, revisión obsoleta, consumibles, referencia anterior, móvil390 y segunda pestaña en lectura.
- Regresiones: observaciones7, recorrido17, tienda14, navegador17 y web estática bajo subruta. [Evidencia reproducible](evidencia/inventario/README.md).

Los resultados esperados se escribieron como contratos independientes: K acero mantiene otras51 cartas; añadir/retirar Fool conserva saldo y contador de Tarots usados; un fallo no escribe. No prueban eficacia estratégica ni una regla observada en el juego. Android físico sigue aplazado por petición del usuario.

OBS01b queda entregado para cartas e inventario de consumibles. **OBS01 sigue parcial:** faltan conciliación incremental de identidades de comodines, niveles e historial parcial de acciones. CAP01a debe explicitar capacidades por operación; DEC00/DEC01 y SURV01 siguen siendo las siguientes dependencias del consejo de partida. Abrir/usar consumibles, resolver sobres y saltos conserva sus tareas separadas.
