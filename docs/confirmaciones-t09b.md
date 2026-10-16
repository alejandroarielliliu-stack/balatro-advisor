**Actualización T10:** la [web local](interfaz-t10.md) integra este flujo. initialize crea un registro validado sin sobrescribir; restoreJson importa H1/T09b con confirmación y token esperado. correct permite transcribir campos observed completos (no assumptions ni escenarios), con motivo y validación estructural. No cambia el formato. Web Locks protege un único escritor en la UI; los límites del núcleo descritos abajo siguen aplicándose a otros clientes. Los resultados de 99 tests corresponden a T09b; el total actual es 103 + 11 grupos de navegador.

# T09b — registro de acciones realizadas

Entrega: 2026-10-10. Implementado en [confirmed-store.ts](../src/storage/confirmed-store.ts). Se revisaron H1, H2, T07b, H3 y backlog; no hay AGENTS.md aplicable en Balatro ni sus ancestros. No se modificó Project Bonk, el catálogo, las reglas, la política ni el esquema de partida H1.

## Tres objetos distintos

- **Partida registrada:** `store.load().value.state`, declarada por el usuario. Sigue siendo GameState 0.1, con hechos y desconocidos; no equivale a certificar todas las reglas del juego.
- **Análisis hipotético:** H3/T07b reciben una copia de esa partida. Sus cartas, cobros y estados finales nunca se pasan al guardado de confirmaciones. Pueden conservarse como resultados efímeros.
- **Confirmación:** una petición explícita del usuario con `confirmed:true`, un ID único, acción, fecha y vínculo a la revisión analizada. Solo aplica la transición de tienda H2 al estado registrado actual.

Los supuestos que ya existían en H1 permanecen bajo assumptions; no se convierten en observaciones. El nuevo servicio no acepta un GameState final, un resultado T07b ni un campo projectedState como petición de confirmación. Generar recomendaciones no escribe nada.

## Uso y migración

```powershell
npm.cmd run check
npm.cmd run demo:confirm
```

La demo usa almacenamiento en memoria y confirmaciones humanas **simuladas para demostrar la API**. Carga el ejemplo H1, migra, consulta H3 sin cambiar el registro, confirma comprar Joker aunque se recomendaba Half, guarda/recupera, rechaza consejo antiguo y duplicado, y corrige mediante undo. No afirma haber realizado ninguna acción en Balatro.

```ts
const store = createBrowserConfirmedStore(); // o createConfirmedStore(() => storagePort)
const migrated = store.migrateLegacy(); // llamada explícita, solo al adoptar el formato
// Comprobar .ok antes de acceder a .value.
const record = store.load();
const state = record.ok ? record.value?.state : undefined;
if (state) {
  const expected = analysisBinding(state);
  // Guardar este vínculo junto al análisis; no recrearlo al pulsar un consejo antiguo.
  const saved = store.confirm({
    confirmationId: 'id-generado-por-la-interfaz-para-esta-confirmacion',
    confirmed: true,
    expected,
    updatedAt: '2026-10-10T20:00:00Z',
    action: { type: 'buy', offerId: 'o1', instanceId: 'j' },
    observedAfter: { money: 5, jokerIds: ['j'], offerIds: ['o2'] }
  });
}
```

El llamador suministra fecha e ID: el núcleo no lee el reloj ni genera azar. El ID se mantiene al reintentar la misma petición, y se genera otro para una acción distinta aunque tenga el mismo tipo. La confirmación no necesita coincidir con el consejo H3. Admite hold/buy/sell/replace de H2, incluso venta sola que T07b no enumera.

`migrateLegacy()` lee la clave H1 `balatro-advisor.state.v0.1` con su store y crea `balatro-advisor.confirmed.v1`, schemaVersion `confirmed-1`. El archivo H1 original queda intacto como respaldo; no hay conversión silenciosa ni doble escritura. Se rechaza migrar si ya hay registro nuevo, si es corrupto o falta la partida antigua. Los JSON GameState 0.1 siguen compatibles con H1. Para cargar uno, se importa mediante H1 **antes de la primera migración**.

Tras migrar, este registro nuevo es la fuente de verdad para el flujo. La UI debe leer/escribir por este servicio: escribir después con el store H1 antiguo solo cambiaría su respaldo, no la partida adoptada. T10 añade restoreJson para reemplazar explícitamente la partida por una copia H1/T09b validada, con autorización y comprobación del documento previo. `exportJson()` exporta el documento completo para preservar estado, IDs y snapshots; no debe importarse como si fuera un GameState 0.1. Los snapshots individuales sí conservan ese esquema.

## Revisiones y acciones compuestas

`analysisBinding(state)` produce runId, revision y rulesetId. `confirm`, `correct` y `undoLatest` exigen que coincidan con el registro actual; un consejo antiguo devuelve stale_revision y pide recargar/recalcular. Una compra/venta avanza una revisión; replace conserva los dos incrementos H2. Registrar hold también avanza una revisión de registro para invalidar análisis anteriores aunque no cambie dinero. Corregir/deshacer suma una, nunca vuelve a una revisión antigua.

Un confirmationId ya presente devuelve duplicate_confirmation, incluso tras undo. Un fallo sin escritura no consume el ID: se puede reintentar. Dos compras legítimas distintas usan IDs diferentes y la revisión actualizada. Los cambios inesperados detectados entre lectura y escritura se rechazan también.

Si solo se realizó la venta de un reemplazo, enviar `sell` con la instancia vendida. Nunca confirmar replace por una venta parcial. Si se realizó toda la secuencia, enviar replace: H2 valida venta y compra sobre copias antes de escribir una sola entrada. Si falla la compra no se registra la venta como parte de esa petición; se puede confirmar separadamente la venta real con la revisión todavía vigente. La traza de una secuencia exitosa contiene ambos pasos, importes y ocupación.

## Discrepancias y correcciones

observedAfter es opcional: cuando se aporta, se comparan saldo, IDs ordenados de comodines y ofertas restantes con la transición H2. Una diferencia produce model_discrepancy sin guardar éxito ni parcial. Omitirlo significa que el usuario declara la acción, pero los efectos se registran según el modelo provisional; no constituye contraste directo de reglas. No se afirma que esos tres datos detecten todas las discrepancias posibles, por ejemplo contadores mal transcritos.

`correct({confirmationId, confirmed:true, expected, updatedAt, patch, reason, targetEntryId?})` permite transcribir explícitamente campos observed (incluidos progreso, recursos, bases de manos, money, jokers y shop) con las estructuras de H1. No toma cartas, ingresos futuros ni un estado completo de simulación. Se valida estructura, pero no se obliga a que una observación real coincida con el catálogo: si introduce un efecto fuera de cobertura, los próximos análisis H2 se abstendrán. La entrada se etiqueta correction sin evidencia de regla inventada. Si una transacción no se registró por discrepancia, pueden corregirse conjuntamente saldo, inventario y ofertas reales, con motivo claro.

`undoLatest({confirmationId, confirmed:true, expected, updatedAt, targetEntryId, reason})` restaura el snapshot anterior a la última acción/corrección, con una revisión nueva. Mantiene la entrada errónea y añade una compensación; no borra el historial ni implica deshacer nada en Balatro. No permite deshacer una entrada intermedia o un undo: usar correct con los valores actuales y motivo. Esto evita reejecutar una cadena de acciones dependientes después de editar el pasado.

## Historial y consistencia

El documento contiene initialState, state e history. Cada entrada contiene ID, kind, acción (o null), before, after, motivo, targetEntryId, evidencia de reglas y traza H2. Los snapshots guardan revisión y cambios completos; comparar observed.money/jokers/shop muestra los cambios relevantes. Correcciones y undo no se presentan como reglas observadas. Consultar `load().value.history`; no hay arquitectura de eventos ni replay requerido.

Antes de escribir se valida la continuidad de snapshots, identidad de partida, incremento exacto de revisión, IDs únicos y correspondencia del estado con la última entrada. H1 vuelve a validar/serializar el nuevo estado usando un adaptador cuyo setItem guarda **estado e historial juntos en una sola clave**. Si la validación, lectura o escritura falla, no se publica un nuevo estado en memoria como exitoso ni se elimina el anterior. Cada entrada conserva el before recuperable; la migración conserva además el archivo H1 original.

StoragePort debe garantizar setItem atómico ante fallo, como Web Storage. Este núcleo es síncrono y de **un solo escritor**. La comparación del texto leído detecta cambios previos al commit; no es un bloqueo transaccional entre pestañas/procesos. T10 limita la edición a una pestaña mediante Web Locks antes de entrar en este núcleo. Una sola escritura evita desincronizar estado/historial incluso si dos escritores no coordinados se pisan, pero no impide esa pérdida de actualizaciones.

Límites de seguridad JSON heredados (complejidad/profundidad), 1 MiB por estado, hasta 1000 entradas y 8 MiB por documento, sujetos a cuota del navegador. Se rechaza el exceso sin recortar IDs o historial silenciosamente. Se recomienda exportar antes de que crezca; no se implementó compactación. El validador detecta inconsistencias estructurales, no es una firma criptográfica ni autentica que el usuario realizó una acción.

## Pruebas y siguiente paso

`npm.cmd run check`: **99 aprobadas, 0 fallidas, 10 TODO manuales**, con 12 pruebas nuevas de T09b. Cubren migración y su fallo, consejo sin escritura, compra no recomendada, recuperación, revisión/runId, duplicados/reintentos, venta parcial, reemplazo atómico, acciones ilegales, discrepancias/correcciones, undo, fallo de cuota/lectura, conflicto antes de commit, corrupción, alias/inmutabilidad y CLI. La prueba de corrupción detectó una referencia compartida en la primera implementación; se corrigió devolviendo snapshots independientes y exigiendo el salto exacto de revisión. Las pruebas H1/H2/T07b/H3 también pasan.

T09b completo como flujo de software. Integrado en T10: formulario web mínimo que capture datos reales, consulte H3 y muestre resultados, solicite confirmación explícita de lo realizado (venta o secuencia completa), conserve el ID durante reintentos, invalide consejos al cambiar revisión, muestre historial/correcciones/errores y use el store confirmado como fuente de verdad. Debe resolver la política de pestaña escritora y probar PC/Android. Reglas pendientes y eficacia del asesor siguen pendientes; no se ampliaron catálogo ni simulaciones.


