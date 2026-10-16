# Recorrido observado de partida — RUN01b

Entrega del 16 de octubre de 2026. Conecta el [formato de fases de RUN01a](fases-y-migracion.md) con confirmaciones reales y guardado local. Permite iniciar o retomar una partida, registrar que se entró en una ciega, comunicar su resultado, transcribir el saldo después de cobrar y salir de la tienda. No decide todavía si conviene jugar o saltar ni ejecuta las manos omitidas.

## Qué se registra y qué se calcula

El usuario confirma lo ocurrido en Balatro. El recorrido mantiene inventario y posición a partir de esas declaraciones; no controla el juego ni comprueba una partida mediante una captura. Consultar una recomendación, puntuar una mano o evaluar T07b continúa siendo una hipótesis que no modifica este registro.

- El orden pequeña → grande → jefe y el cambio de ante después de un jefe superado se derivan del progreso confirmado.
- Un resultado se declara expresamente. Una puntuación insuficiente de un escenario no registra una derrota real.
- El dinero al cobrar es **el saldo total observado**, no un importe que se sume al dinero anterior. Este flujo no reconstruye premio, intereses, Oro retenido ni ingresos de comodines.
- Jefe, tag, cartas en mano, robos y nuevas ofertas permanecen desconocidos cuando no se transcribieron. No se reutiliza el stock de la tienda que terminó.
- Los datos dinámicos que el resumen no determina quedan pendientes. Conservar el inventario no certifica que sus contadores continúen iguales.

Las responsabilidades siguen separadas: [start.ts](../src/run/start.ts) crea condiciones iniciales compatibles; [progress.ts](../src/run/progress.ts) transforma una copia validada; [confirmed-store.ts](../src/storage/confirmed-store.ts) confirma, revisa y persiste; [run-progress-view.ts](../src/ui/run-progress-view.ts) recoge observaciones. No se llama a `beginRound` o `finishRound` para fabricar una secuencia de manos reales.

## Entrada mínima en cada momento

| Situación / control | Datos nuevos | Resultado registrado |
|---|---|---|
| Sin partida / «Empecé una partida» | Baraja compatible y confirmación del perfil Steam 1.0.1o-FULL, sin mods, White Stake | Nueva partida `0.2`, ante 1/pequeña, recursos y composición iniciales conocidos dentro del catálogo; jefe/tag desconocidos. |
| Fase desconocida / «Retomar partida» | Fase real, ante, tipo de ciega y saldo actual; confirmar inventario sin cambios o dejarlo pendiente | Posición actual, sin ejecutar retrospectivamente sucesos del tramo omitido. En tienda se indica la ciega que viene después, no la que supuestamente originó la visita. |
| Selección / «Entré en la ciega» | Confirmación de entrada y de los datos conservados | Fase `in_round`; la mano y los recursos restantes no se generan. Los efectos de selección no se simulan. |
| Ronda / «Terminé la ciega» | Resultado observado; puntuación, manos usadas y descartes usados son opcionales | Victoria no final → cobro pendiente; derrota → fin; victoria declarada en jefe de ante 8 → fin del objetivo. |
| Cobro / «Ya cobré» | Dinero total que muestra el juego tras cobrar | Saldo absoluto, siguiente posición del ciclo y tienda con ofertas por registrar. |
| Tienda / «Salí de la tienda» | Confirmación de salida y de los datos conservados | Selección de la próxima ciega; stock anterior retirado y tag pendiente. |
| Cualquier fase activa / «Dejé la partida» | Motivo | Fin declarado con resultado `stopped`; no equivale a derrota. |

En una partida nueva se admiten los diez perfiles integrados de baraja: azul, roja, amarilla, verde, negra, abandonada, cuadriculada, pintada, plasma y errática. El catálogo contiene otras barajas, pero no se habilitan silenciosamente para este inicio. Errática conserva desconocidos sus rangos y palos; crear la partida no genera sus cartas aleatorias.

Crear otra partida sustituye la copia activa y su historial solo después de confirmarlo. El diálogo permite exportar la anterior; el respaldo de migración no es un archivo automático de todas las partidas nuevas.

### Posición, jefe y final

`observed.nextBlind` mantiene la posición activa durante selección/ronda/cobro; en tienda indica la próxima ciega. `phaseData.origin` conserva la ciega que originó una tienda cuando se conoce. Una continuación en tienda de origen desconocido no reconstruye ese origen.

Al cobrar tras pequeña se avanza a grande; tras grande, a jefe del mismo ante; tras jefe, a pequeña del siguiente ante. El jefe visible se puede reutilizar únicamente si pertenece al ante y posición correspondientes. El nuevo ante deja desconocido su jefe. La API rechaza una siguiente ciega transcrita que contradiga ese orden.

El recorrido termina en ante 8: no crea una tienda posterior ni inicia endless. «Superé la ciega» es una declaración del resultado, no una deducción desde las fichas opcionales. Esta primera entrega no tiene una categoría separada para rescate de Mr. Bones: registrar el resultado efectivamente mostrado por el juego; no usar una simulación de rescate como prueba de victoria final.

## Conservar inventario y reconciliar cambios

Cada confirmación de avance incluye `inventory`:

- `{ unchanged: true }`: el usuario confirma que los datos de inventario conservados siguen siendo los actuales. Se mantienen identidades y orden, pero se invalidan los contadores/contextos que puedan haber cambiado en el tramo.
- `{ patch: { ... } }`: se transcriben datos finales observados. Los grupos que no se confirmaron ni se aportaron quedan desconocidos; no se completa una corrección parcial copiando un estado final hipotético. `{ patch: {} }` significa que ese inventario queda pendiente, no que está vacío.

El parche admite mazo, comodines, bases de manos, vales/modificadores, recursos, contexto y saldo con los tipos de H1. La web ofrece la confirmación sencilla; la conciliación detallada reutiliza la edición del registro. Una carta retirada que aún se referencia en un escenario puede requerir retirar explícitamente ese escenario o corregir sus referencias antes de guardar.

### Datos que pueden caducar

El resumen omite el orden y contenido de las jugadas. Por ejemplo, Green Joker con contador 0, una mano y un descarte puede terminar en 0 o 1 según su orden: no se obtiene un contador fiable restando totales. El mismo límite afecta a crecimientos condicionados, destrucciones y resultados aleatorios.

El módulo distingue tramos no registrados, selección, ronda, salida de tienda y entrada en otra tienda. Dentro de esa política conservadora:

- Seleccionar puede activar Madness, Ceremonial Dagger y otros efectos; no se inventa qué comodín se destruyó, qué carta apareció ni qué consumible se creó.
- Al terminar una ronda, los contadores afectados y objetivos de Mail/Ancient/Castle/Idol/To Do List pueden quedar desconocidos. Los valores de venta afectados por Egg/Gift también necesitan actualización.
- Red Card y Flash no crecen por jugar una ronda. El salto de ciega tampoco se usa como activación de Red Card.
- Contadores e historial de manos, consumibles y otros contextos no reconstruibles no se presentan como actuales. Los hechos de origen que no cambian por ese avance, como tamaño inicial de mazo y número de ciegas saltadas, se conservan.
- Una carta debilitada pertenece a un contexto concreto de ciega. Como el formato de carta no representa «debilitación desconocida», se solicita una instantánea actual del mazo antes de volver a puntuar si ese estado dejó de ser fiable.
- Turtle Bean puede cambiar el tamaño de mano. La capacidad anterior no se impone después de una ronda sin los datos necesarios.
- Coste y usos gratuitos de renovación de otra tienda no se arrastran como si siguieran vigentes. Perkeo al salir requiere su resultado observado; el recorrido no inventa una copia negativa.

Esta invalidación puede ser más amplia de lo necesario. OBS01 debe reducirla mediante dependencias concretas y preguntas puntuales; no se trata de una prueba de que todos esos datos cambiaron. Un dato pendiente limita los cálculos que lo necesitan, no borra la partida ni impide registrar progreso independiente.

## API, revisiones y guardado

El núcleo `applyRunProgress(state, command, { expectedRevision, updatedAt, inventory })` es puro respecto de su entrada. Exige estado `0.2`, comando válido y fase de origen legal. Devuelve estado nuevo, traza del avance y limitaciones; no accede a DOM ni almacenamiento.

`createConfirmedStore(...).progress(request)` reutiliza la revisión, ID único, confirmación explícita y commit de T09b:

```ts
const saved = store.progress({
  confirmationId: 'cobro-ante2-pequena',
  confirmed: true,
  expected: analysisBinding(record.state),
  updatedAt: '2026-10-16T12:00:00Z',
  command: { type: 'collect_cashout', money: 36 },
  inventory: { unchanged: true }
});
// Solo anunciar éxito y mostrar saved.value después de comprobar saved.ok.
```

Aquí `$36` es un ejemplo de saldo transcrito. No demuestra un cálculo de interés ni acredita que se observó una partida con ese cobro.

Comandos: `locate`, `enter_round`, `report_result`, `collect_cashout`, `leave_shop` y `end_run`. En `locate`, el saldo es opcional en la API: si no se aporta ni se corrige explícitamente, queda desconocido; la web lo solicita para retomar. El comando de cobro siempre exige saldo. Los importes admiten enteros seguros con signo, sin convertir un saldo negativo a cero.

La entrada de historial `kind: "progress"` conserva comando, declaración de inventario, limitaciones, estado anterior y posterior. No utiliza `kind: "action"` ni `evidence` de H2 para aparentar una compra o un cálculo verificado. Cada avance consume una revisión y guarda estado e historial en el mismo documento.

- Un ID repetido produce `duplicate_confirmation`; dos avances legítimos distintos requieren IDs distintos.
- Un vínculo antiguo produce `stale_revision`; recalcular o recargar antes de registrar otra confirmación.
- Una fase incompatible produce `wrong_phase`; no se reinterpreta la acción.
- Un fallo de validación o escritura conserva el documento activo anterior. No se anuncia «guardado» antes del éxito.
- «Deshacer registro» reutiliza T09b sobre la última entrada y añade una revisión; recupera el estado anterior, sin deshacer nada dentro de Balatro. Para una entrada anterior se requiere corrección explícita.
- Consultar o previsualizar no llama al commit. La coordinación de una pestaña editora continúa usando el mecanismo existente.

## Compatibilidad y evidencia

La lectura de `0.1` y `confirmed-1` sigue sin convertirlos ni impedir sus operaciones antiguas compatibles. Registrar el nuevo recorrido requiere aceptar antes la [migración RUN01a](fases-y-migracion.md); su respaldo exacto y recuperación siguen vigentes. Los documentos `confirmed-2` anteriores siguen siendo válidos.

RUN01b añade el tipo `progress` al historial actual. Un lector anterior que no lo conoce debe rechazar ese archivo, no descartar las entradas para hacerlo encajar ni guardarlo parcialmente. No hay conversión hacia atrás del nuevo historial; conservar la exportación anterior cuando se necesite volver a una aplicación antigua. La migración de formato no constituye una acción real de juego.

El orden y los momentos de los sucesos se apoyan en [la inspección de la build instalada 1.0.1o-FULL](evidencia/ciclo-partida-1.0.1o.md). Esa evidencia primaria es estática; el documento registra archivos, ubicaciones y hash del ejecutable. Las condiciones iniciales reutilizan el catálogo de barajas respaldado por [L03](evidencia/barajas-l03.md). Son reglas provisionales compatibles con las fuentes inspeccionadas, **no nuevas observaciones de una partida**. Las pruebas de software comprueban el contrato implementado y no promocionan esas reglas a observadas.

## Comprobación y continuación

```powershell
npm.cmd run demo:run-progress
npm.cmd run check
npm.cmd run test:run-progress
```

La demo debe mostrar el recorrido persistente y el saldo absoluto; la comprobación de navegador cubre sus controles y recuperación. Los resultados concretos y la publicación se registran con la evidencia de la entrega, no se presuponen por disponer de estos comandos.

Quedan fuera: saltar y resolver tags (TAG01), inferir contadores a partir de jugadas omitidas, observaciones parciales y preguntas por dependencia más precisas (OBS01), elegir cartas de sobres (SHOP02a/DECK04), endless, desafíos y dificultades adicionales. H2/T07b siguen puntuando dentro de su cobertura y H3 sigue siendo heurístico; este recorrido no valida la calidad estratégica ni ofrece porcentajes de victoria.
