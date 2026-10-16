# RUN01a — fases de partida y migración explícita

Entrega de formato del 16 de octubre de 2026. El estado 0.2 puede representar los momentos de una partida sin deducir hechos que no se registraron. La actualización conserva el historial existente. **Continuación implementada:** [RUN01b](recorrido-run01b.md) conecta ahora el recorrido observado; este documento conserva el contrato de la migración RUN01a. Saltos y sobres siguen pendientes.

Contratos generales: [modelo de estado](modelo-de-estado.md), [confirmaciones](confirmaciones-t09b.md) y [tienda persistente](tienda-persistente.md). El [plan de ejecución](hoja-de-ruta-asesor.md) mantiene las entregas siguientes.

## Versiones y lectura

| Documento | Versión anterior, admitida | Versión actual |
|---|---|---|
| Partida | `GameStateV01` / `GameStateLegacy`, `schemaVersion: "0.1"` | `GameStateV02`, `schemaVersion: "0.2"` |
| Partida e historial | `confirmed-1`, todos sus estados 0.1 | `confirmed-2`, todos sus estados 0.2 |

`GameState` es la unión de ambas versiones. `validateState`, `parseState`, `serializeState` y la carga de almacenamiento aceptan las dos y devuelven copias independientes. **Leer, importar o consultar no convierte el formato.** Un registro no puede mezclar versiones entre `initialState`, `state` y los `before/after` del historial. Las versiones futuras y los campos no reconocidos se rechazan; no se descartan datos para hacerlos encajar.

El contrato 0.1 se conserva en [legacy-model.ts](../src/state/legacy-model.ts) y [legacy-validation.ts](../src/state/legacy-validation.ts). Los validadores explícitos `validateLegacyState` y `validateCurrentState` admiten únicamente su versión. El factory histórico `createDraft` sigue produciendo 0.1; `createUnknownState(runId, updatedAt)` crea 0.2 con fase desconocida y sin recursos, versión de juego ni baraja supuestos.

## Fases de 0.2

Se conservan todos los campos anteriores excepto `schemaVersion` y el dominio de `phase`; se añade `phaseData` obligatorio. Su forma depende de `phase` y rechaza campos de otras fases. `Fact<T>` conserva el contrato conocido/desconocido del modelo general.

| `phase` | `phaseData` requerido | Significado y límites |
|---|---|---|
| `unknown` | `reason: string` | No hay evidencia suficiente para identificar el momento. No equivale a selección de ciega. |
| `blind_select` | `skipTag: Fact<string>` | La posición, jefe, objetivo y recompensa se mantienen en `observed.nextBlind`; no se duplican aquí. |
| `in_round` | `blind: Fact<BlindRef>`, `handsRemaining`, `discardsRemaining`, `score`: Fact de entero ≥0; `heldCardIds: Fact<string[]>` | Recursos restantes, fichas acumuladas y cartas observadas. No genera manos ni robos. |
| `cashout` | `blind: Fact<BlindRef>`, `amount: Fact<number entero>` | Importe registrado pendiente de cobro. El formato admite signo; calcular si es compatible corresponde a las reglas. |
| `shop` | `origin: Fact<BlindRef>` | Ciega que originó la tienda, cuando realmente se conoce. Las ofertas siguen en `observed.shop`. |
| `open_pack` | `packId: Fact<string>`, `returnTo: "blind_select" \| "shop"` | Conserva el origen al que debe regresar el sobre. No contiene elecciones ni habilita su ejecución todavía. |
| `finished` | `outcome: "won" \| "lost" \| "stopped"`, `reason: Fact<string>` | Resultado registrado. No se deduce de una evaluación hipotética. |

`BlindRef` contiene `ante` entero ≥1 y `kind: small/big/boss`. La ciega activa conocida en `in_round` o `cashout` debe coincidir en ante/tipo con `observed.nextBlind` si este también es conocido. Los IDs conocidos de cartas en mano deben ser únicos y existir en el mazo cuando sus cartas están enumeradas. La disponibilidad durante una secuencia, los límites de recursos y los efectos son validaciones del motor, no defaults del formato.

## Conversión de una partida y de todo su historial

[migrateState(input)](../src/state/migration.ts) es puro y determinista. Valida antes de convertir:

- Un 0.1 `shop` se convierte en 0.2 `shop` con `phaseData.origin` desconocido. No infiere el origen a partir de `lastCleared`.
- Un 0.1 `draft` se convierte en 0.2 `unknown`, con el motivo de que el antiguo borrador no identifica una fase. No usa planes o supuestos para afirmar que se jugó, ganó o cobró.
- Un 0.2 válido devuelve una copia independiente equivalente: repetir la conversión no cambia los datos.

No cambia `runId`, `rulesetId`, `revision`, `updatedAt`, observaciones, contadores, escenarios, evidencia ni trazas. Por ejemplo, una tienda legacy de revisión 27 continúa en revisión 27; solo cambia la representación de formato. No registra una acción de juego.

[migrateConfirmedRecord(input)](../src/storage/record-migration.ts) transforma `initialState`, `state` y **todos** los `before/after`, conservando entradas, IDs y relaciones. Después valida la continuidad del documento completo `confirmed-2`. No reproduce compras ni vuelve a calcular efectos usando las reglas actuales.

## Guardar la actualización y recuperar el original

El servicio [createConfirmedStore](../src/storage/confirmed-store.ts) mantiene la misma clave activa, `balatro-advisor.confirmed.v1`. El sufijo histórico de la clave no indica la versión del contenido. La migración se solicita expresamente:

```ts
const prepared = store.prepareMigration();
if (prepared.ok && prepared.value.requiresMigration) {
  // Mostrar la vista previa; esperar confirmación explícita del usuario.
  const saved = store.migrateToCurrent({
    confirmed: true,
    expectedRaw: prepared.value.expectedRaw
  });
  // Comprobar saved.ok antes de sustituir la vista o anunciar éxito.
}
```

`prepareMigration()` no escribe. Devuelve el documento convertido, el texto activo exacto `expectedRaw` y `requiresMigration`; este último es falso si ya es `confirmed-2`. La autorización pertenece a la interfaz y no se deduce por llamar a la vista previa.

Al confirmar, `migrateToCurrent` comprueba que el texto activo siga siendo el de la vista previa. Guarda **primero el texto original íntegro**, sin reformatearlo, en `balatro-advisor.confirmed.migration-backup.v1`. Solo después sustituye estado e historial juntos mediante el commit existente. Hay **un solo espacio de respaldo**: una migración posterior puede sustituir el anterior; conviene descargarlo antes si se quiere conservar.

- Si falla el respaldo, devuelve `migration_backup` y no sustituye la partida activa.
- Si falla el commit activo, conserva la copia activa anterior y el respaldo ya escrito; no anuncia una migración exitosa.
- Si el registro cambió desde la vista previa o antes del commit, devuelve `stale_revision`; hay que preparar otra vista previa.
- Si ya está actualizado, confirmar con el texto vigente es una operación sin nuevas escrituras. No sobrescribe el respaldo.

`exportMigrationBackup()` devuelve el texto original validado; si no existe, devuelve `missing_backup`. No restaura automáticamente. Para recuperar, descargarlo e importarlo desde **Registro**, confirmando el reemplazo de la partida activa. La importación admite el formato antiguo sin convertirlo; la actualización puede volver a solicitarse después.

La migración utiliza dos escrituras ordenadas, no promete una transacción entre claves. La partida activa y su historial sí permanecen en un documento único. Se mantienen los límites de cuota, tamaño y un solo escritor; la web coordina pestañas con Web Locks.

## Revisión de análisis y compatibilidad de tienda

`analysisBinding(state)` conserva `{runId, revision, rulesetId}` para 0.1 y añade `schemaVersion: "0.2"` para 0.2. Así, la actualización invalida la aplicación de un consejo antiguo **aunque conserve la revisión numérica**. Hay que recalcularlo con el vínculo nuevo. IDs de confirmación, duplicados, correcciones y deshacer mantienen las reglas de T09b.

La [tienda persistente](tienda-persistente.md) sigue observando ofertas y confirmando compras/ventas/reemplazos compatibles después de actualizar, sin volver a 0.1. Las correcciones de datos observados conservan la fase. No son un comando para avanzar de fase ni pueden introducir un `phaseData` arbitrario.

## Interfaz y proyecciones

En **Registro → Formato de la partida**, «Actualizar formato de partida» muestra una vista previa y pide confirmar «Actualizar y conservar respaldo». La web muestra la fase registrada y permite descargar el respaldo anterior. Los estados de fases que aún no tienen editor compatible se conservan; no se convierten en una tienda para permitir guardarlos con el formulario.

`RoundState`, T07b y los horizontes continúan siendo evaluaciones hipotéticas. Al finalizar una ronda calculada sobre 0.2, su salida queda en `unknown` con motivo explícito; no certifica una transición real. El horizonte puede preparar una instantánea hipotética de continuación, pero no registra una visita a tienda ni escribe en almacenamiento. Para el estado 0.1 se conserva el comportamiento histórico `draft`.

Quedan fuera de RUN01a: confirmar jugar/saltar, aplicar tags, registrar resultados rápidos, cobrar, generar ofertas, avanzar ante/ciega, gestionar elecciones de sobres y el autoguardado general de todos los campos. Representar una fase no implementa sus reglas ni valida la eficacia del consejo.

## Comprobaciones reproducibles

```powershell
npm.cmd run check
npm.cmd run test:run-migration
```

[run-state.test.ts](../tests/run-state.test.ts) comprueba las siete formas, validación estricta, conservación de unknown, lectura legacy, migración explícita/idempotente e integridad de referencias. [record-migration.test.ts](../tests/record-migration.test.ts) cubre snapshots completos, recuperación, fallos de respaldo/commit, conflictos, bindings antiguos y acciones de tienda tras actualizar. [run-migration-test.mjs](../tools/run-migration-test.mjs) comprueba la integración de navegador. Son pruebas de formato, persistencia e integración; no observaciones nuevas de reglas en Balatro.
